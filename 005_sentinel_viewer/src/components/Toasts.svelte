<script lang="ts">
  import { store } from '../lib/store.svelte';
</script>

{#if store.cargando || store.cargaInicialPendiente}
  <div class="toast-loading">
    <div class="loader-spinner"></div>
    <div class="toast-content">
      <span>Loading ...</span>
      <div class="progress-bg"><div class="progress-fill" style="width: {store.progresoCarga}%"></div></div>
    </div>
  </div>
{/if}

{#if store.mensajeExito}
  <div class="toast-success">
    ✓ {store.mensajeExito}
  </div>
{/if}

<style>
  .toast-loading, .toast-success {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(10, 10, 11, 0.9);
    backdrop-filter: blur(10px);
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 14px;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    font-family: system-ui, sans-serif;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  .toast-success {
    border-color: #4ade80;
    color: #4ade80;
    font-weight: 600;
  }

  .toast-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .toast-content span {
    font-size: 0.85rem;
    font-weight: 600;
    color: #e5e7eb;
  }

  .progress-bg {
    width: 120px;
    height: 4px;
    background: rgba(255,255,255,0.2);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #2196f3;
    transition: width 0.3s ease;
  }

  .loader-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
