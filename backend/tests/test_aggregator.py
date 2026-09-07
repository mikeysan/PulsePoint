
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.aggregator import get_globe_data, GLOBE_DATA_CACHE_KEY
from app.models import FeedResult, Article
from datetime import datetime, timedelta, timezone
from app import create_app

@pytest.fixture
def app():
    """Create test application."""
    app = create_app('testing')
    app.config['TESTING'] = True
    
    # Establish application context
    ctx = app.app_context()
    ctx.push()
    
    yield app
    
    ctx.pop()

@pytest.fixture
def mock_feed_data():
    return [
        {
            'name': 'Test Feed 1',
            'url': 'http://test1.com',
            'country_iso': 'NG',
            'lat': 10.0,
            'lng': 5.0,
            'region_name': 'Test Region'
        },
        {
            'name': 'Test Feed 2',
            'url': 'http://test2.com',
            'country_iso': 'GB',
            'lat': 50.0,
            'lng': 0.0,
            'region_name': 'London'
        }
    ]

@pytest.fixture
def mock_articles():
    return [
        Article(
            title="Test Story 1",
            link="http://test1.com/1",
            source="Test Feed 1",
            published="2025-01-01",
            summary="Summary 1"
        ),
        Article(
            title="Test Story 2",
            link="http://test1.com/2",
            source="Test Feed 1",
            published="2025-01-02",
            summary="Summary 2"
        )
    ]

@pytest.mark.asyncio
async def test_get_globe_data_aggregation(app, mock_feed_data, mock_articles):
    """Test that feeds are correctly aggregated by country."""
    
    with patch.dict(app.config, {'RSS_FEEDS': mock_feed_data}):
        with patch('app.services.aggregator.RSSReader') as MockReader:
            # Setup mock reader
            mock_instance = MockReader.return_value
            
            # Setup mock results
            results = [
                FeedResult(
                    source='Test Feed 1',
                    url='http://test1.com',
                    success=True,
                    articles=mock_articles
                ),
                FeedResult(
                    source='Test Feed 2',
                    url='http://test2.com',
                    success=True,
                    articles=[] # Empty for GB
                )
            ]
            mock_instance.fetch_all_feeds = AsyncMock(return_value=results)
            
            # Mock Cache
            with patch('app.services.aggregator.cache') as mock_cache:
                mock_cache.get.return_value = None # Cache miss
                
                # Execute
                data = await get_globe_data()
                
                # Verify
                assert 'NG' in data
                assert data['NG']['story_count'] == 2
                assert data['NG']['name'] == 'Nigeria'
                assert len(data['NG']['stories']) == 2
                # Both mock articles lack published_parsed, so both are 'old';
                # the tie-break is newest published first.
                assert data['NG']['stories'][0]['title'] == 'Test Story 2'
                
                # Check GB exists but has 0 stories
                # Wait, aggregator loops over results. If result has 0 stories, it still adds count=0 because keys are initialized?
                # The logic:
                # if country_iso not in globe_data: initialize
                # append stories
                assert 'GB' in data
                assert data['GB']['story_count'] == 0
                
                # Verify Caching
                mock_cache.set.assert_called_once()
                args = mock_cache.set.call_args
                assert args[0][0] == GLOBE_DATA_CACHE_KEY
                assert args[0][1] == data

@pytest.mark.asyncio
async def test_get_globe_data_cached(app):
    """Test that cached data is returned if available."""
    cached_content = {'NG': {'fake': 'data'}}
    
    with patch('app.services.aggregator.cache') as mock_cache:
        mock_cache.get.return_value = cached_content
        
        data = await get_globe_data()
        
        assert data == cached_content
        # Should NOT call RSSReader
        with patch('app.services.aggregator.RSSReader') as MockReader:
            assert not MockReader.called



@pytest.fixture
def mixed_recency_articles():
    """Articles spanning all three recency buckets, deliberately out of order."""
    now = datetime.now(timezone.utc)
    return [
        Article(title='Old story', summary='...', link='http://t/old', source='Test Feed 1',
                published='2025-01-09',
                published_parsed=now - timedelta(days=3)),
        Article(title='Breaking older', summary='...', link='http://t/b1', source='Test Feed 1',
                published='2025-01-01',
                published_parsed=now - timedelta(minutes=50)),
        Article(title='Recent story', summary='...', link='http://t/r', source='Test Feed 1',
                published='2025-01-05',
                published_parsed=now - timedelta(hours=6)),
        Article(title='Breaking newer', summary='...', link='http://t/b2', source='Test Feed 1',
                published='2025-01-03',
                published_parsed=now - timedelta(minutes=10)),
    ]


@pytest.mark.asyncio
async def test_globe_stories_sorted_by_recency_then_newest(
    app, mock_feed_data, mixed_recency_articles
):
    """Breaking stories lead, then recent, then old; newest first within each."""
    with patch.dict(app.config, {'RSS_FEEDS': mock_feed_data}):
        with patch('app.services.aggregator.RSSReader') as MockReader:
            MockReader.return_value.fetch_all_feeds = AsyncMock(return_value=[
                FeedResult(source='Test Feed 1', url='http://test1.com',
                           success=True, articles=mixed_recency_articles),
            ])

            with patch('app.services.aggregator.cache') as mock_cache:
                mock_cache.get.return_value = None

                data = await get_globe_data()

    titles = [s['title'] for s in data['NG']['stories']]
    assert titles == [
        'Breaking newer',
        'Breaking older',
        'Recent story',
        'Old story',
    ]

    recencies = [s['recency'] for s in data['NG']['stories']]
    assert recencies == ['breaking', 'breaking', 'recent', 'old']
