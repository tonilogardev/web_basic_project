import { getPresetById, type DataProvider } from './types';
import type { SearchSnapshot, SearchSession } from './models/session.model';
import type { SatellitePass } from './models/pass.model';
export type { SearchSnapshot, SearchSession };

export const MAX_AREA_KM2 = 10000;
export const MIN_DATE_LIMIT = '2015-12-01'; // Sentinel-2 open data operational start date

export type DrawShape = 'box' | 'polygon';
export type ActiveDrawMode = 'none' | 'box' | 'polygon';

export interface ExportModalState {
  isOpen: boolean;
  mode: 'single' | 'all';
  pass: SatellitePass | null;
  session: SearchSession | null;
  passesCount: number;
}

export interface TimelapseModalState {
  isOpen: boolean;
  session: SearchSession | null;
  passes: SatellitePass[];
}

export function calculateAreaKm2(bbox: [number, number, number, number]): number {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const midLat = (minLat + maxLat) / 2;
  const latRad = (midLat * Math.PI) / 180;
  const widthKm = Math.abs(maxLng - minLng) * 111.32 * Math.cos(latRad);
  const heightKm = Math.abs(maxLat - minLat) * 110.574;
  return Math.round(widthKm * heightKm);
}

/**
 * Calculates the surface area of a polygon in km² using planar projection
 * centered at the centroid latitude. Coordinates are [lng, lat] pairs.
 */
export function calculatePolygonAreaKm2(coords: [number, number][]): number {
  if (!coords || coords.length < 3) return 0;

  let sumLat = 0;
  for (const [, lat] of coords) {
    sumLat += lat;
  }
  const midLat = sumLat / coords.length;
  const latRad = (midLat * Math.PI) / 180;

  const cosLat = Math.cos(latRad);
  const kx = 111.32 * cosLat;
  const ky = 110.574;

  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = [coords[i][0] * kx, coords[i][1] * ky];
    const [x2, y2] = [coords[(i + 1) % n][0] * kx, coords[(i + 1) % n][1] * ky];
    area += x1 * y2 - x2 * y1;
  }

  const result = Math.abs(area) / 2.0;
  return Number(result.toFixed(2));
}

/**
 * Derives bounding box [minLng, minLat, maxLng, maxLat] from polygon coordinates.
 */
