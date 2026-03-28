# PulsePoint Enhancement Roadmap

## 📋 Project Overview

This roadmap outlines strategic enhancements to transform PulsePoint from a clean news aggregator into a comprehensive, personalized news platform while maintaining the excellent design aesthetic and performance standards.

**Last Updated**: 2025-11-02
**Status**: Active Development Roadmap

---

## ✅ **Already Implemented Features**

The following features have been successfully implemented and are NOT included in this roadmap:

### UI/UX Enhancements (Completed)
- **Dark/Light Theme Toggle** ✅
  - Manual theme switching with toggle button
  - Automatic system preference detection (`prefers-color-scheme`)
  - localStorage persistence
  - Smooth transitions between themes
  - ARIA-compliant accessibility
  - *Evidence: [base.html:63-130](frontend/templates/base.html), [style.css:26-42](frontend/static/css/style.css)*

- **Client-Side Article Search & Filter** ✅
  - Real-time search across article titles and summaries
  - Debounced input for performance
  - Case-insensitive matching
  - Article count display ("Showing X of Y articles")
  - Clear search button
  - "No results" messaging
  - *Evidence: [index.html:14-195](frontend/templates/index.html), [style.css:423-587](frontend/static/css/style.css)*

### Accessibility Features (Completed)
- **WCAG 2.1 Compliance** ✅
  - Skip-to-content link for keyboard navigation
  - `prefers-reduced-motion` support (disables animations)
  - Enhanced focus indicators for keyboard users
  - Minimum 44×44px touch targets on mobile
  - Semantic HTML with proper ARIA labels
  - *Evidence: [base.html:38-39](frontend/templates/base.html), [style.css:82-653](frontend/static/css/style.css)*

### Performance Features (Completed)
- **Core Web Vitals Tracking** ✅ (Partial - collection only, no UI)
  - Client-side performance metrics collection
  - `/api/performance/vitals` endpoint for recording
  - Basic logging (no database persistence yet)
  - *Evidence: [base.html:136-214](frontend/templates/base.html), [routes.py:164-193](backend/app/routes.py)*

- **Performance Monitoring API** ✅ (Partial - API only, no dashboard)
  - `/api/performance` endpoint for system metrics
  - CPU, memory, disk usage tracking
  - Cache and RSS configuration reporting
  - *Evidence: [routes.py:100-162](backend/app/routes.py)*

---

## 🎯 Current State Assessment

### ✅ **Strengths:**
- Clean, minimalist design with excellent visual hierarchy
- Card-based layout with good typography and spacing
- Source badges and timestamps for article attribution
- Responsive grid layout (3-column desktop view)
- Strong performance foundation with caching and compression
- Solid technical architecture with Flask backend
- **Dark mode theme with system preference support**
- **Real-time client-side search functionality**
- **Comprehensive accessibility features (WCAG 2.1)**

### 🚀 **Opportunities for Enhancement:**
- User engagement and personalization features
- Advanced content discovery and organization
- Backend-powered search with filtering
- Content curation and editorial features
- Social and community capabilities
- Analytics dashboard with visualizations
- Reading experience improvements (font controls, reading time, progress tracking)

---

## 📊 Enhancement Phases

## Phase 1: Foundation & User Experience

### 1.1 Reading Experience Improvements
**Status:** 🔴 Not Started
**Priority:** High
**Estimated Effort:** 2-3 days

#### Features:
- **Reading Time Indicators** - Estimated reading time for each article (e.g., "5 min read")
- **Font Size Controls** - Accessibility and user preference customization (Small/Medium/Large)
- **Reading Progress Tracking** - Progress bars for long articles (requires full article content)
- **Article View Modes** - Comfort reading mode, focus mode (distraction-free)

#### Technical Implementation:
```python
# User preference model (requires database)
class UserPreferences:
    theme: 'light' | 'dark' | 'auto'  # ✅ Already implemented
    font_size: 'small' | 'medium' | 'large'  # ❌ Not implemented
    reading_mode: 'normal' | 'comfort' | 'focus'  # ❌ Not implemented
    auto_bookmark: boolean  # ❌ Not implemented
    reading_speed: float  # ❌ Not implemented (for reading time calculations)
```

#### Files to Modify:
- `frontend/static/css/style.css` - Add font size CSS variables and view mode styles
- `frontend/templates/index.html` - Add reading time display to article cards
- `frontend/templates/base.html` - Add font size controls to header
- JavaScript - Calculate reading time based on word count

**Note**: Reading time can be implemented without user accounts. Progress tracking and saved preferences require Phase 1.3 (User Accounts).

---

### 1.2 Advanced Search & Filtering
**Status:** 🟡 Partially Implemented (basic search complete)
**Priority:** High
**Estimated Effort:** 3-4 days

#### Already Implemented:
- ✅ Client-side full-text search across titles and summaries
- ✅ Real-time filtering with debouncing
- ✅ Article count display

#### Features to Add:
- **Advanced Filtering** - Filter by source, date range, reading time
  - Source filter dropdown (BBC, Guardian, CNN, etc.)
  - Date range picker (Today, This Week, This Month, Custom)
  - Reading time slider (1-30 minutes)
