from django.urls import path
from .views import (
    ProfileView,
    SignupView,
    ChangePasswordView,
    VerifyEmailView,
    ForgotPasswordView,
    ResetPasswordView,
    SendVerifyOTPView,
    VerifyEmailOTPView,
    ForgotPasswordOTPView,
    VerifyResetOTPView,
    ResetPasswordOTPView,
)


urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('verify-email/<uidb64>/<token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/<uidb64>/<token>/', ResetPasswordView.as_view(), name='reset-password'),
    path('send-verify-otp/', SendVerifyOTPView.as_view(), name='send-verify-otp'),
    path('verify-email-otp/', VerifyEmailOTPView.as_view(), name='verify-email-otp'),
    path('forgot-password-otp/', ForgotPasswordOTPView.as_view(), name='forgot-password-otp'),
    path('verify-reset-otp/', VerifyResetOTPView.as_view(), name='verify-reset-otp'),
    path('reset-password-otp/', ResetPasswordOTPView.as_view(), name='reset-password-otp'),
]