<script lang="ts">
  import { MapLibre, NavigationControl } from 'svelte-maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';

  // Propiedad para que el padre pueda capturar el evento de carga si lo necesita
  let { onMapLoad } = $props();
</script>

<div class="map-wrapper">
  <MapLibre
    style="https://tiles.openfreemap.org/styles/liberty"
    standardControls={false}
    on:load={onMapLoad}
  >
    <NavigationControl position="top-right" />
  </MapLibre>
</div>

<style>
  .map-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    background: #e5e5e5;
  }

  /* Aseguramos que el canvas de MapLibre ocupe todo el espacio del componente */
  :global(.maplibregl-map) {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%;
  }
</style>