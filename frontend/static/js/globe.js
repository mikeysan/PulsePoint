
// Globe Visualization Module

document.addEventListener('DOMContentLoaded', async () => {
    // Configuration
    const width = window.innerWidth;
    const height = window.innerHeight;
    const sensibility = 75; // Rotate sensibility

    // Responsive scale calculation
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
    let isRotating = true;
    let rotationTimer;

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

            globeData = apiResponse;
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
            .on('mouseenter', () => { isRotating = false; })
            .on('mouseleave', () => { isRotating = true; });

        // Volume Bar (projected line)
        // Note: In 2D orthographic, lines are tricky. We simulate a "standing bar"
        // by drawing a line from the point to a slightly "elevated" point.
        // For simplicity and robustness in 2D SVG, we'll use vertically offset circles 
        // AND a line connecting them to surface to look like a post.

        // 1. Base on surface (invisible hit target)
        markerGroups.append('circle')
            .attr('r', 4)
            .attr('fill', '#3b82f6')
            .attr('fill-opacity', 0.5);

        // 2. The "Stick" (Line rising from surface)
        markerGroups.append('line')
            .attr('class', 'volume-stick')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', 0).attr('y2', d => -Math.min(d.properties.story_count * 2, 60)) // Height based on count
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 1)
            .attr('opacity', 0.7);

        // 3. The "Cap" (Data Point at top of stick)
        markerGroups.append('circle')
            .attr('class', 'volume-cap')
            .attr('cy', d => -Math.min(d.properties.story_count * 2, 60))
            .attr('r', d => Math.min(Math.max(d.properties.story_count / 2, 3), 12)) // Size based on count
            .attr('fill', '#3b82f6')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                showTooltip(event, d.properties);
                d3.select(event.currentTarget).attr('fill', '#60a5fa');
            })
            .on('mouseout', (event) => {
                hideTooltip();
                d3.select(event.currentTarget).attr('fill', '#3b82f6');
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
    let lastTime = d3.now();
    let dragVelocity = [0, 0];

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

    // Timer for continuous animation loop
    d3.timer((elapsed) => {
        if (!isRotating) return true; // Paused by hover

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

            // Resume loop
            isRotating = true;
            lastTime = d3.now();
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

        switch(event.key) {
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
                // Select the country with most stories currently visible
                updateVisibleCountries();
                if (visibleCountries.length > 0) {
                    const country = visibleCountries[0]; // Highest story count
                    announce(`Opening ${country.name} news with ${country.story_count} stories`);
                    openDrawer(country);
                } else {
                    announce('No countries visible. Use arrow keys to rotate the globe.');
                }
                break;

            case 'Escape':
                event.preventDefault();
                // Close drawer if open
                const drawer = document.getElementById('sideDrawer');
                if (drawer && drawer.classList.contains('active')) {
                    closeDrawer();
                    announce('News drawer closed');
                    container.focus(); // Return focus to globe
                }
                break;

            default:
                // Let other keys pass through
                return;
        }
    });

    // Update visible countries when globe rotates
    const originalRedraw = redraw;
    redraw = function() {
        originalRedraw();
        updateVisibleCountries();
    };


    // 4. UI Interactions (Tooltip & Drawer)
    function showTooltip(event, data) {
        const pop = data.population ? data.population.toLocaleString() : 'N/A';
        const area = data.area_sq_km ? data.area_sq_km.toLocaleString() + ' km²' : 'N/A';
        const langs = data.languages && data.languages.length ? data.languages.join(', ') : 'N/A';

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
                <div style="margin-top:4px; border-top:1px solid #444; padding-top:4px;">
                    ${data.story_count} stories
                </div>
            `);
    }

    function hideTooltip() {
        tooltip.style('opacity', 0);
    }

    function openDrawer(data) {
        const drawer = document.getElementById('sideDrawer');
        const backdrop = document.getElementById('drawerBackdrop');
        const title = document.getElementById('drawerTitle');
        const content = document.getElementById('drawerContent');
        const closeBtn = drawer.querySelector('.drawer-close');

        title.textContent = `${data.name} News`;

        // Show skeleton loading state first
        content.innerHTML = Array(3).fill(0).map(() => `
            <div class="drawer-card skeleton">
                <div class="skeleton-title"></div>
                <div class="skeleton-meta"></div>
                <div class="skeleton-text"></div>
            </div>
        `).join('');

        drawer.classList.add('active');
        backdrop.classList.add('active');
        drawer.setAttribute('aria-hidden', 'false');

        // Focus management: Set focus to close button
        setTimeout(() => {
            closeBtn.focus();
        }, 100);

        // Populate stories after a brief delay (for smooth UX)
        requestAnimationFrame(() => {
            setTimeout(() => {
                content.innerHTML = data.stories.map(story => `
                    <div class="drawer-card">
                        <h3><a href="${story.link}" target="_blank">${story.title}</a></h3>
                        <div class="meta">
                            <span>${story.source}</span>
                            <span>${new Date(story.published).toLocaleDateString()}</span>
                        </div>
                        <p>${story.summary.replace(/<[^>]*>?/gm, '').substring(0, 150)}...</p>
                    </div>
                `).join('');

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

        // Return focus to globe
        container.focus();
    };

    // Zoom Support (Optional)
    const zoom = d3.zoom()
        .scaleExtent([200, 1000])
        .on('zoom', (event) => {
            projection.scale(event.transform.k);
            redraw();
        });
    // container.call(zoom); // Disabled for now to prioritize rotation
});
