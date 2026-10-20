import maplibregl from 'maplibre-gl';
import type { StacFeature } from './stacApi';
import { getTitilerTileUrlAsync } from './titilerApi';
import { store, type BandPreset } from './store.svelte';
import 'maplibre-gl/dist/maplibre-gl.css';

export class MapManager {
  private map: maplibregl.Map;
  private arrastrando = false;
  private inicioArrastre: { lng: number; lat: number } | null = null;
  private cancelarEsperaCarga: (() => void) | null = null;
  private ultimoPresetId: string = 'true-color';
  private ultimasBandasCustom: string = '';

  constructor(container: HTMLElement) {
    this.map = new maplibregl.Map({
      container,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [1.74, 41.69],
      zoom: 7.5
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
    this.setupDrawEvents();
  }

  private setupDrawEvents() {
    this.map.on('mousedown', (e: maplibregl.MapMouseEvent) => this.onMouseDown(e));
    this.map.on('mousemove', (e: maplibregl.MapMouseEvent) => this.onMouseMove(e));
    this.map.on('mouseup', (e: maplibregl.MapMouseEvent) => this.onMouseUp(e));
  }

  private onMouseDown(e: maplibregl.MapMouseEvent) {
    if (!store.modoDibujo) return;
    if (e.originalEvent.button !== 0) return;
    this.arrastrando = true;
    this.inicioArrastre = { lng: e.lngLat.lng, lat: e.lngLat.lat };
  }

  private onMouseMove(e: maplibregl.MapMouseEvent) {
    if (!store.modoDibujo || !this.arrastrando || !this.inicioArrastre) return;
    
    const lng1 = this.inicioArrastre.lng;
    const lat1 = this.inicioArrastre.lat;
    const lng2 = e.lngLat.lng;
    const lat2 = e.lngLat.lat;

    store.boundingBox = [
      Math.min(lng1, lng2),
      Math.min(lat1, lat2),
      Math.max(lng1, lng2),
      Math.max(lat1, lat2),
    ];
    this.dibujarRectangulo();
  }

  private onMouseUp(e: maplibregl.MapMouseEvent) {
    if (!store.modoDibujo || !this.arrastrando || !this.inicioArrastre) return;
    if (e.originalEvent.button !== 0) return;

    const lng1 = this.inicioArrastre.lng;
    const lat1 = this.inicioArrastre.lat;
    const lng2 = e.lngLat.lng;
    const lat2 = e.lngLat.lat;

    store.boundingBox = [
      Math.min(lng1, lng2),
      Math.min(lat1, lat2),
      Math.max(lng1, lng2),
      Math.max(lat1, lat2),
    ];
    this.dibujarRectangulo();
    
    this.arrastrando = false;
    this.inicioArrastre = null;
    store.modoDibujo = false;
    this.map.dragPan.enable();
    this.map.getCanvas().style.cursor = '';
  }

  public dibujarRectangulo() {
    if (!store.boundingBox) return;

    const [minLng, minLat, maxLng, maxLat] = store.boundingBox;
    const coords = [
      [minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]
    ];

    if (this.map.getLayer('bbox-layer')) this.map.removeLayer('bbox-layer');
    if (this.map.getSource('bbox-source')) this.map.removeSource('bbox-source');

    this.map.addSource('bbox-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [coords] },
      },
    });

    this.map.addLayer({
      id: 'bbox-layer',
      type: 'line',
      source: 'bbox-source',
      paint: { 'line-color': '#ff0000', 'line-width': 2 },
    });
  }

  public limpiarBoundingBox() {
    if (this.map.getLayer('bbox-layer')) this.map.removeLayer('bbox-layer');
    if (this.map.getSource('bbox-source')) this.map.removeSource('bbox-source');

    const style = this.map.getStyle();
    if (style) {
      const cogLayers = style.layers?.filter(l => l.id.startsWith('cog-')) || [];
      for (const cl of cogLayers) {
        if (this.map.getLayer(cl.id)) this.map.removeLayer(cl.id);
        const srcId = cl.id.replace('-layer', '');
        if (this.map.getSource(srcId)) this.map.removeSource(srcId);
      }
    }
    store.limpiarBoundingBox();
  }

  public activarDibujo() {
    store.modoDibujo = true;
    this.arrastrando = false;
    this.inicioArrastre = null;
    store.busquedaRealizada = false;
    this.map.dragPan.disable();
    this.map.getCanvas().style.cursor = 'crosshair';
  }

  public irALugar(lugar: any) {
    const { boundingbox, lat, lon } = lugar;
    if (boundingbox) {
      const [latMin, latMax, lonMin, lonMax] = boundingbox.map(Number);
      this.map.fitBounds([ [lonMin, latMin], [lonMax, latMax] ], { padding: 50, duration: 1500 });
    } else {
      this.map.flyTo({ center: [Number(lon), Number(lat)], zoom: 12, duration: 1500 });
    }
  }

