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

export function getTitilerBboxUrl(
  feature: StacFeature, 
  bandConfig: BandPreset, 
  userBoundingBox: [number, number, number, number] | null
): { url: string; coordinates: number[][] } {
  const { bbox } = feature;
  
  let layerBounds = bbox;
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
  const bboxStr = layerBounds.join(',');
  const baseUrl = `${TITILER_BASE_URL}/stac/bbox/${bboxStr}.png?url=${encodeURIComponent(stacItemUrl)}`;

  let url = '';
  if (bandConfig.type === 'rgb') {
    const assetsStr = bandConfig.assets.map(a => `assets=${a}`).join('&');
    url = `${baseUrl}&${assetsStr}&rescale=${bandConfig.rescale.join(',')}&max_size=2048`;
  } else {
    const assetsStr = bandConfig.assets.map(a => `assets=${a}`).join('&');
    url = `${baseUrl}&${assetsStr}&expression=${encodeURIComponent(bandConfig.expression!)}&rescale=${bandConfig.rescale.join(',')}&max_size=2048`;
    if (bandConfig.colormap_name) {
      url += `&colormap_name=${bandConfig.colormap_name}`;
    }
  }

  const coordinates = [
    [layerBounds[0], layerBounds[3]], // Top-Left
    [layerBounds[2], layerBounds[3]], // Top-Right
    [layerBounds[2], layerBounds[1]], // Bottom-Right
    [layerBounds[0], layerBounds[1]]  // Bottom-Left
  ];

  return { url, coordinates };
}

export async function getTitilerUrlAsync(
  feature: StacFeature, 
  bandConfig: BandPreset, 
  userBoundingBox: [number, number, number, number] | null
): Promise<{ url: string; coordinates: number[][] }> {
  
  if (bandConfig.type === 'external_api') {
    const { bbox } = feature;
    let layerBounds = bbox;
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

    const bboxStr = layerBounds.join(',');
    
    // Define the custom colormap matching the UI Legend
    const customColormap = {
      "1": "#2196F3", // Clear Water
      "2": "#E8430F", // High Turbidity
      "3": "#BEFF6B", // High Chlorophyll
      "4": "#1B8A0A", // Surface Algae
      "5": "#7A0000"  // Anomaly
    };
    const colormapStr = encodeURIComponent(JSON.stringify(customColormap));

    // Tell Titiler to render the newly generated classification TIF
    const url = `${TITILER_BASE_URL}/cog/bbox/${bboxStr}.png?url=${encodeURIComponent(classificationUrl)}&colormap=${colormapStr}`;

    const coordinates = [
      [layerBounds[0], layerBounds[3]],
      [layerBounds[2], layerBounds[3]],
      [layerBounds[2], layerBounds[1]],
      [layerBounds[0], layerBounds[1]] 
    ];

    return { url, coordinates };
  }

  // Fallback to sync generation for normal presets
  return getTitilerBboxUrl(feature, bandConfig, userBoundingBox);
}
