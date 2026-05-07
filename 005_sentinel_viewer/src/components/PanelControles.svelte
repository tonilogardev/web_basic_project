<script lang="ts">
  let {
    satelite = $bindable(),
    coberturaNubes = $bindable(),
    fechaInicio = $bindable(),
    fechaFin = $bindable(),
    boundingBox,
    onDibujarRectangulo,
    onBuscar
  } = $props();

  let colapsado = $state(false);

  const satelites = [
    { id: "sentinel-1", name: "Sentinel-1", enabled: false },
    { id: "sentinel-2", name: "Sentinel-2", enabled: true },
    { id: "sentinel-3", name: "Sentinel-3", enabled: false }
  ];
</script>

<aside class="panel-flotante" class:colapsado>
  <div class="panel-header">
    <h2>Visor Copernicus</h2>
    <button class="btn-toggle" onclick={() => colapsado = !colapsado} aria-label={colapsado ? 'Expandir panel' : 'Colapsar panel'}>
      {colapsado ? '+' : '−'}
    </button>
  </div>

  {#if !colapsado}
    <div class="panel-body">
      <div class="control-group">
        <label for="satelite">Satélite</label>
        <select id="satelite" bind:value={satelite}>
          {#each satelites as sat}
            <option value={sat.id} disabled={!sat.enabled}>
              {sat.name} {!sat.enabled ? '(Próximamente)' : ''}
            </option>
          {/each}
        </select>
      </div>

      <div class="control-group">
        <label>Zona de Interés (AOI)</label>
        <button class="btn-tool active" onclick={onDibujarRectangulo}>
          Dibujar Rectángulo
        </button>
        <button class="btn-tool disabled" disabled>Municipios (PMTiles)</button>
        <button class="btn-tool disabled" disabled>Subir SHP</button>

        {#if boundingBox}
          <div class="bbox-tag">Área seleccionada ✓</div>
        {/if}
      </div>

      <div class="control-group">
        <label>Rango de Fechas</label>
        <div class="grid-dates">
          <input type="date" bind:value={fechaInicio} />
          <input type="date" bind:value={fechaFin} min={fechaInicio} />
        </div>
      </div>

      <div class="control-group">
        <label>Nubes máxima: {coberturaNubes}%</label>
        <input type="range" min="0" max="100" bind:value={coberturaNubes} />
      </div>

      <button 
        class="btn-buscar" 
        disabled={!boundingBox || !fechaInicio || !fechaFin}
        onclick={onBuscar}
      >
        Show the images
      </button>
    </div>
  {/if}
</aside>

<style>
  .panel-flotante {
    position: absolute;
    top: 20px;
    left: 20px;
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
    z-index: 10;
    font-family: system-ui, -apple-system, sans-serif;
    transition: width 0.25s ease;
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
  }

  .grid-dates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .btn-tool {
    padding: 10px; border: 1px solid #ddd; border-radius: 4px;
    cursor: pointer; text-align: left; background: #fff; font-size: 0.85rem;
  }
  .btn-tool.active { border-color: #2196f3; color: #2196f3; font-weight: 600; }
  .btn-tool.disabled { background: #f9f9f9; color: #aaa; border-style: dashed; cursor: not-allowed; }

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
      top: auto;
      bottom: 20px;
      left: 10px;
      right: 10px;
      width: auto;
      max-height: 45vh;
    }
    .panel-flotante.colapsado {
      width: auto;
      max-height: auto;
    }
  }
</style>