import type { Map as MapLibreMap } from 'maplibre-gl';
import type { SatellitePass, GranuleImage } from '../models/pass.model';
import { registerClippedProtocol } from '../services/clippedProtocol';

// Register custom clipped:// protocol on MapLibre GL JS
registerClippedProtocol();

const RUST_API_BASE_URL =
  import.meta.env.VITE_RUST_API_URL ??
  import.meta.env.VITE_WATER_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname.includes('localhost')
    ? 'http://water-api.localhost:8001'
    : 'https://water-api.tonilogar.com');

/**
 * Calculates the bounding box intersection between two bboxes [minX, minY, maxX, maxY].
 * Returns null if the bboxes do not overlap.
 */
export function intersectBbox(
  a: [number, number, number, number],
  b: [number, number, number, number]
): [number, number, number, number] | null {
  const minX = Math.max(a[0], b[0]);
  const minY = Math.max(a[1], b[1]);
  const maxX = Math.min(a[2], b[2]);
  const maxY = Math.min(a[3], b[3]);

  if (minX >= maxX || minY >= maxY) {
    return null;
  }
  return [minX, minY, maxX, maxY];
}

import { getPresetById } from '../types';

/**
 * Builds the direct tile URL for a granule using the high-performance Rust COG tile engine.
 * Reads spectral recipes from the declarative PRESETS registry (Strategy Pattern).
 * When userBbox is provided, wraps the URL with the 'clipped://' protocol to crop pixels cleanly to the AOI.
 */
export function buildGranuleTileUrl(
  granule: GranuleImage,
  presetId: string,
  userBbox: [number, number, number, number] | null
): string {
  const baseUrl = `${RUST_API_BASE_URL}/api/tiles/{z}/{x}/{y}.png`;
  const preset = getPresetById(presetId);

  let queryUrl = '';

  // 1. 3-Band Composites (True Color, False Color, CIR, Agriculture, etc.)
  if (preset.category === 'composite' && preset.bands) {
    const { r, g, b, rescale } = preset.bands;
    const rUrl = granule.assets[r]?.href;
    const gUrl = granule.assets[g]?.href;
    const bUrl = granule.assets[b]?.href;

    if (rUrl && gUrl && bUrl) {
      queryUrl = `${baseUrl}?b1=${encodeURIComponent(rUrl)}&b2=${encodeURIComponent(gUrl)}&b3=${encodeURIComponent(bUrl)}&rescale=${rescale[0]},${rescale[1]}`;
    } else if (granule.assets['visual']?.href) {
      // Fallback to pre-computed TCI visual if specific band assets are not exposed
      queryUrl = `${baseUrl}?b1=${encodeURIComponent(granule.assets['visual'].href)}&rescale=0,255`;
    }
  }
  // 2. 2-Band Spectral Indices (NDVI, NDWI, etc.)
  else if (preset.category === 'index' && preset.index) {
    const { b1, b2, presetParam, colormap, rescale } = preset.index;
    const b1Url = granule.assets[b1]?.href;
    const b2Url = granule.assets[b2]?.href;

    if (b1Url && b2Url) {
      queryUrl = `${baseUrl}?b1=${encodeURIComponent(b1Url)}&b2=${encodeURIComponent(b2Url)}&preset=${presetParam}&colormap_name=${colormap}&rescale=${rescale[0]},${rescale[1]}`;
    }
  }

  // 3. Fallback to visual or global cloudless WMS if assets are missing
  if (!queryUrl) {
    const visualHref = granule.assets['visual']?.href;
    if (visualHref) {
      queryUrl = `${baseUrl}?b1=${encodeURIComponent(visualHref)}&rescale=0,255`;
    } else {
      queryUrl = `https://tiles.maps.eox.at/wms?service=wms&request=GetMap&version=1.1.1&layers=s2cloudless-2020&styles=&format=image/jpeg&transparent=false&srs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}`;
    }
  }

  // 4. Wrap with custom clipped:// protocol if bounding box is defined
  if (userBbox) {
    const aoiStr = userBbox.map((n) => n.toFixed(6)).join(',');
    queryUrl += `&aoi=${aoiStr}`;
    return `clipped://${queryUrl}`;
  }

  return queryUrl;
}

