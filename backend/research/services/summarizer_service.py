import os
import time
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from httpx import ConnectError, ReadTimeout, RemoteProtocolError

load_dotenv()

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3
)

summary_prompt = ChatPromptTemplate.from_template(
    """You are a research assistant. Summarize the following article in 3-5 concise bullet points,
focusing specifically on information relevant to the topic: "{topic}"

Article text:
{article_text}

Summary (bullet points only, no preamble):"""
)

summarize_chain = summary_prompt | llm

# Errors worth retrying — transient network/connection issues, not bad input
RETRYABLE_ERRORS = (ConnectError, ReadTimeout, RemoteProtocolError)

def summarize_article(topic: str, article_text: str, max_chars: int = 3000, max_retries: int = 2) -> tuple[str, int]:
    """
    Summarizes a single article's text, focused on the given topic.
    Returns (summary_text, tokens_used) so callers can track usage.
    Retries once on transient connection errors; falls back to a placeholder
    summary (0 tokens) if Groq is unreachable after retrying, so one bad
    article doesn't crash the whole report.
    """
    truncated_text = article_text[:max_chars]

    attempt = 0
    while True:
        try:
            response = summarize_chain.invoke({
                "topic": topic,
                "article_text": truncated_text
            })

            summary_text = response.content
            usage = getattr(response, "usage_metadata", None)
            tokens_used = usage["total_tokens"] if usage else 0

            return summary_text, tokens_used

        except RETRYABLE_ERRORS as e:
            attempt += 1
            if attempt > max_retries:
                # Give up gracefully — this article gets a placeholder instead of
                # crashing the whole pipeline. 0 tokens since nothing was actually used.
                return f"[Summary unavailable — connection to the summarization service failed: {e}]", 0
            time.sleep(1)  # brief pause before retry, since it's usually a momentary hiccup