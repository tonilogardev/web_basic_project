<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import maplibregl from 'maplibre-gl';

  const dispatch = createEventDispatcher();

  export let assets: any[] = [];
  export let isSelectingLocation = false;
  export let focusLocation: { lat: number, lng: number } | null = null;
  
  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map;
  let markers: maplibregl.Marker[] = [];
  let mapLoaded = false;

  let searchQuery = '';

  onMount(() => {
    // Inicializar el mapa con CartoDB Positron (ligero y elegante)
    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', // Estilo claro Menos es Mas
      center: [-3.7038, 40.4168], // Centro en Madrid por defecto
      zoom: 5
    });

    map.on('load', () => {
      mapLoaded = true;
    });

    map.on('click', (e) => {
      if (isSelectingLocation) {
        dispatch('locationSelected', { lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });
  });

  // Cursor change based on mode
  $: if (mapLoaded && map) {
    map.getCanvas().style.cursor = isSelectingLocation ? 'crosshair' : '';
  }

  // Reaccionar cuando cambian los assets
  $: if (mapLoaded && assets) {
    renderMarkers();
  }

  // Reaccionar cuando se hace click en una tarjeta de activo
  $: if (mapLoaded && map && focusLocation) {
    map.flyTo({ center: [focusLocation.lng, focusLocation.lat], zoom: 16, essential: true });
  }

  function renderMarkers() {
    // Limpiar marcadores viejos
    markers.forEach(m => m.remove());
    markers = [];

    const bounds = new maplibregl.LngLatBounds();
    let validAssetsCount = 0;

    // Dibujar nuevos marcadores
    assets.forEach(asset => {
      const lng = parseFloat(asset.longitude);
      const lat = parseFloat(asset.latitude);

      // Si las coordenadas no son números válidos, saltar este activo
      if (isNaN(lng) || isNaN(lat)) {
        console.warn('Activo con coordenadas inválidas:', asset);
        return;
      }

      validAssetsCount++;
      bounds.extend([lng, lat]);

      // Formatear el popup
      let popupHtml = `
        <div style="font-family: inherit;">
          <h3 style="margin: 0 0 5px; color: #1a202c;">${asset.name}</h3>
          <p style="margin: 0; color: #4a5568; font-size: 0.85rem; font-weight: 600;">${asset.Category?.name || 'Activo'}</p>
          <p style="margin: 2px 0 0; color: #4a5568;">Valor Base: ${parseFloat(asset.base_value || 0).toLocaleString()}€</p>
        </div>
      `;

      if (asset.AssetHazardExposure && asset.AssetHazardExposure.length > 0) {
        popupHtml += `<div style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;">`;
        popupHtml += `<strong style="font-size: 0.8rem; color: #e53e3e;">Riesgos:</strong><ul style="margin: 4px 0; padding-left: 15px; font-size: 0.8rem;">`;
        asset.AssetHazardExposure.forEach((exp: any) => {
          popupHtml += `<li>${exp.Hazard?.name || 'Riesgo'}: ${parseFloat(exp.exposure_value || 0).toLocaleString()}€</li>`;
        });
        popupHtml += `</ul></div>`;
      }

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ color: '#4a90e2' })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);
      
      markers.push(marker);
    });

    // Ajustar vista para encuadrar todos los marcadores
    if (validAssetsCount > 1 && map && !isSelectingLocation) {
      map.fitBounds(bounds, { padding: 50 });
    } else if (validAssetsCount === 1 && map && !isSelectingLocation) {
      // Si solo hay uno, centramos en él en lugar de fitBounds
      map.flyTo({ center: [parseFloat(assets[0].longitude), parseFloat(assets[0].latitude)], zoom: 8 });
    }
  }

  async function searchPlace() {
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (map) {
          map.flyTo({ center: [lon, lat], zoom: 14 });
        }
      }
    } catch (e) {
      console.error('Error buscando lugar:', e);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') searchPlace();
  }

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });
</script>

<div class="map-wrapper">
  <div class="search-overlay">
    <input 
      type="text" 
      bind:value={searchQuery} 
      placeholder="Ej: Madrid, Valencia..." 
      on:keydown={handleKeydown} 
    />
    <button on:click={searchPlace}>Buscar</button>
  </div>
  <div bind:this={mapContainer} class="map-container"></div>
</div>

<style>
  .map-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  .map-container {
    width: 100%;
    height: 100%;
  }
  .search-overlay {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 10;
    display: flex;
    gap: 0.5rem;
    background: white;
    padding: 0.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .search-overlay input {
    border: 1px solid #cbd5e0;
    border-radius: 4px;
    padding: 0.5rem;
    outline: none;
    width: 200px;
  }
  .search-overlay button {
    background: var(--accent, #2b6cb0);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-weight: bold;
  }
</style>