import type { SearchSession } from '../models/session.model';

/**
 * MapLayerController (Decoupled Map Rendering Controller)
 * Manages GPU raster sources and layers inside MapLibre GL JS for satellite passes.
 * Supports multi-session simultaneous rendering across independent geographic regions.
 */
export class MapLayerController {
  private map: MapLibreMap | null = null;
  // sessionId -> { passId, passKey, layerIds[] }
  private sessionLayers = new Map<
    string,
    { passId: string; passKey: string; layerIds: string[] }
  >();
  private activePassLayers = new Map<string, string[]>(); // legacy passId -> layerIds[]
  private activePassKey: string | null = null; // legacy key

  public attachMap(map: MapLibreMap): void {
    this.map = map;
  }

  public detachMap(): void {
    this.removeAllPassLayers();
    this.map = null;
  }

  /**
   * Synchronizes MapLibre GPU raster layers with all active search sessions.
   * Renders each session's active pass clipped cleanly to its respective bounding box.
   */
  public syncSessions(sessions: SearchSession[]): void {
    if (!this.map) return;

    const currentSessionIds = new Set(sessions.map((s) => s.id));

    // 1. Purge any layers from sessions that no longer exist (e.g. closed by user [X])
    for (const sessionId of Array.from(this.sessionLayers.keys())) {
      if (!currentSessionIds.has(sessionId)) {
        this.removeSessionLayers(sessionId);
      }
    }

    // 2. Synchronize each active session
    for (const session of sessions) {
      if (!session.activePassId) {
        // Session has no active pass (hidden), purge its layers if previously rendered
        if (this.sessionLayers.has(session.id)) {
          this.removeSessionLayers(session.id);
        }
        continue;
      }

      const activePass = session.passes.find((p) => p.id === session.activePassId);
      if (!activePass) {
        this.removeSessionLayers(session.id);
        continue;
      }

      const userBbox = session.snapshot.boundingBox;
      this.renderSessionPass(session.id, activePass, userBbox);
    }
  }

  /**
   * Adds or updates raster layers for a session pass.
   * Granules render seamlessly with zero visible tile borders.
   */
  public renderSessionPass(
    sessionId: string,
    pass: SatellitePass,
    userBbox: [number, number, number, number] | null
  ): void {
    if (!this.map) return;

    const passKey = `${sessionId}_${pass.id}_${pass.preset}_${userBbox ? userBbox.map((n) => n.toFixed(4)).join(',') : 'full'}`;
    const existing = this.sessionLayers.get(sessionId);

    // If identical configuration already rendered, only update opacity
    if (existing && existing.passKey === passKey) {
      for (const layerId of existing.layerIds) {
        if (this.map.getLayer(layerId)) {
          this.map.setPaintProperty(layerId, 'raster-opacity', pass.opacity);
        }
      }
      return;
    }

    // If pass, preset, or AOI changed, purge previous session layers before remounting
    if (existing) {
      this.removeSessionLayers(sessionId);
    }

    const createdLayerIds: string[] = [];
    const beforeId = this.map.getLayer('draw-selection-fill') ? 'draw-selection-fill' : undefined;

    pass.granules.forEach((granule, idx) => {
      if (!this.map) return;

      const effectiveBounds = userBbox ? intersectBbox(granule.bbox, userBbox) : granule.bbox;
      if (!effectiveBounds) return;

      const sourceId = `source-${sessionId}-${pass.id}-${idx}`;
      const layerId = `layer-${sessionId}-${pass.id}-${idx}`;

      const tileUrl = buildGranuleTileUrl(granule, pass.preset, userBbox);

      if (!this.map.getSource(sourceId)) {
        this.map.addSource(sourceId, {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          bounds: effectiveBounds,
          minzoom: granule.minZoom,
          maxzoom: granule.maxZoom,
        });
      }

      if (!this.map.getLayer(layerId)) {
        this.map.addLayer(
          {
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': pass.opacity,
              'raster-fade-duration': 200,
            },
          },
          beforeId
        );
      }

      createdLayerIds.push(layerId);
    });

