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
const EXACT_CLOUDS_ENDPOINT = `${RUST_API_BASE_URL}/api/passes/exact-clouds`;

export async function searchEsaPasses(
  filters: SearchFilters,
  polygon?: [number, number][] | null,
  onProgress?: (status: string) => void
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
    limit: 500, // Expanded limit (500) to ensure multi-granule passes across full 90-day ranges are completely captured
    sortby: [{ field: 'properties.datetime', direction: 'desc' }],
  };

  const stacReqStart = performance.now();
  onProgress?.('Querying STAC catalog...');
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

  // Exact 20m SCL Cloud Coverage Pipeline:
  // ALWAYS scan the Scene Classification Layer (SCL) in parallel in Rust
  // to calculate exact cloud & shadow percentages strictly inside the AOI for every pass!
  if (allPasses.length > 0) {
    onProgress?.('Scanning 20m SCL bands in AOI...');

    const items = allPasses.map((p) => {
      const scl_urls: string[] = [];
      for (const g of p.granules) {
        const scl =
          g.assets['scl']?.href ||
          g.rawFeature?.assets['scl']?.href ||
          g.assets['SCL']?.href;
        if (scl) scl_urls.push(scl);
      }
      return { id: p.id, scl_urls };
    }).filter((item) => item.scl_urls.length > 0);

    if (items.length > 0) {
      try {
        const cloudResp = await fetch(EXACT_CLOUDS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bbox: filters.boundingBox,
            polygon: polygon && polygon.length >= 3 ? polygon : undefined,
            items,
          }),
        });

        if (cloudResp.ok) {
          const cloudData = await cloudResp.json();
          if (cloudData.results) {
            for (const pass of allPasses) {
              const res = cloudData.results[pass.id];
              if (res && typeof res.aoi_cloud_cover === 'number') {
                pass.aoiCloudCover = res.aoi_cloud_cover;
              }
            }
          }
        } else {
          console.warn('[esaStacService] Exact cloud endpoint returned non-OK status:', cloudResp.status);
        }
      } catch (cloudErr) {
        console.warn('[esaStacService] Exact cloud scan failed, falling back to scene average:', cloudErr);
      }
    }
  }

  // Filter at the PASS level by exact AOI cloud coverage if slider < 100%
  const filteredPasses = filters.maxCloudCover < 100
    ? allPasses.filter((pass) => {
        const effectiveCloud = pass.aoiCloudCover !== undefined ? pass.aoiCloudCover : pass.meanCloudCover;
        return effectiveCloud <= filters.maxCloudCover;
      })
    : allPasses;

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