- **Search Suggestions** - Auto-complete with popular search terms
- **Saved Searches** - Users can save frequent search queries (requires auth)
- **Search History** - Recent searches with one-click re-execution (requires auth)

#### Technical Implementation:
```python
# Search service (for advanced features)
class SearchService:
    def get_suggestions(self, partial_query: str) -> List[str]
    def save_search(self, user_id: str, query: str, filters: dict)  # Requires auth
    def get_search_history(self, user_id: str) -> List[SearchQuery]  # Requires auth

# Search filters model
class SearchFilters:
    sources: List[str]  # e.g., ['BBC', 'Guardian']
    date_range: str  # e.g., 'today', 'this_week', 'custom'
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    reading_time_min: int  # minutes
    reading_time_max: int  # minutes
```

#### Files to Modify:
- `frontend/templates/index.html` - Add filter controls sidebar or dropdown
- `frontend/static/css/style.css` - Style filter controls
- JavaScript - Add filtering logic for source, date, reading time

**Note**: Basic filtering (source, date, reading time) can be implemented client-side without backend changes. Advanced features (suggestions, saved searches, history) require backend and user authentication.

---

### 1.3 User Account System
**Status:** 🔴 Not Started
**Priority:** High
**Estimated Effort:** 4-5 days

**BLOCKER**: This is a prerequisite for most Phase 2-5 features.

#### Features:
- **User Registration & Authentication** - Email/password with secure password hashing
- **Profile Management** - Personal information and preferences
- **Session Management** - Secure authentication with JWT tokens or Flask-Login
- **Password Recovery** - Email-based password reset flow
- **Account Settings** - Privacy controls and notification preferences
- **Social Login** (Optional) - Login via Google, Twitter, GitHub

#### Technical Implementation:
```python
# User model with Flask-SQLAlchemy
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(100), unique=True, nullable=False)
    preferences = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# Authentication service
class AuthService:
    def register_user(self, email: str, password: str, username: str) -> User
    def authenticate_user(self, email: str, password: str) -> Optional[User]
    def generate_token(self, user: User) -> str  # If using JWT
    def verify_token(self, token: str) -> Optional[User]
    def send_password_reset_email(self, email: str) -> bool
```

#### Database Setup Required:
- Install Flask-SQLAlchemy, Flask-Login or Flask-JWT-Extended
- Configure PostgreSQL or SQLite database
- Create database migrations with Flask-Migrate
- Update `config.py` with database connection string

#### New Routes Required:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `PUT /api/user/profile` - Update user profile
- `PUT /api/user/preferences` - Update user preferences

#### Files to Create/Modify:
- `backend/app/models.py` - Add User model
- `backend/app/services/auth_service.py` - Authentication logic (new file)
- `backend/app/routes_auth.py` - Authentication routes (new file)
- `backend/config.py` - Add DATABASE_URL configuration
- `backend/requirements.txt` - Add Flask-SQLAlchemy, Flask-Login, Flask-Migrate
- `frontend/templates/login.html` - Login page (new file)
- `frontend/templates/register.html` - Registration page (new file)
- `frontend/templates/profile.html` - User profile page (new file)
- `frontend/templates/base.html` - Add user menu/avatar in header

#### Security Requirements:
- Use Flask-Talisman for HTTPS enforcement (already installed)
- Implement rate limiting for login attempts
- Add CSRF protection with Flask-WTF
- Use secure session cookies (httponly, secure, samesite)
- Implement proper password validation (length, complexity)
- Add email verification (optional but recommended)

---

## Phase 2: Content Organization & Discovery

**PREREQUISITE**: Phase 1.3 (User Account System) must be completed first.

### 2.1 Topic Categorization System
**Status:** 🔴 Not Started
**Priority:** Medium
**Estimated Effort:** 5-7 days

#### Features:
- **Automatic Topic Classification** - ML-based article categorization using keywords/NLP
- **Manual Topic Tagging** - Editorial control over categories (admin feature)
- **Topic Hierarchy** - Main categories (Technology, Politics, Sports, etc.) and subtopics
- **Trending Topics** - Algorithmic identification of popular subjects
- **Topic Following** - Users can follow/unfollow specific topics

#### Technical Implementation:
```python
# Topic model
class Topic(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    parent_id = db.Column(db.Integer, db.ForeignKey('topic.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    children = db.relationship('Topic', backref=db.backref('parent', remote_side=[id]))

# Article-Topic association (many-to-many)
article_topics = db.Table('article_topics',
    db.Column('article_id', db.Integer, db.ForeignKey('article.id'), primary_key=True),
    db.Column('topic_id', db.Integer, db.ForeignKey('topic.id'), primary_key=True),
    db.Column('confidence_score', db.Float, default=1.0)
)

# User-Topic following (many-to-many)
user_topics = db.Table('user_topics',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('topic_id', db.Integer, db.ForeignKey('topic.id'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow)
)

# Topic classification service
class TopicService:
    def classify_article(self, article: Article) -> List[Tuple[Topic, float]]
        """Classify article into topics using keyword matching or ML."""

    def get_trending_topics(self, time_range: str = '24h') -> List[Topic]
        """Get topics with most articles in time range."""

    def get_articles_by_topic(self, topic_id: int, limit: int = 50) -> List[Article]
        """Get articles tagged with specific topic."""

    def follow_topic(self, user_id: int, topic_id: int) -> bool
    def unfollow_topic(self, user_id: int, topic_id: int) -> bool
    def get_user_topics(self, user_id: int) -> List[Topic]
```

