from django.db import models

# ============================================================
# Django Models for the Web-Based Automated Teacher Loading
# and Assignment System (based on Chapter 3, Section 3.6)
# Updated: full_name split into last/first/middle name,
# employment_status converted from free text into a proper
# lookup table (EmploymentStatus) per adviser feedback.
# ============================================================


class School(models.Model):
    school_id = models.AutoField(primary_key=True)
    deped_school_id = models.CharField(max_length=20, unique=True)
    school_name = models.CharField(max_length=150)
    school_level = models.CharField(max_length=50)
    address = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'SCHOOL'

    def __str__(self):
        return self.school_name


class SchoolYear(models.Model):
    school_year_id = models.AutoField(primary_key=True)
    year_start = models.IntegerField()
    year_end = models.IntegerField()

    class Meta:
        db_table = 'SCHOOL_YEAR'

    def __str__(self):
        return f"{self.year_start}-{self.year_end}"


class Track(models.Model):
    track_id = models.AutoField(primary_key=True)
    track_name = models.CharField(max_length=100)

    class Meta:
        db_table = 'TRACK'

    def __str__(self):
        return self.track_name


class Strand(models.Model):
    strand_id = models.AutoField(primary_key=True)
    track = models.ForeignKey(Track, on_delete=models.CASCADE, db_column='track_id')
    strand_name = models.CharField(max_length=100)

    class Meta:
        db_table = 'STRAND'

    def __str__(self):
        return self.strand_name


class GradeLevel(models.Model):
    grade_level_id = models.AutoField(primary_key=True)
    grade_name = models.CharField(max_length=50)
    education_level = models.CharField(max_length=50)

    class Meta:
        db_table = 'GRADE_LEVEL'

    def __str__(self):
        return self.grade_name


class Subject(models.Model):
    subject_id = models.AutoField(primary_key=True)
    subject_name = models.CharField(max_length=100)
    subject_type = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'SUBJECT'

    def __str__(self):
        return self.subject_name


class UserAccount(models.Model):
    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    password_hash = models.CharField(max_length=255)
    school = models.ForeignKey(School, on_delete=models.CASCADE, db_column='school_id')

    class Meta:
        db_table = 'USER_ACCOUNT'

    def __str__(self):
        return self.username


class EmploymentStatus(models.Model):
    """
    NEW TABLE (per adviser feedback): lookup table for standardized
    employment status classifications, replacing the old free-text
    VARCHAR field on Teacher. Same pattern as Track/Strand/GradeLevel.
    """
    status_id = models.AutoField(primary_key=True)
    status_name = models.CharField(max_length=50)

    class Meta:
        db_table = 'EMPLOYMENT_STATUS'
        verbose_name = 'Employment Status'
        verbose_name_plural = 'Employment Statuses'

    def __str__(self):
        return self.status_name


class Teacher(models.Model):
    teacher_id = models.AutoField(primary_key=True)
    last_name = models.CharField(max_length=100)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    employment_status = models.ForeignKey(
        EmploymentStatus, on_delete=models.PROTECT, db_column='employment_status_id'
    )
    max_load_hours = models.FloatField()
    school = models.ForeignKey(School, on_delete=models.CASCADE, db_column='school_id')

    class Meta:
        db_table = 'TEACHER'

    def __str__(self):
        return f"{self.last_name}, {self.first_name}"

    @property
    def full_name(self):
        """
        Convenience property so other code (like algorithm.py) that
        expects a single 'full name' string still works, without
        needing a full_name column in the database.
        """
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return " ".join(parts)


class TeacherSpecialization(models.Model):
    specialization_id = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_column='teacher_id')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, db_column='subject_id')

    class Meta:
        db_table = 'TEACHER_SPECIALIZATION'
        unique_together = ('teacher', 'subject')

    def __str__(self):
        return f"{self.teacher} - {self.subject.subject_name}"


class Section(models.Model):
    section_id = models.AutoField(primary_key=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE, db_column='school_id')
    school_year = models.ForeignKey(SchoolYear, on_delete=models.CASCADE, db_column='school_year_id')
    grade_level = models.ForeignKey(GradeLevel, on_delete=models.CASCADE, db_column='grade_level_id')
    strand = models.ForeignKey(Strand, on_delete=models.SET_NULL, db_column='strand_id', blank=True, null=True)
    section_name = models.CharField(max_length=100)
    adviser_teacher = models.ForeignKey(
        Teacher, on_delete=models.SET_NULL, db_column='adviser_teacher_id',
        blank=True, null=True, related_name='advised_sections'
    )

    class Meta:
        db_table = 'SECTION'

    def __str__(self):
        return self.section_name


class SubjectOffering(models.Model):
    offering_id = models.AutoField(primary_key=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, db_column='subject_id')
    grade_level = models.ForeignKey(GradeLevel, on_delete=models.CASCADE, db_column='grade_level_id')
    strand = models.ForeignKey(Strand, on_delete=models.SET_NULL, db_column='strand_id', blank=True, null=True)
    hours_per_week = models.FloatField()

    class Meta:
        db_table = 'SUBJECT_OFFERING'

    def __str__(self):
        return f"{self.subject.subject_name} ({self.grade_level.grade_name})"


class TeachingLoad(models.Model):
    load_id = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_column='teacher_id')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, db_column='section_id')
    offering = models.ForeignKey(SubjectOffering, on_delete=models.CASCADE, db_column='offering_id')
    is_manual_override = models.BooleanField(default=False)

    class Meta:
        db_table = 'TEACHING_LOAD'

    def __str__(self):
        return f"{self.teacher} -> {self.offering.subject.subject_name} ({self.section.section_name})"