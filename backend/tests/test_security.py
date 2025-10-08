"""
Unit tests for security utilities.
"""
import pytest
from app.utils.security import (
    sanitize_html,
    sanitize_url,
    truncate_text,
    validate_feed_data,
)


class TestSanitizeHTML:
    """Tests for HTML sanitization."""

    def test_sanitize_html_strips_tags(self):
        """Test that HTML tags are stripped by default."""
        html = "<script>alert('xss')</script>Hello"
        result = sanitize_html(html)
        assert result == "alert('xss')Hello"
        assert "<script>" not in result

    def test_sanitize_html_with_safe_tags(self):
        """Test that safe tags are preserved when strip=False."""
        html = "<p>Hello <strong>World</strong></p>"
        result = sanitize_html(html, strip=False)
        assert "<p>" in result
        assert "<strong>" in result

    def test_sanitize_html_empty_string(self):
        """Test handling of empty string."""
        assert sanitize_html("") == ""
        assert sanitize_html(None) == ""

    def test_sanitize_html_removes_dangerous_attrs(self):
        """Test that dangerous attributes are removed."""
        html = '<a href="http://example.com" onclick="alert()">Link</a>'
        result = sanitize_html(html, strip=False)
        assert "onclick" not in result


class TestSanitizeURL:
    """Tests for URL sanitization."""

    def test_sanitize_url_valid_http(self):
        """Test valid HTTP URL."""
        url = "http://example.com"
        assert sanitize_url(url) == url

    def test_sanitize_url_valid_https(self):
        """Test valid HTTPS URL."""
        url = "https://example.com"
        assert sanitize_url(url) == url

    def test_sanitize_url_invalid_scheme(self):
        """Test that invalid schemes are rejected."""
        url = "javascript:alert('xss')"
        assert sanitize_url(url) == ""

    def test_sanitize_url_empty(self):
        """Test handling of empty URL."""
        assert sanitize_url("") == ""
        assert sanitize_url(None) == ""

    def test_sanitize_url_no_netloc(self):
        """Test URL without network location."""
        url = "http://"
        assert sanitize_url(url) == ""


class TestTruncateText:
    """Tests for text truncation."""

    def test_truncate_text_short(self):
        """Test that short text is not truncated."""
        text = "Hello World"
        assert truncate_text(text, max_length=100) == text

    def test_truncate_text_long(self):
        """Test that long text is truncated."""
        text = "This is a very long text " * 10
        result = truncate_text(text, max_length=50)
        assert len(result) <= 50
        assert result.endswith("...")

    def test_truncate_text_empty(self):
        """Test handling of empty text."""
        assert truncate_text("") == ""
        assert truncate_text(None) == ""

    def test_truncate_text_custom_suffix(self):
        """Test custom suffix."""
        text = "This is a long text that needs truncation"
        result = truncate_text(text, max_length=20, suffix=" [more]")
        assert result.endswith(" [more]")


class TestValidateFeedData:
    """Tests for feed data validation."""

    def test_validate_feed_data_valid(self):
        """Test validation of valid feed entry."""
        entry = {
            'title': 'Test Article',
            'link': 'https://example.com/article',
            'summary': 'This is a test summary',
            'published': '2025-01-01',
            'source': 'Test Source',
        }
        result = validate_feed_data(entry)
        assert result is not None
        assert result['title'] == 'Test Article'
        assert result['link'] == 'https://example.com/article'

    def test_validate_feed_data_missing_title(self):
        """Test validation fails without title."""
        entry = {'link': 'https://example.com/article', 'summary': 'Summary'}
        result = validate_feed_data(entry)
        assert result is None

    def test_validate_feed_data_missing_link(self):
        """Test validation fails without link."""
        entry = {'title': 'Test Article', 'summary': 'Summary'}
        result = validate_feed_data(entry)
        assert result is None

    def test_validate_feed_data_sanitizes_html(self):
        """Test that HTML is sanitized in feed data."""
        entry = {
            'title': '<script>alert()</script>Title',
            'link': 'https://example.com/article',
            'summary': '<p>Summary</p>',
        }
        result = validate_feed_data(entry)
        assert result is not None
        assert '<script>' not in result['title']

    def test_validate_feed_data_invalid_url(self):
        """Test validation fails with invalid URL."""
        entry = {
            'title': 'Test Article',
            'link': 'javascript:alert()',
            'summary': 'Summary',
        }
        result = validate_feed_data(entry)
        assert result is None
