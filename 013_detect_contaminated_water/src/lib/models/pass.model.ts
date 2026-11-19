import type { StacFeature, StacAsset } from './stac.model';
import type { WaterAnalysisResult } from './water.model';
import type { SatelliteId } from './satellite.model';

export interface ProviderBenchmark {
  granulesFound: number;
  passesFormed: number;
  stacLatencyMs: number;
  groupingLatencyMs: number;
  totalTimeMs: number;
  timestamp: string;
}

export interface GranuleImage {
  id: string; // e.g. "S2A_31TCF_20261104_0_L2A" or "MENUT_20261104_001"
  mgrsTile: string; // e.g. "31TCF" or scene identifier
  bbox: [number, number, number, number];
  cloudCover: number;
  nativeResolutionMeters: number;
  minZoom: number;
  maxZoom: number;
  assets: Record<string, StacAsset>;
  rawFeature: StacFeature;
}

export type PassViewMode = 'rgb' | 'water' | 'both';

export interface SatellitePass {
  id: string; // Composite: "YYYYMMDD_RXXX" or "YYYYMMDD_MENUT_XXX"
  satellite?: SatelliteId; // Constellation origin
  date: string; // "YYYY-MM-DD"
  orbitNumber: number;
  orbitFormatted: string; // "R008" or "MENUT"
  meanCloudCover: number;
  granulesCount: number;
  granules: GranuleImage[];
  combinedBbox: [number, number, number, number];
  stacItemId: string; // Primary STAC ID for analysis execution
  isVisible: boolean; // Map visibility state
  opacity: number; // Layer opacity (0.0 to 1.0)
  viewMode: PassViewMode; // Display RGB, Water Quality, or Both
  waterAnalysis?: WaterAnalysisResult | null;
  waterAnalyses?: WaterAnalysisResult[];
}
