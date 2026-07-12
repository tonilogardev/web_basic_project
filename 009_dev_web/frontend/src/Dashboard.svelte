<script lang="ts">
  import { onMount } from 'svelte';
  import MapComponent from './lib/Map.svelte';

  export let userRoles: string[] = [];
  export let username: string = '';

  let assets: any[] = [];
  let totalExposure: number = 0;
  let loading = true;
  let error = '';

  // Filtro de Hazard
  let selectedHazardId: number = 0;
  $: filteredAssets = selectedHazardId === 0 
    ? assets 
    : assets.filter(a => a.AssetHazardExposure?.some((exp: any) => exp.hazard_id === selectedHazardId || exp.Hazard?.id === selectedHazardId));


  // Estados del Formulario Modal
  let showAddForm = false;
  let isSelectingLocation = false;
  let newName = '';
  let newLat = 40.4168;
  let newLng = -3.7038;
  let newCat = 1;
  let newValue = 0;
  let newHazardId = 0;
  let newExposureValue = 0;
  let newConditionId = 0;
  let formError = '';
  let focusLocation: { lat: number, lng: number } | null = null;

  onMount(async () => {
    await fetchAssets();
  });

  async function fetchAssets() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/assets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar activos (401)');
      assets = await res.json();

      const resTotal = await fetch('/api/assets/total-exposure', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resTotal.ok) {
        const dataTotal = await resTotal.json();
        totalExposure = dataTotal.totalExposure;
      }
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function createAsset() {
    formError = '';
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newName,
          latitude: newLat,
          longitude: newLng,
          category_id: newCat,
          base_value: newValue,
          hazard_id: newHazardId > 0 ? newHazardId : undefined,
          exposure_value: newHazardId > 0 ? newExposureValue : undefined,
          condition_id: newConditionId > 0 ? newConditionId : undefined
        })
      });

      if (!res.ok) throw new Error('No tienes permisos o datos inválidos');
      
      showAddForm = false;
      await fetchAssets(); // Recargar datos
    } catch (e: any) {
      formError = e.message;
    }
  }

  async function deleteAsset(id: number) {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al borrar. No tienes permisos.');
      await fetchAssets(); // Recargar datos
    } catch (e: any) {
      alert(e.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.hash = '#login';
  }

  function handleLocationSelected(event: CustomEvent) {
    newLat = event.detail.lat;
    newLng = event.detail.lng;
    isSelectingLocation = false;
    showAddForm = true;
  }

  function handleAssetClick(asset: any) {
    focusLocation = { lat: parseFloat(asset.latitude), lng: parseFloat(asset.longitude) };
  }
</script>

<div class="dashboard-container">
  <header>
    <div class="logo">DataSphere</div>
    <div class="user-info">
      <span class="user-badge">{username} <small>({userRoles.join(', ')})</small></span>
      <button class="logout-btn" on:click={handleLogout}>Salir</button>
    </div>
  </header>

  <main class="dashboard-content">
    
    <!-- WIDGET IZQUIERDO -->
    <aside class="assets-widget">
      <div class="widget-header">
        <h2>Cartera de Activos</h2>
        <div class="exposure-badge">
          <span>Exposición Total</span>
          <strong>{totalExposure.toLocaleString()} €</strong>
        </div>
        
        {#if userRoles.includes('READ_WRITE')}
          {#if isSelectingLocation}
            <button class="add-btn cancel-selection" on:click={() => isSelectingLocation = false}>
              Cancelar Selección
            </button>
          {:else}
            <button class="add-btn" on:click={() => isSelectingLocation = true}>
              + Añadir Activo
            </button>
          {/if}
        {/if}
      </div>

      <div class="filter-section" style="padding: 0 1.5rem; margin-top: 1rem;">
        <label style="font-size: 0.85rem; font-weight: bold; color: #4a5568;">Filtrar por Peligro (Hazard):</label>
        <select bind:value={selectedHazardId} style="width: 100%; padding: 0.5rem; margin-top: 0.25rem; border-radius: 4px; border: 1px solid var(--border);">
          <option value={0}>Todos los activos</option>
          <option value={1}>Tornado</option>
          <option value={2}>Earthquake</option>
          <option value={3}>Rainstorm</option>
          <option value={4}>Hurricane</option>
          <option value={5}>Volcano</option>
        </select>
      </div>

      <div class="assets-list">
        {#if loading}
          <div class="loading-state">Cargando datos seguros...</div>
        {:else if error}
          <div class="error-state">{error}</div>
        {:else if filteredAssets.length === 0}
          <div class="empty-state">No hay activos que cumplan el filtro.</div>
        {:else}
          {#each filteredAssets as asset}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="asset-card" style="cursor: pointer;" on:click={() => handleAssetClick(asset)}>
              <div class="card-header">
                <div class="asset-category">{asset.name} <small style="color:#718096;font-size:0.8rem;">(ID:{asset.id})</small></div>
                {#if userRoles.includes('READ_WRITE')}
                  <button class="delete-btn" on:click|stopPropagation={() => deleteAsset(asset.id)}>X</button>
                {/if}
              </div>
              <div class="asset-value">Categoría: {asset.Category?.name || 'Desconocida'}</div>
              <div class="asset-value" style="margin-top:-0.5rem">Base: {Number(asset.base_value || 0).toLocaleString()} €</div>
              
              {#if asset.AssetHazardExposure?.length > 0}
                <div class="asset-hazards">
                  {#each asset.AssetHazardExposure as exp}
                    <span class="hazard-tag">{exp.Hazard.name} ({exp.exposure_value.toLocaleString()}€)</span>
                  {/each}
                </div>
              {/if}
              
              {#if asset.AssetConditions?.length > 0}
                <div class="asset-conditions">
                  {#each asset.AssetConditions as cond}
                    <span class="condition-tag">{cond.Condition.name}</span>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </aside>

    <!-- MAPA DERECHO -->
    <section class="map-section">
      {#if isSelectingLocation}
        <div class="selection-banner">
          Haz clic en cualquier punto del mapa para ubicar el activo
        </div>
      {/if}
      {#if !loading && !error}
        <MapComponent assets={filteredAssets} {isSelectingLocation} {focusLocation} on:locationSelected={handleLocationSelected} />
      {/if}
    </section>

  </main>

  <!-- MODAL FORMULARIO CSS PURO -->
  {#if showAddForm}
    <div class="modal-backdrop">
      <div class="modal-content">
        <h3>Nuevo Activo</h3>
        {#if formError}<p class="error-state">{formError}</p>{/if}
        
        <label>Nombre identificativo:
          <input type="text" bind:value={newName} placeholder="Ej: Nave Logística 1" />
        </label>
        <div class="coord-inputs">
          <label>Latitud: <input type="number" bind:value={newLat} readonly /></label>
          <label>Longitud: <input type="number" bind:value={newLng} readonly /></label>
        </div>
        <label>Categoría:
          <select bind:value={newCat}>
            <option value={1}>Industrial</option>
            <option value={2}>Residencial</option>
            <option value={3}>Agrícola</option>
            <option value={4}>Infraestructura Crítica</option>
          </select>
        </label>
        <label>Valor Base (€):
          <input type="number" bind:value={newValue} />
        </label>
        
        <div class="divider">Extras (Opcional)</div>
        <label>Riesgo Asociado:
          <select bind:value={newHazardId}>
            <option value={0}>-- Ninguno --</option>
            <option value={1}>Tornado</option>
            <option value={2}>Terremoto</option>
            <option value={3}>Inundación</option>
            <option value={4}>Huracán</option>
            <option value={5}>Incendio Forestal</option>
          </select>
        </label>
        {#if newHazardId > 0}
          <label>Valor Expuesto al Riesgo (€):
            <input type="number" bind:value={newExposureValue} />
          </label>
        {/if}

        <label>Condición o Zona:
          <select bind:value={newConditionId}>
            <option value={0}>-- Ninguna --</option>
            <option value={1}>Cerca de la costa</option>
            <option value={2}>Zona Sísmica Activa</option>
            <option value={3}>Estructura Antigua</option>
            <option value={4}>Sismorresistente</option>
          </select>
        </label>

        <div class="modal-actions">
          <button class="cancel-btn" on:click={() => showAddForm = false}>Cancelar</button>
          <button class="save-btn" on:click={createAsset}>Guardar</button>
        </div>
      </div>
    </div>
  {/if}

</div>

<style>
  .dashboard-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: var(--bg-color);
    overflow: hidden;
  }

  header {
    background-color: var(--card-bg);
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    z-index: 10;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--accent);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .user-badge {
    font-size: 0.95rem;
    font-weight: 600;
  }
  .user-badge small {
    font-weight: normal;
    color: #718096;
  }

  button { cursor: pointer; }

  .logout-btn {
    padding: 0.4rem 1rem;
    background-color: transparent;
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 4px;
  }

  .logout-btn:hover {
    background-color: var(--accent);
    color: white;
  }

  .dashboard-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .assets-widget {
    width: 380px;
    background-color: var(--card-bg);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 5px rgba(0,0,0,0.02);
    z-index: 5;
  }

  .widget-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .widget-header h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: #1a202c;
  }

  .exposure-badge {
    background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
    color: white;
    padding: 1rem;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
  }
  .exposure-badge span {
    font-size: 0.8rem;
    text-transform: uppercase;
  }
  .exposure-badge strong {
    font-size: 1.5rem;
    margin-top: 0.25rem;
  }

  .add-btn {
    width: 100%;
    padding: 0.75rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
  }
  .cancel-selection {
    background: #e53e3e;
  }

  .assets-list {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .asset-card {
    background: #f7fafc;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .asset-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .asset-category {
    font-weight: 600;
    font-size: 1.1rem;
    color: #2d3748;
  }

  .delete-btn {
    background: transparent;
    color: #e53e3e;
    border: none;
    font-weight: bold;
  }

  .asset-value {
    font-size: 0.9rem;
    color: #4a5568;
    margin-bottom: 0.75rem;
  }

  .asset-hazards {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }
  .hazard-tag {
    font-size: 0.75rem;
    background: #fed7d7;
    color: #c53030;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    display: inline-block;
  }
  .asset-conditions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  .condition-tag {
    font-size: 0.75rem;
    background: #e2e8f0;
    color: #4a5568;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  .loading-state, .error-state, .empty-state {
    text-align: center;
    padding: 2rem 0;
    color: #718096;
    font-size: 0.95rem;
  }

  .map-section {
    flex: 1;
    background-color: #e2e8f0;
    position: relative;
    padding: 1rem;
    display: flex;
    flex-direction: column;
  }
  .selection-banner {
    position: absolute;
    top: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(43, 108, 176, 0.95);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 20px;
    font-weight: bold;
    z-index: 20;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    pointer-events: none;
  }

  /* MODAL */
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }
  .modal-content {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    width: 300px;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  }
  .modal-content label {
    display: block;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    font-weight: bold;
  }
  .modal-content input, .modal-content select {
    width: 100%;
    margin-top: 0.25rem;
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    box-sizing: border-box;
  }
  .coord-inputs {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .coord-inputs label { margin-bottom: 0; }
  .coord-inputs input { background-color: #f7fafc; color: #718096; }
  .divider {
    font-size: 0.8rem;
    color: #a0aec0;
    text-transform: uppercase;
    font-weight: bold;
    margin: 1.5rem 0 0.5rem 0;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.25rem;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  .cancel-btn {
    background: #e2e8f0;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
  .save-btn {
    background: #48bb78;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
</style>
