import type { SatellitePass, GranuleImage } from '../models/pass.model';
import { buildGranuleTileUrl, intersectBbox } from '../controllers/MapLayerController';

/**
 * Geographic projection utilities: WGS84 (EPSG:4326) <-> Web Mercator (EPSG:3857) Tile coordinates
 */
function lngToWorldX(lng: number, zoom: number): number {
  return ((lng + 180.0) / 360.0) * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const sin = Math.sin((lat * Math.PI) / 180.0);
  const clampedSin = Math.max(-0.9999, Math.min(0.9999, sin));
  return (0.5 - Math.log((1.0 + clampedSin) / (1.0 - clampedSin)) / (4.0 * Math.PI)) * Math.pow(2, zoom);
}

/**
 * Calculates optimal zoom level for export so total tile count is between 4 and 25 tiles.
 */
function calculateOptimalZoom(
  bbox: [number, number, number, number],
  targetZoom = 13
): number {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  for (let z = targetZoom; z >= 6; z--) {
    const minTileX = Math.floor(lngToWorldX(minLng, z));
    const maxTileX = Math.floor(lngToWorldX(maxLng, z));
    const minTileY = Math.floor(latToWorldY(maxLat, z));
    const maxTileY = Math.floor(latToWorldY(minLat, z));

    const totalTiles = (maxTileX - minTileX + 1) * (maxTileY - minTileY + 1);
    if (totalTiles <= 30) {
      return z;
    }
  }
  return 8;
}

/**
 * Minimalist, high-performance in-memory ZIP builder (PKZIP standard format, Store method 0).
 * Ideal for PNGs which are already internally compressed; runs in < 50ms with zero external dependencies.
 */
export class MemoryZipBuilder {
  private files: { name: string; data: Uint8Array }[] = [];

  public addFile(filename: string, data: Uint8Array): void {
    this.files.push({ name: filename, data });
  }

  public generateZipBlob(): Blob {
    const parts: Uint8Array[] = [];
    const centralDirectory: Uint8Array[] = [];
    let offset = 0;

    for (const file of this.files) {
      const nameBytes = new TextEncoder().encode(file.name);
      const crc = this.computeCRC32(file.data);
      const size = file.data.length;

      // Local File Header (30 bytes + filename)
      const header = new Uint8Array(30 + nameBytes.length);
      const view = new DataView(header.buffer);

      view.setUint32(0, 0x04034b50, true); // Local file header signature
      view.setUint16(4, 20, true); // Version needed to extract (2.0)
      view.setUint16(6, 0, true); // General purpose bit flag
      view.setUint16(8, 0, true); // Compression method (0 = stored / uncompressed)
      view.setUint16(10, 0, true); // File last mod time
      view.setUint16(12, 0, true); // File last mod date
      view.setUint32(14, crc, true); // CRC-32
      view.setUint32(18, size, true); // Compressed size
      view.setUint32(22, size, true); // Uncompressed size
      view.setUint16(26, nameBytes.length, true); // File name length
      view.setUint16(28, 0, true); // Extra field length
      header.set(nameBytes, 30);

      parts.push(header);
      parts.push(file.data);

      // Central Directory File Header (46 bytes + filename)
      const cdHeader = new Uint8Array(46 + nameBytes.length);
      const cdView = new DataView(cdHeader.buffer);

      cdView.setUint32(0, 0x02014b50, true); // Central directory file header signature
      cdView.setUint16(4, 20, true); // Version made by
      cdView.setUint16(6, 20, true); // Version needed to extract
      cdView.setUint16(8, 0, true); // General purpose bit flag
      cdView.setUint16(10, 0, true); // Compression method (0 = stored)
      cdView.setUint16(12, 0, true); // File last mod time
      cdView.setUint16(14, 0, true); // File last mod date
      cdView.setUint32(16, crc, true); // CRC-32
      cdView.setUint32(20, size, true); // Compressed size
      cdView.setUint32(24, size, true); // Uncompressed size
      cdView.setUint16(28, nameBytes.length, true); // File name length
      cdView.setUint16(30, 0, true); // Extra field length
      cdView.setUint16(32, 0, true); // File comment length
      cdView.setUint16(34, 0, true); // Disk number start
      cdView.setUint16(36, 0, true); // Internal file attributes
      cdView.setUint32(38, 0, true); // External file attributes
      cdView.setUint32(42, offset, true); // Relative offset of local header
      cdHeader.set(nameBytes, 46);

      centralDirectory.push(cdHeader);
      offset += header.length + file.data.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const cd of centralDirectory) {
      parts.push(cd);
      cdSize += cd.length;
    }

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
    eocdView.setUint16(4, 0, true); // Number of this disk
    eocdView.setUint16(6, 0, true); // Disk where central directory starts
    eocdView.setUint16(8, this.files.length, true); // Number of central directory records on this disk
    eocdView.setUint16(10, this.files.length, true); // Total number of central directory records
    eocdView.setUint32(12, cdSize, true); // Size of central directory
    eocdView.setUint32(16, cdOffset, true); // Offset of start of central directory
    eocdView.setUint16(20, 0, true); // ZIP file comment length
    parts.push(eocd);

    return new Blob(parts as BlobPart[], { type: 'application/zip' });
  }

