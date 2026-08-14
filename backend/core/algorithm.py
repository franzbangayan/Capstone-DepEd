from .models import Section, SubjectOffering, Teacher, TeacherSpecialization, TeachingLoad


def run_greedy_allocation():
    """
    PLACEHOLDER allocation logic (Member 2 will replace this with the
    real Greedy + Backtracking algorithm from Chapter 3).

    For now, this does a simple greedy pass:
    For every Section, find SubjectOfferings that match its grade level
    (and strand, if applicable). For each one not already assigned,
    find the first qualified teacher who has room in their schedule,
    and assign them.

    Returns a summary dictionary so the API can report what happened.
    """
    created = []
    skipped = []

    sections = Section.objects.all()

    for section in sections:
        # Find subject offerings that match this section's grade level.
        # If the section has a strand (SHS), also match on strand;
        # otherwise only match offerings with no strand (JHS/core subjects).
        offerings = SubjectOffering.objects.filter(grade_level=section.grade_level)
        if section.strand:
            offerings = offerings.filter(strand=section.strand)
        else:
            offerings = offerings.filter(strand__isnull=True)

        for offering in offerings:
            # Skip if this exact section+offering already has a teacher assigned.
            already_assigned = TeachingLoad.objects.filter(
                section=section, offering=offering
            ).exists()
            if already_assigned:
                continue

            # Find teachers qualified for this subject, at the same school.
            qualified_teacher_ids = TeacherSpecialization.objects.filter(
                subject=offering.subject
            ).values_list('teacher_id', flat=True)

            candidates = Teacher.objects.filter(
                teacher_id__in=qualified_teacher_ids,
                school=section.school
            )

            assigned = False
            for teacher in candidates:
                # Add up hours this teacher is already assigned.
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
                    break  # stop looking once we've assigned someone (greedy = first fit)

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

    return {
        'assigned_count': len(created),
        'skipped_count': len(skipped),
        'assigned': created,
        'skipped': skipped,
    }