export function calculatePolygonBbox(coords: [number, number][]): [number, number, number, number] | null {
  if (!coords || coords.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return [minLng, minLat, maxLng, maxLat];
}

class AppStore {
  // Collection of independent search sessions / windows
  sessions = $state<SearchSession[]>([]);
  sessionCounter = $state(0);

  // Snapshot of parameters when search was executed (most recent session)
  searchSnapshot = $state<SearchSnapshot | null>(null);

  // Map drawing state (Dual Mode: Box + Polygon)
  activeDrawMode = $state<ActiveDrawMode>('none');
  activeShape = $state<DrawShape | null>(null);
  isDrawing = $derived.by(() => this.activeDrawMode !== 'none');

  boundingBox = $state<[number, number, number, number] | null>(null);
  polygon = $state<[number, number][] | null>(null);

  // Computed area in km² (supports both box and polygon)
  areaKm2 = $derived.by(() => {
    if (this.activeShape === 'polygon' && this.polygon && this.polygon.length >= 3) {
      return calculatePolygonAreaKm2(this.polygon);
    }
    if (this.boundingBox) {
      return calculateAreaKm2(this.boundingBox);
    }
    return null;
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

  // Date Range Limits & Validation (Maximum 90 days, minimum December 2015)
  maxDateRangeDays = 90;
  minDateLimit = MIN_DATE_LIMIT;
  today = new Date().toISOString().slice(0, 10);

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

  isDateBeforeMinLimit = $derived.by(() => {
    if (this.startDate && this.startDate < this.minDateLimit) return true;
    if (this.endDate && this.endDate < this.minDateLimit) return true;
    return false;
  });

  isDateRangeValid = $derived.by(() => {
    if (this.isDateBeforeMinLimit) return false;
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
  searchStatusText = $state<string | null>(null);
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

  clearAreaSelection() {
    this.boundingBox = null;
    this.polygon = null;
    this.activeShape = null;
  }

  setDrawMode(mode: ActiveDrawMode) {
    this.activeDrawMode = mode;
  }

  toggleDrawBox() {
    if (this.activeDrawMode === 'box') {
      this.activeDrawMode = 'none';
    } else {
      // 1. Immediately clear any existing polygon and bounding box
      this.clearAreaSelection();
      this.activeDrawMode = 'box';
    }
  }

  toggleDrawPolygon() {
    if (this.activeDrawMode === 'polygon') {
      this.activeDrawMode = 'none';
    } else {
      // 2. Immediately clear any existing bounding box and polygon
      this.clearAreaSelection();
      this.activeDrawMode = 'polygon';
    }
  }

  toggleDrawing() {
    this.toggleDrawBox();
  }

  setBoundingBox(bbox: [number, number, number, number] | null) {
    this.boundingBox = bbox;
    if (bbox) {
      this.polygon = [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[1]],
        [bbox[2], bbox[3]],
        [bbox[0], bbox[3]],
      ];
      this.activeShape = 'box';
    } else {
      this.polygon = null;
      this.activeShape = null;
    }
    this.activeDrawMode = 'none';
  }

  setPolygon(coords: [number, number][]) {
    this.polygon = coords;
    this.boundingBox = calculatePolygonBbox(coords);
    this.activeShape = 'polygon';
    this.activeDrawMode = 'none';
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

  // Multi-Session Actions
  createSession(
    snapshot: SearchSnapshot,
    position: { x: number; y: number }
  ): SearchSession {
    this.sessionCounter += 1;
    const num = this.sessionCounter;
    const newSession: SearchSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionNumber: num,
      title: `Passes #${num}`,
      createdAt: new Date(),
      snapshot,
      passes: [],
      activePassId: null,
      isCollapsed: false,
      position,
      activeBenchmark: null,
      isSearching: true,
      searchError: null,
      isCachedResult: false,
      cacheHitRatio: '0%',
    };
    this.sessions.push(newSession);
    return this.sessions[this.sessions.length - 1];
  }

  updateSession(sessionId: string, updates: Partial<SearchSession>): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    Object.assign(session, updates);
  }

  removeSession(sessionId: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
    if (this.sessions.length === 0) {
      this.passes = [];
      this.activePassId = null;
      this.activeBenchmark = null;
      this.searchSnapshot = null;
    }
  }

  setSessionActivePass(sessionId: string, passId: string | null): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    if (session.activePassId === passId) {
      session.activePassId = null;
    } else {
      session.activePassId = passId;
    }

    for (const p of session.passes) {
      p.isVisible = p.id === session.activePassId;
    }
  }

  setSessionPassPreset(sessionId: string, passId: string, presetId: string): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const pass = session.passes.find((p) => p.id === passId);
    if (pass) {
      pass.preset = presetId;
      if (session.activePassId !== passId) {
        this.setSessionActivePass(sessionId, passId);
      }
    }
  }

  setSessionPassOpacity(sessionId: string, passId: string, opacity: number): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const pass = session.passes.find((p) => p.id === passId);
    if (pass) {
      pass.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  toggleSessionCollapse(sessionId: string): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.isCollapsed = !session.isCollapsed;
    }
  }

  updateSessionPosition(sessionId: string, pos: { x: number; y: number }): void {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.position = pos;
    }
  }

  clearAllSessions(): void {
    this.sessions = [];
  }

  // Modal dialog states
  exportModal = $state<ExportModalState>({
    isOpen: false,
    mode: 'single',
    pass: null,
    session: null,
    passesCount: 0,
  });

  timelapseModal = $state<TimelapseModalState>({
    isOpen: false,
    session: null,
    passes: [],
  });

  openExportModal(mode: 'single' | 'all', pass: SatellitePass | null = null, session: SearchSession | null = null) {
    this.exportModal = {
      isOpen: true,
      mode,
      pass,
      session,
      passesCount: session ? session.passes.length : pass ? 1 : 0,
    };
  }

  closeExportModal() {
    this.exportModal = {
      isOpen: false,
      mode: 'single',
      pass: null,
      session: null,
      passesCount: 0,
    };
  }

  openTimelapseModal(session: SearchSession | null = null, passes: SatellitePass[] = []) {
    this.timelapseModal = {
      isOpen: true,
      session,
      passes: passes.length > 0 ? passes : (session ? session.passes : this.passes),
    };
  }

  closeTimelapseModal() {
    this.timelapseModal = {
      isOpen: false,
      session: null,
      passes: [],
    };
  }

  clearBoundingBox() {
    this.boundingBox = null;
    this.polygon = null;
    this.activeShape = null;
    this.activeDrawMode = 'none';
    this.passes = [];
    this.activePassId = null;
    this.activeBenchmark = null;
    this.searchSnapshot = null;
  }
}

export const store = new AppStore();
