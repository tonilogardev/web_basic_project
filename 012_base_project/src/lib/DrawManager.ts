import type maplibregl from 'maplibre-gl';
import { store, calculateAreaKm2, MAX_AREA_KM2 } from './store.svelte';

const SOURCE_ID = 'bbox-draw-source';
const FILL_LAYER_ID = 'bbox-draw-fill';
const LINE_LAYER_ID = 'bbox-draw-line';

const CORNERS_SOURCE_ID = 'bbox-corners-source';
const CORNERS_GLOW_LAYER_ID = 'bbox-corners-glow';
const CORNERS_LAYER_ID = 'bbox-corners-circle';
const CORNERS_HIT_LAYER_ID = 'bbox-corners-hitarea';

// Crisp, high-contrast SVG precision targeting cursor
const PRECISION_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='7' fill='none' stroke='%230f172a' stroke-width='3' opacity='0.7'/%3E%3Cline x1='12' y1='1' x2='12' y2='7' stroke='%230f172a' stroke-width='3' opacity='0.7'/%3E%3Cline x1='12' y1='17' x2='12' y2='23' stroke='%230f172a' stroke-width='3' opacity='0.7'/%3E%3Cline x1='1' y1='12' x2='7' y2='12' stroke='%230f172a' stroke-width='3' opacity='0.7'/%3E%3Cline x1='17' y1='12' x2='23' y2='12' stroke='%230f172a' stroke-width='3' opacity='0.7'/%3E%3Ccircle cx='12' cy='12' r='7' fill='none' stroke='%2338bdf8' stroke-width='1.5'/%3E%3Cline x1='12' y1='2' x2='12' y2='7' stroke='%2338bdf8' stroke-width='1.5'/%3E%3Cline x1='12' y1='17' x2='12' y2='22' stroke='%2338bdf8' stroke-width='1.5'/%3E%3Cline x1='2' y1='12' x2='7' y2='12' stroke='%2338bdf8' stroke-width='1.5'/%3E%3Cline x1='17' y1='12' x2='22' y2='12' stroke='%2338bdf8' stroke-width='1.5'/%3E%3Ccircle cx='12' cy='12' r='1.8' fill='%23ffffff' stroke='%230284c7' stroke-width='0.75'/%3E%3C/svg%3E") 12 12, crosshair`;

export class DrawManager {
  private map: maplibregl.Map;
  private isDragging = false;
  private isResizing = false;
  private startLngLat: { lng: number; lat: number } | null = null;
  private fixedPoint: [number, number] | null = null;
  private activeResizeCursor = '';

  private polygonSource: maplibregl.GeoJSONSource | null = null;
  private cornersSource: maplibregl.GeoJSONSource | null = null;

  constructor(map: maplibregl.Map) {
    this.map = map;
    this.initSourceAndLayers();
    this.bindEvents();
  }

