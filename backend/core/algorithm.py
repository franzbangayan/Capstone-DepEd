from collections import defaultdict

from django.db import IntegrityError, transaction

from .models import (
    Section,
    SubjectOffering,
    Teacher,
    TeacherSpecialization,
    TeachingLoad,
)


def run_greedy_allocation():
    """
    Assign subject offerings to qualified teachers using a greedy algorithm.

    Greedy strategy:
    1. Process subjects with the fewest qualified teachers first.
    2. If subjects have the same number of candidates, process the subject
       with more required hours first.
    3. Assign the teacher with the lowest current load percentage.
    4. Do not exceed the teacher's maximum load hours.
    5. Do not change assignments that already exist.

    This version does not use backtracking. Once a teacher is selected,
    the assignment is not reconsidered.

    Returns:
        A dictionary containing successful and skipped assignments.
    """

    created = []
    skipped = []

    with transaction.atomic():
        # Lock teacher records during allocation.
        # This reduces the chance of two allocation requests assigning
        # loads to the same teacher at the same time.
        teachers = list(
            Teacher.objects
            .select_for_update()
            .order_by("pk")
        )

        sections = list(
            Section.objects
            .order_by(
                "grade_level",
                "strand_id",
                "section_name",
                "pk",
            )
        )

        offerings = list(
            SubjectOffering.objects
            .select_related("subject")
            .order_by(
                "grade_level",
                "strand_id",
                "subject__subject_name",
                "pk",
            )
        )

        specializations = list(
            TeacherSpecialization.objects.all()
        )

        existing_loads = list(
            TeachingLoad.objects
            .select_related(
                "teacher",
                "section",
                "offering",
                "offering__subject",
            )
        )

        # ---------------------------------------------------------
        # 1. Prepare teacher lookup
        # ---------------------------------------------------------

        teacher_by_id = {
            teacher.pk: teacher
            for teacher in teachers
        }

        # Store teachers according to their school.
        teachers_by_school = defaultdict(set)

        for teacher in teachers:
            teachers_by_school[teacher.school_id].add(teacher.pk)

        # Store qualified teachers according to subject.
        qualified_teachers_by_subject = defaultdict(set)

        for specialization in specializations:
            qualified_teachers_by_subject[
                specialization.subject_id
            ].add(specialization.teacher_id)

        # ---------------------------------------------------------
        # 2. Calculate each teacher's current load
        # ---------------------------------------------------------

        current_hours = defaultdict(float)

        for load in existing_loads:
            current_hours[load.teacher_id] += (
                load.offering.hours_per_week
            )

        # Store existing section and offering combinations.
        # This prevents duplicate assignments.
        existing_assignment_keys = {
            (load.section_id, load.offering_id)
            for load in existing_loads
        }

        # ---------------------------------------------------------
        # 3. Build allocation tasks
        # ---------------------------------------------------------

        tasks = []

        for section in sections:
            matching_offerings = get_matching_offerings(
                section=section,
                offerings=offerings,
            )

            for offering in matching_offerings:
                assignment_key = (
                    section.pk,
                    offering.pk,
                )

                # Skip an offering that already has a teacher.
                if assignment_key in existing_assignment_keys:
                    continue

                qualified_teacher_ids = (
                    qualified_teachers_by_subject.get(
                        offering.subject_id,
                        set(),
                    )
                )

                school_teacher_ids = teachers_by_school.get(
                    section.school_id,
                    set(),
                )

                # A teacher must:
                # 1. Specialize in the subject.
                # 2. Belong to the same school.
                candidate_ids = sorted(
                    qualified_teacher_ids.intersection(
                        school_teacher_ids
                    )
                )

                tasks.append(
                    {
                        "section": section,
                        "offering": offering,
                        "candidate_ids": candidate_ids,
                    }
                )

        # ---------------------------------------------------------
        # 4. Process difficult assignments first
        # ---------------------------------------------------------

        tasks.sort(
            key=lambda task: (
                len(task["candidate_ids"]),
                -task["offering"].hours_per_week,
                task["section"].pk,
                task["offering"].pk,
            )
        )

        # ---------------------------------------------------------
        # 5. Perform greedy teacher selection
        # ---------------------------------------------------------

        teaching_loads_to_create = []

        for task in tasks:
            section = task["section"]
            offering = task["offering"]
            candidate_ids = task["candidate_ids"]

            if not candidate_ids:
                skipped.append(
                    {
                        "section": section.section_name,
                        "subject": offering.subject.subject_name,
                        "reason": (
                            "No teacher at this school is qualified "
                            "to teach this subject."
                        ),
                    }
                )
                continue

            valid_candidates = []

            for teacher_id in candidate_ids:
                teacher = teacher_by_id[teacher_id]

                new_total = (
                    current_hours[teacher_id]
                    + offering.hours_per_week
                )

                # Only include a teacher if the new subject will not
                # exceed their maximum teaching load.
                if new_total <= teacher.max_load_hours:
                    valid_candidates.append(teacher_id)

            if not valid_candidates:
                skipped.append(
                    {
                        "section": section.section_name,
                        "subject": offering.subject.subject_name,
                        "reason": (
                            "All qualified teachers would exceed "
                            "their maximum teaching load."
                        ),
                    }
                )
                continue

            # -----------------------------------------------------
            # Greedy choice
            # -----------------------------------------------------
            #
            # Choose the candidate with the lowest used-load ratio.
            #
            # Example:
            # Teacher A: 10 / 20 hours = 50%
            # Teacher B: 12 / 30 hours = 40%
            #
            # Teacher B is selected because only 40% of their
            # maximum load is currently being used.

            valid_candidates.sort(
                key=lambda teacher_id: (
                    get_load_ratio(
                        current_hours[teacher_id],
                        teacher_by_id[
                            teacher_id
                        ].max_load_hours,
                    ),
                    current_hours[teacher_id],
                    teacher_id,
                )
            )

            selected_teacher_id = valid_candidates[0]
            selected_teacher = teacher_by_id[selected_teacher_id]

            # Update the teacher's hours in memory so the next
            # allocation sees the newly assigned load.
            current_hours[selected_teacher_id] += (
                offering.hours_per_week
            )