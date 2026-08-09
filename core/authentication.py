import jwt
from rest_framework import authentication, exceptions
from .models import UserAccount
from .auth import decode_token


class JWTAuthentication(authentication.BaseAuthentication):
    """
    Tells Django REST Framework how to check WHO is making a request,
    using the JWT token from the Authorization header.

    Expected header format:  Authorization: Bearer <token>

    This runs automatically on every request (once we register it in
    settings.py) — you don't call this yourself.
    """

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            # No token given at all. Returning None (not an error) lets
            # DRF treat this as "not logged in" rather than crashing —
            # the permission check (IsAuthenticated) is what actually
            # blocks the request afterward.
            return None

        try:
            prefix, token = auth_header.split(' ')
        except ValueError:
            raise exceptions.AuthenticationFailed(
                'Authorization header must be in the format: Bearer <token>'
            )

        if prefix.lower() != 'bearer':
            raise exceptions.AuthenticationFailed(
                'Authorization header must start with "Bearer".'
            )

        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Your session expired. Please log in again.')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token.')

        try:
            user_account = UserAccount.objects.get(user_id=payload['user_id'])
        except UserAccount.DoesNotExist:
            raise exceptions.AuthenticationFailed('This account no longer exists.')

        # DRF's permission checks (like IsAuthenticated) look for this
        # exact attribute name on whatever we return as "the user".
        user_account.is_authenticated = True

        # DRF expects a (user, auth) tuple back.
        return (user_account, token)