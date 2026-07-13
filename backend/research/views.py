import io
from django.http import JsonResponse
from django.core.management import call_command
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def debug_migrate(request):
    output = io.StringIO()
    try:
        call_command('migrate', stdout=output, stderr=output, interactive=False)
        result = output.getvalue()
    except Exception as e:
        result = f"ERROR: {str(e)}\n\n{output.getvalue()}"

    return JsonResponse({"output": result})