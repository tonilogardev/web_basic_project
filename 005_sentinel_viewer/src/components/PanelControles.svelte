<script lang="ts">
  import { store, BANDAS_DISPONIBLES, PRESETS } from '../lib/store.svelte';

  interface Props {
    onDibujarRectangulo?: () => void;
    onLimpiarRectangulo?: () => void;
    onBuscar?: () => void;
  }

  let { onDibujarRectangulo, onLimpiarRectangulo, onBuscar }: Props = $props();

  let colapsado = $state(false);

  const satelites = [
    { id: "sentinel-1", name: "Sentinel-1", enabled: false },
    { id: "sentinel-2", name: "Sentinel-2", enabled: true },
    { id: "sentinel-3", name: "Sentinel-3", enabled: false }
  ];

  function updateCustomBand(index: number, val: string) {
    const arr = [...store.bandasCustom];
    arr[index] = val;
    store.bandasCustom = arr as [string, string, string];
  }

  function abrirPicker(e: MouseEvent) {
    const input = e.currentTarget as HTMLInputElement;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        // Fallback for browsers with active picker
      }
    }
  }

  function onInicioChange() {
    if (store.fechaInicio && (!store.fechaFin || store.fechaFin < store.fechaInicio)) {
      store.fechaFin = store.fechaInicio;
    }
  }

  function setDateRange(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    store.fechaFin = end.toISOString().slice(0, 10);
    store.fechaInicio = start.toISOString().slice(0, 10);
  }
</script>

