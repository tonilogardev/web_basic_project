<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    capasState, 
    toggleGranulo, 
    selectAllGranulos, 
    selectNoneGranulos, 
    invertSelectionGranulos 
  } from '../state/capasState.svelte';

  let colapsado = $state(false);
  let listaDesplegada = $state(false);
  
  let opciones = $state<string[]>([]);
  let cargando = $state(true);

  onMount(async () => {
    try {
      // Cargamos dinámicamente el inventario generado por Python en el directorio montado (/data)
      const res = await fetch(`/data/inventory.json?t=${Date.now()}`);
      if (res.ok) {
        const inventory = await res.json();
        const granulosValidos: string[] = [];
        for (const date in inventory) {
          for (const tile of inventory[date]) {
            granulosValidos.push(`${date}_${tile}`);
          }
        }
        // Orden descendente: las fechas más recientes de agosto primero
        opciones = granulosValidos.sort().reverse();
      } else {
        console.warn("No se pudo cargar /data/inventory.json");
      }
    } catch (e) {
      console.error("Error al cargar inventario PMTiles", e);
    } finally {
      cargando = false;
    }
  });
  
  let ultimoIndiceSeleccionado = $state<number | null>(null);
  
  /**
   * Maneja el evento de selección individual de un gránulo en la lista desplegable.
   * Soporta selección múltiple contigua manteniendo pulsada la tecla Shift.
   * @param granulo Identificador base del gránulo
   * @param index Índice de posición en la lista actual
   * @param event Evento MouseEvent original del navegador
   */
  function handleSelect(granulo: string, index: number, event: MouseEvent) {
    // Si se pulsa Shift y tenemos un índice anterior, seleccionamos el rango
    if (event.shiftKey && ultimoIndiceSeleccionado !== null) {
      const start = Math.min(ultimoIndiceSeleccionado, index);
      const end = Math.max(ultimoIndiceSeleccionado, index);
      
      const nuevosSeleccionados = new Set(capasState.seleccionados);
      // Extraemos solo los de este rango que no esten ya
      for (let i = start; i <= end; i++) {
        if (!capasState.seleccionados.includes(opciones[i])) {
          toggleGranulo(opciones[i]);
        }
      }
    } else {
      // Comportamiento normal de toggle
      toggleGranulo(granulo);
    }
    ultimoIndiceSeleccionado = index;
  }
</script>

<aside class="panel-flotante" class:colapsado>
  <div class="panel-header">
    <h2>PMTiles Images</h2>
    <button class="btn-toggle" onclick={() => colapsado = !colapsado} aria-label={colapsado ? 'Expand panel' : 'Collapse panel'}>
      {colapsado ? '+' : '−'}
    </button>
  </div>

  {#if !colapsado}
    <div class="panel-body">
      <div class="control-group">
        <span class="fake-label">PMTiles Granules</span>
        
        <!-- Widget desplegable (ocupa el espacio horizontal) -->
        <div class="dropdown-widget">
          <button class="dropdown-header" onclick={() => listaDesplegada = !listaDesplegada}>
            <span>Select images ({capasState.seleccionados.length})</span>
            <span class="arrow" class:open={listaDesplegada}>▼</span>
          </button>
          
          {#if listaDesplegada}
            <div class="toolbar-seleccion">
              <button class="btn-tool" onclick={() => selectAllGranulos(opciones)}>All</button>
              <button class="btn-tool" onclick={selectNoneGranulos}>None</button>
              <button class="btn-tool" onclick={() => invertSelectionGranulos(opciones)}>Invert</button>
            </div>
            <div class="lista-multi-selector">
              {#each opciones as granulo, index}
                <label class="checkbox-label" class:selected={capasState.seleccionados.includes(granulo)}>
                  <input 
                    type="checkbox" 
                    checked={capasState.seleccionados.includes(granulo)}
                    onclick={(e) => handleSelect(granulo, index, e)}
                  />
                  {granulo}
                </label>
              {/each}
              
              {#if cargando}
                <p class="empty-state">Cargando inventario...</p>
              {:else if opciones.length === 0}
                <p class="empty-state">No PMTiles found in /data</p>
              {/if}
            </div>
          {/if}
        </div>
        
      </div>
    </div>
  {/if}
</aside>

<style>
  .panel-flotante {
    width: 280px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: system-ui, sans-serif;
  }

  .panel-flotante.colapsado {
    width: 48px;
    height: 48px;
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
  }

  .panel-header h2 {
    margin: 0;
    font-size: 1.1rem;
    color: #222;
    white-space: nowrap;
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
    padding: 0;
    margin: 0;
    box-sizing: border-box;
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
    gap: 8px;
  }

  .control-group .fake-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: #555;
    text-transform: uppercase;
  }

  .dropdown-widget {
    width: 100%;
    display: flex;
    flex-direction: column;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff;
  }

  .dropdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    background: #fdfdfd;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
    color: #333;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .dropdown-header:hover {
    background: #f0f0f0;
  }

  .arrow {
    font-size: 0.7rem;
    transition: transform 0.2s ease;
  }

  .arrow.open {
    transform: rotate(180deg);
  }

  .toolbar-seleccion {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    background: #f8f9fa;
    border-top: 1px solid #eee;
  }

  .btn-tool {
    flex: 1;
    padding: 4px 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #555;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-tool:hover {
    background: #e3f2fd;
    border-color: #2196f3;
    color: #1976d2;
  }

  .lista-multi-selector {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 300px;
    overflow-y: auto;
    border-top: 1px solid #eee;
    padding: 6px;
    background: #fff;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    color: #333;
    text-transform: none;
    font-weight: normal;
    transition: background 0.2s;
  }

  .checkbox-label:hover {
    background: #f5f5f5;
  }

  .checkbox-label.selected {
    background: #e3f2fd;
    color: #1976d2;
    font-weight: 600;
  }

  .checkbox-label input {
    cursor: pointer;
  }

  .empty-state {
    padding: 12px;
    text-align: center;
    color: #888;
    font-size: 0.85rem;
  }

  @media (max-width: 768px) {
    .panel-flotante {
      width: 100%;
      max-width: 320px;
    }
    .panel-flotante.colapsado {
      width: 48px;
      height: 48px;
    }
    .lista-multi-selector {
      max-height: 200px;
    }
  }
</style>
