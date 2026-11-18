import { store } from '../store.svelte';
import type { SatellitePass } from '../models/pass.model';
import type { SearchSession } from '../models/session.model';
import { executeWaterPollutionAnalysis } from '../services/waterAnalysisService';
import { mapLayerController, intersectBbox } from './MapLayerController';

export class WaterAnalysisController {
  public isPassAnalyzing(passId: string): boolean {
    return store.isPassAnalyzing(passId);
  }

  public async analyzePass(session: SearchSession, pass: SatellitePass) {
    if (!store.polygon || !store.boundingBox) {
      store.showNotification('Please draw a polygon over the water body first', 'warn');
      return;
    }

    if (store.isAreaTooLarge) {
      store.showNotification(`Selected area (${store.areaKm2} km²) exceeds the limit of ${store.maxAreaLimit} km²`, 'warn');
      return;
    }

    const userBbox = session.snapshot.boundingBox;

    // Find and sort all granules that actually intersect the user's AOI bounding box
    const intersectingGranules = pass.granules
      .map((g) => ({
        granule: g,
        intersection: intersectBbox(g.bbox, userBbox),
      }))
      .filter((item): item is { granule: typeof item.granule; intersection: [number, number, number, number] } => item.intersection !== null)
      .sort((a, b) => {
        const areaA = (a.intersection[2] - a.intersection[0]) * (a.intersection[3] - a.intersection[1]);
        const areaB = (b.intersection[2] - b.intersection[0]) * (b.intersection[3] - b.intersection[1]);
        return areaB - areaA;
      });

    if (intersectingGranules.length === 0) {
      store.showNotification('No satellite granules intersect the selected area', 'warn');
      return;
    }

    store.analyzingPassId = pass.id;
    store.showNotification(`Starting water pollution analysis for ${pass.date} (${pass.orbitFormatted})...`, 'info');

    try {
      // Analyze all intersecting granules in parallel
      const results = await Promise.all(
        intersectingGranules.map(async ({ granule, intersection }) => {
          return executeWaterPollutionAnalysis(
            pass.id,
            granule.id,
            pass.date,
            session.snapshot.polygon,
            intersection
          );
        })
      );

      // Attach results to pass
      pass.waterAnalyses = results;
      pass.waterAnalysis = results[0]; // Primary result (largest intersection)
      pass.viewMode = 'both'; // Show water contamination overlay over satellite RGB
      pass.isVisible = true;

      // Update session active pass & analysis
      session.activePassId = pass.id;
      session.activeAnalysis = results[0];
      session.isImageryHidden = false;

      // Update global active analysis
      store.setActiveAnalysis(results[0]);

      // Re-synchronize map layers to display both RGB and water quality
      mapLayerController.syncSessions(store.sessions);

      store.showNotification(
        `Water analysis completed for ${pass.date} (${results.length} ${results.length === 1 ? 'granule' : 'granules'})`,
        'success'
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Water analysis error:', err);
      store.showNotification(`Analysis error: ${message}`, 'warn');
    } finally {
      store.analyzingPassId = null;
    }
  }

  public setViewMode(session: SearchSession, pass: SatellitePass, mode: 'rgb' | 'water' | 'both') {
    pass.viewMode = mode;
    session.activePassId = pass.id;
    session.isImageryHidden = false;
    mapLayerController.syncSessions(store.sessions);
  }

  public togglePassVisibility(session: SearchSession, passId: string) {
    if (session.activePassId === passId && !session.isImageryHidden) {
      session.isImageryHidden = true;
    } else {
      session.activePassId = passId;
      session.isImageryHidden = false;
      const pass = session.passes.find((p) => p.id === passId);
      if (pass) pass.isVisible = true;
    }
    mapLayerController.syncSessions(store.sessions);
  }

  public setPassOpacity(session: SearchSession, passId: string, opacity: number) {
    const pass = session.passes.find((p) => p.id === passId);
    if (pass) {
      pass.opacity = opacity;
      mapLayerController.setOpacity(session.id, pass.id, opacity);
    }
  }

  public toggleSessionImagery(session: SearchSession) {
    session.isImageryHidden = !session.isImageryHidden;
    mapLayerController.syncSessions(store.sessions);
  }

  public clearAnalysis() {
    store.setActiveAnalysis(null);
    for (const session of store.sessions) {
      session.activeAnalysis = null;
      for (const pass of session.passes) {
        pass.waterAnalysis = null;
        pass.waterAnalyses = [];
        pass.viewMode = 'rgb';
      }
    }
    mapLayerController.syncSessions(store.sessions);
  }
}

export const waterAnalysisController = new WaterAnalysisController();
