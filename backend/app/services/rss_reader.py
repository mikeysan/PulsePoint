"""
RSS feed reader service for PulsePoint application.
Fetches and parses RSS feeds asynchronously with error handling.
"""
import asyncio
import logging
from datetime import datetime
from typing import List

import aiohttp
import feedparser
from dateutil import parser as date_parser

from ..models import Article, FeedResult
from ..utils.security import validate_feed_data

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RSSReader:
    """Asynchronous RSS feed reader."""

    def __init__(self, timeout=10, max_articles=10):
        """
        Initialize RSS reader.

        Args:
            timeout (int): Request timeout in seconds
            max_articles (int): Maximum articles per feed
        """
        self.timeout = timeout
        self.max_articles = max_articles

    async def fetch_feed(self, feed_name, feed_url):
        """
        Fetch and parse a single RSS feed.

        Args:
            feed_name (str): Name of the feed source
            feed_url (str): URL of the RSS feed

        Returns:
            FeedResult: Result containing articles or error
        """
        try:
            # Fetch feed content with timeout
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    feed_url,
                    timeout=aiohttp.ClientTimeout(total=self.timeout),
                    headers={'User-Agent': 'PulsePoint/1.0'},
                ) as response:
                    if response.status != 200:
                        logger.error(
                            f"Failed to fetch {feed_name}: HTTP {response.status}"
                        )
                        return FeedResult(
                            source=feed_name,
                            url=feed_url,
                            success=False,
                            error=f"HTTP {response.status}",
                        )

                    content = await response.text()

            # Parse feed
            feed = feedparser.parse(content)

            if feed.bozo:
                logger.warning(f"Feed parsing issue for {feed_name}: {feed.bozo_exception}")

            # Extract articles
            articles = []
            for entry in feed.entries[: self.max_articles]:
                article_data = self._extract_article_data(entry, feed_name)
                if article_data:
                    # Validate and sanitize
                    validated_data = validate_feed_data(article_data)
                    if validated_data:
                        articles.append(
                            Article(
                                title=validated_data['title'],
                                link=validated_data['link'],
                                summary=validated_data['summary'],
                                source=validated_data['source'],
                                published=validated_data['published'],
                                published_parsed=self._parse_date(
                                    validated_data['published']
                                ),
                            )
                        )

            logger.info(f"Successfully fetched {len(articles)} articles from {feed_name}")
            return FeedResult(source=feed_name, url=feed_url, articles=articles)

        except asyncio.TimeoutError:
            logger.error(f"Timeout fetching {feed_name}")
            return FeedResult(
                source=feed_name, url=feed_url, success=False, error="Timeout"
            )
        except Exception as e:
            logger.error(f"Error fetching {feed_name}: {str(e)}")
            return FeedResult(
                source=feed_name, url=feed_url, success=False, error=str(e)
            )

    def _extract_article_data(self, entry, source_name):
        """
        Extract article data from feed entry.

        Args:
            entry: Feed entry object
            source_name (str): Name of the source

        Returns:
            dict: Extracted article data or None
        """
        try:
            return {
                'title': entry.get('title', ''),
                'link': entry.get('link', ''),
                'summary': entry.get('summary', entry.get('description', '')),
                'published': entry.get('published', ''),
                'source': source_name,
            }
        except Exception as e:
            logger.error(f"Error extracting article data: {str(e)}")
            return None

    def _parse_date(self, date_string):
        """
        Parse date string to datetime object.

        Args:
            date_string (str): Date string to parse

        Returns:
            datetime: Parsed datetime or None
        """
        if not date_string:
            return None

        try:
            return date_parser.parse(date_string)
        except Exception:
            return None

    async def fetch_all_feeds(self, feeds):
        """
        Fetch multiple RSS feeds concurrently.

        Args:
            feeds (list): List of feed dictionaries with 'name' and 'url'

        Returns:
            list: List of FeedResult objects
        """
        tasks = [self.fetch_feed(feed['name'], feed['url']) for feed in feeds]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out exceptions and convert to FeedResult
        feed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Exception for feed {feeds[i]['name']}: {str(result)}")
                feed_results.append(
                    FeedResult(
                        source=feeds[i]['name'],
                        url=feeds[i]['url'],
                        success=False,
                        error=str(result),
                    )
                )
            else:
                feed_results.append(result)

        return feed_results

    def get_all_articles(self, feed_results):
        """
        Extract all articles from feed results and sort by date.

        Args:
            feed_results (list): List of FeedResult objects

        Returns:
            list: Sorted list of Article objects
        """
        all_articles = []
        for result in feed_results:
            if result.success:
                all_articles.extend(result.articles)

        # Sort by published date (newest first)
        # Use a very old date that's timezone-aware for comparison
        min_date = datetime(1970, 1, 1).replace(tzinfo=None)
        all_articles.sort(
            key=lambda x: (x.published_parsed.replace(tzinfo=None) if x.published_parsed else min_date),
            reverse=True
        )

        return all_articles
