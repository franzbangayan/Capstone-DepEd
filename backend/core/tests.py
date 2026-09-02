from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
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
