<script lang="ts">
  import { draggable } from '../lib/draggable';
  import { store } from '../lib/store.svelte';

  interface Props {
    onSearch?: () => void;
  }

  let { onSearch }: Props = $props();

  // Window collapsible state
  let collapsed = $state(false);

  function setQuickRange(days: number) {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    store.endDate = end.toISOString().slice(0, 10);
    store.startDate = start.toISOString().slice(0, 10);
  }

  function handleDrawClick() {
    store.toggleDrawing();
  }

  function handleClearClick() {
    store.clearPolygon();
  }
</script>

<aside
  class="control-panel"
  class:is-collapsed={collapsed}
  use:draggable={{
    handle: '.panel-header',
    initialX: 20,
    initialY: 76,
  }}
>
  <!-- Window Header / Drag Handle -->
  <div class="panel-header">
    <div class="header-left">
      <span class="drag-grip" title="Drag window">⠿</span>
      <div class="title-wrap">
        <h2>Aqua Sentinel Analysis</h2>
        <span class="subtitle">Sentinel-2 L2A (BOA Surface Reflectance)</span>
      </div>
    </div>

    <button
      type="button"
      class="btn-minimize"
      onclick={() => (collapsed = !collapsed)}
      aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
      title={collapsed ? 'Expand' : 'Collapse'}
    >
      {collapsed ? '+' : '−'}
    </button>
  </div>

  <!-- Window Content -->
  {#if !collapsed}
    <div class="panel-content">
      <!-- 1. Area of Interest (AOI) - Polygon -->
      <section class="section-group">
        <div class="label-row">
          <span class="section-label">Area of Interest (AOI)</span>
          {#if store.areaKm2}
            {#if store.isAreaValid}
              <span class="badge-success">{store.areaKm2.toLocaleString()} km²</span>
            {:else}
              <span class="badge-danger">{store.areaKm2.toLocaleString()} km² (Limit: {store.maxAreaLimit} km²)</span>
            {/if}
          {/if}
        </div>

        {#if store.isAreaTooLarge}
          <div class="area-warning-banner">
            Selection exceeds the maximum limit of {store.maxAreaLimit} km². Please redraw a smaller polygon over the water body.
          </div>
        {/if}

        <div class="aoi-actions">
          <button
            type="button"
            class="btn-secondary"
            class:btn-active={store.isDrawing}
            onclick={handleDrawClick}
            title={store.isDrawing ? 'Click to cancel polygon' : 'Click to draw polygon points on the map'}
          >
            {#if store.isDrawing}
              Drawing Active (Click points, dbl-click to close)
            {:else if store.polygon}
              Redraw Polygon
            {:else}
              Create Polygon
            {/if}
          </button>

          {#if store.polygon}
            <button
              type="button"
              class="btn-ghost danger"
              onclick={handleClearClick}
              title="Clear selected polygon"
            >
              Clear
            </button>
          {/if}
        </div>
      </section>

      <!-- 2. Date Range (Max 30 Days) -->
      <section class="section-group">
        <div class="label-row">
          <span class="section-label">Date Range</span>
          <div class="chips-row">
            <button
              type="button"
              class="chip"
              class:active={store.dateRangeDays === 7}
              onclick={() => setQuickRange(7)}
              title="Last 7 days"
            >7d</button>
            <button
              type="button"
              class="chip"
              class:active={store.dateRangeDays === 15}
              onclick={() => setQuickRange(15)}
              title="Last 15 days"
            >15d</button>
            <button
              type="button"
              class="chip"
              class:active={store.dateRangeDays === 30}
              onclick={() => setQuickRange(30)}
              title="Last 30 days (Maximum allowed)"
            >30d</button>
          </div>
        </div>

        <div class="dates-grid">
          <div class="date-field">
            <span class="input-caption">From</span>
            <input type="date" class="custom-date" bind:value={store.startDate} />
          </div>
          <div class="date-field">
            <span class="input-caption">To</span>
            <input
              type="date"
              class="custom-date"
              min={store.startDate}
              bind:value={store.endDate}
            />
          </div>
        </div>

        {#if store.isDateRangeTooWide}
          <div class="date-warning-banner">
            Range too wide ({store.dateRangeDays} days). Maximum allowed is {store.maxDateRangeDays} days.
          </div>
        {:else}
          <div class="hint-text">
            <span>{store.dateRangeDays} {store.dateRangeDays === 1 ? 'day' : 'days'} selected</span>
            <span class="hint-rule">Max: {store.maxDateRangeDays} days</span>
          </div>
        {/if}
      </section>

      <!-- 3. Primary Search Trigger -->
      <button
        type="button"
        class="btn-primary"
        disabled={!store.isAreaValid || !store.isDateRangeValid || store.isSearching}
        onclick={() => onSearch?.()}
      >
        {#if store.isSearching}
          Searching Sentinel Passes...
        {:else if !store.polygon}
          Create a Polygon to Search
        {:else if store.isAreaTooLarge}
          Area too large (Max {store.maxAreaLimit} km²)
        {:else if store.isDateRangeTooWide}
          Date Range Exceeds {store.maxDateRangeDays} Days
        {:else}
          Search Sentinel Passes
        {/if}
      </button>
    </div>
  {/if}
</aside>

<style>
  .control-panel {
    width: 350px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    box-shadow:
      0 20px 40px -15px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.05);
    color: #f8fafc;
    font-family: inherit;
    user-select: none;
    transition: box-shadow 0.2s ease;
  }

  .control-panel:hover {
    box-shadow:
      0 24px 48px -12px rgba(0, 0, 0, 0.7),
      0 0 20px rgba(6, 182, 212, 0.15);
  }

  .control-panel.is-collapsed {
    width: 280px;
  }

  /* Header */
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: rgba(30, 41, 59, 0.6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px 12px 0 0;
    cursor: grab;
  }

  :global(.control-panel.is-dragging) .panel-header {
    cursor: grabbing;
  }

  .is-collapsed .panel-header {
    border-bottom: none;
    border-radius: 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .drag-grip {
    color: #64748b;
    font-size: 16px;
    line-height: 1;
    cursor: grab;
  }

  .title-wrap h2 {
    font-size: 13.5px;
    font-weight: 700;
    margin: 0;
    color: #ffffff;
    letter-spacing: -0.01em;
  }

  .subtitle {
    font-size: 10.5px;
    color: #22d3ee;
    font-weight: 500;
    display: block;
    margin-top: 1px;
  }

  .btn-minimize {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #94a3b8;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-minimize:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  /* Content */
  .panel-content {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .section-group {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
  }

  /* AOI Actions */
  .aoi-actions {
    display: flex;
    gap: 8px;
  }

  .btn-secondary {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 7px;
    color: #e2e8f0;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-secondary:hover {
    background: rgba(51, 65, 85, 0.8);
    border-color: rgba(6, 182, 212, 0.4);
    color: #ffffff;
  }

  .btn-secondary.btn-active {
    background: rgba(6, 182, 212, 0.2);
    border-color: #06b6d4;
    color: #22d3ee;
    box-shadow: 0 0 12px rgba(6, 182, 212, 0.25);
  }

  .btn-ghost {
    padding: 8px 10px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 7px;
    color: #94a3b8;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-ghost.danger:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.4);
    color: #f87171;
  }

  .badge-success {
    font-size: 11px;
    font-weight: 600;
    color: #22d3ee;
    background: rgba(6, 182, 212, 0.12);
    border: 1px solid rgba(6, 182, 212, 0.25);
    padding: 2px 7px;
    border-radius: 5px;
  }

  .badge-danger {
    font-size: 10.5px;
    font-weight: 600;
    color: #f87171;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: 2px 7px;
    border-radius: 5px;
  }

  .area-warning-banner,
  .date-warning-banner {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    font-size: 11px;
    padding: 6px 9px;
    border-radius: 6px;
    line-height: 1.35;
  }

  /* Date Range */
  .chips-row {
    display: flex;
    gap: 4px;
  }

  .chip {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .chip:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
  }

  .chip.active {
    background: rgba(6, 182, 212, 0.2);
    border-color: #06b6d4;
    color: #22d3ee;
  }

  .dates-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .date-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .input-caption {
    font-size: 10px;
    color: #64748b;
    font-weight: 500;
    text-transform: uppercase;
  }

  .custom-date {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: #f1f5f9;
    font-size: 11.5px;
    padding: 6px 8px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .custom-date:focus {
    border-color: #06b6d4;
    box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2);
  }

  .hint-text {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: #64748b;
  }

  .hint-rule {
    color: #06b6d4;
    font-weight: 500;
  }

  /* Primary Button */
  .btn-primary {
    margin-top: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 14px;
    background: linear-gradient(135deg, #0891b2 0%, #0284c7 100%);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 8px;
    color: #ffffff;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(8, 145, 178, 0.35);
    transition: all 0.2s ease;
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #06b6d4 0%, #0369a1 100%);
    box-shadow: 0 6px 18px rgba(8, 145, 178, 0.5);
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(51, 65, 85, 0.5);
    box-shadow: none;
    border-color: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
  }
</style>
