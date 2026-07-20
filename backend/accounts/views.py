from rest_framework import generics
from django.contrib.auth.models import User
from .serializers import (
    SignupSerializer,
    ProfileSerializer,
    ChangePasswordSerializer,
    VerifiedTokenObtainPairSerializer,
)
from .models import Profile

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import ForgotPasswordSerializer, ResetPasswordSerializer
from .models import Profile, EmailOTP
from .serializers import RequestOTPSerializer, VerifyOTPSerializer, ResetPasswordOTPSerializer


class ForgotPasswordView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "If that email is registered, a reset link has been sent."})


class ResetPasswordView(APIView):
    permission_classes = []

    def post(self, request, uidb64, token):
        serializer = ResetPasswordSerializer(
            data=request.data,
            context={'uidb64': uidb64, 'token': token}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password reset successfully. You can now log in."})


class VerifiedTokenObtainPairView(TokenObtainPairView):
    serializer_class = VerifiedTokenObtainPairSerializer


class VerifyEmailView(APIView):
    permission_classes = []  # public — no login required to click an email link

    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"detail": "Invalid verification link."}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired verification link."}, status=400)

        profile, _ = Profile.objects.get_or_create(user=user)
        profile.is_verified = True
        profile.save(update_fields=["is_verified"])
        return Response({"detail": "Email verified successfully."})


class SignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = SignupSerializer


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.start_new_session_if_needed()
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated successfully."})
class SendVerifyOTPView(APIView):
    """Triggered right after signup, or via a 'resend code' button."""
    permission_classes = []

    def post(self, request):
        serializer = RequestOTPSerializer(
            data=request.data, context={'purpose': EmailOTP.PURPOSE_VERIFY}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "If that email is registered, a verification code has been sent."})


class VerifyEmailOTPView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = VerifyOTPSerializer(
            data=request.data, context={'purpose': EmailOTP.PURPOSE_VERIFY}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.is_verified = True
        profile.save(update_fields=["is_verified"])
        return Response({"detail": "Email verified successfully."})


class ForgotPasswordOTPView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = RequestOTPSerializer(
            data=request.data, context={'purpose': EmailOTP.PURPOSE_RESET}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "If that email is registered, a reset code has been sent."})


class VerifyResetOTPView(APIView):
    """Checks the code is valid WITHOUT consuming it yet — lets the frontend
    move to the 'enter new password' screen before finalizing."""
    permission_classes = []

    def post(self, request):
        serializer = VerifyOTPSerializer(
            data=request.data, context={'purpose': EmailOTP.PURPOSE_RESET, 'consume': False}
        )
        serializer.is_valid(raise_exception=True)
        return Response({"detail": "Code verified."})


class ResetPasswordOTPView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = ResetPasswordOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password reset successfully. You can now log in."})    