import { STAC_COLLECTION, type StacFeature } from './stacApi';
import type { BandPreset } from './store.svelte';

const TITILER_BASE_URL = import.meta.env.VITE_TITILER_URL
  ?? (window.location.hostname.includes('localhost')
    ? 'http://titiler.localhost:8001'
    : 'https://titiler.tonilogar.com');

const WATER_API_BASE_URL = import.meta.env.VITE_WATER_API_URL
  ?? (window.location.hostname.includes('localhost')
    ? 'http://water-api.localhost:8001'
    : 'https://water-api.tonilogar.com');

export interface TileLayerConfig {
  tileUrl: string;
  bounds: [number, number, number, number];
}

export function getTitilerTileUrlTemplate(
  feature: StacFeature, 
  bandConfig: BandPreset, 
  userBoundingBox: [number, number, number, number] | null
): TileLayerConfig {
  const { bbox } = feature;
  
  let layerBounds: [number, number, number, number] = bbox;
  if (userBoundingBox) {
    layerBounds = [
      Math.max(bbox[0], userBoundingBox[0]),
      Math.max(bbox[1], userBoundingBox[1]),
      Math.min(bbox[2], userBoundingBox[2]),
      Math.min(bbox[3], userBoundingBox[3])
    ];
    if (layerBounds[0] > layerBounds[2] || layerBounds[1] > layerBounds[3]) {
      layerBounds = bbox;
    }
  }

  const stacItemUrl = `${STAC_COLLECTION}/items/${feature.id}`;
  const baseUrl = `${TITILER_BASE_URL}/stac/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(stacItemUrl)}`;

  let tileUrl = '';
  if (bandConfig.type === 'rgb') {
    const assetsStr = bandConfig.assets.map(a => `assets=${a}`).join('&');
    tileUrl = `${baseUrl}&${assetsStr}&rescale=${bandConfig.rescale.join(',')}`;
  } else if (bandConfig.type === 'expression') {
    const assetsStr = bandConfig.assets.map(a => `assets=${a}`).join('&');
    tileUrl = `${baseUrl}&${assetsStr}&expression=${encodeURIComponent(bandConfig.expression)}&rescale=${bandConfig.rescale.join(',')}`;
    if (bandConfig.colormap_name) {
      tileUrl += `&colormap_name=${bandConfig.colormap_name}`;
    }
  }

  return { tileUrl, bounds: layerBounds };
}

export async function getTitilerTileUrlAsync(
  feature: StacFeature, 
  bandConfig: BandPreset, 
  userBoundingBox: [number, number, number, number] | null
): Promise<TileLayerConfig> {
  
  if (bandConfig.type === 'external_api') {
    const { bbox } = feature;
    let layerBounds: [number, number, number, number] = bbox;
    if (userBoundingBox) {
      layerBounds = [
        Math.max(bbox[0], userBoundingBox[0]),
        Math.max(bbox[1], userBoundingBox[1]),
        Math.min(bbox[2], userBoundingBox[2]),
        Math.min(bbox[3], userBoundingBox[3])
      ];
      if (layerBounds[0] > layerBounds[2] || layerBounds[1] > layerBounds[3]) {
        layerBounds = bbox;
      }
    }

    const payload = {
      stac_item_id: feature.id,
      bbox: layerBounds
    };

    const resp = await fetch(`${WATER_API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error("Error in Water Quality API");
    }

    const data = await resp.json();
    const classificationUrl = data.classification_url;

    // Define the custom colormap matching the UI Legend
    const customColormap = {
      "1": "#2196F3", // Clear Water
      "2": "#E8430F", // High Turbidity
      "3": "#BEFF6B", // High Chlorophyll
      "4": "#1B8A0A", // Surface Algae
      "5": "#7A0000"  // Anomaly
    };
    const colormapStr = encodeURIComponent(JSON.stringify(customColormap));

    // Dynamic tile endpoint for classification GeoTIFF
    const tileUrl = `${TITILER_BASE_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(classificationUrl)}&colormap=${colormapStr}`;

    return { tileUrl, bounds: layerBounds };
  }

  // Sync generation for normal presets
  return getTitilerTileUrlTemplate(feature, bandConfig, userBoundingBox);
}
