<script lang="ts">
  import type { SatellitePass } from '../models/pass.model';
  import { PRESETS } from '../lib/types';

  interface Props {
    pass: SatellitePass;
    onToggle: (id: string) => void;
    onOpacityChange: (id: string, opacity: number) => void;
    onPresetChange?: (id: string, preset: string) => void;
  }

  let { pass, onToggle, onOpacityChange, onPresetChange }: Props = $props();

  function getCloudBadgeClass(cloud: number): string {
    if (cloud < 10) return 'cloud-low';
    if (cloud < 30) return 'cloud-med';
    return 'cloud-high';
  }
</script>

<div
  class="pass-card"
  class:active={pass.isVisible}
  onclick={() => onToggle(pass.id)}
  role="button"
  tabindex="0"
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(pass.id); }}
>
  <div class="pass-card-header">
    <div class="pass-meta">
      <span class="pass-orbit-badge">{pass.orbitFormatted}</span>
      <span class="pass-date">{pass.date}</span>
      <span class="pass-id-sub">{pass.id}</span>
    </div>
    
    <div class="active-status-pill" class:is-live={pass.isVisible}>
      {#if pass.isVisible}
        <span class="live-dot"></span>
        <span class="status-text">ACTIVE</span>
      {:else}
        <span class="status-text idle">CLICK TO VIEW</span>
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
    <span class="badge provider-badge {pass.provider}">
      {pass.provider.toUpperCase()}
    </span>
  </div>

  <!-- Individual Per-Pass Band Recipe Selector -->
  <div class="pass-preset-row" onclick={(e) => e.stopPropagation()} role="presentation">
    <div class="preset-row-header">
      <span class="preset-row-label">Combination</span>
      {#if pass.isVisible}
        <span class="preset-live-badge">Live &lt;10ms</span>
      {/if}
    </div>
    <select
      id="preset-select-{pass.id}"
      class="card-preset-select"
      value={pass.preset}
      onchange={(e) => onPresetChange?.(pass.id, (e.target as HTMLSelectElement).value)}
      title="Select band combination for this individual pass"
    >
      {#each PRESETS as p}
        <option value={p.id}>[{p.badge}] {p.label}</option>
      {/each}
    </select>
  </div>

  {#if pass.isVisible}
    <div class="pass-opacity-control" onclick={(e) => e.stopPropagation()} role="presentation">
      <span class="opacity-label">Opacity</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={pass.opacity}
        class="opacity-slider"
        oninput={(e) => onOpacityChange(pass.id, parseFloat((e.target as HTMLInputElement).value))}
      />
      <span class="opacity-val">{Math.round(pass.opacity * 100)}%</span>
    </div>
  {/if}
</div>

<style>
  .pass-card {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 8px;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    cursor: pointer;
  }

  .pass-card:hover {
    border-color: rgba(56, 189, 248, 0.4);
    background: rgba(30, 41, 59, 0.9);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  }

  .pass-card.active {
    background: rgba(14, 116, 144, 0.28);
    border-color: #06b6d4;
    box-shadow: 0 4px 16px rgba(6, 182, 212, 0.35);
  }

  .pass-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pass-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .pass-orbit-badge {
    background: linear-gradient(135deg, #0284c7, #0369a1);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }

  .pass-date {
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
  }

  .pass-id-sub {
    font-size: 10px;
    font-family: monospace;
    color: #94a3b8;
  }

  .active-status-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: 0.2s;
  }

  .active-status-pill.is-live {
    background: rgba(6, 182, 212, 0.2);
    border-color: #06b6d4;
    color: #22d3ee;
  }

  .status-text.idle {
    color: #64748b;
  }

  .pass-card:hover .status-text.idle {
    color: #94a3b8;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    background: #06b6d4;
    border-radius: 50%;
    box-shadow: 0 0 8px #06b6d4;
    animation: pulse-dot 1.5s infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }

  .pass-details {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  .badge {
    font-size: 10.5px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
  }

  .cloud-low {
    background: rgba(34, 197, 94, 0.18);
    color: #86efac;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .cloud-med {
    background: rgba(234, 179, 8, 0.18);
    color: #fde047;
    border: 1px solid rgba(234, 179, 8, 0.3);
  }

  .cloud-high {
    background: rgba(148, 163, 184, 0.18);
    color: #cbd5e1;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }

  .granule-badge {
    background: rgba(139, 92, 246, 0.18);
    color: #d8b4fe;
    border: 1px solid rgba(139, 92, 246, 0.3);
  }

  .provider-badge.esa {
    background: rgba(56, 189, 248, 0.15);
    color: #7dd3fc;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  /* Individual Per-Pass Band Recipe Row */
  .pass-preset-row {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .preset-row-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .preset-row-label {
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .preset-live-badge {
    font-size: 9px;
    font-weight: 700;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.28);
    padding: 1px 5px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .card-preset-select {
    width: 100%;
    box-sizing: border-box;
    padding: 4px 6px;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 5px;
    color: #f1f5f9;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    outline: none;
    transition: all 0.15s ease;
  }

  .card-preset-select:hover {
    border-color: rgba(56, 189, 248, 0.5);
  }

  .card-preset-select:focus {
    border-color: #38bdf8;
    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
  }

  .pass-opacity-control {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px dashed rgba(255, 255, 255, 0.1);
  }

  .opacity-label {
    font-size: 10px;
    color: #94a3b8;
    text-transform: uppercase;
    font-weight: 600;
  }

  .opacity-slider {
    flex: 1;
    height: 4px;
    appearance: none;
    background: #334155;
    border-radius: 2px;
    outline: none;
  }

  .opacity-slider::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #38bdf8;
    cursor: pointer;
  }

  .opacity-val {
    font-size: 10.5px;
    font-family: monospace;
    color: #e2e8f0;
    min-width: 32px;
    text-align: right;
  }
</style>
