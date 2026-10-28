from django.contrib.auth import authenticate
from rest_framework import generics, viewsets, status
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    School, SchoolYear, Track, Strand, GradeLevel, Subject,
    User, Teacher, TeacherLoadLimit, TeacherSpecialization, Section,
    SubjectOffering, TeachingLoad, EmploymentStatus, GenerationLog
)
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer, SchoolSerializer, SchoolYearSerializer, TrackSerializer,
    StrandSerializer, GradeLevelSerializer, SubjectSerializer,
    TeacherSerializer, TeacherLoadLimitSerializer, TeacherSpecializationSerializer,
    SectionSerializer, SubjectOfferingSerializer, TeachingLoadSerializer,
    EmploymentStatusSerializer, GenerationLogSerializer
)
from .algorithm import (
    run_greedy_allocation, run_backtracking_allocation, clear_generated_loads,
    get_manual_assignment_data, manual_assign, manual_unassign,
    ManualAssignmentError,
)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

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

    def get_permissions(self):
        # Allow the registration page to load school names
        if self.request.method == "GET":
            return [AllowAny()]

        # Keep create, update, and delete protected
        return [IsAuthenticated()]


class SchoolYearViewSet(viewsets.ModelViewSet):
    queryset = SchoolYear.objects.all()
    serializer_class = SchoolYearSerializer

    def get_queryset(self):
        return SchoolYear.objects.filter(school_id=self.request.user.school_id_id)

    def perform_create(self, serializer):
        school_id = self.request.user.school_id_id
        if school_id is None:
            raise ValidationError({'school_id': 'Your account must be associated with a school.'})
        serializer.save(school_id=school_id)


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

    def get_queryset(self):
        return Subject.objects.filter(school_id=self.request.user.school_id_id)

    def perform_create(self, serializer):
        school_id = self.request.user.school_id_id
        if school_id is None:
            raise ValidationError({'school_id': 'Your account must be associated with a school.'})
        serializer.save(school_id=school_id)


# class UserViewSet(viewsets.ModelViewSet):
#     queryset = User.objects.all()
#     serializer_class = UserSerializer


class EmploymentStatusViewSet(viewsets.ModelViewSet):
    queryset = EmploymentStatus.objects.all()
    serializer_class = EmploymentStatusSerializer


class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all()   # kept for router introspection only
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated]
 
    def get_queryset(self):
  
        return Teacher.objects.filter(school_id=self.request.user.school_id_id)
 
    def perform_create(self, serializer):
        serializer.save(school_id=self.request.user.school_id_id)
 
    def perform_update(self, serializer):
        serializer.save(school_id=self.request.user.school_id_id)

class TeacherLoadLimitViewSet(viewsets.ModelViewSet):
    queryset = TeacherLoadLimit.objects.all()
    serializer_class = TeacherLoadLimitSerializer


class TeacherSpecializationViewSet(viewsets.ModelViewSet):
    queryset = TeacherSpecialization.objects.all()
    serializer_class = TeacherSpecializationSerializer

    def get_queryset(self):
        return TeacherSpecialization.objects.filter(
            teacher__school_id=self.request.user.school_id_id
        )

    def perform_create(self, serializer):
        self._validate_school(
            serializer.validated_data['teacher'],
            serializer.validated_data['subject'],
        )
        serializer.save()

    def perform_update(self, serializer):
        teacher = serializer.validated_data.get('teacher', serializer.instance.teacher)
        subject = serializer.validated_data.get('subject', serializer.instance.subject)
        self._validate_school(teacher, subject)
        serializer.save()

    def _validate_school(self, teacher, subject):
        school_id = self.request.user.school_id_id
        if teacher.school_id != school_id or subject.school_id != school_id:
            raise ValidationError(
                'Teacher and subject must belong to your school.'
            )


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()   # kept for router introspection only
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]
 
    def get_queryset(self):
        return Section.objects.filter(school_id=self.request.user.school_id_id)
 
    def perform_create(self, serializer):
        serializer.save(school_id=self.request.user.school_id_id)
 
    def perform_update(self, serializer):
        serializer.save(school_id=self.request.user.school_id_id)
 


class SubjectOfferingViewSet(viewsets.ModelViewSet):
    queryset = SubjectOffering.objects.all()
    serializer_class = SubjectOfferingSerializer

    def get_queryset(self):
        return SubjectOffering.objects.filter(
            subject__school_id=self.request.user.school_id_id
        )

    def perform_create(self, serializer):
        self._validate_subject_school(serializer.validated_data['subject'])
        serializer.save()

    def perform_update(self, serializer):
        subject = serializer.validated_data.get('subject', serializer.instance.subject)
        self._validate_subject_school(subject)
        serializer.save()

    def _validate_subject_school(self, subject):
        if subject.school_id != self.request.user.school_id_id:
            raise ValidationError({'subject': 'Subject must belong to your school.'})


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
            'school_id': user.school_id_id,
        }, status=status.HTTP_200_OK)


