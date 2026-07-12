from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewset import ResearchReportViewSet

router = DefaultRouter()
router.register(r'reports', ResearchReportViewSet, basename='report')

urlpatterns = [
    path('', include(router.urls)),
]