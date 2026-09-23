from .models import Section, SubjectOffering, Teacher, TeacherSpecialization, TeachingLoad, SchoolYear, GenerationLog
from datetime import time
from time import perf_counter


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


def run_greedy_allocation(school_id=None, generated_by=None):
    """
    PLACEHOLDER allocation logic (Member 2 will replace this with the
    real Greedy + Backtracking algorithm from Chapter 3).

    school_id defaults to None to keep any existing call site working
    unchanged - pass it to scope the run to one school and get an
    accurate GenerationLog entry (a log row needs to know which school
    it belongs to).

    Returns a summary dictionary so the API can report what happened.
    """
    start = perf_counter()
    created = []
    skipped = []

    sections = Section.objects.filter(school_id=school_id) if school_id else Section.objects.all()

    for section in sections:
        offerings = SubjectOffering.objects.filter(grade_level=section.grade_level)
        if section.strand:
            offerings = offerings.filter(strand=section.strand)
        else:
            offerings = offerings.filter(strand__isnull=True)

        for offering in offerings:
            already_assigned = TeachingLoad.objects.filter(
                section=section, offering=offering
            ).exists()
            if already_assigned:
                continue

            qualified_teacher_ids = TeacherSpecialization.objects.filter(
                subject=offering.subject
            ).values_list('teacher_id', flat=True)

            candidates = Teacher.objects.filter(
                teacher_id__in=qualified_teacher_ids,
                school=section.school
            )

            assigned = False
            for teacher in candidates:
                existing_loads = TeachingLoad.objects.filter(teacher=teacher)
                current_hours = sum(
                    load.offering.hours_per_week for load in existing_loads
                )
                new_total = current_hours + offering.hours_per_week

                if new_total <= teacher.max_load_hours:
                    TeachingLoad.objects.create(
                        teacher=teacher,
                        section=section,
                        offering=offering,
                        is_manual_override=False
                    )
                    created.append({
                        'teacher': teacher.full_name,
                        'section': section.section_name,
                        'subject': offering.subject.subject_name,
                        'hours_assigned': offering.hours_per_week,
                    })
                    assigned = True
                    break

            if not assigned:
                reason = (
                    "No qualified teacher found for this subject at this school."
                    if not candidates.exists()
                    else "All qualified teachers are already at or near their max hours."
                )
                skipped.append({
                    'section': section.section_name,
                    'subject': offering.subject.subject_name,
                    'reason': reason,
                })

    result = {
        'assigned_count': len(created),
        'skipped_count': len(skipped),
        'assigned': created,
        'skipped': skipped,
    }

    if school_id:
        _log_generation(school_id, 'greedy', result=result,
                         duration_seconds=perf_counter() - start, generated_by=generated_by)

    return result


# ============================================================
# Backtracking allocation (below this point)
# ============================================================

def _resolve_school_year_id(school_year_start):
    if not school_year_start:
        return None
    sy = SchoolYear.objects.filter(year_start=school_year_start).first()
    return sy.school_year_id if sy else None


def _log_generation(school_id, algorithm, school_year=None, education_level=None,
                     grade_level=None, strand=None, result=None, duration_seconds=0,
                     generated_by=None):
    GenerationLog.objects.create(
        school_id=school_id,
        school_year_id=_resolve_school_year_id(school_year),
        education_level=education_level,
        grade_level=grade_level,
        strand=strand,
        algorithm=algorithm,
        assigned_count=result.get('assigned_count', 0),
        skipped_count=result.get('skipped_count', 0),
        already_assigned_count=result.get('already_assigned_count', 0),
        duration_seconds=duration_seconds,
        details={'assigned': result.get('assigned', []), 'skipped': result.get('skipped', [])},
        generated_by=generated_by,
    )

def _master_slots():
    return [
        {"day": d, "period": p, "time_start": s, "time_end": e}
        for d in DAYS for p, s, e in PERIODS
    ]


def _periods_needed(hours_per_week):
    return max(1, round(hours_per_week))


def _scoped_sections(school_id, school_year=None, education_level=None, grade_level=None, strand=None):
    """Shared by _build_tasks and clear_generated_loads so both apply
    the exact same scope - no second copy of this filtering to drift
    out of sync."""
    sections = Section.objects.filter(school_id=school_id)

    if school_year:
        sections = sections.filter(school_year__year_start=school_year)

    if education_level and education_level != 'All':
        sections = sections.filter(grade_level__education_level=education_level)

    if grade_level and grade_level != 'All Levels':
        sections = sections.filter(grade_level__grade_name=grade_level)

    if strand and strand != 'N/A':
        sections = sections.filter(strand__strand_name=strand)

    return sections


def _build_tasks(school_id, school_year=None, education_level=None, grade_level=None, strand=None):
    """
    One task per (section, applicable offering not yet loaded), scoped
    to one school plus the optional scheduling-parameter filters.
    Returns (tasks, already_assigned_count) - the count lets the
    frontend tell "nothing to do, already fully assigned" apart from
    "nothing worked."
    """
    sections = _scoped_sections(school_id, school_year, education_level, grade_level, strand)

    tasks = []
    already_assigned_count = 0

    for section in sections:
        offerings = SubjectOffering.objects.filter(grade_level=section.grade_level)
        if section.strand:
            offerings = offerings.filter(strand=section.strand)
        else:
            offerings = offerings.filter(strand__isnull=True)

        for offering in offerings:
            already_assigned = TeachingLoad.objects.filter(
                section=section, offering=offering
            ).exists()
            if already_assigned:
                already_assigned_count += 1
                continue
            tasks.append((section, offering))

    return tasks, already_assigned_count