#### Classification Approach (Simple):
```python
# Keyword-based classification (simple, no ML required)
TOPIC_KEYWORDS = {
    'technology': ['AI', 'software', 'computer', 'tech', 'internet', 'digital', 'cyber'],
    'politics': ['election', 'government', 'congress', 'parliament', 'president', 'minister'],
    'sports': ['football', 'basketball', 'soccer', 'olympics', 'championship', 'player'],
    'business': ['economy', 'market', 'stock', 'company', 'investment', 'trade'],
    'science': ['research', 'study', 'scientist', 'discovery', 'experiment', 'space'],
    'health': ['medical', 'health', 'disease', 'doctor', 'hospital', 'treatment'],
    'entertainment': ['movie', 'music', 'actor', 'celebrity', 'film', 'album'],
}

def classify_by_keywords(title: str, summary: str) -> List[str]:
    """Simple keyword-based classification."""
    text = f"{title} {summary}".lower()
    topics = []
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            topics.append(topic)
    return topics if topics else ['general']
```

#### Database Changes Required:
- Add `articles` table to store articles persistently
- Add `topics` table
- Add `article_topics` association table
- Add `user_topics` association table

#### New Routes:
- `GET /api/topics` - List all topics
- `GET /api/topics/<slug>` - Get topic details
- `GET /api/topics/<slug>/articles` - Get articles for topic
- `POST /api/topics/<id>/follow` - Follow topic (requires auth)
- `DELETE /api/topics/<id>/follow` - Unfollow topic (requires auth)
- `GET /api/user/topics` - Get user's followed topics (requires auth)
- `GET /api/topics/trending` - Get trending topics

**Note**: This requires persisting articles to a database. Currently, articles are fetched from RSS feeds on-demand and not stored.

---

### 2.2 Advanced Bookmark System
**Status:** 🔴 Not Started
**Priority:** Medium
**Estimated Effort:** 3-4 days

**PREREQUISITE**: Phase 1.3 (User Accounts) required.

#### Features:
- **Article Bookmarking** - Save articles for later reading
- **Bookmark Collections** - Organize bookmarks into folders/collections
- **Reading Lists** - Curated lists of articles (public/private)
- **Bookmark Sync** - Sync across devices (automatic with database storage)
- **Bookmark Analytics** - Reading progress and completion tracking

#### Technical Implementation:
```python
# Bookmark model
class Bookmark(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'), nullable=False)
    collection_id = db.Column(db.Integer, db.ForeignKey('collection.id'), nullable=True)
    reading_progress = db.Column(db.Float, default=0.0)  # 0.0 to 1.0
    is_read = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='bookmarks')
    article = db.relationship('Article', backref='bookmarks')
    collection = db.relationship('Collection', backref='bookmarks')

    # Ensure user can only bookmark article once
    __table_args__ = (db.UniqueConstraint('user_id', 'article_id'),)

# Collection model
class Collection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_public = db.Column(db.Boolean, default=False)
    slug = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='collections')
```

#### New Routes:
- `POST /api/bookmarks` - Create bookmark (requires auth)
- `GET /api/bookmarks` - Get user's bookmarks (requires auth)
- `DELETE /api/bookmarks/<id>` - Delete bookmark (requires auth)
- `PUT /api/bookmarks/<id>` - Update bookmark (progress, notes) (requires auth)
- `POST /api/collections` - Create collection (requires auth)
- `GET /api/collections` - Get user's collections (requires auth)
- `PUT /api/collections/<id>` - Update collection (requires auth)
- `DELETE /api/collections/<id>` - Delete collection (requires auth)
- `GET /api/collections/<slug>` - Get public collection (no auth needed if public)

#### UI Components:
- Bookmark button on each article card
- Collections sidebar for organizing bookmarks
- "My Bookmarks" page with grid/list view
- Collection view page
- Reading progress indicator

---

## Phase 3: Content Curation & Editorial Features

### 3.1 Editor's Picks & Highlights
**Status:** 🔴 Not Started
**Priority:** High
**Estimated Effort:** 6-8 days

#### Features:
- **Editor's Selection** - Curated important stories by editorial team (admin feature)
- **Breaking News Alerts** - Real-time notifications for major stories
- **Daily Digest** - Curated summary of important articles (email/in-app)
- **Featured Collections** - Themed article collections (e.g., "Climate Change", "Elections 2024")
- **Content Quality Scoring** - Algorithmic assessment of article quality

