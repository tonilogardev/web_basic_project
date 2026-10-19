import maplibregl from 'maplibre-gl';
import type { StacFeature } from './stacApi';
import { getTitilerTileUrlAsync } from './titilerApi';
import { store } from './store.svelte';
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

  public async agregarEscena(feature: StacFeature) {
    const srcId = `cog-${feature.id}`;
    if (this.map.getSource(srcId)) return;

    try {
      const { tileUrl, bounds } = await getTitilerTileUrlAsync(feature, store.bandConfig, store.boundingBox);

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
          'raster-opacity': store.opacidadCapas / 100,
          'raster-resampling': 'linear'
        },
      }, beforeId);
    } catch (error) {
      console.error("Error adding scene:", error);
      store.finalizarCargaCapas();
      alert("Error loading satellite tiles. Ensure TiTiler is running.");
    }
  }

  public actualizarOpacidad(opacidad: number) {
    const style = this.map.getStyle();
    if (!style) return;

    const capasActuales = style.layers?.filter((l: maplibregl.LayerSpecification) => l.id.startsWith('cog-') && l.id.endsWith('-layer')) || [];
    for (const capa of capasActuales) {
      this.map.setPaintProperty(capa.id, 'raster-opacity', opacidad / 100);
    }
  }

  public quitarEscena(featureId: string) {
    const srcId = `cog-${featureId}`;
    if (this.map.getLayer(`${srcId}-layer`)) this.map.removeLayer(`${srcId}-layer`);
    if (this.map.getSource(srcId)) this.map.removeSource(srcId);
  }

  public async sincronizarCapas() {
    const style = this.map.getStyle();
    if (!style) return;

    const presetActual = store.presetActivo;
    const customActual = store.bandasCustom.join(',');
    const cambioPreset = this.ultimoPresetId !== presetActual || this.ultimasBandasCustom !== customActual;

    this.ultimoPresetId = presetActual;
    this.ultimasBandasCustom = customActual;

    if (cambioPreset) {
      const capasActuales = style.layers?.filter((l: maplibregl.LayerSpecification) => l.id.startsWith('cog-')) || [];
      for (const capa of capasActuales) {
        this.quitarEscena(capa.id.replace('-layer', '').replace('cog-', ''));
      }
    } else {
      const capasActuales = style.layers?.filter((l: maplibregl.LayerSpecification) => l.id.startsWith('cog-')) || [];
      for (const capa of capasActuales) {
        const sceneId = capa.id.replace('-layer', '').replace('cog-', '');
        if (!store.escenasVisibles.has(sceneId)) {
          this.quitarEscena(sceneId);
        }
      }
    }

    const escenasPorAgregar = Array.from(store.escenasVisibles).filter(id => !this.map.getSource(`cog-${id}`));

    if (escenasPorAgregar.length === 0) {
      return;
    }

    if (this.cancelarEsperaCarga) {
      this.cancelarEsperaCarga();
    }

    store.iniciarCargaCapas(escenasPorAgregar.length > 1 ? "Downloading images..." : "Downloading image tiles...");

    for (const id of escenasPorAgregar) {
      const f = store.resultados.find(r => r.id === id);
      if (f) {
        await this.agregarEscena(f);
      }
    }

    const sourceIds = escenasPorAgregar.map(id => `cog-${id}`);
    this.esperarCargaFuentes(sourceIds, () => {
      store.finalizarCargaCapas("Image loaded");
    });
  }

  private esperarCargaFuentes(sourceIds: string[], onCompletado: () => void) {
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
    }, 12000);
  }

  public destroy() {
    if (this.cancelarEsperaCarga) this.cancelarEsperaCarga();
    this.map.remove();
  }
}
