from django.db import models
from django.contrib.auth.models import AbstractUser

# ============================================================
# updated_documentation(Database_design_final)
#
# - User now extends AbstractUser (JWT auth) instead of a
#   separate UserAccount table; school is attached via FK.
# - Teacher.max_load_hours moved to TEACHER_LOAD_LIMIT so
#   load-limit history is preserved over time.
# - Teacher: added demographic/contact fields per the design doc.
# - TeacherSpecialization: added date_started/date_ended.
# - Subject, GradeLevel, Track, Strand: added
#   date_created/date_closed.
# - SchoolYear: added is_active flag.
# - TeachingLoad: added day, time_start, time_end, room_assigned.
#
# Sentinel convention: "still active" records use date(9999, 12, 31)
# for their date_ended / date_closed field, per the design doc.
# ============================================================

SENTINEL_STILL_ACTIVE = "9999-12-31"


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
    is_active = models.BooleanField(
        default=False,
        help_text="Only one SchoolYear should be active at a time; "
                  "switching is a manual action performed by the principal."
    )

    class Meta:
        db_table = 'SCHOOL_YEAR'

    def __str__(self):
        return f"{self.year_start}-{self.year_end}"


class Track(models.Model):
    track_id = models.AutoField(primary_key=True)
    track_name = models.CharField(max_length=100)
    date_created = models.DateField(auto_now_add=True)
    date_closed = models.DateField(default=SENTINEL_STILL_ACTIVE)

    class Meta:
        db_table = 'TRACK'

    def __str__(self):
        return self.track_name


class Strand(models.Model):
    strand_id = models.AutoField(primary_key=True)
    track = models.ForeignKey(Track, on_delete=models.CASCADE, db_column='track_id')
    strand_name = models.CharField(max_length=100)
    date_created = models.DateField(auto_now_add=True)
    date_closed = models.DateField(default=SENTINEL_STILL_ACTIVE)

    class Meta:
        db_table = 'STRAND'

    def __str__(self):
        return self.strand_name


class GradeLevel(models.Model):
    grade_level_id = models.AutoField(primary_key=True)
    grade_name = models.CharField(max_length=50)
    education_level = models.CharField(max_length=50)
    date_created = models.DateField(auto_now_add=True)
    date_closed = models.DateField(default=SENTINEL_STILL_ACTIVE)

    class Meta:
        db_table = 'GRADE_LEVEL'

    def __str__(self):
        return self.grade_name


class Subject(models.Model):
    subject_id = models.AutoField(primary_key=True)
    subject_name = models.CharField(max_length=100)
    subject_type = models.CharField(max_length=50, blank=True, null=True)
    date_created = models.DateField(auto_now_add=True)
    date_closed = models.DateField(default=SENTINEL_STILL_ACTIVE)

    class Meta:
        db_table = 'SUBJECT'

    def __str__(self):
        return self.subject_name


class User(AbstractUser):
    school = models.ForeignKey(
        School, on_delete=models.CASCADE, db_column='school_id', blank=True, null=True
    )

    class Meta:
        db_table = 'USER_ACCOUNT'

    def __str__(self):
        return self.username


class EmploymentStatus(models.Model):
    """
    Lookup table for standardized employment status classifications,
    replacing free-text on Teacher. Same pattern as Track/Strand/GradeLevel.
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
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
    ]

    teacher_id = models.AutoField(primary_key=True)
    last_name = models.CharField(max_length=100)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    birthdate = models.DateField(blank=True, null=True)

    house_no_street = models.CharField(max_length=150, blank=True, null=True)
    barangay = models.CharField(max_length=100, blank=True, null=True)
    city_municipality = models.CharField(max_length=100, blank=True, null=True)
    province = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=10, blank=True, null=True)

    contact_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(max_length=254, blank=True, null=True)

    employment_status = models.ForeignKey(
        EmploymentStatus, on_delete=models.PROTECT, db_column='employment_status_id'
    )
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

    @property
    def current_load_limit(self):
        """Returns the currently active TeacherLoadLimit record, if any."""
        return self.load_limits.filter(date_ended=SENTINEL_STILL_ACTIVE).first()


class TeacherLoadLimit(models.Model):
    """
    Maximum allowable teaching load hours for a teacher, tracked over
    time so history is preserved when a teacher's limit changes.
    """
    load_limit_id = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(
        Teacher, on_delete=models.CASCADE, db_column='teacher_id', related_name='load_limits'
    )
    max_load_hours = models.FloatField()
    date_started = models.DateField()
    date_ended = models.DateField(default=SENTINEL_STILL_ACTIVE)

    class Meta:
        db_table = 'TEACHER_LOAD_LIMIT'

    def __str__(self):
        return f"{self.teacher} - {self.max_load_hours} hrs (from {self.date_started})"


class TeacherSpecialization(models.Model):
    specialization_id = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_column='teacher_id')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, db_column='subject_id')
    date_started = models.DateField()
    date_ended = models.DateField(default=SENTINEL_STILL_ACTIVE)

    class Meta:
        db_table = 'TEACHER_SPECIALIZATION'
        unique_together = ('teacher', 'subject', 'date_started')

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

    day = models.CharField(max_length=20, help_text="e.g. 'Monday' or 'MWF'")
    time_start = models.TimeField()
    time_end = models.TimeField()
    room_assigned = models.CharField(max_length=50, blank=True, null=True)

    is_manual_override = models.BooleanField(default=False)

    class Meta:
        db_table = 'TEACHING_LOAD'

    def __str__(self):
        return f"{self.teacher} -> {self.offering.subject.subject_name} ({self.section.section_name})"