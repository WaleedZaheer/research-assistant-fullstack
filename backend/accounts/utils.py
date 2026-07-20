from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings


def send_verification_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    verify_link = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"

    send_mail(
        subject="Verify your email — Research Assistant",
        message=f"Hi {user.username},\n\nPlease verify your email by clicking the link below:\n{verify_link}\n\nIf you didn't sign up, you can ignore this email.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
def send_password_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

    send_mail(
        subject="Reset your password — Research Assistant",
        message=f"Hi {user.username},\n\nClick the link below to reset your password:\n{reset_link}\n\nIf you didn't request this, you can ignore this email.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )    
def send_otp_email(user, code, purpose):
    if purpose == "verify":
        subject = "Your verification code — Research Assistant"
        intro = "Please use the code below to verify your email:"
    else:  # "reset"
        subject = "Your password reset code — Research Assistant"
        intro = "Please use the code below to reset your password:"

    send_mail(
        subject=subject,
        message=(
            f"Hi {user.username},\n\n"
            f"{intro}\n\n"
            f"{code}\n\n"
            f"This code expires in 10 minutes. If you didn't request this, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )    