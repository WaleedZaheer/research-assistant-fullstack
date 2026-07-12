import os
from dotenv import load_dotenv
from tavily import TavilyClient

# Load environment variables from .env file
load_dotenv()

# Initialize Tavily client with API key
tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


def search_web(topic: str, max_results: int = 5) -> list[dict]:
    """
    Searches the web for a given topic using Tavily.
    Returns a list of dicts: [{title, url, snippet}, ...]
    """
    response = tavily_client.search(
        query=topic,
        max_results=max_results
    )

    results = []
    for item in response["results"]:
        results.append({
            "title": item["title"],
            "url": item["url"],
            "snippet": item["content"]  # Tavily's own extracted snippet — used as fallback later
        })

    return results

if __name__ == "__main__":
    topic = input("Enter a topic to search: ")
    results = search_web(topic)

    print(f"Found {len(results)} results for: {topic}\n")
    for i, r in enumerate(results, 1):
        print(f"{i}. {r['title']}")
        print(f"   URL: {r['url']}")
        print(f"   Snippet: {r['snippet'][:150]}...")
        print("---")
