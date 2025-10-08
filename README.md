# PulsePoint

> **Your Streamlined News Pulse** — Stay informed, without the noise.

PulsePoint is a modern, minimalist RSS news aggregator that consolidates live feeds from trusted sources into a clean, responsive interface. Built with Flask and Bootstrap 5, it prioritizes security, performance, and simplicity.

[![Run Tests](https://github.com/mikeysan/PulsePoint/actions/workflows/tests.yml/badge.svg)](https://github.com/mikeysan/PulsePoint/actions/workflows/tests.yml)

## Features

- 📰 **Multi-source aggregation** — Fetches from 10 trusted news sources
- ⚡ **Async RSS parsing** — Fast, concurrent feed fetching
- 🎨 **Minimalist UI** — Clean, responsive Bootstrap 5 design
- 🔒 **Security-first** — Input sanitization, XSS protection, security headers
- 💾 **Smart caching** — Reduces load and respects rate limits
- 🧪 **Comprehensive tests** — 27+ unit tests with pytest
- 🐳 **Docker-ready** — Production-ready containerization
- 🚀 **CI/CD** — Automated testing with GitHub Actions

## News Sources

PulsePoint aggregates news from:

- BBC News
- The Guardian
- Sky News
- Al Jazeera
- TechCrunch
- Wired
- The Verge
- NASA
- CNN
- NPR

## Tech Stack

**Backend:**
- Flask 3.1
- Flask-Caching
- Flask-Talisman (security headers)
- feedparser (RSS parsing)
- aiohttp (async HTTP)
- bleach (input sanitization)

**Frontend:**
- Bootstrap 5
- Custom CSS (minimalist design)

**Testing:**
- pytest
- pytest-asyncio
- pytest-cov

**Deployment:**
- Gunicorn (WSGI server)
- Nginx (reverse proxy)
- Docker (containerization)

## Quick Start

### Prerequisites

- Python 3.11+
- pip
- (Optional) Docker and Docker Compose

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mikeysan/PulsePoint.git
   cd PulsePoint
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application:**
   ```bash
   python wsgi.py
   ```

5. **Access the application:**
   - Web interface: http://localhost:8000
   - API endpoint: http://localhost:8000/api/news
   - Health check: http://localhost:8000/api/health

### Running Tests

```bash
cd backend

# Run all unit tests
pytest tests/test_security.py tests/test_rss_reader.py::TestRSSReader -v

# Run with coverage
pytest --cov=app tests/

# Quick test
pytest --maxfail=1 --disable-warnings -q
```

### Docker Deployment

1. **Build the image:**
   ```bash
   docker build -f docker/Dockerfile -t pulsepoint:latest .
   ```

2. **Run the container:**
   ```bash
   docker run -p 8000:8000 -e FLASK_ENV=production pulsepoint:latest
   ```

3. **With Nginx (production setup):**
   ```bash
   # Use docker-compose (create your own docker-compose.yml)
   docker-compose up -d
   ```

## Project Structure

```
PulsePoint/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── routes.py            # API routes and views
│   │   ├── models.py            # Data models
│   │   ├── services/
│   │   │   └── rss_reader.py    # RSS feed fetching logic
│   │   └── utils/
│   │       └── security.py      # Security utilities
│   ├── tests/
│   │   ├── test_routes.py
│   │   ├── test_rss_reader.py
│   │   └── test_security.py
│   ├── requirements.txt
│   ├── config.py                # Configuration management
│   ├── wsgi.py                  # WSGI entry point
│   └── pytest.ini
│
├── frontend/
│   ├── static/
│   │   └── css/
│   │       └── style.css
│   └── templates/
│       ├── base.html
│       └── index.html
│
├── docker/
│   ├── Dockerfile
│   └── nginx.conf
│
├── .github/
│   └── workflows/
│       └── tests.yml
│
├── LICENSE
└── README.md
```

## Configuration

Create a `.env` file in the `backend/` directory:

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
CACHE_TYPE=SimpleCache
CACHE_DEFAULT_TIMEOUT=300
REQUEST_TIMEOUT=10
MAX_ARTICLES_PER_FEED=10
TALISMAN_FORCE_HTTPS=false
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_ENV` | Environment (development/production) | `development` |
| `SECRET_KEY` | Flask secret key | Random |
| `CACHE_TYPE` | Cache backend type | `SimpleCache` |
| `CACHE_DEFAULT_TIMEOUT` | Cache timeout in seconds | `300` |
| `REQUEST_TIMEOUT` | RSS request timeout | `10` |
| `MAX_ARTICLES_PER_FEED` | Max articles per feed | `10` |
| `TALISMAN_FORCE_HTTPS` | Force HTTPS in production | `false` |

## API Endpoints

### `GET /`
Renders the main news feed page.

**Response:** HTML

### `GET /api/news`
Returns all aggregated news articles as JSON.

**Response:**
```json
{
  "success": true,
  "count": 95,
  "articles": [
    {
      "title": "Article Title",
      "link": "https://example.com/article",
      "summary": "Article summary...",
      "source": "BBC News",
      "published": "Wed, 08 Jan 2025 12:00:00 GMT",
      "published_parsed": "2025-01-08T12:00:00"
    }
  ]
}
```

### `GET /api/health`
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "service": "PulsePoint"
}
```

## Security Features

- **Input Sanitization** — All user-facing content is sanitized using bleach
- **XSS Protection** — HTML tags stripped from titles and summaries
- **URL Validation** — Only HTTP/HTTPS URLs allowed
- **Security Headers** — Flask-Talisman enforces HTTPS and CSP in production
- **Non-root Docker** — Container runs as unprivileged user
- **Rate Limiting** — Caching prevents excessive RSS requests

## Testing

Tests are written using pytest. Coverage includes:

- Security utilities (sanitization, validation)
- RSS feed parsing and error handling
- Route responses and template rendering
- Article sorting and data structures

Run tests before every commit:

```bash
cd backend
pytest tests/test_security.py tests/test_rss_reader.py::TestRSSReader -v
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pytest -v`
5. Commit with descriptive message
6. Push and create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- RSS feeds provided by BBC, The Guardian, Sky News, Al Jazeera, TechCrunch, Wired, The Verge, NASA, CNN, and NPR
- Built with [Flask](https://flask.palletsprojects.com/)
- Styled with [Bootstrap 5](https://getbootstrap.com/)

---

**PulsePoint** — *Stay informed, without the noise.*