#### Technical Implementation:
```python
# Editorial content model
class EditorialContent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content_type = db.Column(db.Enum('editors_pick', 'breaking_news', 'daily_digest', 'featured_collection'))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    priority = db.Column(db.Integer, default=1)  # Higher = more important
    is_active = db.Column(db.Boolean, default=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))  # Admin user

    # Relationships
    articles = db.relationship('Article', secondary='editorial_articles', backref='editorial_content')

# Editorial articles association
editorial_articles = db.Table('editorial_articles',
    db.Column('editorial_id', db.Integer, db.ForeignKey('editorial_content.id'), primary_key=True),
    db.Column('article_id', db.Integer, db.ForeignKey('article.id'), primary_key=True),
    db.Column('order', db.Integer, default=0)
)

# Content quality scorer
class QualityScorer:
    def score_article(self, article: Article) -> float:
        """Score article quality (0.0 to 1.0)."""
        # Factors: source credibility, article length, recency, engagement

    def calculate_readability_score(self, content: str) -> float:
        """Calculate Flesch reading ease score."""

    def assess_source_credibility(self, source: str) -> float:
        """Assess source credibility (0.0 to 1.0)."""
```

#### Admin Panel Required:
- `/admin` - Admin dashboard
- `/admin/editorial` - Manage editor's picks
- `/admin/breaking-news` - Manage breaking news alerts
- `/admin/collections` - Manage featured collections

#### New Routes:
- `GET /api/editorial/picks` - Get editor's picks
- `GET /api/editorial/breaking` - Get breaking news
- `GET /api/editorial/featured` - Get featured collections
- `POST /api/admin/editorial` - Create editorial content (requires admin auth)
- `PUT /api/admin/editorial/<id>` - Update editorial content (requires admin auth)
- `DELETE /api/admin/editorial/<id>` - Delete editorial content (requires admin auth)

---

### 3.2 Duplicate Story Detection
**Status:** 🔴 Not Started
**Priority:** Medium
**Estimated Effort:** 5-7 days

#### Features:
- **Story Clustering** - Group related articles from different sources
- **Duplicate Detection** - Identify identical or very similar stories
- **Source Diversity** - Show multiple perspectives on major stories
- **Story Timeline** - Track how stories evolve over time
- **Cross-Reference Links** - Link related articles automatically

#### Technical Implementation:
```python
# Story cluster model
class StoryCluster(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200))  # Representative title
    summary = db.Column(db.Text)  # Aggregated summary
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    articles = db.relationship('Article', secondary='cluster_articles', backref='clusters')

# Cluster articles association
cluster_articles = db.Table('cluster_articles',
    db.Column('cluster_id', db.Integer, db.ForeignKey('story_cluster.id'), primary_key=True),
    db.Column('article_id', db.Integer, db.ForeignKey('article.id'), primary_key=True),
    db.Column('similarity_score', db.Float, default=1.0),  # 0.0 to 1.0
    db.Column('is_primary', db.Boolean, default=False)  # Primary article in cluster
)

# Story clustering service
class StoryClusterService:
    def cluster_articles(self, articles: List[Article]) -> List[StoryCluster]:
        """Cluster similar articles using cosine similarity of TF-IDF vectors."""

    def detect_duplicates(self, article: Article, threshold: float = 0.9) -> List[Article]:
        """Find articles very similar to given article."""

    def calculate_similarity(self, article1: Article, article2: Article) -> float:
        """Calculate similarity between two articles (0.0 to 1.0)."""
        # Use TF-IDF + cosine similarity or Jaccard similarity

    def get_story_timeline(self, cluster_id: int) -> List[Article]:
        """Get articles in cluster sorted by publication time."""
```

#### Algorithm Approach:
```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def calculate_similarity(text1: str, text2: str) -> float:
    """Calculate cosine similarity between two texts."""
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([text1, text2])
    similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    return float(similarity)

def cluster_articles(articles: List[Article], threshold: float = 0.7) -> List[List[Article]]:
    """Cluster articles by similarity."""
    # Implementation: DBSCAN clustering or hierarchical clustering
```

#### New Dependencies:
- `scikit-learn` - For TF-IDF and similarity calculations
- `nltk` or `spacy` - For text processing (optional)

#### New Routes:
- `GET /api/clusters` - Get story clusters
- `GET /api/clusters/<id>` - Get cluster details
- `GET /api/articles/<id>/similar` - Get similar articles

---

## Phase 4: Social & Community Features

### 4.1 Article Sharing & Social Integration
**Status:** 🔴 Not Started
**Priority:** Medium
**Estimated Effort:** 4-5 days

#### Features:
- **Social Media Sharing** - One-click sharing to Twitter, Facebook, LinkedIn, Reddit
- **Custom Share Messages** - Auto-generated sharing content with Open Graph tags
- **Article Comments** - User discussions on articles (requires moderation)
- **Social Authentication** - Login via Google, Twitter, Facebook (OAuth)
- **Share Analytics** - Track sharing performance

