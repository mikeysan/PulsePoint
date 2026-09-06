# PulsePoint UX Enhancements — Design Spec

**Branch:** `feature/ux-enhancements`
**Date:** 2026-05-18
**Status:** Approved

---

## Overview

Polish PulsePoint into a premium personal dashboard by improving the existing experience (dark mode, accessibility, source filtering, bookmarking, reading time, skeleton loading) and adding one standout feature: AI-powered daily news briefing via local Ollama.

---

## Feature Inventory

| # | Feature | Tier | Backend |
|---|---|---|---|
| 1 | Dark mode + system preference | Polish | None |
| 2 | Accessibility (skip link, reduced motion, focus) | Polish | None |
| 3 | Source filter chips | Polish | None |
| 4 | "Read Later" bookmarking | Polish | None |
| 5 | Reading time estimates | Polish | None |
| 6 | Skeleton loading + pull-to-refresh | Polish | None |
| 7 | Topic clustering with Ollama briefing | Standout | `/api/briefing`, `/api/clusters` |

---

## 1. Dark Mode

### Storage
`localStorage` key `pulsepoint-theme` with values `"dark"`, `"light"`, or `"system"`.

### Initialization
1. Read `localStorage`.
2. If `"system"` or absent, query `window.matchMedia('(prefers-color-scheme: dark)')` and listen for changes.
3. Set `data-theme` attribute on `<html>`: `"dark"` or `"light"`.

### Toggle
Button in the header/nav area. Cycles `light` → `dark` → `system` on click. Uses sun/moon iconography.

### CSS Strategy
All colors live in CSS custom properties on `:root`. `[data-theme="dark"]` provides an alternate palette. Every component (cards, inputs, backgrounds, text) reads from these properties.

Smooth transitions: `transition: background-color 0.3s ease, color 0.3s ease` on `<html>`, body, and major containers.

### Contrast Requirements
All text must meet WCAG AA contrast ratio (4.5:1 for body text, 3:1 for large text). Light mode uses dark-on-light. Dark mode uses light-on-dark with subdued backgrounds to reduce eye strain at night.

---

## 2. Accessibility Enhancements

### Skip-to-Content Link
A visually hidden link as the first focusable element on the page. On focus, it becomes visible (top-center bar). Navigates to `#main-content`.

### Reduced Motion
All CSS animations and transitions are wrapped in `@media (prefers-reduced-motion: no-preference)`. A `@media (prefers-reduced-motion: reduce)` block disables animations entirely.

### Focus Indicators
Replace browser-default focus outlines with a visible, brand-colored ring (`outline: 2px solid var(--color-accent); outline-offset: 2px`). Applied to all interactive elements (links, buttons, inputs).

### Touch Targets
All interactive elements must be at minimum 44x44px on touch screens.

### ARIA
Ensure proper heading hierarchy (h1 → h2 → h3, no skips). Add `aria-label` to icon-only buttons. Add `aria-live="polite"` regions for dynamic content updates.

---

## 3. Source Filter Chips

### Storage
`localStorage` key `pulsepoint-sources` → JSON array of enabled source names (e.g., `["BBC News", "The Verge"]`). If absent, all sources are enabled.

### UI Placement
Below the search bar on the feed view. Horizontal scrollable row of chip buttons.

### Behavior
- **Active chip** (source enabled): filled background, solid border.
- **Inactive chip** (source hidden): outline only, muted.
- **Toggle:** Click to toggle. All chips update immediately.
- **"All"** and **"None"** helper links at the end of the chip row.
- **Filtering:** Client-side. `article-item` elements without a matching source get `display: none`.

### Source Extraction
Each `.article-item` must have a `data-source` attribute set server-side.

---

## 4. Read Later Bookmarking

### Storage
`localStorage` key `pulsepoint-saved` → JSON array of article objects:
```json
[
  {
    "title": "Article Title",
    "link": "https://...",
    "source": "BBC News",
    "summary": "...",
    "savedAt": "2026-05-18T14:30:00Z"
  }
]
```

Maximum 200 saved articles. Oldest evicted when limit reached.

### UI: Feed View
A bookmark icon (ribbon or star) in the top-right of each `.news-card`. Click toggles: outline (unsaved) ↔ filled (saved). Visual feedback on click.

### UI: Globe Drawer
Same bookmark icon on each story item in the side drawer.

### View Saved Articles
A "Saved" link in the header navigation (alongside "Grid View"). Opens a sub-view within the feed page that filters to show only saved articles. Includes an "Unsave All" button. Empty state: "No saved articles yet — click the bookmark icon on any article to save it."

