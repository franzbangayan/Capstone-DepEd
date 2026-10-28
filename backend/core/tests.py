from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from core.models import GradeLevel, School, SchoolYear, Subject
from rest_framework.test import APIClient

User = get_user_model()


class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.token_url = reverse('get_token')

    def test_user_can_register(self):
        payload = {
            'username': 'alice',
            'password': 'StrongPass123',
        }

        response = self.client.post(self.register_url, payload, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(User.objects.filter(username='alice').exists())
        self.assertNotIn('password', response.data)

    def test_user_can_login_and_receive_jwt_tokens(self):
        User.objects.create_user(username='bob', password='StrongPass123')

        response = self.client.post(
            self.token_url,
            {'username': 'bob', 'password': 'StrongPass123'},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertTrue(response.data['access'])
        self.assertTrue(response.data['refresh'])

    def test_protected_routes_require_authentication(self):
        response = self.client.get('/api/teachers/')
        self.assertEqual(response.status_code, 401)


class SchoolScopedCurriculumTests(TestCase):
    def setUp(self):
        self.school_a = School.objects.create(
            deped_school_id='100001',
            school_name='School A',
            school_level='Secondary',
        )
        self.school_b = School.objects.create(
            deped_school_id='100002',
            school_name='School B',
            school_level='Secondary',
        )
        self.user_a = User.objects.create_user(
            username='school-a',
            password='StrongPass123',
            school_id=self.school_a,
        )
        self.user_b = User.objects.create_user(
            username='school-b',
            password='StrongPass123',
            school_id=self.school_b,
        )
        self.client = APIClient()

    def test_subjects_are_created_and_listed_only_for_the_user_school(self):
        self.client.force_authenticate(self.user_a)
        created = self.client.post(
            '/api/subjects/',
            {'subject_name': 'Mathematics', 'subject_type': 'Core',
             'school': self.school_b.school_id},
            format='json',
        )

        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data['school'], self.school_a.school_id)
        subject_id = created.data['subject_id']

        self.client.force_authenticate(self.user_b)
        self.assertEqual(self.client.get('/api/subjects/').data, [])
        self.assertEqual(
            self.client.get(f'/api/subjects/{subject_id}/').status_code,
            404,
        )
        self.assertEqual(
            Subject.objects.get(pk=subject_id).school_id,
            self.school_a.school_id,
        )

    def test_school_years_and_active_years_are_scoped_per_school(self):
        self.client.force_authenticate(self.user_a)
        first = self.client.post(
            '/api/school-years/',
            {'year_start': 2026, 'year_end': 2027, 'is_active': True},
            format='json',
        )
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(first.data['school'], self.school_a.school_id)

        replacement = self.client.post(
            '/api/school-years/',
            {'year_start': 2027, 'year_end': 2028, 'is_active': True},
            format='json',
        )
        self.assertEqual(replacement.status_code, 201, replacement.data)
        self.assertFalse(SchoolYear.objects.get(pk=first.data['school_year_id']).is_active)

        self.client.force_authenticate(self.user_b)
        second = self.client.post(
            '/api/school-years/',
            {'year_start': 2026, 'year_end': 2027, 'is_active': True},
            format='json',
        )
        self.assertEqual(second.status_code, 201, second.data)
        self.assertEqual(second.data['school'], self.school_b.school_id)

        self.assertTrue(SchoolYear.objects.get(pk=replacement.data['school_year_id']).is_active)
        self.assertTrue(SchoolYear.objects.get(pk=second.data['school_year_id']).is_active)
        self.assertEqual(self.client.get('/api/school-years/').data[0]['school'], self.school_b.school_id)

    def test_subject_offerings_cannot_use_another_schools_subject(self):
        subject = Subject.objects.create(
            school=self.school_a,
            subject_name='Mathematics',
            subject_type='Core',
        )
        grade_level = GradeLevel.objects.create(
            grade_name='Grade 7',
            education_level='Junior High School',
        )
        self.client.force_authenticate(self.user_b)

        response = self.client.post(
            '/api/subject-offerings/',
            {
                'subject': subject.subject_id,
                'grade_level': grade_level.grade_level_id,
                'hours_per_week': 4,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(self.client.get('/api/subject-offerings/').data, [])
