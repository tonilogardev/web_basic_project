import type { Map as MapLibreMap } from 'maplibre-gl';
import type { SatellitePass, GranuleImage } from '../models/pass.model';
import type { SearchSession } from '../models/session.model';
import type { WaterAnalysisResult } from '../models/water.model';
import { registerClippedProtocol } from '../services/clippedProtocol';

// Register custom clipped:// protocol on MapLibre GL JS
registerClippedProtocol();

export const RUST_API_BASE_URL =
  import.meta.env.VITE_RUST_API_URL ??
  import.meta.env.VITE_WATER_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname.includes('localhost')
    ? 'http://water-api.localhost:8001'
    : 'https://water-api.tonilogar.com');

// Standard water pollution legend colormap
const WATER_COLORMAP = {
  '1': '#2196F3', // Clean Water
  '2': '#E8430F', // High Turbidity
  '3': '#BEFF6B', // High Chlorophyll
  '4': '#1B8A0A', // Surface Algae
  '5': '#7A0000', // Anomaly
};
const ENCODED_WATER_COLORMAP = encodeURIComponent(JSON.stringify(WATER_COLORMAP));

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

/**
 * Builds the direct tile URL for a granule using the high-performance Rust COG tile engine.
 * When userBbox is provided, wraps the URL with the 'clipped://' protocol to crop pixels cleanly to the AOI.
 */
export function buildGranuleRgbTileUrl(
  granule: GranuleImage,
  userBbox: [number, number, number, number] | null,
  polygon?: [number, number][] | null
): string {
  const baseUrl = `${RUST_API_BASE_URL}/api/tiles/{z}/{x}/{y}.png`;
  let queryUrl = '';

  const rAsset = granule.assets['red'];
  const gAsset = granule.assets['green'];
  const bAsset = granule.assets['blue'];

  const rUrl = rAsset?.href;
  const gUrl = gAsset?.href;
  const bUrl = bAsset?.href;

  if (rUrl && gUrl && bUrl) {
    const isMenut =
      granule.rawFeature?.properties?.platform?.toLowerCase() === 'menut' ||
      granule.id.toLowerCase().includes('menut') ||
      rUrl.toLowerCase().includes('menut') ||
      rUrl.toLowerCase().includes('geneo') ||
      rUrl.toLowerCase().includes('icgc');

    const rescale = isMenut ? '0,2500' : '0,3000';
    const b1Band = rAsset.bandIndex ?? (isMenut ? 3 : 1);
    const b2Band = gAsset.bandIndex ?? (isMenut ? 2 : 1);
    const b3Band = bAsset.bandIndex ?? (isMenut ? 1 : 1);

    const bandParams =
      b1Band !== 1 || b2Band !== 1 || b3Band !== 1 || isMenut
        ? `&b1_band=${b1Band}&b2_band=${b2Band}&b3_band=${b3Band}`
        : '';

    queryUrl = `${baseUrl}?b1=${encodeURIComponent(rUrl)}&b2=${encodeURIComponent(gUrl)}&b3=${encodeURIComponent(bUrl)}${bandParams}&rescale=${rescale}`;
  } else if (granule.assets['visual']?.href) {
    queryUrl = `${baseUrl}?b1=${encodeURIComponent(granule.assets['visual'].href)}&rescale=0,255`;
  } else {
    queryUrl = `https://tiles.maps.eox.at/wms?service=wms&request=GetMap&version=1.1.1&layers=s2cloudless-2020&styles=&format=image/jpeg&transparent=false&srs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}`;
  }

  if (userBbox) {
    const aoiStr = userBbox.map((n) => n.toFixed(6)).join(',');
    queryUrl += `&aoi=${aoiStr}`;
    if (polygon && polygon.length >= 3) {
      const polyStr = polygon.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
      queryUrl += `&poly=${polyStr}`;
    }
    return `clipped://${queryUrl}`;
  }

  return queryUrl;
}

/**
 * Builds the classification tile URL for the Rust water analysis GeoTIFF.
 */
export function buildWaterClassificationTileUrl(
  classificationUrl: string,
  userBbox: [number, number, number, number] | null,
  polygon?: [number, number][] | null
): string {
  const baseUrl = `${RUST_API_BASE_URL}/api/tiles/{z}/{x}/{y}.png`;
  let queryUrl = `${baseUrl}?url=${encodeURIComponent(classificationUrl)}&colormap=${ENCODED_WATER_COLORMAP}`;

  if (userBbox) {
    const aoiStr = userBbox.map((n) => n.toFixed(6)).join(',');
    queryUrl += `&aoi=${aoiStr}`;
    if (polygon && polygon.length >= 3) {
      const polyStr = polygon.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
      queryUrl += `&poly=${polyStr}`;
    }
    return `clipped://${queryUrl}`;
  }

  return queryUrl;
}

export class MapLayerController {
  private map: MapLibreMap | null = null;
  // sessionId -> { passKey, layerIds[] }
  private sessionLayers = new Map<string, { passKey: string; layerIds: string[] }>();

  public attachMap(map: MapLibreMap) {
    this.map = map;
  }

  public detachMap() {
    this.removeAllLayers();
    this.map = null;
  }

