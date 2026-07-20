from django.conf import settings
from django.db import models
from django.utils import timezone
import random


class Profile(models.Model):
    DEFAULT_SESSION_TOKEN_LIMIT = 10000  # tokens per 6-hour session; free-tier default
    is_verified = models.BooleanField(default=False)

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    # Lifetime counter — never resets
    total_tokens_used = models.PositiveIntegerField(default=0)

    # Current session counters — reset every 6 hours
    session_tokens_used = models.PositiveIntegerField(default=0)
    session_started_at = models.DateTimeField(null=True, blank=True)

    # Fixed for now; will become per-user/overridable when a paid tier is added later
    session_token_limit = models.PositiveIntegerField(default=DEFAULT_SESSION_TOKEN_LIMIT)

    def __str__(self):
        return f"Profile({self.user.username})"

    @property
    def session_expired(self):
        if self.session_started_at is None:
            return True
        return timezone.now() - self.session_started_at > timezone.timedelta(hours=6)

    def start_new_session_if_needed(self):
        """Call this before checking/deducting usage. Resets session counters if the
        previous session has expired or none has started yet."""
        if self.session_expired:
            self.session_tokens_used = 0
            self.session_started_at = timezone.now()

    @property
    def session_tokens_remaining(self):
        return max(self.session_token_limit - self.session_tokens_used, 0)

    def has_capacity(self, safety_margin: int = 0):
        """Check before running the pipeline. safety_margin lets you require some
        headroom (e.g. don't even start if <500 tokens left) since we can't know
        exact cost until Groq responds."""
        self.start_new_session_if_needed()
        return self.session_tokens_remaining > safety_margin

    def record_usage(self, tokens_used: int):
        """Call after a Groq call completes with the actual token count."""
        self.start_new_session_if_needed()
        self.session_tokens_used += tokens_used
        self.total_tokens_used += tokens_used
        self.save(update_fields=["session_tokens_used", "total_tokens_used", "session_started_at"])
class EmailOTP(models.Model):

    PURPOSE_VERIFY = "verify"

    PURPOSE_RESET = "reset"

    PURPOSE_CHOICES = [

        (PURPOSE_VERIFY, "Email Verification"),

        (PURPOSE_RESET, "Password Reset"),

    ]

    user = models.ForeignKey(

        settings.AUTH_USER_MODEL,

        on_delete=models.CASCADE,

        related_name="otps",

    )

    code = models.CharField(max_length=6)

    purpose = models.CharField(max_length=10, choices=PURPOSE_CHOICES)

    created_at = models.DateTimeField(auto_now_add=True)

    is_used = models.BooleanField(default=False)

    attempts = models.PositiveSmallIntegerField(default=0)

    OTP_VALID_MINUTES = 10

    MAX_ATTEMPTS = 5

    RESEND_COOLDOWN_SECONDS = 60

    def __str__(self):

        return f"OTP({self.user.username}, {self.purpose}, used={self.is_used})"

    @property

    def is_expired(self):

        return timezone.now() - self.created_at > timezone.timedelta(minutes=self.OTP_VALID_MINUTES)

    @property

    def is_valid(self):

        return not self.is_used and not self.is_expired and self.attempts < self.MAX_ATTEMPTS

    @classmethod

    def generate_code(cls):

        return f"{random.randint(0, 999999):06d}"

    @classmethod

    def create_for_user(cls, user, purpose):

        """Invalidates any previous unused OTPs of the same purpose, then creates a fresh one."""

        cls.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)

        return cls.objects.create(user=user, purpose=purpose, code=cls.generate_code())

    @classmethod

    def can_resend(cls, user, purpose):

        """Cooldown check — returns True if enough time has passed since the last OTP was sent."""

        last = cls.objects.filter(user=user, purpose=purpose).order_by("-created_at").first()

        if last is None:

            return True

        return timezone.now() - last.created_at > timezone.timedelta(seconds=cls.RESEND_COOLDOWN_SECONDS)        