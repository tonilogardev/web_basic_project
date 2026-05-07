<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import PanelControles from './components/PanelControles.svelte';
  import Resultados from './components/Resultados.svelte';
  import { searchSentinel2, STAC_COLLECTION, type StacFeature } from './lib/stacApi';

  import 'maplibre-gl/dist/maplibre-gl.css';

  const TITILER_BASE_URL = import.meta.env.VITE_TITILER_URL
    ?? (window.location.hostname.includes('localhost')
      ? 'http://titiler.localhost:8001'
      : 'https://titiler.tonilogar.com');

  const BANDAS_DISPONIBLES = ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B8A', 'B09', 'B11', 'B12'];

  const BAND_TO_ASSET: Record<string, string> = {
    B01: 'coastal', B02: 'blue', B03: 'green', B04: 'red',
    B05: 'rededge1', B06: 'rededge2', B07: 'rededge3',
    B08: 'nir', B8A: 'nir08', B09: 'nir09',
    B11: 'swir16', B12: 'swir22',
  };

  const PRESETS = [
    { id: 'true-color', label: 'Color Real (RGB)', type: 'rgb' as const, assets: ['red', 'green', 'blue'] as [string, string, string], rescale: [0, 255] as [number, number] },
    { id: 'false-color', label: 'Falso Color (Urbano)', type: 'rgb' as const, assets: ['swir22', 'swir16', 'red'] as [string, string, string], rescale: [0, 255] as [number, number] },
    { id: 'cir', label: 'Infrarrojo Color (CIR)', type: 'rgb' as const, assets: ['nir', 'red', 'green'] as [string, string, string], rescale: [0, 255] as [number, number] },
    { id: 'agriculture', label: 'Agricultura', type: 'rgb' as const, assets: ['swir16', 'nir', 'red'] as [string, string, string], rescale: [0, 255] as [number, number] },
    { id: 'geology', label: 'Geología', type: 'rgb' as const, assets: ['swir22', 'swir16', 'blue'] as [string, string, string], rescale: [0, 255] as [number, number] },
    { id: 'bathymetric', label: 'Costero / Batimétrico', type: 'rgb' as const, assets: ['red', 'green', 'coastal'] as [string, string, string], rescale: [0, 255] as [number, number] },
    { id: 'ndvi', label: 'NDVI (Vegetación)', type: 'expression' as const, assets: ['nir', 'red'], expression: '(b1-b2)/(b1+b2)', rescale: [-1, 1] as [number, number], colormap_name: 'rdylgn' },
    { id: 'ndwi', label: 'NDWI (Agua)', type: 'expression' as const, assets: ['green', 'nir'], expression: '(b1-b2)/(b1+b2)', rescale: [-1, 1] as [number, number], colormap_name: 'blues' },
    { id: 'ndbi', label: 'NDBI (Construcción)', type: 'expression' as const, assets: ['swir16', 'nir'], expression: '(b1-b2)/(b1+b2)', rescale: [-1, 1] as [number, number], colormap_name: 'ylorbr' },
  ];

  type BandPreset = typeof PRESETS[number];

  let satelite = $state("sentinel-2");
  let coberturaNubes = $state(20);
  let fechaInicio = $state("");
  let fechaFin = $state("");
  let boundingBox = $state<number[] | null>(null);
  let modoDibujo = $state(false);

  let resultados = $state<StacFeature[]>([]);
  let escenasVisibles = $state(new Set<string>());
  let cargando = $state(false);
  let busquedaRealizada = $state(false);

  let presetActivo = $state('true-color');
  let bandasCustom = $state<[string, string, string]>(['B04', 'B03', 'B02']);

  const bandConfig = $derived<BandPreset>(
    presetActivo === 'custom'
      ? {
          id: 'custom', label: 'Personalizado', type: 'rgb',
          assets: bandasCustom.map(b => BAND_TO_ASSET[b] ?? b) as [string, string, string],
          rescale: [0, 255]
        }
      : PRESETS.find(p => p.id === presetActivo)!
  );

  let mapContainer: HTMLElement;
  let map: maplibregl.Map;
  let arrastrando = $state(false);
  let inicioArrastre: { lng: number; lat: number } | null = null;

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
    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => map.remove();
  });

  function onMouseDown(e: maplibregl.MapMouseEvent) {
    if (!modoDibujo) return;
    if (e.originalEvent.button !== 0) return;
    arrastrando = true;
    inicioArrastre = { lng: e.lngLat.lng, lat: e.lngLat.lat };
  }

  function onMouseMove(e: maplibregl.MapMouseEvent) {
    if (!modoDibujo || !arrastrando || !inicioArrastre) return;

    const lng1 = inicioArrastre.lng;
    const lat1 = inicioArrastre.lat;
    const lng2 = e.lngLat.lng;
    const lat2 = e.lngLat.lat;

    boundingBox = [
      Math.min(lng1, lng2),
      Math.min(lat1, lat2),
      Math.max(lng1, lng2),
      Math.max(lat1, lat2),
    ];

    dibujarRectangulo();
  }

  function onMouseUp(e: maplibregl.MapMouseEvent) {
    if (!modoDibujo || !arrastrando || !inicioArrastre) return;
    if (e.originalEvent.button !== 0) return;

    const lng1 = inicioArrastre.lng;
    const lat1 = inicioArrastre.lat;
    const lng2 = e.lngLat.lng;
    const lat2 = e.lngLat.lat;

    boundingBox = [
      Math.min(lng1, lng2),
      Math.min(lat1, lat2),
      Math.max(lng1, lng2),
      Math.max(lat1, lat2),
    ];

    dibujarRectangulo();
    arrastrando = false;
    inicioArrastre = null;
    modoDibujo = false;
    map.dragPan.enable();
    map.getCanvas().style.cursor = '';
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
    arrastrando = false;
    inicioArrastre = null;
    busquedaRealizada = false;
    if (map) {
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'crosshair';
    }
  }

  async function ejecutarBusqueda() {
    if (!boundingBox || !fechaInicio || !fechaFin) return;

    cargando = true;
    resultados = [];
    limpiarTodasLasCapas();
    busquedaRealizada = false;

    const collection = COLECTION_MAP[satelite] || "sentinel-2-l2a";

    try {
      resultados = await searchSentinel2({
        collection,
        bbox: boundingBox,
        startDate: fechaInicio,
        endDate: fechaFin,
        maxCloudCover: coberturaNubes,
      });

      for (const r of resultados) {
        escenasVisibles.add(r.id);
        agregarEscena(r);
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error);
    } finally {
      cargando = false;
      busquedaRealizada = true;
    }
  }

  function toggleEscena(feature: StacFeature) {
    if (escenasVisibles.has(feature.id)) {
      escenasVisibles.delete(feature.id);
      quitarEscena(feature);
    } else {
      escenasVisibles.add(feature.id);
      agregarEscena(feature);
    }
  }

  function quitarEscena(feature: StacFeature) {
    if (!map) return;
    const srcId = `cog-${feature.id}`;
    if (map.getLayer(`${srcId}-layer`)) map.removeLayer(`${srcId}-layer`);
    if (map.getSource(srcId)) map.removeSource(srcId);
  }

  async function agregarEscena(feature: StacFeature) {
    if (!map) return;

    const srcId = `cog-${feature.id}`;

    const stacItemUrl = `${STAC_COLLECTION}/items/${feature.id}`;
    const baseUrl = `${TITILER_BASE_URL}/stac/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${encodeURIComponent(stacItemUrl)}`;

    let tileUrl: string;
    if (bandConfig.type === 'rgb') {
      const assetsStr = bandConfig.assets.map(a => `assets=${a}`).join('&');
      tileUrl = `${baseUrl}&${assetsStr}&rescale=${bandConfig.rescale.join(',')}`;
    } else {
      const assetsStr = bandConfig.assets.map(a => `assets=${a}`).join('&');
      tileUrl = `${baseUrl}&${assetsStr}&expression=${encodeURIComponent(bandConfig.expression)}&rescale=${bandConfig.rescale.join(',')}`;
      if (bandConfig.colormap_name) {
        tileUrl += `&colormap_name=${bandConfig.colormap_name}`;
      }
    }

    let bounds: [number, number, number, number] | null = null;
    if (feature.geometry?.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0] as number[][];
      const lngs = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      bounds = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    }

    map.addSource(srcId, {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 512,
      ...(bounds ? { bounds } : {}),
    });

    map.addLayer({
      id: `${srcId}-layer`,
      type: 'raster',
      source: srcId,
      paint: { 'raster-opacity': 0.9 },
    });

    if (bounds) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }

  function limpiarTodasLasCapas() {
    if (!map) return;
    for (const id of escenasVisibles) {
      const srcId = `cog-${id}`;
      if (map.getLayer(`${srcId}-layer`)) map.removeLayer(`${srcId}-layer`);
      if (map.getSource(srcId)) map.removeSource(srcId);
    }
    escenasVisibles = new Set();
  }

  $effect(() => {
    const _ = bandConfig;
    if (!map || escenasVisibles.size === 0) return;
    const ids = [...escenasVisibles];
    for (const id of ids) {
      const srcId = `cog-${id}`;
      if (map.getLayer(`${srcId}-layer`)) map.removeLayer(`${srcId}-layer`);
      if (map.getSource(srcId)) map.removeSource(srcId);
    }
    for (const id of ids) {
      const f = resultados.find(r => r.id === id);
      if (f) agregarEscena(f);
    }
  });
