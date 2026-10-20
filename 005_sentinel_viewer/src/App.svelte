<script lang="ts">
  import { onMount } from 'svelte';
  import { MapManager } from './lib/MapManager';
  import PanelControles from './components/PanelControles.svelte';
  import Resultados from './components/Resultados.svelte';
  import Buscador from './components/Buscador.svelte';
  import Toasts from './components/Toasts.svelte';
  import Legend from './components/Legend.svelte';
  import { searchSentinel2 } from './lib/stacApi';
  import { store } from './lib/store.svelte';
  import { draggable } from './lib/draggable';

  import 'maplibre-gl/dist/maplibre-gl.css';

  let mapContainer: HTMLElement;
  let mapManager: MapManager;

  const COLECTION_MAP: Record<string, string> = {
    "sentinel-2": "sentinel-2-l2a",
  };

  onMount(() => {
    mapManager = new MapManager(mapContainer);
    return () => mapManager.destroy();
  });

  function irALugar(lugar: any) {
    if (mapManager) mapManager.irALugar(lugar);
  }

  function activarDibujo() {
    if (mapManager) mapManager.activarDibujo();
  }

  function limpiarDibujo() {
    if (mapManager) mapManager.limpiarBoundingBox();
  }

  async function ejecutarBusqueda() {
    if (!store.boundingBox || !store.areaValida || !store.fechaInicio || !store.fechaFin || !store.rangoFechasValido) return;

    store.cargando = true;
    store.mensajeCarga = `Searching ${store.bandConfig.label}...`;
    store.progresoCarga = 20;
    store.busquedaRealizada = false;

    const collection = COLECTION_MAP[store.satelite] || "sentinel-2-l2a";

    try {
      store.progresoCarga = 50;
      const features = await searchSentinel2({
        collection,
        bbox: store.boundingBox,
        startDate: store.fechaInicio,
        endDate: store.fechaFin,
        maxCloudCover: store.coberturaNubes,
        maxResults: store.maxResults === 'all' ? 10000 : (store.maxResults as number),
      });

      store.progresoCarga = 80;

      // Add or update search widget for current band preset
      store.agregarOActualizarBusqueda(store.presetActivo, store.bandConfig, features);
    } catch (error) {
      console.error("Error en la búsqueda:", error);
    } finally {
      store.cargando = false;
      store.busquedaRealizada = true;
      store.progresoCarga = 0;
    }
  }

  $effect(() => {
    // Reactively monitor all search sessions, scene visibility and individual opacities
    for (const b of store.busquedas) {
      const _ = b.escenasVisibles.size;
      const __ = b.opacidad;
      const ___ = Array.from(b.escenasVisibles).join(',');
    }
    const count = store.busquedas.length;
    if (mapManager) {
      mapManager.sincronizarCapas();
    }
  });
</script>

