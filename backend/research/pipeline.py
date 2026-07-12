from django.utils import timezone
from .models import ResearchReport, Source
from .services.graph import build_graph


def process_report(report_id):
    """
    Runs the full research pipeline for a given report ID:
    search -> scrape -> summarize -> compile report -> save to database.
    """
    try:
        report = ResearchReport.objects.get(id=report_id)
        report.status = 'processing'
        report.save()

        app = build_graph()
        result = app.invoke({"topic": report.topic})

        report.content = result["final_report"]
        report.status = 'done'
        report.completed_at = timezone.now()
        report.save()

        for summary_item in result["summaries"]:
            matching_search_result = next(
                (s for s in result["search_results"] if s["url"] == summary_item["url"]),
                None
            )
            Source.objects.create(
                report=report,
                url=summary_item["url"],
                title=matching_search_result["title"] if matching_search_result else "",
                summary=summary_item["summary"]
            )

    except Exception as e:
        report = ResearchReport.objects.get(id=report_id)
        report.status = 'failed'
        report.save()
        raise e