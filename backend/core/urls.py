from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    SchoolViewSet, SchoolYearViewSet, TrackViewSet, StrandViewSet,
    GradeLevelViewSet, SubjectViewSet, TeacherViewSet,
    TeacherLoadLimitViewSet, TeacherSpecializationViewSet, SectionViewSet,
    SubjectOfferingViewSet, TeachingLoadViewSet, LoginView, GenerateLoadView,
    EmploymentStatusViewSet, ClearGeneratedLoadsView, GenerationLogViewSet
)

router = DefaultRouter()
router.register(r'schools', SchoolViewSet)
router.register(r'school-years', SchoolYearViewSet)
router.register(r'tracks', TrackViewSet)
router.register(r'strands', StrandViewSet)
router.register(r'grade-levels', GradeLevelViewSet)
router.register(r'subjects', SubjectViewSet)
# router.register(r'user', UserViewSet)
router.register(r'teachers', TeacherViewSet)
router.register(r'teacher-load-limits', TeacherLoadLimitViewSet)
router.register(r'teacher-specializations', TeacherSpecializationViewSet)
router.register(r'sections', SectionViewSet)
router.register(r'subject-offerings', SubjectOfferingViewSet)
router.register(r'teaching-loads', TeachingLoadViewSet)
router.register(r'employment-statuses', EmploymentStatusViewSet)
router.register(r'generation-logs', GenerationLogViewSet)

urlpatterns = router.urls + [
    path('login/', LoginView.as_view(), name='login'),
    path('generate-load/', GenerateLoadView.as_view(), name='generate-load'),
    path('clear-generated-loads/', ClearGeneratedLoadsView.as_view(), name='clear-generated-loads')
]