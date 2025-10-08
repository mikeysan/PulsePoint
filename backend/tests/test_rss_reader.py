"""
Unit tests for RSS reader service.
"""
import pytest
from datetime import datetime
from app.services.rss_reader import RSSReader
from app.models import Article, FeedResult


class TestRSSReader:
    """Tests for RSSReader class."""

    def test_init(self):
        """Test RSSReader initialization."""
        reader = RSSReader(timeout=15, max_articles=20)
        assert reader.timeout == 15
        assert reader.max_articles == 20

    def test_init_defaults(self):
        """Test RSSReader initialization with defaults."""
        reader = RSSReader()
        assert reader.timeout == 10
        assert reader.max_articles == 10

    def test_extract_article_data(self):
        """Test article data extraction."""
        reader = RSSReader()
        entry = {
            'title': 'Test Article',
            'link': 'https://example.com',
            'summary': 'Test summary',
            'published': '2025-01-01',
        }
        result = reader._extract_article_data(entry, 'Test Source')
        assert result is not None
        assert result['title'] == 'Test Article'
        assert result['link'] == 'https://example.com'
        assert result['source'] == 'Test Source'

    def test_extract_article_data_with_description(self):
        """Test article data extraction with description fallback."""
        reader = RSSReader()
        entry = {
            'title': 'Test Article',
            'link': 'https://example.com',
            'description': 'Test description',
            'published': '2025-01-01',
        }
        result = reader._extract_article_data(entry, 'Test Source')
        assert result['summary'] == 'Test description'

    def test_parse_date_valid(self):
        """Test date parsing with valid date string."""
        reader = RSSReader()
        date_string = 'Wed, 01 Jan 2025 12:00:00 GMT'
        result = reader._parse_date(date_string)
        assert isinstance(result, datetime)

    def test_parse_date_invalid(self):
        """Test date parsing with invalid date string."""
        reader = RSSReader()
        result = reader._parse_date('invalid date')
        assert result is None

    def test_parse_date_empty(self):
        """Test date parsing with empty string."""
        reader = RSSReader()
        result = reader._parse_date('')
        assert result is None

    def test_get_all_articles_sorting(self):
        """Test article sorting by date."""
        reader = RSSReader()

        # Create feed results with articles
        article1 = Article(
            title='Article 1',
            link='https://example.com/1',
            summary='Summary 1',
            source='Source 1',
            published_parsed=datetime(2025, 1, 1),
        )

        article2 = Article(
            title='Article 2',
            link='https://example.com/2',
            summary='Summary 2',
            source='Source 2',
            published_parsed=datetime(2025, 1, 2),
        )

        article3 = Article(
            title='Article 3',
            link='https://example.com/3',
            summary='Summary 3',
            source='Source 3',
            published_parsed=datetime(2025, 1, 3),
        )

        feed_results = [
            FeedResult(
                source='Source 1', url='https://feed1.com', articles=[article1, article3]
            ),
            FeedResult(source='Source 2', url='https://feed2.com', articles=[article2]),
        ]

        articles = reader.get_all_articles(feed_results)

        # Should be sorted newest first
        assert len(articles) == 3
        assert articles[0].title == 'Article 3'
        assert articles[1].title == 'Article 2'
        assert articles[2].title == 'Article 1'

    def test_get_all_articles_filters_failed_feeds(self):
        """Test that failed feeds are filtered out."""
        reader = RSSReader()

        article1 = Article(
            title='Article 1',
            link='https://example.com/1',
            summary='Summary 1',
            source='Source 1',
        )

        feed_results = [
            FeedResult(source='Source 1', url='https://feed1.com', articles=[article1]),
            FeedResult(
                source='Source 2',
                url='https://feed2.com',
                success=False,
                error='Timeout',
            ),
        ]

        articles = reader.get_all_articles(feed_results)

        # Should only include successful feed
        assert len(articles) == 1
        assert articles[0].title == 'Article 1'


@pytest.mark.asyncio
async def test_fetch_feed_timeout():
    """Test feed fetching with timeout."""
    reader = RSSReader(timeout=0.001)  # Very short timeout
    result = await reader.fetch_feed('Test Feed', 'https://httpbin.org/delay/5')

    assert result.success is False
    assert result.source == 'Test Feed'


@pytest.mark.asyncio
async def test_fetch_all_feeds_empty():
    """Test fetching with empty feed list."""
    reader = RSSReader()
    results = await reader.fetch_all_feeds([])
    assert results == []
