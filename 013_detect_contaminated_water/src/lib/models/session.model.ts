import type { SatellitePass, ProviderBenchmark } from './pass.model';
import type { WaterAnalysisResult } from './water.model';

export interface SearchSnapshot {
  polygon: [number, number][];
  boundingBox: [number, number, number, number];
  areaKm2: number;
  startDate: string;
  endDate: string;
  dateRangeDays: number;
  satellite?: 'sentinel-2' | 'menut';
}

export interface SearchSession {
  id: string;
  sessionNumber: number;
  title: string;
  createdAt: Date;
  snapshot: SearchSnapshot;
  passes: SatellitePass[];
  satellite?: 'sentinel-2' | 'menut';
  activePassId: string | null;
  activeAnalysis: WaterAnalysisResult | null;
  benchmark: ProviderBenchmark | null;
  isImageryHidden: boolean;
  minimized: boolean;
  position: { x: number; y: number };
}