</script>

<main class="contenedor-principal">
  <div bind:this={mapContainer} class="mapa"></div>

  <div class="paneles-izquierda">
    <PanelControles 
      bind:satelite
      bind:coberturaNubes
      bind:fechaInicio
      bind:fechaFin
      {boundingBox}
      bind:presetActivo
      bind:bandasCustom
      {BANDAS_DISPONIBLES}
      onDibujarRectangulo={activarDibujo}
      onBuscar={ejecutarBusqueda}
    />

    {#if !cargando && resultados.length > 0}
      <div class="panel-resultados">
        <h3>Todas ({resultados.length})</h3>
        <Resultados 
          features={resultados} 
          {escenasVisibles}
          onToggle={toggleEscena}
        />
      </div>
    {/if}
  </div>

  {#if modoDibujo}
    <div class="hint-dibujo">Arrastra en el mapa para dibujar el rectángulo</div>
  {/if}

  {#if cargando}
    <div class="spinner-global">Buscando escenas...</div>
  {/if}

  {#if busquedaRealizada && !cargando && resultados.length === 0}
    <div class="aviso-sin-resultados">
      No se encontraron imágenes con los criterios seleccionados
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
    background: rgba(10, 10, 11, 0.9);
    backdrop-filter: blur(10px);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e5e7eb;
    font-family: system-ui, -apple-system, sans-serif;
    overflow-y: auto;
    max-height: 45vh;
  }

  .panel-resultados h3 {
    margin: 0 0 12px 0;
    font-size: 0.95rem;
    color: #9ca3af;
  }

  .aviso-sin-resultados {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(10, 10, 11, 0.92);
    backdrop-filter: blur(10px);
    padding: 24px 36px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #9ca3af;
    font-size: 1rem;
    font-weight: 500;
    z-index: 10;
    text-align: center;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .paneles-izquierda {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  @media (max-width: 900px) {
    .panel-resultados {
      max-height: 30vh;
    }

    .paneles-izquierda {
      top: auto;
      bottom: 10px;
      left: 10px;
      right: 10px;
    }
  }
</style>