from .algorithm import run_greedy_allocation, run_backtracking_allocation

class GenerateLoadView(APIView):
    """
    POST /api/generate-load/
 
    Now scopes Greedy to the requesting user's school too (previously
    it processed every school in the database - see the earlier
    multi-tenancy note), and passes the logged-in user through so each
    run gets recorded in GenerationLog for ReportsPage's history table.
    """
 
    def post(self, request):
        algorithm = request.data.get('algorithm', 'greedy')
        school_id = request.user.school_id_id
 
        if algorithm == 'backtracking':
            results = run_backtracking_allocation(
                school_id,
                school_year=request.data.get('school_year'),
                education_level=request.data.get('education_level'),
                grade_level=request.data.get('grade_level'),
                strand=request.data.get('strand'),
                generated_by=request.user,
            )
        else:
            results = run_greedy_allocation(
                school_id,
                school_year=request.data.get('school_year'),
                education_level=request.data.get('education_level'),
                grade_level=request.data.get('grade_level'),
                strand=request.data.get('strand'),
                generated_by=request.user,
            )
 
        return Response(results, status=status.HTTP_200_OK)

class ClearGenerationHistoryView(APIView):
    """
    POST /api/clear-generation-history/
 
    Deletes every GenerationLog row for the logged-in user's school.
    Does NOT touch TeachingLoad - this only clears the history table
    on ReportsPage, not any actual assigned schedule.
    """
 
    def post(self, request):
        deleted_count, _ = GenerationLog.objects.filter(
            school_id=request.user.school_id_id
        ).delete()
        return Response({'deleted_count': deleted_count}, status=status.HTTP_200_OK)


class ClearGeneratedLoadsView(APIView):
    """
    POST /api/clear-generated-loads/

    Deletes only algorithm-generated TeachingLoad rows
    (is_manual_override=False) within the selected scope.
    Manual overrides are preserved.
    """

    def post(self, request):
        deleted_count = clear_generated_loads(
            request.user.school_id_id,
            school_year=request.data.get('school_year'),
            education_level=request.data.get('education_level'),
            grade_level=request.data.get('grade_level'),
            strand=request.data.get('strand'),
        )

        return Response(
            {'deleted_count': deleted_count},
            status=status.HTTP_200_OK
        )


class GenerationLogViewSet(viewsets.ModelViewSet):
    """
    Read-only access to generation history.
    """

    queryset = GenerationLog.objects.all()
    serializer_class = GenerationLogSerializer
    http_method_names = ['get', 'head', 'options']

    def get_queryset(self):
        return GenerationLog.objects.filter(
        school_id=self.request.user.school_id_id
    ).order_by('-log_id')


class ManualAssignmentView(APIView):
    """
    GET    /api/manual-assignment/?school_year=&education_level=&grade_level=&strand=
           -> unassigned pairs, assigned pairs, teacher workloads
    POST   /api/manual-assignment/  {section, offering, teacher, force}
           -> assign or reassign; 409 with requires_confirmation when the
              teacher is not listed for the subject and force is false
    DELETE /api/manual-assignment/?section=&offering=
           -> remove an assignment
    """

    def get(self, request):
        data = get_manual_assignment_data(
            request.user.school_id_id,
            school_year=request.query_params.get('school_year'),
            education_level=request.query_params.get('education_level'),
            grade_level=request.query_params.get('grade_level'),
            strand=request.query_params.get('strand'),
        )
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            result = manual_assign(
                request.user.school_id_id,
                request.data.get('section'),
                request.data.get('offering'),
                request.data.get('teacher'),
                force=bool(request.data.get('force', False)),
            )
        except ManualAssignmentError as error:
            code = (
                status.HTTP_409_CONFLICT
                if error.requires_confirmation
                else status.HTTP_400_BAD_REQUEST
            )
            return Response(
                {
                    'detail': str(error),
                    'requires_confirmation': error.requires_confirmation,
                },
                status=code,
            )
        return Response(result, status=status.HTTP_200_OK)

    def delete(self, request):
        try:
            manual_unassign(
                request.user.school_id_id,
                request.query_params.get('section'),
                request.query_params.get('offering'),
            )
        except ManualAssignmentError as error:
            return Response(
                {'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(status=status.HTTP_204_NO_CONTENT)