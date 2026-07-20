from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Profile
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from .utils import send_verification_email, send_password_reset_email
from .models import Profile, EmailOTP
from .utils import send_otp_email



class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        # Intentionally does NOT raise an error if the email doesn't exist —
        # this avoids leaking which emails are registered ("email enumeration").
        return value

    def save(self, **kwargs):
        email = self.validated_data['email']
        try:
            user = User.objects.get(email=email)
            send_password_reset_email(user)
        except User.DoesNotExist:
            pass  # silently no-op — same response either way


class ResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        uidb64 = self.context['uidb64']
        token = self.context['token']

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError("Invalid reset link.")

        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError("Invalid or expired reset link.")

        attrs['user'] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all())]
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        otp = EmailOTP.create_for_user(user, EmailOTP.PURPOSE_VERIFY)
        send_otp_email(user, otp.code, EmailOTP.PURPOSE_VERIFY)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    email = serializers.EmailField(
        source='user.email',
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    session_tokens_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Profile
        fields = [
            'username',
            'email',
            'total_tokens_used',
            'session_tokens_used',
            'session_token_limit',
            'session_tokens_remaining',
        ]
        read_only_fields = [
            'total_tokens_used',
            'session_tokens_used',
            'session_token_limit',
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        if 'username' in user_data:
            instance.user.username = user_data['username']
        if 'email' in user_data:
            instance.user.email = user_data['email']
        instance.user.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class VerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        profile, _ = Profile.objects.get_or_create(user=self.user)
        if not profile.is_verified:
            raise serializers.ValidationError(
                "Please verify your email before logging in. Check your inbox for the verification link."
            )

        return data



class RequestOTPSerializer(serializers.Serializer):
    """Used for both 'send verify code' and 'send reset code' — purpose comes from context."""
    email = serializers.EmailField()

    def validate_email(self, value):
        # Same enumeration-safe pattern as ForgotPasswordSerializer — never reveal
        # whether the email exists.
        return value

    def save(self, **kwargs):
        email = self.validated_data['email']
        purpose = self.context['purpose']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return  # silent no-op, same response either way

        if not EmailOTP.can_resend(user, purpose):
            # Still silent to the client — don't reveal timing info either.
            # (Frontend should rely on its own resend-cooldown timer for UX.)
            return

        otp = EmailOTP.create_for_user(user, purpose)
        send_otp_email(user, otp.code, purpose)


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)

    def validate(self, attrs):
        purpose = self.context['purpose']
        email = attrs['email']
        code = attrs['code']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid code.")

        otp = (
            EmailOTP.objects
            .filter(user=user, purpose=purpose, is_used=False)
            .order_by('-created_at')
            .first()
        )

        if otp is None or not otp.is_valid:
            raise serializers.ValidationError("Invalid or expired code. Please request a new one.")

        if otp.code != code:
            otp.attempts += 1
            otp.save(update_fields=['attempts'])
            raise serializers.ValidationError("Incorrect code.")

        attrs['user'] = user
        attrs['otp'] = otp
        return attrs

    def save(self, **kwargs):
        # Whether to burn the code now or let a later step (ResetPasswordOTPSerializer) do it.
        should_consume = self.context.get('consume', True)
        if should_consume:
            otp = self.validated_data['otp']
            otp.is_used = True
            otp.save(update_fields=['is_used'])
        return self.validated_data['user']


class ResetPasswordOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        # Reuse VerifyOTPSerializer's checking logic without consuming the code twice
        verify = VerifyOTPSerializer(
            data={'email': attrs['email'], 'code': attrs['code']},
            context={'purpose': EmailOTP.PURPOSE_RESET, 'consume': False}
        )
        verify.is_valid(raise_exception=True)
        attrs['user'] = verify.validated_data['user']
        attrs['otp'] = verify.validated_data['otp']
        return attrs

    def save(self, **kwargs):
        user = self.validated_data['user']
        otp = self.validated_data['otp']

        user.set_password(self.validated_data['new_password'])
        user.save()

        otp.is_used = True
        otp.save(update_fields=['is_used'])
        return user    