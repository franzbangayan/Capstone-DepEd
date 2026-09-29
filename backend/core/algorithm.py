from datetime import time
from time import perf_counter

from django.db import transaction
from django.utils import timezone

from .models import (
    Section,
    SubjectOffering,
    Teacher,
    TeacherSpecialization,
    TeachingLoad,
    SchoolYear,
    GenerationLog,
    SENTINEL_STILL_ACTIVE,
)


DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

PERIODS = [
    (1, time(7, 30), time(8, 30)),
    (2, time(8, 30), time(9, 30)),
    (3, time(9, 30), time(10, 30)),
    (4, time(10, 30), time(11, 30)),
    (5, time(11, 30), time(12, 30)),
    (6, time(12, 30), time(13, 30)),
    (7, time(13, 30), time(14, 30)),
    (8, time(14, 30), time(15, 30)),
]

ROOMS = [f"Room {i}" for i in range(1, 21)]


def _master_slots():
    return [
        {
            "day": day,
            "period": period,
            "time_start": start,
            "time_end": end,
        }
        for day in DAYS
        for period, start, end in PERIODS
    ]


def _periods_needed(hours_per_week):
    """
    The current TEACHING_LOAD schema stores one row per scheduled period.
    For normal whole-hour offerings, hours_per_week therefore maps directly
    to the number of rows/periods that must be generated.
    """
    return max(1, int(round(float(hours_per_week))))


def _resolve_school_year_id(school_year_start):
    if not school_year_start:
        return None

    sy = SchoolYear.objects.filter(year_start=school_year_start).first()
    return sy.school_year_id if sy else None


def _log_generation(
    school_id,
    algorithm,
    school_year=None,
    education_level=None,
    grade_level=None,
    strand=None,
    result=None,
    duration_seconds=0,
    generated_by=None,
):
    result = result or {}

    GenerationLog.objects.create(
        school_id=school_id,
        school_year_id=_resolve_school_year_id(school_year),
        education_level=education_level,
        grade_level=grade_level,
        strand=strand,
        algorithm=algorithm,
        assigned_count=result.get("assigned_count", 0),
        skipped_count=result.get("skipped_count", 0),
        already_assigned_count=result.get("already_assigned_count", 0),
        duration_seconds=duration_seconds,
        details={
            "assigned": result.get("assigned", []),
            "skipped": result.get("skipped", []),
        },
        generated_by=generated_by,
    )


def _scoped_sections(
    school_id,
    school_year=None,
    education_level=None,
    grade_level=None,
    strand=None,
):
    sections = Section.objects.filter(school_id=school_id)

    if school_year:
        sections = sections.filter(school_year__year_start=school_year)

    if education_level and education_level != "All":
        sections = sections.filter(grade_level__education_level=education_level)

    if grade_level and grade_level != "All Levels":
        sections = sections.filter(grade_level__grade_name=grade_level)

    if strand and strand != "N/A":
        sections = sections.filter(strand__strand_name=strand)

    return sections


def _applicable_offerings(section):
    offerings = SubjectOffering.objects.filter(
        grade_level=section.grade_level
    )

    if section.strand_id:
        return offerings.filter(strand=section.strand)

    return offerings.filter(strand__isnull=True)


def _build_tasks(
    school_id,
    school_year=None,
    education_level=None,
    grade_level=None,
    strand=None,
):
    """
    Creates one task for every section + subject offering that still needs
    a teacher. Existing TeachingLoad rows mean that assignment is already
    present and are therefore not regenerated.
    """
    sections = _scoped_sections(
        school_id,
        school_year,
        education_level,
        grade_level,
        strand,
    )

    tasks = []
    already_assigned_count = 0

    for section in sections:
        for offering in _applicable_offerings(section):
            if TeachingLoad.objects.filter(
                section=section,
                offering=offering,
            ).exists():
                already_assigned_count += 1
                continue

            tasks.append((section, offering))

    return tasks, already_assigned_count


def _active_specializations(subject):
    today = timezone.localdate()

    return TeacherSpecialization.objects.filter(
        subject=subject,
        date_started__lte=today,
        date_ended__gte=today,
    ).values_list("teacher_id", flat=True)


