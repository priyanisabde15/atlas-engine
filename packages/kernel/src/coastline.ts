/**
 * Procedural coastline generation for Atlas Lite.
 * Transforms rough polygon boundary points into natural-looking coastlines.
 */

import type { Point } from './spatial-types.js';

/** Seeded PRNG (mulberry32) for deterministic results */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a seed string to a number */
function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

/**
 * Subdivide a line segment with midpoint displacement.
 */
function subdivideSegment(
  p1: Point,
  p2: Point,
  depth: number,
  roughness: number,
  rng: () => number
): Point[] {
  if (depth <= 0) return [p1];

  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return [p1];

  const displacement = (rng() - 0.5) * len * roughness;
  const nx = -dy / len;
  const ny = dx / len;

  const mid: Point = {
    x: midX + nx * displacement,
    y: midY + ny * displacement,
  };

  const left = subdivideSegment(p1, mid, depth - 1, roughness * 0.65, rng);
  const right = subdivideSegment(mid, p2, depth - 1, roughness * 0.65, rng);

  return [...left, ...right];
}

/**
 * Catmull-Rom spline interpolation for smoothing (closed polygon).
 */
function catmullRomSpline(points: Point[], segments: number): Point[] {
  if (points.length < 3) return points;

  const result: Point[] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p0: Point = points[(i - 1 + n) % n]!;
    const p1: Point = points[i]!;
    const p2: Point = points[(i + 1) % n]!;
    const p3: Point = points[(i + 2) % n]!;

    for (let t = 0; t < segments; t++) {
      const f = t / segments;
      const f2 = f * f;
      const f3 = f2 * f;

      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * f +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * f2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * f3);

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * f +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * f2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * f3);

      result.push({ x, y });
    }
  }

  return result;
}

export interface CoastlineParams {
  roughness: number;
  smoothness: number;
  seed: string;
}

export const DEFAULT_COASTLINE_PARAMS: CoastlineParams = {
  roughness: 0.4,
  smoothness: 4,
  seed: 'atlas-default',
};

/**
 * Edge intersection check.
 */
function segmentsIntersect(
  a1: Point, a2: Point, b1: Point, b2: Point
): boolean {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;

  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / cross;
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / cross;

  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}

function isSelfIntersecting(points: Point[]): boolean {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a1 = points[i]!;
    const a2 = points[(i + 1) % n]!;
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const b1 = points[j]!;
      const b2 = points[(j + 1) % n]!;
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

/**
 * Ensure polygon has consistent winding order (counterclockwise).
 */
function ensureCCW(points: Point[]): Point[] {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const pi = points[i]!;
    const pj = points[j]!;
    area += pi.x * pj.y;
    area -= pj.x * pi.y;
  }
  if (area > 0) return [...points].reverse();
  return points;
}

/**
 * Repair a self-intersecting polygon by computing its convex hull.
 */
function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0)
      lower.pop();
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0)
      upper.pop();
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Generate a natural coastline from rough boundary points.
 */
export function generateCoastline(
  roughPoints: Point[],
  params: Partial<CoastlineParams> = {}
): Point[] {
  const { roughness, smoothness, seed } = { ...DEFAULT_COASTLINE_PARAMS, ...params };

  if (roughPoints.length < 3) return roughPoints;

  let points = ensureCCW(roughPoints);
  if (isSelfIntersecting(points)) {
    points = convexHull(points);
  }

  const rng = mulberry32(hashSeed(seed));
  const depth = Math.max(2, Math.min(4, Math.round(roughness * 6 + 1)));

  let subdivided: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % points.length]!;
    const segPoints = subdivideSegment(p1, p2, depth, roughness, rng);
    subdivided.push(...segPoints);
  }

  if (smoothness > 0 && subdivided.length >= 3) {
    subdivided = catmullRomSpline(subdivided, Math.max(1, Math.round(smoothness)));
  }

  return subdivided;
}

/**
 * Generate a random seed string.
 */
export function randomSeed(): string {
  return Math.random().toString(36).substring(2, 10);
}
