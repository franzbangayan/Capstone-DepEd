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

# Double-shift school day (DepEd Order No. 62, s. 2004 allows double shifts
# to address classroom shortage). Each shift has 6 fifty-minute periods and
# a 20-minute break after period 3. No TeachingLoad row is ever generated
# for a break because it isn't in PERIODS_BY_SHIFT.
#
#   Morning:   6:00 - 11:20   (break 8:30 - 8:50)
#   Afternoon: 12:10 - 17:30  (break 14:40 - 15:00)
PERIODS_BY_SHIFT = {
    "Morning": [
        (1, time(6, 0), time(6, 50)),
        (2, time(6, 50), time(7, 40)),
        (3, time(7, 40), time(8, 30)),
        # BREAK 8:30-8:50
        (4, time(8, 50), time(9, 40)),
        (5, time(9, 40), time(10, 30)),
        (6, time(10, 30), time(11, 20)),
    ],
    "Afternoon": [
        (1, time(12, 10), time(13, 0)),
        (2, time(13, 0), time(13, 50)),
        (3, time(13, 50), time(14, 40)),
        # BREAK 14:40-15:00
        (4, time(15, 0), time(15, 50)),
        (5, time(15, 50), time(16, 40)),
        (6, time(16, 40), time(17, 30)),
    ],
}

# Classrooms available to the school. A section keeps one home room all
# week; a Morning section and an Afternoon section can share the same room.
ROOMS = [f"Room {i}" for i in range(1, 61)]


def _shift_of(section_id):
    """
    A section's shift is derived from its id so it never changes and needs
    no extra column: even ids attend the Morning shift, odd ids the
    Afternoon shift. Consecutively created sections therefore alternate.
    """
    return "Morning" if section_id % 2 == 0 else "Afternoon"


def _master_slots():
    return [
        {
            "day": day,
            "period": period,
            "time_start": start,
            "time_end": end,
        }
        for day in DAYS
        for periods in PERIODS_BY_SHIFT.values()
        for period, start, end in periods
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


def _active_specializations(subject, strand=None):
    """
    strand=None means "general qualification, any/no strand" - matches
    TeacherSpecialization rows with strand IS NULL.
    strand=<Strand instance> means "qualified specifically within this
    strand" - only an exact strand match counts. A general specialization
    does NOT satisfy a strand-specific requirement; that's the whole point
    of the "qualified strand teachers" constraint.
    """
    today = timezone.localdate()
    qs = TeacherSpecialization.objects.filter(
        subject=subject,
        date_started__lte=today,
        date_ended__gte=today,
    )
    if strand:
        qs = qs.filter(strand=strand)
    else:
        qs = qs.filter(strand__isnull=True)
    return qs.values_list("teacher_id", flat=True)


def _qualified_candidates(offering, section):
    """
    A teacher qualifies when:
      1. they belong to the same school;
      2. they have an active specialization for the subject, matched on
         strand: an exact strand match for strand-specific (SHS
         specialized) offerings, a general (strand=None) specialization
         for everything else.
    """
    teacher_ids = _active_specializations(offering.subject, offering.strand)

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
    section_rooms = {}
    room_owners = {}

    # Track an offering only once when calculating weekly load.
    counted_teacher_assignments = set()

    for load in loads:
        teacher_id = load.teacher_id
        section_id = load.section_id
        key = (load.day, load.time_start, load.time_end)

        teacher_busy.setdefault(teacher_id, set()).add(key)
        section_busy.setdefault(section_id, set()).add(key)
        if load.room_assigned:
            section_rooms[section_id] = load.room_assigned
            room_owners[(_shift_of(section_id), load.room_assigned)] = section_id

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
        "rooms": {"by_section": section_rooms, "owners": room_owners},
    }


def _home_room(section, rooms):
    """
    A section's fixed classroom. Reuses the room it already has; otherwise
    takes the first room not yet owned by another section of the same
    shift. Returns None when every room is taken for that shift.
    """
    section_id = section.section_id
    existing = rooms["by_section"].get(section_id)
    if existing:
        return existing

    shift = _shift_of(section_id)
    for room in ROOMS:
        if (shift, room) not in rooms["owners"]:
            rooms["by_section"][section_id] = room
            rooms["owners"][(shift, room)] = section_id
            return room

    return None


