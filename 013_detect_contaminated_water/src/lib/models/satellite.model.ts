/**
 * Satellite Constellation & Sensor Specifications Model
 * Defines canonical band contracts, resolutions, and optical capabilities
 * for both Sentinel-2 (Copernicus) and Menut (NewSpace Catalunya / Open Cosmos).
 */

export type SatelliteId = 'sentinel-2' | 'menut';

export type CanonicalBandRole =
  | 'blue'
  | 'green'
  | 'red'
  | 'rededge1'
  | 'rededge2'
  | 'rededge3'
  | 'nir'
  | 'swir1'
  | 'scl';

export type WaterQualityIndex =
  | 'NDWI'
  | 'MNDWI'
  | 'FAI'
  | 'NDCI'
  | 'NDTI'
  | 'DELTA_RED';

export interface BandMetadata {
  role: CanonicalBandRole;
  name: string;
  centralWavelengthNm: number;
  bandwidthNm?: number;
  nativeResolutionMeters: number;
  stacAssetKeys: string[]; // Possible STAC asset keys (e.g. ['B03', 'b03', 'green'])
}

export interface TemporalCoverage {
  minDate: string;
  maxDate: string;
  defaultStartDate: string;
  defaultEndDate: string;
  description: string;
}

export interface SatelliteSpec {
  id: SatelliteId;
  name: string;
  shortName: string;
  constellation: string;
  operator: string;
  groundSamplingDistanceMeters: number;
  swathWidthKm: number;
  orbitAltitudeKm: number;
  supportedIndices: WaterQualityIndex[];
  temporalCoverage: TemporalCoverage;
  bands: Record<CanonicalBandRole, BandMetadata | null>;
}

