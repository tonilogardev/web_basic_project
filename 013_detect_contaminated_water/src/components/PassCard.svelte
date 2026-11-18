<script lang="ts">
  import type { SatellitePass, PassViewMode } from '../lib/models/pass.model';
  import type { SearchSession } from '../lib/models/session.model';
  import { waterAnalysisController } from '../lib/controllers/WaterAnalysisController';

  interface Props {
    session: SearchSession;
    pass: SatellitePass;
  }

  let { session, pass }: Props = $props();

  let isAnalyzing = $derived(waterAnalysisController.isPassAnalyzing(pass.id));
  let isActive = $derived(session.activePassId === pass.id && !session.isImageryHidden);
  let hasAnalysis = $derived(!!pass.waterAnalysis);

  function getCloudBadgeClass(cloud: number): string {
    if (cloud < 10) return 'cloud-low';
    if (cloud < 30) return 'cloud-med';
    return 'cloud-high';
  }

  function handleCardClick() {
    waterAnalysisController.togglePassVisibility(session, pass.id);
  }

  function handleAnalyzeClick(e: MouseEvent) {
    e.stopPropagation();
    waterAnalysisController.analyzePass(session, pass);
  }

  function handleViewModeClick(e: MouseEvent, mode: PassViewMode) {
    e.stopPropagation();
    waterAnalysisController.setViewMode(session, pass, mode);
  }

  function handleOpacityChange(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    waterAnalysisController.setPassOpacity(session, pass.id, val);
  }
</script>