<aside class="panel-flotante" class:colapsado>
  <div class="panel-header">
    <h2>Copernicus Viewer</h2>
    <button class="btn-toggle" onclick={() => colapsado = !colapsado} aria-label={colapsado ? 'Expand panel' : 'Collapse panel'}>
      {colapsado ? '+' : '−'}
    </button>
  </div>

  {#if !colapsado}
    <div class="panel-body">
      <div class="control-group">
        <label for="satelite">Satellite</label>
        <select id="satelite" bind:value={store.satelite}>
          {#each satelites as sat}
            <option value={sat.id} disabled={!sat.enabled}>
              {sat.name} {!sat.enabled ? '(Coming soon)' : ''}
            </option>
          {/each}
        </select>
      </div>

      <div class="control-group">
        <span class="label-title">Area of Interest (AOI)</span>
        <div class="grid-tools">
          <button class="btn-tool" class:active={store.modoDibujo} disabled={store.cargando} onclick={onDibujarRectangulo}>
            {store.modoDibujo ? 'Drawing...' : (store.boundingBox ? 'Redraw Area' : 'Draw Rectangle')}
          </button>
          {#if store.boundingBox}
            <button type="button" class="btn-clear-aoi" disabled={store.cargando} onclick={onLimpiarRectangulo} title="Clear Area">
              ✕ Clear
            </button>
          {/if}
        </div>
        <button class="btn-tool disabled" disabled>Municipalities (PMTiles)</button>
        <button class="btn-tool disabled" disabled>Upload SHP</button>

        {#if store.boundingBox}
          {#if store.areaValida}
            <div class="bbox-tag">
              Area: {store.areaKm2.toLocaleString()} km² ✓
            </div>
          {:else}
            <div class="bbox-tag-warning">
              ⚠️ Area too large: {store.areaKm2.toLocaleString()} km² (Max 10,000 km²)
            </div>
          {/if}
        {/if}
      </div>

      <div class="control-group">
        <div class="date-header">
          <span class="label-title">Date Range</span>
          <div class="date-quick-buttons">
            <button type="button" class="btn-quick-date" disabled={store.cargando} onclick={() => setDateRange(7)} title="Last 7 days">7d</button>
            <button type="button" class="btn-quick-date" disabled={store.cargando} onclick={() => setDateRange(30)} title="Last 30 days">30d</button>
            <button type="button" class="btn-quick-date" disabled={store.cargando} onclick={() => setDateRange(90)} title="Last 90 days">90d</button>
          </div>
        </div>
        <div class="grid-dates">
          <input 
            type="date" 
            aria-label="Start date" 
            bind:value={store.fechaInicio} 
            disabled={store.cargando}
            onchange={onInicioChange}
            onclick={abrirPicker}
          />
          <input 
            type="date" 
            aria-label="End date" 
            bind:value={store.fechaFin} 
            disabled={store.cargando}
            min={store.fechaInicio} 
            onclick={abrirPicker}
          />
        </div>
        {#if store.fechaInicio && store.fechaFin}
          {#if !store.rangoFechasValido}
            <div class="date-tag-warning">
              ⚠️ Range too wide ({store.diasRango} days). Maximum is 90 days.
            </div>
          {:else}
            <div class="date-info">
              {store.diasRango} {store.diasRango === 1 ? 'day' : 'days'} selected
            </div>
          {/if}
        {/if}
      </div>

      <div class="control-group">
        <label for="cloud-cover">Max Cloud Cover: {store.coberturaNubes}%</label>
        <input id="cloud-cover" type="range" min="0" max="100" bind:value={store.coberturaNubes} />
      </div>

      <div class="control-group">
        <label for="image-limit">Image Limit</label>
        <select id="image-limit" bind:value={store.maxResults}>
          <option value="all">All</option>
          <option value={20}>Max 20</option>
          <option value={50}>Max 50</option>
          <option value={100}>Max 100</option>
        </select>
      </div>

      <div class="control-group">
        <label for="band-combo">Band Combination</label>
        <select id="band-combo" bind:value={store.presetActivo}>
          {#each PRESETS as p}
            <option value={p.id}>{p.label}</option>
          {/each}
          <option disabled>──────────</option>
          <option value="custom">Custom...</option>
        </select>
        {#if store.presetActivo === 'custom'}
          <div class="grid-bandas">
            <label>R <select value={store.bandasCustom[0]} onchange={(e) => updateCustomBand(0, e.currentTarget.value)}>
              {#each BANDAS_DISPONIBLES as b}<option value={b}>{b}</option>{/each}
            </select></label>
            <label>G <select value={store.bandasCustom[1]} onchange={(e) => updateCustomBand(1, e.currentTarget.value)}>
              {#each BANDAS_DISPONIBLES as b}<option value={b}>{b}</option>{/each}
            </select></label>
            <label>B <select value={store.bandasCustom[2]} onchange={(e) => updateCustomBand(2, e.currentTarget.value)}>
              {#each BANDAS_DISPONIBLES as b}<option value={b}>{b}</option>{/each}
            </select></label>
          </div>
        {/if}
      </div>

      {#if store.escenasVisibles.size > 0}
        <div class="control-group">
          <label for="layer-opacity">Layer Opacity: {store.opacidadCapas}%</label>
          <input id="layer-opacity" type="range" min="0" max="100" bind:value={store.opacidadCapas} />
        </div>
      {/if}

      <button 
        class="btn-buscar" 
        disabled={!store.boundingBox || !store.areaValida || !store.fechaInicio || !store.fechaFin || !store.rangoFechasValido || store.cargando}
        onclick={onBuscar}
      >
        {store.cargando ? 'Loading images...' : 'Show the images'}
      </button>
    </div>
  {/if}
</aside>

<style>
  .panel-flotante {
    width: 320px;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    background: rgba(10, 10, 11, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    font-family: system-ui, -apple-system, sans-serif;
    transition: width 0.25s ease, height 0.25s ease;
    flex-shrink: 0;
  }

  .panel-flotante.colapsado {
    width: 48px;
    height: 48px;
    overflow: hidden;
  }

  .colapsado .panel-header {
    padding: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
  }

  .colapsado .panel-header h2 {
    display: none;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    gap: 8px;
    box-sizing: border-box;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #f3f4f6;
    white-space: nowrap;
  }

  .btn-toggle {
    width: 28px;
    height: 28px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
    cursor: pointer;
    font-size: 1.2rem;
    font-weight: 700;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #e5e7eb;
    flex-shrink: 0;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    transition: all 0.2s ease;
  }

  .btn-toggle:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: #0ea5e9;
    color: #38bdf8;
  }

  .panel-body {
    padding: 0 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 14px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label, .label-title {
    font-size: 0.72rem;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  select, input[type="date"] {
    padding: 8px 10px;
    background: rgba(20, 20, 24, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: #f3f4f6;
    font-size: 0.82rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    color-scheme: dark;
    cursor: pointer;
    width: 100%;
    box-sizing: border-box;
  }

  input[type="date"]::-webkit-calendar-picker-indicator {
    cursor: pointer;
    filter: invert(0.8);
    opacity: 0.85;
    transition: opacity 0.2s;
  }

  input[type="date"]::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
  }

  .date-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .date-quick-buttons {
    display: flex;
    gap: 4px;
  }

  .btn-quick-date {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #9ca3af;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.65rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-quick-date:hover {
    background: rgba(14, 165, 233, 0.2);
    border-color: #0ea5e9;
    color: #38bdf8;
  }

  select:focus, input[type="date"]:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.25);
  }

  input[type="range"] {
    accent-color: #0ea5e9;
    cursor: pointer;
    margin-top: 4px;
  }

  .grid-dates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .grid-bandas {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
    margin-top: 4px;
  }

  .grid-bandas label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.7rem;
    color: #9ca3af;
  }

  .grid-bandas select {
    padding: 4px 6px;
    font-size: 0.75rem;
  }

  .btn-tool {
    padding: 9px 12px;
    border: 1px solid rgba(14, 165, 233, 0.4);
    border-radius: 6px;
    cursor: pointer;
    text-align: center;
    background: rgba(14, 165, 233, 0.15);
    font-size: 0.85rem;
    font-weight: 600;
    color: #38bdf8;
    transition: all 0.2s ease;
  }

  .btn-tool:hover {
    background: rgba(14, 165, 233, 0.3);
    border-color: #0ea5e9;
    color: #fff;
  }

  .btn-tool.active {
    background: #0ea5e9;
    border-color: #38bdf8;
    color: #fff;
    box-shadow: 0 0 12px rgba(14, 165, 233, 0.5);
  }

  .btn-tool.disabled {
    background: rgba(255, 255, 255, 0.03);
    color: #6b7280;
    border: 1px dashed rgba(255, 255, 255, 0.1);
    cursor: not-allowed;
    font-weight: 400;
  }

  .btn-tool:disabled:not(.disabled),
  .btn-clear-aoi:disabled,
  .btn-quick-date:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-buscar {
    margin-top: 6px;
    padding: 12px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
  }

  .btn-buscar:hover:not(:disabled) {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
    box-shadow: 0 6px 18px rgba(14, 165, 233, 0.5);
    transform: translateY(-1px);
  }

  .btn-buscar:disabled {
    background: rgba(255, 255, 255, 0.08);
    color: #6b7280;
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }

  .bbox-tag {
    font-size: 0.75rem;
    color: #4ade80;
    background: rgba(74, 222, 128, 0.12);
    border: 1px solid rgba(74, 222, 128, 0.25);
    padding: 6px;
    border-radius: 6px;
    text-align: center;
    font-weight: 600;
  }

  .grid-tools {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .grid-tools .btn-tool {
    flex: 1;
  }

  .btn-clear-aoi {
    padding: 9px 12px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #f87171;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .btn-clear-aoi:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: #ef4444;
    color: #fff;
  }

  .bbox-tag-warning, .date-tag-warning {
    font-size: 0.72rem;
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.3);
    padding: 6px 8px;
    border-radius: 6px;
    line-height: 1.3;
    font-weight: 600;
  }

  .date-info {
    font-size: 0.7rem;
    color: #9ca3af;
    text-align: right;
  }

  @media (max-width: 600px) {
    .panel-flotante {
      width: 100%;
    }
    .panel-flotante.colapsado {
      width: 48px;
      height: 48px;
    }

    .grid-bandas {
      grid-template-columns: 1fr;
    }
  }
</style>
