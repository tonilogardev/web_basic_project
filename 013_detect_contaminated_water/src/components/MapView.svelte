<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { DEFAULT_BASEMAP_STYLE } from '../lib/mapStyles';
  import { PolygonDrawManager } from '../lib/PolygonDrawManager';
  import { mapLayerController } from '../lib/controllers/MapLayerController';
  import { store } from '../lib/store.svelte';

  const DEFAULT_CENTER: [number, number] = [1.74, 41.69];
  const DEFAULT_ZOOM = 8;

  let mapContainer: HTMLElement;
  let map: maplibregl.Map | null = null;
  let drawManager = $state<PolygonDrawManager | null>(null);
  let mapLoaded = $state(false);

  // Reactively sync drawing cursor and modes with store
  $effect(() => {
    drawManager?.syncCursor(store.isDrawing);
  });

  // Reactively handle external polygon clearing
  $effect(() => {
    if (drawManager && !store.polygon && !store.isDrawing) {
      drawManager.clear();
    }
  });

  // Reactively synchronize MapLibre GPU raster layers with all active sessions
  $effect(() => {
    if (!mapLoaded) return;

    const sessions = store.sessions;
    for (const session of sessions) {
      void session.activePassId;
      void session.isImageryHidden;
      void session.activeAnalysis;
      for (const pass of session.passes) {
        void pass.opacity;
        void pass.viewMode;
        void pass.isVisible;
        void pass.waterAnalysis;
      }
    }

    if (sessions.length > 0) {
      mapLayerController.syncSessions(sessions);
    } else {
      mapLayerController.removeAllLayers();
    }
  });

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: DEFAULT_BASEMAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    const collapseAttribution = () => {
      const attrib = mapContainer?.querySelector('.maplibregl-ctrl-attrib');
      if (attrib) {
        attrib.classList.remove('maplibregl-compact-show');
        attrib.removeAttribute('open');
      }
    };

    // Keep attribution collapsed into a clean circular badge
    collapseAttribution();
    map.on('load', () => {
      collapseAttribution();
      if (map) {
        drawManager = new PolygonDrawManager(map);
        mapLayerController.attachMap(map);
        mapLoaded = true;
      }
    });
    map.on('idle', collapseAttribution);
    map.on('styledata', collapseAttribution);

    const unsubscribeClear = store.onClear(() => {
      drawManager?.clear();
      mapLayerController.removeAllLayers();
    });

    return () => {
      unsubscribeClear();
      mapLayerController.detachMap();
      drawManager?.destroy();
      drawManager = null;
      map?.remove();
      map = null;
    };
  });
</script>

<div class="map-viewport" bind:this={mapContainer}></div>

<style>
  .map-viewport {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background-color: var(--color-bg-deep);
  }
</style>
