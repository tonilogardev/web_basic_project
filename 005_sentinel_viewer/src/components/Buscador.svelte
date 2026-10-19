<script lang="ts">
  interface Place {
    display_name: string;
    lat: string;
    lon: string;
    boundingbox: string[];
  }

  let { onLugarSeleccionado } = $props<{
    onLugarSeleccionado: (place: Place) => void
  }>();

  let query = $state('');
  let resultados = $state<Place[]>([]);
  let buscando = $state(false);
  let mostrarResultados = $state(false);

  let timeout: ReturnType<typeof setTimeout>;

  function onInput() {
    clearTimeout(timeout);
    if (query.trim().length < 3) {
      resultados = [];
      mostrarResultados = false;
      return;
    }
    timeout = setTimeout(buscar, 500);
  }

  async function buscar() {
    buscando = true;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`);
      resultados = await res.json();
      mostrarResultados = resultados.length > 0;
    } catch (e) {
      console.error(e);
    } finally {
      buscando = false;
    }
  }

  function seleccionar(lugar: Place) {
    query = lugar.display_name.split(',')[0];
    mostrarResultados = false;
    onLugarSeleccionado(lugar);
  }
</script>

<div class="buscador-container">
  <div class="input-wrapper">
    <input 
      type="text" 
      bind:value={query} 
      oninput={onInput}
      placeholder="Search city or place..."
    />
    {#if buscando}
      <div class="spinner"></div>
    {/if}
  </div>

  {#if mostrarResultados}
    <ul class="resultados-lista">
      {#each resultados as lugar}
        <li>
          <button onclick={() => seleccionar(lugar)}>
            {lugar.display_name}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .buscador-container {
    position: absolute;
    top: 20px;
    right: 56px; /* Para no tapar los botones de zoom de MapLibre */
    width: 280px;
    z-index: 20;
    font-family: system-ui, sans-serif;
  }

  .input-wrapper {
    position: relative;
    width: 100%;
  }

  input {
    width: 100%;
    padding: 10px 14px;
    padding-right: 32px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(10, 10, 11, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
    font-size: 0.88rem;
    color: #f3f4f6;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  input::placeholder {
    color: #6b7280;
  }

  input:focus {
    border-color: #0ea5e9;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(14, 165, 233, 0.3);
  }

  .spinner {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: translateY(-50%) rotate(360deg); }
  }

  .resultados-lista {
    margin: 6px 0 0 0;
    padding: 0;
    list-style: none;
    background: rgba(10, 10, 11, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    max-height: 280px;
    overflow-y: auto;
  }

  .resultados-lista li button {
    width: 100%;
    text-align: left;
    padding: 10px 14px;
    border: none;
    background: none;
    font-size: 0.8rem;
    color: #d1d5db;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    transition: all 0.15s ease;
  }

  .resultados-lista li:last-child button {
    border-bottom: none;
  }

  .resultados-lista li button:hover {
    background: rgba(14, 165, 233, 0.15);
    color: #38bdf8;
  }

  @media (max-width: 600px) {
    .buscador-container {
      top: 10px;
      right: 56px;
      width: calc(100% - 76px);
    }
  }
</style>
