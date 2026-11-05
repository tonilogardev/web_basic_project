import type { StacFeature } from '../models/stac.model';
import type { SatellitePass, GranuleImage } from '../models/pass.model';
import type { DataProvider } from '../types';

/**
 * Parses the relative orbit integer from STAC product URI, datastrip, or properties.
 * Element84 Earth Search includes '_RXXX_' in 's2:product_uri' (e.g., S2A_MSIL2A_20261104..._R008_...).
 */
function extractRelativeOrbit(feature: StacFeature): number {
  // 1. Check s2:product_uri
  const productUri = feature.properties['s2:product_uri'] as string | undefined;
  if (productUri) {
    const match = productUri.match(/_R(\d{3})_/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  // 2. Check s2:datastrip_id
  const datastripId = feature.properties['s2:datastrip_id'] as string | undefined;
  if (datastripId) {
    const match = datastripId.match(/_R(\d{3})_/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  // 3. Check direct sat:relative_orbit property
  const propOrbit = feature.properties['sat:relative_orbit'];
  if (typeof propOrbit === 'number') {
    return propOrbit;
  }
  if (typeof propOrbit === 'string') {
    const parsed = parseInt(propOrbit, 10);
    if (!isNaN(parsed)) return parsed;
  }

  // 4. Fallback: match in feature.id
  const idMatch = feature.id.match(/_R(\d{3})_/i);
  if (idMatch && idMatch[1]) {
    return parseInt(idMatch[1], 10);
  }

  return 0;
}

/**
 * Extracts standard MGRS tile designation (e.g. "31TCF").
 */
function extractMgrsTile(feature: StacFeature): string {
  // 1. Check grid:code (e.g. "MGRS-31TCF")
  const gridCode = feature.properties['grid:code'] as string | undefined;
  if (gridCode) {
    return gridCode.replace('MGRS-', '');
  }

  // 2. Check mgrs:utm_zone + mgrs:latitude_band + mgrs:grid_square
  const zone = feature.properties['mgrs:utm_zone'];
  const band = feature.properties['mgrs:latitude_band'];
  const square = feature.properties['mgrs:grid_square'];
  if (zone && band && square) {
    return `${zone}${band}${square}`;
  }

  // 3. Fallback from ID (e.g. S2A_31TCF_...)
  const match = feature.id.match(/_(\d{2}[A-Z]{3})_/i);
  if (match && match[1]) {
    return match[1];
  }

  return 'MGRS';
}

/**
 * Computes the union bounding box [minX, minY, maxX, maxY] of multiple granules.
 */
function calculateCombinedBbox(features: StacFeature[]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const f of features) {
    if (f.bbox && f.bbox.length === 4) {
      if (f.bbox[0] < minX) minX = f.bbox[0];
      if (f.bbox[1] < minY) minY = f.bbox[1];
      if (f.bbox[2] > maxX) maxX = f.bbox[2];
      if (f.bbox[3] > maxY) maxY = f.bbox[3];
    }
  }

  if (minX === Infinity) {
    return [0, 0, 0, 0];
  }

  return [minX, minY, maxX, maxY];
}

/**
 * Pure Algorithmic Grouping Engine
 * Groups disparate MGRS granules by (acquisition date + relative orbit).
 * Formats unique composite ID: YYYYMMDD_RXXX (e.g., 20261104_R008).
 * Converts raw STAC features into formal GranuleImage entities.
 * 
 * @param provider Active Data Provider ('esa')
 * @returns Array of unified SatellitePass objects sorted by date descending (newest first)
 */
export function groupGranulesIntoPasses(
  features: StacFeature[],
  provider: DataProvider,
  preset: string
): SatellitePass[] {
  const groups = new Map<string, StacFeature[]>();

  for (const feature of features) {
    const dt = feature.properties.datetime;
    if (!dt) continue;

    // Standardize date portion YYYY-MM-DD
    const isoDate = dt.slice(0, 10);
    const compactDate = isoDate.replace(/-/g, ''); // "20261104"

    const orbitNumber = extractRelativeOrbit(feature);
    const orbitFormatted = `R${orbitNumber.toString().padStart(3, '0')}`; // "R008"

    const compositeId = `${compactDate}_${orbitFormatted}`;

    const existing = groups.get(compositeId);
    if (existing) {
      existing.push(feature);
    } else {
      groups.set(compositeId, [feature]);
    }
  }

  const passes: SatellitePass[] = [];

  for (const [compositeId, rawGranules] of groups.entries()) {
    const [compactDate, orbitFormatted] = compositeId.split('_');
    const isoDate = `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
    const orbitNumber = parseInt(orbitFormatted.replace('R', ''), 10) || 0;

    // Map each raw STAC item to a GranuleImage entity
    const granules: GranuleImage[] = rawGranules.map((f) => {
      const tileCode = extractMgrsTile(f);
      const cc = f.properties['eo:cloud_cover'];
      const cloudVal = typeof cc === 'number' ? Math.round(cc * 10) / 10 : 0;

      return {
        id: f.id,
        mgrsTile: tileCode,
        bbox: f.bbox,
        cloudCover: cloudVal,
        nativeResolutionMeters: 10, // 10m native for S2 MSI RGB/NIR
        minZoom: 6,
        maxZoom: 16,
        assets: f.assets,
        rawFeature: f,
        loadStatus: 'idle',
      };
    });

    // Calculate mean cloud cover across constituent granules
    let totalCloud = 0;
    for (const g of granules) {
      totalCloud += g.cloudCover;
    }
    const meanCloudCover = granules.length > 0
      ? Math.round((totalCloud / granules.length) * 10) / 10
      : 0;

    const combinedBbox = calculateCombinedBbox(rawGranules);

    passes.push({
      id: compositeId,
      date: isoDate,
      orbitNumber,
      orbitFormatted,
      meanCloudCover,
      granulesCount: granules.length,
      granules,
      combinedBbox,
      provider,
      preset,
      isVisible: false,
      opacity: 1.0,
    });
  }

  // Sort descending: newest passes first
  passes.sort((a, b) => b.date.localeCompare(a.date));

  return passes;
}
