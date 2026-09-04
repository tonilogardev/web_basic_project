<script lang="ts">
  import { onMount } from 'svelte';
  import { Map as MapLibreMap, addProtocol, removeProtocol } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { Protocol } from 'pmtiles';

  let mapContainer: HTMLElement;
  let map: MapLibreMap;

  // Estado del Inventario
  let inventory: Record<string, string[]> = {};
  let availableDates: string[] = [];
  let availableTiles: string[] = [];

  let selectedDate = "";
  let selectedTile = "";

  // Estado de los controles
  let showColorReal = true;
  let showCloudMask = true;
  let maskOpacity = 100;
  let loading = true;

  onMount(async () => {
    // 1. Cargar el inventario
    try {
      const res = await fetch('/data/inventory.json');
      if (res.ok) {
        inventory = await res.json();
        availableDates = Object.keys(inventory);
        if (availableDates.length > 0) {
          selectedDate = availableDates[0];
          availableTiles = inventory[selectedDate] || [];
          if (availableTiles.length > 0) {
            selectedTile = availableTiles[0];
          }
        }
      }
    } catch (e) {
      console.error("No se pudo cargar el inventario.json", e);
    }
    
    loading = false;

    // 2. Inicializar Mapa
    const protocol = new Protocol();
    addProtocol('pmtiles', protocol.tile);

    map = new MapLibreMap({
      container: mapContainer,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      },
      center: [2.17, 41.38],
      zoom: 9
    });

    map.on('load', () => {
      loadGranuleLayers(selectedDate, selectedTile);
    });

    return () => {
      if (map) map.remove();
      removeProtocol('pmtiles');
    };
  });

  // Reaccionar a cambios en los selectores
  function onDateChange() {
    availableTiles = inventory[selectedDate] || [];
    if (availableTiles.length > 0) {
      selectedTile = availableTiles[0];
    } else {
      selectedTile = "";
    }
    loadGranuleLayers(selectedDate, selectedTile);
  }

  function onTileChange() {
    loadGranuleLayers(selectedDate, selectedTile);
  }

  // Función núcleo para cargar dinámicamente un PMTiles
  function loadGranuleLayers(date: string, tile: string) {
    if (!map || !map.isStyleLoaded() || !date || !tile) return;

    // Rutas dinámicas referenciando a la carpeta montada en NGINX /data/
    const rgbUrl = `pmtiles:///data/${date}_${tile}_ColorReal.pmtiles`;
    const maskUrl = `pmtiles:///data/${date}_${tile}_mask_clouds.pmtiles`;

    // Eliminar capas antiguas
    if (map.getLayer('mask-layer')) map.removeLayer('mask-layer');
    if (map.getSource('mask-source')) map.removeSource('mask-source');
    
    if (map.getLayer('rgb-layer')) map.removeLayer('rgb-layer');
    if (map.getSource('rgb-source')) map.removeSource('rgb-source');

    // Añadir nuevas fuentes y capas
    map.addSource('rgb-source', { type: 'raster', url: rgbUrl });
    map.addLayer({
      id: 'rgb-layer',
      type: 'raster',
      source: 'rgb-source',
      layout: { visibility: showColorReal ? 'visible' : 'none' }
    });

    map.addSource('mask-source', { type: 'raster', url: maskUrl });
    map.addLayer({
      id: 'mask-layer',
      type: 'raster',
      source: 'mask-source',
      layout: { visibility: showCloudMask ? 'visible' : 'none' },
      paint: { 'raster-opacity': maskOpacity / 100 }
    });
  }

  // Reactividad para Opacidad y Visibilidad
  $: if (map && map.isStyleLoaded()) {
    if (map.getLayer('rgb-layer')) {
      map.setLayoutProperty('rgb-layer', 'visibility', showColorReal ? 'visible' : 'none');
    }
    if (map.getLayer('mask-layer')) {
      map.setLayoutProperty('mask-layer', 'visibility', showCloudMask ? 'visible' : 'none');
      map.setPaintProperty('mask-layer', 'raster-opacity', maskOpacity / 100);
    }
  }

</script>

<main class="app-layout">
  <aside class="sidebar">
    <h1>Visor de Nubes</h1>
    <p>Cataluña Sentinel-2</p>

    <!-- SELECTORES DINÁMICOS -->
    <div class="controls selector-box">
      <h3>Seleccionar Imagen</h3>
      {#if loading}
        <p class="loading">Cargando inventario...</p>
      {:else}
        <label>
          <span>Fecha de Adquisición:</span>
          <select bind:value={selectedDate} on:change={onDateChange}>
            {#each availableDates as date}
              <option value={date}>{date}</option>
            {/each}
          </select>
        </label>
        
        <label>
          <span>Cuadrícula (Tile):</span>
          <select bind:value={selectedTile} on:change={onTileChange}>
            {#each availableTiles as tile}
              <option value={tile}>{tile}</option>
            {/each}
          </select>
        </label>
      {/if}
    </div>
    
    <div class="controls">
      <h3>Capas Gráficas</h3>
      <label class="toggle">
        <input type="checkbox" bind:checked={showColorReal} />
        <span>Imagen Color Real (RGB)</span>
      </label>
      
      <label class="toggle">
        <input type="checkbox" bind:checked={showCloudMask} />
        <span>Máscara de Nubes (Predicción)</span>
      </label>

      <div class="slider-container">
        <label>Opacidad Máscara ({maskOpacity}%)</label>
        <input type="range" min="0" max="100" bind:value={maskOpacity} />
      </div>
    </div>
  </aside>
  
  <div class="map-container" bind:this={mapContainer}></div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background-color: #0f172a;
    color: #f8fafc;
  }

  .app-layout {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .sidebar {
    width: 320px;
    background-color: #1e293b;
    border-right: 1px solid #334155;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: 4px 0 15px rgba(0,0,0,0.3);
    z-index: 10;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #38bdf8;
  }

  p {
    margin: 5px 0 0 0;
    color: #94a3b8;
    font-size: 0.9rem;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 15px;
    background: #0f172a;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #334155;
  }

  .selector-box label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .selector-box select {
    background-color: #1e293b;
    color: #f8fafc;
    border: 1px solid #475569;
    padding: 8px;
    border-radius: 4px;
    outline: none;
    cursor: pointer;
  }
  
  .selector-box select:focus {
    border-color: #38bdf8;
  }

  .loading {
    color: #38bdf8;
    font-size: 0.85rem;
    font-style: italic;
  }

  h3 {
    margin: 0 0 5px 0;
    font-size: 1rem;
    color: #e2e8f0;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 0.95rem;
    color: #cbd5e1;
  }

  .toggle input {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: #38bdf8;
  }

  .slider-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }
  
  .slider-container label {
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .slider-container input[type="range"] {
    width: 100%;
    accent-color: #38bdf8;
  }

  .map-container {
    flex: 1;
    height: 100%;
    background-color: #0f172a;
  }
</style>
