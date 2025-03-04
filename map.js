// Initialize the map after the page has loaded
document.addEventListener('DOMContentLoaded', function () {
    // Auckland, New Zealand coordinates
    const aucklandCoords = [-36.8485, 174.7633];

    // Create the map centered on Auckland with zoom level 12
    const map = L.map('map').setView(aucklandCoords, 12);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Initialize the FeatureGroup to store editable layers
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Initialize the draw control and pass it the FeatureGroup of editable layers
    const drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems,
            poly: {
                allowIntersection: false
            }
        },
        draw: {
            polygon: {
                allowIntersection: false,
                showArea: true
            },
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false
        }
    });
    map.addControl(drawControl);

    // Add validation message below the WKT textarea
    const wktTextarea = document.getElementById('wkt_output');
    const validationMsg = document.createElement('div');
    validationMsg.className = 'validation-error';
    validationMsg.id = 'wkt-validation-error';
    validationMsg.textContent = 'Please draw a polygon on the map to define the area of interest';
    wktTextarea.parentNode.appendChild(validationMsg);

    // Function to convert Leaflet polygon to WKT format
    function polygonToWKT(polygon) {
        const coords = polygon.getLatLngs()[0];
        let wkt = "POLYGON((";

        // Add each coordinate to the WKT string
        coords.forEach((coord, index) => {
            wkt += `${coord.lng} ${coord.lat}`;
            if (index < coords.length - 1) {
                wkt += ", ";
            }
        });

        // Close the polygon by adding the first point again
        if (coords.length > 0) {
            wkt += `, ${coords[0].lng} ${coords[0].lat}`;
        }

        wkt += "))";
        return wkt;
    }

    // Event handler for when a new shape is created
    map.on('draw:created', function (e) {
        const layer = e.layer;

        // Clear existing layers before adding the new one (only allow one polygon)
        drawnItems.clearLayers();

        // Add the layer to the feature group
        drawnItems.addLayer(layer);

        // Convert the polygon to WKT and display it
        if (layer instanceof L.Polygon) {
            const wkt = polygonToWKT(layer);
            document.getElementById('wkt_output').value = wkt;

            // Hide validation error if it was shown
            document.getElementById('wkt-validation-error').style.display = 'none';
            document.getElementById('wkt_output').classList.remove('error');
        }
    });

    // Event handler for when a shape is edited
    map.on('draw:edited', function (e) {
        const layers = e.layers;

        // Update the WKT for the edited polygon
        layers.eachLayer(function (layer) {
            if (layer instanceof L.Polygon) {
                const wkt = polygonToWKT(layer);
                document.getElementById('wkt_output').value = wkt;
            }
        });
    });

    // Event handler for when a shape is deleted
    map.on('draw:deleted', function (e) {
        // Clear the WKT text area if all shapes are deleted
        if (drawnItems.getLayers().length === 0) {
            document.getElementById('wkt_output').value = '';
            // Show validation error since polygon is required
            document.getElementById('wkt-validation-error').style.display = 'block';
            document.getElementById('wkt_output').classList.add('error');
        }
    });

    // Form submission validation
    document.getElementById('dataForm').addEventListener('submit', function (e) {
        // Check if a polygon has been drawn
        if (drawnItems.getLayers().length === 0) {
            e.preventDefault(); // Prevent form submission

            // Show validation error
            document.getElementById('wkt-validation-error').style.display = 'block';
            document.getElementById('wkt_output').classList.add('error');

            // Scroll to the map section
            document.getElementById('map').scrollIntoView({ behavior: 'smooth' });

            // Highlight the map to indicate it needs attention
            map.getContainer().classList.add('required-polygon', 'error');
            setTimeout(() => {
                map.getContainer().classList.remove('error');
            }, 2000);
        }
    });
});