#### Technical Implementation:
```python
# Social sharing service
class SocialSharingService:
    def generate_share_url(self, article: Article, platform: str) -> str:
        """Generate sharing URL for platform (Twitter, Facebook, etc.)."""

    def generate_share_content(self, article: Article, platform: str) -> dict:
        """Generate title, description, and hashtags for sharing."""

    def track_share(self, article_id: int, platform: str, user_id: Optional[int] = None):
        """Track when article is shared."""

# Comment model
class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('comment.id'), nullable=True)  # For nested comments
    is_approved = db.Column(db.Boolean, default=True)  # For moderation
    is_flagged = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='comments')
    article = db.relationship('Article', backref='comments')
    replies = db.relationship('Comment', backref=db.backref('parent', remote_side=[id]))

# Share tracking
class ShareEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    platform = db.Column(db.String(50), nullable=False)  # 'twitter', 'facebook', etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

#### Open Graph Meta Tags (for rich social previews):
```html
<!-- Add to base.html -->
<meta property="og:title" content="{{ article.title }}">
<meta property="og:description" content="{{ article.summary }}">
<meta property="og:type" content="article">
<meta property="og:url" content="{{ request.url }}">
<meta property="og:site_name" content="PulsePoint">
<meta property="og:image" content="{{ article.image_url or url_for('static', filename='images/og-default.png') }}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ article.title }}">
<meta name="twitter:description" content="{{ article.summary }}">
<meta name="twitter:image" content="{{ article.image_url or url_for('static', filename='images/og-default.png') }}">
```

#### New Routes:
- `POST /api/comments` - Create comment (requires auth)
- `GET /api/articles/<id>/comments` - Get article comments
- `PUT /api/comments/<id>` - Update comment (requires auth, own comments only)
- `DELETE /api/comments/<id>` - Delete comment (requires auth, own comments or admin)
- `POST /api/comments/<id>/flag` - Flag inappropriate comment (requires auth)
- `POST /api/articles/<id>/share` - Track share event
- `GET /api/articles/<id>/share-stats` - Get share statistics

#### OAuth Integration:
- Install `Authlib` (already in requirements.txt)
- Configure OAuth providers (Google, Twitter, Facebook)
- Add OAuth routes: `/auth/google`, `/auth/twitter`, `/auth/callback`

---

### 4.2 User Profiles & Activity Tracking
**Status:** 🔴 Not Started
**Priority:** Low
**Estimated Effort:** 3-4 days

#### Features:
- **Public User Profiles** - Show reading history and preferences (opt-in)
- **Reading Statistics** - Articles read, time spent, topics interested in
- **Achievement System** - Reading streaks, milestones, badges
- **Follow System** - Follow other users, see their activity
- **Privacy Controls** - Granular privacy settings for profile data

#### Technical Implementation:
```python
# User profile model
class UserProfile(db.Model):
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    bio = db.Column(db.Text)
    avatar_url = db.Column(db.String(255))
    location = db.Column(db.String(100))
    website = db.Column(db.String(255))

    # Reading stats
    reading_streak = db.Column(db.Integer, default=0)  # Days
    total_articles_read = db.Column(db.Integer, default=0)
    total_reading_time = db.Column(db.Integer, default=0)  # Minutes
    favorite_topics = db.Column(db.JSON)  # List of topic IDs

    # Privacy settings
    is_public = db.Column(db.Boolean, default=False)
    show_reading_stats = db.Column(db.Boolean, default=True)
    show_bookmarks = db.Column(db.Boolean, default=False)
    show_comments = db.Column(db.Boolean, default=True)

    # Relationships
    user = db.relationship('User', backref=db.backref('profile', uselist=False))

# Activity tracking
class ReadingSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'), nullable=False)
    duration = db.Column(db.Integer, default=0)  # Seconds
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Achievement model
class Achievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    badge_icon = db.Column(db.String(100))  # Emoji or icon class
    requirement_type = db.Column(db.String(50))  # 'articles_read', 'reading_streak', etc.
    requirement_value = db.Column(db.Integer)  # Threshold to unlock

# User achievements (many-to-many)
user_achievements = db.Table('user_achievements',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('achievement_id', db.Integer, db.ForeignKey('achievement.id'), primary_key=True),
    db.Column('unlocked_at', db.DateTime, default=datetime.utcnow)
)

