
/**
 * PulsePoint Globe Visualization Module
 *
 * An interactive 3D globe visualization displaying world news by geographic location.
 * Features include:
 * - D3.js orthographic projection with country beacons
 * - Color-coded volume indicators (green/amber/red)
 * - Physics-based inertia rotation
 * - Full keyboard navigation
 * - Fly-to animations for country selection
 *
 * @module GlobeVisualization
 * @requires d3@7
 * @requires topojson@3
 *
 * @author PulsePoint Team
 * @version 1.0.0
 * @since 2026-03
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Configuration
    const width = window.innerWidth;
    const height = window.innerHeight;
    const sensibility = 75; // Rotate sensibility

    /**
     * Calculate the appropriate globe scale based on viewport size
     *
     * Adjusts the projection scale for different screen sizes:
     * - Mobile (<600px): 90% of base scale
     * - Tablet (<768px): 95% of base scale
     * - Desktop: 100% of base scale
     *
     * @returns {number} The calculated scale value
     */
    function calculateScale() {
        const baseScale = Math.min(width, height) / 2.5;
        // Adjust scale for mobile devices
        if (width < 600) {
            return baseScale * 0.9; // Slightly smaller on mobile
        } else if (width < 768) {
            return baseScale * 0.95; // Slightly smaller on tablet
        }
        return baseScale;
    }

    // State
    let globeData = {};
    let globeMetadata = {};
    let isRotating = true;
    let rotationTimer;
    let flyToTimer = null; // Track fly-to animation timer

    // Performance optimization: Throttle redraws with requestAnimationFrame
    let rafId = null;
    let needsRedraw = false;

    // Selectors
    const container = d3.select('#globe-container');
    const tooltip = d3.select('#globe-tooltip');

    // 1. Setup D3 Projection & Path
    const projection = d3.geoOrthographic()
        .scale(calculateScale())
        .center([0, 0])
        .rotate([0, -30])
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // SVG Container
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'globe-svg');

    // Groups
    const gGlobe = svg.append('g').attr('class', 'globe-group');
    const gLand = gGlobe.append('g').attr('class', 'land-group');
    const gBeacons = gGlobe.append('g').attr('class', 'beacon-group');

    // Water (Background sphere)
    gGlobe.insert('path', '.land-group')
        .datum({ type: 'Sphere' })
        .attr('class', 'water')
        .attr('d', path)
        .attr('fill', '#0f172a')
        .attr('stroke', 'rgba(59, 130, 246, 0.3)') // Subtle blue ring
        .attr('stroke-width', 1);

    // Solar Terminator (Shadow)
    // We'll create a simple gradient effect or a "night" overlay
    const defs = svg.append('defs');
    const radialGradient = defs.append('radialGradient')
        .attr('id', 'globeGradient')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');

    radialGradient.append('stop')
        .attr('offset', '80%')
        .attr('stop-color', '#fff')
        .attr('stop-opacity', '0');

    radialGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#000') // Shadow edge
        .attr('stop-opacity', '0.6');

    gGlobe.append('circle')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('r', projection.scale())
        .attr('fill', 'url(#globeGradient)')
        .attr('class', 'terminator')
        .style('pointer-events', 'none');

    // Handle window resize for responsive design
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Update projection scale based on new viewport size
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;
            const newScale = calculateScale();

            projection
                .scale(newScale)
                .translate([newWidth / 2, newHeight / 2]);

            // Update terminator circle size
            d3.select('.terminator')
                .attr('cx', newWidth / 2)
                .attr('cy', newHeight / 2)
                .attr('r', newScale);

            scheduleRedraw();
        }, 250); // Debounce resize events
    });

    // 2. Load Data (World GeoJSON + API Data)
    async function loadGlobeData() {
        const loadingEl = document.getElementById('globe-loading');
        const errorEl = document.getElementById('globe-error');

        try {
            // Show loading state
            if (loadingEl) loadingEl.style.display = 'flex';
            if (errorEl) errorEl.style.display = 'none';

            const [worldData, apiResponse] = await Promise.all([
                d3.json('https://unpkg.com/world-atlas@2.0.2/countries-110m.json'),
                d3.json('/api/globe-data')
            ]);

            // Hide loading state
            if (loadingEl) loadingEl.style.display = 'none';

            // Validate API response
            if (!apiResponse || Object.keys(apiResponse).length === 0) {
                throw new Error('No news data available');
            }

            // Extract metadata if present
            if ('_meta' in apiResponse) {
                globeMetadata = apiResponse._meta;
                // Remove metadata from country data
                globeData = Object.fromEntries(
                    Object.entries(apiResponse).filter(([key]) => key !== '_meta')
                );
            } else {
                globeData = apiResponse;
                globeMetadata = {};
            }

            // Update timestamp display
            updateTimestampDisplay();

            showToast('News loaded successfully', 'success');

            return { worldData, apiResponse };

        } catch (error) {
            console.error('Failed to load globe data:', error);

            // Show error state
            if (loadingEl) loadingEl.style.display = 'none';
            if (errorEl) errorEl.style.display = 'block';

            showToast('Failed to load news. Please try again.', 'error');
            announce('Error loading news data. Please check your connection.');

            // Set up retry button
            const retryBtn = document.getElementById('retry-button');
            if (retryBtn) {
                retryBtn.onclick = async () => {
                    retryBtn.disabled = true;
                    retryBtn.textContent = 'Retrying...';
                    await loadGlobeData();
                    retryBtn.disabled = false;
                    retryBtn.textContent = 'Retry';
                };
            }

            throw error;
        }
    }

    try {
        const { worldData } = await loadGlobeData();

        // Render Land
        const countries = topojson.feature(worldData, worldData.objects.countries);

        gLand.selectAll('path')
            .data(countries.features)
            .enter().append('path')
            .attr('d', path)
            .attr('fill', '#334155')
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 0.5) // Refined stroke
            .attr('class', 'country')
            .style('transition', 'fill 0.2s')
            .on('mouseover', function () {
                d3.select(this).attr('fill', '#475569');
            })
            .on('mouseout', function () {
                d3.select(this).attr('fill', '#334155');
            });

        // Render Beacons from backend data
        renderBeacons();

        // Initial Draw (scheduled via RAF for optimal timing)
        scheduleRedraw();

        // (Rotation handled by new Inertia Timer below)

    } catch (error) {
        console.error('Failed to load globe data:', error);
    }

    // 3. Rendering Logic
    function renderBeacons() {
        // Convert API object to array for D3
        const beacons = Object.values(globeData).map(d => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [d.lng, d.lat] // D3 uses [lng, lat]
            },
            properties: d
        }));

        // Beacon Groups
        const markerGroups = gBeacons.selectAll('g.marker-group')
            .data(beacons)
            .enter().append('g')
            .attr('class', 'marker-group')
            .on('mouseenter', () => {
                isRotating = false;
            })
            .on('mouseleave', () => {
                isRotating = true;
            });

        // Volume Bar (projected line)
        // Note: In 2D orthographic, lines are tricky. We simulate a "standing bar"
        // by drawing a line from the point to a slightly "elevated" point.
        // For simplicity and robustness in 2D SVG, we'll use vertically offset circles
        // AND a line connecting them to surface to look like a post.

        // Determine color based on volume
        const getColor = (count) => {
            if (count >= 15) return '#ef4444'; // Red for high volume
            if (count >= 8) return '#f59e0b';  // Amber for medium volume
            return '#22c55e';                 // Green for low volume
        };

        // 1. Base on surface (invisible hit target)
        markerGroups.append('circle')
            .attr('r', 4)
            .attr('fill', d => getColor(d.properties.story_count))
            .attr('fill-opacity', 0.5);

        // 2. The "Stick" (Line rising from surface)
        markerGroups.append('line')
            .attr('class', 'volume-stick')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', 0).attr('y2', d => -Math.min(d.properties.story_count * 2, 60)) // Height based on count
            .attr('stroke', d => getColor(d.properties.story_count))
            .attr('stroke-width', 1)
            .attr('opacity', 0.7);

        // 3. The "Cap" (Data Point at top of stick)
        markerGroups.append('circle')
            .attr('class', 'volume-cap')
            .attr('cy', d => -Math.min(d.properties.story_count * 2, 60))
            .attr('r', d => Math.min(Math.max(d.properties.story_count / 2, 3), 12)) // Size based on count
            .attr('fill', d => getColor(d.properties.story_count))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                showTooltip(event, d.properties);
                // Lighten color on hover
                const baseColor = getColor(d.properties.story_count);
                const hoverColor = baseColor === '#ef4444' ? '#f87171' :
                    baseColor === '#f59e0b' ? '#fbbf24' : '#4ade80';
                d3.select(event.currentTarget).attr('fill', hoverColor);
            })
            .on('mouseout', (event, d) => {
                hideTooltip();
                d3.select(event.currentTarget).attr('fill', getColor(d.properties.story_count));
            })
            .on('click', (event, d) => {
                openDrawer(d.properties);
            });

        // Pulse Effect only for high volume/breaking
        markerGroups.filter(d => d.properties.story_count > 5).append('circle')
            .attr('class', 'location-pulse')
            .attr('cy', d => -Math.min(d.properties.story_count * 2, 60))
            .attr('r', 15);

        redraw();
    }

    function redraw() {
        // Performance optimization: Cache center calculation
        const center = projection.invert([width / 2, height / 2]);

        // Update paths
        gGlobe.selectAll('path').attr('d', path);

        // Update beacons positions with cached calculations
        gBeacons.selectAll('.marker-group')
            .attr('transform', d => {
                const coords = projection(d.geometry.coordinates);
                // Hide if on backside of globe
                // https://stackoverflow.com/questions/11096180/d3-orthographic-projection-hiding-points-on-the-back
                // Simple trick: check clip distance or use d3-geo circle clip
                // For simplified orthographic, we can check visibility roughly
                return `translate(${coords[0]}, ${coords[1]})`;
            })
            .style('display', d => {
                // Check if point is visible (using cached center)
                const d_geo = d.geometry.coordinates;
                const distance = d3.geoDistance(d_geo, center);
                return distance > 1.57 ? 'none' : 'block';
            });
    }

    // Inertia Rotation Logic
    let velocity = [0.1, 0]; // Initial auto-rotation velocity [lon, lat]
    let lastTime = 0; // elapsed starts at 0 in d3.timer
    let dragVelocity = [0, 0];
    let skipFrame = false; // Skip first frame after drag to sync time

    function scheduleRedraw() {
        if (!rafId && !needsRedraw) {
            needsRedraw = true;
            rafId = requestAnimationFrame(() => {
                if (needsRedraw) {
                    redraw();
                    needsRedraw = false;
                }
                rafId = null;
            });
        }
    }

    // Timer for continuous animation loop
    d3.timer((elapsed) => {
        if (!isRotating) {
            // While paused, still update lastTime to keep it synced
            lastTime = elapsed;
            return true; // Paused by hover
        }

        // DEBUG: Log rotation state periodically (every ~1 second)
        if (elapsed % 1000 < 20) {
            console.log(`[ROTATION TIMER] isRotating=true, velocity=[${velocity[0].toFixed(3)}, ${velocity[1].toFixed(3)}]`);
        }

        // Skip first frame after resuming to let time delta normalize
        if (skipFrame) {
            lastTime = elapsed;
            skipFrame = false;
            return true;
        }

        const dt = elapsed - lastTime;
        lastTime = elapsed;

        // Apply rotation based on current velocity
        const rotate = projection.rotate();
        projection.rotate([
            rotate[0] + velocity[0] * (dt / 16),
            rotate[1] + velocity[1] * (dt / 16)
        ]);

        // Friction/Decay if dragging stopped
        // We revert gradually to "auto-spin" speed [0.1, 0]
        // or just decay drag velocity to 0 and let auto-spin take over?
        // Let's standard "decay to auto-spin" model.

        // Auto-spin target
        const targetVelocity = [0.1, 0];

        // Linear interpolation towards target (friction)
        velocity[0] = velocity[0] * 0.95 + targetVelocity[0] * 0.05;
        velocity[1] = velocity[1] * 0.95 + targetVelocity[1] * 0.05;

        // Clamp very small values to target to avoid micro-jitters
        if (Math.abs(velocity[0] - targetVelocity[0]) < 0.001) velocity[0] = targetVelocity[0];
        if (Math.abs(velocity[1] - targetVelocity[1]) < 0.001) velocity[1] = targetVelocity[1];

        scheduleRedraw();
    });

    // Drag Interaction with Inertia
    const drag = d3.drag()
        .on('start', () => {
            isRotating = false;
            dragVelocity = [0, 0];
        })
        .on('drag', (event) => {
            const k = sensibility / projection.scale();
            const rotate = projection.rotate();

            // Immediate update during drag
            projection.rotate([
                rotate[0] + event.dx * k,
                rotate[1] - event.dy * k
            ]);

            // Capture velocity for inertia release
            // Simple exponential smoothing
            dragVelocity = [event.dx * k, -event.dy * k];

            scheduleRedraw();
        })
        .on('end', () => {
            // Apply drag throw velocity
            // Boost it slightly for "feel"
            velocity = [dragVelocity[0] * 1.5, dragVelocity[1] * 1.5];

            // Resume loop smoothly - skip first frame to normalize time delta
            isRotating = true;
            skipFrame = true;
        });

    container.call(drag);

    // Keyboard Navigation for Accessibility
    let focusedCountryIndex = -1;
    let visibleCountries = [];

    // Announcer for screen readers
    function announce(message) {
        const announcer = document.getElementById('globe-announcer');
        if (announcer) {
            announcer.textContent = message;
        }
    }

    // Toast notification system
    function showToast(message, type = 'success') {
        const toast = document.getElementById('globe-toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `globe-toast ${type} show`;

        // Auto-hide after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    // Update timestamp display
    function updateTimestampDisplay() {
        const timestampEl = document.getElementById('globe-timestamp');
        if (!timestampEl || !globeMetadata.last_updated) return;

        const lastUpdated = new Date(globeMetadata.last_updated);
        const now = new Date();
        const diffMs = now - lastUpdated;
        const diffMins = Math.floor(diffMs / 60000);

        let timeText;
        if (diffMins < 1) {
            timeText = 'Just updated';
        } else if (diffMins < 60) {
            timeText = `Updated ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else {
            const diffHours = Math.floor(diffMins / 60);
            timeText = `Updated ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        }

        timestampEl.textContent = timeText;

        // Also show total stats if available
        if (globeMetadata.total_countries !== undefined) {
            timestampEl.setAttribute('data-stats',
                `${globeMetadata.total_countries} countries • ${globeMetadata.total_stories} stories`);
        }
    }

    // Update visible countries list for keyboard navigation
    function updateVisibleCountries() {
        const center = projection.invert([width / 2, height / 2]);
        visibleCountries = Object.values(globeData).filter(country => {
            const distance = d3.geoDistance([country.lng, country.lat], center);
            return distance <= 1.57; // Only visible countries
        }).sort((a, b) => {
            // Sort by story count (highest first)
            return b.story_count - a.story_count;
        });
    }

    // Keyboard event handler
    container.on('keydown', (event) => {
        const rotateSpeed = 2; // Degrees per keypress

        // Check if drawer is open for different keyboard handling
        const drawer = document.getElementById('sideDrawer');
        const isDrawerOpen = drawer && drawer.classList.contains('active');

        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                const rotateLeft = projection.rotate();
                projection.rotate([rotateLeft[0] - rotateSpeed, rotateLeft[1]]);
                updateVisibleCountries();
                scheduleRedraw();
                break;

            case 'ArrowRight':
                event.preventDefault();
                const rotateRight = projection.rotate();
                projection.rotate([rotateRight[0] + rotateSpeed, rotateRight[1]]);
                updateVisibleCountries();
                scheduleRedraw();
                break;

            case 'ArrowUp':
                event.preventDefault();
                const rotateUp = projection.rotate();
                projection.rotate([rotateUp[0], Math.max(rotateUp[1] - rotateSpeed, -90)]);
                updateVisibleCountries();
                scheduleRedraw();
                break;

            case 'ArrowDown':
                event.preventDefault();
                const rotateDown = projection.rotate();
                projection.rotate([rotateDown[0], Math.min(rotateDown[1] + rotateSpeed, 90)]);
                updateVisibleCountries();
                scheduleRedraw();
                break;

            case 'Enter':
            case ' ':
                event.preventDefault();
                if (isDrawerOpen) {
                    // Open first story link if drawer is open
                    const firstLink = drawer.querySelector('.card-title a');
                    if (firstLink) {
                        announce('Opening article in new tab');
                        firstLink.click();
                    }
                } else {
                    // Select the country with most stories currently visible
                    updateVisibleCountries();
                    if (visibleCountries.length > 0) {
                        const country = visibleCountries[0]; // Highest story count
                        announce(`Opening ${country.name} news with ${country.story_count} stories`);
                        openDrawer(country);
                    } else {
                        announce('No countries visible. Use arrow keys to rotate the globe.');
                    }
                }
                break;

            case 'Escape':
                event.preventDefault();
                // Close drawer or help overlay if open
                if (isDrawerOpen) {
                    closeDrawer();
                    announce('News drawer closed');
                    container.focus(); // Return focus to globe
                } else {
                    const helpOverlay = document.getElementById('keyboard-help');
                    if (helpOverlay && helpOverlay.classList.contains('active')) {
                        closeKeyboardHelp();
                    }
                }
                break;

            case 'j':
            case 'J':
                event.preventDefault();
                if (isDrawerOpen) {
                    navigateStories('next');
                } else {
                    announce('Open a country drawer first to navigate stories');
                }
                break;

            case 'k':
            case 'K':
                event.preventDefault();
                if (isDrawerOpen) {
                    navigateStories('prev');
                } else {
                    announce('Open a country drawer first to navigate stories');
                }
                break;

            case '?':
                event.preventDefault();
                toggleKeyboardHelp();
                break;

            case 'Tab':
            case 'Shift+Tab':
                // Let browser handle Tab navigation natively
                // Just ensure focus indicators are visible
                return;

            default:
                // Let other keys pass through
                return;
        }
    });

    // Helper: Navigate between story cards with J/K keys
    function navigateStories(direction) {
        const drawer = document.getElementById('sideDrawer');
        if (!drawer || !drawer.classList.contains('active')) return;

        const cards = Array.from(drawer.querySelectorAll('.drawer-card'));
        if (cards.length === 0) return;

        // Find currently focused card or title link
        const currentFocus = document.activeElement;
        let currentIndex = cards.findIndex(card =>
            card.contains(currentFocus) || card === currentFocus
        );

        // Calculate new index
        let newIndex;
        if (currentIndex === -1) {
            // No card currently focused, start from top or bottom
            newIndex = direction === 'next' ? 0 : cards.length - 1;
        } else {
            newIndex = direction === 'next'
                ? (currentIndex + 1) % cards.length
                : (currentIndex - 1 + cards.length) % cards.length;
        }

        // Focus the title link in the new card
        const titleLink = cards[newIndex].querySelector('.card-title a');
        if (titleLink) {
            titleLink.focus();

            // Announce the story for screen readers
            const storyTitle = titleLink.textContent.trim();
            const position = newIndex + 1;
            const total = cards.length;
            announce(`Story ${position} of ${total}: ${storyTitle}`);
        }
    }

    // Helper: Toggle keyboard shortcuts help overlay
    function toggleKeyboardHelp() {
        const helpOverlay = document.getElementById('keyboard-help');

        if (!helpOverlay) {
            createKeyboardHelpOverlay();
            return;
        }

        if (helpOverlay.classList.contains('active')) {
            closeKeyboardHelp();
        } else {
            helpOverlay.classList.add('active');
            helpOverlay.setAttribute('aria-hidden', 'false');
            announce('Keyboard shortcuts help opened');
            // Don't steal focus from globe, just show overlay
        }
    }

    // Helper: Close keyboard shortcuts help overlay
    function closeKeyboardHelp() {
        const helpOverlay = document.getElementById('keyboard-help');
        if (helpOverlay) {
            helpOverlay.classList.remove('active');
            helpOverlay.setAttribute('aria-hidden', 'true');
            announce('Keyboard shortcuts help closed');
            // Return focus to globe
            container.focus();
            // Explicitly resume rotation
            isRotating = true;
            skipFrame = true;
        }
    }

    // Helper: Create keyboard shortcuts help overlay
    function createKeyboardHelpOverlay() {
        const helpHTML = `
            <div id="keyboard-help" class="keyboard-help-overlay active" aria-hidden="false" role="dialog" aria-labelledby="keyboard-help-title">
                    <div class="keyboard-help-header">
                        <h2 id="keyboard-help-title">⌨️ Keyboard Shortcuts</h2>
                        <button class="keyboard-help-close" aria-label="Close keyboard shortcuts help" onclick="closeKeyboardHelp()">×</button>
                    </div>
                    <div class="keyboard-help-body">
                        <div class="shortcut-section">
                            <h3>Globe Navigation</h3>
                            <div class="shortcut-list">
                                <div class="shortcut-item">
                                    <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd>
                                    <span>Rotate the globe</span>
                                </div>
                                <div class="shortcut-item">
                                    <kbd>Enter</kbd> / <kbd>Space</kbd>
                                    <span>Select country & open news</span>
                                </div>
                            </div>
                        </div>
                        <div class="shortcut-section">
                            <h3>News Drawer</h3>
                            <div class="shortcut-list">
                                <div class="shortcut-item">
                                    <kbd>Tab</kbd>
                                    <span>Navigate between stories</span>
                                </div>
                                <div class="shortcut-item">
                                    <kbd>J</kbd>
                                    <span>Next story (Vim-style)</span>
                                </div>
                                <div class="shortcut-item">
                                    <kbd>K</kbd>
                                    <span>Previous story (Vim-style)</span>
                                </div>
                                <div class="shortcut-item">
                                    <kbd>Enter</kbd>
                                    <span>Open article in new tab</span>
                                </div>
                                <div class="shortcut-item">
                                    <kbd>Escape</kbd>
                                    <span>Close drawer</span>
                                </div>
                            </div>
                        </div>
                        <div class="shortcut-section">
                            <h3>General</h3>
                            <div class="shortcut-list">
                                <div class="shortcut-item">
                                    <kbd>?</kbd>
                                    <span>Show this help</span>
                                </div>
                                <div class="shortcut-item">
                                    <kbd>Escape</kbd>
                                    <span>Close overlays</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="keyboard-help-backdrop" onclick="closeKeyboardHelp()"></div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', helpHTML);
        const helpOverlay = document.getElementById('keyboard-help');
        helpOverlay.classList.add('active');
        helpOverlay.setAttribute('aria-hidden', 'false');
        announce('Keyboard shortcuts help opened');
    }

    // Update visible countries when globe rotates
    const originalRedraw = redraw;
    redraw = function () {
        originalRedraw();
        updateVisibleCountries();
    };

    // Helper: Get recency badge HTML
    function getRecencyBadge(recency) {
        const badges = {
            'breaking': '<span class="recency-badge breaking">BREAKING</span>',
            'recent': '<span class="recency-badge recent">NEW</span>',
            'old': ''
        };
        return badges[recency] || '';
    }

    // Helper: Format relative time
    function formatRelativeTime(dateString) {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;

            return date.toLocaleDateString();
        } catch (e) {
            return dateString;
        }
    }

    // Helper: Calculate reading time from summary text
    function calculateReadingTime(summary) {
        if (!summary) return '< 1 min read';

        const wordsPerMinute = 200;
        // Strip HTML tags and count words
        const text = summary.replace(/<[^>]*>?/gm, '');
        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        const minutes = Math.ceil(words / wordsPerMinute);

        return minutes < 1 ? '< 1 min read' : `${minutes} min read`;
    }

    // Helper: Extract domain from URL for source attribution
    function extractDomain(url) {
        if (!url) return 'unknown';

        try {
            const hostname = new URL(url).hostname;
            return hostname.replace('www.', '');
        } catch (e) {
            return 'unknown';
        }
    }

    // Helper: Format absolute date for tooltip
    function formatAbsoluteDate(dateString) {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }


    // 4. UI Interactions (Tooltip & Drawer)
    function showTooltip(event, data) {
        const pop = data.population ? data.population.toLocaleString() : 'N/A';
        const area = data.area_sq_km ? data.area_sq_km.toLocaleString() + ' km²' : 'N/A';
        const langs = data.languages && data.languages.length ? data.languages.join(', ') : 'N/A';

        // Determine volume level
        const volumeLevel = data.story_count >= 15 ? 'High' :
            data.story_count >= 8 ? 'Medium' : 'Low';
        const volumeColor = data.story_count >= 15 ? '#ef4444' :
            data.story_count >= 8 ? '#f59e0b' : '#22c55e';

        tooltip
            .style('opacity', 1)
            .style('left', (event.pageX) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
                <strong>${data.name}</strong><br/>
                <div style="margin-top:4px; font-size:0.8em; line-height:1.4; color:#ccc;">
                    Population: ${pop}<br/>
                    Area: ${area}<br/>
                    Languages: ${langs}
                </div>
                <div style="margin-top:4px; border-top:1px solid #444; padding-top:4px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${data.story_count} stories</span>
                    <span style="background:${volumeColor}; color:white; padding:2px 8px; border-radius:4px; font-size:0.7em; font-weight:bold;">
                        ${volumeLevel}
                    </span>
                </div>
            `);
    }

    /**
     * Hide the tooltip element
     *
     * Sets tooltip opacity to 0, effectively hiding it from view
     */
    function hideTooltip() {
        tooltip.style('opacity', 0);
    }

    /**
     * Animate the globe to smoothly rotate and center on a specific country
     *
     * Uses D3 timer with easeInOutCubic easing for smooth animation.
     * Pauses auto-rotation during the animation.
     *
     * @param {Object} countryData - The country to fly to
     * @param {number} countryData.lng - Longitude of the country
     * @param {number} countryData.lat - Latitude of the country
     * @param {number} [duration=1500] - Animation duration in milliseconds
     * @returns {Promise<void>} Resolves when animation completes
     */
    function flyToCountry(countryData, duration = 1500) {
        const targetLng = countryData.lng;
        const targetLat = countryData.lat;

        // Calculate target rotation to center the country
        // For orthographic projection, we need to rotate so the point is at center
        const targetRotate = [-targetLng, -targetLat];

        const startRotate = projection.rotate();

        // CRITICAL: Pause main rotation timer to prevent timer conflict
        isRotating = false;
        // Reset velocity to prevent corruption from residual drag velocity
        velocity = [0, 0];

        // Cancel any existing fly-to timer
        if (flyToTimer) {
            flyToTimer.stop();
        }

        return new Promise((resolve) => {
            flyToTimer = d3.timer((elapsed) => {
                const t = elapsed / duration; // elapsed starts at 0 for this timer

                if (t >= 1) {
                    projection.rotate(targetRotate);
                    scheduleRedraw();

                    // CRITICAL: Stop the timer explicitly
                    // Rotation state is now managed by MutationObserver watching drawer class
                    // The fly-to animation only pauses rotation at start, never resumes it
                    flyToTimer.stop();
                    flyToTimer = null;
                    resolve();
                    return true; // Stop timer
                }

                // Easing function (easeInOutCubic)
                const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

                // Interpolate rotation
                const currentRotate = [
                    startRotate[0] + (targetRotate[0] - startRotate[0]) * ease,
                    startRotate[1] + (targetRotate[1] - startRotate[1]) * ease
                ];

                projection.rotate(currentRotate);
                scheduleRedraw();
            });
        });
    }

    /**
     * Open the side drawer and display news stories for a country
     *
     * Performs the following steps:
     * 1. Triggers fly-to animation to center the country on globe
     * 2. Shows skeleton loading state while stories load
     * 3. Opens drawer with backdrop after animation completes
     * 4. Renders story cards with staggered entrance animation
     * 5. Manages focus for accessibility
     *
     * @param {Object} data - Country data object
     * @param {string} data.name - Country name
     * @param {Array} data.stories - Array of story objects
     * @param {number} data.story_count - Total number of stories
     */
    function openDrawer(data) {
        const drawer = document.getElementById('sideDrawer');
        const backdrop = document.getElementById('drawerBackdrop');
        const title = document.getElementById('drawerTitle');
        const content = document.getElementById('drawerContent');
        const closeBtn = drawer.querySelector('.drawer-close');

        title.textContent = `${data.name} News`;

        // Validate data structure
        if (!data || !data.stories || !Array.isArray(data.stories) || data.stories.length === 0) {
            console.error('Invalid or missing stories data:', data);
            showToast('No stories available for this country', 'error');
            return;
        }

        // Show skeleton loading state first
        content.innerHTML = Array(3).fill(0).map(() => `
            <div class="drawer-card skeleton">
                <div class="skeleton-title"></div>
                <div class="skeleton-meta"></div>
                <div class="skeleton-text"></div>
            </div>
        `).join('');

        // Fly to country before opening drawer
        flyToCountry(data, 1200).then(() => {
            // Open drawer after fly-to animation completes
            drawer.classList.add('active');
            backdrop.classList.add('active');
            drawer.setAttribute('aria-hidden', 'false');

            // Focus management: Set focus to close button
            setTimeout(() => {
                closeBtn.focus();
            }, 100);
        });

        // Populate stories after a brief delay (for smooth UX)
        requestAnimationFrame(() => {
            setTimeout(() => {
                // Sort stories by recency priority, then by publish date
                const recencyPriority = { 'breaking': 0, 'recent': 1, 'old': 2 };
                const sortedStories = [...data.stories].sort((a, b) => {
                    const priorityA = recencyPriority[a.recency || 'old'];
                    const priorityB = recencyPriority[b.recency || 'old'];

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB; // Sort by recency priority
                    }

                    // Within same recency level, sort by publish date (newest first)
                    return new Date(b.published) - new Date(a.published);
                });

                content.innerHTML = sortedStories.map((story, index) => {
                    const recency = story.recency || 'old';
                    const recencyBadge = getRecencyBadge(recency);
                    const animationDelay = index * 0.08; // Stagger by 80ms

                    // Enhanced metadata
                    const domain = extractDomain(story.link);
                    const readingTime = calculateReadingTime(story.summary);
                    const absoluteDate = formatAbsoluteDate(story.published);
                    const cleanSummary = story.summary.replace(/<[^>]*>?/gm, '').trim();

                    return `
                    <article class="drawer-card" data-recency="${recency}" style="animation-delay: ${animationDelay}s">
                        <div class="card-header">
                            <h3 class="card-title">
                                <a href="${story.link}"
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   aria-label="Read full article on ${story.source} (opens in new tab)">
                                    ${story.title}
                                    <span class="external-icon" aria-hidden="true">↗</span>
                                </a>
                            </h3>
                            ${recencyBadge}
                        </div>
                        <div class="meta">
                            <span class="meta-source" title="Source: ${domain}">
                                <span class="source-icon" aria-hidden="true">📰</span>
                                ${story.source}
                            </span>
                            <span class="meta-domain">${domain}</span>
                            <span class="meta-time" title="${absoluteDate}">
                                <time datetime="${story.published}">${formatRelativeTime(story.published)}</time>
                            </span>
                            <span class="meta-read-time" title="Estimated reading time">
                                <span aria-hidden="true">📖</span>
                                ${readingTime}
                            </span>
                        </div>
                        <div class="card-summary">
                            <p class="summary-text">${cleanSummary.substring(0, 180)}...</p>
                        </div>
                    </article>
                `}).join('');

                // Trigger reflow to start animations
                content.querySelectorAll('.drawer-card').forEach(card => {
                    card.classList.add('card-entrance');
                });

                // Announce to screen readers
                announce(`Showing ${data.story_count} news stories from ${data.name}`);
            }, 150);
        });
    }

    // Close Drawer Logic
    window.closeDrawer = function () {
        const drawer = document.getElementById('sideDrawer');
        const backdrop = document.getElementById('drawerBackdrop');

        drawer.classList.remove('active');
        backdrop.classList.remove('active');
        drawer.setAttribute('aria-hidden', 'true');

        // Cancel any running fly-to timer to prevent state interference
        if (flyToTimer) {
            flyToTimer.stop();
            flyToTimer = null;
        }

        // Return focus to globe container
        const globeContainer = document.getElementById('globe-container');
        if (globeContainer) {
            globeContainer.focus();
        }

        // NOTE: Rotation will be resumed by MutationObserver when drawer loses 'active' class
    };

    // Set up MutationObserver to resume rotation when drawer closes
    // This is more reliable than setting isRotating in closeDrawer() because:
    // 1. It observes ACTUAL state (DOM), not function execution
    // 2. It works regardless of HOW drawer was closed (click, Escape, X, programmatic)
    // 3. It's decoupled from the closeDrawer function
    const drawerElement = document.getElementById('sideDrawer');
    if (drawerElement) {
        const drawerObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isDrawerOpen = drawerElement.classList.contains('active');

                    // If drawer just closed and rotation is paused, resume it
                    if (!isDrawerOpen && !isRotating) {
                        console.log('[Drawer closed] Resuming globe rotation');
                        isRotating = true;
                        skipFrame = true;
                    }
                }
            });
        });

        // Start observing the drawer for attribute changes
        drawerObserver.observe(drawerElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    // Expose keyboard help function globally for HTML onclick handlers
    window.closeKeyboardHelp = closeKeyboardHelp;

    // Keyboard help button click handler
    const keyboardHelpButton = document.getElementById('keyboard-help-button');
    if (keyboardHelpButton) {
        keyboardHelpButton.addEventListener('click', (e) => {
            e.preventDefault();
            toggleKeyboardHelp();
        });
    }

    // Zoom Support (Optional)
    const zoom = d3.zoom()
        .scaleExtent([200, 1000])
        .on('zoom', (event) => {
            projection.scale(event.transform.k);
            redraw();
        });
    // container.call(zoom); // Disabled for now to prioritize rotation
});
