<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { store } from '../lib/store.svelte';
  import { getStyleSpec } from '../lib/mapStyles';

  let mapContainer: HTMLElement;
  let map: maplibregl.Map | null = null;
  let isMapLoaded = $state(false);

  // Synchronize basemap style changes reactively via Svelte 5 rune
  $effect(() => {
    const selectedStyle = store.currentBasemap;
    if (map && isMapLoaded) {
      map.setStyle(getStyleSpec(selectedStyle));
    }
  });

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: getStyleSpec(store.currentBasemap),
      center: [store.coords.lng, store.coords.lat],
      zoom: store.coords.zoom,
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

    // Keep attribution collapsed into a clean circular icon by default
    collapseAttribution();
    map.on('load', () => {
      isMapLoaded = true;
      collapseAttribution();
    });
    map.on('idle', collapseAttribution);
    map.on('styledata', collapseAttribution);

    // Sync map coordinates to global store
    map.on('move', () => {
      if (!map) return;
      const center = map.getCenter();
      store.coords = {
        lng: Number(center.lng.toFixed(4)),
        lat: Number(center.lat.toFixed(4)),
        zoom: Number(map.getZoom().toFixed(2)),
      };
    });

    return () => {
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