def _qualified_candidates(offering, section):
    """
    A teacher qualifies when:
      1. they belong to the same school;
      2. they have an active specialization for the subject.

    The current data model has no teacher-strand specialization field, so
    strand matching is represented by the SubjectOffering/Section match.
    """
    teacher_ids = _active_specializations(offering.subject)

    return list(
        Teacher.objects
        .filter(
            teacher_id__in=teacher_ids,
            school=section.school,
        )
        .select_related("employment_status")
    )


def _daily_limit(teacher):
    """
    DepEd constraints currently represented by the Scheduling page:
      - Part-time: max 3 teaching periods/day
      - Permanent/Provisional: max 6 teaching periods/day

    Other employment-status labels use the regular 6-period limit unless
    the database explicitly says "part-time".
    """
    status_name = (teacher.employment_status.status_name or "").strip().lower()

    if "part" in status_name:
        return 3

    return 6


def _assignment_key(section_id, offering_id):
    return section_id, offering_id


def _load_existing_state(school_id):
    """
    Build the in-memory state used by Greedy from existing TeachingLoad rows.

    Important: TEACHING_LOAD has one row per period, so an offering with
    3 periods must count as 3 scheduled periods for conflict checking but
    only ONE offering's hours when calculating weekly teacher load.
    """
    loads = (
        TeachingLoad.objects
        .filter(section__school_id=school_id)
        .select_related("teacher", "section", "offering", "offering__subject")
    )

    teacher_hours = {}
    teacher_daily_periods = {}
    teacher_busy = {}
    section_busy = {}
    room_busy = {}

    # Track an offering only once when calculating weekly load.
    counted_teacher_assignments = set()

    for load in loads:
        teacher_id = load.teacher_id
        section_id = load.section_id
        key = (load.day, load.time_start, load.time_end)

        teacher_busy.setdefault(teacher_id, set()).add(key)
        section_busy.setdefault(section_id, set()).add(key)
        room_busy.setdefault(
            (load.day, load.time_start, load.time_end),
            set(),
        ).add(load.room_assigned)

        teacher_daily_periods.setdefault(
            (teacher_id, load.day),
            set(),
        ).add(key)

        assignment_key = (
            teacher_id,
            load.section_id,
            load.offering_id,
        )

        if assignment_key not in counted_teacher_assignments:
            teacher_hours[teacher_id] = (
                teacher_hours.get(teacher_id, 0)
                + float(load.offering.hours_per_week)
            )
            counted_teacher_assignments.add(assignment_key)

    return {
        "teacher_hours": teacher_hours,
        "teacher_daily_periods": teacher_daily_periods,
        "teacher_busy": teacher_busy,
        "section_busy": section_busy,
        "room_busy": room_busy,
    }


def _room_for_slot(room_busy, slot_key):
    used = room_busy.get(slot_key, set())

    for room in ROOMS:
        if room not in used:
            return room

    return None


def _find_slots(
    teacher,
    section,
    needed,
    teacher_busy,
    teacher_daily_periods,
    section_busy,
    room_busy,
):
    """
    Pick conflict-free periods for one subject.

    Greedy preference:
      1. use days with fewer already-scheduled periods;
      2. keep teacher under the daily limit;
      3. keep the section conflict-free;
      4. use the first available room.

    This spreads a subject across the week instead of immediately filling
    Monday before using the other days.
    """
    teacher_id = teacher.teacher_id
    section_id = section.section_id
    daily_limit = _daily_limit(teacher)

    available = []

    for day in DAYS:
        for period, start, end in PERIODS:
            slot_key = (day, start, end)

            if slot_key in teacher_busy.get(teacher_id, set()):
                continue

            if slot_key in section_busy.get(section_id, set()):
                continue

            day_periods = teacher_daily_periods.get((teacher_id, day), set())
            if len(day_periods) >= daily_limit:
                continue

            room = _room_for_slot(room_busy, slot_key)
            if room is None:
                continue

            available.append(
                {
                    "day": day,
                    "period": period,
                    "time_start": start,
                    "time_end": end,
                    "room": room,
                    "day_load": len(day_periods),
                }
            )

    # Prefer lightly loaded days, then earlier periods.
    available.sort(key=lambda slot: (slot["day_load"], DAYS.index(slot["day"]), slot["period"]))

    chosen = []
    chosen_keys = set()
    chosen_day_counts = {}

    for slot in available:
        key = (slot["day"], slot["time_start"], slot["time_end"])

        if key in chosen_keys:
            continue

        day_count = chosen_day_counts.get(slot["day"], 0)
        existing_day_count = len(
            teacher_daily_periods.get((teacher_id, slot["day"]), set())
        )

        if existing_day_count + day_count >= daily_limit:
            continue

        chosen.append(slot)
        chosen_keys.add(key)
        chosen_day_counts[slot["day"]] = day_count + 1

        if len(chosen) == needed:
            return chosen

    return None


