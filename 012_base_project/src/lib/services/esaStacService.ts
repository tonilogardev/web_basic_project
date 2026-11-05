import type { SearchFilters } from '../types';
import type { StacFeatureCollection } from '../models/stac.model';
import type { SatellitePass, ProviderBenchmark } from '../models/pass.model';
import { groupGranulesIntoPasses } from './GroupingEngine';

const RUST_API_BASE_URL =
  import.meta.env.VITE_RUST_API_URL ??
  import.meta.env.VITE_WATER_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname.includes('localhost')
    ? 'http://water-api.localhost:8001'
    : 'https://water-api.tonilogar.com');

const STAC_SEARCH_ENDPOINT = `${RUST_API_BASE_URL}/api/stac/search`;

export async function searchEsaPasses(
  filters: SearchFilters
): Promise<{ passes: SatellitePass[]; benchmark: ProviderBenchmark }> {
  if (!filters.boundingBox) {
    throw new Error('Bounding box is required for STAC search');
  }

  const startTime = performance.now();

  // Query STAC for all granules touching the AOI without dropping tiles mid-pass
  const payload = {
    collections: ['sentinel-2-l2a'],
    bbox: filters.boundingBox,
    datetime: `${filters.startDate}T00:00:00Z/${filters.endDate}T23:59:59Z`,
    limit: 100, // Generous limit to ensure all constituent tiles across the date range are captured
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

  // Group raw granules into unified passes YYYYMMDD_RXXX
  const groupStart = performance.now();
  const allPasses = groupGranulesIntoPasses(data.features || [], 'esa', filters.preset);

  // Filter at the PASS level by meanCloudCover to prevent "holes" or missing tiles
  const filteredPasses = allPasses.filter(
    (pass) => pass.meanCloudCover <= filters.maxCloudCover
  );

  // Fallback: If strict threshold filtered everything, show the cleanest passes so user has context
  const passes = filteredPasses.length > 0 ? filteredPasses : allPasses.slice(0, 5);

  const groupEnd = performance.now();
  const groupingLatencyMs = Math.round((groupEnd - groupStart) * 100) / 100;

  const totalTimeMs = Math.round(performance.now() - startTime);

  const benchmark: ProviderBenchmark = {
    provider: 'esa',
    granulesFound: data.features?.length || 0,
    passesFormed: passes.length,
    stacLatencyMs,
    groupingLatencyMs,
    totalTimeMs,
    timestamp: new Date().toISOString(),
  };

  return { passes, benchmark };
}