# User following (many-to-many)
user_follows = db.Table('user_follows',
    db.Column('follower_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('following_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow)
)
```

#### Achievement Examples:
- 📚 "First Steps" - Read 1 article
- 📖 "Bookworm" - Read 50 articles
- 📰 "News Junkie" - Read 100 articles
- 🔥 "Week Streak" - 7-day reading streak
- ⚡ "Lightning Reader" - Read 10 articles in one day
- 🌍 "Well-Rounded" - Read articles from 10 different sources

#### New Routes:
- `GET /api/users/<username>` - Get public user profile
- `GET /api/user/profile` - Get own profile (requires auth)
- `PUT /api/user/profile` - Update profile (requires auth)
- `POST /api/user/reading-session` - Track reading session (requires auth)
- `GET /api/user/stats` - Get reading statistics (requires auth)
- `GET /api/user/achievements` - Get user achievements (requires auth)
- `POST /api/users/<id>/follow` - Follow user (requires auth)
- `DELETE /api/users/<id>/follow` - Unfollow user (requires auth)
- `GET /api/user/followers` - Get followers (requires auth)
- `GET /api/user/following` - Get following (requires auth)

---

## Phase 5: Advanced Analytics & AI Features

### 5.1 Personalized Recommendations
**Status:** 🔴 Not Started
**Priority:** High
**Estimated Effort:** 8-12 days

#### Features:
- **Content-Based Filtering** - Recommend articles similar to what user has read
- **Collaborative Filtering** - Recommend based on users with similar preferences
- **Trend-Based Suggestions** - Popular articles in user's network
- **Reading Pattern Analysis** - Learn from user behavior over time
- **Cold Start Solutions** - Recommendations for new users based on topics

#### Technical Implementation:
```python
# Recommendation engine
class RecommendationEngine:
    def get_content_based_recommendations(self, user_id: int, limit: int = 10) -> List[Article]:
        """Recommend articles similar to user's reading history."""
        # Use TF-IDF similarity to find articles similar to previously read articles

    def get_collaborative_recommendations(self, user_id: int, limit: int = 10) -> List[Article]:
        """Recommend based on users with similar reading patterns."""
        # Find users with similar reading history, recommend what they read

    def get_trending_recommendations(self, user_id: Optional[int] = None, limit: int = 10) -> List[Article]:
        """Recommend trending articles, optionally filtered by user's topics."""

    def get_personalized_feed(self, user_id: int, limit: int = 50) -> List[Article]:
        """Generate personalized feed combining all recommendation strategies."""

    def update_user_profile_vector(self, user_id: int) -> None:
        """Update user's preference vector based on reading history."""

# User interaction model (for ML training)
class UserInteraction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'), nullable=False)
    interaction_type = db.Column(db.Enum('view', 'bookmark', 'share', 'comment', 'complete'))
    duration = db.Column(db.Integer)  # Reading time in seconds
    rating = db.Column(db.Float)  # Implicit rating (calculated from engagement)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

#### Recommendation Algorithm (Simple Approach):
```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def get_content_recommendations(user_reading_history: List[Article],
                                 all_articles: List[Article],
                                 limit: int = 10) -> List[Article]:
    """Content-based recommendations using TF-IDF similarity."""

    # Create user profile as average TF-IDF vector of read articles
    user_texts = [f"{a.title} {a.summary}" for a in user_reading_history]
    candidate_texts = [f"{a.title} {a.summary}" for a in all_articles]

    vectorizer = TfidfVectorizer(max_features=1000)
    all_texts = user_texts + candidate_texts
    tfidf_matrix = vectorizer.fit_transform(all_texts)

    # Calculate user profile vector (average of read articles)
    user_vector = tfidf_matrix[:len(user_texts)].mean(axis=0)

    # Calculate similarity to all candidate articles
    similarities = cosine_similarity(user_vector, tfidf_matrix[len(user_texts):])

    # Get top N most similar articles
    top_indices = similarities[0].argsort()[-limit:][::-1]
    return [all_articles[i] for i in top_indices]
```

#### New Routes:
- `GET /api/recommendations` - Get personalized recommendations (requires auth)
- `GET /api/recommendations/trending` - Get trending articles (optionally filtered by user)
- `POST /api/interactions` - Track user interaction (view, bookmark, share) (requires auth)

#### Dependencies:
- `scikit-learn` - For recommendation algorithms
- `numpy` - For numerical operations
- `pandas` - For data manipulation (optional)

---

### 5.2 Advanced Analytics Dashboard
**Status:** 🟡 Partially Implemented (API endpoints exist, no UI)
**Priority:** Medium
**Estimated Effort:** 6-8 days

#### Already Implemented:
- ✅ `/api/performance` - System performance metrics (CPU, memory, disk)
- ✅ `/api/performance/vitals` - Client-side Core Web Vitals recording
- ✅ Basic logging of metrics

#### Features to Add:
- **Analytics Dashboard UI** - Visual dashboard for viewing metrics
- **Content Performance Analytics** - Most read, shared, bookmarked articles
- **User Engagement Metrics** - Time on site, bounce rate, retention
- **Source Performance** - Reliability and speed metrics for RSS feeds
- **Real-time Monitoring** - Live usage statistics with WebSocket updates
- **Data Persistence** - Store metrics in database for historical analysis
- **Export Capabilities** - CSV/JSON export of analytics data

#### Technical Implementation:
```python
# Analytics event model
class AnalyticsEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    session_id = db.Column(db.String(255), nullable=False, index=True)
    event_type = db.Column(db.String(50), nullable=False)  # 'page_view', 'article_view', etc.
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'), nullable=True)
    metadata = db.Column(db.JSON)  # Additional event data
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

# Analytics service
class AnalyticsService:
    def track_page_view(self, session_id: str, user_id: Optional[int], page: str):
        """Track page view event."""

    def track_article_view(self, session_id: str, user_id: Optional[int], article_id: int, duration: int):
        """Track article view with reading duration."""

    def get_content_analytics(self, time_range: str = '7d') -> dict:
        """Get content performance metrics (top articles, engagement, etc.)."""

    def get_user_analytics(self, time_range: str = '7d') -> dict:
        """Get user engagement metrics (DAU, MAU, retention, etc.)."""

    def get_source_analytics(self, time_range: str = '7d') -> dict:
        """Get RSS source performance metrics (fetch time, error rate, etc.)."""

    def get_real_time_stats(self) -> dict:
        """Get current real-time statistics (active users, recent articles, etc.)."""
```

