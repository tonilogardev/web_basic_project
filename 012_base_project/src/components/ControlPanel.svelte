<script lang="ts">
  import { draggable } from '../lib/draggable';
  import { PRESETS } from '../lib/types';
  import { store } from '../lib/store.svelte';

  interface Props {
    onSearch?: () => void;
  }

  let { onSearch }: Props = $props();

  // Window state
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
    store.clearBoundingBox();
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
        <h2>Sentinel Pass Viewer</h2>
        <span class="subtitle">012 Base Project</span>
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
      <!-- 1. Satellite Selection -->
      <section class="section-group">
        <label for="satellite-select" class="section-label">Satellite Mission</label>
        <select id="satellite-select" class="custom-select" bind:value={store.satellite}>
          <option value="sentinel-2-l2a">Sentinel-2 (L2A Surface Reflectance)</option>
          <option value="sentinel-1-grd" disabled>Sentinel-1 SAR (Coming soon)</option>
          <option value="sentinel-3-olci" disabled>Sentinel-3 OLCI (Coming soon)</option>
        </select>
      </section>

      <!-- 3. Area of Interest (AOI) -->
      <section class="section-group">
        <div class="label-row">
          <span class="section-label">Area of Interest (AOI)</span>
          {#if store.areaKm2}
            {#if store.isAreaValid}
              <span class="badge-success">{store.areaKm2.toLocaleString()} km² ✓</span>
            {:else}
              <span class="badge-danger">⚠️ {store.areaKm2.toLocaleString()} km² (Limit: {store.maxAreaLimit.toLocaleString()} km²)</span>
            {/if}
          {/if}
        </div>

        {#if store.isAreaTooLarge}
          <div class="area-warning-banner">
            ⚠️ Selection exceeds the maximum limit of {store.maxAreaLimit.toLocaleString()} km². Please resize or redraw a smaller area.
          </div>
        {/if}

        <div class="aoi-actions">
          <button
            type="button"
            class="btn-secondary"
            class:btn-active={store.isDrawing}
            onclick={handleDrawClick}
            title={store.isDrawing ? 'Click to cancel drawing' : 'Click to draw a selection on the map'}
          >
            <span class="icon">⬚</span>
            {store.isDrawing ? 'Drawing active (Click & Drag)...' : store.boundingBox ? 'Redraw Area' : 'Draw Box'}
          </button>

          {#if store.boundingBox}
            <button type="button" class="btn-ghost danger" onclick={handleClearClick} title="Clear selected area">
              ✕ Clear
            </button>
          {/if}
        </div>
      </section>

      <!-- 3. Date Range -->
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
              class:active={store.dateRangeDays === 30}
              onclick={() => setQuickRange(30)}
              title="Last 30 days"
            >30d</button>
            <button
              type="button"
              class="chip"
              class:active={store.dateRangeDays === 90}
              onclick={() => setQuickRange(90)}
              title="Last 90 days (Maximum allowed)"
            >90d</button>
          </div>
        </div>

        <div class="dates-grid">
          <div class="date-field">
            <span class="input-caption">From</span>
            <input type="date" class="custom-date" bind:value={store.startDate} />
          </div>
          <div class="date-field">
            <span class="input-caption">To</span>
            <input type="date" class="custom-date" min={store.startDate} bind:value={store.endDate} />
          </div>
        </div>

        {#if store.isDateRangeTooWide}
          <div class="date-warning-banner">
            ⚠️ Range too wide ({store.dateRangeDays} days). Maximum allowed is {store.maxDateRangeDays} days.
          </div>
        {:else}
          <div class="hint-text">
            <span>{store.dateRangeDays} {store.dateRangeDays === 1 ? 'day' : 'days'} selected</span>
            <span class="hint-rule">Max: {store.maxDateRangeDays} days</span>
          </div>
        {/if}
      </section>

      <!-- 4. Cloud Cover Threshold -->
      <section class="section-group">
        <div class="label-row">
          <label for="cloud-slider" class="section-label">Max Cloud Cover</label>
          <span
            class="cloud-badge"
            class:low={store.maxCloudCover <= 20}
            class:med={store.maxCloudCover > 20 && store.maxCloudCover <= 50}
            class:high={store.maxCloudCover > 50}
          >
            {store.maxCloudCover}%
          </span>
        </div>
        <input
          id="cloud-slider"
          type="range"
          min="0"
          max="100"
          step="5"
          class="custom-slider"
          bind:value={store.maxCloudCover}
        />
      </section>

      <!-- 5. Band Combination / Preset -->
      <section class="section-group">
        <label for="preset-select" class="section-label">Band Combination</label>
        <select id="preset-select" class="custom-select" bind:value={store.selectedPreset}>
          {#each PRESETS as p}
            <option value={p.id}>
              {p.label} [{p.badge}]
            </option>
          {/each}
        </select>
      </section>

      <!-- 6. Primary Search Trigger -->
      <button
        type="button"
        class="btn-primary"
        disabled={!store.isAreaValid || !store.isDateRangeValid || store.isSearching}
        onclick={() => onSearch?.()}
      >
        <span class="btn-icon">🔍</span>
        {#if store.isSearching}
          Searching Passes...
        {:else if !store.boundingBox}
          Select an Area to Search
        {:else if store.isAreaTooLarge}
          Area too large (Max {store.maxAreaLimit.toLocaleString()} km²)
        {:else if store.isDateRangeTooWide}
          Date Range Exceeds {store.maxDateRangeDays} Days
        {:else}
          Search Passes (Date + Orbit)
        {/if}
      </button>
    </div>
  {/if}
</aside>

<style>
  .control-panel {
    width: 330px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
    color: #f1f5f9;
    user-select: none;
    overflow: hidden;
    transition: box-shadow 0.2s ease;
  }

  :global(.control-panel.is-dragging) {
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
    border-color: rgba(56, 189, 248, 0.4);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: rgba(30, 41, 59, 0.6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    cursor: grab;
  }

  :global(.control-panel.is-dragging) .panel-header {
    cursor: grabbing;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .drag-grip {
    color: #64748b;
    font-size: 1.1rem;
    line-height: 1;
  }

  .title-wrap h2 {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 600;
    color: #f8fafc;
    letter-spacing: -0.01em;
  }

  .subtitle {
    font-size: 0.68rem;
    color: #38bdf8;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-weight: 500;
  }

  .btn-minimize {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: #94a3b8;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-minimize:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .panel-content {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
  }

  .section-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .section-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
  }

  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }


  /* Inputs & Selects */
  .custom-select {
    width: 100%;
    padding: 0.5rem 0.65rem;
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #f1f5f9;
    font-size: 0.8rem;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s ease;
  }

  .custom-select:focus {
    border-color: #38bdf8;
  }

  /* AOI Actions */
  .aoi-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-secondary {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.5rem 0.75rem;
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 0.78rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background: rgba(51, 65, 85, 0.8);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .btn-secondary.btn-active {
    background: rgba(56, 189, 248, 0.2);
    border-color: #38bdf8;
    color: #38bdf8;
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.35);
    animation: pulse 1.8s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.75; }
  }

  .btn-ghost {
    background: transparent;
    border: none;
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.2s ease;
  }

  .btn-ghost.danger {
    color: #f87171;
  }

  .btn-ghost.danger:hover {
    background: rgba(239, 68, 68, 0.15);
  }

  .badge-success {
    font-size: 0.68rem;
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
    padding: 0.15rem 0.45rem;
    border-radius: 12px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-weight: 600;
  }

  .badge-danger {
    font-size: 0.68rem;
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.4);
    padding: 0.15rem 0.45rem;
    border-radius: 12px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-weight: 600;
  }

  .area-warning-banner,
  .date-warning-banner {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.35);
    border-radius: 6px;
    padding: 0.45rem 0.65rem;
    font-size: 0.73rem;
    color: #fca5a5;
    line-height: 1.35;
  }

  /* Date Range */
  .chips-row {
    display: flex;
    gap: 0.3rem;
  }

  .chip {
    background: rgba(30, 41, 59, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    font-size: 0.68rem;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .chip:hover {
    color: #ffffff;
    border-color: #38bdf8;
  }

  .chip.active {
    background: rgba(56, 189, 248, 0.2);
    border-color: #38bdf8;
    color: #38bdf8;
    font-weight: 600;
  }

  .dates-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .date-field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .input-caption {
    font-size: 0.65rem;
    color: #64748b;
  }

  .custom-date {
    width: 100%;
    box-sizing: border-box;
    padding: 0.4rem 0.5rem;
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: #f1f5f9;
    font-size: 0.75rem;
    outline: none;
    cursor: pointer;
  }

  .custom-date:focus {
    border-color: #38bdf8;
  }

  .hint-text {
    display: flex;
    justify-content: space-between;
    font-size: 0.68rem;
    color: #64748b;
  }

  .hint-rule {
    color: #94a3b8;
  }

  /* Cloud Slider */
  .cloud-badge {
    font-size: 0.72rem;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-weight: 600;
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
  }

  .cloud-badge.low {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
  }

  .cloud-badge.med {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
  }

  .cloud-badge.high {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }

  .custom-slider {
    width: 100%;
    accent-color: #38bdf8;
    cursor: pointer;
  }

  /* Primary Button */
  .btn-primary {
    margin-top: 0.35rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.7rem 1rem;
    background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
    color: #ffffff;
    border: none;
    border-radius: 9px;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
    transition: all 0.2s ease;
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #0369a1 0%, #1d4ed8 100%);
    box-shadow: 0 6px 18px rgba(2, 132, 199, 0.5);
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
</style>
