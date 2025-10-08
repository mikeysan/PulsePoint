"""
Security utilities for PulsePoint application.
Provides input sanitization and validation to prevent XSS and injection attacks.
"""
import bleach
from urllib.parse import urlparse


def sanitize_html(text, strip=True):
    """
    Sanitize HTML content to prevent XSS attacks.

    Args:
        text (str): The text to sanitize
        strip (bool): Whether to strip all HTML tags (default: True)

    Returns:
        str: Sanitized text
    """
    if not text:
        return ""

    if strip:
        # Strip all HTML tags for user input
        return bleach.clean(text, tags=[], strip=True)
    else:
        # Allow safe HTML tags for content display
        allowed_tags = ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li']
        allowed_attrs = {'a': ['href', 'title']}
        return bleach.clean(
            text, tags=allowed_tags, attributes=allowed_attrs, strip=True
        )


def sanitize_url(url):
    """
    Validate and sanitize URLs.

    Args:
        url (str): The URL to validate

    Returns:
        str: Sanitized URL or empty string if invalid
    """
    if not url:
        return ""

    try:
        parsed = urlparse(url)
        # Only allow http and https schemes
        if parsed.scheme not in ['http', 'https']:
            return ""
        # Ensure there's a network location (domain)
        if not parsed.netloc:
            return ""
        return url.strip()
    except Exception:
        return ""


def truncate_text(text, max_length=200, suffix='...'):
    """
    Truncate text to a maximum length.

    Args:
        text (str): The text to truncate
        max_length (int): Maximum length (default: 200)
        suffix (str): Suffix to add if truncated (default: '...')

    Returns:
        str: Truncated text
    """
    if not text:
        return ""

    text = text.strip()
    if len(text) <= max_length:
        return text

    return text[: max_length - len(suffix)].rsplit(' ', 1)[0] + suffix


def validate_feed_data(feed_entry):
    """
    Validate and sanitize RSS feed entry data.

    Args:
        feed_entry (dict): Raw feed entry data

    Returns:
        dict: Validated and sanitized feed entry or None if invalid
    """
    try:
        # Extract and validate required fields
        title = feed_entry.get('title', '').strip()
        link = feed_entry.get('link', '').strip()

        if not title or not link:
            return None

        # Sanitize and truncate fields
        sanitized_entry = {
            'title': sanitize_html(title, strip=True),
            'link': sanitize_url(link),
            'summary': truncate_text(
                sanitize_html(feed_entry.get('summary', ''), strip=False), max_length=300
            ),
            'published': feed_entry.get('published', ''),
            'source': sanitize_html(feed_entry.get('source', 'Unknown'), strip=True),
        }

        # Validate URL
        if not sanitized_entry['link']:
            return None

        return sanitized_entry

    except Exception:
        return None
