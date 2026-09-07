"""
Shared article retrieval for PulsePoint.

One cached fetch backs the feed page, /api/news and the briefing/clustering
pipeline, so generating a briefing does not re-fetch every source that
/api/news just fetched.
"""
import logging

from flask import current_app

from .. import cache
from ..utils.async_helpers import run_coro
from .rss_reader import RSSReader

logger = logging.getLogger(__name__)

ARTICLES_CACHE_KEY = 'all_articles_v1'


def get_articles():
    """
    Return articles from every configured feed, fetching only on a cache miss.

    Returns:
        list[Article]: Articles across all feeds, or [] if the fetch fails.
    """
    cached = cache.get(ARTICLES_CACHE_KEY)
    if cached is not None:
        return cached

    reader = RSSReader(
        timeout=current_app.config['REQUEST_TIMEOUT'],
        max_articles=current_app.config['MAX_ARTICLES_PER_FEED'],
    )

    feed_results = run_coro(reader.fetch_all_feeds, current_app.config['RSS_FEEDS'])
    articles = reader.get_all_articles(feed_results)

    cache.set(
        ARTICLES_CACHE_KEY,
        articles,
        timeout=current_app.config.get('CACHE_RSS_TIMEOUT', 600),
    )
    return articles
