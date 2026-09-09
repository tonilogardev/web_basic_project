<script lang="ts">
  import { capasState, updateCapaState, toggleGranulo } from '../state/capasState.svelte';

  // Group active layers by granulo for display
  let groupedLayers = $derived(() => {
    const groups: Record<string, typeof capasState.capasActivas> = {};
    for (const capa of capasState.capasActivas) {
      if (!groups[capa.granulo]) {
        groups[capa.granulo] = [];
      }
      groups[capa.granulo].push(capa);
    }
    return groups;
  });
</script>

{#if capasState.seleccionados.length > 0}
  <aside class="panel-capas-activas">
    <div class="panel-header">
      <h2>Active Layers</h2>
    </div>

    <div class="panel-body">
      {#each Object.entries(groupedLayers()) as [granulo, capas]}
        <div class="granulo-group">
          <div class="granulo-title-wrapper">
            <div class="granulo-title">{granulo}</div>
            <button class="btn-delete" onclick={() => toggleGranulo(granulo)} title="Remove {granulo}">×</button>
          </div>
          
          {#each capas as capa}
            <div class="layer-control">
              <label class="layer-visibility">
                <input 
                  type="checkbox" 
                  checked={capa.visible} 
                  onchange={(e) => updateCapaState(capa.id, { visible: e.currentTarget.checked })}
                />
                <span class="layer-name">{capa.tipo}</span>
              </label>
              
              <div class="layer-opacity">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={capa.opacidad}
                  oninput={(e) => updateCapaState(capa.id, { opacidad: parseFloat(e.currentTarget.value) })}
                />
              </div>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </aside>
{/if}

<style>
  .panel-capas-activas {
    width: 280px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    font-family: system-ui, sans-serif;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    /* max-height handled by parent container now or can stay here to limit growth */
    max-height: 400px;
  }

  .panel-header {
    background: #1e293b;
    color: white;
    padding: 12px 16px;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .panel-body {
    padding: 12px 16px;
    overflow-y: auto;
  }

  .granulo-group {
    margin-bottom: 16px;
    border-bottom: 1px solid #eee;
    padding-bottom: 12px;
  }
  
  .granulo-group:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .granulo-title-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .granulo-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #334155;
    margin-bottom: 0;
  }

  .btn-delete {
    background: none;
    border: none;
    color: #ef4444;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .btn-delete:hover {
    background: #fee2e2;
  }

  .layer-control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .layer-visibility {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    color: #475569;
    width: 80px;
  }

  .layer-opacity {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .layer-opacity input[type="range"] {
    width: 100%;
    margin: 0;
  }
</style>
