import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3
)


report_prompt = ChatPromptTemplate.from_template(
    """You are a research assistant compiling a report on the topic: "{topic}"

Below are summaries from {num_sources} different sources. Synthesize them into a well-structured
research report in Markdown format. The report must include:

1. A short introduction (2-3 sentences) framing the topic
2. A "## Key Findings" section with the main themes across sources, written as prose or bullet points
3. Note any disagreements or differing perspectives between sources, if present
4. A "## Sources" section at the end listing all source URLs

When referencing a specific finding, mention the source naturally within the sentence
(e.g., "a report from the Benton Institute found..." or "according to Yale's Budget Lab...").
Infer a reasonable, natural way to refer to each source from its URL or content — do NOT
use numbered citations, brackets, or footnote markers anywhere in the text.

{sources_block}

Write the full report now:"""
)

output_parser = StrOutputParser()

report_chain = report_prompt | llm | output_parser


def format_sources_block(summaries: list[dict]) -> str:
    """
    Takes a list of {url, summary} dicts and formats them into
    a labeled block for the prompt.
    """
    block_parts = []
    for i, item in enumerate(summaries, 1):
        block_parts.append(
            f"Source {i}: {item['url']}\nSummary: {item['summary']}\n"
        )
    return "\n".join(block_parts)


def generate_report(topic: str, summaries: list[dict]) -> str:
    """
    Compiles all article summaries into one structured Markdown report.
    summaries: list of {url, summary} dicts
    """
    sources_block = format_sources_block(summaries)

    report = report_chain.invoke({
        "topic": topic,
        "num_sources": len(summaries),
        "sources_block": sources_block
    })

    return report