import type { SatellitePass, ProviderBenchmark } from '../models/pass.model';
import type { SearchFilters } from '../types';

interface CacheEntry {
  passes: SatellitePass[];
  benchmark: ProviderBenchmark;
  timestamp: number;
}

/**
 * High-Performance In-Memory Cache Service
 * Eliminates redundant network calls and guarantees 0ms response for repeated queries.
 * Gathers hit/miss telemetry for empirical verification ("Dato mata relato").
 */
export class MemoryCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;

  // Empirical stats
  public hits = 0;
  public misses = 0;

  constructor(defaultTtlMs = 15 * 60 * 1000, maxEntries = 50) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
  }

  /**
   * Generates a deterministic cache key from search filters.
   */
  public generateKey(filters: SearchFilters): string {
    const bboxStr = filters.boundingBox
      ? filters.boundingBox.map((coord) => coord.toFixed(4)).join(',')
      : 'no_bbox';
    return `${filters.provider}::${filters.satellite}::${filters.startDate}::${filters.endDate}::${filters.maxCloudCover}::${filters.preset}::${bboxStr}`;
  }

  /**
   * Retrieves cached passes and benchmark if entry exists and has not expired.
   */
  public get(key: string): { passes: SatellitePass[]; benchmark: ProviderBenchmark } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.defaultTtlMs) {
      // Evict expired entry
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    // Return cloned objects so caller mutations do not pollute cached source
    return {
      passes: JSON.parse(JSON.stringify(entry.passes)),
      benchmark: { ...entry.benchmark },
    };
  }

  /**
   * Stores search results and benchmark metrics into memory cache.
   */
  public set(key: string, passes: SatellitePass[], benchmark: ProviderBenchmark): void {
    // Evict oldest entry if capacity exceeded
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      passes: JSON.parse(JSON.stringify(passes)),
      benchmark: { ...benchmark },
      timestamp: Date.now(),
    });
  }

  /**
   * Clears the entire in-memory cache.
   */
  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Returns current cache telemetry.
   */
  public getStats(): { size: number; hits: number; misses: number; hitRatio: string } {
    const total = this.hits + this.misses;
    const ratio = total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : '0%';
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio: ratio,
    };
  }
}

// Global singleton instance for the app session
export const memoryCache = new MemoryCacheService();
