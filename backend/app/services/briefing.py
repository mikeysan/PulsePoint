import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _get_articles_from_feed():
    try:
        import asyncio
        from flask import current_app
        from .rss_reader import RSSReader

        feeds = current_app.config.get('RSS_FEEDS', [])
        timeout = current_app.config.get('REQUEST_TIMEOUT', 10)
        max_articles = current_app.config.get('MAX_ARTICLES_PER_FEED', 10)

        reader = RSSReader(timeout=timeout, max_articles=max_articles)

        try:
            feed_results = asyncio.run(reader.fetch_all_feeds(feeds))
        except RuntimeError:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                feed_results = pool.submit(
                    asyncio.run, reader.fetch_all_feeds(feeds)
                ).result()

        articles = reader.get_all_articles(feed_results)
        return [a.to_dict() for a in articles]
    except Exception as e:
        logger.error(f"Error fetching articles for briefing: {e}")
        return []


def _build_document(article):
    title = (article.get('title') or '').strip()
    summary = (article.get('summary') or '').strip()
    return f"{title}. {summary}"


def _preprocess_texts(documents):
    try:
        import nltk
        from nltk.corpus import stopwords
        from nltk.stem import WordNetLemmatizer

        nltk_data_path = '/tmp/nltk_data_briefing'
        nltk.data.path.append(nltk_data_path)

        for resource in ['punkt_tab', 'stopwords', 'wordnet', 'omw-1.4']:
            try:
                nltk.data.find(f'tokenizers/{resource}')
            except LookupError:
                nltk.data.find(f'corpora/{resource}')
            except LookupError:
                try:
                    nltk.download(resource, download_dir=nltk_data_path, quiet=True)
                except Exception:
                    pass

        lemmatizer = WordNetLemmatizer()
        stop_words = set(stopwords.words('english'))

        processed = []
        for doc in documents:
            try:
                tokens = nltk.word_tokenize(doc.lower())
            except Exception:
                tokens = doc.lower().split()
            tokens = [
                lemmatizer.lemmatize(t)
                for t in tokens
                if t.isalpha() and t not in stop_words and len(t) > 2
            ]
            processed.append(' '.join(tokens))

        return processed
    except Exception as e:
        logger.warning(f"NLTK preprocessing unavailable: {e}")
        return documents


def compute_clusters(articles):
    if not articles:
        return []

    documents = [_build_document(a) for a in articles]
    processed = _preprocess_texts(documents)

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.cluster import KMeans

        vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
        tfidf = vectorizer.fit_transform(processed)

        n_clusters = min(20, max(2, len(articles) // 5))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(tfidf)

        feature_names = vectorizer.get_feature_names_out()
        clusters = []
        for cluster_id in range(n_clusters):
            indices = [i for i, lbl in enumerate(labels) if lbl == cluster_id]
            if not indices:
                continue

            centroid = tfidf[indices].mean(axis=0).A1
            top_indices = centroid.argsort()[-5:][::-1]
            key_terms = [feature_names[i] for i in top_indices]

            cluster_sources = list(set(
                articles[i].get('source', '') for i in indices
            ))

            cluster_articles = []
            for i in indices:
                a = articles[i]
                cluster_articles.append({
                    'title': a.get('title', ''),
                    'source': a.get('source', ''),
                    'link': a.get('link', ''),
                })

            clusters.append({
                'label': ', '.join(key_terms[:3]).title(),
                'article_count': len(indices),
                'sources': cluster_sources[:5],
                'key_terms': [t for t in key_terms],
                'articles': cluster_articles,
            })

        clusters.sort(key=lambda c: c['article_count'], reverse=True)
        return clusters[:10]
    except Exception as e:
        logger.error(f"Clustering failed: {e}")
        return []


def generate_briefing_summary(clusters, article_count):
    try:
        import ollama

        cluster_text = '\n'.join([
            f"Topic {i+1}: {c['label']} "
            f"(Keywords: {', '.join(c['key_terms'][:3])}) "
            f"— {c['article_count']} articles from {', '.join(c['sources'][:3])}"
            for i, c in enumerate(clusters[:5])
        ])

        prompt = f"""You are a concise news briefing assistant. Summarize the following news topics from today into a natural, 2-paragraph briefing. Be informative but brief. Do not use markdown formatting.

Total articles analyzed: {article_count}

{cluster_text}

Write your briefing:"""

        response = ollama.chat(
            model='llama3.2:3b',
            messages=[
                {
                    'role': 'system',
                    'content': 'You are a concise daily news briefing assistant. Write in plain English. Be informative and brief.',
                },
                {'role': 'user', 'content': prompt},
            ],
            options={'temperature': 0.3, 'num_predict': 300},
        )

        return response['message']['content'].strip()
    except ImportError:
        logger.info("Ollama package not installed — skipping AI summary")
        return None
    except Exception as e:
        logger.warning(f"Ollama unavailable: {e}")
        return None


def get_briefing():
    articles = _get_articles_from_feed()
    if not articles:
        return {'available': False, 'reason': 'no_articles'}

    clusters = compute_clusters(articles)
    if not clusters:
        return {'available': False, 'reason': 'clustering_failed'}

    summary = generate_briefing_summary(clusters, len(articles))

    if summary is None:
        return {
            'available': False,
            'reason': 'ollama_unreachable',
            'clusters': clusters,
            'topic_count': len(clusters),
            'article_count': len(articles),
            'date': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        }

    return {
        'available': True,
        'date': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'model': 'llama3.2:3b',
        'topic_count': len(clusters),
        'topics': [
            {
                'label': c['label'],
                'article_count': c['article_count'],
                'sources': c['sources'],
                'key_terms': c['key_terms'],
            }
            for c in clusters
        ],
        'summary': summary,
        'article_count': len(articles),
    }
