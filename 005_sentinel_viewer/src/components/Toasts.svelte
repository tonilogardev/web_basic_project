<script lang="ts">
  import { store } from '../lib/store.svelte';
</script>

{#if store.cargando || store.cargaCapasPendiente}
  <div class="blocking-backdrop" aria-hidden="true"></div>
  <div class="toast-loading">
    <div class="loader-spinner"></div>
    <div class="toast-content">
      <span>{store.mensajeCarga || 'Loading...'}</span>
      <div class="progress-bg">
        {#if store.progresoCarga > 0}
          <div class="progress-fill" style="width: {store.progresoCarga}%"></div>
        {:else}
          <div class="progress-pulse"></div>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if store.mensajeExito}
  <div class="toast-success">
    ✓ {store.mensajeExito}
  </div>
{/if}

<style>
  .blocking-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    z-index: 9998;
    cursor: wait;
    pointer-events: all;
  }

  .toast-loading {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(10, 10, 11, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 14px;
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 10px 25px rgba(0,0,0,0.6);
    font-family: system-ui, sans-serif;
    animation: slideUp 0.3s ease;
  }

  .toast-success {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(10, 10, 11, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 12px 24px;
    border-radius: 8px;
    color: #4ade80;
    font-weight: 600;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 14px;
    border: 1px solid rgba(255,255,255,0.1);
    border-color: #4ade80;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    font-family: system-ui, sans-serif;
    animation: slideUp 0.3s ease;
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
    position: relative;
  }

  .progress-fill {
    height: 100%;
    background: #0ea5e9;
    transition: width 0.3s ease;
  }

  .progress-pulse {
    width: 45%;
    height: 100%;
    background: #0ea5e9;
    border-radius: 2px;
    animation: indeterminate 1.4s infinite ease-in-out;
  }

  @keyframes indeterminate {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(250%); }
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
