import type { StacFeatureCollection } from '../models/stac.model';
import type { SatellitePass, ProviderBenchmark } from '../models/pass.model';
import { groupGranulesIntoPasses } from './GroupingEngine';
import type { ISatelliteProvider, SearchPassesParams, SearchPassesResult } from './ISatelliteProvider';
import { getSatelliteSpec } from '../models/satellite.model';

const RUST_API_BASE_URL =
  import.meta.env.VITE_RUST_API_URL ??
  import.meta.env.VITE_WATER_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname.includes('localhost')
    ? 'http://water-api.localhost:8001'
    : 'https://water-api.tonilogar.com');

const STAC_SEARCH_ENDPOINT = `${RUST_API_BASE_URL}/api/stac/search`;

export interface StacSearchFilters {
  boundingBox: [number, number, number, number];
  startDate: string;
  endDate: string;
}

export async function searchSentinelPasses(
  filters: StacSearchFilters
): Promise<{ passes: SatellitePass[]; benchmark: ProviderBenchmark }> {
  if (!filters.boundingBox) {
    throw new Error('Bounding box is required for STAC search');
  }

  const startTime = performance.now();

  const payload = {
    collections: ['sentinel-2-l2a'],
    bbox: filters.boundingBox,
    datetime: `${filters.startDate}T00:00:00Z/${filters.endDate}T23:59:59Z`,
    limit: 100,
    sortby: [{ field: 'properties.datetime', direction: 'desc' }],
  };

  const stacReqStart = performance.now();
  const resp = await fetch(STAC_SEARCH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    throw new Error(`ESA STAC API error: HTTP ${resp.status} - ${resp.statusText}`);
  }

  const data: StacFeatureCollection = await resp.json();
  const stacReqEnd = performance.now();
  const stacLatencyMs = Math.round(stacReqEnd - stacReqStart);

  const groupStart = performance.now();
  const passes = groupGranulesIntoPasses(data.features || [], 'sentinel-2');
  const groupEnd = performance.now();
  const groupingLatencyMs = Math.round(groupEnd - groupStart);

  const totalTimeMs = Math.round(performance.now() - startTime);

  const benchmark: ProviderBenchmark = {
    granulesFound: data.features ? data.features.length : 0,
    passesFormed: passes.length,
    stacLatencyMs,
    groupingLatencyMs,
    totalTimeMs,
    timestamp: new Date().toISOString(),
  };

  return { passes, benchmark };
}

export class Sentinel2StacService implements ISatelliteProvider {
  readonly satelliteId = 'sentinel-2' as const;
  readonly spec = getSatelliteSpec('sentinel-2');

  public async searchPasses(params: SearchPassesParams): Promise<SearchPassesResult> {
    return searchSentinelPasses(params);
  }
}

export const sentinel2StacService = new Sentinel2StacService();

