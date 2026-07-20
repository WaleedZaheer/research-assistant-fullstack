from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import ResearchReport
from .pipeline import stream_process_report


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stream_report_view(request, report_id):
    report = ResearchReport.objects.get(id=report_id, user=request.user)

    if report.status not in ('pending',):
        def already_done():
            yield f"data: {{\"type\": \"done\", \"report_id\": {report.id}}}\n\n"
        return StreamingHttpResponse(already_done(), content_type='text/event-stream')

    response = StreamingHttpResponse(
        stream_process_report(report_id),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response