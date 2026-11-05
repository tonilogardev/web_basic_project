export type DataProvider = 'esa';

export type PresetCategory = 'composite' | 'index';

export interface BandPreset {
  id: string;
  label: string;
  badge: string;
  description: string;
  category: PresetCategory;
  // 3-Band Channel Composites (RGB)
  bands?: {
    r: string; // STAC asset key for Red channel
    g: string; // STAC asset key for Green channel
    b: string; // STAC asset key for Blue channel
    rescale: [number, number]; // Reflectance scaling range [min, max]
  };
  // 2-Band Spectral Indices
  index?: {
    b1: string; // Numerator 1 / Minuend band
    b2: string; // Numerator 2 / Subtrahend band
    formula: string;
    presetParam: string; // Backend preset identifier ('ndvi' | 'ndwi')
    colormap: string; // Colormap name ('rdylgn' | 'blues')
    rescale: [number, number]; // Index value range [-1.0, 1.0]
  };
}

/**
 * Declarative Presets Registry (Strategy Pattern)
 * Defines spectral band recipes for Sentinel-2 Level-2A imagery without code duplication.
 */
export const PRESETS: BandPreset[] = [
  {
    id: 'true-color',
    label: 'True Color (Natural RGB)',
    badge: 'RGB',
    description: 'Red (B04), Green (B03), Blue (B02) - Natural human vision',
    category: 'composite',
    bands: { r: 'red', g: 'green', b: 'blue', rescale: [0, 3000] },
  },
  {
    id: 'false-color',
    label: 'False Color (Urban / Geology)',
    badge: 'Urban',
    description: 'SWIR2 (B12), SWIR1 (B11), Red (B04) - Built-up and geological structures',
    category: 'composite',
    bands: { r: 'swir22', g: 'swir16', b: 'red', rescale: [0, 3500] },
  },
  {
    id: 'cir',
    label: 'Color Infrared (CIR - Vegetation)',
    badge: 'CIR',
    description: 'NIR (B08), Red (B04), Green (B03) - Plant health and biomass density',
    category: 'composite',
    bands: { r: 'nir', g: 'red', b: 'green', rescale: [0, 4000] },
  },
  {
    id: 'agriculture',
    label: 'Agriculture',
    badge: 'Agri',
    description: 'SWIR1 (B11), NIR (B08), Blue (B02) - Crop monitoring and soil moisture',
    category: 'composite',
    bands: { r: 'swir16', g: 'nir', b: 'blue', rescale: [0, 3500] },
  },
  {
    id: 'ndvi',
    label: 'NDVI (Normalized Difference Vegetation Index)',
    badge: 'NDVI',
    description: '(NIR - Red) / (NIR + Red) - Quantifies photosynthetic activity',
    category: 'index',
    index: {
      b1: 'nir',
      b2: 'red',
      formula: '(NIR - Red) / (NIR + Red)',
      presetParam: 'ndvi',
      colormap: 'rdylgn',
      rescale: [-0.2, 0.9],
    },
  },
  {
    id: 'ndwi',
    label: 'NDWI (Normalized Difference Water Index)',
    badge: 'NDWI',
    description: '(Green - NIR) / (Green + NIR) - Highlights open water bodies & moisture',
    category: 'index',
    index: {
      b1: 'green',
      b2: 'nir',
      formula: '(Green - NIR) / (Green + NIR)',
      presetParam: 'ndwi',
      colormap: 'blues',
      rescale: [-0.5, 0.5],
    },
  },
];

export function getPresetById(id: string): BandPreset {
  return PRESETS.find((p) => p.id === id) || PRESETS[0];
}

export interface SearchFilters {
  provider: DataProvider;
  satellite: string;
  startDate: string;
  endDate: string;
  maxCloudCover: number;
  preset: string;
  boundingBox: [number, number, number, number] | null;
  drawingMode: boolean;
}
