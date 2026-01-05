
import logging
from typing import Dict, Any, List
from flask import current_app
from .. import cache
from .rss_reader import RSSReader

logger = logging.getLogger(__name__)

# Cache key for globe data
GLOBE_DATA_CACHE_KEY = 'globe_data_v1'

async def get_globe_data() -> Dict[str, Any]:
    """
    Fetches all RSS feeds and reorganizes them into a country-based structure
    suitable for the 3D Globe visualization.
    
    Returns:
        Dict[str, Any]: A dictionary where keys are country ISO codes (e.g., "NG", "GB")
                        and values contain country metadata and a list of stories.
    """
    # 1. Check Cache
    cached_data = cache.get(GLOBE_DATA_CACHE_KEY)
    if cached_data:
        logger.info("Serving globe data from cache")
        return cached_data

    logger.info("Cache miss. Fetching fresh globe data...")
    
    # 2. Setup Configuration Map
    feeds_config = current_app.config['RSS_FEEDS']
    # Map 'feed_name' -> config_dict for easy lookup later
    feed_config_map = {f['name']: f for f in feeds_config}
    
    # 3. Fetch Feeds
    reader = RSSReader(
        timeout=current_app.config['REQUEST_TIMEOUT'],
        max_articles=current_app.config['MAX_ARTICLES_PER_FEED']
    )
    
    # RSSReader.fetch_all_feeds takes a list of dicts with 'name' and 'url'
    # We can pass the whole config list as it contains those keys
    results = await reader.fetch_all_feeds(feeds_config)
    
    # 4. Aggregate & Transform
    globe_data = {}
    
    for result in results:
        if not result.success:
            continue
            
        feed_name = result.source
        config = feed_config_map.get(feed_name)
        
        if not config or 'country_iso' not in config:
            continue
            
        country_iso = config['country_iso']
        
        # Initialize country bucket if needed
        if country_iso not in globe_data:
            country_details = _get_country_details(country_iso)
            globe_data[country_iso] = {
                'id': country_iso,
                'name': country_details['name'],
                'area_sq_km': country_details.get('area_sq_km'),
                'population': country_details.get('population'),
                'languages': country_details.get('languages', []),
                'lat': config['lat'],
                'lng': config['lng'],
                'story_count': 0,
                'stories': []
            }
        
        # Append stories
        # FeedResult.articles contains Article objects. We need to serialize them for JSON.
        for article in result.articles:
            globe_data[country_iso]['stories'].append({
                'title': article.title,
                'link': article.link,
                'source': article.source,
                'published': article.published,
                'summary': article.summary
            })
            
    # 5. Final cleanups (counts, sorting, etc.)
    for iso, country_data in globe_data.items():
        country_data['story_count'] = len(country_data['stories'])
        # Sort stories by date? They might already be sorted per feed, but not mixed.
        # Simple string comparison on published date is risky, but acceptable for MVP 
        # given generic RSS date formats. Better to use the parsed date if we exposed it more easily.
        # For now, we trust the order or leave it mixed.
        
    # 6. Cache the result
    # Cache duration: 5-10 minutes (300-600s). Config has CACHE_RSS_TIMEOUT (600s)
    timeout = current_app.config.get('CACHE_RSS_TIMEOUT', 600)
    cache.set(GLOBE_DATA_CACHE_KEY, globe_data, timeout=timeout)
    
    return globe_data

def _get_country_details(iso_code: str) -> Dict[str, Any]:
    """Helper to map ISO codes to country metadata."""
    defaults = {
        'name': iso_code,
        'area_sq_km': None,
        'population': None,
        'languages': []
    }
    
    # Data source: roughly 2024 estimates
    data = {
        'NG': {
            'name': 'Nigeria',
            'area_sq_km': 923768,
            'population': 223800000,
            'languages': ['English']
        },
        'GB': {
            'name': 'United Kingdom',
            'area_sq_km': 242495,
            'population': 67700000,
            'languages': ['English']
        },
        'US': {
            'name': 'United States',
            'area_sq_km': 9833520,
            'population': 334900000,
            'languages': ['English']
        },
        'QA': {
            'name': 'Qatar',
            'area_sq_km': 11586,
            'population': 2700000,
            'languages': ['Arabic']
        },
        'CA': {
            'name': 'Canada',
            'area_sq_km': 9984670,
            'population': 40000000,
            'languages': ['English', 'French']
        },
        'AU': {
            'name': 'Australia',
            'area_sq_km': 7692024,
            'population': 26500000,
            'languages': ['English']
        },
        'KE': {
            'name': 'Kenya',
            'area_sq_km': 580367,
            'population': 56000000,
            'languages': ['Swahili', 'English']
        },
        'IN': {
            'name': 'India',
            'area_sq_km': 3287263,
            'population': 1428000000,
            'languages': ['Hindi', 'English']
        },
        'PK': {
            'name': 'Pakistan',
            'area_sq_km': 881913,
            'population': 240000000,
            'languages': ['Urdu', 'English']
        },
        'SG': {
            'name': 'Singapore',
            'area_sq_km': 728,
            'population': 5900000,
            'languages': ['English', 'Malay', 'Mandarin', 'Tamil']
        },
        'PH': {
            'name': 'Philippines',
            'area_sq_km': 300000,
            'population': 117000000,
            'languages': ['Filipino', 'English']
        },
        'BD': {
            'name': 'Bangladesh',
            'area_sq_km': 148460,
            'population': 173000000,
            'languages': ['Bengali']
        },
        'LK': {
            'name': 'Sri Lanka',
            'area_sq_km': 65610,
            'population': 22000000,
            'languages': ['Sinhala', 'Tamil']
        },
        'AE': {
            'name': 'United Arab Emirates',
            'area_sq_km': 83600,
            'population': 9500000,
            'languages': ['Arabic']
        },
        'KR': {
            'name': 'South Korea',
            'area_sq_km': 100210,
            'population': 51700000,
            'languages': ['Korean']
        },
        'IL': {
            'name': 'Israel',
            'area_sq_km': 22072,
            'population': 9700000,
            'languages': ['Hebrew']
        },
        'GH': {
            'name': 'Ghana',
            'area_sq_km': 238535,
            'population': 34000000,
            'languages': ['English']
        },
        'TH': {
            'name': 'Thailand',
            'area_sq_km': 513120,
            'population': 71800000,
            'languages': ['Thai']
        }
    }
    
    return data.get(iso_code, defaults)
