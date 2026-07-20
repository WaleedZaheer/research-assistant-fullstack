from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewset import ResearchReportViewSet
from .views import stream_report_view

router = DefaultRouter()
router.register(r'reports', ResearchReportViewSet, basename='report')

urlpatterns = [
    path('reports/<int:report_id>/stream/', stream_report_view),
    path('', include(router.urls)),
]