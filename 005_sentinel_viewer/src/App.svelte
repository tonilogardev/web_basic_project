<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import PanelControles from './components/PanelControles.svelte';
  import Resultados from './components/Resultados.svelte';
  import Buscador from './components/Buscador.svelte';
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
    { id: 'true-color', label: 'True Color (RGB)', type: 'rgb' as const, assets: ['red', 'green', 'blue'] as [string, string, string], rescale: [0, 3000] as [number, number] },
    { id: 'false-color', label: 'False Color (Urban)', type: 'rgb' as const, assets: ['swir22', 'swir16', 'red'] as [string, string, string], rescale: [0, 3000] as [number, number] },
    { id: 'cir', label: 'Color Infrared (CIR)', type: 'rgb' as const, assets: ['nir', 'red', 'green'] as [string, string, string], rescale: [0, 3000] as [number, number] },
    { id: 'agriculture', label: 'Agriculture', type: 'rgb' as const, assets: ['swir16', 'nir', 'red'] as [string, string, string], rescale: [0, 3000] as [number, number] },
    { id: 'geology', label: 'Geology', type: 'rgb' as const, assets: ['swir22', 'swir16', 'blue'] as [string, string, string], rescale: [0, 3000] as [number, number] },
    { id: 'bathymetric', label: 'Coastal / Bathymetric', type: 'rgb' as const, assets: ['red', 'green', 'coastal'] as [string, string, string], rescale: [0, 3000] as [number, number] },
    { id: 'ndvi', label: 'NDVI (Vegetation)', type: 'expression' as const, assets: ['nir', 'red'], expression: '(b1-b2)/(b1+b2)', rescale: [-1, 1] as [number, number], colormap_name: 'rdylgn' },
    { id: 'ndwi', label: 'NDWI (Water)', type: 'expression' as const, assets: ['green', 'nir'], expression: '(b1-b2)/(b1+b2)', rescale: [-1, 1] as [number, number], colormap_name: 'blues' },
    { id: 'ndbi', label: 'NDBI (Built-up)', type: 'expression' as const, assets: ['swir16', 'nir'], expression: '(b1-b2)/(b1+b2)', rescale: [-1, 1] as [number, number], colormap_name: 'ylorbr' },
  ];

  type BandPreset = typeof PRESETS[number];

  let satelite = $state("sentinel-2");
  let coberturaNubes = $state(20);
  let maxResults = $state<number | 'all'>('all');
  let fechaInicio = $state("");
  let fechaFin = $state("");
  let boundingBox = $state<number[] | null>(null);
  let modoDibujo = $state(false);

  let resultados = $state<StacFeature[]>([]);
  let escenasVisibles = $state(new Set<string>());
  let cargando = $state(false);
  let busquedaRealizada = $state(false);
  let resultadosColapsado = $state(false);

  let cargaInicialPendiente = $state(false);
  let progresoCarga = $state(0);
  let mensajeExito = $state("");

  function mostrarMensajeExito(msg: string) {
    mensajeExito = msg;
    setTimeout(() => {
      mensajeExito = "";
    }, 3500);
  }

  let presetActivo = $state('true-color');
  let bandasCustom = $state<[string, string, string]>(['B04', 'B03', 'B02']);

  const bandConfig = $derived<BandPreset>(
    presetActivo === 'custom'
      ? {
          id: 'custom', label: 'Custom', type: 'rgb',
          assets: bandasCustom.map(b => BAND_TO_ASSET[b] ?? b) as [string, string, string],
          rescale: [0, 3000] as [number, number]
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

    map.on('idle', () => {
      if (cargaInicialPendiente) {
        cargaInicialPendiente = false;
        progresoCarga = 100;
        mostrarMensajeExito("All uploaded images");
        setTimeout(() => { progresoCarga = 0; }, 500);
      }
    });

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
        'line-color': '#ff0000',
        'line-width': 2,
      },
    });
  }

  function irALugar(lugar: any) {
    if (!map) return;
    const { boundingbox, lat, lon } = lugar;
    if (boundingbox) {
      const [latMin, latMax, lonMin, lonMax] = boundingbox.map(Number);
      map.fitBounds([
        [lonMin, latMin],
        [lonMax, latMax]
      ], { padding: 50, duration: 1500 });
    } else {
      map.flyTo({ center: [Number(lon), Number(lat)], zoom: 12, duration: 1500 });
    }
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
    progresoCarga = 10;
    resultados = [];
    limpiarTodasLasCapas();
    busquedaRealizada = false;

    const collection = COLECTION_MAP[satelite] || "sentinel-2-l2a";

    try {
      progresoCarga = 40;
      resultados = await searchSentinel2({
        collection,
        bbox: boundingBox,
        startDate: fechaInicio,
        endDate: fechaFin,
        maxCloudCover: coberturaNubes,
        maxResults: maxResults === 'all' ? 10000 : maxResults,
      });

      progresoCarga = 70;

      const nuevasVisibles = new Set<string>();
      for (const r of resultados) {
        nuevasVisibles.add(r.id);
        agregarEscena(r);
      }
      escenasVisibles = nuevasVisibles;
    } catch (error) {
      console.error("Error en la búsqueda:", error);
    } finally {
      cargando = false;
      busquedaRealizada = true;
      if (resultados.length > 0) {
        cargaInicialPendiente = true;
        progresoCarga = 85;
      } else {
        progresoCarga = 0;
      }
    }
  }

  function toggleEscena(feature: StacFeature) {
    const nuevaSet = new Set(escenasVisibles);
    if (nuevaSet.has(feature.id)) {
      nuevaSet.delete(feature.id);
      quitarEscena(feature);
    } else {
      nuevaSet.add(feature.id);
      agregarEscena(feature);
    }
    escenasVisibles = nuevaSet;
  }

  function quitarEscena(feature: StacFeature) {
    if (!map) return;
    const srcId = `cog-${feature.id}`;
    if (map.getLayer(`${srcId}-layer`)) map.removeLayer(`${srcId}-layer`);
    if (map.getSource(srcId)) map.removeSource(srcId);
  }

  async function agregarEscena(feature: StacFeature) {
    if (!map) return;

    const { id, bbox } = feature;
    const srcId = `cog-${id}`;

    if (map.getSource(srcId)) return;

    // Recortar las teselas visualmente al recuadro del usuario
    let layerBounds = bbox;
    if (boundingBox) {
      layerBounds = [
        Math.max(bbox[0], boundingBox[0]),
        Math.max(bbox[1], boundingBox[1]),
        Math.min(bbox[2], boundingBox[2]),
        Math.min(bbox[3], boundingBox[3])
      ];
      // Salvaguarda: si por algún motivo no hay intersección, usamos el bbox de la imagen
      if (layerBounds[0] > layerBounds[2] || layerBounds[1] > layerBounds[3]) {
        layerBounds = bbox;
      }
    }

    const stacItemUrl = `${STAC_COLLECTION}/items/${feature.id}`;
    const bboxStr = layerBounds.join(',');
    const baseUrl = `${TITILER_BASE_URL}/stac/bbox/${bboxStr}.png?url=${encodeURIComponent(stacItemUrl)}`;

    let imageUrl: string;
    if (bandConfig.type === 'rgb') {
      const assetsStr = bandConfig.assets.map(a => `assets=${a}`).join('&');
      imageUrl = `${baseUrl}&${assetsStr}&rescale=${bandConfig.rescale.join(',')}&max_size=2048`;
    } else {
      const assetsStr = bandConfig.assets.map(a => `assets=${a}`).join('&');
      imageUrl = `${baseUrl}&${assetsStr}&expression=${encodeURIComponent(bandConfig.expression)}&rescale=${bandConfig.rescale.join(',')}&max_size=2048`;
      if (bandConfig.colormap_name) {
        imageUrl += `&colormap_name=${bandConfig.colormap_name}`;
      }
    }

    map.addSource(srcId, {
      type: 'image',
      url: imageUrl,
      coordinates: [
        [layerBounds[0], layerBounds[3]], // Top-Left
        [layerBounds[2], layerBounds[3]], // Top-Right
        [layerBounds[2], layerBounds[1]], // Bottom-Right
        [layerBounds[0], layerBounds[1]]  // Bottom-Left
      ]
    });

    const beforeId = map.getLayer('bbox-layer') ? 'bbox-layer' : undefined;
    map.addLayer({
      id: `${srcId}-layer`,
      type: 'raster',
      source: srcId,
      paint: { 'raster-opacity': 0.9 },
    }, beforeId);

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

  function toggleTodas(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      const nuevaSet = new Set(escenasVisibles);
      for (const r of resultados) {
        if (!nuevaSet.has(r.id)) {
          nuevaSet.add(r.id);
          agregarEscena(r);
        }
      }
      escenasVisibles = nuevaSet;
    } else {
      limpiarTodasLasCapas();
    }
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

  <Buscador onLugarSeleccionado={irALugar} />

  <div class="paneles-izquierda">
    <PanelControles 
      bind:satelite
      bind:coberturaNubes
      bind:maxResults
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
      <div class="panel-resultados" class:colapsado={resultadosColapsado}>
        <div class="panel-header">
          <div class="header-left">
            <h3>Results ({resultados.length})</h3>
            <label class="check-all">
              <input type="checkbox" checked={escenasVisibles.size === resultados.length} onchange={toggleTodas} />
              View all
            </label>
          </div>
          <button class="btn-toggle" onclick={() => resultadosColapsado = !resultadosColapsado} aria-label={resultadosColapsado ? 'Expand panel' : 'Collapse panel'}>
            {resultadosColapsado ? '+' : '−'}
          </button>
        </div>
        {#if !resultadosColapsado}
          <div class="panel-body">
            <Resultados 
              features={resultados} 
              {escenasVisibles}
              onToggle={toggleEscena}
            />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if modoDibujo}
    <div class="hint-dibujo">Drag on the map to draw the bounding box</div>
  {/if}

  {#if cargando || cargaInicialPendiente}
    <div class="toast-loading">
      <div class="loader-spinner"></div>
      <div class="toast-content">
        <span>Loading ...</span>
        <div class="progress-bg"><div class="progress-fill" style="width: {progresoCarga}%"></div></div>
      </div>
    </div>
  {/if}

  {#if mensajeExito}
    <div class="toast-success">
      ✓ {mensajeExito}
    </div>
  {/if}

  {#if busquedaRealizada && !cargando && resultados.length === 0}
    <div class="aviso-sin-resultados">
      No images found matching the selected criteria
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

  .toast-loading, .toast-success {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(10, 10, 11, 0.9);
    backdrop-filter: blur(10px);
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 14px;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    font-family: system-ui, sans-serif;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  .toast-success {
    border-color: #4ade80;
    color: #4ade80;
    font-weight: 600;
  }

  .toast-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .toast-content span {
    font-size: 0.85rem;
    font-weight: 600;
    color: #e5e7eb;
  }

  .progress-bg {
    width: 120px;
    height: 4px;
    background: rgba(255,255,255,0.2);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #2196f3;
    transition: width 0.3s ease;
  }

  .loader-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .panel-resultados {
    background: rgba(10, 10, 11, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e5e7eb;
    font-family: system-ui, -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    width: 320px;
    transition: width 0.25s ease;
    min-height: 0;
  }

  .panel-resultados.colapsado {
    width: 56px;
  }

  .panel-resultados .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    gap: 8px;
    flex-shrink: 0;
  }

  .panel-resultados .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .panel-resultados h3 {
    margin: 0;
    font-size: 0.95rem;
    color: #9ca3af;
    white-space: nowrap;
  }

  .panel-resultados .check-all {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: #e5e7eb;
    cursor: pointer;
    user-select: none;
  }

  .panel-resultados .check-all input {
    accent-color: #0ea5e9;
    cursor: pointer;
    margin: 0;
  }

  .panel-resultados.colapsado .header-left {
    display: none;
  }

  .panel-resultados .btn-toggle {
    width: 28px;
    height: 28px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    font-size: 1.2rem;
    font-weight: 700;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #e5e7eb;
    flex-shrink: 0;
  }

  .panel-resultados .btn-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .panel-resultados .panel-body {
    padding: 0 16px 16px;
    overflow-y: auto;
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
    align-items: flex-start;
    gap: 12px;
    max-height: calc(100vh - 40px);
  }

  @media (max-width: 600px) {
    .panel-resultados {
      width: 100%;
    }
    .panel-resultados.colapsado {
      width: 56px;
    }

    .paneles-izquierda {
      top: auto;
      bottom: 10px;
      left: 10px;
      right: 10px;
      max-height: calc(100vh - 80px);
    }

    .panel-resultados .panel-body {
      max-height: 35vh;
    }
  }
</style>