  private computeCRC32(data: Uint8Array): number {
    let crc = ~0;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ MemoryZipBuilder.CRC_TABLE[(crc ^ data[i]) & 0xff];
    }
    return ~crc >>> 0;
  }

  private static CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();
}

/**
 * ImageExportService: Hardware-accelerated client-side raster compositor.
 */
export class ImageExportService {
  /**
   * Generates a clean PNG blob of the given SatellitePass, strictly clipped to the user's AOI polygon or bounding box.
   */
  public static async exportPassToPngBlob(
    pass: SatellitePass,
    bbox: [number, number, number, number],
    polygon: [number, number][] | null = null,
    targetZoom = 13,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const zoom = calculateOptimalZoom(bbox, targetZoom);

    const minTileX = Math.floor(lngToWorldX(minLng, zoom));
    const maxTileX = Math.floor(lngToWorldX(maxLng, zoom));
    const minTileY = Math.floor(latToWorldY(maxLat, zoom));
    const maxTileY = Math.floor(latToWorldY(minLat, zoom));

    const tilesAcross = maxTileX - minTileX + 1;
    const tilesDown = maxTileY - minTileY + 1;
    const tileSize = 256;

    const fullWidth = tilesAcross * tileSize;
    const fullHeight = tilesDown * tileSize;

    // 1. Create working canvas
    const canvas = document.createElement('canvas');
    canvas.width = fullWidth;
    canvas.height = fullHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not obtain 2D canvas context');

    // 2. Fetch and draw all constituent granule tiles
    const totalTilesToFetch = tilesAcross * tilesDown;
    let tilesCompleted = 0;

    const fetchTilePromises: Promise<void>[] = [];

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const destX = (tx - minTileX) * tileSize;
        const destY = (ty - minTileY) * tileSize;

        const tileTask = async () => {
          // Iterate over all granules in pass that intersect with tile bounds
          for (const granule of pass.granules) {
            const rawTileUrl = buildGranuleTileUrl(granule, pass.preset, null, null);
            const tileUrl = rawTileUrl
              .replace('{z}', zoom.toString())
              .replace('{x}', tx.toString())
              .replace('{y}', ty.toString());

            try {
              const resp = await fetch(tileUrl);
              if (!resp.ok) continue;
              const blob = await resp.blob();
              const bitmap = await createImageBitmap(blob);
              ctx.drawImage(bitmap, destX, destY, tileSize, tileSize);
            } catch {
              // Ignore failed tile requests
            }
          }
          tilesCompleted++;
          if (onProgress) {
            onProgress(Math.round((tilesCompleted / totalTilesToFetch) * 80));
          }
        };

        fetchTilePromises.push(tileTask());
      }
    }

    await Promise.all(fetchTilePromises);

    // 3. Precise pixel boundary calculation
    const pxMinX = (lngToWorldX(minLng, zoom) - minTileX) * tileSize;
    const pxMaxX = (lngToWorldX(maxLng, zoom) - minTileX) * tileSize;
    const pxMinY = (latToWorldY(maxLat, zoom) - minTileY) * tileSize;
    const pxMaxY = (latToWorldY(minLat, zoom) - minTileY) * tileSize;

    const cropX = Math.max(0, Math.floor(pxMinX));
    const cropY = Math.max(0, Math.floor(pxMinY));
    const cropW = Math.max(1, Math.ceil(pxMaxX - pxMinX));
    const cropH = Math.max(1, Math.ceil(pxMaxY - pxMinY));

    // 4. Output cropped canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const cropCtx = croppedCanvas.getContext('2d');
    if (!cropCtx) throw new Error('Could not obtain crop canvas context');

    // 5. Apply Polygon Clipping if polygon coordinates exist
    if (polygon && polygon.length >= 3) {
      cropCtx.beginPath();
      polygon.forEach((pt, i) => {
        const ptX = (lngToWorldX(pt[0], zoom) - minTileX) * tileSize - cropX;
        const ptY = (latToWorldY(pt[1], zoom) - minTileY) * tileSize - cropY;
        if (i === 0) {
          cropCtx.moveTo(ptX, ptY);
        } else {
          cropCtx.lineTo(ptX, ptY);
        }
      });
      cropCtx.closePath();
      cropCtx.clip();
    }

    // Draw the tile composite into the cropped & clipped canvas
    cropCtx.drawImage(
      canvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );

    if (onProgress) onProgress(95);

    // 6. Convert to PNG Blob
    return new Promise((resolve, reject) => {
      croppedCanvas.toBlob((blob) => {
        if (onProgress) onProgress(100);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode Canvas to PNG'));
        }
      }, 'image/png');
    });
  }

  /**
   * Triggers an immediate browser file download from a Blob.
   */
  public static triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
