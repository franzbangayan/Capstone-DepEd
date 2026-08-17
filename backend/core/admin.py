from django import forms
from django.contrib import admin
from .models import (
    School, SchoolYear, Track, Strand, GradeLevel, Subject,
    UserAccount, Teacher, TeacherSpecialization, Section,
    SubjectOffering, TeachingLoad, EmploymentStatus
)


class TeachingLoadAdminForm(forms.ModelForm):
    class Meta:
        model = TeachingLoad
        fields = '__all__'

    def clean(self):
        cleaned_data = super().clean()
        teacher = cleaned_data.get('teacher')
        offering = cleaned_data.get('offering')

        if teacher and offering:
            existing_loads = TeachingLoad.objects.filter(teacher=teacher)
            if self.instance.pk:
                existing_loads = existing_loads.exclude(pk=self.instance.pk)

            current_hours = sum(load.offering.hours_per_week for load in existing_loads)
            new_total = current_hours + offering.hours_per_week

            if new_total > teacher.max_load_hours:
                raise forms.ValidationError(
                    f"This assignment would give {teacher} "
                    f"{new_total} hours/week, exceeding their max of "
                    f"{teacher.max_load_hours} hours/week."
                )

        return cleaned_data


class TeachingLoadAdmin(admin.ModelAdmin):
    form = TeachingLoadAdminForm


admin.site.register(School)
admin.site.register(SchoolYear)
admin.site.register(Track)
admin.site.register(Strand)
admin.site.register(GradeLevel)
admin.site.register(Subject)
admin.site.register(UserAccount)
admin.site.register(EmploymentStatus)
admin.site.register(Teacher)
admin.site.register(TeacherSpecialization)
admin.site.register(Section)
admin.site.register(SubjectOffering)
admin.site.register(TeachingLoad, TeachingLoadAdmin)