import { getPresetById, type DataProvider } from './types';

export const MAX_AREA_KM2 = 10000;

export interface SearchSnapshot {
  startDate: string;
  endDate: string;
  dateRangeDays: number;
  preset: string;
  presetLabel: string;
  presetBadge: string;
  boundingBox: [number, number, number, number] | null;
  areaKm2: number;
}

export function calculateAreaKm2(bbox: [number, number, number, number]): number {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const midLat = (minLat + maxLat) / 2;
  const latRad = (midLat * Math.PI) / 180;
  const widthKm = Math.abs(maxLng - minLng) * 111.32 * Math.cos(latRad);
  const heightKm = Math.abs(maxLat - minLat) * 110.574;
  return Math.round(widthKm * heightKm);
}

class AppStore {
  // Snapshot of parameters when search was executed
  searchSnapshot = $state<SearchSnapshot | null>(null);

  // Map drawing state
  isDrawing = $state(false);
  boundingBox = $state<[number, number, number, number] | null>(null);

  // Computed area in km²
  areaKm2 = $derived.by(() => {
    if (!this.boundingBox) return null;
    return calculateAreaKm2(this.boundingBox);
  });

  // Area limits
  maxAreaLimit = MAX_AREA_KM2;

  isAreaValid = $derived.by(() => {
    if (!this.areaKm2) return false;
    return this.areaKm2 > 0 && this.areaKm2 <= this.maxAreaLimit;
  });

  isAreaTooLarge = $derived.by(() => {
    if (!this.areaKm2) return false;
    return this.areaKm2 > this.maxAreaLimit;
  });

  // Search parameters
  provider = $state<DataProvider>('esa');
  satellite = $state('sentinel-2-l2a');

  // Date Range Limits & Validation (Maximum 90 days)
  maxDateRangeDays = 90;

  startDate = $state(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  endDate = $state(new Date().toISOString().slice(0, 10));

  dateRangeDays = $derived.by(() => {
    if (!this.startDate || !this.endDate) return 0;
    const d1 = new Date(this.startDate).getTime();
    const d2 = new Date(this.endDate).getTime();
    if (isNaN(d1) || isNaN(d2) || d2 < d1) return 0;
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  });

  isDateRangeValid = $derived.by(() => {
    return this.dateRangeDays > 0 && this.dateRangeDays <= this.maxDateRangeDays;
  });

  isDateRangeTooWide = $derived.by(() => {
    return this.dateRangeDays > this.maxDateRangeDays;
  });

  // Filters
  maxCloudCover = $state(20);
  selectedPreset = $state('true-color');

  // Results & Benchmarks
  passes = $state<import('./models/pass.model').SatellitePass[]>([]);
  activePassId = $state<string | null>(null);
  activeBenchmark = $state<import('./models/pass.model').ProviderBenchmark | null>(null);
  isSearching = $state(false);
  searchError = $state<string | null>(null);
  isCachedResult = $state(false);
  cacheHitRatio = $state('0%');

  // Active preset dedicated specifically to the Results Window
  activeResultPreset = $state('true-color');

  // Actions
  setResultPreset(presetId: string) {
    this.activeResultPreset = presetId;
    if (this.searchSnapshot) {
      const pObj = getPresetById(presetId);
      this.searchSnapshot.preset = presetId;
      this.searchSnapshot.presetLabel = pObj?.label || presetId;
      this.searchSnapshot.presetBadge = pObj?.badge || 'RGB';
    }
    const activePass = this.passes.find((p) => p.id === this.activePassId);
    if (activePass) {
      activePass.preset = presetId;
    }
  }

  toggleDrawing() {
    this.isDrawing = !this.isDrawing;
  }

  setBoundingBox(bbox: [number, number, number, number] | null) {
    this.boundingBox = bbox;
    this.isDrawing = false;
  }

  setActivePass(passId: string | null) {
    if (this.activePassId === passId) {
      this.activePassId = null;
    } else {
      this.activePassId = passId;
    }

    for (const p of this.passes) {
      p.isVisible = p.id === this.activePassId;
    }
  }

  clearBoundingBox() {
    this.boundingBox = null;
    this.isDrawing = false;
    this.passes = [];
    this.activePassId = null;
    this.activeBenchmark = null;
    this.searchSnapshot = null;
  }
}

export const store = new AppStore();
