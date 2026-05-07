<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import PanelControles from './components/PanelControles.svelte';
  import Resultados from './components/Resultados.svelte';
  import { searchSentinel2, getDirectCogUrl, type StacFeature } from './lib/stacApi';

  import 'maplibre-gl/dist/maplibre-gl.css';

  const TITILER_BASE_URL = import.meta.env.VITE_TITILER_URL
    ?? (window.location.hostname.includes('localhost')
      ? 'http://titiler.localhost:8001'
      : 'https://titiler.tonilogar.com');

  let satelite = $state("sentinel-2");
  let coberturaNubes = $state(20);
  let fechaInicio = $state("");
  let fechaFin = $state("");
  let boundingBox = $state<number[] | null>(null);
  let modoDibujo = $state(false);

  let resultados = $state<StacFeature[]>([]);
  let escenaActiva = $state<StacFeature | null>(null);
  let cargando = $state(false);

  let mapContainer: HTMLElement;
  let map: maplibregl.Map;
  let primerClick = $state<maplibregl.LngLat | null>(null);

  const COLECTION_MAP: Record<string, string> = {
    "sentinel-2": "sentinel-2-l2a",
  };

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [1.74, 41.69],
      zoom: 7.5
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('click', manejarClick);

    return () => map.remove();
  });

  function manejarClick(e: maplibregl.MapMouseEvent) {
    if (!modoDibujo) return;

    if (!primerClick) {
      primerClick = e.lngLat;
      return;
    }

    const lng1 = primerClick.lng;
    const lat1 = primerClick.lat;
    const lng2 = e.lngLat.lng;
    const lat2 = e.lngLat.lat;

    boundingBox = [
      Math.min(lng1, lng2),
      Math.min(lat1, lat2),
      Math.max(lng1, lng2),
      Math.max(lat1, lat2),
    ];

    dibujarRectangulo();
    primerClick = null;
    modoDibujo = false;
  }

  function dibujarRectangulo() {
    if (!map || !boundingBox) return;

    const [minLng, minLat, maxLng, maxLat] = boundingBox;
    const coords = [
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat],
    ];

    if (map.getLayer('bbox-layer')) map.removeLayer('bbox-layer');
    if (map.getSource('bbox-source')) map.removeSource('bbox-source');

    map.addSource('bbox-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
      },
    });

    map.addLayer({
      id: 'bbox-layer',
      type: 'line',
      source: 'bbox-source',
      paint: {
        'line-color': '#4ade80',
        'line-width': 2,
        'line-dasharray': [2, 2],
      },
    });
  }

  function activarDibujo() {
    modoDibujo = true;
    primerClick = null;
    if (map) map.getCanvas().style.cursor = 'crosshair';
  }

  async function ejecutarBusqueda() {
    if (!boundingBox || !fechaInicio || !fechaFin) return;

    cargando = true;
    resultados = [];
    escenaActiva = null;
    limpiarCapaCOG();

    const collection = COLECTION_MAP[satelite] || "sentinel-2-l2a";

    try {
      resultados = await searchSentinel2({
        collection,
        bbox: boundingBox,
        startDate: fechaInicio,
        endDate: fechaFin,
        maxCloudCover: coberturaNubes,
      });

      if (resultados.length > 0) {
        escenaActiva = resultados[0];
        mostrarVisual(resultados[0]);
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error);
    } finally {
      cargando = false;
    }
  }

  function cambiarEscena(feature: StacFeature) {
    escenaActiva = feature;
    mostrarVisual(feature);
  }

  function limpiarCapaCOG() {
    if (!map) return;
    const srcId = 'cog-canvas';
    if (map.getLayer(`${srcId}-layer`)) map.removeLayer(`${srcId}-layer`);
    if (map.getSource(srcId)) map.removeSource(srcId);
  }

  async function mostrarVisual(feature: StacFeature) {
    limpiarCapaCOG();

    const cogUrl = getDirectCogUrl(feature, 'visual');
    if (!cogUrl) {
      console.warn(`No visual asset for ${feature.id}`);
      return;
    }

    let bounds: [number, number, number, number] | null = null;

    try {
      const resp = await fetch(
        `${TITILER_BASE_URL}/cog/info.geojson?url=${encodeURIComponent(cogUrl)}`
      );
      if (resp.ok) {
        const data = await resp.json();
        const coords = data.geometry.coordinates[0] as number[][];
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        bounds = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
      }
    } catch (e) {
      console.warn("bounds fetch failed", e);
    }

    if (!bounds && feature.geometry?.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0] as number[][];
      const lngs = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      bounds = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    }

    const tileUrl = `${TITILER_BASE_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}`
      + `?url=${encodeURIComponent(cogUrl)}`
      + `&bidx=1&bidx=2&bidx=3`
      + `&rescale=0,255`;

    map.addSource('cog-canvas', {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 512,
      ...(bounds ? { bounds } : {}),
    });

    map.addLayer({
      id: 'cog-canvas-layer',
      type: 'raster',
      source: 'cog-canvas',
      paint: { 'raster-opacity': 0.9 },
    });

    if (bounds) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
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

  {#if modoDibujo}
    <div class="hint-dibujo">Haz clic en dos puntos del mapa para dibujar el rectángulo</div>
  {/if}

  {#if cargando}
    <div class="spinner-global">Buscando escenas...</div>
  {/if}

  {#if !cargando && resultados.length > 0}
    <div class="panel-resultados">
      <h3>Todas ({resultados.length})</h3>
      <Resultados 
        features={resultados} 
        onSeleccion={cambiarEscena} 
      />
    </div>
  {/if}
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
    position: relative;
    width: 100vw;
    height: 100vh;
  }

  .mapa {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  .hint-dibujo {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #0ea5e9;
    color: white;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    z-index: 100;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .spinner-global {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(10, 10, 11, 0.9);
    color: #9ca3af;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    z-index: 100;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .panel-resultados {
    position: absolute;
    bottom: 20px;
    left: 380px;
    width: 340px;
    max-height: 50vh;
    overflow-y: auto;
    background: rgba(10, 10, 11, 0.9);
    backdrop-filter: blur(10px);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e5e7eb;
    z-index: 10;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .panel-resultados h3 {
    margin: 0 0 12px 0;
    font-size: 0.95rem;
    color: #9ca3af;
  }

  @media (max-width: 900px) {
    .panel-resultados {
      left: 10px;
      right: 10px;
      width: auto;
      bottom: 10px;
    }
  }
</style>
