<script lang="ts">
  import { onMount } from 'svelte';
  import { Map as MapLibreMap, addProtocol, removeProtocol } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { Protocol } from 'pmtiles';

  let mapContainer: HTMLElement;
  let map: MapLibreMap;

  onMount(() => {
    // Inicializamos el protocolo PMTiles para interceptar peticiones "pmtiles://"
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
      center: [1.5218, 41.8381], // Centro de Cataluña
      zoom: 7
    });

    return () => {
      map.remove();
      removeProtocol('pmtiles');
    };
  });
</script>

<main class="app-layout">
  <aside class="sidebar">
    <h1>Visor de Nubes</h1>
    <p>Cataluña Sentinel-2</p>
    
    <div class="controls">
      <h3>Capas</h3>
      <label class="toggle">
        <input type="checkbox" checked />
        <span>Imagen Color Real (RGB)</span>
      </label>
      
      <label class="toggle">
        <input type="checkbox" checked />
        <span>Máscara de Nubes (Predicción)</span>
      </label>

      <div class="slider-container">
        <label>Opacidad Máscara</label>
        <input type="range" min="0" max="100" value="70" />
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
    margin: 5px 0 25px 0;
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
