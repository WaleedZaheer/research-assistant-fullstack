import requests
from bs4 import BeautifulSoup

# Pretend to be a real browser so sites don't block us outright
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def scrape_article(url: str, fallback_snippet: str, timeout: int = 8) -> dict:
    """
    Attempts to scrape the full article text from a URL.
    Falls back to the Tavily snippet if scraping fails for any reason.

    Returns: {url, content, source: "scraped" | "fallback"}
    """
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout)
        response.raise_for_status()  # raises an error for 4xx/5xx status codes

        soup = BeautifulSoup(response.text, "html.parser")

        # Grab all paragraph text — the most common place article content lives
        paragraphs = soup.find_all("p")
        text = " ".join(p.get_text(strip=True) for p in paragraphs)

        # If scraping succeeded but returned almost nothing useful,
        # treat it the same as a failure (common with JS-heavy pages)
        if len(text) < 200:
            raise ValueError("Scraped content too short, likely JS-rendered page")

        return {
            "url": url,
            "content": text,
            "source": "scraped"
        }

    except Exception as e:
        # Any failure — network, parsing, too-short content — falls back to Tavily's snippet
        print(f"Scraping failed for {url}: {e}")
        return {
            "url": url,
            "content": fallback_snippet,
            "source": "fallback"
        }


