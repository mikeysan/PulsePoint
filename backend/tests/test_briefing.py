"""
Tests for the briefing service.
These are NOT run in CI — CI only targets test_security.py and test_rss_reader.py.
"""
from app.services.briefing import compute_clusters, get_briefing


def test_compute_clusters_empty():
    result = compute_clusters([])
    assert result == []


def test_compute_clusters_few_articles():
    articles = [
        {'title': 'Climate deal reached', 'summary': 'Nations agreed to new emissions targets', 'source': 'BBC News', 'link': 'https://example.com/1'},
        {'title': 'Climate protests continue', 'summary': 'Activists demand stronger action on climate', 'source': 'The Guardian', 'link': 'https://example.com/2'},
        {'title': 'Tech stock rally', 'summary': 'Markets surge as tech earnings beat expectations', 'source': 'TechCrunch', 'link': 'https://example.com/3'},
        {'title': 'Apple launches new product', 'summary': 'Consumer electronics giant reveals latest device', 'source': 'The Verge', 'link': 'https://example.com/4'},
        {'title': 'SpaceX mission success', 'summary': 'Rocket lands successfully after orbital mission', 'source': 'NASA', 'link': 'https://example.com/5'},
        {'title': 'Mars rover discovery', 'summary': 'New evidence of ancient water found on Mars', 'source': 'Wired', 'link': 'https://example.com/6'},
    ]
    result = compute_clusters(articles)
    assert len(result) >= 1
    assert len(result) <= 6
    for cluster in result:
        assert 'label' in cluster
        assert 'article_count' in cluster
        assert 'key_terms' in cluster


def test_compute_clusters_assigns_all_articles():
    articles = [
        {'title': f'Article {i}', 'summary': f'Summary text number {i}', 'source': 'TestSource', 'link': f'https://example.com/{i}'}
        for i in range(15)
    ]
    result = compute_clusters(articles)
    total_assigned = sum(c['article_count'] for c in result)
    assert total_assigned == 15


def test_get_briefing_no_articles(monkeypatch):
    def mock_fetch():
        return []

    monkeypatch.setattr('app.services.briefing._get_articles_from_feed', mock_fetch)
    result = get_briefing()
    assert result['available'] is False
    assert result['reason'] == 'no_articles'
