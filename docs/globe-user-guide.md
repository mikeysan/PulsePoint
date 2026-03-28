# PulsePoint Globe Visualization - User Guide

## Overview

The PulsePoint Globe is an interactive 3D visualization that displays world news by geographic location. Countries with available news stories are marked with colored beacons that indicate the volume of news from that region.

## Getting Started

### Accessing the Globe

Navigate to: `https://your-domain.com/globe`

The globe will automatically load and begin slowly rotating, displaying news beacons for countries with available stories.

---

## Understanding the Interface

### Color-Coded Beacons

The globe displays beacons (colored markers) on countries. The color indicates the volume of news stories:

- 🟢 **Green (Low)**: 1-7 stories
- 🟡 **Amber (Medium)**: 8-14 stories
- 🔴 **Red (High)**: 15+ stories

The height of each beacon also corresponds to the number of stories - taller beacons indicate more news.

### Volume Legend

A legend in the bottom-right corner explains the color coding system.

### Timestamp Display

The top-right corner shows when the data was last updated:
- "Just updated" - Less than 1 minute ago
- "Updated X minutes ago" - Recent updates
- "Updated X hours ago" - Older updates

---

## Interacting with the Globe

### Mouse/Touch Controls

1. **Rotate the Globe**
   - Click and drag on the globe to rotate it manually
   - Release while dragging to "throw" the globe (inertia rotation)
   - The globe auto-rotates when not interacting

2. **View Country Stories**
   - Click on any beacon (colored marker) to view news from that country
   - The globe will smoothly rotate to center the country
   - A drawer slides in from the right showing all stories

3. **Hover for Information**
   - Hover over beacons to see:
     - Country name
     - Population
     - Geographic area
     - Languages spoken
     - Story count
     - Volume level badge

### Keyboard Controls

The globe is fully accessible via keyboard:

| Key | Action |
|-----|--------|
| `←` `→` `↑` `↓` Arrow Keys | Rotate the globe |
| `Enter` or `Space` | Select the country with most visible stories |
| `Escape` | Close the news drawer |

**Navigation Flow:**
1. Use arrow keys to rotate the globe and position your desired country
2. Press Enter/Space to select the country with the most visible stories
3. Press Escape to close the news drawer and return to globe navigation

---

## News Drawer

### Opening the Drawer

Click any beacon on the globe to open the news drawer for that country.

### Story Cards

Each story in the drawer displays:

1. **Title** - Click to open the full article in a new tab
2. **Recency Badge** (if applicable)
   - 🔴 **BREAKING** - Published within the last hour
   - 🟡 **NEW** - Published within the last 24 hours
3. **Source** - The news organization
4. **Time** - Relative time (e.g., "5m ago", "2h ago")
5. **Summary** - Brief article preview

### Visual Indicators

- **Breaking news cards** have a red left border and "BREAKING" badge
- **Recent news cards** have an amber left border and "NEW" badge
- **Cards are sorted** by recency (most recent first)

### Closing the Drawer

- Click the × button in the drawer header
- Click the backdrop (darkened area behind the drawer)
- Press `Escape` on your keyboard
- Click "Back to Grid View" to return to the traditional news layout

---

## Tips and Tricks

### Efficient Browsing

1. **Start with high-volume countries** (red beacons) for the most stories
2. **Look for breaking news** - these appear first in each country's list
3. **Use the timestamp** to ensure you're seeing fresh data
4. **Keyboard navigation** is faster for power users

### Understanding Coverage

The globe aggregates news from 50+ sources across 20+ countries including:
- United Kingdom (BBC, Guardian, Sky News)
- United States (CNN, NPR)
- Nigeria (Business Day, Premium Times)
- Canada (Globe and Mail, Toronto Star)
- Australia (ABC News)
- India (Times of India, Hindustan Times)
- And many more...

### Performance

- The globe data is cached for 10 minutes
- Loading time is typically 2-3 seconds
- Auto-rotation pauses on hover for easier selection

---

## Accessibility Features

The globe visualization is designed to be WCAG 2.1 AA compliant:

- ✅ Full keyboard navigation (no mouse required)
- ✅ Screen reader support with live announcements
- ✅ Focus indicators for all interactive elements
- ✅ ARIA labels and roles
- ✅ Skip-to-content link
- ✅ Touch-friendly targets (minimum 44×44px)

---

## Troubleshooting

### Globe Won't Load

**Solution:**
1. Check your internet connection
2. Click the "Retry" button if an error message appears
3. Refresh the page (Ctrl+F5 or Cmd+Shift+R)

### Beacons Not Appearing

**Possible Causes:**
- No news data available for current rotation
- All countries with news are on the backside of the globe

**Solution:**
- Rotate the globe using arrow keys or drag
- Wait for auto-rotation to reveal more countries

### Drawer Not Opening

**Solution:**
1. Ensure you're clicking directly on a beacon (colored marker)
2. Try zooming in (if available)
3. Check that popups are not blocked in your browser

### Stories Not Loading in Drawer

**Solution:**
1. Wait for skeleton loading animation to complete
2. Check your network connection
3. Try selecting a different country

---

## Keyboard Shortcuts Reference

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Rotate left | `←` | `←` |
| Rotate right | `→` | `→` |
| Rotate up | `↑` | `↑` |
| Rotate down | `↓` | `↓` |
| Select country | `Enter` | `Return` |
| Select country | `Space` | `Space` |
| Close drawer | `Escape` | `Escape` |
| Refresh page | `Ctrl+R` | `Cmd+R` |
| Hard refresh | `Ctrl+F5` | `Cmd+Shift+R` |

---

## Technical Details

### Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Performance Requirements

- Modern GPU recommended for smooth 60fps animation
- 4G+ connection for optimal loading
- Works on 3G with longer load times

### Data Refresh

- News data updates every 10 minutes (cached)
- Manual refresh: Reload the page
- Timestamp shows last successful fetch

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/mikeysan/PulsePoint/issues)
2. Review the [main README](../../README.md)
3. Contact support through GitHub discussions

---

## Future Enhancements

Planned features for the globe visualization:

- [ ] Search by country name
- [ ] Filter by recency (breaking, recent, all)
- [ ] Bookmark favorite countries
- [ ] Customizable rotation speed
- [ ] Historical news timeline view

---

**Last Updated:** March 2026
**Version:** 1.0.0
