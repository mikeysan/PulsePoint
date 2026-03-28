# Project Brief: "PulsePoint" Interactive Globe UI

## Context
We are refactoring the main view of a Flask-based news aggregator application. Currently, it displays a grid of news cards. We are replacing/augmenting this with an interactive 3D Globe visualization (D3.js). 

## Constraints
* **Stack:** Flask (Python), D3.js (v7), HTML/CSS/JS.
* **Data Source:** No database. Data is fetched live from RSS feeds defined in `config.py` and cached.
* **Mapping Logic:** "Publisher Location" (e.g., BBC = UK). We group all stories by their source country.
* **UX Pattern:** Clicking a country on the globe opens a slide-out drawer (side panel) with a merged feed of all stories from that country.

---

## Section 1: Backend & Configuration Updates

### 1.1 Enrich `config.py`
Modify the `RSS_FEEDS` list in `config.py`. Update each feed dictionary to include geographical metadata.
* **Required Fields:** `country_iso` (2-letter code), `lat` (latitude float), `lng` (longitude float), `region_name` (string).
* **Mappings:**
    * Punch, Vanguard, Premium Times, Business Day, Sahara Reporters -> **Nigeria** (Approx Lat: 9.08, Lng: 8.67)
    * BBC, Guardian, Sky News -> **United Kingdom** (Approx Lat: 55.37, Lng: -3.43)
    * NPR, TechCrunch, Wired -> **USA** (Approx Lat: 37.09, Lng: -95.71)
    * Al Jazeera -> **Qatar** (Approx Lat: 25.35, Lng: 51.18)

### 1.2 Create Data Aggregation Logic
Create a new utility function (or service) that performs the following steps:
1.  Iterates through `RSS_FEEDS`.
2.  Fetches and parses the XML feeds (respecting existing caching rules).
3.  **Groups** the results by `country_iso`.
4.  **Outputs** a JSON structure specifically for the frontend globe:
    ```json
    {
      "NG": {
        "name": "Nigeria",
        "coordinates": [8.67, 9.08], // D3 uses [lng, lat]
        "count": 12,
        "sources": ["Punch", "Vanguard"],
        "articles": [ ...list of article objects... ]
      },
      "GB": { ... }
    }
    ```

### 1.3 Create Flask API Route
Create a new route `/api/globe-data` that calls the aggregation logic above and returns the JSON. Ensure this response is cached server-side to prevent slow loading times.

---

## Section 2: Frontend Implementation (D3.js)

### 2.1 The Globe Container
Create a new HTML template or component for the Globe View.
* **Library:** Import D3.js (v7) via CDN or local static file.
* **Canvas:** Full-width, dark theme background.

### 2.2 D3 Rendering Logic
Write a JavaScript module to render the map:
* **Projection:** Use `d3.geoOrthographic()`.
* **Data:** Fetch World GeoJSON (for landmasses) and the `/api/globe-data` (for our active points).
* **Styling:**
    * Ocean: Dark/Transparent.
    * Land: Dark Grey/Slate (subtle).
    * **Active Countries:** If a country exists in our `/api/globe-data`, render a pulsing circle (SVG circle with CSS animation) at its coordinates.

### 2.3 Interaction Features
* **Auto-Rotation:** The globe should slowly rotate on the X-axis.
* **Hover:** * Pause rotation.
    * Show a "Glassmorphism" tooltip with Country Name + Article Count.
* **Click:**
    * Zoom in slightly (optional).
    * Trigger an event to open the Side Drawer.

---

## Section 3: The Side Drawer (UI)

### 3.1 Implementation
Create a slide-out panel (off-canvas menu) using HTML/CSS.
* **Default State:** Hidden (transform: translateX(100%)).
* **Active State:** Visible (transform: translateX(0)).
* **Backdrop:** Blur the background content when open.

### 3.2 Content Logic
When a user clicks a country on the globe:
1.  JavaScript retrieves the `articles` array for that country from the global data object.
2.  Dynamically injects the article cards into the Side Drawer.
3.  Opens the drawer.

---

## Section 4: Styling Guidelines (PulsePoint Aesthetic)
* **Theme:** "Dark Mode Newsroom". Deep blues, dark greys.
* **Accent:** The "Pulse" color should be an electric blue or signal red/orange depending on the category (default to brand primary).
* **Typography:** Clean sans-serif (Inter or Roboto) for readability in the drawer.