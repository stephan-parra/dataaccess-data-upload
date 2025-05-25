function polygonToWKT(polygon) {
  const coords = polygon.getLatLngs()[0];
  let wkt = "POLYGON((";
  coords.forEach((coord, i) => {
    wkt += `${coord.lng} ${coord.lat}${i < coords.length - 1 ? ', ' : ''}`;
  });
  if (coords.length > 0) {
    wkt += `, ${coords[0].lng} ${coords[0].lat}`;
  }
  return wkt + "))";
}

document.addEventListener('DOMContentLoaded', function () {
  const aucklandCoords = [-36.8485, 174.7633];
  const map = L.map('map').setView(aucklandCoords, 18);

  function clonePolygon(polygon) {
    const coords = polygon.getLatLngs();
    return L.polygon(coords, polygon.options);
  }

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  const drawControl = new L.Control.Draw({
    edit: {
      featureGroup: drawnItems,
      poly: { allowIntersection: false }
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

  // Map overlay logic
    document.getElementById('expand-map-btn').addEventListener('click', () => {
    document.getElementById('map-overlay').style.display = 'block';

    setTimeout(() => {
        const expandedMap = L.map('map-expanded').setView(map.getCenter(), map.getZoom());

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
        }).addTo(expandedMap);

        const expandedItems = new L.FeatureGroup();
        expandedMap.addLayer(expandedItems);

        const drawControl = new L.Control.Draw({
        edit: { featureGroup: expandedItems },
        draw: {
            polygon: { allowIntersection: false, showArea: true },
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false
        }
        });
        expandedMap.addControl(drawControl);

        // If there's a polygon on the small map, copy it to the expanded map
        if (drawnItems.getLayers().length > 0) {
        const original = drawnItems.getLayers()[0];
        const clone = clonePolygon(original);
        expandedItems.addLayer(clone);
        }

        expandedMap.on('draw:created', function (e) {
        expandedItems.clearLayers();
        expandedItems.addLayer(e.layer);

        if (e.layer instanceof L.Polygon) {
            const wkt = polygonToWKT(e.layer);
            document.getElementById('wkt_output').value = wkt;
            document.getElementById('wkt-validation-error').style.display = 'none';
            document.getElementById('wkt_output').classList.remove('error');
        }
        });

        document.getElementById('close-map-btn').addEventListener('click', () => {
        // Sync back to main map
        drawnItems.clearLayers();
        if (expandedItems.getLayers().length > 0) {
            const expandedPolygon = expandedItems.getLayers()[0];
            const clone = clonePolygon(expandedPolygon);
            drawnItems.addLayer(clone);
        }

        expandedMap.remove();
        document.getElementById('map-overlay').style.display = 'none';
        document.getElementById('map-expanded').innerHTML = '';
        });
    }, 100);
    });


  // WKT error display
  const wktTextarea = document.getElementById('wkt_output');
  const validationMsg = document.createElement('div');
  validationMsg.className = 'validation-error';
  validationMsg.id = 'wkt-validation-error';
  validationMsg.textContent = 'Please draw a polygon on the map to define the area of interest';
  wktTextarea.parentNode.appendChild(validationMsg);

  // Main map draw events
  map.on('draw:created', function (e) {
    const layer = e.layer;
    drawnItems.clearLayers();
    drawnItems.addLayer(layer);

    if (layer instanceof L.Polygon) {
      const wkt = polygonToWKT(layer);
      document.getElementById('wkt_output').value = wkt;
      document.getElementById('wkt-validation-error').style.display = 'none';
      document.getElementById('wkt_output').classList.remove('error');
    }
  });

  map.on('draw:edited', function (e) {
    e.layers.eachLayer(function (layer) {
      if (layer instanceof L.Polygon) {
        const wkt = polygonToWKT(layer);
        document.getElementById('wkt_output').value = wkt;
      }
    });
  });

  map.on('draw:deleted', function () {
    if (drawnItems.getLayers().length === 0) {
      document.getElementById('wkt_output').value = '';
      document.getElementById('wkt-validation-error').style.display = 'block';
      document.getElementById('wkt_output').classList.add('error');
    }
  });

  document.getElementById('dataForm').addEventListener('submit', function (e) {
    if (drawnItems.getLayers().length === 0) {
      e.preventDefault();
      document.getElementById('wkt-validation-error').style.display = 'block';
      document.getElementById('wkt_output').classList.add('error');

      document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
      map.getContainer().classList.add('required-polygon', 'error');
      setTimeout(() => {
        map.getContainer().classList.remove('error');
      }, 2000);
    }
  });
});