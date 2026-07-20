from rest_framework import viewsets, permissions
from rest_framework.pagination import PageNumberPagination
from .models import ResearchReport
from .serializers import ResearchReportSerializer, ResearchReportCreateSerializer


class ReportPagination(PageNumberPagination):
    page_size = 10


class ResearchReportViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ReportPagination

    def get_queryset(self):
        queryset = ResearchReport.objects.filter(user=self.request.user).order_by('-created_at')

        archived_param = self.request.query_params.get('archived')
        if archived_param is not None:
            is_archived = archived_param.lower() == 'true'
            queryset = queryset.filter(archived=is_archived)

        return queryset


     
    def get_serializer_class(self):
        if self.action == 'create':
            return ResearchReportCreateSerializer
        return ResearchReportSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)