  /**
   * Synchronizes MapLibre GPU raster layers with all active search sessions.
   * Renders each session's active pass clipped cleanly to its respective AOI.
   */
  public syncSessions(sessions: SearchSession[]) {
    if (!this.map) return;

    const currentSessionIds = new Set(sessions.map((s) => s.id));

    // 1. Purge layers from closed sessions
    for (const sessionId of Array.from(this.sessionLayers.keys())) {
      if (!currentSessionIds.has(sessionId)) {
        this.removeSessionLayers(sessionId);
      }
    }

    // 2. Synchronize each active session
    for (const session of sessions) {
      if (!session.activePassId || session.isImageryHidden) {
        this.removeSessionLayers(session.id);
        continue;
      }

      const activePass = session.passes.find((p) => p.id === session.activePassId);
      if (!activePass) {
        this.removeSessionLayers(session.id);
        continue;
      }

      this.renderSessionPass(session, activePass);
    }
  }

  /**
   * Adds or updates raster layers for a session pass.
   * All constituent granules for that day/orbit render seamlessly side-by-side,
   * clipped strictly to the AOI bounding box or polygon.
   */
  public renderSessionPass(session: SearchSession, pass: SatellitePass) {
    if (!this.map) return;

    const userBbox = session.snapshot.boundingBox;
    const polygon = session.snapshot.polygon;
    const viewMode = pass.viewMode || 'rgb';
    const analysisId = pass.waterAnalysis?.jobId || 'none';

    const passKey = `${session.id}_${pass.id}_${viewMode}_${analysisId}_${userBbox ? userBbox.map((n) => n.toFixed(4)).join(',') : 'full'}`;
    const existing = this.sessionLayers.get(session.id);

    // If identical configuration already rendered, update opacities dynamically
    if (existing && existing.passKey === passKey) {
      for (const layerId of existing.layerIds) {
        if (!this.map.getLayer(layerId)) continue;
        if (layerId.endsWith('-water')) {
          this.map.setPaintProperty(layerId, 'raster-opacity', pass.opacity);
        } else if (layerId.endsWith('-rgb')) {
          const rgbOpacity = viewMode === 'water' ? 0 : viewMode === 'both' ? 0.9 : pass.opacity;
          this.map.setPaintProperty(layerId, 'raster-opacity', rgbOpacity);
        }
      }
      return;
    }

    // Configuration changed: purge previous session layers before remounting
    if (existing) {
      this.removeSessionLayers(session.id);
    }

    const createdLayerIds: string[] = [];
    const beforeId = this.map.getLayer('aqua-polygon-line') ? 'aqua-polygon-line' : undefined;

    // 1. Render all constituent granules for this day's pass (Natural RGB base)
    if (viewMode === 'rgb' || viewMode === 'both') {
      pass.granules.forEach((granule, idx) => {
        if (!this.map) return;

        const effectiveBounds = userBbox ? intersectBbox(granule.bbox, userBbox) : granule.bbox;
        if (!effectiveBounds) return;

        const sourceId = `source-${session.id}-${pass.id}-${idx}-rgb`;
        const layerId = `layer-${session.id}-${pass.id}-${idx}-rgb`;

        const tileUrl = buildGranuleRgbTileUrl(granule, userBbox, polygon);

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

        const rgbOpacity = viewMode === 'both' ? 0.9 : pass.opacity;

        if (!this.map.getLayer(layerId)) {
          this.map.addLayer(
            {
              id: layerId,
              type: 'raster',
              source: sourceId,
              paint: {
                'raster-opacity': rgbOpacity,
                'raster-fade-duration': 200,
              },
            },
            beforeId
          );
        }

        createdLayerIds.push(layerId);
      });
    }

    // 2. Render Water Contamination layers for all constituent granules of this pass
    const analyses = (pass.waterAnalyses && pass.waterAnalyses.length > 0)
      ? pass.waterAnalyses
      : (pass.waterAnalysis ? [pass.waterAnalysis] : []);

    if (analyses.length > 0 && (viewMode === 'water' || viewMode === 'both')) {
      analyses.forEach((analysis, idx) => {
        if (!this.map) return;

        const waterSourceId = `source-${session.id}-${pass.id}-${idx}-water`;
        const waterLayerId = `layer-${session.id}-${pass.id}-${idx}-water`;

        const waterTileUrl = buildWaterClassificationTileUrl(
          analysis.classificationUrl,
          userBbox,
          polygon
        );

        if (!this.map.getSource(waterSourceId)) {
          this.map.addSource(waterSourceId, {
            type: 'raster',
            tiles: [waterTileUrl],
            tileSize: 256,
            bounds: analysis.bbox,
          });
        }

        if (!this.map.getLayer(waterLayerId)) {
          this.map.addLayer(
            {
              id: waterLayerId,
              type: 'raster',
              source: waterSourceId,
              paint: {
                'raster-opacity': pass.opacity,
                'raster-fade-duration': 200,
              },
            },
            beforeId
          );
        }

        createdLayerIds.push(waterLayerId);
      });
    }

    this.sessionLayers.set(session.id, {
      passKey,
      layerIds: createdLayerIds,
    });
  }

  public setOpacity(sessionId: string, passId: string, opacity: number) {
    const existing = this.sessionLayers.get(sessionId);
    if (!existing || !this.map) return;

    for (const layerId of existing.layerIds) {
      if (this.map.getLayer(layerId)) {
        this.map.setPaintProperty(layerId, 'raster-opacity', Math.max(0, Math.min(1, opacity)));
      }
    }
  }

  public removeSessionLayers(sessionId: string) {
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

  public removeAllLayers() {
    if (!this.map) return;
    for (const sessionId of Array.from(this.sessionLayers.keys())) {
      this.removeSessionLayers(sessionId);
    }
  }
}

export const mapLayerController = new MapLayerController();
