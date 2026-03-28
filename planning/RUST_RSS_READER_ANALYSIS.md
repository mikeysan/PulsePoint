# Analysis of Rust RSS Reader (leolaporte/rss-reader)

## Overview
This document outlines the architecture and logic used in the [leolaporte/rss-reader](https://github.com/leolaporte/rss-reader) repository, focusing on its method of fetching and processing RSS feeds.

## Core Stack
- **Language**: Rust
- **HTTP Client**: `reqwest` (Async, handles network requests)
- **RSS Parsing**: `feed-rs` (Standardizes RSS/Atom/JSON feeds into a common model)
- **Async Runtime**: `tokio`
- **TUI Framework**: `ratatui`

## Feed Fetching & Processing Logic

### 1. Fetching Strategy (`src/feed/fetcher.rs`)
The application uses `reqwest` to perform asynchronous HTTP GET requests. Key characteristics include:
- **Custom User-Agent**: Identifies as `speedy-reader/1.0`.
- **Timeouts**: 30-second global timeout, 10-second connection timeout.
- **Async Pipeline**: Fetches raw bytes and passes them directly to the parser.

### 2. Universal Parsing (`feed-rs`)
Instead of manually parsing XML, it leverages the `feed-rs` library. This allows it to handle:
- **Atom** (1.0)
- **RSS** (0.9, 1.0, 2.0)
- **JSON Feed** (1.0, 1.1)

The parser outputs a standardized `feed_rs::model::Feed` struct, which the application then maps to its own internal `Article` model.

### 3. Advanced Content Extraction (`src/services/content_fetcher.rs`)
This is the most notable feature for data acquisition.
- **Cookie Injection**: To access paywalled or member-only feeds, the application can extract cookies from a local **Firefox** installation (`cookies.sqlite`).
    - It locates the default Firefox profile.
    - Copies the database to a temp file (to avoid locks).
    - Queries `moz_cookies` for the target domain.
    - Injects these cookies into the `reqwest` headers.
- **Full Text Scraping**: If a feed only provides summaries, it has logic to fetch the full article page and extract the main content (similar to "Readability" view).

### 4. AI Integration (`src/ai/summarizer.rs`)
The application integrates with the **Claude API**. It can send the extracted plain text of an article to the LLM to generate a concise summary for the user.
