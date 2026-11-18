import type maplibregl from 'maplibre-gl';
import { store, calculatePolygonAreaKm2, MAX_AREA_KM2 } from './store.svelte';

const POLYGON_SOURCE_ID = 'aqua-polygon-source';
const POLYGON_FILL_LAYER_ID = 'aqua-polygon-fill';
const POLYGON_LINE_LAYER_ID = 'aqua-polygon-line';

const GUIDE_SOURCE_ID = 'aqua-guide-source';
const GUIDE_LINE_LAYER_ID = 'aqua-guide-line';

const VERTICES_SOURCE_ID = 'aqua-vertices-source';
const VERTICES_GLOW_LAYER_ID = 'aqua-vertices-glow';
const VERTICES_CIRCLE_LAYER_ID = 'aqua-vertices-circle';

// Standard sharp GIS precision crosshair
const DRAW_CURSOR = 'crosshair';

export class PolygonDrawManager {
  private map: maplibregl.Map;
  private activePoints: [number, number][] = [];
  private isHoveringFirstPoint = false;

  private polygonSource: maplibregl.GeoJSONSource | null = null;
  private guideSource: maplibregl.GeoJSONSource | null = null;
  private verticesSource: maplibregl.GeoJSONSource | null = null;

  constructor(map: maplibregl.Map) {
    this.map = map;
    this.initSourceAndLayers();
    this.bindEvents();
  }

