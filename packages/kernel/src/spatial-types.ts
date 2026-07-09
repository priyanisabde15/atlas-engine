/**
 * Spatial types for Atlas Lite
 * Simple geometry for visual map editing
 */

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Visual geometry types
 */
export type Geometry =
  | { type: "point"; point: Point }
  | { type: "polygon"; points: Point[] }
  | { type: "polyline"; points: Point[] }
  | { type: "circle"; center: Point; radius: number }
  | { type: "rect"; x: number; y: number; width: number; height: number };

/**
 * Spatial facet for nodes with visual representation
 */
export interface SpatialFacet {
  geometry: Geometry;
  layer: string; // Layer name
  zIndex: number; // Drawing order within layer
  visible: boolean;
  locked: boolean;
}

/**
 * Visual style properties
 */
export interface VisualStyle {
  fill?: string; // Fill color (hex)
  stroke?: string; // Stroke color (hex)
  strokeWidth?: number;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  rotation?: number; // Degrees
}

/**
 * Calculate bounds from geometry
 */
export function calculateBounds(geometry: Geometry): Bounds {
  switch (geometry.type) {
    case "point":
      return {
        minX: geometry.point.x,
        minY: geometry.point.y,
        maxX: geometry.point.x,
        maxY: geometry.point.y,
      };

    case "polygon":
    case "polyline": {
      if (geometry.points.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      }
      const firstPoint = geometry.points[0]!;
      let minX = firstPoint.x;
      let minY = firstPoint.y;
      let maxX = firstPoint.x;
      let maxY = firstPoint.y;

      for (const point of geometry.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
      return { minX, minY, maxX, maxY };
    }

    case "circle":
      return {
        minX: geometry.center.x - geometry.radius,
        minY: geometry.center.y - geometry.radius,
        maxX: geometry.center.x + geometry.radius,
        maxY: geometry.center.y + geometry.radius,
      };

    case "rect":
      return {
        minX: geometry.x,
        minY: geometry.y,
        maxX: geometry.x + geometry.width,
        maxY: geometry.y + geometry.height,
      };
  }
}

/**
 * Check if point is inside bounds
 */
export function pointInBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

/**
 * Simple point-in-polygon test
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (!pi || !pj) continue;
    
    const xi = pi.x;
    const yi = pi.y;
    const xj = pj.x;
    const yj = pj.y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Distance from point to line segment
 */
export function distanceToSegment(
  point: Point,
  start: Point,
  end: Point
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const px = point.x - start.x;
    const py = point.y - start.y;
    return Math.sqrt(px * px + py * py);
  }

  let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = start.x + t * dx;
  const closestY = start.y + t * dy;
  const distX = point.x - closestX;
  const distY = point.y - closestY;

  return Math.sqrt(distX * distX + distY * distY);
}
