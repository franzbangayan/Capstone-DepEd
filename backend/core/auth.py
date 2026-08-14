import jwt
import datetime
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password


def hash_password(raw_password):
    """
    Turns a plain-text password into a secure hash before saving to the database.
    Uses Django's built-in hasher (PBKDF2 by default) — never store raw passwords.
    """
    return make_password(raw_password)


def verify_password(raw_password, hashed_password):
    """
    Checks a plain-text password (typed at login) against the stored hash.
    Returns True/False. This is how we confirm the password is correct
    WITHOUT ever storing or comparing plain text.
    """
    return check_password(raw_password, hashed_password)


def generate_token(user_account):
    """
    Builds a JWT (JSON Web Token) for a logged-in UserAccount.
    The token contains the user's id, username, and school_id,
    signed with your Django SECRET_KEY so it can't be tampered with.
    Expires after 24 hours — after that, the user has to log in again.
    """
    payload = {
        'user_id': user_account.user_id,
        'username': user_account.username,
        'school_id': user_account.school_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat': datetime.datetime.utcnow(),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    return token


def decode_token(token):
    """
    Reverses generate_token(): takes a token from an incoming request
    and returns the payload if valid, or raises an error if it's
    expired or was tampered with.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])