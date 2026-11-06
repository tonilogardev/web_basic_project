<script lang="ts">
  import { store } from '../lib/store.svelte';
  import { SearchController } from '../lib/controllers/SearchController';
  import { draggable } from '../lib/draggable';
  import { PRESETS } from '../lib/types';
  import PassCard from './PassCard.svelte';

  let isCollapsed = $state(false);

  /**
   * Calculate non-overlapping coordinates relative to "Sentinel Pass Viewer".
   * Sentinel Pass Viewer is located at x: 20, y: 76, width: 330px (reaches x: 350px).
   * - Wide desktop (>= 1100px): opens on the right side of the screen.
   * - Medium desktop (740px - 1099px): opens immediately to the right at x: 360px.
   * - Narrow screens (< 740px): opens stacked below at x: 20px, y: 460px.
   */
  function getNonOverlappingPosition() {
    if (typeof window === 'undefined') {
      return { x: 360, y: 76 };
    }
    const w = window.innerWidth;
    if (w >= 1100) {
      return { x: w - 370, y: 76 };
    } else if (w >= 740) {
      return { x: 360, y: 76 };
    } else {
      return { x: 20, y: 460 };
    }
  }

  // Snapshot of chosen properties (falls back to current store if snapshot not yet set)
  let displaySnapshot = $derived.by(() => {
    if (store.searchSnapshot) {
      return store.searchSnapshot;
    }
    const preset = PRESETS.find((p) => p.id === store.selectedPreset);
    return {
      startDate: store.startDate,
      endDate: store.endDate,
      dateRangeDays: store.dateRangeDays,
      preset: store.selectedPreset,
      presetLabel: preset?.label || store.selectedPreset,
      presetBadge: preset?.badge || 'RGB',
      boundingBox: store.boundingBox ? ([...store.boundingBox] as [number, number, number, number]) : null,
      areaKm2: store.areaKm2 ?? 0,
    };
  });

  function handleToggle(passId: string) {
    SearchController.selectPass(passId);
  }

  function handleOpacity(passId: string, opacity: number) {
    SearchController.setPassOpacity(passId, opacity);
  }

  function handlePresetChange(passId: string, preset: string) {
    SearchController.setPassPreset(passId, preset);
  }

  function hideImagery() {
    SearchController.hideActivePass();
  }
</script>

{#if store.passes.length > 0 || store.isSearching || store.searchError}
  {@const pos = getNonOverlappingPosition()}
  <aside
    class="pass-list-panel"
    use:draggable={{
      handle: '.panel-header',
      initialX: pos.x,
      initialY: pos.y,
    }}
  >
    <div class="panel-header panel-drag-handle">
      <div class="header-title">
        <h2>Passes ({store.passes.length})</h2>
      </div>
      <div class="header-actions">
        <button
          type="button"
          class="btn-icon-tiny"
          onclick={() => (isCollapsed = !isCollapsed)}
          aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {isCollapsed ? '+' : '−'}
        </button>
      </div>
    </div>

    {#if !isCollapsed}
      <!-- Search Criteria & Properties Snapshot Banner -->
      <div class="search-properties-card">
        <!-- Date Range -->
        <div class="prop-row">
          <span class="prop-label">Date Range</span>
          <div class="prop-value">
            <span class="prop-dates">{displaySnapshot.startDate} <span class="arrow">→</span> {displaySnapshot.endDate}</span>
            <span class="days-badge">{displaySnapshot.dateRangeDays}d</span>
          </div>
        </div>

        <!-- Coordinates of Rectangle (AOI) -->
        <div class="prop-row aoi-row">
          <div class="prop-label aoi-header">
            <span>Rectangle (AOI)</span>
            {#if displaySnapshot.areaKm2}
              <span class="area-tag">{displaySnapshot.areaKm2.toLocaleString()} km²</span>
            {/if}
          </div>
          {#if displaySnapshot.boundingBox}
            <div class="coords-box">
              <span class="coord-item">SW: [{displaySnapshot.boundingBox[0].toFixed(3)}, {displaySnapshot.boundingBox[1].toFixed(3)}]</span>
              <span class="coord-item">NE: [{displaySnapshot.boundingBox[2].toFixed(3)}, {displaySnapshot.boundingBox[3].toFixed(3)}]</span>
            </div>
          {:else}
            <span class="coord-empty">No rectangle defined</span>
          {/if}
        </div>
      </div>

      <!-- Telemetry banner ("Dato mata relato") -->
      {#if store.activeBenchmark}
        <div class="telemetry-bar">
          <div class="telemetry-item">
            <span class="t-label">Speed</span>
            <span class="t-val highlight">
              {#if store.isCachedResult}
                0ms (Cache Hit)
              {:else}
                {store.activeBenchmark.stacLatencyMs}ms STAC
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
          {store.searchError}
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
              Hide Imagery
            </button>
            <span class="active-indicator">Active Pass Visible</span>
          {:else}
            <span class="hint-text">Select a pass to view</span>
          {/if}
          <span class="provider-tag">{store.provider.toUpperCase()}</span>
        </div>

        <div class="card-scroll-area">
          {#each store.passes as pass (pass.id)}
            <PassCard
              {pass}
              onToggle={handleToggle}
              onOpacityChange={handleOpacity}
              onPresetChange={handlePresetChange}
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

  /* Search Criteria & Properties Snapshot Card */
  .search-properties-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(30, 41, 59, 0.75);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 11px;
  }

  .prop-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .prop-row.aoi-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .prop-label {
    color: #94a3b8;
    font-weight: 500;
    font-size: 11px;
    letter-spacing: 0.2px;
  }

  .prop-label.aoi-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .prop-value {
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: 68%;
  }

  .prop-dates {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 10.5px;
    color: #f1f5f9;
    letter-spacing: -0.2px;
  }

  .arrow {
    color: #38bdf8;
    font-weight: bold;
    margin: 0 1px;
  }

  .days-badge {
    background: rgba(56, 189, 248, 0.15);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: #38bdf8;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .area-tag {
    background: rgba(148, 163, 184, 0.15);
    border: 1px solid rgba(148, 163, 184, 0.25);
    color: #cbd5e1;
    font-size: 9.5px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 4px;
    margin-left: auto;
  }

  .coords-box {
    width: 100%;
    display: flex;
    justify-content: space-between;
    box-sizing: border-box;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 5px 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 10px;
    color: #cbd5e1;
  }

  .coord-item {
    letter-spacing: 0.2px;
  }

  .coord-empty {
    font-style: italic;
    color: #64748b;
    font-size: 10.5px;
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