### Deduplication
When bookmarking, check if an article with the same `link` already exists. If so, do nothing (don't double-save).

---

## 5. Reading Time Estimates

### Calculation
- Strip HTML from `article.summary`.
- Count words (`split(/\s+/)` filtered).
- `Math.ceil(wordCount / 200)` → minutes.
- Display as "~3 min read" badge.

### Placement
Small muted badge next to the source label in `.news-card-header`. No interaction. Purely cosmetic.

---

## 6. Skeleton Loading + Pull-to-Refresh

### Skeleton Cards
Replace the Bootstrap spinner loading state with a grid of 6 placeholder cards. Each skeleton card contains:
- A short top bar (source placeholder)
- A wider bar (title placeholder)
- Two full-width bars (summary placeholders)

CSS shimmer animation: `background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-shine) 50%, var(--skeleton-base) 75%)` with `background-size: 200% 100%` and `animation: shimmer 1.5s infinite`.

Transition: skeleton grid → real content with a fade-in.

### Pull-to-Refresh (Touch)
Detect `touchstart`/`touchmove`/`touchend` on the scrollable container. If at scroll top and pulled down > 60px, trigger `location.reload()`. Show a visual indicator (text + arrow) during the pull gesture.

### Manual Refresh (Non-Touch)
A small refresh icon button in the header nav. Triggers `location.reload()`.

---

## 7. Topic Clustering & Ollama Briefing

### Architecture
```
Browser                    Flask                      Ollama (local)
  │                          │                           │
  ├── GET /api/briefing ────►│                           │
  │                          ├── ollama.chat() ─────────►│
  │                          │◄── generated summary ─────┤
  │◄── JSON response ────────┤                           │
```

### New Endpoints

#### `GET /api/briefing`

Returns the daily briefing. Cached in Flask in-memory cache for 1 hour (3600s).

**Ollama available response (200):**
```json
{
  "available": true,
  "date": "2026-05-18",
  "generated_at": "2026-05-18T08:00:00Z",
  "model": "llama3.2:3b",
  "topic_count": 3,
  "topics": [
    {
      "label": "Climate Policy",
      "article_count": 7,
      "sources": ["BBC News", "The Guardian", "Al Jazeera"],
      "key_terms": ["emissions", "cop", "net zero", "carbon"]
    }
  ],
  "summary": "Today's news is dominated by climate policy developments, with...",
  "article_count": 95
}
```

**Ollama unavailable response (200):**
```json
{
  "available": false,
  "reason": "ollama_unreachable"
}
```

#### `GET /api/clusters`

Returns raw article clusters without AI summarization. Runs on-demand. Not cached (lightweight computation).

```json
{
  "clusters": [
    {
      "label": "Climate Policy",
      "article_count": 7,
      "articles": [
        { "title": "...", "source": "BBC News", "link": "..." }
      ]
    }
  ]
}
```

### Clustering Pipeline
1. Fetch articles from the same feed data used by `/api/news` (cached, no double-fetch).
2. Extract article titles and summaries as text.
3. Tokenize, remove stopwords, lemmatize using NLTK (already a dependency in `pyproject.toml`).
4. Create TF-IDF vectors using `sklearn.feature_extraction.text.TfidfVectorizer`.
5. Cluster using KMeans. k = `min(20, len(articles) / 5)`.
6. Label each cluster with its top TF-IDF keywords (3-5 terms).

### Ollama Integration
- **Model:** `llama3.2:3b` (small, fast, free, open-source). User installs and starts via `ollama serve` and `ollama pull llama3.2:3b`.
- **Client:** `ollama` Python package. Imported inside the service function (lazy import — not at module level).
- **Prompt:** System prompt instructs the model to write a 2-3 paragraph natural-language news briefing summarizing the top clusters. Input is structured JSON of cluster labels, top keywords, and representative headlines.
- **Timeout:** 30 seconds. If Ollama doesn't respond in time, return the `ollama_unreachable` fallback.
- **Error handling:** All exceptions (connection refused, timeout, ImportError for missing package) caught. All return the fallback response.

### CI/CD Safety
- The `ollama` Python package is added to `requirements.txt` but is **not required** for the app to start.
- The CI workflow (`tests.yml`) only runs `test_security.py` and `test_rss_reader.py` — neither touches the briefing module.
- Briefing-specific tests live in `backend/tests/test_briefing.py`, excluded from CI's explicit test path.
- If Ollama is not installed or not running, the endpoints return graceful fallbacks. No crash, no 500.
- The `deploy.yml` pipeline is unaffected — the prod server may or may not run Ollama; the app degrades gracefully either way.

### UI Integration
- A "Daily Briefing" card at the top of the feed page. If `available: false`, show "Briefing unavailable — start Ollama locally to enable." with a small info icon.
- Collapsible/expandable. Default: expanded.
- Clicking a topic cluster filters the feed to show only articles in that cluster.

---

## Files to Modify

| File | Changes |
|---|---|
| `frontend/static/css/style.css` | Dark mode custom properties, skeleton styles, reduced motion, focus indicators, chip styles, bookmark icon styles, reading time badge |
| `frontend/static/css/globe.css` | Dark mode variables, drawer dark mode |
| `frontend/templates/base.html` | Theme toggle button, skip-to-content link, saved link in nav, refresh button, data-theme attribute handling |
| `frontend/templates/index.html` | Source chips, bookmark icons, reading time badges, skeleton loading grid, pull-to-refresh JS, daily briefing card |
| `frontend/templates/globe_view.html` | Theme toggle, bookmark icons in drawer items |
| `frontend/static/js/globe.js` | Bookmark integration in drawer |
| `backend/app/routes.py` | `/api/briefing` and `/api/clusters` endpoints |
| `backend/app/services/briefing.py` | New file — clustering and Ollama integration |
| `backend/requirements.txt` | Add `ollama` and `scikit-learn` |
| `backend/tests/test_briefing.py` | New file — briefing-specific tests (excluded from CI) |

### Existing Files NOT Modified
- `backend/app/services/rss_reader.py`
- `backend/tests/test_security.py`
- `backend/tests/test_rss_reader.py`
- `backend/tests/test_routes.py`
- `.github/workflows/tests.yml`
- `.github/workflows/deploy.yml`

---

## Browser Support

Target modern evergreen browsers: Chrome 120+, Firefox 120+, Safari 17+. No IE/legacy support required.

---

## Cost

$0. All dependencies are open-source and free. Ollama runs locally. No external API keys, no paid services.
