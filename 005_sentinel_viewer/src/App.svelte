<script lang="ts">
  import { onMount } from 'svelte';
  import { MapLibre, NavigationControl } from 'svelte-maplibre-gl';
  import MapboxDraw from '@mapbox/mapbox-gl-draw';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

  // --- ESTADO (Svelte 5 Runes) ---
  let satelites = [
    { id: "sentinel-1", name: "Sentinel-1", enabled: false },
    { id: "sentinel-2", name: "Sentinel-2", enabled: true },
    { id: "sentinel-3", name: "Sentinel-3", enabled: false }
  ];

  let sateliteSeleccionado = $state("sentinel-2");
  let coberturaNubes = $state(20);
  let fechaInicio = $state("");
  let fechaFin = $state("");
  let boundingBox = $state<number[] | null>(null);
  let mapInstance = $state<any>(null);
  let drawInstance = $state<any>(null);

  // --- LÓGICA DEL MAPA ---
  function initDraw(map: any) {
    drawInstance = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: false, // Usaremos un modo personalizado o lógica simple para el rectángulo después
        trash: true
      },
      // Restringimos a un solo elemento para no ensuciar el mapa
      defaultMode: 'simple_select'
    });

    map.addControl(drawInstance);

    map.on('draw.create', updateBBox);
    map.on('draw.update', updateBBox);
    map.on('draw.delete', () => boundingBox = null);
  }

  function activarDibujoRectangulo() {
    if (!drawInstance) return;
    drawInstance.changeMode('draw_polygon'); 
    // Nota: Por simplicidad inicial usamos polygon, en la siguiente iteración 
    // inyectaremos el modo 'rectángulo' específico para mayor precisión.
  }

  function updateBBox(e: any) {
    const feature = e.features[0];
    if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0];
      const lngs = coords.map((c: any) => c[0]);
      const lats = coords.map((c: any) => c[1]);
      boundingBox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    }
  }

  function buscarImagenes() {
    console.log("Consultando Catálogo STAC de Copernicus...", {
      bbox: boundingBox,
      start: fechaInicio,
      end: fechaFin,
      cloud: coberturaNubes
    });
  }
</script>

<main class="visor-layout">
  <aside class="panel-controles">
    <h2>Visor Copernicus</h2>
    
    <section class="control-group">
      <label for="satelite">Satélite</label>
      <select id="satelite" bind:value={sateliteSeleccionado}>
        {#each satelites as sat}
          <option value={sat.id} disabled={!sat.enabled}>
            {sat.name} {!sat.enabled ? '(Próximamente)' : ''}
          </option>
        {/each}
      </select>
    </section>

    <section class="control-group">
      <label>Zona de Interés (AOI)</label>
      <button class="btn-tool active" onclick={activarDibujoRectangulo}>
        Seleccionar Rectángulo
      </button>
      <button class="btn-tool disabled" disabled>Municipios (PMTiles)</button>
      <button class="btn-tool disabled" disabled>Importar SHP</button>
      
      {#if boundingBox}
        <div class="bbox-info">
          BBOX: {boundingBox.map(n => n.toFixed(3)).join(', ')}
        </div>
      {/if}
    </section>

    <section class="control-group">
      <label>Rango de Fechas</label>
      <div class="grid-2">
        <input type="date" bind:value={fechaInicio} />
        <input type="date" bind:value={fechaFin} min={fechaInicio} />
      </div>
    </section>

    <section class="control-group">
      <label>Nubosidad máxima: {coberturaNubes}%</label>
      <input type="range" min="0" max="100" bind:value={coberturaNubes} />
    </section>

    <button 
      class="btn-primary" 
      onclick={buscarImagenes}
      disabled={!boundingBox || !fechaInicio || !fechaFin}
    >
      Show the images
    </button>
  </aside>

  <section class="mapa-view">
    <MapLibre
      style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      standardControls
      on:load={(e) => initDraw(e.detail.map)}
    >
      <NavigationControl position="top-right" />
    </MapLibre>
  </section>
</main>

<style>
  /* Layout Base */
  .visor-layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
  .panel-controles { 
    width: 320px; background: #fff; padding: 20px; 
    display: flex; flex-direction: column; gap: 20px;
    border-right: 1px solid #eee; z-index: 2;
  }
  .mapa-view { flex-grow: 1; position: relative; background: #f0f0f0; }

  /* Componentes UI */
  .control-group { display: flex; flex-direction: column; gap: 8px; }
  label { font-size: 0.8rem; font-weight: bold; color: #666; text-transform: uppercase; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  
  .btn-tool { 
    padding: 10px; border: 1px solid #ddd; border-radius: 4px; 
    cursor: pointer; text-align: left; background: #fff;
  }
  .btn-tool.active { border-color: #2196f3; color: #2196f3; font-weight: bold; }
  .btn-tool.disabled { background: #f9f9f9; color: #ccc; cursor: not-allowed; border-style: dashed; }
  
  .btn-primary { 
    margin-top: auto; padding: 15px; background: #2196f3; color: #fff; 
    border: none; border-radius: 4px; font-weight: bold; cursor: pointer;
  }
  .btn-primary:disabled { background: #eee; color: #aaa; cursor: not-allowed; }

  .bbox-info { font-size: 0.7rem; color: #4caf50; background: #e8f5e9; padding: 5px; border-radius: 3px; }
</style>