  private initSourceAndLayers() {
    // 1. Polygon layers with data-driven colors
    if (!this.map.getSource(SOURCE_ID)) {
      this.map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      this.polygonSource = this.map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;

      // Fill: Blue if valid, Red if area exceeds limit
      this.map.addLayer({
        id: FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': ['case', ['get', 'isTooLarge'], '#ef4444', '#38bdf8'],
          'fill-opacity': ['case', ['get', 'isTooLarge'], 0.25, 0.18],
        },
      });

      // Line: Blue if valid, Red if area exceeds limit
      this.map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': ['case', ['to-boolean', ['get', 'isTooLarge']], '#ef4444', '#0284c7'],
          'line-width': ['case', ['to-boolean', ['get', 'isTooLarge']], 3, 2.5],
        },
      });
    }

    // 2. Corner vertex / anchor dot layers with data-driven colors
    if (!this.map.getSource(CORNERS_SOURCE_ID)) {
      this.map.addSource(CORNERS_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      this.cornersSource = this.map.getSource(CORNERS_SOURCE_ID) as maplibregl.GeoJSONSource;

      // Glow halo
      this.map.addLayer({
        id: CORNERS_GLOW_LAYER_ID,
        type: 'circle',
        source: CORNERS_SOURCE_ID,
        paint: {
          'circle-radius': 11,
          'circle-color': ['case', ['to-boolean', ['get', 'isTooLarge']], '#ef4444', '#38bdf8'],
          'circle-opacity': 0.45,
          'circle-blur': 0.35,
        },
      });

      // Crisp inner anchor dot
      this.map.addLayer({
        id: CORNERS_LAYER_ID,
        type: 'circle',
        source: CORNERS_SOURCE_ID,
        paint: {
          'circle-radius': 6,
          'circle-color': '#ffffff',
          'circle-stroke-color': ['case', ['to-boolean', ['get', 'isTooLarge']], '#ef4444', '#0284c7'],
          'circle-stroke-width': 2.5,
        },
      });

      // Generous invisible hit-area (radius 16px) for effortless clicking/dragging
      this.map.addLayer({
        id: CORNERS_HIT_LAYER_ID,
        type: 'circle',
        source: CORNERS_SOURCE_ID,
        paint: {
          'circle-radius': 16,
          'circle-opacity': 0,
        },
      });
    }
  }

  private bindEvents() {
    this.map.on('mousedown', (e) => this.onMouseDown(e));
    this.map.on('mousemove', (e) => this.onMouseMove(e));
    this.map.on('mouseup', (e) => this.onMouseUp(e));

    // Handle corner hover states
    this.map.on('mouseenter', CORNERS_HIT_LAYER_ID, (e) => {
      const feat = e.features?.[0];
      const cursor = feat?.properties?.cursor || 'pointer';
      this.map.getCanvas().style.cursor = cursor;
    });

    this.map.on('mouseleave', CORNERS_HIT_LAYER_ID, () => {
      if (this.isResizing || this.isDragging) return;
      if (store.isDrawing) {
        this.map.getCanvas().style.cursor = PRECISION_CURSOR;
      } else {
        this.map.getCanvas().style.cursor = '';
      }
    });
  }

  public setDrawingMode(active: boolean) {
    const canvas = this.map.getCanvas();
    if (active) {
      this.map.dragPan.disable();
      canvas.style.cursor = PRECISION_CURSOR;
    } else {
      if (!this.isResizing) {
        this.map.dragPan.enable();
        canvas.style.cursor = '';
      }
      this.isDragging = false;
      this.startLngLat = null;
    }
  }

  private onMouseDown(e: maplibregl.MapMouseEvent) {
    if (e.originalEvent.button !== 0) return;

    // 1. Check if clicking on an existing corner handle to RESIZE
    const cornerFeatures = this.map.queryRenderedFeatures(e.point, {
      layers: [CORNERS_HIT_LAYER_ID],
    });

    if (cornerFeatures.length > 0 && cornerFeatures[0].properties?.fixed) {
      const feat = cornerFeatures[0];
      const fixedStr = feat.properties.fixed;
      this.isResizing = true;
      this.fixedPoint = JSON.parse(fixedStr) as [number, number];
      this.activeResizeCursor = feat.properties.cursor || 'pointer';
      this.map.getCanvas().style.cursor = this.activeResizeCursor;
      this.map.dragPan.disable();
      return;
    }

    // 2. If drawing mode is active and not clicking a handle, start a NEW box
    if (!store.isDrawing) return;

    this.isDragging = true;
    this.startLngLat = { lng: e.lngLat.lng, lat: e.lngLat.lat };
    this.map.dragPan.disable();

    // Instant zero-lag initial visual indicator
    this.renderPolygon(e.lngLat.lng, e.lngLat.lat, e.lngLat.lng, e.lngLat.lat);
    this.renderCornerDots([e.lngLat.lng, e.lngLat.lat, e.lngLat.lng, e.lngLat.lat]);
  }

  private onMouseMove(e: maplibregl.MapMouseEvent) {
    // Mode A: Corner Resizing in action (60 FPS)
    if (this.isResizing && this.fixedPoint) {
      const minLng = Math.min(this.fixedPoint[0], e.lngLat.lng);
      const maxLng = Math.max(this.fixedPoint[0], e.lngLat.lng);
      const minLat = Math.min(this.fixedPoint[1], e.lngLat.lat);
      const maxLat = Math.max(this.fixedPoint[1], e.lngLat.lat);

      this.renderPolygon(minLng, minLat, maxLng, maxLat);
      this.renderCornerDots([minLng, minLat, maxLng, maxLat]);
      return;
    }

    // Mode B: New Box Dragging in action (60 FPS)
    if (this.isDragging && this.startLngLat) {
      const minLng = Math.min(this.startLngLat.lng, e.lngLat.lng);
      const maxLng = Math.max(this.startLngLat.lng, e.lngLat.lng);
      const minLat = Math.min(this.startLngLat.lat, e.lngLat.lat);
      const maxLat = Math.max(this.startLngLat.lat, e.lngLat.lat);

      this.renderPolygon(minLng, minLat, maxLng, maxLat);
      this.renderCornerDots([minLng, minLat, maxLng, maxLat]);
    }
  }

  private onMouseUp(e: maplibregl.MapMouseEvent) {
    // 1. Finish corner resizing
    if (this.isResizing && this.fixedPoint) {
      const minLng = Math.min(this.fixedPoint[0], e.lngLat.lng);
      const maxLng = Math.max(this.fixedPoint[0], e.lngLat.lng);
      const minLat = Math.min(this.fixedPoint[1], e.lngLat.lat);
      const maxLat = Math.max(this.fixedPoint[1], e.lngLat.lat);

      this.isResizing = false;
      this.fixedPoint = null;
      this.map.dragPan.enable();
      this.map.getCanvas().style.cursor = '';

      if (Math.abs(maxLng - minLng) > 0.0001 && Math.abs(maxLat - minLat) > 0.0001) {
        const bbox: [number, number, number, number] = [minLng, minLat, maxLng, maxLat];
        this.renderPolygon(minLng, minLat, maxLng, maxLat);
        this.renderCornerDots([minLng, minLat, maxLng, maxLat]);
        store.setBoundingBox(bbox);
      }
      return;
    }

    // 2. Finish new box dragging
    if (this.isDragging && this.startLngLat) {
      const minLng = Math.min(this.startLngLat.lng, e.lngLat.lng);
      const maxLng = Math.max(this.startLngLat.lng, e.lngLat.lng);
      const minLat = Math.min(this.startLngLat.lat, e.lngLat.lat);
      const maxLat = Math.max(this.startLngLat.lat, e.lngLat.lat);

      this.isDragging = false;
      this.startLngLat = null;
      this.setDrawingMode(false);

      if (Math.abs(maxLng - minLng) < 0.0001 || Math.abs(maxLat - minLat) < 0.0001) {
        this.clear();
        store.setBoundingBox(null);
        return;
      }

      const bbox: [number, number, number, number] = [minLng, minLat, maxLng, maxLat];
      this.renderPolygon(minLng, minLat, maxLng, maxLat);
      this.renderCornerDots([minLng, minLat, maxLng, maxLat]);
      store.setBoundingBox(bbox);
    }
  }

  private renderPolygon(minLng: number, minLat: number, maxLng: number, maxLat: number) {
    if (!this.polygonSource) {
      this.polygonSource = this.map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    }
    if (!this.polygonSource) return;

    const area = calculateAreaKm2([minLng, minLat, maxLng, maxLat]);
    const isTooLarge = area > MAX_AREA_KM2;

    const coordinates = [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ];

    this.polygonSource.setData({
      type: 'Feature',
      properties: {
        isTooLarge,
        areaKm2: area,
      },
      geometry: {
        type: 'Polygon',
        coordinates,
      },
    });
  }

  private renderCornerDots(bbox: [number, number, number, number]) {
    if (!this.cornersSource) {
      this.cornersSource = this.map.getSource(CORNERS_SOURCE_ID) as maplibregl.GeoJSONSource;
    }
    if (!this.cornersSource) return;

    const [minLng, minLat, maxLng, maxLat] = bbox;
    const area = calculateAreaKm2(bbox);
    const isTooLarge = area > MAX_AREA_KM2;

    // Define 4 corner interactive handles with their diagonal opposite anchor
    const corners = [
      { id: 'sw', coord: [minLng, minLat], fixed: [maxLng, maxLat], cursor: 'nesw-resize' },
      { id: 'se', coord: [maxLng, minLat], fixed: [minLng, maxLat], cursor: 'nwse-resize' },
      { id: 'ne', coord: [maxLng, maxLat], fixed: [minLng, minLat], cursor: 'nesw-resize' },
      { id: 'nw', coord: [minLng, maxLat], fixed: [maxLng, minLat], cursor: 'nwse-resize' },
    ];

    const features = corners.map((c) => ({
      type: 'Feature' as const,
      properties: {
        id: c.id,
        fixed: JSON.stringify(c.fixed),
        cursor: c.cursor,
        isTooLarge,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: c.coord,
      },
    }));

    this.cornersSource.setData({
      type: 'FeatureCollection',
      features,
    });
  }

  public clear() {
    if (!this.polygonSource) {
      this.polygonSource = this.map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    }
    if (this.polygonSource) {
      this.polygonSource.setData({
        type: 'FeatureCollection',
        features: [],
      });
    }

    if (!this.cornersSource) {
      this.cornersSource = this.map.getSource(CORNERS_SOURCE_ID) as maplibregl.GeoJSONSource;
    }
    if (this.cornersSource) {
      this.cornersSource.setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }

  public destroy() {
    this.clear();
    const layers = [CORNERS_HIT_LAYER_ID, CORNERS_LAYER_ID, CORNERS_GLOW_LAYER_ID, LINE_LAYER_ID, FILL_LAYER_ID];
    for (const lid of layers) {
      if (this.map.getLayer(lid)) this.map.removeLayer(lid);
    }
    const sources = [CORNERS_SOURCE_ID, SOURCE_ID];
    for (const sid of sources) {
      if (this.map.getSource(sid)) this.map.removeSource(sid);
    }
  }
}
