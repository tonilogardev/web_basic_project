<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  
  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map;

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors'
          }
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [1.5, 41.8], // Cataluña
      zoom: 7,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const loadingEl = document.getElementById('init-loader');
    if (loadingEl) loadingEl.style.display = 'none';

    return () => {
      map.remove();
    };
  });
</script>

<div class="glass-overlay">
  <h1>Cassini Sentinel Engine</h1>
  <p>Cataluña Sector</p>
</div>
<div class="map-wrapper" bind:this={mapContainer}></div>
<div id="init-loader" class="loader">Initializing WebGL...</div>

<style>
  .map-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1;
  }
  .glass-overlay {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 10;
    background: rgba(10, 10, 11, 0.6);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1.5rem;
    border-radius: 12px;
    color: var(--text-light);
    pointer-events: none;
  }
  .glass-overlay h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: var(--accent);
    font-weight: 600;
  }
  .glass-overlay p {
    margin: 0;
    font-size: 0.875rem;
    opacity: 0.8;
  }
  .loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--accent);
    z-index: 2;
    font-weight: 500;
  }
</style>
