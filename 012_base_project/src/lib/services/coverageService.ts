import type { SatellitePass } from '../models/pass.model';

export interface AoiCoverageResult {
  isFullCoverage: boolean;
  coveragePercent: number;
}

/**
 * Fast Ray-Casting point-in-polygon algorithm.
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  const n = polygon.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

/**
 * Checks whether a single point [lng, lat] is covered by at least one granule of the pass.
 */
export function isPointCoveredByPass(point: [number, number], pass: SatellitePass): boolean {
  const [lng, lat] = point;

  for (const granule of pass.granules) {
    const bbox = granule.bbox;
    if (!bbox || bbox.length < 4) continue;

    // Fast bounding box rejection
    if (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3]) {
      continue;
    }

    // High precision geometry check
    const geom = granule.rawFeature?.geometry;
    if (!geom) {
      return true; // Fallback to bbox if geometry not present
    }

    if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates.length > 0) {
      const ring = geom.coordinates[0] as [number, number][];
      if (isPointInPolygon(point, ring)) {
        return true;
      }
    } else if (geom.type === 'MultiPolygon' && geom.coordinates) {
      for (const poly of geom.coordinates) {
        if (poly && poly.length > 0) {
          const ring = poly[0] as [number, number][];
          if (isPointInPolygon(point, ring)) {
            return true;
          }
        }
      }
    } else {
      return true; // Fallback to bbox match
    }
  }

  return false;
}

/**
 * Generates sample evaluation points within the AOI (Rectangle or Polygon).
 */
export function generateAoiSamplePoints(
  bbox: [number, number, number, number],
  polygon?: [number, number][] | null
): [number, number][] {
  const [minX, minY, maxX, maxY] = bbox;
  const points: [number, number][] = [];

  if (polygon && polygon.length >= 3) {
    // 1. Include all polygon boundary vertices
    for (const pt of polygon) {
      points.push(pt);
    }

    // 2. Interior centroid
    let sumX = 0;
    let sumY = 0;
    for (const [px, py] of polygon) {
      sumX += px;
      sumY += py;
    }
    const centroid: [number, number] = [sumX / polygon.length, sumY / polygon.length];
    if (isPointInPolygon(centroid, polygon)) {
      points.push(centroid);
    }

    // 3. Grid sampling inside polygon
    const steps = 6;
    const stepX = (maxX - minX) / steps;
    const stepY = (maxY - minY) / steps;

    for (let i = 1; i < steps; i++) {
      for (let j = 1; j < steps; j++) {
        const pt: [number, number] = [minX + i * stepX, minY + j * stepY];
        if (isPointInPolygon(pt, polygon)) {
          points.push(pt);
        }
      }
    }
  } else {
    // Pure bounding box: 4 corners + 4 edge midpoints + center + 5x5 grid
    const steps = 5;
    const stepX = (maxX - minX) / steps;
    const stepY = (maxY - minY) / steps;

    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        points.push([minX + i * stepX, minY + j * stepY]);
      }
    }
  }

  return points;
}

/**
 * Calculates spatial coverage of a satellite pass over the target AOI.
 */
export function calculatePassAoiCoverage(
  pass: SatellitePass,
  bbox: [number, number, number, number] | null,
  polygon?: [number, number][] | null
): AoiCoverageResult {
  if (!bbox) {
    return { isFullCoverage: true, coveragePercent: 100 };
  }

  const samplePoints = generateAoiSamplePoints(bbox, polygon);
  if (samplePoints.length === 0) {
    return { isFullCoverage: true, coveragePercent: 100 };
  }

  let coveredCount = 0;
  for (const pt of samplePoints) {
    if (isPointCoveredByPass(pt, pass)) {
      coveredCount++;
    }
  }

  const coveragePercent = Math.round((coveredCount / samplePoints.length) * 100);
  const isFullCoverage = coveredCount === samplePoints.length || coveragePercent >= 99;

  return { isFullCoverage, coveragePercent };
}
