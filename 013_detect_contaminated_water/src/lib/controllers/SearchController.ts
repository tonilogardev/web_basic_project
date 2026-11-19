import { store } from '../store.svelte';
import { getSatelliteProvider } from '../services/SatelliteProviderFactory';
import type { SearchSnapshot, SearchSession } from '../models/session.model';
import { mapLayerController } from './MapLayerController';

export class SearchController {
  public async executeSearch() {
    if (!store.polygon || !store.boundingBox) {
      store.showNotification('Please draw a polygon before searching for passes', 'warn');
      return;
    }

    if (store.isAreaTooLarge) {
      store.showNotification(
        `Area too large (${store.areaKm2} km²). Maximum limit is ${store.maxAreaLimit} km²`,
        'warn'
      );
      return;
    }

    if (store.isDateRangeTooWide) {
      store.showNotification(
        `Date range too wide (${store.dateRangeDays} days). Maximum allowed is ${store.maxDateRangeDays} days`,
        'warn'
      );
      return;
    }

    store.isSearching = true;

    const snapshot: SearchSnapshot = {
      polygon: [...store.polygon],
      boundingBox: [...store.boundingBox],
      areaKm2: store.areaKm2 || 0,
      startDate: store.startDate,
      endDate: store.endDate,
      dateRangeDays: store.dateRangeDays,
      satellite: store.selectedSatellite,
    };

    const isMenut = store.selectedSatellite === 'menut';
    const provider = getSatelliteProvider(store.selectedSatellite);
    const satelliteLabel = provider.spec.shortName;

    try {
      const result = await provider.searchPasses({
        boundingBox: snapshot.boundingBox,
        startDate: snapshot.startDate,
        endDate: snapshot.endDate,
      });
      const { passes, benchmark } = result;

      if (passes.length === 0) {
        if (result.infoMessage) {
          store.showNotification(result.infoMessage, 'warn');
        } else if (isMenut) {
          store.showNotification(
            `No se encontraron pasadas de Menut entre ${snapshot.startDate} y ${snapshot.endDate}.`,
            'warn'
          );
        } else {
          store.showNotification(
            `No se encontraron pasadas de Sentinel-2 entre ${snapshot.startDate} y ${snapshot.endDate}.`,
            'warn'
          );
        }
        return;
      }

      // Mark the first pass as active and visible
      if (passes.length > 0) {
        passes[0].isVisible = true;
      }

      store.sessionCounter += 1;
      const sessionCount = store.sessionCounter;
      const initialOffset = (sessionCount - 1) * 24;

      const newSession: SearchSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sessionNumber: sessionCount,
        title: `${satelliteLabel} #${sessionCount} (${passes.length})`,
        createdAt: new Date(),
        snapshot,
        passes,
        satellite: store.selectedSatellite,
        activePassId: passes[0]?.id ?? null,
        activeAnalysis: null,
        benchmark,
        isImageryHidden: false,
        minimized: false,
        position: {
          x: Math.min(window.innerWidth - 380, 390 + initialOffset),
          y: Math.min(window.innerHeight - 300, 76 + initialOffset),
        },
      };

      store.sessions.push(newSession);
      mapLayerController.syncSessions(store.sessions);
      store.showNotification(
        `Search completed: ${passes.length} passes found (${benchmark.totalTimeMs}ms)`,
        'success'
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Search error:', err);
      store.showNotification(`Satellite search error: ${message}`, 'warn');
    } finally {
      store.isSearching = false;
    }
  }
}

export const searchController = new SearchController();
