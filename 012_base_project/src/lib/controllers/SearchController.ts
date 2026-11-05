import { store } from '../store.svelte';
import { memoryCache } from '../services/MemoryCacheService';
import { searchEsaPasses } from '../services/esaStacService';
import type { SearchFilters } from '../types';

/**
 * Search Controller (Decoupled MVC Controller)
 * Orchestrates satellite search queries, cache lookups, and empirical telemetry
 * without touching UI components directly.
 */
export class SearchController {
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

    const filters: SearchFilters = {
      provider: store.provider,
      satellite: store.satellite,
      startDate: store.startDate,
      endDate: store.endDate,
      maxCloudCover: store.maxCloudCover,
      preset: store.selectedPreset,
      boundingBox: store.boundingBox,
      drawingMode: store.isDrawing,
    };

    const cacheKey = memoryCache.generateKey(filters);

    // 1. Check in-memory cache ("0ms response" guarantee)
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      store.passes = cached.passes;
      store.activeBenchmark = cached.benchmark;
      store.isCachedResult = true;
      store.cacheHitRatio = memoryCache.getStats().hitRatio;
      store.searchError = null;

      // Auto-activate the first pass if none active
      if (store.passes.length > 0 && !store.activePassId) {
        store.setActivePass(store.passes[0].id);
      }
      return;
    }

    // 2. Cache miss -> execute STAC query
    store.isSearching = true;
    store.searchError = null;

    try {
      const result = await searchEsaPasses(filters);

      // Save to in-memory cache
      memoryCache.set(cacheKey, result.passes, result.benchmark);

      // Update state
      store.passes = result.passes;
      store.activeBenchmark = result.benchmark;
      store.isCachedResult = false;
      store.cacheHitRatio = memoryCache.getStats().hitRatio;

      // Auto-activate the first pass for immediate visual feedback
      if (result.passes.length > 0) {
        store.setActivePass(result.passes[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to search satellite passes';
      store.searchError = msg;
      console.error('[SearchController Error]:', err);
    } finally {
      store.isSearching = false;
    }
  }

  /**
   * Activates a single pass exclusively on the map (Single Active Pass Model).
   * Unloads any previous pass to dedicate 100% bandwidth to the selected pass.
   */
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
}