def _candidate_reason(candidates, capacity_candidates):
    if not candidates:
        return "No qualified teacher found for this subject at this school."

    if not capacity_candidates:
        return "All qualified teachers have reached their maximum weekly load."

    return "No qualified teacher has enough remaining capacity and conflict-free schedule slots."


def run_greedy_allocation(
    school_id,
    school_year=None,
    education_level=None,
    grade_level=None,
    strand=None,
    generated_by=None,
):
    """
    Greedy teaching-load allocator.

    Greedy strategy:
      1. Build all unassigned section/subject tasks.
      2. Process the hardest tasks first: fewest qualified teachers, then
         highest weekly hours.
      3. For each task, choose the currently least-loaded qualified teacher
         who can legally take the complete assignment.
      4. Allocate actual day/period/room slots immediately.
      5. Commit all generated rows only after the greedy pass succeeds.

    This is intentionally greedy, not backtracking: once a task is assigned
    to a teacher, the algorithm never moves that assignment to reconsider
    an earlier choice.
    """
    start = perf_counter()

    tasks, already_assigned_count = _build_tasks(
        school_id,
        school_year,
        education_level,
        grade_level,
        strand,
    )

    # Calculate candidate lists once. Sorting by fewest candidates is a
    # standard greedy heuristic that handles constrained subjects first.
    task_data = []
    for section, offering in tasks:
        candidates = _qualified_candidates(offering, section)
        task_data.append((section, offering, candidates))

    task_data.sort(
        key=lambda item: (
            len(item[2]),
            -float(item[1].hours_per_week),
            item[0].section_id,
            item[1].offering_id,
        )
    )

    state = _load_existing_state(school_id)

    teacher_hours = state["teacher_hours"]
    teacher_daily_periods = state["teacher_daily_periods"]
    teacher_busy = state["teacher_busy"]
    section_busy = state["section_busy"]
    room_busy = state["room_busy"]

    assignments = []
    skipped = []

    for section, offering, candidates in task_data:
        if not candidates:
            skipped.append(
                {
                    "section": section.section_name,
                    "subject": offering.subject.subject_name,
                    "reason": _candidate_reason([], []),
                }
            )
            continue

        needed_hours = float(offering.hours_per_week)
        capacity_candidates = []

        for teacher in candidates:
            limit = teacher.current_load_limit

            if limit is None:
                continue

            current_hours = teacher_hours.get(teacher.teacher_id, 0.0)

            if current_hours + needed_hours > float(limit.max_load_hours):
                continue

            capacity_candidates.append(teacher)

        if not capacity_candidates:
            skipped.append(
                {
                    "section": section.section_name,
                    "subject": offering.subject.subject_name,
                    "reason": _candidate_reason(candidates, []),
                }
            )
            continue

        # Least weekly load first gives the greedy algorithm a simple
        # workload-balancing objective. Teacher ID is the deterministic tie-breaker.
        capacity_candidates.sort(
            key=lambda teacher: (
                teacher_hours.get(teacher.teacher_id, 0.0),
                teacher.teacher_id,
            )
        )

        selected = None
        selected_slots = None

        for teacher in capacity_candidates:
            slots = _find_slots(
                teacher=teacher,
                section=section,
                needed=_periods_needed(needed_hours),
                teacher_busy=teacher_busy,
                teacher_daily_periods=teacher_daily_periods,
                section_busy=section_busy,
                room_busy=room_busy,
            )

            if slots is not None:
                selected = teacher
                selected_slots = slots
                break

        if selected is None:
            skipped.append(
                {
                    "section": section.section_name,
                    "subject": offering.subject.subject_name,
                    "reason": _candidate_reason(
                        candidates,
                        capacity_candidates,
                    ),
                }
            )
            continue

        teacher_id = selected.teacher_id
        section_id = section.section_id

        teacher_hours[teacher_id] = (
            teacher_hours.get(teacher_id, 0.0) + needed_hours
        )

        for slot in selected_slots:
            slot_key = (
                slot["day"],
                slot["time_start"],
                slot["time_end"],
            )

            teacher_busy.setdefault(teacher_id, set()).add(slot_key)
            section_busy.setdefault(section_id, set()).add(slot_key)

            teacher_daily_periods.setdefault(
                (teacher_id, slot["day"]),
                set(),
            ).add(slot_key)

            room_busy.setdefault(slot_key, set()).add(slot["room"])

        assignments.append(
            {
                "teacher": selected,
                "section": section,
                "offering": offering,
                "slots": selected_slots,
            }
        )

    # The algorithm itself is greedy and runs in memory first. Only after
    # that pass do we write TeachingLoad rows, preventing half-generated
    # schedules if the database write fails.
    with transaction.atomic():
        for assignment in assignments:
            for slot in assignment["slots"]:
                TeachingLoad.objects.create(
                    teacher=assignment["teacher"],
                    section=assignment["section"],
                    offering=assignment["offering"],
                    day=slot["day"],
                    time_start=slot["time_start"],
                    time_end=slot["time_end"],
                    room_assigned=slot["room"],
                    is_manual_override=False,
                )

    created = [
        {
            "teacher": assignment["teacher"].full_name,
            "section": assignment["section"].section_name,
            "subject": assignment["offering"].subject.subject_name,
            "hours_assigned": assignment["offering"].hours_per_week,
            "periods_scheduled": len(assignment["slots"]),
            "schedule": [
                {
                    "day": slot["day"],
                    "period": slot["period"],
                    "time_start": slot["time_start"].strftime("%H:%M"),
                    "time_end": slot["time_end"].strftime("%H:%M"),
                    "room": slot["room"],
                }
                for slot in assignment["slots"]
            ],
        }
        for assignment in assignments
    ]

    result = {
        "assigned_count": len(created),
        "skipped_count": len(skipped),
        "already_assigned_count": already_assigned_count,
        "assigned": created,
        "skipped": skipped,
    }

    _log_generation(
        school_id,
        "greedy",
        school_year=school_year,
        education_level=education_level,
        grade_level=grade_level,
        strand=strand,
        result=result,
        duration_seconds=perf_counter() - start,
        generated_by=generated_by,
    )

    return result


