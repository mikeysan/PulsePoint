"""
Configuration module for PulsePoint application.
Handles environment-based settings and security configuration.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
basedir = Path(__file__).parent
load_dotenv(basedir / '.env')


class Config:
    """Base configuration class with common settings."""

    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', os.urandom(32).hex())

    # Flask-Caching settings
    CACHE_TYPE = os.getenv('CACHE_TYPE', 'SimpleCache')
    CACHE_DEFAULT_TIMEOUT = int(os.getenv('CACHE_DEFAULT_TIMEOUT', 300))  # 5 minutes

    # Redis configuration (if using Redis cache)
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_REDIS_URL = REDIS_URL

    # Performance optimization settings
    ENABLE_COMPRESSION = os.getenv('ENABLE_COMPRESSION', 'true').lower() == 'true'
    COMPRESSION_LEVEL = int(os.getenv('COMPRESSION_LEVEL', 6))

    # Cache settings for different content types
    CACHE_RSS_TIMEOUT = int(os.getenv('CACHE_RSS_TIMEOUT', 600))  # 10 minutes for RSS feeds
    CACHE_PAGE_TIMEOUT = int(os.getenv('CACHE_PAGE_TIMEOUT', 300))  # 5 minutes for pages
    CACHE_API_TIMEOUT = int(os.getenv('CACHE_API_TIMEOUT', 180))  # 3 minutes for API

    # RSS Feed URLs - verified working feeds
    RSS_FEEDS = [
        {
            'name': 'BBC News',
            'url': 'https://feeds.bbci.co.uk/news/rss.xml',
        },
        {
            'name': 'The Guardian',
            'url': 'https://www.theguardian.com/uk/rss',
        },
        {
            'name': 'Sky News',
            'url': 'https://feeds.skynews.com/feeds/rss/home.xml',
        },
        {
            'name': 'Al Jazeera',
            'url': 'https://www.aljazeera.com/xml/rss/all.xml',
        },
        {
            'name': 'TechCrunch',
            'url': 'https://techcrunch.com/feed/',
        },
        {
            'name': 'Wired',
            'url': 'https://www.wired.com/feed/rss',
        },
        {
            'name': 'The Verge',
            'url': 'https://www.theverge.com/rss/index.xml',
        },
        {
            'name': 'NASA',
            'url': 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
        },
        {
            'name': 'CNN',
            'url': 'http://rss.cnn.com/rss/edition.rss',
        },
        {
            'name': 'NPR',
            'url': 'https://www.npr.org/rss/rss.php?id=1001',
        },
    ]

    # Request settings - optimized for performance
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', 5))  # Reduced from 10s to 5s for faster failover
    MAX_ARTICLES_PER_FEED = int(os.getenv('MAX_ARTICLES_PER_FEED', 10))

    # Security settings
    TALISMAN_FORCE_HTTPS = os.getenv('TALISMAN_FORCE_HTTPS', 'false').lower() == 'true'


class DevelopmentConfig(Config):
    """Development environment configuration."""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production environment configuration."""
    DEBUG = False
    TESTING = False
    TALISMAN_FORCE_HTTPS = True
    CACHE_TYPE = 'RedisCache'  # Use Redis in production


class TestingConfig(Config):
    """Testing environment configuration."""
    DEBUG = True
    TESTING = True
    CACHE_TYPE = 'SimpleCache'


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig,
}


def get_config(env=None):
    """Get configuration based on environment."""
    if env is None:
        env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])
