from django.db import models
from django.contrib.auth.models import User

class ResearchReport(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('done', 'Done'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    topic = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    content = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.topic} ({self.status})"


class Source(models.Model):
    report = models.ForeignKey(ResearchReport, on_delete=models.CASCADE, related_name='sources')
    url = models.URLField()
    title = models.CharField(max_length=500)
    summary = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.title