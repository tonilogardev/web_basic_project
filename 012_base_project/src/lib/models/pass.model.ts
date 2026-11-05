import type { DataProvider } from '../types';
import type { StacFeature, StacAsset } from './stac.model';

/**
 * Metric telemetry for scientific benchmarking ("Dato mata relato")
 */
export interface ProviderBenchmark {
  provider: DataProvider;
  granulesFound: number;
  passesFormed: number;
  stacLatencyMs: number;
  groupingLatencyMs: number;
  totalTimeMs: number;
  timestamp: string;
}

/**
 * Individual Granule Image Entity
 * Represents an individual MGRS scene (e.g. 31TCF) with its own spatial bounds,
 * native sensor resolution (10m for Sentinel-2 MSI RGB/NIR), and asynchronous loading state.
 */
export interface GranuleImage {
  id: string; // e.g. "S2A_31TCF_20261104_0_L2A"
  mgrsTile: string; // e.g. "31TCF"
  bbox: [number, number, number, number]; // [minX, minY, maxX, maxY]
  cloudCover: number; // Granule cloud percentage (0-100)
  nativeResolutionMeters: number; // 10m for RGB/NIR
  minZoom: number; // Lowest zoom level where tile is active (e.g. 6)
  maxZoom: number; // Full native pixel zoom level (e.g. 16)
  assets: Record<string, StacAsset>;
  rawFeature: StacFeature;
  loadStatus: 'idle' | 'loading' | 'loaded' | 'error';
}

/**
 * Unified Satellite Pass Model (Aggregate Root)
 * Groups all constituent GranuleImage entities sharing the same acquisition date and relative orbit.
 * Composite ID format: YYYYMMDD_RXXX (e.g., 20261104_R008)
 */
export interface SatellitePass {
  id: string; // Composite: "YYYYMMDD_RXXX"
  date: string; // ISO date format: "YYYY-MM-DD"
  orbitNumber: number; // e.g., 8
  orbitFormatted: string; // e.g., "R008"
  meanCloudCover: number; // Average cloud percentage across all constituent granules
  granulesCount: number; // Number of MGRS tiles in this pass
  granules: GranuleImage[]; // Constituent individual granule entities
  combinedBbox: [number, number, number, number]; // [minX, minY, maxX, maxY]
  provider: DataProvider;
  preset: string; // e.g., 'true-color', 'ndvi', 'ndwi'
  isVisible: boolean; // Map visibility state
  opacity: number; // Layer opacity (0.0 to 1.0)
}