export const SATELLITE_REGISTRY: Record<SatelliteId, SatelliteSpec> = {
  'sentinel-2': {
    id: 'sentinel-2',
    name: 'Sentinel-2 MSI (Level-2A BOA)',
    shortName: 'Sentinel-2',
    constellation: 'Copernicus',
    operator: 'European Space Agency (ESA)',
    groundSamplingDistanceMeters: 10,
    swathWidthKm: 290,
    orbitAltitudeKm: 786,
    supportedIndices: ['NDWI', 'MNDWI', 'FAI', 'NDCI', 'NDTI', 'DELTA_RED'],
    temporalCoverage: {
      minDate: '2015-12-01',
      maxDate: new Date().toISOString().slice(0, 10),
      defaultStartDate: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      defaultEndDate: new Date().toISOString().slice(0, 10),
      description: 'Operativo desde Diciembre de 2015 hasta la actualidad',
    },
    bands: {
      blue: {
        role: 'blue',
        name: 'Blue (B02)',
        centralWavelengthNm: 490,
        bandwidthNm: 66,
        nativeResolutionMeters: 10,
        stacAssetKeys: ['B02', 'b02', 'blue'],
      },
      green: {
        role: 'green',
        name: 'Green (B03)',
        centralWavelengthNm: 560,
        bandwidthNm: 36,
        nativeResolutionMeters: 10,
        stacAssetKeys: ['B03', 'b03', 'green'],
      },
      red: {
        role: 'red',
        name: 'Red (B04)',
        centralWavelengthNm: 665,
        bandwidthNm: 31,
        nativeResolutionMeters: 10,
        stacAssetKeys: ['B04', 'b04', 'red'],
      },
      rededge1: {
        role: 'rededge1',
        name: 'RedEdge 1 (B05)',
        centralWavelengthNm: 705,
        bandwidthNm: 15,
        nativeResolutionMeters: 20,
        stacAssetKeys: ['B05', 'b05', 'rededge', 'rededge1'],
      },
      rededge2: {
        role: 'rededge2',
        name: 'RedEdge 2 (B06)',
        centralWavelengthNm: 740,
        bandwidthNm: 15,
        nativeResolutionMeters: 20,
        stacAssetKeys: ['B06', 'b06', 'rededge2'],
      },
      rededge3: {
        role: 'rededge3',
        name: 'RedEdge 3 (B07)',
        centralWavelengthNm: 783,
        bandwidthNm: 20,
        nativeResolutionMeters: 20,
        stacAssetKeys: ['B07', 'b07', 'rededge3'],
      },
      nir: {
        role: 'nir',
        name: 'Near-Infrared (B08)',
        centralWavelengthNm: 842,
        bandwidthNm: 115,
        nativeResolutionMeters: 10,
        stacAssetKeys: ['B08', 'b08', 'nir'],
      },
      swir1: {
        role: 'swir1',
        name: 'Short-Wave IR 1 (B11)',
        centralWavelengthNm: 1610,
        bandwidthNm: 91,
        nativeResolutionMeters: 20,
        stacAssetKeys: ['B11', 'b11', 'swir16', 'swir1'],
      },
      scl: {
        role: 'scl',
        name: 'Scene Classification (SCL)',
        centralWavelengthNm: 0,
        nativeResolutionMeters: 20,
        stacAssetKeys: ['scl', 'SCL', 'visual'],
      },
    },
  },

  menut: {
    id: 'menut',
    name: 'Menut 6U CubeSat (VNIR)',
    shortName: 'Menut',
    constellation: 'OpenConstellation / NewSpace Catalonia',
    operator: 'Open Cosmos / IEEC',
    groundSamplingDistanceMeters: 4.75,
    swathWidthKm: 19,
    orbitAltitudeKm: 528,
    // Menut has no SWIR (1610nm), so MNDWI and FAI baseline are excluded
    supportedIndices: ['NDWI', 'NDCI', 'NDTI', 'DELTA_RED'],
    temporalCoverage: {
      minDate: '2023-06-24',
      maxDate: '2026-03-20',
      defaultStartDate: '2025-05-01',
      defaultEndDate: '2025-05-30',
      description: 'Catálogo Menut ICGC: tomas disponibles entre Junio de 2023 y Marzo de 2026',
    },
    bands: {
      blue: {
        role: 'blue',
        name: 'Blue',
        centralWavelengthNm: 480,
        nativeResolutionMeters: 4.75,
        stacAssetKeys: ['blue', 'B02', 'b02', 'band_1'],
      },
      green: {
        role: 'green',
        name: 'Green',
        centralWavelengthNm: 560,
        nativeResolutionMeters: 4.75,
        stacAssetKeys: ['green', 'B03', 'b03', 'band_2'],
      },
      red: {
        role: 'red',
        name: 'Red',
        centralWavelengthNm: 662,
        nativeResolutionMeters: 4.75,
        stacAssetKeys: ['red', 'B04', 'b04', 'band_3'],
      },
      rededge1: {
        role: 'rededge1',
        name: 'RedEdge 1',
        centralWavelengthNm: 703,
        nativeResolutionMeters: 4.75,
        stacAssetKeys: ['rededge1', 'rededge', 'B05', 'b05', 'band_4'],
      },
      rededge2: {
        role: 'rededge2',
        name: 'RedEdge 2',
        centralWavelengthNm: 738,
        nativeResolutionMeters: 4.75,
        stacAssetKeys: ['rededge2', 'B06', 'b06', 'band_5'],
      },
      rededge3: {
        role: 'rededge3',
        name: 'RedEdge 3',
        centralWavelengthNm: 780,
        nativeResolutionMeters: 4.75,
        stacAssetKeys: ['rededge3', 'B07', 'b07', 'band_6'],
      },
      nir: {
        role: 'nir',
        name: 'Near-Infrared (NIR)',
        centralWavelengthNm: 840,
        nativeResolutionMeters: 4.75,
        stacAssetKeys: ['nir', 'B08', 'b08', 'band_7'],
      },
      swir1: null, // SWIR not available on Menut payload
      scl: {
        role: 'scl',
        name: 'Quality / Cloud Mask',
        centralWavelengthNm: 0,
        nativeResolutionMeters: 4.75,
        stacAssetKeys: ['qa', 'cloud', 'udm', 'mask'],
      },
    },
  },
};

/**
 * Retrieve the specification for a given satellite identifier
 */
export function getSatelliteSpec(id: SatelliteId): SatelliteSpec {
  return SATELLITE_REGISTRY[id] ?? SATELLITE_REGISTRY['sentinel-2'];
}

/**
 * Resolves a canonical band role into a STAC asset href regardless of provider key naming convention
 */
export function resolveCanonicalBandAsset(
  satelliteId: SatelliteId,
  role: CanonicalBandRole,
  assets: Record<string, { href: string; [key: string]: unknown }>
): { href: string; [key: string]: unknown } | null {
  const spec = getSatelliteSpec(satelliteId);
  const bandMeta = spec.bands[role];
  if (!bandMeta) return null;

  for (const key of bandMeta.stacAssetKeys) {
    if (assets[key]) {
      return assets[key];
    }
  }

  // Fallback: case-insensitive match
  const lowerKeys = Object.keys(assets);
  for (const candidate of bandMeta.stacAssetKeys) {
    const matched = lowerKeys.find((k) => k.toLowerCase() === candidate.toLowerCase());
    if (matched && assets[matched]) {
      return assets[matched];
    }
  }

  return null;
}
