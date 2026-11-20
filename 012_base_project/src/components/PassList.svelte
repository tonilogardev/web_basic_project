<script lang="ts">
  import { store } from '../lib/store.svelte';
  import { SearchController } from '../lib/controllers/SearchController';
  import { draggable } from '../lib/draggable';
  import { PRESETS } from '../lib/types';
  import type { SearchSession } from '../lib/models/session.model';
  import PassCard from './PassCard.svelte';

  interface Props {
    session?: SearchSession;
  }

  let { session }: Props = $props();

  let localCollapsed = $state(false);

  let isCollapsed = $derived.by(() => {
    return session ? session.isCollapsed : localCollapsed;
  });

  function toggleCollapse() {
    if (session) {
      store.toggleSessionCollapse(session.id);
    } else {
      localCollapsed = !localCollapsed;
    }
  }

  function handleClose() {
    if (session) {
      SearchController.closeSession(session.id);
    }
  }

  /**
   * Fallback position calculation for standalone mode
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

  let initialPos = $derived.by(() => {
    if (session) {
      return session.position;
    }
    return getNonOverlappingPosition();
  });

  // Snapshot of chosen properties
  let displaySnapshot = $derived.by(() => {
    if (session) {
      return session.snapshot;
    }
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

  let passes = $derived.by(() => {
    return session ? session.passes : store.passes;
  });

  let activePassId = $derived.by(() => {
    return session ? session.activePassId : store.activePassId;
  });

  let activeBenchmark = $derived.by(() => {
    return session ? session.activeBenchmark : store.activeBenchmark;
  });

  let isSearching = $derived.by(() => {
    return session ? session.isSearching : store.isSearching;
  });

  let searchError = $derived.by(() => {
    return session ? session.searchError : store.searchError;
  });

  let isCachedResult = $derived.by(() => {
    return session ? session.isCachedResult : store.isCachedResult;
  });

  let cacheHitRatio = $derived.by(() => {
    return session ? session.cacheHitRatio : store.cacheHitRatio;
  });

  function handleToggle(passId: string) {
    if (session) {
      SearchController.selectSessionPass(session.id, passId);
    } else {
      SearchController.selectPass(passId);
    }
  }

  function handleOpacity(passId: string, opacity: number) {
    if (session) {
      SearchController.setSessionPassOpacity(session.id, passId, opacity);
    } else {
      SearchController.setPassOpacity(passId, opacity);
    }
  }

  function handlePresetChange(passId: string, preset: string) {
    if (session) {
      SearchController.setSessionPassPreset(session.id, passId, preset);
    } else {
      SearchController.setPassPreset(passId, preset);
    }
  }

  function hideImagery() {
    if (session) {
      SearchController.hideSessionPass(session.id);
    } else {
      SearchController.hideActivePass();
    }
  }

  // Discarded pass IDs (managed in local state)
  let discardedIds = $state<Set<string>>(new Set());

  // In-memory AOI Cloud Cover filter threshold (100 = All)
  let cloudFilterThreshold = $state<number>(100);

  // In-memory Full AOI coverage filter (true = only images filling all rectangle/polygon)
  let fullCoverageOnly = $state<boolean>(false);

  // Sorting option: 'newest' | 'oldest' | 'cleanest' | 'coverage'
  let sortOption = $state<'newest' | 'oldest' | 'cleanest' | 'coverage'>('newest');

  function handleDiscard(passId: string) {
    if (activePassId === passId) {
      hideImagery();
    }
    const updated = new Set(discardedIds);
    updated.add(passId);
    discardedIds = updated;
  }

  function handleRestoreAll() {
    discardedIds = new Set();
  }

  // Filtered and sorted passes (computed 100% in browser memory in 0ms)
  let displayedPasses = $derived.by(() => {
    let list = passes.filter((p) => !discardedIds.has(p.id));

    // Coverage filter: check if the image fills all rectangle or polygon
    if (fullCoverageOnly) {
      list = list.filter((p) => p.isFullCoverage !== false);
    }

    if (cloudFilterThreshold < 100) {
      list = list.filter((p) => {
        const cloudVal = p.aoiCloudCover !== undefined ? p.aoiCloudCover : p.meanCloudCover;
        return cloudVal <= cloudFilterThreshold;
      });
    }

    if (sortOption === 'oldest') {
      return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortOption === 'cleanest') {
      return [...list].sort((a, b) => {
        const valA = a.aoiCloudCover !== undefined ? a.aoiCloudCover : a.meanCloudCover;
        const valB = b.aoiCloudCover !== undefined ? b.aoiCloudCover : b.meanCloudCover;
        return valA - valB;
      });
    } else if (sortOption === 'coverage') {
      return [...list].sort((a, b) => (b.aoiCoveragePercent ?? 100) - (a.aoiCoveragePercent ?? 100));
    } else {
      // newest
      return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  });
</script>

{#if passes.length > 0 || isSearching || searchError}
  <aside
    class="pass-list-panel"
    use:draggable={{
      handle: '.panel-header',
      initialX: initialPos.x,
      initialY: initialPos.y,
    }}
  >
    <div class="panel-header panel-drag-handle">
      <div class="header-title">
        <h2>{session ? session.title : 'Passes'} ({displayedPasses.length})</h2>
      </div>
      <div class="header-actions">
        <button
          type="button"
          class="btn-icon-tiny"
          onclick={toggleCollapse}
          aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {isCollapsed ? '+' : '−'}
        </button>
        {#if session}
          <button
            type="button"
            class="btn-icon-tiny btn-close-session"
            onclick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-label="Close session window"
            title="Close this search window"
          >
            ✕
          </button>
        {/if}
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
      {#if activeBenchmark}
        <div class="telemetry-bar">
          <div class="telemetry-item">
            <span class="t-label">Speed</span>
            <span class="t-val highlight">
              {#if isCachedResult}
                0ms (Cache Hit)
              {:else}
                {activeBenchmark.stacLatencyMs}ms STAC
              {/if}
            </span>
          </div>
          <div class="telemetry-item">
            <span class="t-label">Group Engine</span>
            <span class="t-val">{activeBenchmark.groupingLatencyMs}ms</span>
          </div>
          <div class="telemetry-item">
            <span class="t-label">Cache Hit Ratio</span>
            <span class="t-val">{cacheHitRatio}</span>
          </div>
        </div>
      {/if}

      {#if searchError}
        <div class="error-banner">
          {searchError}
        </div>
      {/if}

      {#if isSearching}
        <div class="searching-state">
          <span class="spinner"></span>
          <span>Querying STAC & synthesizing passes...</span>
        </div>
      {:else}
        {#if passes.length > 0}
          <div class="session-actions-bar">
            <button
              type="button"
              class="action-btn-session timelapse-action-btn"
              onclick={() => store.openTimelapseModal(session || null, displayedPasses)}
              title="Generate and preview interactive time-lapse video"
            >
              <span class="action-icon">🎬</span>
              <span class="action-label">Time-Lapse</span>
              <span class="count-tag">{displayedPasses.length}</span>
            </button>

            <button
              type="button"
              class="action-btn-session export-all-action-btn"
              onclick={() => store.openExportModal('all', null, session || null, displayedPasses)}
              title="Download all passes as ZIP"
            >
              <span class="action-icon">📥</span>
              <span class="action-label">Export All</span>
              <span class="count-tag">{displayedPasses.length}</span>
            </button>
          </div>

          <!-- In-Memory Interactive Filter & Sort Toolbar -->
          <div class="pass-tools-toolbar">
            <!-- Cloud Filter Quick-Pills -->
            <div class="cloud-filter-pills">
              <span class="tool-label">AOI:</span>
              <button
                type="button"
                class="pill-btn"
                class:active={cloudFilterThreshold === 100}
                onclick={() => (cloudFilterThreshold = 100)}
              >
                All
              </button>
              <button
                type="button"
                class="pill-btn"
                class:active={cloudFilterThreshold === 10}
                onclick={() => (cloudFilterThreshold = 10)}
                title="Filter passes with <10% clouds in AOI"
              >
                &lt;10%
              </button>
              <button
                type="button"
                class="pill-btn"
                class:active={cloudFilterThreshold === 25}
                onclick={() => (cloudFilterThreshold = 25)}
                title="Filter passes with <25% clouds in AOI"
              >
                &lt;25%
              </button>
              <button
                type="button"
                class="pill-btn"
                class:active={cloudFilterThreshold === 50}
                onclick={() => (cloudFilterThreshold = 50)}
                title="Filter passes with <50% clouds in AOI"
              >
                &lt;50%
              </button>
            </div>

            <!-- Full Coverage Filter Toggle -->
            <div class="coverage-filter-wrap">
              <button
                type="button"
                class="pill-btn coverage-pill-btn"
                class:active={fullCoverageOnly}
                onclick={() => (fullCoverageOnly = !fullCoverageOnly)}
                title={fullCoverageOnly ? "Filter active: showing only images filling 100% of your AOI. Click to show all." : "Filter to show only images that completely fill your drawn rectangle or polygon"}
              >
                <span class="cov-icon">{fullCoverageOnly ? '🟩' : '◻️'}</span>
                <span>Full AOI</span>
              </button>
            </div>

            <!-- Sort Selector -->
            <div class="sort-selector-wrap">
              <select
                class="sort-select"
                bind:value={sortOption}
                aria-label="Sort passes"
              >
                <option value="newest">📅 Newest</option>
                <option value="oldest">📅 Oldest</option>
                <option value="cleanest">☁️ Cleanest</option>
                <option value="coverage">📐 Most Covered</option>
              </select>
            </div>
          </div>

          <!-- Notice if passes have been dismissed/discarded -->
          {#if discardedIds.size > 0}
            <div class="discarded-notice-bar">
              <span>🗑️ {discardedIds.size} {discardedIds.size === 1 ? 'pass' : 'passes'} hidden</span>
              <button
                type="button"
                class="btn-restore"
                onclick={handleRestoreAll}
                title="Restore all hidden passes"
              >
                Restore all
              </button>
            </div>
          {/if}
        {/if}

        <div class="quick-toolbar">
          {#if activePassId}
            <button type="button" class="btn-subtle active-action" onclick={hideImagery}>
              Hide Imagery
            </button>
            <span class="active-indicator">Active Pass Visible</span>
          {:else}
            <span class="hint-text">Showing {displayedPasses.length} of {passes.length - discardedIds.size}</span>
          {/if}
          <span class="provider-tag">{store.provider.toUpperCase()}</span>
        </div>

        <div class="card-scroll-area">
          {#each displayedPasses as pass (pass.id)}
            <PassCard
              {pass}
              onToggle={handleToggle}
              onOpacityChange={handleOpacity}
              onPresetChange={handlePresetChange}
              onExport={(targetPass) => store.openExportModal('single', targetPass, session || null)}
              onDiscard={handleDiscard}
            />
          {:else}
            <div class="empty-filter-state">
              {#if fullCoverageOnly && cloudFilterThreshold < 100}
                <span>No passes match both full coverage and cloud (&lt;{cloudFilterThreshold}%).</span>
              {:else if fullCoverageOnly}
                <span>No passes completely fill 100% of your drawn rectangle or polygon.</span>
              {:else}
                <span>No passes match cloud filter (&lt;{cloudFilterThreshold}%).</span>
              {/if}
              <button
                type="button"
                class="btn-subtle"
                onclick={() => {
                  cloudFilterThreshold = 100;
                  fullCoverageOnly = false;
                }}
              >
                Reset Filters
              </button>
            </div>
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

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .btn-icon-tiny {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 13px;
    padding: 2px 6px;
    border-radius: 4px;
    transition: all 0.15s ease;
  }

  .btn-icon-tiny:hover {
    color: #f1f5f9;
    background: rgba(255, 255, 255, 0.1);
  }

  .btn-close-session {
    font-size: 11px;
    font-weight: 700;
  }

  .btn-close-session:hover {
    color: #f87171;
    background: rgba(239, 68, 68, 0.2);
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

  .session-actions-bar {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(30, 41, 59, 0.45);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .action-btn-session {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: #e2e8f0;
  }

  .action-btn-session:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .timelapse-action-btn:hover {
    background: rgba(6, 182, 212, 0.18);
    border-color: rgba(6, 182, 212, 0.4);
    color: #38bdf8;
  }

  .export-all-action-btn:hover {
    background: rgba(56, 189, 248, 0.18);
    border-color: rgba(56, 189, 248, 0.4);
    color: #7dd3fc;
  }

  .action-icon {
    font-size: 13px;
  }

  .count-tag {
    background: rgba(255, 255, 255, 0.12);
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 10px;
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

  /* Tools Toolbar (Filter & Sort) */
  .pass-tools-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(15, 23, 42, 0.7);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .cloud-filter-pills {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .tool-label {
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .pill-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pill-btn:hover {
    background: rgba(56, 189, 248, 0.15);
    border-color: rgba(56, 189, 248, 0.3);
    color: #38bdf8;
  }

  .pill-btn.active {
    background: rgba(6, 182, 212, 0.25);
    border-color: #06b6d4;
    color: #22d3ee;
    font-weight: 700;
    box-shadow: 0 0 6px rgba(6, 182, 212, 0.3);
  }

  .coverage-filter-wrap {
    display: flex;
    align-items: center;
  }

  .coverage-pill-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .coverage-pill-btn .cov-icon {
    font-size: 9px;
  }

  .coverage-pill-btn.active {
    background: rgba(16, 185, 129, 0.25);
    border-color: #10b981;
    color: #6ee7b7;
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.35);
  }

  .sort-selector-wrap {
    display: flex;
    align-items: center;
  }

  .sort-select {
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    color: #f1f5f9;
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 6px;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
  }

  .sort-select:hover,
  .sort-select:focus {
    border-color: #38bdf8;
  }

  .sort-select option {
    background: #0f172a;
    color: #f1f5f9;
  }

  /* Discard Notice Bar */
  .discarded-notice-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 12px;
    background: rgba(239, 68, 68, 0.12);
    border-bottom: 1px solid rgba(239, 68, 68, 0.25);
    font-size: 10.5px;
    color: #fca5a5;
  }

  .btn-restore {
    background: transparent;
    border: 1px solid rgba(252, 165, 165, 0.4);
    color: #fca5a5;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-restore:hover {
    background: rgba(239, 68, 68, 0.25);
    color: #fff;
    border-color: #f87171;
  }

  .empty-filter-state {
    padding: 24px 16px;
    text-align: center;
    color: #94a3b8;
    font-size: 11.5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
</style>
