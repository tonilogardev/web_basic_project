export interface StacAsset {
  href: string;
  type: string;
  title?: string;
  roles?: string[];
}

export interface StacFeature {
  id: string;
  type: string;
  geometry: any;
  properties: {
    datetime: string;
    "eo:cloud_cover": number;
    [key: string]: any;
  };
  assets: Record<string, StacAsset>;
}

export interface StacResponse {
  features: StacFeature[];
  links: Array<{ rel: string; href: string }>;
}

export interface SearchParams {
  collection: string;
  bbox: number[];
  startDate: string;
  endDate: string;
  maxCloudCover: number;
  maxResults?: number;
}

const STAC_API = "https://earth-search.aws.element84.com/v1/search";
const STAC_COLLECTION = "https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a";

export async function searchSentinel2(params: SearchParams): Promise<StacFeature[]> {
  const query = {
    collections: [params.collection],
    bbox: params.bbox,
    datetime: `${params.startDate}T00:00:00Z/${params.endDate}T23:59:59Z`,
    limit: params.maxResults ?? 20,
    sortby: [{ field: "properties.datetime", direction: "desc" }],
    query: { "eo:cloud_cover": { lt: params.maxCloudCover } },
  };

  const resp = await fetch(STAC_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });

  if (!resp.ok) {
    throw new Error(`STAC API error: ${resp.status}`);
  }

  const data = await resp.json();
  return (data as StacResponse).features;
}

export async function fetchItemById(itemId: string): Promise<StacFeature | null> {
  const resp = await fetch(`${STAC_COLLECTION}/items/${itemId}`);
  if (!resp.ok) return null;
  return await resp.json();
}

export function getDirectCogUrl(feature: StacFeature, asset: string): string | null {
  return feature.assets[asset]?.href ?? null;
}

export function getBandUrl(feature: StacFeature, band: string): string | null {
  return feature.assets[band]?.href ?? null;
}

export function getBands(feature: StacFeature): string[] {
  return Object.keys(feature.assets).filter((b) => !b.startsWith("thumbnail")).sort();
}
