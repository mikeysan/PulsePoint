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

    // ISO 3166-1 numeric code → country name (for countries-110m.json TopoJSON)
    // Keys are zero-padded strings matching the TopoJSON feature IDs
    const COUNTRY_NAMES = {
        "004":"Afghanistan","008":"Albania","010":"Antarctica","012":"Algeria",
        "024":"Angola","031":"Azerbaijan","032":"Argentina","036":"Australia",
        "040":"Austria","044":"Bahamas","050":"Bangladesh","051":"Armenia",
        "056":"Belgium","064":"Bhutan","068":"Bolivia","070":"Bosnia and Herzegovina",
        "072":"Botswana","076":"Brazil","084":"Belize","090":"Solomon Islands",
        "096":"Brunei","100":"Bulgaria","104":"Myanmar","108":"Burundi",
        "112":"Belarus","116":"Cambodia","120":"Cameroon","124":"Canada",
        "140":"Central African Republic","144":"Sri Lanka","148":"Chad",
        "152":"Chile","156":"China","158":"Taiwan","170":"Colombia",
        "178":"Congo","180":"Dem. Rep. Congo","188":"Costa Rica","191":"Croatia",
        "192":"Cuba","196":"Cyprus","203":"Czech Republic","204":"Benin",
        "208":"Denmark","214":"Dominican Republic","218":"Ecuador","222":"El Salvador",
        "226":"Eq. Guinea","231":"Ethiopia","232":"Eritrea","233":"Estonia",
        "238":"Falkland Islands","242":"Fiji","246":"Finland","250":"France",
        "260":"Fr. S. Antarctic Lands","262":"Djibouti","266":"Gabon","268":"Georgia",
        "270":"Gambia","275":"Palestine","276":"Germany","288":"Ghana",
        "300":"Greece","304":"Greenland","320":"Guatemala","324":"Guinea",
        "328":"Guyana","332":"Haiti","340":"Honduras","348":"Hungary",
        "352":"Iceland","356":"India","360":"Indonesia","364":"Iran",
        "368":"Iraq","372":"Ireland","376":"Israel","380":"Italy","384":"Ivory Coast",
        "388":"Jamaica","392":"Japan","398":"Kazakhstan","400":"Jordan",
        "404":"Kenya","408":"North Korea","410":"South Korea","414":"Kuwait",
        "417":"Kyrgyzstan","418":"Laos","422":"Lebanon","426":"Lesotho",
        "428":"Latvia","430":"Liberia","434":"Libya","440":"Lithuania",
        "442":"Luxembourg","450":"Madagascar","454":"Malawi","458":"Malaysia",
        "466":"Mali","478":"Mauritania","484":"Mexico","496":"Mongolia",
        "498":"Moldova","499":"Montenegro","504":"Morocco","508":"Mozambique",
        "512":"Oman","516":"Namibia","524":"Nepal","528":"Netherlands",
        "540":"New Caledonia","548":"Vanuatu","554":"New Zealand","558":"Nicaragua",
        "562":"Niger","566":"Nigeria","578":"Norway","586":"Pakistan","591":"Panama",
        "598":"Papua New Guinea","600":"Paraguay","604":"Peru","608":"Philippines",
        "616":"Poland","620":"Portugal","624":"Timor-Leste","626":"Timor-Leste",
        "630":"Puerto Rico","634":"Qatar","642":"Romania","643":"Russia",
        "646":"Rwanda","682":"Saudi Arabia","686":"Senegal","688":"Serbia",
        "694":"Sierra Leone","703":"Slovakia","704":"Vietnam","705":"Slovenia",
        "706":"Somalia","710":"South Africa","716":"Zimbabwe","724":"Spain",
        "728":"South Sudan","729":"Sudan","732":"W. Sahara","740":"Suriname",
        "748":"Eswatini","752":"Sweden","756":"Switzerland","760":"Syria",
        "762":"Tajikistan","764":"Thailand","768":"Togo","780":"Trinidad and Tobago",
        "784":"United Arab Emirates","788":"Tunisia","792":"Turkey",
        "795":"Turkmenistan","800":"Uganda","804":"Ukraine","807":"Macedonia",
        "818":"Egypt","826":"United Kingdom","834":"Tanzania","840":"United States",
        "854":"Burkina Faso","858":"Uruguay","860":"Uzbekistan","862":"Venezuela",
        "887":"Yemen","894":"Zambia"
    };

    // State
    let globeData = {};
    let globeMetadata = {};
    let flyToTimer = null;

    // Respect OS-level motion preference (WCAG 2.3.3)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let isRotating = !prefersReducedMotion;
    let lastTime = 0;
    const IDLE_VELOCITY = [0.06, 0];
    let velocity = prefersReducedMotion ? [0, 0] : [...IDLE_VELOCITY];
    let dragVelocity = [0, 0];
    let skipFrame = false;
    const FRICTION = 0.98;
    const VELOCITY_THRESHOLD = 0.001;

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
    const gLand = gGlobe.append('g')
        .attr('class', 'land-group')
        .attr('filter', 'url(#landTexture)');
    const gBeacons = gGlobe.append('g').attr('class', 'beacon-group');

    // Water
    gGlobe.insert('path', '.land-group')
        .datum({ type: 'Sphere' })
        .attr('class', 'water')
        .attr('d', path)
        .attr('fill', '#0f172a')
        .attr('stroke', 'rgba(59, 130, 246, 0.3)')
        .attr('stroke-width', 1);

    // Dynamic terminator group (rendered after water, before land)
    const gTerminator = gGlobe.append('g').attr('class', 'terminator-group');

    // Atmosphere ring
    const gAtmosphere = gGlobe.append('circle')
        .attr('class', 'atmosphere-ring')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('r', projection.scale())
        .attr('fill', 'url(#atmosphereGradient)')
        .attr('filter', 'url(#atmosphereBlur)')
        .style('pointer-events', 'none');

    // Light source direction in 3D (sun at 0° lon, -60° lat)
    const lightSource = [0.5, 0, -0.866];

    // Precompute static geographic coordinates of the light source
    const lightLng = Math.atan2(lightSource[1], lightSource[0]) * 180 / Math.PI;
    const lightLat = Math.asin(lightSource[2]) * 180 / Math.PI;
    const antipodeLng = lightLng + 180;
    const antipodeLat = -lightLat;

    // Pre-create the terminator generator (radius=90 gives a great circle)
    const terminatorGen = d3.geoCircle().radius(90);

    function updateTerminator() {
        const [lambda, phi] = projection.rotate();

        // Rotate antipode by current globe rotation to keep terminator fixed to light
        const rotatedAntipodeLng = antipodeLng - lambda;
        const rotatedAntipodeLat = antipodeLat - phi;

        const terminatorCircle = terminatorGen.center([rotatedAntipodeLng, rotatedAntipodeLat]);

        gTerminator.selectAll('.night-side')
            .data([terminatorCircle()])
            .join('path')
            .attr('class', 'night-side')
            .attr('d', path)
            .attr('fill', 'url(#nightGradient)')
            .style('pointer-events', 'none');
    }

    // SVG filter definitions
    const defs = svg.append('defs');

    // Atmosphere blur filter
    const atmosphereBlur = defs.append('filter')
        .attr('id', 'atmosphereBlur')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
    atmosphereBlur.append('feGaussianBlur')
        .attr('stdDeviation', '3');

    // Land texture filter
    const landTexture = defs.append('filter')
        .attr('id', 'landTexture')
        .attr('x', '0%')
        .attr('y', '0%')
        .attr('width', '100%')
        .attr('height', '100%');
    landTexture.append('feTurbulence')
        .attr('type', 'fractalNoise')
        .attr('baseFrequency', '0.04')
        .attr('numOctaves', '3')
        .attr('result', 'noise');
    landTexture.append('feColorMatrix')
        .attr('type', 'matrix')
        .attr('values', '0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0.08 0')
        .attr('in', 'noise')
        .attr('result', 'coloredNoise');
    landTexture.append('feComposite')
        .attr('operator', 'in')
        .attr('in', 'coloredNoise')
        .attr('in2', 'SourceGraphic')
        .attr('result', 'texture');
    landTexture.append('feBlend')
        .attr('mode', 'multiply')
        .attr('in', 'texture')
        .attr('in2', 'SourceGraphic');

    // Night side gradient: transparent at terminator edge, dark at center
    const nightGradient = defs.append('radialGradient')
        .attr('id', 'nightGradient')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
    nightGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#000')
        .attr('stop-opacity', '0.35');
    nightGradient.append('stop')
        .attr('offset', '85%')
        .attr('stop-color', '#000')
        .attr('stop-opacity', '0.05');
    nightGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#000')
        .attr('stop-opacity', '0');

    // Atmosphere ring gradient
    const atmosphereGradient = defs.append('radialGradient')
        .attr('id', 'atmosphereGradient')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
    atmosphereGradient.append('stop')
        .attr('offset', '85%')
        .attr('stop-color', '#3b82f6')
        .attr('stop-opacity', '0');
    atmosphereGradient.append('stop')
        .attr('offset', '98%')
        .attr('stop-color', '#3b82f6')
        .attr('stop-opacity', '0.15');
    atmosphereGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#3b82f6')
        .attr('stop-opacity', '0');

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

            currentScale = newScale;
            minScale = newScale;
            maxScale = newScale * 3;

            d3.select('.atmosphere-ring')
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
            .on('mouseover', function (event, d) {
                d3.select(this).attr('fill', '#475569');
                const name = COUNTRY_NAMES[d.id];
                if (name) showCountryLabel(event, name);
            })
            .on('mouseout', function () {
                d3.select(this).attr('fill', '#334155');
                hideTooltip();
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

        updateTerminator();
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

        // Apply friction to post-drag velocity
        const isDragging = pauseState.drag;
        if (!isDragging) {
            const hasDragMomentum = Math.abs(velocity[0] - IDLE_VELOCITY[0]) > VELOCITY_THRESHOLD
                || Math.abs(velocity[1] - IDLE_VELOCITY[1]) > VELOCITY_THRESHOLD;

            if (hasDragMomentum) {
                velocity[0] = IDLE_VELOCITY[0] + (velocity[0] - IDLE_VELOCITY[0]) * FRICTION;
                velocity[1] = IDLE_VELOCITY[1] + (velocity[1] - IDLE_VELOCITY[1]) * FRICTION;

                // Clamp to idle when below threshold
                if (Math.abs(velocity[0] - IDLE_VELOCITY[0]) < VELOCITY_THRESHOLD
                    && Math.abs(velocity[1] - IDLE_VELOCITY[1]) < VELOCITY_THRESHOLD) {
                    velocity = [...IDLE_VELOCITY];
                }
            } else {
                velocity = [...IDLE_VELOCITY];
            }
        }

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

    // Zoom on scroll (disabled while drawer is open)
    let currentScale = calculateScale();
    let minScale = calculateScale();
    let maxScale = calculateScale() * 3;

    container.on('wheel.zoom', (event) => {
        const drawer = document.getElementById('sideDrawer');
        if (drawer && drawer.classList.contains('active')) return;

        event.preventDefault();

        const delta = -event.deltaY;
        const zoomSensitivity = 0.05;
        currentScale = Math.max(minScale, Math.min(maxScale,
            currentScale + delta * currentScale * zoomSensitivity));

        projection.scale(currentScale);

        d3.select('.atmosphere-ring').attr('r', currentScale);

        scheduleRedraw();
    });

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
                <div class="keyboard-help-content">
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

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
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

    function showCountryLabel(event, name) {
        if (!name) return;
        tooltip
            .style('opacity', 0)
            .html(`<strong>${name}</strong>`);

        const node = tooltip.node();
        const rect = node.getBoundingClientRect();
        const margin = 8;
        let left = event.pageX;
        let top = event.pageY - 10;

        if (left + rect.width / 2 > window.innerWidth - margin) {
            left = window.innerWidth - rect.width / 2 - margin;
        }
        if (left - rect.width / 2 < margin) {
            left = rect.width / 2 + margin;
        }
        if (top - rect.height < margin) {
            top = event.pageY + rect.height + 10;
        }

        tooltip
            .style('left', `${left}px`)
            .style('top', `${top}px`)
            .style('opacity', 1);
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

            // Render content after flyTo completes so skeletons are visible
            // for the full duration of the globe rotation animation
            const recencyPriority = { breaking: 0, recent: 1, old: 2 };
            function buildBookmarkButton(story) {
                var isBookmarked = window.PulsePointBookmarks && window.PulsePointBookmarks.isSaved(story.link);
                return '<button class="bookmark-btn drawer-bookmark' + (isBookmarked ? ' saved' : '') + '" data-link="' + escapeHtml(story.link) + '" data-title="' + escapeHtml(story.title) + '" data-source="' + escapeHtml(story.source) + '" data-summary="' + escapeHtml(story.summary || '') + '" aria-label="' + (isBookmarked ? 'Remove from saved' : 'Save article') + '" title="Save for later"><svg xmlns="http://www.w3.org/2000/svg" fill="' + (isBookmarked ? 'currentColor' : 'none') + '" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg></button>';
            }

            const sortedStories = [...data.stories].sort((a, b) => {
                const priorityA = recencyPriority[a.recency || 'old'];
                const priorityB = recencyPriority[b.recency || 'old'];

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                return new Date(b.published) - new Date(a.published);
            });

            // Country metadata summary — provides keyboard users with
            // the same demographic context that mouse users see in the tooltip
            const pop = data.population ? data.population.toLocaleString() : null;
            const area = data.area_sq_km ? `${data.area_sq_km.toLocaleString()} km²` : null;
            const langs = data.languages && data.languages.length ? data.languages.join(', ') : null;
            const volumeLevel = data.story_count >= 15 ? 'High' : data.story_count >= 8 ? 'Medium' : 'Low';
            const volumeColor = data.story_count >= 15 ? '#ef4444' : data.story_count >= 8 ? '#f59e0b' : '#22c55e';

            const metaItems = [
                pop ? `<span>Pop: ${pop}</span>` : '',
                area ? `<span>Area: ${area}</span>` : '',
                langs ? `<span>Languages: ${langs}</span>` : ''
            ].filter(Boolean).join('<span class="country-meta-sep" aria-hidden="true"> · </span>');

            const countrySummaryHTML = `
                <div class="drawer-country-summary" role="region" aria-label="Country information">
                    <div class="country-meta-row">${metaItems}</div>
                    <div class="country-volume-row">
                        <span>${data.story_count} stories</span>
                        <span class="volume-badge" style="background:${volumeColor};">${volumeLevel}</span>
                    </div>
                </div>
            `;

            content.innerHTML = countrySummaryHTML + sortedStories.map((story, index) => {
                const recency = story.recency || 'old';
                const recencyBadge = getRecencyBadge(recency);
                const animationDelay = index * 0.08;
                const domain = escapeHtml(extractDomain(story.link));
                const readingTime = calculateReadingTime(story.summary);
                const absoluteDate = escapeHtml(formatAbsoluteDate(story.published));
                const cleanSummary = escapeHtml(story.summary.replace(/<[^>]*>?/gm, '').trim());

                return `
                    <article class="drawer-card" data-recency="${recency}" style="animation-delay: ${animationDelay}s">
                        <div class="card-header">
                            <h3 class="card-title">
                                <a href="${escapeHtml(story.link)}"
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   aria-label="Read full article on ${escapeHtml(story.source)} (opens in new tab)">
                                    ${escapeHtml(story.title)}
                                    <span class="external-icon" aria-hidden="true">↗</span>
                                </a>
                            </h3>
                            ${buildBookmarkButton(story)}
                            ${recencyBadge}
                        </div>
                        <div class="meta">
                            <span class="meta-source" title="Source: ${domain}">
                                <span class="source-icon" aria-hidden="true">📰</span>
                                ${escapeHtml(story.source)}
                            </span>
                            <span class="meta-domain">${domain}</span>
                            <span class="meta-time" title="${absoluteDate}">
                                <time datetime="${escapeHtml(story.published)}">${formatRelativeTime(story.published)}</time>
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

            content.querySelectorAll('.drawer-bookmark').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    var article = {
                        title: btn.getAttribute('data-title'),
                        link: btn.getAttribute('data-link'),
                        source: btn.getAttribute('data-source'),
                        summary: btn.getAttribute('data-summary')
                    };
                    var saved = window.PulsePointBookmarks.toggle(article);
                    if (saved) {
                        btn.classList.add('saved');
                        btn.setAttribute('aria-label', 'Remove from saved');
                        btn.querySelector('svg').setAttribute('fill', 'currentColor');
                    } else {
                        btn.classList.remove('saved');
                        btn.setAttribute('aria-label', 'Save article');
                        btn.querySelector('svg').setAttribute('fill', 'none');
                    }
                });
            });

            const volLabel = data.story_count >= 15 ? 'High' : data.story_count >= 8 ? 'Medium' : 'Low';
            announce(`Showing ${data.story_count} news stories from ${data.name}. Volume: ${volLabel}.`);

            setTimeout(() => {
                closeBtn.focus();
            }, 100);
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