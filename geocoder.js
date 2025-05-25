export function addGeocoder(map) {
  const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
  container.style.backgroundColor = 'white';
  container.style.padding = '8px';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  container.style.zIndex = '1000';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search address/postcode';
  input.style.width = '180px';
  input.style.padding = '4px';
  container.appendChild(input);

  const button = document.createElement('button');
  button.innerText = '🔍';
  button.style.marginLeft = '4px';
  button.style.padding = '4px';
  container.appendChild(button);

  L.DomEvent.disableClickPropagation(container);

  const control = L.control({ position: 'topleft' });
  control.onAdd = () => container;
  control.addTo(map);

  let marker;

  button.addEventListener('click', async () => {
    const query = input.value.trim();
    if (!query) return;

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

    try {
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();

      if (data.length === 0) {
        alert('No results found.');
        return;
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      map.setView([lat, lon], 16);

      if (marker) {
        marker.setLatLng([lat, lon]);
      } else {
        marker = L.marker([lat, lon]).addTo(map);
      }

      marker.bindPopup(result.display_name).openPopup();

    } catch (err) {
      console.error('Geocoding error:', err);
      alert('Search failed.');
    }
  });
}