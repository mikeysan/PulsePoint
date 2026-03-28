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
    let width = window.innerWidth;
    let height = window.innerHeight;
    const sensibility = 75;

    function calculateScale() {
        const baseScale = Math.min(width, height) / 2.5;
        if (width < 600) return baseScale * 0.9;
        if (width < 768) return baseScale * 0.95;
        return baseScale;
    }

    // State
    let globeData = {};
    let globeMetadata = {};
    let flyToTimer = null;

    let isRotating = true;
    let lastTime = 0;
    let velocity = [0.1, 0];
    let dragVelocity = [0, 0];
    let skipFrame = false;

    // Separate pause reasons
    const pauseState = {
        hover: false,
        drag: false,
        flyTo: false,
        drawer: false
    };

    function syncRotationState() {
        const shouldRotate = !(
            pauseState.hover ||
            pauseState.drag ||
            pauseState.flyTo ||
            pauseState.drawer
        );

        if (shouldRotate && !isRotating) {
            skipFrame = true;
        }

        isRotating = shouldRotate;
    }

    // Performance optimization: Throttle redraws with requestAnimationFrame
    let rafId = null;
    let needsRedraw = false;

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

    // Water
    gGlobe.insert('path', '.land-group')
        .datum({ type: 'Sphere' })
        .attr('class', 'water')
        .attr('d', path)
        .attr('fill', '#0f172a')
        .attr('stroke', 'rgba(59, 130, 246, 0.3)')
        .attr('stroke-width', 1);

    // Gradient / terminator
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
        .attr('stop-color', '#000')
        .attr('stop-opacity', '0.6');

    gGlobe.append('circle')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('r', projection.scale())
        .attr('fill', 'url(#globeGradient)')
        .attr('class', 'terminator')
        .style('pointer-events', 'none');

    // Resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            width = window.innerWidth;
            height = window.innerHeight;
            const newScale = calculateScale();

            svg.attr('width', width).attr('height', height);

            projection
                .scale(newScale)
                .translate([width / 2, height / 2]);

            d3.select('.terminator')
                .attr('cx', width / 2)
                .attr('cy', height / 2)
                .attr('r', newScale);

            scheduleRedraw();
        }, 250);
    });

    // 2. Load Data
    async function loadGlobeData() {
        const loadingEl = document.getElementById('globe-loading');
        const errorEl = document.getElementById('globe-error');

        try {
            if (loadingEl) loadingEl.style.display = 'flex';
            if (errorEl) errorEl.style.display = 'none';

            const [worldData, apiResponse] = await Promise.all([
                d3.json('https://unpkg.com/world-atlas@2.0.2/countries-110m.json'),
                d3.json('/api/globe-data')
            ]);

            if (loadingEl) loadingEl.style.display = 'none';

            if (!apiResponse || Object.keys(apiResponse).length === 0) {
                throw new Error('No news data available');
            }

            if ('_meta' in apiResponse) {
                globeMetadata = apiResponse._meta;
                globeData = Object.fromEntries(
                    Object.entries(apiResponse).filter(([key]) => key !== '_meta')
                );
            } else {
                globeData = apiResponse;
                globeMetadata = {};
            }

            updateTimestampDisplay();
            showToast('News loaded successfully', 'success');

            return { worldData, apiResponse };
        } catch (error) {
            console.error('Failed to load globe data:', error);

            if (loadingEl) loadingEl.style.display = 'none';
            if (errorEl) errorEl.style.display = 'block';

            showToast('Failed to load news. Please try again.', 'error');
            announce('Error loading news data. Please check your connection.');

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

        const countries = topojson.feature(worldData, worldData.objects.countries);

        gLand.selectAll('path')
            .data(countries.features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('fill', '#334155')
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 0.5)
            .attr('class', 'country')
            .style('transition', 'fill 0.2s')
            .on('mouseover', function () {
                d3.select(this).attr('fill', '#475569');
            })
            .on('mouseout', function () {
                d3.select(this).attr('fill', '#334155');
            });

        renderBeacons();
        scheduleRedraw();
    } catch (error) {
        console.error('Failed to load globe data:', error);
    }

    // 3. Rendering Logic
    function renderBeacons() {
        const beacons = Object.values(globeData).map(d => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [d.lng, d.lat]
            },
            properties: d
        }));

        const getColor = (count) => {
            if (count >= 15) return '#ef4444';
            if (count >= 8) return '#f59e0b';
            return '#22c55e';
        };

        const getHoverColor = (count) => {
            const base = getColor(count);
            if (base === '#ef4444') return '#f87171';
            if (base === '#f59e0b') return '#fbbf24';
            return '#4ade80';
        };

        const markerGroups = gBeacons.selectAll('g.marker-group')
            .data(beacons)
            .enter()
            .append('g')
            .attr('class', 'marker-group')
            .on('mouseenter', (event, d) => {
                pauseState.hover = true;
                syncRotationState();
                showTooltip(event, d.properties);
                const cap = d3.select(event.currentTarget).select('.volume-cap');
                cap.attr('fill', getHoverColor(d.properties.story_count));
            })
            .on('mouseleave', (event, d) => {
                pauseState.hover = false;
                syncRotationState();
                hideTooltip();
                const cap = d3.select(event.currentTarget).select('.volume-cap');
                cap.attr('fill', getColor(d.properties.story_count));
            })
            .on('click', (_, d) => {
                // Clicking a beacon may leave hover stuck if the drawer/backdrop takes over.
                // Clear hover explicitly, then pause through flyTo/drawer state instead.
                pauseState.hover = false;
                velocity = [0, 0];
                hideTooltip();
                syncRotationState();
                openDrawer(d.properties);
            });

        // Invisible hit-area circle for accessible 44px minimum target size
        markerGroups.append('circle')
            .attr('class', 'hit-area')
            .attr('cy', d => -Math.min(d.properties.story_count * 2, 60))
            .attr('r', 22)
            .attr('fill', 'transparent')
            .attr('cursor', 'pointer');

        markerGroups.append('circle')
            .attr('r', 4)
            .attr('fill', d => getColor(d.properties.story_count))
            .attr('fill-opacity', 0.5);

        markerGroups.append('line')
            .attr('class', 'volume-stick')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 0)
            .attr('y2', d => -Math.min(d.properties.story_count * 2, 60))
            .attr('stroke', d => getColor(d.properties.story_count))
            .attr('stroke-width', 1)
            .attr('opacity', 0.7);

        markerGroups.append('circle')
            .attr('class', 'volume-cap')
            .attr('cy', d => -Math.min(d.properties.story_count * 2, 60))
            .attr('r', d => Math.min(Math.max(d.properties.story_count / 2, 3), 12))
            .attr('fill', d => getColor(d.properties.story_count))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('cursor', 'pointer');

        markerGroups.filter(d => d.properties.story_count > 5)
            .append('circle')
            .attr('class', 'location-pulse')
            .attr('cy', d => -Math.min(d.properties.story_count * 2, 60))
            .attr('r', 15);

        redraw();
    }

    function redraw() {
        const center = projection.invert([width / 2, height / 2]);

        gGlobe.selectAll('path').attr('d', path);

        gBeacons.selectAll('.marker-group')
            .attr('transform', d => {
                const coords = projection(d.geometry.coordinates);
                return `translate(${coords[0]}, ${coords[1]})`;
            })
            .style('display', d => {
                const dGeo = d.geometry.coordinates;
                const distance = d3.geoDistance(dGeo, center);
                return distance > 1.57 ? 'none' : 'block';
            });

        updateVisibleCountries();
    }

    // Rotation timer
    d3.timer((elapsed) => {
        if (!isRotating) {
            lastTime = elapsed;
            return true;
        }

        if (skipFrame) {
            lastTime = elapsed;
            skipFrame = false;
            return true;
        }

        const dt = elapsed - lastTime;
        lastTime = elapsed;

        const rotate = projection.rotate();
        projection.rotate([
            rotate[0] + velocity[0] * (dt / 16),
            rotate[1] + velocity[1] * (dt / 16)
        ]);

        const targetVelocity = [0.1, 0];

        velocity[0] = velocity[0] * 0.95 + targetVelocity[0] * 0.05;
        velocity[1] = velocity[1] * 0.95 + targetVelocity[1] * 0.05;

        if (Math.abs(velocity[0] - targetVelocity[0]) < 0.001) velocity[0] = targetVelocity[0];
        if (Math.abs(velocity[1] - targetVelocity[1]) < 0.001) velocity[1] = targetVelocity[1];

        scheduleRedraw();
    });

    // Drag
    const drag = d3.drag()
        .on('start', () => {
            pauseState.drag = true;
            dragVelocity = [0, 0];
            syncRotationState();
        })
        .on('drag', (event) => {
            const k = sensibility / projection.scale();
            const rotate = projection.rotate();

            projection.rotate([
                rotate[0] + event.dx * k,
                rotate[1] - event.dy * k
            ]);

            dragVelocity = [event.dx * k, -event.dy * k];
            scheduleRedraw();
        })
        .on('end', () => {
            velocity = [dragVelocity[0] * 1.5, dragVelocity[1] * 1.5];
            pauseState.drag = false;
            syncRotationState();
        });

    container.call(drag);

    // Keyboard navigation
    let visibleCountries = [];

    function announce(message) {
        const announcer = document.getElementById('globe-announcer');
        if (announcer) announcer.textContent = message;
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('globe-toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `globe-toast ${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

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

        if (globeMetadata.total_countries !== undefined) {
            timestampEl.setAttribute(
                'data-stats',
                `${globeMetadata.total_countries} countries • ${globeMetadata.total_stories} stories`
            );
        }
    }

    function updateVisibleCountries() {
        const center = projection.invert([width / 2, height / 2]);
        visibleCountries = Object.values(globeData)
            .filter(country => {
                const distance = d3.geoDistance([country.lng, country.lat], center);
                return distance <= 1.57;
            })
            .sort((a, b) => b.story_count - a.story_count);
    }

    container.on('keydown', (event) => {
        const rotateSpeed = 2;
        const drawer = document.getElementById('sideDrawer');
        const isDrawerOpen = drawer && drawer.classList.contains('active');

        switch (event.key) {
            case 'ArrowLeft': {
                event.preventDefault();
                const rotateLeft = projection.rotate();
                projection.rotate([rotateLeft[0] - rotateSpeed, rotateLeft[1]]);
                scheduleRedraw();
                break;
            }

            case 'ArrowRight': {
                event.preventDefault();
                const rotateRight = projection.rotate();
                projection.rotate([rotateRight[0] + rotateSpeed, rotateRight[1]]);
                scheduleRedraw();
                break;
            }

            case 'ArrowUp': {
                event.preventDefault();
                const rotateUp = projection.rotate();
                projection.rotate([rotateUp[0], Math.max(rotateUp[1] - rotateSpeed, -90)]);
                scheduleRedraw();
                break;
            }

            case 'ArrowDown': {
                event.preventDefault();
                const rotateDown = projection.rotate();
                projection.rotate([rotateDown[0], Math.min(rotateDown[1] + rotateSpeed, 90)]);
                scheduleRedraw();
                break;
            }

            case 'Enter':
            case ' ': {
                event.preventDefault();
                if (isDrawerOpen) {
                    const firstLink = drawer.querySelector('.card-title a');
                    if (firstLink) {
                        announce('Opening article in new tab');
                        firstLink.click();
                    }
                } else {
                    updateVisibleCountries();
                    if (visibleCountries.length > 0) {
                        const country = visibleCountries[0];
                        announce(`Opening ${country.name} news with ${country.story_count} stories`);
                        openDrawer(country);
                    } else {
                        announce('No countries visible. Use arrow keys to rotate the globe.');
                    }
                }
                break;
            }

            case 'Escape': {
                event.preventDefault();
                if (isDrawerOpen) {
                    closeDrawer();
                    announce('News drawer closed');
                    container.focus();
                } else {
                    const helpOverlay = document.getElementById('keyboard-help');
                    if (helpOverlay && helpOverlay.classList.contains('active')) {
                        closeKeyboardHelp();
                    }
                }
                break;
            }

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
                return;

            default:
                return;
        }
    });

    function navigateStories(direction) {
        const drawer = document.getElementById('sideDrawer');
        if (!drawer || !drawer.classList.contains('active')) return;

        const cards = Array.from(drawer.querySelectorAll('.drawer-card'));
        if (cards.length === 0) return;

        const currentFocus = document.activeElement;
        let currentIndex = cards.findIndex(card => card.contains(currentFocus) || card === currentFocus);

        let newIndex;
        if (currentIndex === -1) {
            newIndex = direction === 'next' ? 0 : cards.length - 1;
        } else {
            newIndex = direction === 'next'
                ? (currentIndex + 1) % cards.length
                : (currentIndex - 1 + cards.length) % cards.length;
        }

        const titleLink = cards[newIndex].querySelector('.card-title a');
        if (titleLink) {
            titleLink.focus();

            const storyTitle = titleLink.textContent.trim();
            const position = newIndex + 1;
            const total = cards.length;
            announce(`Story ${position} of ${total}: ${storyTitle}`);
        }
    }

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
        }
    }

    function closeKeyboardHelp() {
        const helpOverlay = document.getElementById('keyboard-help');
        if (helpOverlay) {
            helpOverlay.classList.remove('active');
            helpOverlay.setAttribute('aria-hidden', 'true');
            announce('Keyboard shortcuts help closed');
            container.focus();
        }
    }

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
        `;

        document.body.insertAdjacentHTML('beforeend', helpHTML);
        const helpOverlay = document.getElementById('keyboard-help');
        helpOverlay.classList.add('active');
        helpOverlay.setAttribute('aria-hidden', 'false');
        announce('Keyboard shortcuts help opened');
    }

    function getRecencyBadge(recency) {
        const badges = {
            breaking: '<span class="recency-badge breaking">BREAKING</span>',
            recent: '<span class="recency-badge recent">NEW</span>',
            old: ''
        };
        return badges[recency] || '';
    }

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
        } catch {
            return dateString;
        }
    }

    function calculateReadingTime(summary) {
        if (!summary) return '< 1 min read';

        const wordsPerMinute = 200;
        const text = summary.replace(/<[^>]*>?/gm, '');
        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        const minutes = Math.ceil(words / wordsPerMinute);

        return minutes < 1 ? '< 1 min read' : `${minutes} min read`;
    }

    function extractDomain(url) {
        if (!url) return 'unknown';

        try {
            const hostname = new URL(url).hostname;
            return hostname.replace('www.', '');
        } catch {
            return 'unknown';
        }
    }

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
        } catch {
            return dateString;
        }
    }

    // 4. UI Interactions
    function showTooltip(event, data) {
        const pop = data.population ? data.population.toLocaleString() : 'N/A';
        const area = data.area_sq_km ? `${data.area_sq_km.toLocaleString()} km²` : 'N/A';
        const langs = data.languages && data.languages.length ? data.languages.join(', ') : 'N/A';

        const volumeLevel = data.story_count >= 15 ? 'High' : data.story_count >= 8 ? 'Medium' : 'Low';
        const volumeColor = data.story_count >= 15 ? '#ef4444' : data.story_count >= 8 ? '#f59e0b' : '#22c55e';

        tooltip
            .style('opacity', 0)
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

        // Viewport edge detection: clamp tooltip position to stay fully visible
        const node = tooltip.node();
        const rect = node.getBoundingClientRect();
        const margin = 8;
        let left = event.pageX;
        let top = event.pageY - 10;

        // Clamp horizontal: prevent overflow on left or right
        if (left + rect.width / 2 > window.innerWidth - margin) {
            left = window.innerWidth - rect.width / 2 - margin;
        }
        if (left - rect.width / 2 < margin) {
            left = rect.width / 2 + margin;
        }

        // Flip vertical: if tooltip would overflow top, show below cursor instead
        if (top - rect.height < margin) {
            top = event.pageY + rect.height + 10;
        }

        tooltip
            .style('left', `${left}px`)
            .style('top', `${top}px`)
            .style('opacity', 1);
    }

    function hideTooltip() {
        tooltip.style('opacity', 0);
    }

    function flyToCountry(countryData, duration = 1500) {
        const targetLng = countryData.lng;
        const targetLat = countryData.lat;
        const targetRotate = [-targetLng, -targetLat];
        const startRotate = projection.rotate();

        pauseState.flyTo = true;
        velocity = [0, 0];
        syncRotationState();

        if (flyToTimer) {
            flyToTimer.stop();
            flyToTimer = null;
        }

        return new Promise((resolve) => {
            flyToTimer = d3.timer((elapsed) => {
                const t = elapsed / duration;

                if (t >= 1) {
                    projection.rotate(targetRotate);
                    scheduleRedraw();

                    pauseState.flyTo = false;
                    syncRotationState();

                    flyToTimer.stop();
                    flyToTimer = null;
                    resolve();
                    return true;
                }

                const ease = t < 0.5
                    ? 4 * t * t * t
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;

                const currentRotate = [
                    startRotate[0] + (targetRotate[0] - startRotate[0]) * ease,
                    startRotate[1] + (targetRotate[1] - startRotate[1]) * ease
                ];

                projection.rotate(currentRotate);
                scheduleRedraw();
            });
        });
    }

    // Focus trap for modal drawer (ARIA Authoring Practices: Dialog Modal)
    let focusTrapCleanup = null;

    function activateFocusTrap(drawerEl) {
        function handleKeydown(e) {
            if (e.key !== 'Tab') return;

            const focusable = drawerEl.querySelectorAll(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        drawerEl.addEventListener('keydown', handleKeydown);

        // Return cleanup function
        return () => drawerEl.removeEventListener('keydown', handleKeydown);
    }

    function openDrawer(data) {
        const drawer = document.getElementById('sideDrawer');
        const backdrop = document.getElementById('drawerBackdrop');
        const title = document.getElementById('drawerTitle');
        const content = document.getElementById('drawerContent');
        const closeBtn = drawer.querySelector('.drawer-close');

        title.textContent = `${data.name} News`;

        if (!data || !data.stories || !Array.isArray(data.stories) || data.stories.length === 0) {
            console.error('Invalid or missing stories data:', data);
            showToast('No stories available for this country', 'error');
            return;
        }

        content.innerHTML = Array(3).fill(0).map(() => `
            <div class="drawer-card skeleton">
                <div class="skeleton-title"></div>
                <div class="skeleton-meta"></div>
                <div class="skeleton-text"></div>
            </div>
        `).join('');

        flyToCountry(data, 1200).then(() => {
            drawer.classList.add('active');
            backdrop.classList.add('active');
            drawer.setAttribute('aria-hidden', 'false');

            // Activate focus trap after drawer is visible
            if (focusTrapCleanup) focusTrapCleanup();
            focusTrapCleanup = activateFocusTrap(drawer);

            setTimeout(() => {
                closeBtn.focus();
            }, 100);
        });

        requestAnimationFrame(() => {
            setTimeout(() => {
                const recencyPriority = { breaking: 0, recent: 1, old: 2 };
                const sortedStories = [...data.stories].sort((a, b) => {
                    const priorityA = recencyPriority[a.recency || 'old'];
                    const priorityB = recencyPriority[b.recency || 'old'];

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    return new Date(b.published) - new Date(a.published);
                });

                content.innerHTML = sortedStories.map((story, index) => {
                    const recency = story.recency || 'old';
                    const recencyBadge = getRecencyBadge(recency);
                    const animationDelay = index * 0.08;
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
                    `;
                }).join('');

                content.querySelectorAll('.drawer-card').forEach(card => {
                    card.classList.add('card-entrance');
                });

                announce(`Showing ${data.story_count} news stories from ${data.name}`);
            }, 150);
        });
    }

    window.closeDrawer = function () {
        const drawer = document.getElementById('sideDrawer');
        const backdrop = document.getElementById('drawerBackdrop');

        drawer.classList.remove('active');
        backdrop.classList.remove('active');
        drawer.setAttribute('aria-hidden', 'true');

        // Release focus trap
        if (focusTrapCleanup) {
            focusTrapCleanup();
            focusTrapCleanup = null;
        }

        if (flyToTimer) {
            flyToTimer.stop();
            flyToTimer = null;
            pauseState.flyTo = false;
        }

        const globeContainer = document.getElementById('globe-container');
        if (globeContainer) {
            globeContainer.focus();
        }

        syncRotationState();
    };

    const drawerElement = document.getElementById('sideDrawer');
    if (drawerElement) {
        const drawerObserver = new MutationObserver(() => {
            pauseState.drawer = drawerElement.classList.contains('active');
            syncRotationState();
        });

        drawerObserver.observe(drawerElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        pauseState.drawer = drawerElement.classList.contains('active');
        syncRotationState();
    }

    window.closeKeyboardHelp = closeKeyboardHelp;

    const keyboardHelpButton = document.getElementById('keyboard-help-button');
    if (keyboardHelpButton) {
        keyboardHelpButton.addEventListener('click', (e) => {
            e.preventDefault();
            toggleKeyboardHelp();
        });
    }
    // Zoom Support (Optional)
    // Disabled for now to prioritize rotation
    /*
    const zoom = d3.zoom()
        .scaleExtent([200, 1000])
        .on('zoom', (event) => {
            projection.scale(event.transform.k);
            redraw();
        });
    // container.call(zoom);
    */
});