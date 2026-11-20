<script lang="ts">
  import { store } from '../lib/store.svelte';
  import { ImageExportService } from '../lib/services/ImageExportService';

  let modalData = $derived(store.timelapseModal);
  let passes = $derived(modalData.passes);

  let currentFrameIndex = $state(0);
  let isPlaying = $state(false);
  let playbackSpeed = $state<number>(1);
  let feedbackMessage = $state<string | null>(null);
  let isRecording = $state(false);
  let recordingProgress = $state(0);
  let recordingStatus = $state('');
  let playInterval: ReturnType<typeof setInterval> | null = null;

  // Real satellite imagery frame preview cache
  let previewUrls = $state<Record<number, string>>({});
  let loadingFrames = $state<Record<number, boolean>>({});

  let currentPass = $derived(passes.length > 0 ? passes[Math.min(currentFrameIndex, passes.length - 1)] : null);

  // Pre-fetch imagery for current frame and lookahead frames
  $effect(() => {
    if (modalData.isOpen && passes.length > 0) {
      loadPreviewFrame(currentFrameIndex);
      if (currentFrameIndex + 1 < passes.length) {
        loadPreviewFrame(currentFrameIndex + 1);
      }
      if (currentFrameIndex + 2 < passes.length) {
        loadPreviewFrame(currentFrameIndex + 2);
      }
    }
  });

  async function loadPreviewFrame(index: number) {
    if (previewUrls[index] || loadingFrames[index] || !passes[index]) return;
    loadingFrames[index] = true;

    const activeBbox = modalData.session?.snapshot.boundingBox || store.boundingBox || passes[0]?.combinedBbox;
    if (!activeBbox) {
      loadingFrames[index] = false;
      return;
    }
    const activePolygon = store.polygon;

    try {
      const blob = await ImageExportService.exportPassToPngBlob(
        passes[index],
        activeBbox,
        activePolygon,
        11 // fast preview resolution
      );
      const url = URL.createObjectURL(blob);
      previewUrls = { ...previewUrls, [index]: url };
    } catch (e) {
      console.warn('Frame render error:', e);
    } finally {
      loadingFrames[index] = false;
    }
  }

  function cleanupUrls() {
    Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
    previewUrls = {};
    loadingFrames = {};
  }

  function handleClose() {
    if (isRecording) return;
    stopPlayback();
    cleanupUrls();
    feedbackMessage = null;
    isRecording = false;
    recordingProgress = 0;
    currentFrameIndex = 0;
    store.closeTimelapseModal();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !isRecording) {
      handleClose();
    }
  }

  function togglePlay() {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function startPlayback() {
    if (passes.length <= 1) return;
    isPlaying = true;
    feedbackMessage = null;
    const intervalMs = Math.round(800 / playbackSpeed);

    if (playInterval) clearInterval(playInterval);
    playInterval = setInterval(() => {
      currentFrameIndex = (currentFrameIndex + 1) % passes.length;
    }, intervalMs);
  }

  function stopPlayback() {
    isPlaying = false;
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
  }

  function setSpeed(speed: number) {
    playbackSpeed = speed;
    if (isPlaying) {
      startPlayback(); // restart interval with new speed
    }
  }

  async function handleDownloadVideo() {
    if (passes.length === 0 || isRecording) return;

    isRecording = true;
    feedbackMessage = null;
    recordingProgress = 5;
    recordingStatus = 'Initializing video canvas encoder...';

    try {
      const activeBbox = modalData.session?.snapshot.boundingBox || store.boundingBox || passes[0]?.combinedBbox;
      if (!activeBbox) throw new Error('No bounding box found for video generation');
      const activePolygon = store.polygon;

      // 1. Export all pass frames as Blobs / ImageBitmaps
      const bitmaps: ImageBitmap[] = [];
      const total = passes.length;

      for (let i = 0; i < total; i++) {
        recordingStatus = `Rendering frame ${i + 1} of ${total} (${passes[i].date})...`;
        recordingProgress = Math.round(((i + 1) / total) * 70);

        const blob = await ImageExportService.exportPassToPngBlob(
          passes[i],
          activeBbox,
          activePolygon,
          12
        );
        const bmp = await createImageBitmap(blob);
        bitmaps.push(bmp);
      }

      recordingStatus = 'Encoding video stream with telemetry HUD...';
      recordingProgress = 80;

      // 2. Set up recording canvas
      const width = bitmaps[0].width;
      const height = bitmaps[0].height;
      const recCanvas = document.createElement('canvas');
      recCanvas.width = width;
      recCanvas.height = height;
      const ctx = recCanvas.getContext('2d')!;

      // 3. Determine supported MIME type
      const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1'))
        ? 'video/mp4;codecs=avc1'
        : ((typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4'))
          ? 'video/mp4'
          : 'video/webm');

      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const stream = recCanvas.captureStream(2); // 2 FPS
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000 });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recordPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
      });

      recorder.start();

      // Draw each frame with a dwell time
      const frameDurationMs = Math.round(750 / playbackSpeed);

      for (let i = 0; i < bitmaps.length; i++) {
        // Clear background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        // Draw satellite pass bitmap
        ctx.drawImage(bitmaps[i], 0, 0);

        // Draw professional telemetry HUD banner at the bottom
        const hudH = Math.max(36, Math.round(height * 0.1));
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, height - hudH, width, hudH);

        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.max(12, Math.round(hudH * 0.42))}px sans-serif`;
        ctx.fillText(`Sentinel-2 • ${passes[i].date}`, 14, height - Math.round(hudH * 0.35));

        ctx.fillStyle = '#94a3b8';
        ctx.font = `${Math.max(10, Math.round(hudH * 0.32))}px sans-serif`;
        const hudRight = `Orbit ${passes[i].orbitFormatted} • ${passes[i].preset.toUpperCase()}`;
        const rightW = ctx.measureText(hudRight).width;
        ctx.fillText(hudRight, width - rightW - 14, height - Math.round(hudH * 0.35));

        await new Promise((r) => setTimeout(r, frameDurationMs));
      }

      // Add a slight freeze frame on last pass
      await new Promise((r) => setTimeout(r, 400));
      recorder.stop();

      recordingStatus = 'Finalizing video file...';
      recordingProgress = 95;

      const videoBlob = await recordPromise;
      const sessionTitle = modalData.session?.title?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Session';
      const filename = `Sentinel2_Timelapse_${sessionTitle}.${ext}`;

      ImageExportService.triggerDownload(videoBlob, filename);
      recordingProgress = 100;
      feedbackMessage = `✅ Video Downloaded!\nFile: ${filename}\nFormat: ${ext.toUpperCase()}\nResolution: ${width}x${height}px\nTotal Frames: ${passes.length}\nFile Size: ${(videoBlob.size / 1024).toFixed(1)} KB`;
    } catch (err: any) {
      feedbackMessage = `❌ Video generation error: ${err.message || err}`;
    } finally {
      isRecording = false;
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
      aria-labelledby="timelapse-modal-title"
    >
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-icon-box">🎬</div>
        <div class="header-text">
          <h2 id="timelapse-modal-title">Satellite Time-Lapse Studio</h2>
          <span class="header-subtitle">
            {modalData.session?.title || 'Active Session'} • {passes.length} sequential frames
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
        <!-- Interactive Player Viewport -->
        <div class="video-viewport">
          <div class="viewport-overlay-top">
            <span class="frame-tag">Frame {currentFrameIndex + 1} / {passes.length}</span>
            {#if isPlaying}
              <span class="live-recording-tag">● PLAYING ({playbackSpeed}x)</span>
            {/if}
          </div>

          <!-- Central Frame Representation with Real Satellite Imagery -->
          <div class="frame-display">
            {#if previewUrls[currentFrameIndex]}
              <img
                src={previewUrls[currentFrameIndex]}
                alt="Satellite pass preview for {currentPass?.date}"
                class="preview-satellite-img"
              />
            {:else if currentPass}
              <div class="loading-frame-placeholder">
                <span class="preview-spinner"></span>
                <span class="loading-label">Loading {currentPass.date} imagery...</span>
              </div>
            {:else}
              <span class="empty-text">No passes available for animation</span>
            {/if}

            <!-- Sleek Telemetry HUD Banner Overlaid at Bottom -->
            {#if currentPass}
              <div class="frame-hud-banner">
                <div class="hud-left">
                  <span class="hud-date">{currentPass.date}</span>
                  <span class="hud-orbit">Orbit {currentPass.orbitFormatted}</span>
                </div>
                <div class="hud-right">
                  <span class="hud-preset">[{currentPass.preset.toUpperCase()}]</span>
                  <span class="hud-cloud">☁️ {currentPass.meanCloudCover}%</span>
                </div>
              </div>
            {/if}
          </div>

          <!-- Timeline Scrubber -->
          <div class="timeline-scrubber">
            <input
              type="range"
              min="0"
              max={Math.max(0, passes.length - 1)}
              value={currentFrameIndex}
              oninput={(e) => {
                currentFrameIndex = parseInt((e.target as HTMLInputElement).value, 10);
              }}
              class="scrubber-slider"
            />
          </div>
        </div>

        <!-- Controls Toolbar -->
        <div class="player-controls">
          <button
            type="button"
            class="play-btn"
            class:active={isPlaying}
            onclick={togglePlay}
            disabled={passes.length <= 1}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play Sequence'}
          </button>

          <div class="speed-selector">
            <span class="speed-label">Speed:</span>
            <button
              type="button"
              class="speed-chip"
              class:selected={playbackSpeed === 0.5}
              onclick={() => setSpeed(0.5)}
            >
              0.5x
            </button>
            <button
              type="button"
              class="speed-chip"
              class:selected={playbackSpeed === 1}
              onclick={() => setSpeed(1)}
            >
              1.0x
            </button>
            <button
              type="button"
              class="speed-chip"
              class:selected={playbackSpeed === 2}
              onclick={() => setSpeed(2)}
            >
              2.0x
            </button>
          </div>
        </div>

        <!-- Progress Bar when generating video -->
        {#if isRecording}
          <div class="progress-container">
            <div class="progress-status-row">
              <span class="status-label">{recordingStatus}</span>
              <span class="status-percent">{recordingProgress}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar" style="width: {recordingProgress}%;"></div>
            </div>
          </div>
        {/if}

        <!-- Feedback Banner -->
        {#if feedbackMessage}
          <div class="feedback-banner">
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
          disabled={isRecording}
        >
          Close
        </button>
        <button
          type="button"
          class="btn-primary"
          onclick={handleDownloadVideo}
          disabled={passes.length === 0 || isRecording}
        >
          {#if isRecording}
            Recording Video... ⏳
          {:else}
            Download Video (.mp4 / .webm) 💾
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
    max-width: 560px;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 16px;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
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
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(14, 116, 144, 0.4));
    border: 1px solid rgba(6, 182, 212, 0.4);
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
  }

  .video-viewport {
    height: 280px;
    border-radius: 12px;
    background: #090d16;
    border: 1px solid rgba(255, 255, 255, 0.12);
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 12px;
    overflow: hidden;
    box-shadow: inset 0 2px 14px rgba(0, 0, 0, 0.7);
  }

  .viewport-overlay-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 5;
  }

  .frame-tag {
    font-size: 11px;
    font-weight: 700;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(4px);
    padding: 3px 8px;
    border-radius: 6px;
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .live-recording-tag {
    font-size: 10px;
    font-weight: 800;
    color: #4ade80;
    background: rgba(34, 197, 94, 0.2);
    backdrop-filter: blur(4px);
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid rgba(34, 197, 94, 0.4);
  }

  .frame-display {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 8px;
    margin: 6px 0;
    background: radial-gradient(circle, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%);
  }

  .preview-satellite-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  }

  .loading-frame-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #94a3b8;
  }

  .preview-spinner {
    width: 22px;
    height: 22px;
    border: 2px solid rgba(56, 189, 248, 0.2);
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .frame-hud-banner {
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 5px 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    z-index: 5;
  }

  .hud-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .hud-date {
    font-size: 13px;
    font-weight: 800;
    color: #38bdf8;
    letter-spacing: -0.2px;
  }

  .hud-orbit {
    font-size: 10px;
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .hud-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .hud-preset {
    font-size: 10px;
    font-weight: 700;
    color: #f1f5f9;
  }

  .hud-cloud {
    font-size: 10px;
    color: #94a3b8;
  }

  .timeline-scrubber {
    width: 100%;
    z-index: 5;
  }

  .scrubber-slider {
    width: 100%;
    accent-color: #06b6d4;
    cursor: pointer;
  }

  .player-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
  }

  .play-btn {
    background: rgba(6, 182, 212, 0.2);
    border: 1px solid #06b6d4;
    color: #22d3ee;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .play-btn:hover:not(:disabled) {
    background: rgba(6, 182, 212, 0.35);
    transform: translateY(-1px);
  }

  .play-btn.active {
    background: rgba(239, 68, 68, 0.2);
    border-color: #ef4444;
    color: #fca5a5;
  }

  .speed-selector {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .speed-label {
    font-size: 11px;
    color: #94a3b8;
  }

  .speed-chip {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .speed-chip:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .speed-chip.selected {
    background: #0284c7;
    border-color: #38bdf8;
    color: #fff;
  }

  .progress-container {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(6, 182, 212, 0.3);
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
    background: linear-gradient(90deg, #06b6d4, #38bdf8);
    border-radius: 3px;
    transition: width 0.25s ease;
  }

  .feedback-banner {
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(6, 182, 212, 0.15);
    border: 1px solid rgba(6, 182, 212, 0.3);
    animation: fadeIn 0.2s ease-out;
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
    background: linear-gradient(135deg, #0284c7, #0369a1);
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

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.6);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
