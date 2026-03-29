"""
Feed loading utilities for PulsePoint.
Loads RSS feed definitions from JSON.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_FEEDS_FILE = BASE_DIR / "data" / "feeds.json"


def load_feeds(feeds_file: Path | None = None) -> list[dict[str, Any]]:
    """
    Load RSS feeds from a JSON file.

    Args:
        feeds_file: Optional custom path to feeds.json

    Returns:
        List of active feed dictionaries

    Raises:
        FileNotFoundError: If the feeds file does not exist
        ValueError: If the JSON is invalid or not a list
    """
    feeds_path = feeds_file or DEFAULT_FEEDS_FILE

    if not feeds_path.exists():
        raise FileNotFoundError(f"Feeds file not found: {feeds_path}")

    try:
        with feeds_path.open("r", encoding="utf-8") as f:
            feeds = json.load(f)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in feeds file: {feeds_path}") from exc

    if not isinstance(feeds, list):
        raise ValueError("Feeds JSON must contain a list of feed objects")

    active_feeds: list[dict[str, Any]] = []

    for index, feed in enumerate(feeds, start=1):
        if not isinstance(feed, dict):
            raise ValueError(f"Feed entry #{index} is not an object")

        if feed.get("active", True):
            active_feeds.append(feed)

    return active_feeds