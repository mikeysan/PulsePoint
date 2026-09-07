"""
Tests for behaviour the design spec promises but nothing else pins.

Each case here corresponds to a line in
docs/superpowers/specs/2026-05-18-ux-enhancements-design.md that the
implementation had drifted from.
"""
from unittest.mock import patch

import pytest

from app.models import Article, FeedResult


@pytest.fixture
def two_articles():
    return [
        Article(title='One', link='https://e.com/1', summary='First.',
                source='Test Feed', published='2025-01-01'),
        Article(title='Two', link='https://e.com/2', summary='Second.',
                source='Test Feed', published='2025-01-02'),
    ]


@pytest.fixture
def counting_reader(two_articles):
    """Patch feed fetching and count how many times it actually runs."""
    calls = {'count': 0}

    async def counted(self, feeds):
        calls['count'] += 1
        return [FeedResult(source=f['name'], url=f['url'],
                           articles=list(two_articles)) for f in feeds]

    with patch('app.services.rss_reader.RSSReader.fetch_all_feeds', new=counted):
        yield calls


class TestNoDoubleFetch:
    """Spec, Clustering Pipeline step 1: briefing reuses the /api/news fetch."""

    def test_briefing_reuses_the_api_news_fetch(self, client, counting_reader):
        client.get('/api/news')
        assert counting_reader['count'] == 1

        # Clustering previously fetched every source a second time.
        from app.services.briefing import _get_articles_from_feed

        with client.application.app_context():
            articles = _get_articles_from_feed()

        assert articles, 'briefing should see the cached articles'
        assert counting_reader['count'] == 1, 'feeds were fetched twice'

    def test_repeated_requests_do_not_refetch(self, client, counting_reader):
        client.get('/api/news')
        client.get('/feed')

        assert counting_reader['count'] == 1


class TestOllamaTimeout:
    """Spec, Ollama Integration: 30s, then the ollama_unreachable fallback."""

    def test_client_is_constructed_with_the_spec_timeout(self):
        from app.services import briefing

        assert briefing.OLLAMA_TIMEOUT_SECONDS == 30

        seen = {}

        class FakeClient:
            def __init__(self, **kwargs):
                seen.update(kwargs)

            def chat(self, *args, **kwargs):
                return {'message': {'content': 'A briefing.'}}

        with patch.dict('sys.modules', {'ollama': type('m', (), {'Client': FakeClient})}):
            result = briefing.generate_briefing_summary(
                [{'label': 'Topic', 'key_terms': ['a'], 'article_count': 1,
                  'sources': ['Test']}], 1)

        assert result == 'A briefing.'
        assert seen.get('timeout') == 30

    def test_timeout_yields_the_unreachable_fallback(self):
        from app.services import briefing

        class HangingClient:
            def __init__(self, **kwargs):
                pass

            def chat(self, *args, **kwargs):
                raise TimeoutError('read timed out')

        with patch.dict('sys.modules', {'ollama': type('m', (), {'Client': HangingClient})}):
            summary = briefing.generate_briefing_summary(
                [{'label': 'Topic', 'key_terms': ['a'], 'article_count': 1,
                  'sources': ['Test']}], 1)

        # None is what get_briefing turns into reason='ollama_unreachable'.
        assert summary is None


class TestTopicChipFiltering:
    """Spec, UI Integration: a topic chip filters the feed to that cluster."""

    def test_topics_expose_their_article_links(self, client):
        """Exact membership must reach the client; key terms only approximate it."""
        from unittest.mock import patch

        from app.services import briefing

        articles = (
            [{'title': f'Climate story {i}', 'link': f'https://e.com/c{i}',
              'summary': 'Emissions targets and carbon policy.',
              'source': 'BBC News'} for i in range(6)]
            + [{'title': f'Tech story {i}', 'link': f'https://e.com/t{i}',
                'summary': 'Markets surge as tech earnings beat expectations.',
                'source': 'Wired'} for i in range(6)]
        )

        with client.application.app_context():
            with patch.object(briefing, '_get_articles_from_feed', return_value=articles):
                with patch.object(briefing, 'generate_briefing_summary',
                                  return_value='A briefing.'):
                    payload = briefing.get_briefing()

        assert payload['available'] is True
        assert payload['topics'], 'expected at least one topic'

        known = {a['link'] for a in articles}
        for topic in payload['topics']:
            assert 'links' in topic, 'topic must carry its article links'
            assert len(topic['links']) == topic['article_count']
            assert set(topic['links']) <= known
