<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import MapboxDraw from '@mapbox/mapbox-gl-draw';
  import PanelControles from './components/PanelControles.svelte';

  // Importar estilos necesarios
  import 'maplibre-gl/dist/maplibre-gl.css';
  import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

  // 1. ESTADO GLOBAL (Cerebro de la App)
  let satelite = $state("sentinel-2");
  let coberturaNubes = $state(20);
  let fechaInicio = $state("");
  let fechaFin = $state("");
  let boundingBox = $state<number[] | null>(null);

  // Referencias internas
  let mapContainer: HTMLElement;
  let map: maplibregl.Map;
  let draw: any;

  onMount(() => {
    // Inicializar Mapa
    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [1.74, 41.69], // Catalunya
      zoom: 7.5
    });

    // Inicializar Herramienta de Dibujo
    draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { trash: true },
      defaultMode: 'simple_select'
    });
    map.addControl(draw);

    // Capturar el área dibujada
    map.on('draw.create', actualizarBBox);
    map.on('draw.update', actualizarBBox);
    map.on('draw.delete', () => boundingBox = null);

    return () => map.remove();
  });

  function actualizarBBox(e: any) {
    const feature = e.features[0];
    const coords = feature.geometry.coordinates[0];
    const lngs = coords.map((c: any) => c[0]);
    const lats = coords.map((c: any) => c[1]);
    
    // Formato STAC: [minLng, minLat, maxLng, maxLat]
    boundingBox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  }

  function activarDibujo() {
    if (draw) draw.changeMode('draw_polygon');
  }

  function ejecutarBusqueda() {
    console.log("🚀 Iniciando búsqueda en Copernicus CDSE...", {
      satelite,
      bbox: boundingBox,
      fechas: [fechaInicio, fechaFin],
      nubes: coberturaNubes
    });
  }
</script>

<main class="contenedor-principal">
  <div bind:this={mapContainer} class="mapa"></div>

  <PanelControles 
    bind:satelite
    bind:coberturaNubes
    bind:fechaInicio
    bind:fechaFin
    {boundingBox}
    onDibujarRectangulo={activarDibujo}
    onBuscar={ejecutarBusqueda}
  />
</main>

<style>
  :global(body, html) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .contenedor-principal {
    position: relative; /* Necesario para que el panel absoluto se posicione bien */
    width: 100vw;
    height: 100vh;
  }

  .mapa {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1; /* El mapa queda al fondo */
  }
</style>