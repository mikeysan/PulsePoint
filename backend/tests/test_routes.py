"""
Unit tests for Flask routes.
"""
import pytest
from app import create_app


@pytest.fixture
def client():
    """Create test client."""
    app = create_app('testing')
    app.config['TESTING'] = True

    with app.test_client() as client:
        yield client


class TestRoutes:
    """Tests for application routes."""

    def test_index_route_exists(self, client):
        """Test that index route exists."""
        response = client.get('/')
        assert response.status_code == 200

    def test_index_route_returns_html(self, client):
        """Test that index route returns HTML."""
        response = client.get('/')
        assert response.content_type == 'text/html; charset=utf-8'

    def test_index_route_contains_title(self, client):
        """Test that index route contains PulsePoint title."""
        response = client.get('/')
        assert b'PulsePoint' in response.data

    def test_api_news_route_exists(self, client):
        """Test that API news route exists."""
        response = client.get('/api/news')
        assert response.status_code == 200

    def test_api_news_returns_json(self, client):
        """Test that API news route returns JSON."""
        response = client.get('/api/news')
        assert response.content_type == 'application/json'

    def test_api_news_response_structure(self, client):
        """Test API news response structure."""
        response = client.get('/api/news')
        data = response.get_json()

        assert 'success' in data
        assert 'articles' in data
        assert isinstance(data['articles'], list)

    def test_health_check_route(self, client):
        """Test health check endpoint."""
        response = client.get('/api/health')
        assert response.status_code == 200

        data = response.get_json()
        assert data['status'] == 'healthy'
        assert data['service'] == 'PulsePoint'

    def test_health_check_returns_json(self, client):
        """Test that health check returns JSON."""
        response = client.get('/api/health')
        assert response.content_type == 'application/json'

    def test_404_route(self, client):
        """Test 404 error for non-existent route."""
        response = client.get('/nonexistent')
        assert response.status_code == 404


class TestCaching:
    """Tests for route caching."""

    def test_index_caching(self, client):
        """Test that index route is cached."""
        # First request
        response1 = client.get('/')
        # Second request should be cached
        response2 = client.get('/')

        assert response1.status_code == 200
        assert response2.status_code == 200

    def test_api_news_caching(self, client):
        """Test that API news route is cached."""
        # First request
        response1 = client.get('/api/news')
        # Second request should be cached
        response2 = client.get('/api/news')

        assert response1.status_code == 200
        assert response2.status_code == 200


class TestTemplateRendering:
    """Tests for template rendering."""

    def test_base_template_elements(self, client):
        """Test that base template elements are present."""
        response = client.get('/')
        data = response.data.decode('utf-8')

        assert 'PulsePoint' in data
        assert 'Your Streamlined News Pulse' in data
        assert 'Bootstrap' in data or 'bootstrap' in data

    def test_news_container_exists(self, client):
        """Test that news container exists in template."""
        response = client.get('/')
        assert b'news-container' in response.data
