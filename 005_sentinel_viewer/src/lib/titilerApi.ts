import type { StacFeature } from './stacApi';
import type { BandPreset } from './store.svelte';

const RUST_API_BASE_URL = import.meta.env.VITE_RUST_API_URL
  ?? import.meta.env.VITE_WATER_API_URL
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

  const baseUrl = `${RUST_API_BASE_URL}/api/tiles/{z}/{x}/{y}.png`;
  let tileUrl = '';

  if (bandConfig.type === 'rgb') {
    const b1 = feature.assets[bandConfig.assets[0]]?.href || '';
    const b2 = feature.assets[bandConfig.assets[1]]?.href || '';
    const b3 = feature.assets[bandConfig.assets[2]]?.href || '';
    const rescale = bandConfig.rescale ? bandConfig.rescale.join(',') : '0,3000';
    tileUrl = `${baseUrl}?b1=${encodeURIComponent(b1)}&b2=${encodeURIComponent(b2)}&b3=${encodeURIComponent(b3)}&rescale=${rescale}`;
  } else if (bandConfig.type === 'expression') {
    const b1 = feature.assets[bandConfig.assets[0]]?.href || '';
    const b2 = feature.assets[bandConfig.assets[1]]?.href || '';
    const rescale = bandConfig.rescale ? bandConfig.rescale.join(',') : '-1,1';
    const preset = bandConfig.id || 'ndvi';
    tileUrl = `${baseUrl}?b1=${encodeURIComponent(b1)}&b2=${encodeURIComponent(b2)}&preset=${preset}&rescale=${rescale}`;
    if (bandConfig.colormap_name) {
      tileUrl += `&colormap_name=${bandConfig.colormap_name}`;
    }
  }

  if (userBoundingBox) {
    const aoiStr = userBoundingBox.map(n => n.toFixed(6)).join(',');
    tileUrl = `clipped://${tileUrl}&aoi=${aoiStr}`;
  }

  return { tileUrl, bounds: layerBounds };
}

const waterQualityConfigCache = new Map<string, TileLayerConfig>();

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

    const cacheKey = `${feature.id}_${layerBounds.map(n => n.toFixed(4)).join('_')}`;
    if (waterQualityConfigCache.has(cacheKey)) {
      return waterQualityConfigCache.get(cacheKey)!;
    }

    const payload = {
      stac_item_id: feature.id,
      bbox: layerBounds
    };

    const resp = await fetch(`${RUST_API_BASE_URL}/api/analyze`, {
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

    // Dynamic tile endpoint for classification GeoTIFF served by Rust backend
    let tileUrl = `${RUST_API_BASE_URL}/api/tiles/{z}/{x}/{y}.png?url=${encodeURIComponent(classificationUrl)}&colormap=${colormapStr}`;
    if (userBoundingBox) {
      const aoiStr = userBoundingBox.map(n => n.toFixed(6)).join(',');
      tileUrl = `clipped://${tileUrl}&aoi=${aoiStr}`;
    }

    const config: TileLayerConfig = { tileUrl, bounds: layerBounds };
    waterQualityConfigCache.set(cacheKey, config);

    return config;
  }

  // Sync generation for normal presets
  return getTitilerTileUrlTemplate(feature, bandConfig, userBoundingBox);
}
