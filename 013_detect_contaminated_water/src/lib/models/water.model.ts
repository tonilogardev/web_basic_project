/**
 * Domain Models for Water Quality & Pollution Detection
 */

export type WaterQualityClassId = 0 | 1 | 2 | 3 | 4 | 5;

export interface WaterClassDefinition {
  id: WaterQualityClassId;
  label: string;
  description: string;
  colorHex: string;
  badgeClass: string;
}

export const WATER_QUALITY_CLASSES: Record<WaterQualityClassId, WaterClassDefinition> = {
  0: {
    id: 0,
    label: 'Background / Land',
    description: 'Land, clouds, or masked terrain',
    colorHex: 'transparent',
    badgeClass: 'badge-bg',
  },
  1: {
    id: 1,
    label: 'Clean Water',
    description: 'Low turbidity and normal optical reflectance in visible bands',
    colorHex: '#2196f3',
    badgeClass: 'badge-clean',
  },
  2: {
    id: 2,
    label: 'High Turbidity',
    description: 'Suspended solids and sediment concentration detected via NDTI',
    colorHex: '#e8430f',
    badgeClass: 'badge-turbid',
  },
  3: {
    id: 3,
    label: 'Chlorophyll / Eutrophication',
    description: 'High phytoplankton and chlorophyll-a concentration detected via NDCI',
    colorHex: '#beff6b',
    badgeClass: 'badge-chl',
  },
  4: {
    id: 4,
    label: 'Surface Algae Bloom',
    description: 'Floating biomass and surface algae proliferation detected via FAI',
    colorHex: '#1b8a0a',
    badgeClass: 'badge-algae',
  },
  5: {
    id: 5,
    label: 'Critical Anomaly',
    description: 'Atypical spectral signature with excess red (potential chemical runoff or spill)',
    colorHex: '#7a0000',
    badgeClass: 'badge-anomaly',
  },
};

export interface AnalyzeWaterRequest {
  stac_item_id: string;
  bbox: [number, number, number, number];
  satellite?: 'sentinel-2' | 'menut';
  assets?: Record<string, string>;
}

export interface AnalyzeWaterResponse {
  status: string;
  classification_url: string;
  rgb_url: string;
  job_id: string;
  cached: boolean;
}

export interface WaterAnalysisResult {
  jobId: string;
  passId: string;
  date: string;
  classificationUrl: string;
  rgbUrl: string;
  tileUrlTemplate: string;
  cached: boolean;
  analyzedAt: string;
  polygon: [number, number][];
  bbox: [number, number, number, number];
}
