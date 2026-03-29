"""
Configuration module for PulsePoint application.
Handles environment-based settings and security configuration.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

from utils.feed_loader import load_feeds


# Load environment variables from .env file
basedir = Path(__file__).parent
load_dotenv(basedir / ".env")


def _load_rss_feeds():
    try:
        return load_feeds()
    except Exception as exc:
        raise RuntimeError(f"Failed to load RSS feeds: {exc}") from exc
    

class Config:
    """Base configuration class with common settings."""

    # Flask settings
    SECRET_KEY = os.getenv("SECRET_KEY", os.urandom(32).hex())

    # Flask-Caching settings
    CACHE_TYPE = os.getenv("CACHE_TYPE", "SimpleCache")
    CACHE_DEFAULT_TIMEOUT = int(os.getenv("CACHE_DEFAULT_TIMEOUT", 300))

    # Redis configuration (if using Redis cache)
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CACHE_REDIS_URL = REDIS_URL

    # Performance optimization settings
    ENABLE_COMPRESSION = os.getenv("ENABLE_COMPRESSION", "true").lower() == "true"
    COMPRESSION_LEVEL = int(os.getenv("COMPRESSION_LEVEL", 6))

    # Cache settings for different content types
    CACHE_RSS_TIMEOUT = int(os.getenv("CACHE_RSS_TIMEOUT", 600))
    CACHE_PAGE_TIMEOUT = int(os.getenv("CACHE_PAGE_TIMEOUT", 300))
    CACHE_API_TIMEOUT = int(os.getenv("CACHE_API_TIMEOUT", 180))

    # RSS feeds loaded from JSON
    RSS_FEEDS = _load_rss_feeds()

    # Request settings
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", 5))
    MAX_ARTICLES_PER_FEED = int(os.getenv("MAX_ARTICLES_PER_FEED", 10))

    # Security settings
    TALISMAN_FORCE_HTTPS = os.getenv("TALISMAN_FORCE_HTTPS", "false").lower() == "true"


class DevelopmentConfig(Config):
    """Development environment configuration."""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production environment configuration."""
    DEBUG = False
    TESTING = False
    TALISMAN_FORCE_HTTPS = True
    CACHE_TYPE = "RedisCache"


class TestingConfig(Config):
    """Testing environment configuration."""
    DEBUG = True
    TESTING = True
    CACHE_TYPE = "SimpleCache"


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config(env=None):
    """Get configuration based on environment."""
    if env is None:
        env = os.getenv("FLASK_ENV", "development")
    return config.get(env, config["default"])