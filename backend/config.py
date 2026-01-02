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
            'name': 'The Guardian Business',
            'url': 'https://www.theguardian.com/uk/business/rss',
        },
        {
            'name': 'The Guardian Uk News',
            'url': 'https://www.theguardian.com/uk-news/rss',
        },
        {
            'name': 'The Guardian World News',
            'url': 'https://www.theguardian.com/world/rss',
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
            'name': 'The Globe and Mail - World',
            'url': 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/world/',
        },
        {
            'name': 'The Globe and Mail - Canada',
            'url': 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/canada/',
        },
        {
            'name': 'Toronto Star',
            'url': 'https://www.thestar.com/search/?f=rss&t=article&bl=2827101&l=20',
        },
        {
            'name': 'Business Day Nigeria',
            'url': 'https://businessday.ng/feed/',
        },
        {
            'name': 'Sahara Reporters',
            'url': 'http://saharareporters.com/feeds/latest/feed',
        },
        {
            'name': 'Premium Times',
            'url': 'https://www.premiumtimesng.com/feed',
        },
        {
            'name': 'NPR',
            'url': 'https://www.npr.org/rss/rss.php?id=1001',
        },
        {
            'name': 'Punch Nigeria',
            'url': 'https://rss.punchng.com/v1/category/latest_news',
        },
        {
            'name': 'Vanguard News',
            'url': 'https://www.vanguardngr.com/feed/',
        },
        {
            'name': 'Sydney Morning Herald',
            'url': 'https://www.smh.com.au/rss/feed.xml',
        },
        {
            'name': 'Sydney Morning Herald World',
            'url': 'https://www.smh.com.au/rss/world.xml',
        },
        {
            'name': 'The Standard Headlines',
            'url': 'https://www.standardmedia.co.ke/rss/headlines.php',
        },
        {
            'name': 'The Standard World',
            'url': 'https://www.standardmedia.co.ke/rss/world.php',
        },
        {
            'name': 'The Standard Kenya',
            'url': 'https://www.standardmedia.co.ke/rss/kenya.php',
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
