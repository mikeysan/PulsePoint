"""
End-to-End Tests for Globe Visualization

These tests verify the complete functionality of the globe visualization feature,
including API endpoints, data aggregation, and user interactions.

Run with: pytest backend/tests/test_globe_e2e.py -v
"""

import pytest
from flask import Flask
from bs4 import BeautifulSoup
import json


@pytest.mark.usefixtures("client")
class TestGlobeE2E:
    """E2E tests for globe visualization feature"""

    def test_globe_view_loads(self, client):
        """Test that the globe view page loads successfully"""
        response = client.get('/globe')
        assert response.status_code == 200
        assert b'globe' in response.data.lower()

    def test_globe_view_has_required_elements(self, client):
        """Test that the globe view contains all required HTML elements"""
        response = client.get('/globe')
        soup = BeautifulSoup(response.data, 'html.parser')

        # Check for required elements
        assert soup.find('div', {'id': 'globe-container'}) is not None
        assert soup.find('div', {'id': 'globe-tooltip'}) is not None
        assert soup.find('div', {'id': 'sideDrawer'}) is not None
        assert soup.find('div', {'id': 'drawerBackdrop'}) is not None

    def test_globe_view_has_accessibility_features(self, client):
        """Test that the globe view has proper accessibility attributes"""
        response = client.get('/globe')
        soup = BeautifulSoup(response.data, 'html.parser')

        # Check for ARIA attributes
        container = soup.find('div', {'id': 'globe-container'})
        assert container is not None
        assert container.get('role') == 'application'
        assert container.get('aria-label') is not None
        assert container.get('tabindex') == '0'

        # Check for live region
        announcer = soup.find('div', {'id': 'globe-announcer'})
        assert announcer is not None
        assert announcer.get('aria-live') == 'polite'

        # Check for skip link
        skip_link = soup.find('a', {'class': 'skip-link'})
        assert skip_link is not None

    def test_globe_api_returns_data(self, client):
        """Test that the /api/globe-data endpoint returns valid data"""
        response = client.get('/api/globe-data')
        assert response.status_code == 200

        data = json.loads(response.data)
        assert isinstance(data, dict)
        assert len(data) > 0  # Should have at least one country

    def test_globe_api_has_metadata(self, client):
        """Test that the globe API includes metadata"""
        response = client.get('/api/globe-data')
        assert response.status_code == 200

        data = json.loads(response.data)
        assert '_meta' in data

        metadata = data['_meta']
        assert 'last_updated' in metadata
        assert 'total_countries' in metadata
        assert 'total_stories' in metadata

    def test_globe_api_country_structure(self, client):
        """Test that each country in the API has the required structure"""
        response = client.get('/api/globe-data')
        data = json.loads(response.data)

        # Get first country key (excluding _meta)
        country_keys = [k for k in data.keys() if k != '_meta']
        if country_keys:
            country = data[country_keys[0]]

            # Check required fields
            assert 'id' in country
            assert 'name' in country
            assert 'lat' in country
            assert 'lng' in country
            assert 'story_count' in country
            assert 'stories' in country

            # Check stories structure
            stories = country['stories']
            assert isinstance(stories, list)

            if stories:
                story = stories[0]
                assert 'title' in story
                assert 'link' in story
                assert 'source' in story
                assert 'recency' in story

    def test_globe_api_stories_have_recency(self, client):
        """Test that all stories have recency information"""
        response = client.get('/api/globe-data')
        data = json.loads(response.data)

        country_keys = [k for k in data.keys() if k != '_meta']

        for country_key in country_keys[:3]:  # Check first 3 countries
            country = data[country_key]
            stories = country.get('stories', [])

            for story in stories:
                assert 'recency' in story
                assert story['recency'] in ['breaking', 'recent', 'old']

    def test_globe_data_is_cached(self, client):
        """Test that globe data is properly cached"""
        # First request
        response1 = client.get('/api/globe-data')
        assert response1.status_code == 200

        # Second request should be faster (cached)
        response2 = client.get('/api/globe-data')
        assert response2.status_code == 200

        # Both should return the same data structure
        data1 = json.loads(response1.data)
        data2 = json.loads(response2.data)

        assert data1['_meta']['last_updated'] == data2['_meta']['last_updated']

    def test_globe_view_has_loading_state(self, client):
        """Test that the globe view includes loading state elements"""
        response = client.get('/globe')
        soup = BeautifulSoup(response.data, 'html.parser')

        # Check for loading container
        loading = soup.find('div', {'id': 'globe-loading'})
        assert loading is not None

        # Check for error container
        error = soup.find('div', {'id': 'globe-error'})
        assert error is not None

    def test_globe_view_has_retry_button(self, client):
        """Test that error state includes retry functionality"""
        response = client.get('/globe')
        soup = BeautifulSoup(response.data, 'html.parser')

        error_div = soup.find('div', {'id': 'globe-error'})
        assert error_div is not None

        retry_btn = error_div.find('button', {'id': 'retry-button'})
        assert retry_btn is not None
        assert retry_btn.text == 'Retry'

    def test_globe_view_has_timestamp_display(self, client):
        """Test that the globe view includes timestamp display"""
        response = client.get('/globe')
        soup = BeautifulSoup(response.data, 'html.parser')

        timestamp = soup.find('div', {'id': 'globe-timestamp'})
        assert timestamp is not None

    def test_globe_view_has_volume_legend(self, client):
        """Test that the globe view includes volume legend"""
        response = client.get('/globe')
        soup = BeautifulSoup(response.data, 'html.parser')

        legend = soup.find('div', {'id': 'volume-legend'})
        assert legend is not None

        # Check for legend items
        assert 'high' in str(legend).lower()
        assert 'medium' in str(legend).lower()
        assert 'low' in str(legend).lower()

    def test_navigation_links_present(self, client):
        """Test that navigation links are present"""
        response = client.get('/globe')
        soup = BeautifulSoup(response.data, 'html.parser')

        # Check for "Grid View" navigation link
        back_link = soup.find('a', href='/feed')
        assert back_link is not None
        assert 'grid' in back_link.text.lower()


