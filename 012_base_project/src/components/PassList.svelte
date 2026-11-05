<script lang="ts">
  import { store } from '../lib/store.svelte';
  import { SearchController } from '../lib/controllers/SearchController';
  import { draggable } from '../lib/draggable';
  import PassCard from './PassCard.svelte';

  let isCollapsed = $state(false);

  function handleToggle(passId: string) {
    SearchController.selectPass(passId);
  }

  function handleOpacity(passId: string, opacity: number) {
    SearchController.setPassOpacity(passId, opacity);
  }

  function hideImagery() {
    SearchController.hideActivePass();
  }
</script>

{#if store.passes.length > 0 || store.isSearching || store.searchError}
  <aside
    class="pass-list-panel"
    use:draggable={{ handleSelector: '.panel-drag-handle', initialPosition: { x: window.innerWidth - 370, y: 70 } }}
  >
    <div class="panel-header panel-drag-handle">
      <div class="header-title">
        <span class="icon">🛰️</span>
        <h2>Passes ({store.passes.length})</h2>
      </div>
      <div class="header-actions">
        <button
          type="button"
          class="btn-icon-tiny"
          onclick={() => (isCollapsed = !isCollapsed)}
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {isCollapsed ? '➕' : '➖'}
        </button>
      </div>
    </div>

    {#if !isCollapsed}
      <!-- Telemetry banner ("Dato mata relato") -->
      {#if store.activeBenchmark}
        <div class="telemetry-bar">
          <div class="telemetry-item">
            <span class="t-label">Speed</span>
            <span class="t-val highlight">
              {#if store.isCachedResult}
                ⚡ 0ms (In-Memory Cache)
              {:else}
                ⏱️ {store.activeBenchmark.stacLatencyMs}ms STAC
              {/if}
            </span>
          </div>
          <div class="telemetry-item">
            <span class="t-label">Group Engine</span>
            <span class="t-val">{store.activeBenchmark.groupingLatencyMs}ms</span>
          </div>
          <div class="telemetry-item">
            <span class="t-label">Cache Hit Ratio</span>
            <span class="t-val">{store.cacheHitRatio}</span>
          </div>
        </div>
      {/if}

      {#if store.searchError}
        <div class="error-banner">
          ⚠️ {store.searchError}
        </div>
      {/if}

      {#if store.isSearching}
        <div class="searching-state">
          <span class="spinner"></span>
          <span>Querying STAC & synthesizing passes...</span>
        </div>
      {:else}
        <div class="quick-toolbar">
          {#if store.activePassId}
            <button type="button" class="btn-subtle active-action" onclick={hideImagery}>
              ✕ Hide Imagery
            </button>
            <span class="active-indicator">Single Active Pass (100% Speed)</span>
          {:else}
            <span class="hint-text">Click any pass below to view</span>
          {/if}
          <span class="provider-tag">{store.provider.toUpperCase()}</span>
        </div>

        <div class="card-scroll-area">
          {#each store.passes as pass (pass.id)}
            <PassCard
              {pass}
              onToggle={handleToggle}
              onOpacityChange={handleOpacity}
            />
          {/each}
        </div>
      {/if}
    {/if}
  </aside>
{/if}

<style>
  .pass-list-panel {
    width: 350px;
    max-height: calc(100vh - 100px);
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
    color: #f1f5f9;
    user-select: none;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 20;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    cursor: grab;
  }

  .panel-header:active {
    cursor: grabbing;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-title h2 {
    font-size: 14px;
    font-weight: 700;
    margin: 0;
    color: #38bdf8;
  }

  .btn-icon-tiny {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 12px;
  }

  .telemetry-bar {
    display: flex;
    justify-content: space-between;
    background: rgba(8, 145, 178, 0.12);
    border-bottom: 1px solid rgba(6, 182, 212, 0.2);
    padding: 6px 12px;
    font-size: 10px;
  }

  .telemetry-item {
    display: flex;
    flex-direction: column;
  }

  .t-label {
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
  }

  .t-val {
    color: #e2e8f0;
    font-family: monospace;
    font-weight: 600;
  }

  .t-val.highlight {
    color: #38bdf8;
  }

  .error-banner {
    padding: 8px 12px;
    background: rgba(239, 68, 68, 0.2);
    border-bottom: 1px solid rgba(239, 68, 68, 0.4);
    color: #fca5a5;
    font-size: 11px;
  }

  .searching-state {
    padding: 24px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 12px;
    color: #94a3b8;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(56, 189, 248, 0.3);
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .quick-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.15);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .btn-subtle {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: 0.15s;
  }

  .btn-subtle:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }

  .btn-subtle.active-action {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }

  .btn-subtle.active-action:hover {
    background: rgba(239, 68, 68, 0.25);
    color: #fff;
  }

  .active-indicator {
    font-size: 10.5px;
    color: #38bdf8;
    font-weight: 500;
  }

  .hint-text {
    font-size: 11px;
    color: #94a3b8;
  }

  .provider-tag {
    margin-left: auto;
    font-size: 10px;
    font-weight: 700;
    color: #06b6d4;
    letter-spacing: 0.5px;
  }

  .card-scroll-area {
    padding: 10px;
    overflow-y: auto;
    max-height: calc(100vh - 220px);
  }

  .card-scroll-area::-webkit-scrollbar {
    width: 5px;
  }

  .card-scroll-area::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
</style>
