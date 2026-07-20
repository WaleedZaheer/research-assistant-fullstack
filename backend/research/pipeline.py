import json
import traceback
from django.utils import timezone
from .models import ResearchReport, Source
from .services.search_service import search_web
from .services.scraper_service import scrape_article
from .services.summarizer_service import summarize_article
from .services.report_builder import generate_report, generate_report_stream
from .services.graph import build_graph


def process_report(report_id):
    """
    Runs the full research pipeline for a given report ID:
    search -> scrape -> summarize -> compile report -> save to database.
    """
    report = ResearchReport.objects.get(id=report_id)
    profile = report.user.profile

    if not profile.has_capacity():
        report.status = 'failed'
        report.save()
        return

    try:
        report.status = 'processing'
        report.save()

        app = build_graph()
        result = app.invoke({"topic": report.topic})

        # If every source failed to summarize, treat the whole report as failed
        # rather than saving a report full of placeholder text
        total_sources = len(result.get("summaries", []))
        failures = result.get("summarize_failures", 0)
        if total_sources > 0 and failures == total_sources:
            report.status = 'failed'
            report.save()
            return

        report.content = result["final_report"]
        report.status = 'done'
        report.completed_at = timezone.now()
        report.save()

        profile.record_usage(result.get("tokens_used", 0))

        profile.record_usage(result.get("tokens_used", 0))

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
        report.status = 'failed'
        report.save()
        raise e


def sse_event(data: dict) -> str:
    """Formats a Python dict as one SSE ('Server-Sent Event') message."""
    return f"data: {json.dumps(data)}\n\n"


def stream_process_report(report_id):
    """
    Generator version of the pipeline. Yields SSE-formatted strings
    as each step completes, and saves the final result to the database
    once everything is done.
    """
    report = ResearchReport.objects.get(id=report_id)
    profile = report.user.profile

    if not profile.has_capacity():
        report.status = 'failed'
        report.save()
        yield sse_event({
            "type": "error",
            "message": "Session token limit reached. Try again after your session resets."
        })
        return

    report.status = 'processing'
    report.save()

    try:
        yield sse_event({"type": "progress", "message": "Searching the web..."})
        search_results = search_web(report.topic)

        scraped_articles = []
        for i, item in enumerate(search_results, 1):
            yield sse_event({"type": "progress", "message": f"Reading article {i} of {len(search_results)}..."})
            result = scrape_article(item["url"], fallback_snippet=item["snippet"])
            scraped_articles.append(result)

        summaries = []
        total_tokens = 0
        for i, article in enumerate(scraped_articles, 1):
            yield sse_event({"type": "progress", "message": f"Summarizing source {i} of {len(scraped_articles)}..."})
            summary_text, tokens = summarize_article(report.topic, article["content"])
            summaries.append({"url": article["url"], "summary": summary_text})
            total_tokens += tokens

        yield sse_event({"type": "progress", "message": "Writing your report..."})

        final_report = ""
        for chunk in generate_report_stream(report.topic, summaries):
            final_report += chunk
            yield sse_event({"type": "token", "text": chunk})

        report.content = final_report
        report.status = 'done'
        report.completed_at = timezone.now()
        report.save()

        profile.record_usage(total_tokens)

        for summary_item in summaries:
            matching_search_result = next(
                (s for s in search_results if s["url"] == summary_item["url"]),
                None
            )
            Source.objects.create(
                report=report,
                url=summary_item["url"],
                title=matching_search_result["title"] if matching_search_result else "",
                summary=summary_item["summary"]
            )

        yield sse_event({"type": "done", "report_id": report.id})

    except Exception as e:
        report.status = 'failed'
        traceback.print_exc()

        report.save()
        yield sse_event({"type": "error", "message": "Something went wrong while generating your report."})
