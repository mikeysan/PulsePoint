"""
Shared fixtures for all tests.
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
