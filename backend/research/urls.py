
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewset import ResearchReportViewSet
from .views import debug_migrate

router = DefaultRouter()
router.register(r'reports', ResearchReportViewSet, basename='report')

urlpatterns = [
    path('debug-migrate/', debug_migrate),
    path('', include(router.urls)),
]