def _qualified_candidates(offering, section):
    qualified_teacher_ids = TeacherSpecialization.objects.filter(
        subject=offering.subject
    ).values_list('teacher_id', flat=True)
    return list(Teacher.objects.filter(
        teacher_id__in=qualified_teacher_ids,
        school=section.school
    ))


def run_backtracking_allocation(school_id, school_year=None, education_level=None, grade_level=None,
                                 strand=None, generated_by=None):
    """
    Backtracking allocation for one school, optionally scoped by
    school year / education level / grade level / strand.

    Difference from Greedy: tries a teacher, and if committing to them
    makes a LATER section/offering unsolvable, undoes it (including
    any day/period/room slots reserved) and tries the next qualified
    candidate - actual backtracking, not first-fit.

    Search runs entirely in memory; TeachingLoad rows are written only
    after the full pass through every task completes.
    """
    start = perf_counter()
    tasks, already_assigned_count = _build_tasks(school_id, school_year, education_level, grade_level, strand)
    tasks.sort(key=lambda t: len(_qualified_candidates(t[1], t[0])))

    assignments = []
    skipped = []
    teacher_hours = {}
    teacher_busy = {}
    section_busy = {}
    room_busy = {}

    def free_room(day, period):
        used = room_busy.get((day, period), set())
        for room in ROOMS:
            if room not in used:
                return room
        return None

    def find_slots(teacher_id, section_id, needed):
        by_day = {}
        for s in _master_slots():
            by_day.setdefault(s["day"], []).append(s)

        chosen, chosen_keys = [], set()
        for _ in range(needed):
            picked = None
            for day in DAYS:
                for s in by_day[day]:
                    key = (s["day"], s["period"])
                    if key in chosen_keys:
                        continue
                    if key in teacher_busy.get(teacher_id, set()):
                        continue
                    if key in section_busy.get(section_id, set()):
                        continue
                    room = free_room(*key)
                    if room is None:
                        continue
                    picked = {**s, "room": room}
                    break
                if picked:
                    break
            if picked is None:
                return None
            chosen.append(picked)
            chosen_keys.add((picked["day"], picked["period"]))
        return chosen

    def backtrack(index):
        if index == len(tasks):
            return True

        section, offering = tasks[index]
        needed = _periods_needed(offering.hours_per_week)
        candidates = _qualified_candidates(offering, section)

        if not candidates:
            skipped.append({
                'section': section.section_name,
                'subject': offering.subject.subject_name,
                'reason': 'No qualified teacher found for this subject at this school.',
            })
            return backtrack(index + 1)

        for teacher in candidates:
            limit = teacher.current_load_limit
            if limit is None:
                continue
            current_hours = teacher_hours.get(teacher.teacher_id, 0)
            if current_hours + offering.hours_per_week > limit.max_load_hours:
                continue

            slots = find_slots(teacher.teacher_id, section.section_id, needed)
            if slots is None:
                continue

            teacher_hours[teacher.teacher_id] = current_hours + offering.hours_per_week
            for s in slots:
                key = (s["day"], s["period"])
                teacher_busy.setdefault(teacher.teacher_id, set()).add(key)
                section_busy.setdefault(section.section_id, set()).add(key)
                room_busy.setdefault(key, set()).add(s["room"])
            assignments.append({'teacher': teacher, 'section': section, 'offering': offering, 'slots': slots})

            if backtrack(index + 1):
                return True

            assignments.pop()
            teacher_hours[teacher.teacher_id] = current_hours
            for s in slots:
                key = (s["day"], s["period"])
                teacher_busy[teacher.teacher_id].discard(key)
                section_busy[section.section_id].discard(key)
                room_busy[key].discard(s["room"])

        skipped.append({
            'section': section.section_name,
            'subject': offering.subject.subject_name,
            'reason': 'No qualified teacher has both workload capacity and a conflict-free schedule slot.',
        })
        return backtrack(index + 1)

    backtrack(0)

    created = []
    for a in assignments:
        for s in a['slots']:
            TeachingLoad.objects.create(
                teacher=a['teacher'],
                section=a['section'],
                offering=a['offering'],
                day=s['day'],
                time_start=s['time_start'],
                time_end=s['time_end'],
                room_assigned=s['room'],
                is_manual_override=False,
            )
        created.append({
            'teacher': a['teacher'].full_name,
            'section': a['section'].section_name,
            'subject': a['offering'].subject.subject_name,
            'hours_assigned': a['offering'].hours_per_week,
            'periods_scheduled': len(a['slots']),
        })

    result = {
        'assigned_count': len(created),
        'skipped_count': len(skipped),
        'already_assigned_count': already_assigned_count,
        'assigned': created,
        'skipped': skipped,
    }

    _log_generation(school_id, 'backtracking', school_year=school_year, education_level=education_level,
                     grade_level=grade_level, strand=strand, result=result,
                     duration_seconds=perf_counter() - start, generated_by=generated_by)

    return result


def clear_generated_loads(school_id, school_year=None, education_level=None, grade_level=None, strand=None):
    """
    Deletes TeachingLoad rows for the given scope so the algorithm can
    be re-run against a clean slate during testing.

    Only deletes rows where is_manual_override=False - anything a
    principal set by hand is left untouched.
    """
    sections = _scoped_sections(school_id, school_year, education_level, grade_level, strand)
    deleted_count, _ = TeachingLoad.objects.filter(
        section__in=sections, is_manual_override=False
    ).delete()
    return deleted_count