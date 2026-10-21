import maplibregl from 'maplibre-gl';

// 1x1 transparent PNG buffer cached in memory
let emptyTileBuffer: ArrayBuffer | null = null;

function getEmptyTileBuffer(): ArrayBuffer {
  if (!emptyTileBuffer) {
    const bin = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    emptyTileBuffer = bytes.buffer;
  }
  return emptyTileBuffer;
}

let protocolRegistered = false;

/**
 * Registers the 'clipped://' custom protocol on MapLibre GL JS.
 * Intercepts tile requests with an 'aoi=minLng,minLat,maxLng,maxLat' query parameter
 * and clips the raster pixels strictly to the AOI rectangle.
 * Pixels outside the AOI become 100% transparent.
 */
export function registerClippedProtocol() {
  if (protocolRegistered) return;
  protocolRegistered = true;

  maplibregl.addProtocol('clipped', async (params, abortController) => {
    // 1. Remove the custom protocol prefix
    const rawUrl = params.url.replace(/^clipped:\/\//, '');

    // 2. Parse URL and extract clipping AOI
    const urlObj = new URL(rawUrl);
    const aoiParam = urlObj.searchParams.get('aoi');

    // Remove 'aoi' before forwarding to TiTiler
    urlObj.searchParams.delete('aoi');
    const fetchUrl = urlObj.toString();

    // 3. Extract tile coordinates {z, x, y} from URL pattern (/WebMercatorQuad/{z}/{x}/{y}.png)
    const match = urlObj.pathname.match(/\/(\d+)\/(\d+)\/(\d+)\.(png|webp|jpg)$/i);

    if (!aoiParam || !match) {
      // No AOI specified or not a standard XYZ tile: pass-through directly
      const resp = await fetch(fetchUrl, { signal: abortController.signal });
      if (!resp.ok) throw new Error(`Tile fetch error: ${resp.status}`);
      const buffer = await resp.arrayBuffer();
      return { data: buffer };
    }

    const [aoiMinLng, aoiMinLat, aoiMaxLng, aoiMaxLat] = aoiParam.split(',').map(Number);
    const z = parseInt(match[1], 10);
    const x = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);

    const n = Math.pow(2, z);
    const tileSize = 256;

    // Calculate pixel coordinates of the AOI within this {z, x, y} tile
    const worldMinX = (aoiMinLng + 180.0) / 360.0;
    const worldMaxX = (aoiMaxLng + 180.0) / 360.0;
    const pxMin = (worldMinX * n - x) * tileSize;
    const pxMax = (worldMaxX * n - x) * tileSize;

    const sinMaxLat = Math.sin((aoiMaxLat * Math.PI) / 180.0);
    const wyMin = 0.5 - Math.log((1.0 + sinMaxLat) / (1.0 - sinMaxLat)) / (4.0 * Math.PI);
    const pyMin = (wyMin * n - y) * tileSize;

    const sinMinLat = Math.sin((aoiMinLat * Math.PI) / 180.0);
    const wyMax = 0.5 - Math.log((1.0 + sinMinLat) / (1.0 - sinMinLat)) / (4.0 * Math.PI);
    const pyMax = (wyMax * n - y) * tileSize;

    // A. Tile is completely outside the AOI: return transparent tile immediately (0 network calls)
    if (pxMax <= 0 || pxMin >= tileSize || pyMax <= 0 || pyMin >= tileSize) {
      return { data: getEmptyTileBuffer() };
    }

    // B. Tile is completely inside the AOI: fetch and return directly (0 canvas overhead)
    if (pxMin <= 0 && pxMax >= tileSize && pyMin <= 0 && pyMax >= tileSize) {
      const resp = await fetch(fetchUrl, { signal: abortController.signal });
      if (!resp.ok) throw new Error(`Tile fetch error: ${resp.status}`);
      const buffer = await resp.arrayBuffer();
      return { data: buffer };
    }

    // C. Boundary tile: fetch original image and clip pixels along AOI border
    const resp = await fetch(fetchUrl, { signal: abortController.signal });
    if (!resp.ok) throw new Error(`Tile fetch error: ${resp.status}`);
    const blob = await resp.blob();

    const bitmap = await createImageBitmap(blob);
    const actualTileSize = bitmap.width || tileSize;

    const scale = actualTileSize / tileSize;
    const clipX = Math.max(0, pxMin * scale);
    const clipY = Math.max(0, pyMin * scale);
    const clipW = Math.max(0, Math.min(actualTileSize, pxMax * scale) - clipX);
    const clipH = Math.max(0, Math.min(actualTileSize, pyMax * scale) - clipY);

    if (clipW <= 0 || clipH <= 0) {
      bitmap.close();
      return { data: getEmptyTileBuffer() };
    }

    let buffer: ArrayBuffer;

    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(actualTileSize, actualTileSize);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, actualTileSize, actualTileSize);
        ctx.beginPath();
        ctx.rect(clipX, clipY, clipW, clipH);
        ctx.clip();
        ctx.drawImage(bitmap, 0, 0, actualTileSize, actualTileSize);
        const clippedBlob = await canvas.convertToBlob({ type: 'image/png' });
        buffer = await clippedBlob.arrayBuffer();
      } else {
        buffer = await blob.arrayBuffer();
      }
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = actualTileSize;
      canvas.height = actualTileSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, actualTileSize, actualTileSize);
        ctx.beginPath();
        ctx.rect(clipX, clipY, clipW, clipH);
        ctx.clip();
        ctx.drawImage(bitmap, 0, 0, actualTileSize, actualTileSize);
        buffer = await new Promise<ArrayBuffer>((resolve) => {
          canvas.toBlob(async (b) => {
            resolve(await b!.arrayBuffer());
          }, 'image/png');
        });
      } else {
        buffer = await blob.arrayBuffer();
      }
    }

    bitmap.close();
    return { data: buffer };
  });
}
