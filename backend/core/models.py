from django.db import models

# ============================================================
# Django Models for the Web-Based Automated Teacher Loading
# and Assignment System (based on Chapter 3, Section 3.6)
# ============================================================
# Each class below = one table in your 'deped' database.
# Django will CREATE these tables for you when we run migrations
# (you don't need to write CREATE TABLE by hand anymore).
# ============================================================


class School(models.Model):
    school_id = models.AutoField(primary_key=True)
    deped_school_id = models.CharField(max_length=20, unique=True)
    school_name = models.CharField(max_length=150)
    school_level = models.CharField(max_length=50)  # Elementary, JHS, SHS, Integrated
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
    grade_name = models.CharField(max_length=50)  # e.g. "Grade 7"
    education_level = models.CharField(max_length=50)  # Elementary, JHS, SHS

    class Meta:
        db_table = 'GRADE_LEVEL'

    def __str__(self):
        return self.grade_name


class Subject(models.Model):
    subject_id = models.AutoField(primary_key=True)
    subject_name = models.CharField(max_length=100)
    subject_type = models.CharField(max_length=50, blank=True, null=True)  # Core, Applied, Specialized

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


class Teacher(models.Model):
    EMPLOYMENT_STATUS_CHOICES = [
        ('Permanent', 'Permanent'),
        ('Provisional', 'Provisional'),
        ('Part-time', 'Part-time'),
    ]

    teacher_id = models.AutoField(primary_key=True)
    full_name = models.CharField(max_length=150)
    employment_status = models.CharField(max_length=50, choices=EMPLOYMENT_STATUS_CHOICES)
    max_load_hours = models.FloatField()
    school = models.ForeignKey(School, on_delete=models.CASCADE, db_column='school_id')

    class Meta:
        db_table = 'TEACHER'

    def __str__(self):
        return self.full_name


class TeacherSpecialization(models.Model):
    specialization_id = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_column='teacher_id')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, db_column='subject_id')

    class Meta:
        db_table = 'TEACHER_SPECIALIZATION'
        unique_together = ('teacher', 'subject')  # a teacher can't be linked to the same subject twice

    def __str__(self):
        return f"{self.teacher.full_name} - {self.subject.subject_name}"


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
        return f"{self.teacher.full_name} -> {self.offering.subject.subject_name} ({self.section.section_name})"