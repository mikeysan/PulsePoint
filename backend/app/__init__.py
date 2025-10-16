"""
Flask application factory for PulsePoint.
"""
from flask import Flask, make_response
from flask_caching import Cache
from flask_talisman import Talisman
from flask_compress import Compress

from config import get_config

# Initialize extensions
cache = Cache()
talisman = Talisman()
compress = Compress()


def create_app(config_name=None):
    """
    Application factory pattern for Flask.

    Args:
        config_name (str): Configuration environment name

    Returns:
        Flask: Configured Flask application
    """
    app = Flask(
        __name__,
        template_folder='../../frontend/templates',
        static_folder='../../frontend/static',
    )

    # Load configuration
    config_obj = get_config(config_name)
    app.config.from_object(config_obj)

    # Initialize extensions
    cache.init_app(app)

    # Initialize compression middleware
    if app.config.get('ENABLE_COMPRESSION', True):
        compress.init_app(app)

    # Initialize Talisman for security headers (only in production)
    if app.config.get('TALISMAN_FORCE_HTTPS'):
        talisman.init_app(
            app,
            force_https=True,
            strict_transport_security=True,
            content_security_policy={
                'default-src': ["'self'", 'https://cdn.jsdelivr.net'],
                'style-src': ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
                'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
            },
        )

    # Add performance headers
    @app.after_request
    def add_performance_headers(response):
        # Add caching headers for different content types
        if response.content_type and 'text/html' in response.content_type:
            # Stale-while-revalidate for HTML pages
            response.headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=600'
        elif response.content_type and ('text/css' in response.content_type or
                                       'application/javascript' in response.content_type):
            # Long caching for static assets
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'

        # Add compression header indicator
        if app.config.get('ENABLE_COMPRESSION', True):
            response.headers['Vary'] = 'Accept-Encoding'

        return response

    # Register blueprints
    from .routes import main_bp

    app.register_blueprint(main_bp)

    return app