    this.sessionLayers.set(sessionId, {
      passId: pass.id,
      passKey,
      layerIds: createdLayerIds,
    });
  }

  /**
   * Removes raster layers and sources for a specific session.
   */
  public removeSessionLayers(sessionId: string): void {
    if (!this.map) return;

    const existing = this.sessionLayers.get(sessionId);
    if (!existing) return;

    for (const layerId of existing.layerIds) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
      const sourceId = layerId.replace('layer-', 'source-');
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }
    }

    this.sessionLayers.delete(sessionId);
  }

  /**
   * Legacy single-pass synchronization method
   */
  public syncActivePass(
    activePass: SatellitePass | null,
    userBbox: [number, number, number, number] | null
  ): void {
    if (!this.map) return;

    if (!activePass) {
      this.removeAllPassLayers();
      return;
    }

    for (const passId of Array.from(this.activePassLayers.keys())) {
      if (passId !== activePass.id) {
        this.removePass(passId);
      }
    }

    this.renderPass(activePass, userBbox);
  }

  public renderPass(
    pass: SatellitePass,
    userBbox: [number, number, number, number] | null
  ): void {
    if (!this.map) return;

    const passKey = `${pass.id}_${pass.preset}_${userBbox ? userBbox.map((n) => n.toFixed(4)).join(',') : 'full'}`;
    const existingLayerIds = this.activePassLayers.get(pass.id);

    if (existingLayerIds && this.activePassKey === passKey) {
      for (const layerId of existingLayerIds) {
        if (this.map.getLayer(layerId)) {
          this.map.setPaintProperty(layerId, 'raster-opacity', pass.opacity);
        }
      }
      return;
    }

    if (existingLayerIds) {
      this.removePass(pass.id);
    }
    this.activePassKey = passKey;

    const createdLayerIds: string[] = [];
    const beforeId = this.map.getLayer('draw-selection-fill') ? 'draw-selection-fill' : undefined;

    pass.granules.forEach((granule, idx) => {
      if (!this.map) return;

      const effectiveBounds = userBbox ? intersectBbox(granule.bbox, userBbox) : granule.bbox;
      if (!effectiveBounds) return;

      const sourceId = `source-pass-${pass.id}-${idx}`;
      const layerId = `layer-pass-${pass.id}-${idx}`;

      const tileUrl = buildGranuleTileUrl(granule, pass.preset, userBbox);

      if (!this.map.getSource(sourceId)) {
        this.map.addSource(sourceId, {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          bounds: effectiveBounds,
          minzoom: granule.minZoom,
          maxzoom: granule.maxZoom,
        });
      }

      if (!this.map.getLayer(layerId)) {
        this.map.addLayer(
          {
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': pass.opacity,
              'raster-fade-duration': 200,
            },
          },
          beforeId
        );
      }

      createdLayerIds.push(layerId);
    });

    this.activePassLayers.set(pass.id, createdLayerIds);
  }

  public removePass(passId: string): void {
    if (!this.map) return;

    const layerIds = this.activePassLayers.get(passId);
    if (!layerIds) return;

    for (const layerId of layerIds) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
      const sourceId = layerId.replace('layer-', 'source-');
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }
    }

    this.activePassLayers.delete(passId);
    if (this.activePassKey?.startsWith(passId)) {
      this.activePassKey = null;
    }
  }

  public removeAllPassLayers(): void {
    if (!this.map) return;

    for (const sessionId of Array.from(this.sessionLayers.keys())) {
      this.removeSessionLayers(sessionId);
    }
    this.sessionLayers.clear();

    for (const passId of Array.from(this.activePassLayers.keys())) {
      this.removePass(passId);
    }
    this.activePassLayers.clear();
    this.activePassKey = null;
  }
}

export const mapLayerController = new MapLayerController();