  public async sincronizarCapas() {
    const style = this.map.getStyle();
    if (!style) return;

    // 1. Build map of all desired layers across all search sessions
    const capasDeseadas = new Map<string, { feature: StacFeature; bandConfig: BandPreset; opacidad: number }>();

    for (const b of store.busquedas) {
      for (const featureId of b.escenasVisibles) {
        const f = b.resultados.find(r => r.id === featureId);
        if (f) {
          const layerKey = `${b.presetId}-${featureId}`;
          capasDeseadas.set(layerKey, {
            feature: f,
            bandConfig: b.bandConfig,
            opacidad: b.opacidad
          });
        }
      }
    }

    // 2. Identify active scenes across all current search sessions (to preserve in memory)
    const capasActivasEnSesiones = new Set<string>();
    for (const b of store.busquedas) {
      for (const r of b.resultados) {
        capasActivasEnSesiones.add(`${b.presetId}-${r.id}`);
      }
    }

    // 3. Manage visibility and opacities of existing cog- layers in memory
    const capasActuales = style.layers?.filter((l: maplibregl.LayerSpecification) => l.id.startsWith('cog-') && l.id.endsWith('-layer')) || [];
    for (const capa of capasActuales) {
      const layerKey = capa.id.replace('cog-', '').replace('-layer', '');
      const layerId = capa.id;

      if (capasDeseadas.has(layerKey)) {
        // Desired layer: ensure it is visible and update opacity
        const item = capasDeseadas.get(layerKey)!;
        if (this.map.getLayoutProperty(layerId, 'visibility') === 'none') {
          this.map.setLayoutProperty(layerId, 'visibility', 'visible');
        }
        this.map.setPaintProperty(layerId, 'raster-opacity', item.opacidad / 100);
      } else if (capasActivasEnSesiones.has(layerKey)) {
        // Layer belongs to an open search session but is currently unchecked:
        // HIDE it without removing from MapLibre memory (0ms instant toggle when checked)
        if (this.map.getLayoutProperty(layerId, 'visibility') !== 'none') {
          this.map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      } else {
        // Session was closed or deleted: destroy layer & source to release memory
        this.quitarCapa(layerKey);
      }
    }

    // 4. Identify layers that need to be added to MapLibre for the first time
    const capasPorAgregar = Array.from(capasDeseadas.entries()).filter(([key]) => !this.map.getSource(`cog-${key}`));

    if (capasPorAgregar.length === 0) {
      return;
    }

    if (this.cancelarEsperaCarga) {
      this.cancelarEsperaCarga();
    }

    const totalCapas = capasPorAgregar.length;
    const hasWaterQuality = capasPorAgregar.some(([_, item]) => item.bandConfig.preset === 'water-quality');

    // Realistic estimate based on processing type and number of scenes
    const tiempoEstimado = hasWaterQuality
      ? Math.max(4, Math.round(4 + (totalCapas - 1) * 3))
      : Math.max(2, Math.round(2 + (totalCapas - 1) * 0.5));

    const msgCarga = hasWaterQuality
      ? (totalCapas > 1 ? `Processing Water Quality (${totalCapas} images)...` : "Processing Water Quality...")
      : (totalCapas > 1 ? `Downloading ${totalCapas} images...` : "Downloading image tiles...");

    store.iniciarCargaCapas(msgCarga, tiempoEstimado);

    for (const [layerKey, item] of capasPorAgregar) {
      await this.agregarEscenaConPreset(layerKey, item.feature, item.bandConfig, item.opacidad);
    }

    const sourceIds = capasPorAgregar.map(([key]) => `cog-${key}`);
    const textoExito = totalCapas > 1 ? `${totalCapas} images loaded` : "Image loaded";
    const timeoutMs = Math.max(15000, (tiempoEstimado + 5) * 1000);
    this.esperarCargaFuentes(sourceIds, () => {
      store.finalizarCargaCapas(textoExito);
    }, timeoutMs);
  }

  public async agregarEscenaConPreset(layerKey: string, feature: StacFeature, bandConfig: BandPreset, opacidad: number) {
    const srcId = `cog-${layerKey}`;
    if (this.map.getSource(srcId)) return;

    try {
      const { tileUrl, bounds } = await getTitilerTileUrlAsync(feature, bandConfig, store.boundingBox);

      if (this.map.getSource(srcId)) return;

      this.map.addSource(srcId, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        bounds: bounds
      });

      const beforeId = this.map.getLayer('bbox-layer') ? 'bbox-layer' : undefined;
      this.map.addLayer({
        id: `${srcId}-layer`,
        type: 'raster',
        source: srcId,
        paint: { 
          'raster-opacity': opacidad / 100,
          'raster-resampling': 'linear'
        },
      }, beforeId);
    } catch (error) {
      console.error("Error adding scene:", error);
      store.finalizarCargaCapas();
      alert("Error loading satellite tiles. Ensure TiTiler is running.");
    }
  }

  public quitarCapa(layerKey: string) {
    const srcId = `cog-${layerKey}`;
    if (this.map.getLayer(`${srcId}-layer`)) this.map.removeLayer(`${srcId}-layer`);
    if (this.map.getSource(srcId)) this.map.removeSource(srcId);
  }

  private esperarCargaFuentes(sourceIds: string[], onCompletado: () => void, timeoutMs: number = 15000) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let completado = false;

    const cleanup = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      this.map.off('sourcedata', onSourceData);
      this.map.off('idle', onIdle);
      this.cancelarEsperaCarga = null;
    };

    this.cancelarEsperaCarga = () => {
      completado = true;
      cleanup();
    };

    const verificar = () => {
      if (completado) return;

      const todasCargadas = sourceIds.every(id => {
        try {
          return this.map.getSource(id) !== undefined && this.map.isSourceLoaded(id);
        } catch {
          return false;
        }
      });

      if (todasCargadas) {
        completado = true;
        cleanup();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            onCompletado();
          });
        });
      }
    };

    const onSourceData = (e: maplibregl.MapSourceDataEvent) => {
      if (e.sourceId && sourceIds.includes(e.sourceId)) {
        verificar();
      }
    };

    const onIdle = () => {
      verificar();
    };

    this.map.on('sourcedata', onSourceData);
    this.map.on('idle', onIdle);

    pollInterval = setInterval(verificar, 150);

    timer = setTimeout(() => {
      if (!completado) {
        completado = true;
        cleanup();
        onCompletado();
      }
    }, timeoutMs);
  }

  public destroy() {
    if (this.cancelarEsperaCarga) this.cancelarEsperaCarga();
    this.map.remove();
  }
}
