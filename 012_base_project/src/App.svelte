<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import ControlPanel from './components/ControlPanel.svelte';
  import PassList from './components/PassList.svelte';
  import { DrawManager } from './lib/DrawManager';
  import { store } from './lib/store.svelte';
  import { SearchController } from './lib/controllers/SearchController';
  import { mapLayerController } from './lib/controllers/MapLayerController';

  let mapContainer: HTMLElement;
  let map: MapLibreMap | null = null;
  let drawManager: DrawManager | null = null;
  let mapLoaded = $state(false);
  let coords = $state({ lng: 1.74, lat: 41.69, zoom: 7.5 });

  onMount(() => {
    map = new MapLibreMap({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [coords.lng, coords.lat],
      zoom: coords.zoom,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      mapLoaded = true;
      if (map) {
        drawManager = new DrawManager(map);
        mapLayerController.attachMap(map);
      }
    });

    map.on('move', () => {
      if (!map) return;
      const center = map.getCenter();
      coords = {
        lng: Number(center.lng.toFixed(4)),
        lat: Number(center.lat.toFixed(4)),
        zoom: Number(map.getZoom().toFixed(2)),
      };
    });

    // Cancel drawing with Escape key
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && store.isDrawing) {
        store.isDrawing = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      mapLayerController.detachMap();
      drawManager?.destroy();
      map?.remove();
      map = null;
    };
  });

  // React to drawing mode changes
  $effect(() => {
    if (drawManager) {
      drawManager.setDrawingMode(store.isDrawing);
    }
  });

  // React to bbox clear
  $effect(() => {
    if (!store.boundingBox && drawManager) {
      drawManager.clear();
      mapLayerController.removeAllPassLayers();
    }
  });

  // Synchronize MapLibre GPU raster layers with the active pass and its snapshot bounds
  $effect(() => {
    if (!mapLoaded) return;
    const activePass = store.passes.find((p) => p.id === store.activePassId) || null;
    const effectiveBbox = store.searchSnapshot?.boundingBox ?? store.boundingBox;
    // Explicitly read reactive properties to guarantee Svelte 5 dependency tracking
    if (activePass) {
      void activePass.preset;
      void activePass.opacity;
      void activePass.isVisible;
    }
    mapLayerController.syncActivePass(activePass, effectiveBbox);
  });

  function handleSearchTrigger() {
    SearchController.executeSearch();
  }
</script>

<main class="viewer-layout">
  <div bind:this={mapContainer} class="map-container"></div>

  <!-- Status Overlay / Coordinate Badge -->
  <header class="top-bar">
    <div class="brand">
      <span class="status-dot" class:active={mapLoaded}></span>
      <h1>Sentinel Base Project</h1>
    </div>
    <div class="coords-badge">
      <span>Lat: {coords.lat}</span>
      <span>Lon: {coords.lng}</span>
      <span>Zoom: {coords.zoom}</span>
    </div>

    {#if store.isDrawing}
      <div class="drawing-hint">
        <span class="pulse-indicator"></span>
        Click and drag on the map to select an area (or press Esc to cancel)
      </div>
    {:else if store.isAreaTooLarge}
      <div class="area-warning-tag">
        ⚠️ Area too large: {store.areaKm2?.toLocaleString()} km² (Maximum allowed: {store.maxAreaLimit.toLocaleString()} km²)
      </div>
    {/if}
  </header>

  <!-- Selection / Search Floating Window -->
  <ControlPanel onSearch={handleSearchTrigger} />

  <!-- Grouped Pass List Floating Window -->
  <PassList />
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #0f172a;
    color: #f8fafc;
  }

  .viewer-layout {
    position: relative;
    width: 100vw;
    height: 100vh;
  }

  .map-container {
    width: 100%;
    height: 100%;
  }

  .top-bar {
    position: absolute;
    top: 1rem;
    left: 1rem;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 0.6rem 1rem;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    z-index: 10;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .brand h1 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #f1f5f9;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #f59e0b;
    transition: background-color 0.3s ease;
  }

  .status-dot.active {
    background-color: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
  }

  .coords-badge {
    display: flex;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: #94a3b8;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    border-left: 1px solid rgba(255, 255, 255, 0.12);
    padding-left: 0.85rem;
  }

  .drawing-hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
    font-weight: 500;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 0.25rem 0.65rem;
    border-radius: 6px;
    margin-left: 0.5rem;
  }

  .pulse-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #38bdf8;
    box-shadow: 0 0 6px #38bdf8;
    animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;
  }

  @keyframes ping {
    75%, 100% {
      transform: scale(2);
      opacity: 0;
    }
  }

  .area-warning-tag {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: #f87171;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.35);
    padding: 0.25rem 0.65rem;
    border-radius: 6px;
    margin-left: 0.5rem;
  }
</style>
