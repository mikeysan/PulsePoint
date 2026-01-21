# IMPL Globe UI/UX Refinements

This plan addresses the remaining visual and functional improvements for the Globe Interface as defined in `globe_ui_ux_review.md.resolved`.

## Goal
Elevate the existing Globe View from a functional prototype to a premium, data-centric visualization matching the "Minimalist News Aggregator" identity.

## User Review Required

> [!NOTE]
> The backend data aggregation is assumed to be working. This plan focuses purely on Frontend (CSS/JS/D3) refinements.

## Proposed Changes

### 1. Visual Aesthetics (Background & Atmosphere)
#### [MODIFY] [globe.css](file:///Users/mac/Documents/development/PulsePoint/frontend/static/css/globe.css)
- **Data Grid**: Replace the simple radial gradient with a projected grid pattern or subtle dotted map background (using CSS or SVG background image) to reinforce the "Data Dashboard" feel.
- **Atmospheric Haze**: Add a `box-shadow` or pseudo-element glow behind the globe container to create depth.
- **Palette**: Ensure all colors align with `style.css` variables.

### 2. Globe Rendering (D3.js)
#### [MODIFY] [globe.js](file:///Users/mac/Documents/development/PulsePoint/frontend/static/js/globe.js)
- **Terminator**: Implement `d3.geoCircle` or a shadow gradient to simulate day/night terminator line for 3D volume.
- **Monochromatic Landmasses**: Update land fill color to light slate (`#334155`) with thinner stroke (`0.5px`).
- **Data Volume**: Upgrade markers from simple circles to "Bar Charts" (projected lines) or clustered circles where height/size represents article count.

### 3. UI Components (Glassmorphism)
#### [MODIFY] [globe.css](file:///Users/mac/Documents/development/PulsePoint/frontend/static/css/globe.css)
- **Drawer & Tooltip**: Increase blur to `20px`.
- **Borders**: Add `1px solid rgba(255,255,255,0.1)` to define edges.
- **Typography**: Sync fonts with `style.css` (`Inter`).
- **Transitions**: Ensure `cubic-bezier` easing matches the main app.

### 4. Interaction (Physics)
#### [MODIFY] [globe.js](file:///Users/mac/Documents/development/PulsePoint/frontend/static/js/globe.js)
- **Inertia**: Replace simple drag with physics-based rotation (velocity decay) using `d3-inertia` logic or custom requestAnimationFrame loop.
- **Hover Effects**: subtle highlight of country paths on hover.

## Verification Plan
### Manual Verification
- Open `<host>/globe` in the browser.
- **Visual Check**: Confirm background grid, atmospheric glow, and "Glass" drawer look.
- **Interaction**: "Throw" the globe and verify it spins with inertia.
- **Data**: Verify Austria/Nigeria/etc. display "volume" markers (bars or sized circles).
