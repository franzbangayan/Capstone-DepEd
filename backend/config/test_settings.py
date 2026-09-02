from .settings import *
import os

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'test-secret-key')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'test_db.sqlite3',
    }
}

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]
