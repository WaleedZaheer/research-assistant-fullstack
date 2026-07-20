from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, END

from .search_service import search_web
from .scraper_service import scrape_article
from .summarizer_service import summarize_article
from .report_builder import generate_report


class ResearchState(TypedDict):
    topic: str
    search_results: List[Dict]
    scraped_articles: List[Dict]
    summaries: List[Dict]
    final_report: str
    tokens_used: int
    summarize_failures: int  # NEW — count of articles that failed to summarize # NEW — accumulated across all Groq calls in this run


def search_node(state: ResearchState) -> ResearchState:
    results = search_web(state["topic"])
    state["search_results"] = results
    return state


def scrape_node(state: ResearchState) -> ResearchState:
    scraped = []
    for item in state["search_results"]:
        result = scrape_article(item["url"], fallback_snippet=item["snippet"])
        scraped.append(result)
    state["scraped_articles"] = scraped
    return state


def summarize_node(state: ResearchState) -> ResearchState:
    summaries = []
    total_tokens = 0
    failed_count = 0

    for article in state["scraped_articles"]:
        summary_text, tokens = summarize_article(state["topic"], article["content"])
        summaries.append({
            "url": article["url"],
            "summary": summary_text
        })
        total_tokens += tokens
        if tokens == 0 and summary_text.startswith("[Summary unavailable"):
            failed_count += 1

    state["summaries"] = summaries
    state["tokens_used"] = total_tokens
    state["summarize_failures"] = failed_count
    return state


def report_node(state: ResearchState) -> ResearchState:
    report = generate_report(state["topic"], state["summaries"])
    state["final_report"] = report
    return state


def build_graph():
    graph = StateGraph(ResearchState)

    graph.add_node("search", search_node)
    graph.add_node("scrape", scrape_node)
    graph.add_node("summarize", summarize_node)
    graph.add_node("report", report_node)

    graph.set_entry_point("search")
    graph.add_edge("search", "scrape")
    graph.add_edge("scrape", "summarize")
    graph.add_edge("summarize", "report")
    graph.add_edge("report", END)

    return graph.compile()