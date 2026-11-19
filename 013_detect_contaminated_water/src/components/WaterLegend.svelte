<script lang="ts">
  import { WATER_QUALITY_CLASSES, type WaterQualityClassId } from '../lib/models/water.model';

  let isVisible = $state(true);

  const displayClasses = (Object.keys(WATER_QUALITY_CLASSES) as unknown as WaterQualityClassId[])
    .map(Number)
    .filter((id) => id > 0) as WaterQualityClassId[];
</script>

{#if isVisible}
  <aside class="water-legend-panel" aria-label="Water Quality Legend">
    <div class="legend-header">
      <div class="title-wrap">
        <h4>Water Quality Classification</h4>
        <span class="legend-subtitle">Bio-optical Classes</span>
      </div>

      <button
        type="button"
        class="btn-toggle"
        onclick={() => (isVisible = false)}
        title="Hide legend"
      >
        Hide
      </button>
    </div>

    <div class="legend-body">
      <div class="legend-items-list">
        {#each displayClasses as classId}
          {@const item = WATER_QUALITY_CLASSES[classId]}
          <div class="legend-row">
            <span class="color-swatch" style="background-color: {item.colorHex};"></span>
            <div class="row-text">
              <span class="row-label">{item.label}</span>
              <span class="row-desc">{item.description}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </aside>
{:else}
  <button
    type="button"
    class="btn-show-legend"
    onclick={() => (isVisible = true)}
    title="Show water quality legend"
  >
    Show Legend
  </button>
{/if}

<style>
  .water-legend-panel {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 290px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 12px;
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6);
    color: #f8fafc;
    font-family: inherit;
    z-index: 60;
    overflow: hidden;
    user-select: none;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .legend-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: rgba(30, 41, 59, 0.75);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .title-wrap h4 {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.02em;
  }

  .legend-subtitle {
    font-size: 10px;
    color: #22d3ee;
    font-weight: 500;
  }

  .btn-toggle {
    padding: 3px 9px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 5px;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-toggle:hover {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.25);
  }

  .btn-show-legend {
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 8px 14px;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(6, 182, 212, 0.35);
    border-radius: 8px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    color: #f1f5f9;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    z-index: 60;
    transition: all 0.15s ease;
    animation: fadeIn 0.2s ease-out;
  }

  .btn-show-legend:hover {
    background: rgba(30, 41, 59, 0.95);
    color: #38bdf8;
    border-color: rgba(56, 189, 248, 0.5);
    box-shadow: 0 12px 30px -5px rgba(6, 182, 212, 0.25);
  }

  .legend-body {
    padding: 10px 14px 12px;
  }

  .legend-items-list {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .legend-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .color-swatch {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
  }

  .row-text {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
  }

  .row-label {
    font-size: 11px;
    font-weight: 700;
    color: #f1f5f9;
  }

  .row-desc {
    font-size: 9.5px;
    color: #94a3b8;
  }
</style>
