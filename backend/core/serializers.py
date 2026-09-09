from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import (
    School, SchoolYear, Track, Strand, GradeLevel, Subject,
    User, Teacher, TeacherLoadLimit, TeacherSpecialization, Section,
    SubjectOffering, TeachingLoad, EmploymentStatus
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'school_id']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(password=password, **validated_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password is not None:
            instance.set_password(password)
        return super().update(instance, validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):
        data = super().validate(attrs)

        data["school_id"] = self.user.school_id_id

        return data


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

    def create(self, validated_data):
        # Enforce "only one active school year at a time" per the model's
        # documented convention. If this new record is being marked
        # active, deactivate every other one first.
        if validated_data.get('is_active'):
            SchoolYear.objects.filter(is_active=True).update(is_active=False)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if validated_data.get('is_active'):
            SchoolYear.objects.filter(is_active=True).exclude(pk=instance.pk).update(is_active=False)
        return super().update(instance, validated_data)


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


class TeacherLoadLimitSerializer(serializers.ModelSerializer):
    """
    NEW: serializer for the load-limit history table. max_load_hours
    now lives here instead of on Teacher directly.
    """
    class Meta:
        model = TeacherLoadLimit
        fields = '__all__'


class TeacherSpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherSpecialization
        fields = '__all__'


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = '__all__'
        read_only_fields = ['school']   # backend sets this from the logged-in user
 
 


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
            # max_load_hours now lives on TeacherLoadLimit, not Teacher,
            # so pull the teacher's currently active limit record.
            current_limit = teacher.current_load_limit
            if current_limit is None:
                raise serializers.ValidationError(
                    f"{teacher.full_name} has no active load limit on record. "
                    f"Add a TeacherLoadLimit entry before assigning a load."
                )

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

            if new_total > current_limit.max_load_hours:
                raise serializers.ValidationError(
                    f"This assignment would give {teacher.full_name} "
                    f"{new_total} hours/week, exceeding their max of "
                    f"{current_limit.max_load_hours} hours/week."
                )

        return data