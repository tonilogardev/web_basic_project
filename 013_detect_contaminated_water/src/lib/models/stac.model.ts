/**
 * STAC (SpatioTemporal Asset Catalog) Specifications
 * Defines standard contracts for querying satellite catalog providers (Copernicus / AWS Open Data)
 */

export interface StacAsset {
  href: string;
  title?: string;
  type?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface StacLink {
  rel: string;
  href: string;
  type?: string;
  title?: string;
}

export interface StacItemProperties {
  datetime: string;
  start_datetime?: string;
  end_datetime?: string;
  'sat:relative_orbit'?: number | string;
  'eo:cloud_cover'?: number;
  's2:mgrs_tile'?: string;
  platform?: string;
  constellation?: string;
  [key: string]: unknown;
}

export interface StacFeature {
  type: 'Feature';
  id: string;
  bbox: [number, number, number, number];
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: StacItemProperties;
  assets: Record<string, StacAsset>;
  links: StacLink[];
  collection?: string;
}

export interface StacFeatureCollection {
  type: 'FeatureCollection';
  features: StacFeature[];
  links?: StacLink[];
  context?: {
    page?: number;
    limit?: number;
    matched?: number;
    returned?: number;
  };
}

export interface StacSearchParams {
  bbox: [number, number, number, number];
  collections: string[];
  datetime: string;
  limit?: number;
  sortby?: Array<{ field: string; direction: 'asc' | 'desc' }>;
}
