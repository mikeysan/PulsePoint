"""
Flask application factory for PulsePoint.
"""
from flask import Flask
from flask_caching import Cache
from flask_talisman import Talisman

from config import get_config

# Initialize extensions
cache = Cache()
talisman = Talisman()


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

    # Register blueprints
    from .routes import main_bp

    app.register_blueprint(main_bp)

    return app
