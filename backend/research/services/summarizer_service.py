import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

# Initialize the Groq LLM — same model used across your other tasks
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3  # lower temperature = more focused, less creative summarization
)

# The prompt template — {topic} and {article_text} get filled in at call time
summary_prompt = ChatPromptTemplate.from_template(
    """You are a research assistant. Summarize the following article in 3-5 concise bullet points,
focusing specifically on information relevant to the topic: "{topic}"

Article text:
{article_text}

Summary (bullet points only, no preamble):"""
)

output_parser = StrOutputParser()

# The LCEL chain: prompt -> llm -> parser
summarize_chain = summary_prompt | llm | output_parser


def summarize_article(topic: str, article_text: str, max_chars: int = 3000) -> str:
    """
    Summarizes a single article's text, focused on the given topic.
    Truncates very long article text to keep prompts manageable.
    """
    truncated_text = article_text[:max_chars]

    summary = summarize_chain.invoke({
        "topic": topic,
        "article_text": truncated_text
    })

    return summary
