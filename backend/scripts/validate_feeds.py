#!/usr/bin/env python3
"""
Validate RSS feeds listed in data/feeds.json.

What it checks:
- JSON loads successfully
- top-level structure is a list
- each feed is an object
- required fields are present
- field types are sensible
- country_iso is 2 uppercase letters
- lat/lng are within valid ranges
- duplicate names are flagged
- duplicate URLs are flagged

Usage:
    python scripts/validate_feeds.py
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


PROJECT_ROOT = Path(__file__).resolve().parent.parent
FEEDS_FILE = PROJECT_ROOT / "data" / "feeds.json"

COUNTRY_ISO_RE = re.compile(r"^[A-Z]{2}$")


def load_raw_feeds(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Feeds file not found: {path}")

    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {path}: {exc}") from exc

    if not isinstance(data, list):
        raise ValueError("feeds.json must contain a top-level list")

    for index, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Feed entry #{index} is not an object")

    return data


def is_valid_url(value: str) -> bool:
    try:
        parsed = urlparse(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False


def validate_feed(feed: dict[str, Any], index: int) -> list[str]:
    errors: list[str] = []

    required_fields = ["name", "url", "country_iso", "lat", "lng", "region_name"]

    for field in required_fields:
        if field not in feed:
            errors.append(f"Entry #{index}: missing required field '{field}'")

    if errors:
        return errors

    name = feed["name"]
    url = feed["url"]
    country_iso = feed["country_iso"]
    lat = feed["lat"]
    lng = feed["lng"]
    region_name = feed["region_name"]
    active = feed.get("active", True)

    if not isinstance(name, str) or not name.strip():
        errors.append(f"Entry #{index}: 'name' must be a non-empty string")

    if not isinstance(url, str) or not is_valid_url(url):
        errors.append(f"Entry #{index}: 'url' must be a valid http/https URL")

    if not isinstance(country_iso, str) or not COUNTRY_ISO_RE.fullmatch(country_iso):
        errors.append(f"Entry #{index}: 'country_iso' must be a 2-letter uppercase code")

    if not isinstance(region_name, str) or not region_name.strip():
        errors.append(f"Entry #{index}: 'region_name' must be a non-empty string")

    if not isinstance(active, bool):
        errors.append(f"Entry #{index}: 'active' must be a boolean when present")

    if not isinstance(lat, (int, float)):
        errors.append(f"Entry #{index}: 'lat' must be numeric")
    elif not (-90 <= float(lat) <= 90):
        errors.append(f"Entry #{index}: 'lat' must be between -90 and 90")

    if not isinstance(lng, (int, float)):
        errors.append(f"Entry #{index}: 'lng' must be numeric")
    elif not (-180 <= float(lng) <= 180):
        errors.append(f"Entry #{index}: 'lng' must be between -180 and 180")

    return errors


def find_duplicates(feeds: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []

    names = [feed.get("name", "").strip() for feed in feeds if isinstance(feed.get("name"), str)]
    urls = [feed.get("url", "").strip() for feed in feeds if isinstance(feed.get("url"), str)]

    name_counts = Counter(name for name in names if name)
    url_counts = Counter(url for url in urls if url)

    duplicate_names = sorted(name for name, count in name_counts.items() if count > 1)
    duplicate_urls = sorted(url for url, count in url_counts.items() if count > 1)

    for name in duplicate_names:
        errors.append(f"Duplicate feed name: {name}")

    for url in duplicate_urls:
        errors.append(f"Duplicate feed URL: {url}")

    return errors


def main() -> int:
    try:
        feeds = load_raw_feeds(FEEDS_FILE)
    except Exception as exc:
        print(f"[FAIL] {exc}", file=sys.stderr)
        return 2

    errors: list[str] = []

    for index, feed in enumerate(feeds, start=1):
        errors.extend(validate_feed(feed, index))

    errors.extend(find_duplicates(feeds))

    if errors:
        print("Validation failed:\n")
        for error in errors:
            print(f"- {error}")
        print(f"\nTotal errors: {len(errors)}")
        return 1

    print(f"Validation passed: {len(feeds)} feed(s) checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())