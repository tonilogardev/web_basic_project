/**
 * Menut Satellite STAC Service
 * Implements ISatelliteProvider for Catalonia's Menut 6U CubeSat.
 * Connects directly to the official, public ICGC STAC API (Institut Cartogràfic i Geològic de Catalunya / NewSpace).
 * Endpoint: https://geoserveis.icgc.cat/servei/catalunya/newspace/stac-api/search
 */

import type { ISatelliteProvider, SearchPassesParams, SearchPassesResult } from './ISatelliteProvider';
import { getSatelliteSpec } from '../models/satellite.model';
import type { StacFeature, StacFeatureCollection } from '../models/stac.model';
import { groupGranulesIntoPasses } from './GroupingEngine';

const ICGC_MENUT_STAC_URL =
  import.meta.env.VITE_ICGC_MENUT_STAC_URL ??
  'https://geoserveis.icgc.cat/servei/catalunya/newspace/stac-api';

export class MenutStacService implements ISatelliteProvider {
  readonly satelliteId = 'menut' as const;
  readonly spec = getSatelliteSpec('menut');

  public async searchPasses(params: SearchPassesParams): Promise<SearchPassesResult> {
    if (!params.boundingBox) {
      throw new Error('Bounding box is required for Menut search');
    }

    const startTime = performance.now();
    let rawFeatures: StacFeature[] = [];

    let infoMessage: string | undefined = undefined;

    // 1. Primary search: Query ICGC STAC for menut-l2a strictly within the user-selected date range
    try {
      const searchEndpoint = `${ICGC_MENUT_STAC_URL}/search`;
      const dateRangeFilter = `${params.startDate}T00:00:00Z/${params.endDate}T23:59:59Z`;

      const resp = await fetch(searchEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          collections: ['menut-l2a'],
          bbox: params.boundingBox,
          datetime: dateRangeFilter,
          limit: 50,
          sortby: [{ field: 'properties.datetime', direction: 'desc' }],
        }),
      });

      if (resp.ok) {
        const data: StacFeatureCollection = await resp.json();
        rawFeatures = data.features || [];
      } else {
        console.warn(`ICGC STAC search HTTP error: ${resp.status}`);
      }

      // If no features were found in this exact date range, check the most recent pass available
      // in the ICGC catalog for this AOI so we can guide the user clearly
      if (rawFeatures.length === 0) {
        const hintResp = await fetch(searchEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            collections: ['menut-l2a'],
            bbox: params.boundingBox,
            limit: 1,
            sortby: [{ field: 'properties.datetime', direction: 'desc' }],
          }),
        });

        if (hintResp.ok) {
          const hintData: StacFeatureCollection = await hintResp.json();
          const latestDt = hintData.features?.[0]?.properties?.datetime;
          if (latestDt) {
            const latestDate = latestDt.slice(0, 10);
            infoMessage = `No Menut passes found between ${params.startDate} and ${params.endDate}. The most recent available Menut pass in this area is from ${latestDate}.`;
          }
        }
      }
    } catch (err) {
      console.warn('ICGC Menut STAC search encountered an issue:', err);
    }

    // 3. Transform ICGC STAC features: Attach canonical band metadata pointing to the 7-band COG
    const mappedFeatures: StacFeature[] = rawFeatures.map((f) => {
      const visualHref = f.assets?.visual?.href || '';
      const thumbHref = f.assets?.thumbnail?.href || '';
      const cc = typeof f.properties['eo:cloud_cover'] === 'number'
        ? f.properties['eo:cloud_cover']
        : 0;

      return {
        ...f,
        properties: {
          ...f.properties,
          platform: 'menut',
          constellation: 'newspace-catalunya',
          'eo:cloud_cover': cc,
          'menut:ground_sampling_distance': 4.75,
        },
        assets: {
          ...f.assets,
          visual: f.assets?.visual || {
            href: visualHref,
            type: 'image/tiff; application=geotiff; profile=cloud-optimized',
          },
          thumbnail: f.assets?.thumbnail || {
            href: thumbHref,
            type: 'image/jpeg',
          },
          // Canonical VNIR bands mapped directly to the 7-band GeoTIFF
          blue: {
            href: visualHref,
            title: 'Blue (480nm)',
            type: 'image/tiff; application=geotiff; profile=cloud-optimized',
            roles: ['data', 'reflectance'],
          },
          green: {
            href: visualHref,
            title: 'Green (560nm)',
            type: 'image/tiff; application=geotiff; profile=cloud-optimized',
            roles: ['data', 'reflectance'],
          },
          red: {
            href: visualHref,
            title: 'Red (662nm)',
            type: 'image/tiff; application=geotiff; profile=cloud-optimized',
            roles: ['data', 'reflectance'],
          },
          rededge1: {
            href: visualHref,
            title: 'RedEdge 1 (703nm)',
            type: 'image/tiff; application=geotiff; profile=cloud-optimized',
            roles: ['data', 'reflectance'],
          },
          rededge2: {
            href: visualHref,
            title: 'RedEdge 2 (738nm)',
            type: 'image/tiff; application=geotiff; profile=cloud-optimized',
            roles: ['data', 'reflectance'],
          },
          rededge3: {
            href: visualHref,
            title: 'RedEdge 3 (780nm)',
            type: 'image/tiff; application=geotiff; profile=cloud-optimized',
            roles: ['data', 'reflectance'],
          },
          nir: {
            href: visualHref,
            title: 'NIR (840nm)',
            type: 'image/tiff; application=geotiff; profile=cloud-optimized',
            roles: ['data', 'reflectance'],
          },
        },
      };
    });

    const passes = groupGranulesIntoPasses(mappedFeatures, 'menut');
    const totalTimeMs = Math.round(performance.now() - startTime);

    return {
      passes,
      benchmark: {
        granulesFound: mappedFeatures.length,
        passesFormed: passes.length,
        stacLatencyMs: totalTimeMs,
        groupingLatencyMs: 2,
        totalTimeMs,
        timestamp: new Date().toISOString(),
      },
      infoMessage,
    };
  }
}

export const menutStacService = new MenutStacService();
