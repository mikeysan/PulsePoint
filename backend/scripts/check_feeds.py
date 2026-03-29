#!/usr/bin/env python3
"""
Check RSS feeds listed in data/feeds.json.

What it does:
- loads feeds from JSON
- requests each feed URL
- checks HTTP status
- checks content type
- attempts to parse feed content
- prints a readable report
- exits non-zero if any feed fails

Usage:
    python scripts/check_feeds.py
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import feedparser
import requests

# Allow running from project root without packaging changes
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.feed_loader import load_feeds  # noqa: E402


DEFAULT_TIMEOUT = 10


def check_feed(feed: dict[str, Any], timeout: int = DEFAULT_TIMEOUT) -> dict[str, Any]:
    name = feed.get("name", "<unknown>")
    url = feed.get("url", "")
    result: dict[str, Any] = {
        "name": name,
        "url": url,
        "ok": False,
        "status_code": None,
        "content_type": None,
        "entries": 0,
        "error": None,
    }

    if not url:
        result["error"] = "Missing URL"
        return result

    try:
        response = requests.get(
            url,
            timeout=timeout,
            headers={
                "User-Agent": "PulsePointFeedChecker/1.0 (+https://example.com)"
            },
            allow_redirects=True,
        )
        result["status_code"] = response.status_code
        result["content_type"] = response.headers.get("Content-Type", "")

        response.raise_for_status()

        parsed = feedparser.parse(response.content)

        if parsed.bozo:
            bozo_exc = getattr(parsed, "bozo_exception", None)
            result["error"] = f"Parse error: {bozo_exc}" if bozo_exc else "Parse error"
            return result

        entries = getattr(parsed, "entries", [])
        result["entries"] = len(entries)

        feed_meta = getattr(parsed, "feed", {})
        has_feed_meta = bool(feed_meta)
        has_entries = len(entries) > 0

        if not has_feed_meta and not has_entries:
            result["error"] = "Not a valid RSS/Atom feed"
            return result

        result["ok"] = True
        return result

    except requests.Timeout:
        result["error"] = "Request timed out"
        return result
    except requests.TooManyRedirects:
        result["error"] = "Too many redirects"
        return result
    except requests.RequestException as exc:
        result["error"] = f"Request failed: {exc}"
        return result
    except Exception as exc:
        result["error"] = f"Unexpected error: {exc}"
        return result


def main() -> int:
    try:
        feeds = load_feeds()
    except Exception as exc:
        print(f"Failed to load feeds: {exc}", file=sys.stderr)
        return 2

    if not feeds:
        print("No active feeds found.")
        return 0

    passed = 0
    failed = 0

    print(f"Checking {len(feeds)} feed(s)...\n")

    for feed in feeds:
        result = check_feed(feed)

        if result["ok"]:
            passed += 1
            print(
                f"[OK]   {result['name']} | "
                f"HTTP {result['status_code']} | "
                f"entries={result['entries']} | "
                f"{result['url']}"
            )
        else:
            failed += 1
            print(
                f"[FAIL] {result['name']} | "
                f"HTTP {result['status_code']} | "
                f"error={result['error']} | "
                f"{result['url']}"
            )

    print("\nSummary")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Total:  {len(feeds)}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())