@pytest.mark.usefixtures("client")
class TestGlobeDataAggregation:
    """Tests for globe data aggregation logic"""

    def test_multiple_countries_returned(self, client):
        """Test that API returns data for multiple countries"""
        response = client.get('/api/globe-data')
        data = json.loads(response.data)

        country_count = len([k for k in data.keys() if k != '_meta'])
        assert country_count >= 5  # Should have at least 5 countries

    def test_story_count_accuracy(self, client):
        """Test that story_count matches actual stories array length"""
        response = client.get('/api/globe-data')
        data = json.loads(response.data)

        country_keys = [k for k in data.keys() if k != '_meta']

        for country_key in country_keys[:5]:  # Check first 5 countries
            country = data[country_key]
            expected_count = len(country.get('stories', []))
            actual_count = country.get('story_count', 0)

            assert expected_count == actual_count

    def test_countries_have_coordinates(self, client):
        """Test that all countries have valid lat/lng coordinates"""
        response = client.get('/api/globe-data')
        data = json.loads(response.data)

        country_keys = [k for k in data.keys() if k != '_meta']

        for country_key in country_keys:
            country = data[country_key]

            lat = country.get('lat')
            lng = country.get('lng')

            assert lat is not None
            assert lng is not None
            assert -90 <= lat <= 90  # Valid latitude range
            assert -180 <= lng <= 180  # Valid longitude range


@pytest.mark.usefixtures("client")
class TestGlobePerformance:
    """Performance-related tests for globe visualization"""

    def test_globe_api_response_time(self, client):
        """Test that globe API responds within acceptable time"""
        import time

        start = time.time()
        response = client.get('/api/globe-data')
        end = time.time()

        assert response.status_code == 200
        # Should respond within 5 seconds (first load)
        assert (end - start) < 5.0

    def test_globe_view_load_time(self, client):
        """Test that globe view loads within acceptable time"""
        import time

        start = time.time()
        response = client.get('/globe')
        end = time.time()

        assert response.status_code == 200
        # Should load within 2 seconds
        assert (end - start) < 2.0