#### Dashboard Metrics to Display:
1. **Overview**:
   - Daily Active Users (DAU)
   - Monthly Active Users (MAU)
   - Total Articles Fetched
   - System Health (uptime, response time)

2. **Content Performance**:
   - Top 10 Most Viewed Articles
   - Top 10 Most Bookmarked Articles
   - Top 10 Most Shared Articles
   - Article Engagement Rate (views → bookmarks → shares)

3. **User Engagement**:
   - Average Session Duration
   - Bounce Rate
   - User Retention (7-day, 30-day)
   - Reading Completion Rate

4. **Source Performance**:
   - RSS Feed Fetch Success Rate
   - Average Fetch Time per Source
   - Articles per Source
   - Source Reliability Score

5. **Core Web Vitals** (already tracking, need UI):
   - Largest Contentful Paint (LCP)
   - First Input Delay (FID)
   - Cumulative Layout Shift (CLS)
   - First Contentful Paint (FCP)
   - Time to Interactive (TTI)

#### New Routes:
- `GET /api/analytics/overview` - Dashboard overview metrics (requires admin auth)
- `GET /api/analytics/content` - Content performance (requires admin auth)
- `GET /api/analytics/users` - User engagement (requires admin auth)
- `GET /api/analytics/sources` - Source performance (requires admin auth)
- `GET /api/analytics/realtime` - Real-time stats (requires admin auth)
- `GET /api/analytics/export` - Export analytics data (requires admin auth)

#### UI Components to Create:
- `frontend/templates/admin/dashboard.html` - Main analytics dashboard
- Charts library: Chart.js or Plotly for visualizations
- Real-time updates: Use Server-Sent Events (SSE) or WebSocket

#### Dependencies:
- Database storage for events (already have database setup from Phase 1.3)
- No new backend dependencies needed
- Frontend: Add Chart.js or similar for visualizations

---

## 🗄️ Database Schema Summary

### Tables Required (by Phase):

**Phase 1.3 - User Accounts**:
- `users` - User authentication and profiles
- `user_profiles` - Extended user profile data

**Phase 2.1 - Topic Categorization**:
- `topics` - Topic definitions
- `article_topics` - Article-topic associations
- `user_topics` - User topic subscriptions

**Phase 2.2 - Bookmarks**:
- `bookmarks` - User bookmarks
- `collections` - Bookmark collections

**Phase 3.1 - Editorial**:
- `editorial_content` - Editor's picks, breaking news, etc.
- `editorial_articles` - Editorial content article associations

**Phase 3.2 - Story Clustering**:
- `story_clusters` - Story cluster definitions
- `cluster_articles` - Cluster-article associations

**Phase 4.1 - Social**:
- `comments` - User comments on articles
- `share_events` - Social sharing tracking

**Phase 4.2 - User Profiles**:
- `reading_sessions` - Reading activity tracking
- `achievements` - Achievement definitions
- `user_achievements` - User-achievement unlocks
- `user_follows` - User following relationships

**Phase 5.1 - Recommendations**:
- `user_interactions` - User interaction events for ML

**Phase 5.2 - Analytics**:
- `analytics_events` - Event tracking for analytics

**Core Data** (needed for most phases):
- `articles` - Persistent article storage (currently articles are ephemeral from RSS feeds)

---

## 🚀 Performance Considerations

### Current Performance (Already Excellent):
- ✅ Page load < 2 seconds
- ✅ Caching (5-minute page cache, 3-minute API cache)
- ✅ Compression enabled (gzip via Flask-Compress)
- ✅ Critical CSS inlined
- ✅ Async CSS loading
- ✅ Resource hints (preconnect, dns-prefetch)
- ✅ Optimized Bootstrap loading

### Performance for New Features:
1. **Database Queries**:
   - Use database indexes on frequently queried fields
   - Implement query result caching with Redis
   - Use database connection pooling
   - Consider read replicas for heavy read workloads

2. **Recommendation Engine**:
   - Pre-compute recommendations offline (background job)
   - Cache recommendation results per user
   - Use approximate algorithms for large datasets

3. **Real-time Features**:
   - Use Redis for pub/sub for real-time updates
   - Implement rate limiting to prevent abuse
   - Use Server-Sent Events (SSE) instead of polling

4. **Analytics**:
   - Batch insert analytics events (not one-by-one)
   - Use time-series database (InfluxDB) or separate analytics DB
   - Aggregate statistics in background jobs

---

## 🔒 Security Considerations

### Already Implemented:
- ✅ Flask-Talisman for HTTPS enforcement and security headers
- ✅ Input sanitization (bleach library)
- ✅ XSS protection in templates

### Required for New Features:
1. **Authentication**:
   - Use bcrypt/argon2 for password hashing (via werkzeug.security)
   - Implement rate limiting on login attempts
   - Add CSRF protection with Flask-WTF
   - Use secure session cookies (httponly, secure, samesite)
   - Implement JWT token expiration and refresh

