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
        # United Kingdom
        {
            'name': 'BBC News',
            'url': 'https://feeds.bbci.co.uk/news/rss.xml',
            'country_iso': 'GB',
            'lat': 51.5074,
            'lng': -0.1278,
            'region_name': 'London',
        },
        {
            'name': 'The Guardian Business',
            'url': 'https://www.theguardian.com/uk/business/rss',
            'country_iso': 'GB',
            'lat': 51.5074,
            'lng': -0.1278,
            'region_name': 'London',
        },
        {
            'name': 'The Guardian Uk News',
            'url': 'https://www.theguardian.com/uk-news/rss',
            'country_iso': 'GB',
            'lat': 51.5074,
            'lng': -0.1278,
            'region_name': 'London',
        },
        {
            'name': 'The Guardian World News',
            'url': 'https://www.theguardian.com/world/rss',
            'country_iso': 'GB',
            'lat': 51.5074,
            'lng': -0.1278,
            'region_name': 'London',
        },
        {
            'name': 'Sky News',
            'url': 'https://feeds.skynews.com/feeds/rss/home.xml',
            'country_iso': 'GB',
            'lat': 51.5074,
            'lng': -0.1278,
            'region_name': 'London',
        },

        # Qatar
        {
            'name': 'Al Jazeera',
            'url': 'https://www.aljazeera.com/xml/rss/all.xml',
            'country_iso': 'QA',
            'lat': 25.2854,
            'lng': 51.5310,
            'region_name': 'Doha',
        },

        # Canada
        {
            'name': 'The Globe and Mail - World',
            'url': 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/world/',
            'country_iso': 'CA',
            'lat': 43.6532,
            'lng': -79.3832,
            'region_name': 'Toronto',
        },
        {
            'name': 'The Globe and Mail - Canada',
            'url': 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/canada/',
            'country_iso': 'CA',
            'lat': 43.6532,
            'lng': -79.3832,
            'region_name': 'Toronto',
        },
        {
            'name': 'Toronto Star',
            'url': 'https://www.thestar.com/search/?f=rss&t=article&bl=2827101&l=20',
            'country_iso': 'CA',
            'lat': 43.6532,
            'lng': -79.3832,
            'region_name': 'Toronto',
        },

        # Nigeria
        {
            'name': 'Business Day Nigeria',
            'url': 'https://businessday.ng/feed/',
            'country_iso': 'NG',
            'lat': 6.5244,
            'lng': 3.3792,
            'region_name': 'Lagos',
        },
        {
            'name': 'Sahara Reporters',
            'url': 'http://saharareporters.com/feeds/latest/feed',
            'country_iso': 'NG',
            'lat': 6.5244,
            'lng': 3.3792,
            'region_name': 'Lagos',
        },
        {
            'name': 'Premium Times',
            'url': 'https://www.premiumtimesng.com/feed',
            'country_iso': 'NG',
            'lat': 9.0765,
            'lng': 7.3986,
            'region_name': 'Abuja',
        },
        {
            'name': 'Punch Nigeria',
            'url': 'https://rss.punchng.com/v1/category/latest_news',
            'country_iso': 'NG',
            'lat': 6.5244,
            'lng': 3.3792,
            'region_name': 'Lagos',
        },
        {
            'name': 'Vanguard News',
            'url': 'https://www.vanguardngr.com/feed/',
            'country_iso': 'NG',
            'lat': 6.5244,
            'lng': 3.3792,
            'region_name': 'Lagos',
        },

        # USA
        {
            'name': 'NPR',
            'url': 'https://feeds.npr.org/1001/rss.xml',
            'country_iso': 'US',
            'lat': 38.9072,
            'lng': -77.0369,
            'region_name': 'Washington, D.C.',
        },
        {
            'name': 'TechCrunch',
            'url': 'https://techcrunch.com/feed/',
            'country_iso': 'US',
            'lat': 37.7749,
            'lng': -122.4194,
            'region_name': 'San Francisco',
        },
        {
            'name': 'Wired',
            'url': 'https://www.wired.com/feed/rss',
            'country_iso': 'US',
            'lat': 37.7749,
            'lng': -122.4194,
            'region_name': 'San Francisco',
        },
        {
            'name': 'The Verge',
            'url': 'https://www.theverge.com/rss/index.xml',
            'country_iso': 'US',
            'lat': 40.7128,
            'lng': -74.0060,
            'region_name': 'New York',
        },
        {
            'name': 'NASA Breaking News',
            'url': 'http://www.nasa.gov/rss/breaking_news.rss',
            'country_iso': 'US',
            'lat': 38.8833,
            'lng': -77.0167,
            'region_name': 'Washington, D.C.',
        },
        {
            'name': 'CNN Top Stories',
            'url': 'http://rss.cnn.com/rss/cnn_topstories.rss',
            'country_iso': 'US',
            'lat': 33.7490,
            'lng': -84.3880,
            'region_name': 'Atlanta',
        },

        # Australia
        {
            'name': 'Sydney Morning Herald',
            'url': 'https://www.smh.com.au/rss/feed.xml',
            'country_iso': 'AU',
            'lat': -33.8688,
            'lng': 151.2093,
            'region_name': 'Sydney',
        },
        {
            'name': 'Sydney Morning Herald World',
            'url': 'https://www.smh.com.au/rss/world.xml',
            'country_iso': 'AU',
            'lat': -33.8688,
            'lng': 151.2093,
            'region_name': 'Sydney',
        },

        # Kenya
        {
            'name': 'The Standard Headlines',
            'url': 'https://www.standardmedia.co.ke/rss/headlines.php',
            'country_iso': 'KE',
            'lat': -1.2921,
            'lng': 36.8219,
            'region_name': 'Nairobi',
        },
        {
            'name': 'The Standard World',
            'url': 'https://www.standardmedia.co.ke/rss/world.php',
            'country_iso': 'KE',
            'lat': -1.2921,
            'lng': 36.8219,
            'region_name': 'Nairobi',
        },
        {
            'name': 'The Standard Kenya',
            'url': 'https://www.standardmedia.co.ke/rss/kenya.php',
            'country_iso': 'KE',
            'lat': -1.2921,
            'lng': 36.8219,
            'region_name': 'Nairobi',
        },
        # India
        {
            'name': 'Times of India',
            'url': 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
            'country_iso': 'IN',
            'lat': 28.6139,
            'lng': 77.2090,
            'region_name': 'New Delhi',
        },
        {
            'name': 'The Hindu',
            'url': 'https://www.thehindu.com/feeder/default.rss',
            'country_iso': 'IN',
            'lat': 28.6139,
            'lng': 77.2090,
            'region_name': 'New Delhi',
        },
        # Pakistan
        {
            'name': 'Dawn',
            'url': 'https://www.dawn.com/rss',
            'country_iso': 'PK',
            'lat': 33.6844,
            'lng': 73.0479,
            'region_name': 'Islamabad',
        },
        # Singapore
        {
            'name': 'The Straits Times',
            'url': 'https://www.straitstimes.com/news/world/rss.xml',
            'country_iso': 'SG',
            'lat': 1.3521,
            'lng': 103.8198,
            'region_name': 'Singapore',
        },
        # Philippines
        {
            'name': 'Philippine Daily Inquirer',
            'url': 'https://www.inquirer.net/fullfeed',
            'country_iso': 'PH',
            'lat': 14.5995,
            'lng': 120.9842,
            'region_name': 'Manila',
        },
        {
            'name': 'Manila Times',
            'url': 'https://www.manilatimes.net/rss',
            'country_iso': 'PH',
            'lat': 14.5995,
            'lng': 120.9842,
            'region_name': 'Manila',
        },
        # Bangladesh
        {
            'name': 'The Daily Star',
            'url': 'https://www.thedailystar.net/home/rss',
            'country_iso': 'BD',
            'lat': 23.8103,
            'lng': 90.4125,
            'region_name': 'Dhaka',
        },
        {
            'name': 'Dhaka Tribune',
            'url': 'https://www.dhakatribune.com/topic/rss',
            'country_iso': 'BD',
            'lat': 23.8103,
            'lng': 90.4125,
            'region_name': 'Dhaka',
        },
        # Sri Lanka
        {
            'name': 'Daily Mirror',
            'url': 'https://www.dailymirror.lk/rss',
            'country_iso': 'LK',
            'lat': 6.9271,
            'lng': 79.8612,
            'region_name': 'Colombo',
        },
        {
            'name': 'The Island',
            'url': 'https://island.lk/feed/',
            'country_iso': 'LK',
            'lat': 6.9271,
            'lng': 79.8612,
            'region_name': 'Colombo',
        },
        # UAE
        {
            'name': 'Gulf News',
            'url': 'https://gulfnews.com/rss',
            'country_iso': 'AE',
            'lat': 24.4539,
            'lng': 54.3773,
            'region_name': 'Abu Dhabi',
        },
        {
            'name': 'Khaleej Times',
            'url': 'https://www.khaleejtimes.com/rss',
            'country_iso': 'AE',
            'lat': 24.4539,
            'lng': 54.3773,
            'region_name': 'Abu Dhabi',
        },
        # South Korea
        {
            'name': 'Korea Herald',
            'url': 'https://www.koreaherald.com/rss',
            'country_iso': 'KR',
            'lat': 37.5665,
            'lng': 126.9780,
            'region_name': 'Seoul',
        },
        # Israel
        {
            'name': 'Jerusalem Post',
            'url': 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx',
            'country_iso': 'IL',
            'lat': 31.7683,
            'lng': 35.2137,
            'region_name': 'Jerusalem',
        },
        # Ghana
        {
            'name': 'Daily Graphic General News',
            'url': 'https://www.graphic.com.gh/general-news.feed?type=rss',
            'country_iso': 'GH',
            'lat': 5.6037,
            'lng': -0.1870,
            'region_name': 'Accra',
        },
        {
            'name': 'Daily Graphic All News',
            'url': 'https://www.graphic.com.gh/news.feed?type=rss',
            'country_iso': 'GH',
            'lat': 5.6037,
            'lng': -0.1870,
            'region_name': 'Accra',
        },        
        {
            'name': 'Daily Graphic Business News',
            'url': 'https://www.graphic.com.gh/business.feed?type=rss',
            'country_iso': 'GH',
            'lat': 5.6037,
            'lng': -0.1870,
            'region_name': 'Accra',
        },
        # Thailand
        {
            'name': 'Bangkok Post Most Recent',
            'url': 'https://www.bangkokpost.com/rss/data/most-recent.xml',
            'country_iso': 'TH',
            'lat': 13.7563,
            'lng': 100.5018,
            'region_name': 'Bangkok',
        },
        {
            'name': 'Bangkok Post Top Stories',
            'url': 'https://www.bangkokpost.com/rss/data/topstories.xml',
            'country_iso': 'TH',
            'lat': 13.7563,
            'lng': 100.5018,
            'region_name': 'Bangkok',
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
