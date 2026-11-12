import type { SatellitePass, ProviderBenchmark } from './pass.model';

/**
 * Frozen search snapshot representing the criteria selected by the user at query time.
 * Decoupled from ongoing edits in the main query builder.
 */
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

/**
 * Independent Search Session Model (Workspace Aggregate Root)
 * Represents an independent results window with its own parameters, satellite passes,
 * active visual pass, benchmark telemetry, and window placement.
 */
export interface SearchSession {
  id: string; // e.g. "session_17314166_a3f9"
  sessionNumber: number; // 1, 2, 3...
  title: string; // e.g. "Passes #1"
  createdAt: Date;
  snapshot: SearchSnapshot;
  passes: SatellitePass[];
  activePassId: string | null; // Single active pass for THIS session's spatial area
  isCollapsed: boolean;
  position: { x: number; y: number };
  activeBenchmark: ProviderBenchmark | null;
  isSearching: boolean;
  searchError: string | null;
  isCachedResult: boolean;
  cacheHitRatio: string;
}
