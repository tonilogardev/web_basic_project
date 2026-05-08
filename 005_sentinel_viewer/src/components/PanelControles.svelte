<script lang="ts">
  import { store, BANDAS_DISPONIBLES, PRESETS } from '../lib/store.svelte';

  interface Props {
    onDibujarRectangulo?: () => void;
    onBuscar?: () => void;
  }

  let { onDibujarRectangulo, onBuscar }: Props = $props();

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
        <label>Area of Interest (AOI)</label>
        <button class="btn-tool" class:active={store.modoDibujo} onclick={onDibujarRectangulo}>
          Draw Rectangle
        </button>
        <button class="btn-tool disabled" disabled>Municipalities (PMTiles)</button>
        <button class="btn-tool disabled" disabled>Upload SHP</button>

        {#if store.boundingBox}
          <div class="bbox-tag">Area selected ✓</div>
        {/if}
      </div>

      <div class="control-group">
        <label>Date Range</label>
        <div class="grid-dates">
          <input type="date" bind:value={store.fechaInicio} />
          <input type="date" bind:value={store.fechaFin} min={store.fechaInicio} />
        </div>
      </div>

      <div class="control-group">
        <label>Max Cloud Cover: {store.coberturaNubes}%</label>
        <input type="range" min="0" max="100" bind:value={store.coberturaNubes} />
      </div>

      <div class="control-group">
        <label>Image Limit</label>
        <select bind:value={store.maxResults}>
          <option value="all">All</option>
          <option value={20}>Max 20</option>
          <option value={50}>Max 50</option>
          <option value={100}>Max 100</option>
        </select>
      </div>

      <div class="control-group">
        <label>Band Combination</label>
        <select bind:value={store.presetActivo}>
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

      <button 
        class="btn-buscar" 
        disabled={!store.boundingBox || !store.fechaInicio || !store.fechaFin || store.cargando}
        onclick={onBuscar}
      >
        Show the images
      </button>
    </div>
  {/if}
</aside>

<style>
  .panel-flotante {
    width: 320px;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    padding: 0;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    display: flex;
    flex-direction: column;
    font-family: system-ui, -apple-system, sans-serif;
    transition: width 0.25s ease;
    flex-shrink: 0;
  }

  .panel-flotante.colapsado {
    width: 56px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    gap: 8px;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 1.1rem;
    color: #222;
    white-space: nowrap;
  }

  .colapsado .panel-header h2 {
    display: none;
  }

  .btn-toggle {
    width: 28px;
    height: 28px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    font-size: 1.2rem;
    font-weight: 700;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #555;
    flex-shrink: 0;
  }

  .btn-toggle:hover {
    background: #f0f0f0;
    border-color: #2196f3;
    color: #2196f3;
  }

  .panel-body {
    padding: 0 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    border-top: 1px solid #eee;
    padding-top: 14px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: 0.75rem;
    font-weight: 700;
    color: #555;
    text-transform: uppercase;
  }

  select, input {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.85rem;
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
  }

  .grid-bandas label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.7rem;
    color: #555;
  }

  .grid-bandas select {
    padding: 4px 6px;
    font-size: 0.75rem;
  }

  .btn-tool {
    padding: 10px; border: none; border-radius: 6px;
    cursor: pointer; text-align: center; background: #2196f3; font-size: 0.85rem;
    font-weight: 700; color: white; transition: all 0.2s ease;
    box-shadow: 0 2px 6px rgba(33, 150, 243, 0.4);
  }
  .btn-tool:hover { background: #1976d2; box-shadow: 0 4px 10px rgba(33, 150, 243, 0.5); }
  .btn-tool.active { background: #0d47a1; box-shadow: inset 0 3px 6px rgba(0,0,0,0.3); }
  .btn-tool.disabled { background: #f9f9f9; color: #aaa; border: 1px dashed #ccc; cursor: not-allowed; box-shadow: none; font-weight: 400; }

  .btn-buscar {
    margin-top: 4px; padding: 12px; background: #2196f3; color: white;
    border: none; border-radius: 4px; font-weight: bold; cursor: pointer;
  }
  .btn-buscar:disabled { background: #ccc; cursor: not-allowed; }

  .bbox-tag {
    font-size: 0.75rem; color: #2e7d32; background: #e8f5e9;
    padding: 4px; border-radius: 4px; text-align: center;
  }

  @media (max-width: 600px) {
    .panel-flotante {
      width: 100%;
    }
    .panel-flotante.colapsado {
      width: 56px;
    }

    .grid-bandas {
      grid-template-columns: 1fr;
    }
  }
</style>
