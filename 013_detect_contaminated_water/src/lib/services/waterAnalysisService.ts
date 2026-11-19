import type { AnalyzeWaterRequest, AnalyzeWaterResponse, WaterAnalysisResult } from '../models/water.model';

export const RUST_API_BASE_URL =
  import.meta.env.VITE_RUST_API_URL ??
  import.meta.env.VITE_WATER_API_URL ??
  (typeof window !== 'undefined' && window.location.hostname.includes('localhost')
    ? 'http://water-api.localhost:8001'
    : 'https://water-api.tonilogar.com');

const ANALYZE_ENDPOINT = `${RUST_API_BASE_URL}/api/analyze`;

export async function executeWaterPollutionAnalysis(
  passId: string,
  stacItemId: string,
  date: string,
  polygon: [number, number][],
  bbox: [number, number, number, number],
  satellite: 'sentinel-2' | 'menut' = 'sentinel-2',
  assets?: Record<string, { href: string; [key: string]: unknown }>
): Promise<WaterAnalysisResult> {
  const assetMap: Record<string, string> = {};
  if (assets) {
    for (const [k, v] of Object.entries(assets)) {
      if (v?.href) assetMap[k] = v.href;
    }
  }

  const payload: AnalyzeWaterRequest = {
    stac_item_id: stacItemId,
    bbox,
    satellite,
    ...(Object.keys(assetMap).length > 0 ? { assets: assetMap } : {}),
  };

  const resp = await fetch(ANALYZE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    let errorMsg = `Analysis API error: HTTP ${resp.status}`;
    try {
      const errJson = await resp.json();
      if (errJson.detail) errorMsg = errJson.detail;
    } catch {
      // Ignore fallback
    }
    throw new Error(errorMsg);
  }

  const data: AnalyzeWaterResponse = await resp.json();

  // Construct MapLibre GPU tile URL template
  const tileUrlTemplate = `${RUST_API_BASE_URL}/api/tiles/{z}/{x}/{y}?url=${encodeURIComponent(data.classification_url)}`;

  return {
    jobId: data.job_id,
    passId,
    date,
    classificationUrl: data.classification_url,
    rgbUrl: data.rgb_url,
    tileUrlTemplate,
    cached: data.cached,
    analyzedAt: new Date().toISOString(),
    polygon,
    bbox,
  };
}
