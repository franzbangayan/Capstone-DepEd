from django.contrib.auth import authenticate
from rest_framework import generics, viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    School, SchoolYear, Track, Strand, GradeLevel, Subject,
    User, Teacher, TeacherLoadLimit, TeacherSpecialization, Section,
    SubjectOffering, TeachingLoad, EmploymentStatus
)
from .serializers import (
    UserSerializer, SchoolSerializer, SchoolYearSerializer, TrackSerializer,
    StrandSerializer, GradeLevelSerializer, SubjectSerializer,
    TeacherSerializer, TeacherLoadLimitSerializer, TeacherSpecializationSerializer,
    SectionSerializer, SubjectOfferingSerializer, TeachingLoadSerializer,
    EmploymentStatusSerializer
)
from .algorithm import run_greedy_allocation


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

# A ModelViewSet automatically gives you all 5 standard operations
# for each model, with NO extra code needed:
#   GET    /api/teachers/        -> list all teachers
#   POST   /api/teachers/        -> create a new teacher
#   GET    /api/teachers/1/      -> retrieve teacher with id=1
#   PUT    /api/teachers/1/      -> update teacher with id=1
#   DELETE /api/teachers/1/      -> delete teacher with id=1
# (same pattern applies to every other viewset below)


class SchoolViewSet(viewsets.ModelViewSet):
    queryset = School.objects.all()
    serializer_class = SchoolSerializer


class SchoolYearViewSet(viewsets.ModelViewSet):
    queryset = SchoolYear.objects.all()
    serializer_class = SchoolYearSerializer


class TrackViewSet(viewsets.ModelViewSet):
    queryset = Track.objects.all()
    serializer_class = TrackSerializer


class StrandViewSet(viewsets.ModelViewSet):
    queryset = Strand.objects.all()
    serializer_class = StrandSerializer


class GradeLevelViewSet(viewsets.ModelViewSet):
    queryset = GradeLevel.objects.all()
    serializer_class = GradeLevelSerializer


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer


# class UserViewSet(viewsets.ModelViewSet):
#     queryset = User.objects.all()
#     serializer_class = UserSerializer


class EmploymentStatusViewSet(viewsets.ModelViewSet):
    queryset = EmploymentStatus.objects.all()
    serializer_class = EmploymentStatusSerializer


class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer


class TeacherLoadLimitViewSet(viewsets.ModelViewSet):
    queryset = TeacherLoadLimit.objects.all()
    serializer_class = TeacherLoadLimitSerializer


class TeacherSpecializationViewSet(viewsets.ModelViewSet):
    queryset = TeacherSpecialization.objects.all()
    serializer_class = TeacherSpecializationSerializer


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer


class SubjectOfferingViewSet(viewsets.ModelViewSet):
    queryset = SubjectOffering.objects.all()
    serializer_class = SubjectOfferingSerializer


class TeachingLoadViewSet(viewsets.ModelViewSet):
    queryset = TeachingLoad.objects.all()
    serializer_class = TeachingLoadSerializer


class LoginView(APIView):
    """
    POST /api/login/
    Body: { "username": "...", "password": "..." }

    Authenticates against the User model (AbstractUser, so password
    hashing/checking is handled by Django itself) and returns a
    simplejwt access/refresh token pair on success.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)

        if user is None:
            # Deliberately vague error message — don't reveal whether
            # the username exists or not, that's a security best practice.
            return Response(
                {'error': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user_id': user.id,
            'username': user.username,
            'school_id': user.school_id,
        }, status=status.HTTP_200_OK)


class GenerateLoadView(APIView):
    """
    POST /api/generate-load/

    Triggers the allocation algorithm, which scans all sections and
    subject offerings, assigns qualified available teachers, and saves
    the results as TeachingLoad records.

    No request body needed — just POST to this URL and it runs.
    (Requires login, same as every other endpoint.)
    """

    def post(self, request):
        results = run_greedy_allocation()
        return Response(results, status=status.HTTP_200_OK)