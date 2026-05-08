import maplibregl from 'maplibre-gl';
import type { StacFeature } from './stacApi';
import { getTitilerBboxUrl } from './titilerApi';
import { store } from './store.svelte';
import 'maplibre-gl/dist/maplibre-gl.css';

export class MapManager {
  private map: maplibregl.Map;
  private arrastrando = false;
  private inicioArrastre: { lng: number; lat: number } | null = null;

  constructor(container: HTMLElement) {
    this.map = new maplibregl.Map({
      container,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [1.74, 41.69],
      zoom: 7.5
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
    this.setupDrawEvents();

    this.map.on('idle', () => {
      if (store.cargaInicialPendiente) {
        store.cargaInicialPendiente = false;
        store.progresoCarga = 100;
        store.mostrarMensajeExito("All uploaded images");
        setTimeout(() => { store.progresoCarga = 0; }, 500);
      }
    });
  }

  private setupDrawEvents() {
    this.map.on('mousedown', (e) => this.onMouseDown(e));
    this.map.on('mousemove', (e) => this.onMouseMove(e));
    this.map.on('mouseup', (e) => this.onMouseUp(e));
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

  public agregarEscena(feature: StacFeature) {
    const srcId = `cog-${feature.id}`;
    if (this.map.getSource(srcId)) return;

    const { url, coordinates } = getTitilerBboxUrl(feature, store.bandConfig, store.boundingBox);

    this.map.addSource(srcId, {
      type: 'image',
      url,
      coordinates: coordinates as any
    });

    const beforeId = this.map.getLayer('bbox-layer') ? 'bbox-layer' : undefined;
    this.map.addLayer({
      id: `${srcId}-layer`,
      type: 'raster',
      source: srcId,
      paint: { 'raster-opacity': 0.9 },
    }, beforeId);
  }

  public quitarEscena(featureId: string) {
    const srcId = `cog-${featureId}`;
    if (this.map.getLayer(`${srcId}-layer`)) this.map.removeLayer(`${srcId}-layer`);
    if (this.map.getSource(srcId)) this.map.removeSource(srcId);
  }

  public sincronizarCapas() {
    const style = this.map.getStyle();
    if (!style) return;

    const capasActuales = style.layers?.filter(l => l.id.startsWith('cog-')) || [];
    for (const capa of capasActuales) {
      this.quitarEscena(capa.id.replace('-layer', '').replace('cog-', ''));
    }

    for (const id of store.escenasVisibles) {
      const f = store.resultados.find(r => r.id === id);
      if (f) this.agregarEscena(f);
    }
  }

  public destroy() {
    this.map.remove();
  }
}
