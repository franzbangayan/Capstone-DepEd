from rest_framework import serializers
from .models import (
    School, SchoolYear, Track, Strand, GradeLevel, Subject,
    User, Teacher, TeacherSpecialization, Section,
    SubjectOffering, TeachingLoad, EmploymentStatus
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(password=password, **validated_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password is not None:
            instance.set_password(password)
        return super().update(instance, validated_data)


# A ModelSerializer auto-generates fields based on the model.
# fields = '__all__' means: include every column from the table in the JSON.


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = '__all__'


class SchoolYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolYear
        fields = '__all__'


class TrackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Track
        fields = '__all__'


class StrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Strand
        fields = '__all__'


class GradeLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeLevel
        fields = '__all__'


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'


class EmploymentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmploymentStatus
        fields = '__all__'
        
class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = '__all__'


class TeacherSpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherSpecialization
        fields = '__all__'


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = '__all__'


class SubjectOfferingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectOffering
        fields = '__all__'


class TeachingLoadSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeachingLoad
        fields = '__all__'

    def validate(self, data):
        """
        This function runs automatically, BEFORE a TeachingLoad is saved
        (whether being created or updated). If we raise a ValidationError
        here, Django REST Framework stops the save and sends the error
        back to whoever made the request instead.
        """
        # 'data' only contains fields the user is currently submitting.
        # If they're updating an existing record and didn't resend every
        # field, fall back to what's already saved (self.instance).
        teacher = data.get('teacher', getattr(self.instance, 'teacher', None))
        offering = data.get('offering', getattr(self.instance, 'offering', None))

        if teacher and offering:
            # Get every OTHER teaching load already assigned to this teacher.
            existing_loads = TeachingLoad.objects.filter(teacher=teacher)

            # If we're editing an existing record, exclude itself from the
            # count (otherwise it would double-count its own hours).
            if self.instance:
                existing_loads = existing_loads.exclude(load_id=self.instance.load_id)

            # Add up hours_per_week from every one of the teacher's other
            # subject offerings, then add the new one being requested.
            current_hours = sum(load.offering.hours_per_week for load in existing_loads)
            new_total = current_hours + offering.hours_per_week

            if new_total > teacher.max_load_hours:
                raise serializers.ValidationError(
                    f"This assignment would give {teacher.full_name} "
                    f"{new_total} hours/week, exceeding their max of "
                    f"{teacher.max_load_hours} hours/week."
                )

        return data