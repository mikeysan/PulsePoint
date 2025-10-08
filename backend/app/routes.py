"""
Routes for PulsePoint application.
Defines API endpoints and view handlers using Flask Blueprints.
"""
import asyncio
from flask import Blueprint, render_template, jsonify, current_app

from . import cache
from .services.rss_reader import RSSReader

# Create blueprint
main_bp = Blueprint('main', __name__)


@main_bp.route('/')
@cache.cached(timeout=300)  # Cache for 5 minutes
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
@cache.cached(timeout=300)  # Cache for 5 minutes
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
