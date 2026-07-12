from rest_framework import viewsets, permissions
from rest_framework.pagination import PageNumberPagination
from .models import ResearchReport
from .serializers import ResearchReportSerializer, ResearchReportCreateSerializer
from .pipeline import process_report


class ReportPagination(PageNumberPagination):
    page_size = 10


class ResearchReportViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ReportPagination

    def get_queryset(self):
        return ResearchReport.objects.filter(user=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return ResearchReportCreateSerializer
        return ResearchReportSerializer

    def perform_create(self, serializer):
        report = serializer.save(user=self.request.user)
        process_report(report.id)