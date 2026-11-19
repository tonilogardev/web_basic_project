import type { SatelliteId, SatelliteSpec } from '../models/satellite.model';
import type { SatellitePass, ProviderBenchmark } from '../models/pass.model';

export interface SearchPassesParams {
  boundingBox: [number, number, number, number];
  startDate: string;
  endDate: string;
}

export interface SearchPassesResult {
  passes: SatellitePass[];
  benchmark: ProviderBenchmark;
  infoMessage?: string;
}

/**
 * Common Strategy Interface for Satellite Data Providers.
 * Implemented by Sentinel2StacService, MenutStacService, etc.
 * Decouples controllers from the underlying STAC API transport details.
 */
export interface ISatelliteProvider {
  readonly satelliteId: SatelliteId;
  readonly spec: SatelliteSpec;

  searchPasses(params: SearchPassesParams): Promise<SearchPassesResult>;
}