2. **Authorization**:
   - Implement role-based access control (RBAC)
   - Add admin role for editorial features
   - Ensure users can only access their own data

3. **Data Privacy**:
   - Add GDPR consent management
   - Implement data export (user can download their data)
   - Implement data deletion (right to be forgotten)
   - Add privacy settings for user profiles

4. **API Security**:
   - Implement API rate limiting (Flask-Limiter)
   - Add API authentication (API keys or OAuth)
   - Validate all input data
   - Sanitize HTML in user-generated content (comments)

---

## 🧪 Testing Strategy

### Current Testing (Excellent):
- ✅ 79 unit and integration tests
- ✅ Tests for routes, RSS reader, security utilities
- ✅ E2E tests with Playwright (currently failing due to missing browser binaries)

### Testing for New Features:
1. **Unit Tests** (70% of tests):
   - Test all service methods in isolation
   - Test models and data validation
   - Test authentication logic
   - Test recommendation algorithms

2. **Integration Tests** (20% of tests):
   - Test API endpoints with database
   - Test authentication flow
   - Test bookmark/collection operations
   - Test comment creation and moderation

3. **E2E Tests** (10% of tests):
   - Test user registration and login flow
   - Test bookmarking an article
   - Test creating a collection
   - Test writing and viewing comments
   - Test recommendation feed

4. **Performance Tests**:
   - Load testing with Apache Bench or Locust
   - Database query performance testing
   - API response time testing

---

## 📈 Success Metrics

### Target Metrics:
- **User Engagement**:
  - Daily Active Users: +25% increase
  - Session Duration: +40% increase
  - Article Completion Rate: 60% average
  - Bookmark Rate: 15% of articles viewed

- **Performance**:
  - Page Load Time: < 2 seconds (maintain current)
  - Search Response Time: < 500ms
  - Mobile Performance: Lighthouse score > 90 (maintain current)
  - Uptime: > 99.5%

- **Content Quality**:
  - Article Diversity: Multiple sources per story
  - Content Freshness: 80% of articles < 24 hours old
  - Topic Coverage: Balanced across categories
  - Source Reliability: Quality source metrics

---

## 🎯 Implementation Timeline

### Recommended Sprint Plan:

**Sprint 1 (2 weeks): Foundation**
- Phase 1.3: User authentication system ⚠️ **CRITICAL - PREREQUISITE FOR MOST FEATURES**
- Phase 1.1: Reading experience improvements (reading time, font controls)

**Sprint 2 (2 weeks): Content Organization**
- Phase 2.1: Topic categorization (keyword-based, simple)
- Phase 1.2: Advanced filtering (source, date, reading time)

**Sprint 3 (2 weeks): Bookmarks & Collections**
- Phase 2.2: Advanced bookmark system
- Phase 2.2: Collections and reading lists

**Sprint 4 (3 weeks): Editorial Features**
- Phase 3.1: Editor's picks system (admin panel)
- Phase 3.2: Basic duplicate detection

**Sprint 5 (2 weeks): Social Features**
- Phase 4.1: Social sharing and comments
- Phase 4.2: User profiles and activity tracking

**Sprint 6 (3 weeks): Advanced Features**
- Phase 5.1: Personalized recommendations (content-based)
- Phase 5.2: Analytics dashboard UI

---

## 📚 Technical Documentation

### Documentation Required:
1. **API Documentation**:
   - Generate OpenAPI/Swagger specification
   - Document all endpoints with request/response examples
   - Add authentication requirements
   - Include rate limiting policies

2. **Developer Documentation**:
   - Architecture overview and system design
   - Database schema with ERD diagram
   - Setup instructions for local development
   - Contributing guidelines

3. **User Documentation**:
   - Feature guides (bookmarks, collections, topics)
   - Privacy policy and terms of service
   - FAQ and troubleshooting

---

## 🚀 Next Steps

1. **Review and Prioritize** - Review this roadmap and adjust priorities based on business goals
2. **Begin Sprint 1** - Start with Phase 1.3 (User Account System) as it's a prerequisite
3. **Setup Database** - Configure PostgreSQL and create initial migrations
4. **Create Project Board** - Track progress with GitHub Projects or similar tool
5. **Allocate Resources** - Assign developers to sprint tasks

---

## 📝 Notes

- **Database Required**: Most features beyond Phase 1 require a database. Currently, articles are fetched from RSS feeds and not persisted. Consider adding an `articles` table early.

- **Recommendation Engine**: Start with simple content-based recommendations using TF-IDF similarity. Can upgrade to more sophisticated ML models later.

- **Scalability**: Current architecture handles small-to-medium scale. For large scale (100k+ users), consider:
  - Microservices architecture
  - Separate database for analytics
  - CDN for static assets
  - Message queue for background jobs (Celery + Redis)

- **Maintenance**: Plan for regular dependency updates, security patches, and database backups.

---

**This roadmap provides a comprehensive, realistic path for transforming PulsePoint into a leading personalized news platform while maintaining the excellent design and performance standards already established.**