<main class="contenedor-principal">
  <div bind:this={mapContainer} class="mapa"></div>

  <Buscador onLugarSeleccionado={irALugar} />

  <PanelControles 
    onDibujarRectangulo={activarDibujo}
    onLimpiarRectangulo={limpiarDibujo}
    onBuscar={ejecutarBusqueda}
  />

  {#each store.busquedas as busqueda (busqueda.id)}
    <div 
      class="panel-resultados" 
      class:colapsado={busqueda.colapsado}
      use:draggable={{
        initialX: busqueda.x ?? 355,
        initialY: busqueda.y ?? 20,
        handle: '.panel-header',
        ignore: 'button, input, select, label, a, .check-all',
        onPositionChange: (pos) => {
          busqueda.x = pos.x;
          busqueda.y = pos.y;
        }
      }}
    >
      <div class="panel-header">
        <div class="header-left">
          <span class="drag-icon" title="Drag to move window">⠿</span>
          <h3>Results ({busqueda.resultados.length})</h3>
          <label class="check-all" class:disabled={store.cargaCapasPendiente}>
            <input 
              type="checkbox" 
              checked={busqueda.escenasVisibles.size === busqueda.resultados.length && busqueda.resultados.length > 0} 
              disabled={store.cargaCapasPendiente}
              onchange={() => store.toggleTodasEnBusqueda(busqueda.id)} 
            />
            View all
          </label>
        </div>
        <div class="header-right">
          <span class="badge-preset badge-{busqueda.presetId}">{busqueda.presetLabel}</span>
          <button 
            class="btn-toggle" 
            onclick={() => busqueda.colapsado = !busqueda.colapsado} 
            aria-label={busqueda.colapsado ? 'Expand panel' : 'Collapse panel'}
            title={busqueda.colapsado ? 'Expand' : 'Collapse'}
          >
            {busqueda.colapsado ? '+' : '−'}
          </button>
          <button 
            class="btn-cerrar" 
            onclick={() => store.eliminarBusqueda(busqueda.id)} 
            aria-label="Close search widget"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {#if !busqueda.colapsado}
        <div class="panel-opacity-bar">
          <span class="opacity-label">Opacity: {busqueda.opacidad}%</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            bind:value={busqueda.opacidad} 
            class="slider-opacity" 
          />
        </div>
        <div class="panel-body">
          <Resultados 
            features={busqueda.resultados} 
            escenasVisibles={busqueda.escenasVisibles}
            onToggle={(f) => store.toggleEscenaEnBusqueda(busqueda.id, f.id)}
          />
        </div>
      {/if}
    </div>
  {/each}

  {#if store.modoDibujo}
    <div class="hint-dibujo">Drag on the map to draw the bounding box</div>
  {/if}

  {#if store.busquedas.some(b => b.presetId === 'water-quality' && b.escenasVisibles.size > 0)}
    <Legend />
  {/if}

  <Toasts />

  {#if store.busquedaRealizada && !store.cargando && store.busquedas.every(b => b.resultados.length === 0)}
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

  .panel-resultados {
    background: rgba(10, 10, 11, 0.92);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #e5e7eb;
    font-family: system-ui, -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    width: 320px;
    min-width: 320px;
    max-height: 420px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
    transition: width 0.2s ease, max-height 0.2s ease;
  }

  .panel-resultados:global(.is-dragging) {
    transition: none !important;
    cursor: grabbing !important;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(14, 165, 233, 0.5) !important;
  }

  .panel-resultados.colapsado {
    width: auto;
    min-width: 250px;
    max-height: 48px;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    gap: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    cursor: grab;
    user-select: none;
  }

  :global(.panel-resultados.is-dragging) .panel-header {
    cursor: grabbing;
  }

  .drag-icon {
    font-size: 1.1rem;
    color: #6b7280;
    cursor: grab;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    transition: color 0.15s ease;
  }

  .panel-header:hover .drag-icon {
    color: #38bdf8;
  }

  .panel-resultados.colapsado .panel-header {
    border-bottom: none;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-left h3 {
    margin: 0;
    font-size: 0.9rem;
    color: #e5e7eb;
    white-space: nowrap;
    font-weight: 600;
  }

  .check-all {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: #9ca3af;
    cursor: pointer;
    user-select: none;
    transition: opacity 0.2s ease;
  }

  .check-all.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .check-all input {
    accent-color: #0ea5e9;
    cursor: pointer;
    margin: 0;
  }

  .check-all.disabled input {
    cursor: not-allowed;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .badge-preset {
    font-size: 0.75rem;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 4px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .badge-true-color {
    background: rgba(56, 189, 248, 0.18);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.4);
  }

  .badge-ndvi {
    background: rgba(74, 222, 128, 0.18);
    color: #4ade80;
    border: 1px solid rgba(74, 222, 128, 0.4);
  }

  .badge-ndwi {
    background: rgba(6, 182, 212, 0.18);
    color: #06b6d4;
    border: 1px solid rgba(6, 182, 212, 0.4);
  }

  .badge-ndbi {
    background: rgba(245, 158, 11, 0.18);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.4);
  }

  .badge-water-quality {
    background: rgba(45, 212, 191, 0.18);
    color: #2dd4bf;
    border: 1px solid rgba(45, 212, 191, 0.4);
  }

  .badge-false-color, .badge-cir {
    background: rgba(192, 132, 252, 0.18);
    color: #c084fc;
    border: 1px solid rgba(192, 132, 252, 0.4);
  }

  .btn-toggle, .btn-cerrar {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #e5e7eb;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-toggle:hover {
    background: rgba(255, 255, 255, 0.18);
    color: white;
  }

  .btn-cerrar:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.5);
    color: #f87171;
  }

  .panel-opacity-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: rgba(0, 0, 0, 0.25);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    gap: 10px;
  }

  .opacity-label {
    font-size: 0.75rem;
    color: #9ca3af;
    white-space: nowrap;
  }

  .slider-opacity {
    flex: 1;
    height: 4px;
    accent-color: #0ea5e9;
    cursor: pointer;
  }

  .panel-body {
    overflow-y: auto;
    padding: 10px 14px;
    max-height: 260px;
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

  @media (max-width: 600px) {
    .panel-resultados {
      width: calc(100vw - 20px);
      min-width: unset;
    }
    .panel-resultados.colapsado {
      width: 48px;
      height: 48px;
    }

    .panel-resultados .panel-body {
      max-height: 35vh;
    }
  }
</style>