<div
  class="pass-card"
  class:active={isActive}
  onclick={handleCardClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
>
  <div class="pass-card-header">
    <div class="pass-meta">
      <div class="pass-orbit-row">
        <span class="pass-orbit-badge">{pass.orbitFormatted}</span>
        <span class="pass-date">{pass.date}</span>
      </div>
      <span class="pass-id-sub">{pass.id}</span>
    </div>

    <div class="active-status-pill" class:is-live={isActive}>
      {#if isAnalyzing}
        <span class="spinner"></span>
        <span class="status-text analyzing">ANALYZING...</span>
      {:else if isActive}
        <span class="live-dot"></span>
        <span class="status-text">ACTIVE</span>
      {:else}
        <span class="status-text idle">SHOW S2 IMAGE</span>
      {/if}
    </div>
  </div>

  <div class="pass-details">
    <span class="badge {getCloudBadgeClass(pass.meanCloudCover)}">
      {pass.meanCloudCover}% Cloud
    </span>
    <span class="badge granule-badge" title="Constituent MGRS tiles rendered seamlessly">
      {pass.granulesCount} {pass.granulesCount === 1 ? 'granule' : 'granules'} (10m)
    </span>
    <span class="badge provider-badge">ESA</span>
  </div>

  <!-- Water Pollution Detection Action -->
  <div class="pass-action-row" onclick={(e) => e.stopPropagation()} role="presentation">
    {#if hasAnalysis}
      <div class="view-mode-selector">
        <span class="view-mode-label">View Mode:</span>
        <div class="view-mode-buttons">
          <button
            type="button"
            class="mode-btn"
            class:active={pass.viewMode === 'rgb'}
            onclick={(e) => handleViewModeClick(e, 'rgb')}
            title="View natural satellite imagery (True Color RGB)"
          >
            RGB
          </button>
          <button
            type="button"
            class="mode-btn"
            class:active={pass.viewMode === 'water'}
            onclick={(e) => handleViewModeClick(e, 'water')}
            title="View water quality classification layer only"
          >
            Water
          </button>
          <button
            type="button"
            class="mode-btn"
            class:active={pass.viewMode === 'both'}
            onclick={(e) => handleViewModeClick(e, 'both')}
            title="Overlay water pollution detection on natural imagery"
          >
            Both
          </button>
        </div>
      </div>
    {:else}
      <button
        type="button"
        class="btn-analyze"
        class:btn-analyzing={isAnalyzing}
        disabled={isAnalyzing}
        onclick={handleAnalyzeClick}
      >
        {#if isAnalyzing}
          <span class="spinner-small"></span>
          <span>Processing in Rust (Rayon + GDAL)...</span>
        {:else}
          <span>Detect Water Pollution</span>
        {/if}
      </button>
    {/if}
  </div>

  <!-- Opacity slider when pass is active on map -->
  {#if isActive}
    <div class="pass-opacity-control" onclick={(e) => e.stopPropagation()} role="presentation">
      <span class="opacity-label">Opacity</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={pass.opacity}
        class="opacity-slider"
        oninput={handleOpacityChange}
      />
      <span class="opacity-val">{Math.round(pass.opacity * 100)}%</span>
    </div>
  {/if}
</div>

<style>
  .pass-card {
    background: rgba(30, 41, 59, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pass-card:hover {
    background: rgba(30, 41, 59, 0.95);
    border-color: rgba(6, 182, 212, 0.3);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  }

  .pass-card.active {
    border-color: #06b6d4;
    background: rgba(15, 23, 42, 0.95);
    box-shadow: 0 0 16px rgba(6, 182, 212, 0.25);
  }

  .pass-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .pass-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pass-orbit-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pass-orbit-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: #0284c7;
    color: #ffffff;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .pass-date {
    font-size: 13.5px;
    font-weight: 700;
    color: #ffffff;
  }

  .pass-id-sub {
    font-size: 10px;
    color: #64748b;
    font-family: monospace;
    max-width: 190px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .active-status-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .active-status-pill.is-live {
    background: rgba(6, 182, 212, 0.15);
    border-color: rgba(6, 182, 212, 0.4);
  }

  .live-dot {
    width: 6px;
    height: 6px;
    background: #22d3ee;
    border-radius: 50%;
    box-shadow: 0 0 6px #22d3ee;
  }

  .status-text {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #22d3ee;
  }

  .status-text.idle {
    color: #94a3b8;
  }

  .status-text.analyzing {
    color: #f59e0b;
  }

  .pass-details {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 4px;
  }

  .cloud-low {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .cloud-med {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .cloud-high {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .granule-badge {
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .provider-badge {
    background: rgba(14, 165, 233, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(14, 165, 233, 0.3);
  }

  .pass-action-row {
    margin-top: 2px;
  }

  .btn-analyze {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #0891b2 0%, #0284c7 100%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 7px;
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 2px 8px rgba(8, 145, 178, 0.25);
  }

  .btn-analyze:hover:not(:disabled) {
    background: linear-gradient(135deg, #06b6d4 0%, #0369a1 100%);
    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);
    transform: translateY(-1px);
  }

  .btn-analyze:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .view-mode-selector {
    display: flex;
    flex-direction: column;
    gap: 5px;
    background: rgba(15, 23, 42, 0.6);
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid rgba(6, 182, 212, 0.2);
  }

  .view-mode-label {
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .view-mode-buttons {
    display: flex;
    gap: 4px;
  }

  .mode-btn {
    flex: 1;
    padding: 4px 6px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  .mode-btn.active {
    background: #0891b2;
    border-color: #22d3ee;
    color: #ffffff;
    box-shadow: 0 0 8px rgba(6, 182, 212, 0.3);
  }

  .pass-opacity-control {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .opacity-label {
    font-size: 10.5px;
    color: #94a3b8;
  }

  .opacity-slider {
    flex: 1;
    accent-color: #06b6d4;
  }

  .opacity-val {
    font-size: 10.5px;
    color: #e2e8f0;
    font-family: monospace;
    min-width: 30px;
    text-align: right;
  }

  .spinner-small {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .spinner {
    width: 10px;
    height: 10px;
    border: 2px solid rgba(245, 158, 11, 0.3);
    border-top-color: #f59e0b;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
