<script lang="ts">
  import { store } from '../lib/store.svelte';
  import { draggable } from '../lib/draggable';
  import type { SearchSession } from '../lib/models/session.model';
  import { waterAnalysisController } from '../lib/controllers/WaterAnalysisController';
  import PassCard from './PassCard.svelte';

  interface Props {
    session: SearchSession;
  }

  let { session }: Props = $props();

  let collapsed = $state(false);

  function handleClose() {
    store.closeSession(session.id);
  }

  function handleToggleImagery() {
    waterAnalysisController.toggleSessionImagery(session);
  }

  let bbox = $derived(session.snapshot.boundingBox);
  let swStr = $derived(`[${bbox[0].toFixed(3)}, ${bbox[1].toFixed(3)}]`);
  let neStr = $derived(`[${bbox[2].toFixed(3)}, ${bbox[3].toFixed(3)}]`);
</script>

<aside
  class="pass-list-panel"
  class:is-collapsed={collapsed}
  use:draggable={{
    handle: '.panel-header',
    initialX: session.position.x,
    initialY: session.position.y,
  }}
>
  <!-- Window Header / Drag Handle -->
  <div class="panel-header">
    <div class="header-left">
      <span class="drag-grip" title="Drag window">⠿</span>
      <div class="title-wrap">
        <h2>{session.title}</h2>
      </div>
    </div>

    <div class="window-controls">
      <button
        type="button"
        class="win-btn"
        onclick={() => (collapsed = !collapsed)}
        aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? '+' : '−'}
      </button>
      <button
        type="button"
        class="win-btn close"
        onclick={handleClose}
        aria-label="Close window"
        title="Close session"
      >
        ✕
      </button>
    </div>
  </div>

  {#if !collapsed}
    <div class="panel-content">
      <!-- Session Criteria Summary -->
      <div class="session-criteria-block">
        <div class="criteria-row">
          <span class="criteria-label">Date Range</span>
          <span class="criteria-val">
            {session.snapshot.startDate} → {session.snapshot.endDate}
            <span class="badge-days">{session.snapshot.dateRangeDays}d</span>
          </span>
        </div>

        <div class="criteria-row">
          <span class="criteria-label">Rectangle (AOI)</span>
          <span class="badge-area">{session.snapshot.areaKm2.toFixed(1)} km²</span>
        </div>

        <div class="coords-row">
          <span>SW: <span class="coord-val">{swStr}</span></span>
          <span>NE: <span class="coord-val">{neStr}</span></span>
        </div>
      </div>

      <!-- Benchmark Telemetry -->
      <div class="telemetry-strip">
        <div class="tele-item">
          <span class="tele-label">SPEED</span>
          <span class="tele-val highlight">{session.benchmark?.stacLatencyMs ?? 0}ms STAC</span>
        </div>
        <div class="tele-item">
          <span class="tele-label">GROUP ENGINE</span>
          <span class="tele-val">{session.benchmark?.groupingLatencyMs ?? 0}ms</span>
        </div>
        <div class="tele-item">
          <span class="tele-label">CACHE HIT RATIO</span>
          <span class="tele-val">0.0%</span>
        </div>
      </div>

      <!-- Visibility Action Row -->
      <div class="imagery-action-row">
        <button
          type="button"
          class="btn-toggle-imagery"
          class:is-hidden={session.isImageryHidden}
          onclick={handleToggleImagery}
        >
          {session.isImageryHidden ? 'Show Imagery' : 'Hide Imagery'}
        </button>

        <span class="imagery-status" class:hidden={session.isImageryHidden}>
          {session.isImageryHidden ? 'All Passes Hidden' : 'Active Pass Visible'}
        </span>

        <span class="badge-esa">ESA</span>
      </div>

      <!-- Passes Scrollable Feed -->
      <div class="passes-scroll-feed">
        {#each session.passes as pass (pass.id)}
          <PassCard {session} {pass} />
        {/each}
      </div>
    </div>
  {/if}
</aside>

<style>
  .pass-list-panel {
    width: 360px;
    max-height: calc(100vh - 110px);
    background: rgba(15, 23, 42, 0.92);
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
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: absolute;
    z-index: 20;
    transition: box-shadow 0.2s ease;
  }

  .pass-list-panel:hover {
    box-shadow:
      0 24px 48px -12px rgba(0, 0, 0, 0.7),
      0 0 20px rgba(6, 182, 212, 0.15);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: rgba(30, 41, 59, 0.75);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px 12px 0 0;
    cursor: grab;
    flex-shrink: 0;
  }

  :global(.pass-list-panel.is-dragging) .panel-header {
    cursor: grabbing;
  }

  .is-collapsed .panel-header {
    border-bottom: none;
    border-radius: 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .drag-grip {
    color: #64748b;
    font-size: 15px;
    line-height: 1;
  }

  .title-wrap h2 {
    font-size: 13.5px;
    font-weight: 700;
    color: #38bdf8;
    margin: 0;
  }

  .window-controls {
    display: flex;
    gap: 6px;
  }

  .win-btn {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .win-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
  }

  .win-btn.close:hover {
    background: #ef4444;
    border-color: #ef4444;
    color: #ffffff;
  }

  .panel-content {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .session-criteria-block {
    padding: 10px 14px;
    background: rgba(15, 23, 42, 0.6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .criteria-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
  }

  .criteria-label {
    color: #94a3b8;
  }

  .criteria-val {
    color: #e2e8f0;
    font-family: monospace;
    font-weight: 600;
  }

  .badge-days {
    background: rgba(14, 165, 233, 0.15);
    color: #38bdf8;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 10px;
    margin-left: 4px;
  }

  .badge-area {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10.5px;
    font-family: monospace;
  }

  .coords-row {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #64748b;
    font-family: monospace;
    margin-top: 2px;
  }

  .coord-val {
    color: #94a3b8;
  }

  .telemetry-strip {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(30, 41, 59, 0.35);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .tele-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tele-label {
    font-size: 8.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .tele-val {
    font-size: 10px;
    font-family: monospace;
    color: #94a3b8;
  }

  .tele-val.highlight {
    color: #22d3ee;
    font-weight: 700;
  }

  .imagery-action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: rgba(15, 23, 42, 0.4);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .btn-toggle-imagery {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #fca5a5;
    padding: 4px 10px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-toggle-imagery:hover {
    background: rgba(239, 68, 68, 0.25);
    color: #ffffff;
  }

  .btn-toggle-imagery.is-hidden {
    background: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.35);
    color: #86efac;
  }

  .imagery-status {
    font-size: 11px;
    font-weight: 600;
    color: #22d3ee;
  }

  .imagery-status.hidden {
    color: #64748b;
  }

  .badge-esa {
    background: rgba(14, 165, 233, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(14, 165, 233, 0.3);
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
  }

  .passes-scroll-feed {
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    max-height: calc(100vh - 290px);
  }

  .passes-scroll-feed::-webkit-scrollbar {
    width: 5px;
  }

  .passes-scroll-feed::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }
</style>
