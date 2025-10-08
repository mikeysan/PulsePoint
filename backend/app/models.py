"""
Data models for PulsePoint application.
Simple dataclasses to represent news articles and feed data.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Article:
    """Represents a single news article from an RSS feed."""

    title: str
    link: str
    summary: str
    source: str
    published: Optional[str] = None
    published_parsed: Optional[datetime] = None

    def to_dict(self):
        """Convert article to dictionary for JSON serialization."""
        return {
            'title': self.title,
            'link': self.link,
            'summary': self.summary,
            'source': self.source,
            'published': self.published or '',
            'published_parsed': (
                self.published_parsed.isoformat() if self.published_parsed else None
            ),
        }


@dataclass
class FeedResult:
    """Represents the result of fetching an RSS feed."""

    source: str
    url: str
    articles: list[Article] = field(default_factory=list)
    error: Optional[str] = None
    success: bool = True

    def to_dict(self):
        """Convert feed result to dictionary for JSON serialization."""
        return {
            'source': self.source,
            'url': self.url,
            'articles': [article.to_dict() for article in self.articles],
            'error': self.error,
            'success': self.success,
        }