def _find_slots(
    teacher,
    section,
    needed,
    teacher_busy,
    teacher_daily_periods,
    section_busy,
    rooms,
):
    """
    Pick conflict-free periods for one subject, one period per day, max.

    A teacher never teaches the same subject to the same section twice in
    one day - that's not a scheduling nicety, it's a hard rule. So this
    picks at most ONE slot per day for this (teacher, section) pair: it
    tries every day once, least-loaded day first, and a day that has no
    free slot is simply skipped, never doubled up on to make room for
    another day's miss. If the subject needs more periods than there are
    usable days left, this returns None - that assignment is infeasible
    and the caller reports it as skipped, rather than silently stacking
    two periods of the same subject onto one day.

    The existing teacher daily-period cap (_daily_limit) and the section/
    room/teacher conflict checks are still enforced on every pick.
    """
    teacher_id = teacher.teacher_id
    section_id = section.section_id
    daily_limit = _daily_limit(teacher)

    day_order = sorted(
        DAYS,
        key=lambda d: (
            len(teacher_daily_periods.get((teacher_id, d), set())),
            DAYS.index(d),
        ),
    )

    chosen = []

    for day in day_order:
        if len(chosen) == needed:
            break

        existing_day_count = len(
            teacher_daily_periods.get((teacher_id, day), set())
        )
        if existing_day_count >= daily_limit:
            continue

        # Rotate the starting period by day and section so a subject does
        # not land on the same hour every day and sections don't all pile
        # onto period 1.
        periods = PERIODS_BY_SHIFT[_shift_of(section_id)]
        offset = (section_id + DAYS.index(day)) % len(periods)
        rotated = periods[offset:] + periods[:offset]

        for period, start, end in rotated:
            slot_key = (day, start, end)

            if slot_key in teacher_busy.get(teacher_id, set()):
                continue
            if slot_key in section_busy.get(section_id, set()):
                continue

            # A section stays in its home room and teachers move between
            # rooms. Sections sharing a room are in opposite shifts, so a
            # room can never double-book.
            room = _home_room(section, rooms)
            if room is None:
                return None

            chosen.append(
                {
                    "day": day,
                    "period": period,
                    "time_start": start,
                    "time_end": end,
                    "room": room,
                }
            )
            break

    if len(chosen) < needed:
        return None

    return chosen


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
    rooms = state["rooms"]

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

        # Most-loaded first fills a teacher toward the weekly cap before
        # opening another, so teachers carry full days. Teacher ID is the
        # deterministic tie-breaker.
        capacity_candidates.sort(
            key=lambda teacher: (
                -teacher_hours.get(teacher.teacher_id, 0.0),
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
                rooms=rooms,
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
# Backtracking implementation
# ============================================================

# Upper bound on search nodes (teacher choices tried). Backtracking is
# exponential in the worst case, so the search is budgeted: it returns the
# best schedule found when the budget runs out.
MAX_BACKTRACK_NODES = 100000


def run_backtracking_allocation(
    school_id,
    school_year=None,
    education_level=None,
    grade_level=None,
    strand=None,
    generated_by=None,
):
    """
    Backtracking allocator (iterative depth-first search, so schedule size
    is not limited by Python's recursion depth).

    Each task (section + subject offering) is a decision level. At each
    level the qualified teachers are tried in least-loaded order; if none
    fits, the task is skipped as a last resort. When a branch dead-ends or
    ends with skips, the search undoes the latest choice and tries the
    next alternative, looking for a schedule with fewer skipped tasks.

    Search stops when a schedule with zero skips is found, the search space
    is exhausted, or MAX_BACKTRACK_NODES is reached. The best schedule
    found (fewest skipped tasks) is returned.
    """
    start = perf_counter()

    tasks, already_assigned_count = _build_tasks(
        school_id,
        school_year,
        education_level,
        grade_level,
        strand,
    )

    skipped = []
    task_data = []

    # Tasks with no qualified teacher can never be assigned, so they are
    # reported up front and excluded from the search.
    for section, offering in tasks:
        candidates = _qualified_candidates(offering, section)

        if not candidates:
            skipped.append(
                {
                    "section": section.section_name,
                    "subject": offering.subject.subject_name,
                    "reason": _candidate_reason([], []),
                }
            )
            continue

        task_data.append((section, offering, candidates))

    # Most constrained tasks first.
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
    rooms = state["rooms"]

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

    total = len(task_data)

    # frames[depth] holds the untried teacher options for that task.
    # path[depth] holds the choice currently applied at that depth:
    # an assignment dict, or None when the task was skipped.
    frames = [None] * total
    path = []
    skips_in_path = 0

    best_path = None
    best_skips = None
    nodes = 0
    depth = 0
    budget_exhausted = False

    while depth >= 0:
        if depth == total:
            if best_skips is None or skips_in_path < best_skips:
                best_path = list(path)
                best_skips = skips_in_path

            if best_skips == 0:
                break

            depth -= 1
            continue

        section, offering, candidates = task_data[depth]
        hours = float(offering.hours_per_week)

        if frames[depth] is None:
            frames[depth] = {
                "options": sorted(
                    candidates,
                    # Fill teachers up toward their cap before opening a
                    # new one, so each teacher carries many sections.
                    key=lambda teacher: (
                        -teacher_hours.get(teacher.teacher_id, 0.0),
                        teacher.teacher_id,
                    ),
                ),
                "pos": 0,
            }

        frame = frames[depth]

        # Undo whatever was applied at this depth on the previous visit.
        if len(path) > depth:
            previous = path.pop()
            if previous is None:
                skips_in_path -= 1
            else:
                release(
                    previous["teacher"],
                    section,
                    previous["slots"],
                    hours,
                )

        advanced = False

        while frame["pos"] <= len(frame["options"]):
            index = frame["pos"]
            frame["pos"] += 1

            if index == len(frame["options"]):
                # Last resort: skip this task.
                if best_skips is not None and skips_in_path + 1 >= best_skips:
                    continue

                path.append(None)
                skips_in_path += 1
                advanced = True
                break

            nodes += 1
            if nodes > MAX_BACKTRACK_NODES:
                budget_exhausted = True
                break

            teacher = frame["options"][index]
            limit = teacher.current_load_limit

            if limit is None:
                continue

            if teacher_hours.get(teacher.teacher_id, 0.0) + hours > float(limit.max_load_hours):
                continue

            slots = _find_slots(
                teacher,
                section,
                _periods_needed(hours),
                teacher_busy,
                teacher_daily_periods,
                section_busy,
                rooms,
            )

            if slots is None:
                continue

            reserve(teacher, section, slots, hours)
            path.append({"teacher": teacher, "slots": slots})
            advanced = True
            break

        if budget_exhausted:
            break

        if advanced:
            depth += 1
        else:
            frames[depth] = None
            depth -= 1

    # If the budget ran out before any complete schedule was found, keep
    # the choices made so far and mark the remaining tasks as skipped.
    if best_path is None:
        best_path = list(path) + [None] * (total - len(path))

    assignments = []

    for (section, offering, _), choice in zip(task_data, best_path):
        if choice is None:
            skipped.append(
                {
                    "section": section.section_name,
                    "subject": offering.subject.subject_name,
                    "reason": _candidate_reason([True], [True]),
                }
            )
            continue

        assignments.append(
            {
                "teacher": choice["teacher"],
                "section": section,
                "offering": offering,
                "slots": choice["slots"],
            }
        )

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
        "nodes_explored": nodes,
        "budget_exhausted": budget_exhausted,
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

# ============================================================
# Manual assignment (principal overrides)
# ============================================================

class ManualAssignmentError(Exception):
    def __init__(self, message, requires_confirmation=False):
        super().__init__(message)
        self.requires_confirmation = requires_confirmation


def get_manual_assignment_data(
    school_id,
    school_year=None,
    education_level=None,
    grade_level=None,
    strand=None,
):
    """
    Everything the manual assignment screen needs for one scope:
      - unassigned: section/subject pairs with no teacher yet
      - assigned: pairs that already have a teacher
      - teachers: every teacher at the school with current/max weekly hours
    """
    sections = list(
        _scoped_sections(
            school_id, school_year, education_level, grade_level, strand
        ).select_related("grade_level", "school")
    )

    state = _load_existing_state(school_id)
    teacher_hours = state["teacher_hours"]

    teachers = list(
        Teacher.objects.filter(school_id=school_id)
        .select_related("employment_status")
    )

    teacher_rows = []
    for teacher in teachers:
        limit = teacher.current_load_limit
        teacher_rows.append(
            {
                "teacher_id": teacher.teacher_id,
                "name": teacher.full_name,
                "hours": teacher_hours.get(teacher.teacher_id, 0.0),
                "max_hours": float(limit.max_load_hours) if limit else None,
            }
        )

    loads = (
        TeachingLoad.objects
        .filter(section__in=sections)
        .select_related("teacher", "section", "offering__subject")
    )
    assigned_map = {}
    for load in loads:
        key = (load.section_id, load.offering_id)
        entry = assigned_map.setdefault(
            key,
            {
                "section_id": load.section_id,
                "section": load.section.section_name,
                "offering_id": load.offering_id,
                "subject": load.offering.subject.subject_name,
                "hours": float(load.offering.hours_per_week),
                "teacher_id": load.teacher_id,
                "teacher": load.teacher.full_name,
                "is_manual": load.is_manual_override,
                "periods": 0,
            },
        )
        entry["periods"] += 1

    unassigned = []
    for section in sections:
        for offering in _applicable_offerings(section).select_related("subject"):
            if (section.section_id, offering.offering_id) in assigned_map:
                continue
            qualified = _qualified_candidates(offering, section)
            unassigned.append(
                {
                    "section_id": section.section_id,
                    "section": section.section_name,
                    "offering_id": offering.offering_id,
                    "subject": offering.subject.subject_name,
                    "hours": float(offering.hours_per_week),
                    "qualified_teacher_ids": [t.teacher_id for t in qualified],
                }
            )

    # Assigned rows also need the qualified list so the principal can
    # reassign with the same warning rules.
    assigned = []
    offering_cache = {}
    section_cache = {s.section_id: s for s in sections}
    for (section_id, offering_id), entry in assigned_map.items():
        if offering_id not in offering_cache:
            offering_cache[offering_id] = SubjectOffering.objects.select_related(
                "subject"
            ).get(pk=offering_id)
        qualified = _qualified_candidates(
            offering_cache[offering_id], section_cache[section_id]
        )
        entry["qualified_teacher_ids"] = [t.teacher_id for t in qualified]
        assigned.append(entry)

    return {
        "unassigned": unassigned,
        "assigned": assigned,
        "teachers": teacher_rows,
    }


def manual_assign(school_id, section_id, offering_id, teacher_id, force=False):
    """
    Assign (or reassign) a teacher to one section/subject pair.

    Applies the same rules as the algorithms: weekly cap, daily cap, one
    period per day, no teacher/section/room clash. Specialization is a
    warning, not a block: without force=True an unqualified teacher raises
    a confirmation error. Reassignment removes the old rows and creates
    new ones atomically, so a failure leaves the old assignment untouched.
    """
    try:
        section = Section.objects.select_related("school").get(
            pk=section_id, school_id=school_id
        )
        offering = SubjectOffering.objects.select_related("subject").get(
            pk=offering_id
        )
        teacher = Teacher.objects.select_related("employment_status").get(
            pk=teacher_id, school_id=school_id
        )
    except (
        Section.DoesNotExist,
        SubjectOffering.DoesNotExist,
        Teacher.DoesNotExist,
    ):
        raise ManualAssignmentError("Section, subject or teacher not found.")

    if not _applicable_offerings(section).filter(pk=offering.pk).exists():
        raise ManualAssignmentError(
            "This subject is not offered to that section."
        )

    qualified_ids = {t.teacher_id for t in _qualified_candidates(offering, section)}
    if teacher.teacher_id not in qualified_ids and not force:
        raise ManualAssignmentError(
            f"{teacher.full_name} is not listed as qualified for "
            f"{offering.subject.subject_name}.",
            requires_confirmation=True,
        )

    limit = teacher.current_load_limit
    if limit is None:
        raise ManualAssignmentError(
            f"{teacher.full_name} has no active load limit."
        )

    hours = float(offering.hours_per_week)

    with transaction.atomic():
        TeachingLoad.objects.filter(
            section=section, offering=offering
        ).delete()

        state = _load_existing_state(school_id)

        current = state["teacher_hours"].get(teacher.teacher_id, 0.0)
        if current + hours > float(limit.max_load_hours):
            raise ManualAssignmentError(
                f"{teacher.full_name} would exceed the weekly limit "
                f"({current + hours:g} of {float(limit.max_load_hours):g} hours)."
            )

        slots = _find_slots(
            teacher,
            section,
            _periods_needed(hours),
            state["teacher_busy"],
            state["teacher_daily_periods"],
            state["section_busy"],
            state["rooms"],
        )
        if slots is None:
            raise ManualAssignmentError(
                f"No conflict-free slots for {teacher.full_name} on this "
                f"subject and section."
            )

        for slot in slots:
            TeachingLoad.objects.create(
                teacher=teacher,
                section=section,
                offering=offering,
                day=slot["day"],
                time_start=slot["time_start"],
                time_end=slot["time_end"],
                room_assigned=slot["room"],
                is_manual_override=True,
            )

    return {
        "teacher": teacher.full_name,
        "section": section.section_name,
        "subject": offering.subject.subject_name,
        "periods_scheduled": len(slots),
    }


def manual_unassign(school_id, section_id, offering_id):
    deleted, _ = TeachingLoad.objects.filter(
        section_id=section_id,
        section__school_id=school_id,
        offering_id=offering_id,
    ).delete()

    if deleted == 0:
        raise ManualAssignmentError("That assignment does not exist.")

    return deleted