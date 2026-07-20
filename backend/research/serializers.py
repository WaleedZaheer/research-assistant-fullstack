from rest_framework import serializers
from .models import ResearchReport, Source

class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = ['id', 'url', 'title', 'summary']


class ResearchReportSerializer(serializers.ModelSerializer):
    sources = SourceSerializer(many=True, read_only=True)

    class Meta:
        model = ResearchReport
        fields = ['id', 'topic', 'status', 'content', 'created_at', 'completed_at', 'archived', 'sources']
        read_only_fields = ['status', 'content']


class ResearchReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchReport
        fields = ['id', 'topic', 'status']
        read_only_fields = ['status']