# ============================================================
# Existing Backtracking implementation
# ============================================================

def run_backtracking_allocation(
    school_id,
    school_year=None,
    education_level=None,
    grade_level=None,
    strand=None,
    generated_by=None,
):
    """
    Existing backtracking allocator retained for algorithm comparison.

    It uses the same task builder and scheduling state as the Greedy
    allocator, but explores alternatives recursively.
    """
    start = perf_counter()

    tasks, already_assigned_count = _build_tasks(
        school_id,
        school_year,
        education_level,
        grade_level,
        strand,
    )

    # Most constrained tasks first.
    tasks.sort(
        key=lambda task: (
            len(_qualified_candidates(task[1], task[0])),
            -float(task[1].hours_per_week),
        )
    )

    state = _load_existing_state(school_id)

    teacher_hours = state["teacher_hours"]
    teacher_daily_periods = state["teacher_daily_periods"]
    teacher_busy = state["teacher_busy"]
    section_busy = state["section_busy"]
    room_busy = state["room_busy"]

    assignments = []
    skipped = []

    def reserve(teacher, section, slots, hours):
        teacher_id = teacher.teacher_id
        section_id = section.section_id

        teacher_hours[teacher_id] = (
            teacher_hours.get(teacher_id, 0.0) + hours
        )

        for slot in slots:
            key = (slot["day"], slot["time_start"], slot["time_end"])
            teacher_busy.setdefault(teacher_id, set()).add(key)
            section_busy.setdefault(section_id, set()).add(key)
            teacher_daily_periods.setdefault(
                (teacher_id, slot["day"]),
                set(),
            ).add(key)
            room_busy.setdefault(key, set()).add(slot["room"])

    def release(teacher, section, slots, hours):
        teacher_id = teacher.teacher_id
        section_id = section.section_id

        teacher_hours[teacher_id] = (
            teacher_hours.get(teacher_id, 0.0) - hours
        )

        for slot in slots:
            key = (slot["day"], slot["time_start"], slot["time_end"])
            teacher_busy.get(teacher_id, set()).discard(key)
            section_busy.get(section_id, set()).discard(key)
            teacher_daily_periods.get(
                (teacher_id, slot["day"]),
                set(),
            ).discard(key)
            room_busy.get(key, set()).discard(slot["room"])

    def search(index):
        if index == len(tasks):
            return True

        section, offering = tasks[index]
        candidates = _qualified_candidates(offering, section)

        if not candidates:
            skipped.append(
                {
                    "section": section.section_name,
                    "subject": offering.subject.subject_name,
                    "reason": "No qualified teacher found for this subject at this school.",
                }
            )
            return search(index + 1)

        candidates.sort(
            key=lambda teacher: (
                teacher_hours.get(teacher.teacher_id, 0.0),
                teacher.teacher_id,
            )
        )

        for teacher in candidates:
            limit = teacher.current_load_limit
            if limit is None:
                continue

            hours = float(offering.hours_per_week)
            current_hours = teacher_hours.get(teacher.teacher_id, 0.0)

            if current_hours + hours > float(limit.max_load_hours):
                continue

            slots = _find_slots(
                teacher,
                section,
                _periods_needed(hours),
                teacher_busy,
                teacher_daily_periods,
                section_busy,
                room_busy,
            )

            if slots is None:
                continue

            reserve(teacher, section, slots, hours)
            assignments.append(
                {
                    "teacher": teacher,
                    "section": section,
                    "offering": offering,
                    "slots": slots,
                }
            )

            if search(index + 1):
                return True

            assignments.pop()
            release(teacher, section, slots, hours)

        skipped.append(
            {
                "section": section.section_name,
                "subject": offering.subject.subject_name,
                "reason": "No qualified teacher has enough remaining capacity and conflict-free schedule slots.",
            }
        )

        return search(index + 1)

    search(0)

    with transaction.atomic():
        for assignment in assignments:
            for slot in assignment["slots"]:
                TeachingLoad.objects.create(
                    teacher=assignment["teacher"],
                    section=assignment["section"],
                    offering=assignment["offering"],
                    day=slot["day"],
                    time_start=slot["time_start"],
                    time_end=slot["time_end"],
                    room_assigned=slot["room"],
                    is_manual_override=False,
                )

    created = [
        {
            "teacher": assignment["teacher"].full_name,
            "section": assignment["section"].section_name,
            "subject": assignment["offering"].subject.subject_name,
            "hours_assigned": assignment["offering"].hours_per_week,
            "periods_scheduled": len(assignment["slots"]),
            "schedule": [
                {
                    "day": slot["day"],
                    "period": slot["period"],
                    "time_start": slot["time_start"].strftime("%H:%M"),
                    "time_end": slot["time_end"].strftime("%H:%M"),
                    "room": slot["room"],
                }
                for slot in assignment["slots"]
            ],
        }
        for assignment in assignments
    ]

    result = {
        "assigned_count": len(created),
        "skipped_count": len(skipped),
        "already_assigned_count": already_assigned_count,
        "assigned": created,
        "skipped": skipped,
    }

    _log_generation(
        school_id,
        "backtracking",
        school_year=school_year,
        education_level=education_level,
        grade_level=grade_level,
        strand=strand,
        result=result,
        duration_seconds=perf_counter() - start,
        generated_by=generated_by,
    )

    return result


def clear_generated_loads(
    school_id,
    school_year=None,
    education_level=None,
    grade_level=None,
    strand=None,
):
    """
    Delete only algorithm-generated TeachingLoad rows in the selected scope.
    Manual overrides are preserved.
    """
    sections = _scoped_sections(
        school_id,
        school_year,
        education_level,
        grade_level,
        strand,
    )

    deleted_count, _ = TeachingLoad.objects.filter(
        section__in=sections,
        is_manual_override=False,
    ).delete()

    return deleted_count
