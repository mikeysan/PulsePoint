"""
Routes for PulsePoint application.
Defines API endpoints and view handlers using Flask Blueprints.
"""
import asyncio
import time
from flask import Blueprint, render_template, jsonify, current_app, request

from . import cache
from .services.rss_reader import RSSReader

# Create blueprint
main_bp = Blueprint('main', __name__)


@main_bp.route('/')
@cache.cached(timeout=300)  # Cache for 5 minutes (configurable via CACHE_PAGE_TIMEOUT)
def index():
    """
    Render the main news feed page.

    Returns:
        HTML: Rendered template with news articles
    """
    try:
        # Get RSS feeds from config
        feeds = current_app.config['RSS_FEEDS']
        timeout = current_app.config['REQUEST_TIMEOUT']
        max_articles = current_app.config['MAX_ARTICLES_PER_FEED']

        # Create RSS reader
        reader = RSSReader(timeout=timeout, max_articles=max_articles)

        # Fetch all feeds (run async in sync context)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            feed_results = loop.run_until_complete(reader.fetch_all_feeds(feeds))
            articles = reader.get_all_articles(feed_results)
        finally:
            loop.close()

        return render_template('index.html', articles=articles)

    except Exception as e:
        current_app.logger.error(f"Error fetching news: {str(e)}")
        return render_template('index.html', articles=[], error=str(e))


@main_bp.route('/api/news')
@cache.cached(timeout=180)  # Cache for 3 minutes (configurable via CACHE_API_TIMEOUT)
def get_news():
    """
    API endpoint to get news articles as JSON.

    Returns:
        JSON: List of news articles
    """
    try:
        # Get RSS feeds from config
        feeds = current_app.config['RSS_FEEDS']
        timeout = current_app.config['REQUEST_TIMEOUT']
        max_articles = current_app.config['MAX_ARTICLES_PER_FEED']

        # Create RSS reader
        reader = RSSReader(timeout=timeout, max_articles=max_articles)

        # Fetch all feeds
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            feed_results = loop.run_until_complete(reader.fetch_all_feeds(feeds))
            articles = reader.get_all_articles(feed_results)
        finally:
            loop.close()

        # Convert articles to dictionaries
        articles_data = [article.to_dict() for article in articles]

        return jsonify(
            {'success': True, 'count': len(articles_data), 'articles': articles_data}
        )

    except Exception as e:
        current_app.logger.error(f"API Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@main_bp.route('/api/health')
def health_check():
    """
    Health check endpoint for monitoring.

    Returns:
        JSON: Health status
    """
    return jsonify({'status': 'healthy', 'service': 'PulsePoint'})


@main_bp.route('/api/performance')
def performance_monitoring():
    """
    Performance monitoring endpoint for tracking application metrics.

    Returns:
        JSON: Performance metrics and system information
    """
    try:
        import time
        import psutil

        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        # Cache metrics
        cache_stats = {
            'type': current_app.config.get('CACHE_TYPE', 'unknown'),
            'default_timeout': current_app.config.get('CACHE_DEFAULT_TIMEOUT', 300),
        }

        # RSS feed configuration
        rss_config = {
            'total_feeds': len(current_app.config['RSS_FEEDS']),
            'timeout': current_app.config['REQUEST_TIMEOUT'],
            'max_articles_per_feed': current_app.config['MAX_ARTICLES_PER_FEED'],
        }

        metrics = {
            'timestamp': time.time(),
            'system': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_gb': round(memory.available / (1024**3), 2),
                'disk_percent': disk.percent,
                'disk_free_gb': round(disk.free / (1024**3), 2),
            },
            'cache': cache_stats,
            'rss_config': rss_config,
            'performance_features': {
                'compression_enabled': current_app.config.get('ENABLE_COMPRESSION', True),
                'critical_css_enabled': True,
                'resource_hints_enabled': True,
                'async_css_loading': True,
            }
        }

        return jsonify({
            'success': True,
            'metrics': metrics,
            'service': 'PulsePoint Performance Monitor'
        })

    except Exception as e:
        current_app.logger.error(f"Performance monitoring error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'service': 'PulsePoint Performance Monitor'
        }), 500


@main_bp.route('/api/performance/vitals', methods=['POST'])
def record_core_web_vitals():
    """
    Endpoint to record Core Web Vitals metrics from client-side.

    Returns:
        JSON: Success status
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        # Log the Core Web Vitals metrics
        current_app.logger.info(f"Core Web Vitals - LCP: {data.get('lcp')}, FID: {data.get('fid')}, CLS: {data.get('cls')}")

        # Here you could store these metrics in a database or monitoring service
        # For now, we'll just log them and return success

        return jsonify({
            'success': True,
            'message': 'Core Web Vitals recorded successfully',
            'recorded_at': time.time()
        })

    except Exception as e:
        current_app.logger.error(f"Error recording Core Web Vitals: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
