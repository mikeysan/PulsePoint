
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
            globe_data[country_iso] = {
                'id': country_iso,
                'name': _get_country_name(country_iso), # Helper logic below
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

def _get_country_name(iso_code: str) -> str:
    """Helper to map ISO codes to display names."""
    # Could use pycountry library, but keeping deps minimal for now.
    mapping = {
        'NG': 'Nigeria',
        'GB': 'United Kingdom',
        'US': 'United States',
        'QA': 'Qatar',
        'CA': 'Canada',
        'AU': 'Australia',
        'KE': 'Kenya'
    }
    return mapping.get(iso_code, iso_code)
