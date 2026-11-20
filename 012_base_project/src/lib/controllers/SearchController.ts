import { store } from '../store.svelte';
import { memoryCache } from '../services/MemoryCacheService';
import { searchEsaPasses } from '../services/esaStacService';
import { getPresetById, type SearchFilters } from '../types';
import type { SearchSnapshot } from '../models/session.model';
import { mapLayerController } from './MapLayerController';

/**
 * Search Controller (Decoupled MVC Controller)
 * Orchestrates multi-session satellite search queries, cache lookups, and empirical telemetry
 * without touching UI components directly.
 */
export class SearchController {
  /**
   * Calculates a staggered, non-overlapping initial screen position for new session windows.
   * Cascades smoothly (+30px per session) within available browser viewport dimensions.
   */
  public static calculateStaggeredPosition(existingCount: number): { x: number; y: number } {
    if (typeof window === 'undefined') {
      return { x: 360, y: 76 };
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const offset = (existingCount % 6) * 30; // 0, 30, 60, 90, 120, 150

    if (w >= 1100) {
      // Large screens: dock on the right side, cascading inward and downward
      const baseX = w - 370;
      const baseY = 76;
      return {
        x: Math.max(360, baseX - offset),
        y: Math.min(Math.max(76, h - 500), baseY + offset),
      };
    } else if (w >= 740) {
      // Medium screens: dock next to the main panel, cascading right and down
      const baseX = 360;
      const baseY = 76;
      return {
        x: Math.min(Math.max(20, w - 340), baseX + offset),
        y: Math.min(Math.max(76, h - 500), baseY + offset),
      };
    } else {
      // Mobile / narrow screens: stacked below main panel
      return {
        x: 20 + (offset % 60),
        y: 460 + (offset % 90),
      };
    }
  }

  public static async executeSearch(): Promise<void> {
    if (!store.boundingBox) {
      store.searchError = 'Please draw an Area of Interest (AOI) on the map first.';
      return;
    }

    if (!store.isAreaValid) {
      store.searchError = `Area exceeds the maximum allowed limit of ${store.maxAreaLimit.toLocaleString()} km².`;
      return;
    }

    if (!store.isDateRangeValid) {
      store.searchError = `Date range cannot exceed ${store.maxDateRangeDays} days (selected: ${store.dateRangeDays} days).`;
      return;
    }

    // 1. Freeze the chosen parameters snapshot for this specific search session
    store.activeResultPreset = store.selectedPreset;
    const presetObj = getPresetById(store.selectedPreset);
    const snapshot: SearchSnapshot = {
      startDate: store.startDate,
      endDate: store.endDate,
      dateRangeDays: store.dateRangeDays,
      preset: store.selectedPreset,
      presetLabel: presetObj?.label || store.selectedPreset,
      presetBadge: presetObj?.badge || 'RGB',
      boundingBox: [...store.boundingBox],
      polygon: store.polygon ? store.polygon.map((pt) => [...pt] as [number, number]) : null,
      shapeType: store.activeShape || 'box',
      areaKm2: store.areaKm2 ?? 0,
    };
    store.searchSnapshot = snapshot;

    // 2. Compute non-overlapping cascading position and spawn a new SearchSession
    const position = this.calculateStaggeredPosition(store.sessions.length);
    const session = store.createSession(snapshot, position);

    const filters: SearchFilters = {
      provider: store.provider,
      satellite: store.satellite,
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
      maxCloudCover: store.maxCloudCover,
      preset: snapshot.preset,
      boundingBox: snapshot.boundingBox,
      drawingMode: false,
    };

    const cacheKey = memoryCache.generateKey(filters);

    // 3. Check in-memory cache ("0ms response" guarantee)
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      // Clone passes so each session can toggle/change recipes independently
      const clonedPasses = cached.passes.map((p) => ({ ...p, isVisible: false }));
      const hitRatio = memoryCache.getStats().hitRatio;

      store.updateSession(session.id, {
        passes: clonedPasses,
        activeBenchmark: cached.benchmark,
        isCachedResult: true,
        cacheHitRatio: hitRatio,
        isSearching: false,
        searchError: null,
      });

      // Auto-activate the first pass for this session
      if (clonedPasses.length > 0) {
        store.setSessionActivePass(session.id, clonedPasses[0].id);
      }
      return;
    }

    // 4. Cache miss -> execute asynchronous STAC query with exact SCL cloud scanning
    store.updateSession(session.id, { isSearching: true, searchError: null });
    store.isSearching = true;
    store.searchStatusText = 'Scanning 20m SCL bands in AOI (~1.5s)...';
    store.searchError = null;

    try {
      const result = await searchEsaPasses(filters, snapshot.polygon, (status) => {
        store.searchStatusText = status;
      });

      // Save to in-memory cache
      memoryCache.set(cacheKey, result.passes, result.benchmark);

      const clonedPasses = result.passes.map((p) => ({ ...p, isVisible: false }));
      const hitRatio = memoryCache.getStats().hitRatio;

      store.updateSession(session.id, {
        passes: clonedPasses,
        activeBenchmark: result.benchmark,
        isCachedResult: false,
        cacheHitRatio: hitRatio,
        isSearching: false,
        searchError: null,
      });

      // Auto-activate the first pass for immediate visual feedback
      if (clonedPasses.length > 0) {
        store.setSessionActivePass(session.id, clonedPasses[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to search satellite passes';
      store.updateSession(session.id, {
        searchError: msg,
        isSearching: false,
      });
      store.searchError = msg;
      console.error('[SearchController Error]:', err);
    } finally {
      store.updateSession(session.id, {
        isSearching: false,
      });
      store.isSearching = false;
      store.searchStatusText = null;
    }
  }

  // Session-scoped actions
  public static selectSessionPass(sessionId: string, passId: string): void {
    store.setSessionActivePass(sessionId, passId);
  }

  public static hideSessionPass(sessionId: string): void {
    store.setSessionActivePass(sessionId, null);
  }

  public static setSessionPassOpacity(sessionId: string, passId: string, opacity: number): void {
    store.setSessionPassOpacity(sessionId, passId, opacity);
  }

  public static setSessionPassPreset(sessionId: string, passId: string, presetId: string): void {
    store.setSessionPassPreset(sessionId, passId, presetId);
  }

  public static closeSession(sessionId: string): void {
    mapLayerController.removeSessionLayers(sessionId);
    store.removeSession(sessionId);
  }

  // Legacy single-session helpers (maintained for transitional compatibility)
  public static selectPass(passId: string): void {
    store.setActivePass(passId);
  }

  public static hideActivePass(): void {
    store.setActivePass(null);
  }

  public static setPassOpacity(passId: string, opacity: number): void {
    const pass = store.passes.find((p) => p.id === passId);
    if (pass) {
      pass.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  public static setPassPreset(passId: string, presetId: string): void {
    const pass = store.passes.find((p) => p.id === passId);
    if (pass) {
      pass.preset = presetId;
      if (store.activePassId !== passId) {
        this.selectPass(passId);
      }
    }
  }
}
