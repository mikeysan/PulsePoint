"""
WSGI entry point for PulsePoint application.
"""
import os
from app import create_app

# Create application instance
app = create_app(os.getenv('FLASK_ENV', 'production'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
