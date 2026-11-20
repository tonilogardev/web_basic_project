<script lang="ts">
  import { store } from '../lib/store.svelte';
  import { ImageExportService, MemoryZipBuilder } from '../lib/services/ImageExportService';

  let selectedFormat = $state<'png' | 'geotiff'>('png');
  let feedbackMessage = $state<string | null>(null);
  let isProcessing = $state(false);
  let progressPercent = $state(0);
  let progressStatus = $state('');

  let modalData = $derived(store.exportModal);
  let isSingle = $derived(modalData.mode === 'single');
  let pass = $derived(modalData.pass);

  function handleClose() {
    if (isProcessing) return;
    feedbackMessage = null;
    isProcessing = false;
    progressPercent = 0;
    store.closeExportModal();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !isProcessing) {
      handleClose();
    }
  }

  async function handleDownload() {
    if (selectedFormat === 'geotiff') {
      const targetLabel = isSingle && pass ? `Pass ${pass.date}` : `${modalData.passesCount} Scenes`;
      feedbackMessage = `💳 Payment Gateway Preview!\nFormat: Scientific GeoTIFF 10m (Pro)\nTarget: ${targetLabel}\nPrice: €2.50\n\n(Stripe Checkout & Rust GDAL pipeline ready to be connected)`;
      return;
    }

    // Visual PNG Export (100% Client-Side, Free)
    isProcessing = true;
    feedbackMessage = null;
    progressPercent = 5;

    try {
      const activeBbox = modalData.session?.snapshot.boundingBox || store.boundingBox || pass?.combinedBbox;
      if (!activeBbox) {
        throw new Error('No bounding box found for export');
      }
      const activePolygon = store.polygon;

      if (isSingle && pass) {
        progressStatus = `Compositing tiles for pass ${pass.date}...`;
        const blob = await ImageExportService.exportPassToPngBlob(
          pass,
          activeBbox,
          activePolygon,
          13,
          (p) => { progressPercent = p; }
        );
        const filename = `Sentinel2_${pass.date}_${pass.orbitFormatted}_${pass.preset.toUpperCase()}.png`;
        ImageExportService.triggerDownload(blob, filename);
        feedbackMessage = `✅ Download Complete!\nFile: ${filename}\nSize: ${(blob.size / 1024).toFixed(1)} KB\nClipped to: ${activePolygon ? 'Exact Polygon' : 'Bounding Box'}`;
      } else {
        // Export All (ZIP)
        const sessionPasses = modalData.customPasses || modalData.session?.passes || store.passes;
        if (!sessionPasses || sessionPasses.length === 0) {
          throw new Error('No passes found to export');
        }

        const zipBuilder = new MemoryZipBuilder();
        const total = sessionPasses.length;

        for (let i = 0; i < total; i++) {
          const currentPass = sessionPasses[i];
          progressStatus = `Exporting pass ${i + 1} of ${total} (${currentPass.date})...`;
          progressPercent = Math.round((i / total) * 90);

          const passBlob = await ImageExportService.exportPassToPngBlob(
            currentPass,
            activeBbox,
            activePolygon,
            12
          );

          const passBytes = new Uint8Array(await passBlob.arrayBuffer());
          const passFilename = `Sentinel2_${currentPass.date}_${currentPass.orbitFormatted}_${currentPass.preset.toUpperCase()}.png`;
          zipBuilder.addFile(passFilename, passBytes);
        }

        progressStatus = 'Packaging ZIP archive...';
        progressPercent = 95;
        const zipBlob = zipBuilder.generateZipBlob();
        const sessionTitle = modalData.session?.title?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Session';
        const zipFilename = `Sentinel2_Export_${sessionTitle}.zip`;
        ImageExportService.triggerDownload(zipBlob, zipFilename);
        progressPercent = 100;
        feedbackMessage = `✅ ZIP Archive Downloaded!\nFile: ${zipFilename}\nTotal Passes: ${total}\nTotal Size: ${(zipBlob.size / (1024 * 1024)).toFixed(2)} MB`;
      }
    } catch (err: any) {
      feedbackMessage = `❌ Export error: ${err.message || err}`;
    } finally {
      isProcessing = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if modalData.isOpen}
  <div class="modal-backdrop" onclick={handleClose} role="presentation">
    <div
      class="modal-container"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-labelledby="export-modal-title"
    >
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-icon-box">📥</div>
        <div class="header-text">
          <h2 id="export-modal-title">
            {isSingle ? 'Export Satellite Pass' : 'Export All Passes (ZIP)'}
          </h2>
          <span class="header-subtitle">
            {#if isSingle && pass}
              {pass.date} • Orbit {pass.orbitFormatted} • Preset [{pass.preset.toUpperCase()}]
            {:else}
              Session: {modalData.session?.title || 'Active Session'} • {modalData.passesCount} total passes
            {/if}
          </span>
        </div>
        <button
          type="button"
          class="btn-close"
          onclick={handleClose}
          aria-label="Close modal"
          title="Close (Esc)"
        >
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <p class="section-title">Select Export Format</p>

        <!-- Format Option 1: PNG (Free) -->
        <label
          class="format-card"
          class:selected={selectedFormat === 'png'}
        >
          <input
            type="radio"
            name="export-format"
            value="png"
            checked={selectedFormat === 'png'}
            onchange={() => { selectedFormat = 'png'; feedbackMessage = null; }}
          />
          <div class="format-card-content">
            <div class="card-title-row">
              <span class="card-name">Visual Image (PNG)</span>
              <span class="badge badge-free">FREE</span>
            </div>
            <p class="card-desc">
              High-resolution visual raster clipped transparently to your selected AOI boundary. Ideal for presentations, reports, and immediate sharing.
            </p>
            <div class="card-specs">
              <span>• Zero server latency</span>
              <span>• Transparent polygon clipping</span>
              <span>• 8-bit RGBA</span>
            </div>
          </div>
        </label>

        <!-- Format Option 2: GeoTIFF (Pro) -->
        <label
          class="format-card"
          class:selected={selectedFormat === 'geotiff'}
        >
          <input
            type="radio"
            name="export-format"
            value="geotiff"
            checked={selectedFormat === 'geotiff'}
            onchange={() => { selectedFormat = 'geotiff'; feedbackMessage = null; }}
          />
          <div class="format-card-content">
            <div class="card-title-row">
              <span class="card-name">Scientific GeoTIFF (.tif)</span>
              <span class="badge badge-pro">€2.50 PRO</span>
            </div>
            <p class="card-desc">
              Full native 10-meter per pixel georeferenced multiband raster with raw surface reflectance values and spatial coordinate reference system (CRS).
            </p>
            <div class="card-specs">
              <span>• Full 10m native resolution</span>
              <span>• 16-bit / 32-bit float bands</span>
              <span>• QGIS / ArcGIS ready</span>
            </div>
          </div>
        </label>

        <!-- Progress Bar when exporting -->
        {#if isProcessing}
          <div class="progress-container">
            <div class="progress-status-row">
              <span class="status-label">{progressStatus}</span>
              <span class="status-percent">{progressPercent}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar" style="width: {progressPercent}%;"></div>
            </div>
          </div>
        {/if}

        <!-- Feedback / Interaction Banner -->
        {#if feedbackMessage}
          <div class="feedback-banner" class:is-pro={selectedFormat === 'geotiff'}>
            <pre>{feedbackMessage}</pre>
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button
          type="button"
          class="btn-secondary"
          onclick={handleClose}
          disabled={isProcessing}
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn-primary"
          class:pro-btn={selectedFormat === 'geotiff'}
          onclick={handleDownload}
          disabled={isProcessing}
        >
          {#if isProcessing}
            Processing Export... ⏳
          {:else if selectedFormat === 'png'}
            Download Visual PNG 🚀
          {:else}
            Proceed with GeoTIFF (€2.50) 💳
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    animation: fadeIn 0.18s ease-out;
  }

  .modal-container {
    width: 100%;
    max-width: 520px;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 16px;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 20px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .header-icon-box {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.4));
    border: 1px solid rgba(56, 189, 248, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }

  .header-text {
    flex: 1;
  }

  .header-text h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: -0.2px;
  }

  .header-subtitle {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
    display: block;
  }

  .btn-close {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    border-radius: 8px;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-close:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    color: #fca5a5;
  }

  .modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: calc(85vh - 140px);
    overflow-y: auto;
  }

  .section-title {
    margin: 0 0 2px 0;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #94a3b8;
  }

  .format-card {
    display: flex;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 12px;
    background: rgba(30, 41, 59, 0.5);
    border: 1.5px solid rgba(255, 255, 255, 0.08);
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .format-card:hover {
    border-color: rgba(56, 189, 248, 0.4);
    background: rgba(30, 41, 59, 0.8);
  }

  .format-card.selected {
    background: rgba(14, 116, 144, 0.22);
    border-color: #06b6d4;
    box-shadow: 0 4px 16px rgba(6, 182, 212, 0.15);
  }

  .format-card input[type='radio'] {
    margin-top: 4px;
    accent-color: #06b6d4;
    cursor: pointer;
  }

  .format-card-content {
    flex: 1;
  }

  .card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .card-name {
    font-size: 14px;
    font-weight: 700;
    color: #f1f5f9;
  }

  .badge {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 10px;
  }

  .badge-free {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.4);
  }

  .badge-pro {
    background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(245, 158, 11, 0.4));
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.5);
  }

  .card-desc {
    font-size: 12px;
    color: #cbd5e1;
    margin: 0 0 8px 0;
    line-height: 1.45;
  }

  .card-specs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    font-size: 11px;
    color: #94a3b8;
  }

  .progress-container {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(56, 189, 248, 0.3);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: fadeIn 0.2s ease-out;
  }

  .progress-status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }

  .status-label {
    color: #38bdf8;
    font-weight: 600;
  }

  .status-percent {
    color: #f1f5f9;
    font-weight: 800;
    font-family: monospace;
  }

  .progress-track {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #0284c7, #38bdf8);
    border-radius: 3px;
    transition: width 0.25s ease;
  }

  .feedback-banner {
    margin-top: 6px;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(14, 116, 144, 0.25);
    border: 1px solid rgba(6, 182, 212, 0.4);
    animation: fadeIn 0.2s ease-out;
  }

  .feedback-banner.is-pro {
    background: rgba(234, 179, 8, 0.15);
    border-color: rgba(245, 158, 11, 0.4);
  }

  .feedback-banner pre {
    margin: 0;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.5;
    color: #f8fafc;
    white-space: pre-wrap;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: rgba(255, 255, 255, 0.02);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .btn-secondary {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #cbd5e1;
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
  }

  .btn-primary {
    background: linear-gradient(135deg, #0284c7, #0284c7);
    border: 1px solid #38bdf8;
    color: #fff;
    padding: 9px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(2, 132, 199, 0.4);
    transition: all 0.15s ease;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.6);
  }

  .btn-primary.pro-btn {
    background: linear-gradient(135deg, #d97706, #b45309);
    border-color: #fbbf24;
    box-shadow: 0 2px 10px rgba(217, 119, 6, 0.4);
  }

  .btn-primary.pro-btn:hover {
    box-shadow: 0 4px 14px rgba(217, 119, 6, 0.6);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
