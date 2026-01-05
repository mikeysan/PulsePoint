
// Globe Visualization Module

document.addEventListener('DOMContentLoaded', async () => {
    // Configuration
    const width = window.innerWidth;
    const height = window.innerHeight;
    const sensibility = 75; // Rotate sensibility

    // State
    let globeData = {};
    let isRotating = true;
    let rotationTimer;

    // Selectors
    const container = d3.select('#globe-container');
    const tooltip = d3.select('#globe-tooltip');

    // 1. Setup D3 Projection & Path
    const projection = d3.geoOrthographic()
        .scale(height / 2.5)
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
        .attr('stroke', '#334155')
        .attr('stroke-width', 1);

    // 2. Load Data (World GeoJSON + API Data)
    try {
        const [worldData, apiResponse] = await Promise.all([
            d3.json('https://unpkg.com/world-atlas@2.0.2/countries-110m.json'),
            d3.json('/api/globe-data')
        ]);

        globeData = apiResponse;

        // Render Land
        const countries = topojson.feature(worldData, worldData.objects.countries);

        gLand.selectAll('path')
            .data(countries.features)
            .enter().append('path')
            .attr('d', path)
            .attr('fill', '#334155')
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 0.5)
            .attr('class', 'country');

        // Render Beacons from backend data
        renderBeacons();

        // Start Rotation
        d3.timer((elapsed) => {
            if (isRotating) {
                const rotate = projection.rotate();
                const k = sensibility / projection.scale();
                projection.rotate([rotate[0] - 0.3 * k, rotate[1]]);
                redraw();
            }
        });

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

        // Beacon Circles
        const markerGroups = gBeacons.selectAll('g.marker-group')
            .data(beacons)
            .enter().append('g')
            .attr('class', 'marker-group');

        // Pulse Ring
        markerGroups.append('circle')
            .attr('class', 'location-pulse')
            .attr('r', 10); // Base radius, animated by CSS

        // Core Dot
        markerGroups.append('circle')
            .attr('class', 'location-marker')
            .attr('r', 6)
            .on('mouseover', (event, d) => {
                isRotating = false;
                showTooltip(event, d.properties);
            })
            .on('mouseout', () => {
                isRotating = true;
                hideTooltip();
            })
            .on('click', (event, d) => {
                openDrawer(d.properties);
            });

        redraw();
    }

    function redraw() {
        // Update paths
        gGlobe.selectAll('path').attr('d', path);

        // Update beacons positions
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
                // Check if point is visible
                const center = projection.invert([width / 2, height / 2]);
                const d_geo = d.geometry.coordinates;
                const distance = d3.geoDistance(d_geo, center);
                return distance > 1.57 ? 'none' : 'block';
            });
    }

    // Drag Interaction
    const drag = d3.drag()
        .on('start', () => { isRotating = false; })
        .on('drag', (event) => {
            const rotate = projection.rotate();
            const k = sensibility / projection.scale();
            projection.rotate([
                rotate[0] + event.dx * k,
                rotate[1] - event.dy * k
            ]);
            redraw();
        })
        .on('end', () => { isRotating = true; });

    container.call(drag);


    // 4. UI Interactions (Tooltip & Drawer)
    function showTooltip(event, data) {
        tooltip
            .style('opacity', 1)
            .style('left', (event.pageX) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
                <strong>${data.name}</strong><br/>
                ${data.story_count} stories
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

        title.textContent = `${data.name} News`;

        // Populate Stories
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

        drawer.classList.add('active');
        backdrop.classList.add('active');
    }

    // Close Drawer Logic
    window.closeDrawer = function () {
        document.getElementById('sideDrawer').classList.remove('active');
        document.getElementById('drawerBackdrop').classList.remove('active');
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
