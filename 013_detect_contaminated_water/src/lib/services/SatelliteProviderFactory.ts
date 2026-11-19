/**
 * Satellite Provider Factory (Strategy Pattern)
 * Instantiates the appropriate satellite data provider without
 * exposing transport or STAC specific logic to the controllers.
 */

import type { SatelliteId } from '../models/satellite.model';
import type { ISatelliteProvider } from './ISatelliteProvider';
import { sentinel2StacService } from './esaStacService';
import { menutStacService } from './MenutStacService';

export function getSatelliteProvider(id: SatelliteId): ISatelliteProvider {
  switch (id) {
    case 'menut':
      return menutStacService;
    case 'sentinel-2':
    default:
      return sentinel2StacService;
  }
}
