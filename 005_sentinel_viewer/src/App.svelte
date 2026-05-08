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

  async function ejecutarBusqueda() {
    if (!store.boundingBox || !store.fechaInicio || !store.fechaFin) return;

    store.cargando = true;
    store.progresoCarga = 10;
    store.resultados = [];
    store.limpiarTodasLasCapas();
    store.busquedaRealizada = false;

    const collection = COLECTION_MAP[store.satelite] || "sentinel-2-l2a";

    try {
      store.progresoCarga = 40;
      store.resultados = await searchSentinel2({
        collection,
        bbox: store.boundingBox,
        startDate: store.fechaInicio,
        endDate: store.fechaFin,
        maxCloudCover: store.coberturaNubes,
        maxResults: store.maxResults === 'all' ? 10000 : (store.maxResults as number),
      });

      store.progresoCarga = 70;

      const nuevasVisibles = new Set<string>();
      for (const r of store.resultados) {
        nuevasVisibles.add(r.id);
      }
      store.escenasVisibles = nuevasVisibles;
    } catch (error) {
      console.error("Error en la búsqueda:", error);
    } finally {
      store.cargando = false;
      store.busquedaRealizada = true;
      if (store.resultados.length > 0) {
        store.cargaInicialPendiente = true;
        store.progresoCarga = 85;
      } else {
        store.progresoCarga = 0;
      }
    }
  }

  function toggleEscena(featureId: string) {
    store.toggleEscena(featureId);
  }

  function toggleTodas() {
    store.toggleTodas();
  }

  $effect(() => {
    const _ = store.bandConfig;
    const __ = store.escenasVisibles;
    if (mapManager) {
      mapManager.sincronizarCapas();
    }
  });
</script>

<main class="contenedor-principal">
  <div bind:this={mapContainer} class="mapa"></div>

  <Buscador onLugarSeleccionado={irALugar} />

  <div class="paneles-izquierda">
    <PanelControles 
      onDibujarRectangulo={activarDibujo}
      onBuscar={ejecutarBusqueda}
    />

    {#if !store.cargando && store.resultados.length > 0}
      <div class="panel-resultados" class:colapsado={store.resultadosColapsado}>
        <div class="panel-header">
          <div class="header-left">
            <h3>Results ({store.resultados.length})</h3>
            <label class="check-all">
              <input type="checkbox" checked={store.escenasVisibles.size === store.resultados.length} onchange={toggleTodas} />
              View all
            </label>
          </div>
          <button class="btn-toggle" onclick={() => store.resultadosColapsado = !store.resultadosColapsado} aria-label={store.resultadosColapsado ? 'Expand panel' : 'Collapse panel'}>
            {store.resultadosColapsado ? '+' : '−'}
          </button>
        </div>
        {#if !store.resultadosColapsado}
          <div class="panel-body">
            <Resultados 
              features={store.resultados} 
              escenasVisibles={store.escenasVisibles}
              onToggle={(f) => toggleEscena(f.id)}
            />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if store.modoDibujo}
    <div class="hint-dibujo">Drag on the map to draw the bounding box</div>
  {/if}

  {#if store.bandConfig.id === 'water-quality'}
    <Legend />
  {/if}

  <Toasts />

  {#if store.busquedaRealizada && !store.cargando && store.resultados.length === 0}
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