  private initSourceAndLayers() {
    // 1. Polygon Fill and Border Layers
    if (!this.map.getSource(POLYGON_SOURCE_ID)) {
      this.map.addSource(POLYGON_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      this.polygonSource = this.map.getSource(POLYGON_SOURCE_ID) as maplibregl.GeoJSONSource;

      // Fill: Cyan if valid, Red if > 50 km2
      this.map.addLayer({
        id: POLYGON_FILL_LAYER_ID,
        type: 'fill',
        source: POLYGON_SOURCE_ID,
        paint: {
          'fill-color': ['case', ['get', 'isTooLarge'], '#ef4444', '#06b6d4'],
          'fill-opacity': ['case', ['get', 'isTooLarge'], 0.28, 0.18],
        },
      });

      // Line: Cyan if valid, Red if > 50 km2
      this.map.addLayer({
        id: POLYGON_LINE_LAYER_ID,
        type: 'line',
        source: POLYGON_SOURCE_ID,
        paint: {
          'line-color': ['case', ['to-boolean', ['get', 'isTooLarge']], '#ef4444', '#0891b2'],
          'line-width': ['case', ['to-boolean', ['get', 'isTooLarge']], 3, 2.5],
        },
      });
    }

    // 2. Active Guide Line (from last point to cursor)
    if (!this.map.getSource(GUIDE_SOURCE_ID)) {
      this.map.addSource(GUIDE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      this.guideSource = this.map.getSource(GUIDE_SOURCE_ID) as maplibregl.GeoJSONSource;

      this.map.addLayer({
        id: GUIDE_LINE_LAYER_ID,
        type: 'line',
        source: GUIDE_SOURCE_ID,
        paint: {
          'line-color': '#22d3ee',
          'line-width': 1.8,
          'line-dasharray': [2, 2],
        },
      });
    }

    // 3. Vertices (Anchor points)
    if (!this.map.getSource(VERTICES_SOURCE_ID)) {
      this.map.addSource(VERTICES_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      this.verticesSource = this.map.getSource(VERTICES_SOURCE_ID) as maplibregl.GeoJSONSource;

      // Vertex Halo
      this.map.addLayer({
        id: VERTICES_GLOW_LAYER_ID,
        type: 'circle',
        source: VERTICES_SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['get', 'isFirst'], 9, 6],
          'circle-color': ['case', ['get', 'isFirst'], '#22d3ee', '#0891b2'],
          'circle-opacity': 0.45,
          'circle-blur': 0.3,
        },
      });

      // Vertex Inner Dot
      this.map.addLayer({
        id: VERTICES_CIRCLE_LAYER_ID,
        type: 'circle',
        source: VERTICES_SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['get', 'isFirst'], 5.5, 4],
          'circle-color': '#ffffff',
          'circle-stroke-color': ['case', ['get', 'isFirst'], '#0891b2', '#0e7490'],
          'circle-stroke-width': 2,
        },
      });
    }
  }

  private bindEvents() {
    this.map.on('click', this.onMapClick);
    this.map.on('dblclick', this.onMapDblClick);
    this.map.on('mousemove', this.onMapMouseMove);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public destroy() {
    this.map.off('click', this.onMapClick);
    this.map.off('dblclick', this.onMapDblClick);
    this.map.off('mousemove', this.onMapMouseMove);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private onMapClick = (e: maplibregl.MapMouseEvent) => {
    if (!store.isDrawing) return;

    const clickedPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];

    // Check if clicking near the first point to close polygon
    if (this.activePoints.length >= 3 && this.isHoveringFirstPoint) {
      this.finishPolygon();
      return;
    }

    this.activePoints.push(clickedPoint);
    this.updateRender();
  };

  private onMapDblClick = (e: maplibregl.MapMouseEvent) => {
    if (!store.isDrawing) return;
    e.preventDefault();

    if (this.activePoints.length >= 3) {
      this.finishPolygon();
    }
  };

  private onMapMouseMove = (e: maplibregl.MapMouseEvent) => {
    if (!store.isDrawing) return;

    const currentPos: [number, number] = [e.lngLat.lng, e.lngLat.lat];

    // Check if hovering near first point to show close indicator
    if (this.activePoints.length >= 3) {
      const firstPixel = this.map.project(this.activePoints[0]);
      const currentPixel = e.point;
      const dist = Math.hypot(firstPixel.x - currentPixel.x, firstPixel.y - currentPixel.y);
      this.isHoveringFirstPoint = dist < 14;
    } else {
      this.isHoveringFirstPoint = false;
    }

    // Dynamic cursor: pointer when ready to close, crosshair while placing vertices
    const canvas = this.map.getCanvas();
    if (this.isHoveringFirstPoint) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = DRAW_CURSOR;
    }

    if (this.activePoints.length > 0) {
      this.updateGuideLine(currentPos);
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (!store.isDrawing) return;

    if (e.key === 'Escape') {
      this.cancelDrawing();
    } else if (e.key === 'Backspace' && this.activePoints.length > 0) {
      this.activePoints.pop();
      this.updateRender();
    } else if (e.key === 'Enter' && this.activePoints.length >= 3) {
      this.finishPolygon();
    }
  };

  private updateGuideLine(currentPos: [number, number]) {
    if (!this.guideSource || this.activePoints.length === 0) return;

    const lastPoint = this.activePoints[this.activePoints.length - 1];
    const targetPoint = this.isHoveringFirstPoint ? this.activePoints[0] : currentPos;

    this.guideSource.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [lastPoint, targetPoint],
          },
        },
      ],
    });
  }

  private updateRender() {
    // 1. Update Vertices Source
    if (this.verticesSource) {
      const features: GeoJSON.Feature[] = this.activePoints.map((pt, idx) => ({
        type: 'Feature',
        properties: {
          index: idx,
          isFirst: idx === 0,
        },
        geometry: {
          type: 'Point',
          coordinates: pt,
        },
      }));

      this.verticesSource.setData({
        type: 'FeatureCollection',
        features,
      });
    }

    // 2. Update In-progress Line / Polygon preview
    if (this.polygonSource) {
      if (this.activePoints.length >= 3) {
        const closedCoords = [...this.activePoints, this.activePoints[0]];
        const area = calculatePolygonAreaKm2(this.activePoints);
        const isTooLarge = area > MAX_AREA_KM2;

        this.polygonSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { isTooLarge, area },
              geometry: {
                type: 'Polygon',
                coordinates: [closedCoords],
              },
            },
          ],
        });
      } else if (this.activePoints.length === 2) {
        this.polygonSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { isTooLarge: false },
              geometry: {
                type: 'LineString',
                coordinates: this.activePoints,
              },
            },
          ],
        });
      } else {
        this.polygonSource.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }
  }

  public finishPolygon() {
    if (this.activePoints.length < 3) return;

    const finalPoints = [...this.activePoints];
    store.setPolygon(finalPoints);
    store.isDrawing = false;
    this.activePoints = [];
    this.map.getCanvas().style.cursor = '';
    this.clearGuide();
    this.renderCompletedPolygon(finalPoints);
  }

  public clear() {
    this.activePoints = [];
    this.clearGuide();
    this.renderCompletedPolygon([]);
    const canvas = this.map.getCanvas();
    if (canvas) {
      canvas.style.cursor = '';
    }
  }

  public cancelDrawing() {
    this.activePoints = [];
    this.clearGuide();
    this.map.getCanvas().style.cursor = '';
    store.isDrawing = false;
    this.updateRender();
  }

  public clearGuide() {
    const guideSrc = this.getGuideSource();
    if (guideSrc) {
      guideSrc.setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }

  private getPolygonSource(): maplibregl.GeoJSONSource | null {
    if (!this.polygonSource) {
      this.polygonSource = this.map.getSource(POLYGON_SOURCE_ID) as maplibregl.GeoJSONSource;
    }
    return this.polygonSource;
  }

  private getGuideSource(): maplibregl.GeoJSONSource | null {
    if (!this.guideSource) {
      this.guideSource = this.map.getSource(GUIDE_SOURCE_ID) as maplibregl.GeoJSONSource;
    }
    return this.guideSource;
  }

  private getVerticesSource(): maplibregl.GeoJSONSource | null {
    if (!this.verticesSource) {
      this.verticesSource = this.map.getSource(VERTICES_SOURCE_ID) as maplibregl.GeoJSONSource;
    }
    return this.verticesSource;
  }

  public renderCompletedPolygon(coords: [number, number][]) {
    const polySrc = this.getPolygonSource();
    const vertSrc = this.getVerticesSource();

    if (!polySrc || !vertSrc) return;

    if (!coords || coords.length < 3) {
      polySrc.setData({ type: 'FeatureCollection', features: [] });
      vertSrc.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const closedCoords = [...coords, coords[0]];
    const area = calculatePolygonAreaKm2(coords);
    const isTooLarge = area > MAX_AREA_KM2;

    polySrc.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { isTooLarge, area },
          geometry: {
            type: 'Polygon',
            coordinates: [closedCoords],
          },
        },
      ],
    });

    const vertexFeatures: GeoJSON.Feature[] = coords.map((pt, idx) => ({
      type: 'Feature',
      properties: { index: idx, isFirst: idx === 0, isTooLarge },
      geometry: { type: 'Point', coordinates: pt },
    }));

    vertSrc.setData({
      type: 'FeatureCollection',
      features: vertexFeatures,
    });
  }

  public syncCursor(isDrawingActive: boolean) {
    const canvas = this.map.getCanvas();
    if (isDrawingActive) {
      canvas.style.cursor = DRAW_CURSOR;
      this.map.doubleClickZoom.disable();
    } else {
      canvas.style.cursor = '';
      this.map.doubleClickZoom.enable();
      this.clearGuide();
    }
  }
}
