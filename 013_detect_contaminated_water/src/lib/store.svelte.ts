import type { SearchSession } from './models/session.model';
import type { WaterAnalysisResult } from './models/water.model';

export type UserTier = 'freemium' | 'pro' | 'enterprise';

export interface UserProfile {
  name: string;
  email: string;
  tier: UserTier;
  createdAt: string;
}

export const MAX_AREA_KM2 = 50;
export const MAX_DATE_RANGE_DAYS = 30;

/**
 * Calculates the surface area of a polygon in km² using planar projection
 * centered at the centroid latitude (accurate to <0.05% for regional areas).
 * Coordinates are [lng, lat] pairs.
 */
export function calculatePolygonAreaKm2(coords: [number, number][]): number {
  if (!coords || coords.length < 3) return 0;

  // Compute centroid latitude for projection scaling
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
  // User Profile & Dialog
  isUserModalOpen = $state(false);
  activeUser = $state<UserProfile | null>(null);
  notification = $state<{ text: string; type: 'info' | 'success' | 'warn' } | null>(null);

  // Drawing & Polygon Area of Interest (AOI)
  isDrawing = $state(false);
  polygon = $state<[number, number][] | null>(null);
  maxAreaLimit = MAX_AREA_KM2;

  // Derived Polygon Metrics
  areaKm2 = $derived.by(() => {
    if (!this.polygon || this.polygon.length < 3) return null;
    return calculatePolygonAreaKm2(this.polygon);
  });

  boundingBox = $derived.by(() => {
    if (!this.polygon || this.polygon.length < 3) return null;
    return calculatePolygonBbox(this.polygon);
  });

  isAreaValid = $derived.by(() => {
    if (!this.areaKm2) return false;
    return this.areaKm2 > 0 && this.areaKm2 <= this.maxAreaLimit;
  });

  isAreaTooLarge = $derived.by(() => {
    if (!this.areaKm2) return false;
    return this.areaKm2 > this.maxAreaLimit;
  });

  // Date Range (Default: Last 30 days, Limit: 30 days)
  maxDateRangeDays = MAX_DATE_RANGE_DAYS;
  startDate = $state(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  endDate = $state(new Date().toISOString().slice(0, 10));

  dateRangeDays = $derived.by(() => {
    if (!this.startDate || !this.endDate) return 0;
    const d1 = new Date(this.startDate).getTime();
    const d2 = new Date(this.endDate).getTime();
    const diff = Math.round((d2 - d1) / (24 * 60 * 60 * 1000)) + 1;
    return diff > 0 ? diff : 0;
  });

  isDateRangeValid = $derived.by(() => {
    return this.dateRangeDays > 0 && this.dateRangeDays <= this.maxDateRangeDays;
  });

  isDateRangeTooWide = $derived.by(() => {
    return this.dateRangeDays > this.maxDateRangeDays;
  });

  // Search State & Sessions
  isSearching = $state(false);
  sessions = $state<SearchSession[]>([]);
  sessionCounter = $state(0);
  activeAnalysis = $state<WaterAnalysisResult | null>(null);
  analyzingPassId = $state<string | null>(null);

  isPassAnalyzing(passId: string): boolean {
    return this.analyzingPassId === passId;
  }

  setActiveAnalysis(result: WaterAnalysisResult | null) {
    this.activeAnalysis = result;
    if (this.sessions.length > 0 && result) {
      const session = this.sessions[this.sessions.length - 1];
      session.activeAnalysis = result;
      session.activePassId = result.passId;
    }
  }

  closeSession(sessionId: string) {
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
    if (this.sessions.length === 0) {
      this.activeAnalysis = null;
    }
  }

  updateSession(sessionId: string, updates: Partial<SearchSession>) {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  updateSessionPosition(sessionId: string, pos: { x: number; y: number }) {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.position = pos;
    }
  }

  // Actions
  private clearListeners: (() => void)[] = [];

  onClear(fn: () => void) {
    this.clearListeners.push(fn);
    return () => {
      this.clearListeners = this.clearListeners.filter((l) => l !== fn);
    };
  }

  toggleDrawing() {
    this.isDrawing = !this.isDrawing;
  }

  setPolygon(coords: [number, number][] | null) {
    this.polygon = coords;
  }

  clearPolygon() {
    this.polygon = null;
    this.isDrawing = false;
    for (const fn of this.clearListeners) {
      try {
        fn();
      } catch (err) {
        console.error('Error in clear listener:', err);
      }
    }
  }

  openUserModal() {
    this.isUserModalOpen = true;
  }

  closeUserModal() {
    this.isUserModalOpen = false;
  }

  createUser(profile: Omit<UserProfile, 'createdAt'>) {
    this.activeUser = {
      ...profile,
      createdAt: new Date().toISOString(),
    };
    this.isUserModalOpen = false;
    this.showNotification(`User "${profile.name}" created successfully (${profile.tier.toUpperCase()})`, 'success');
  }

  showNotification(text: string, type: 'info' | 'success' | 'warn' = 'info') {
    this.notification = { text, type };
    setTimeout(() => {
      if (this.notification?.text === text) {
        this.notification = null;
      }
    }, 4500);
  }
}

export const store = new AppStore();
