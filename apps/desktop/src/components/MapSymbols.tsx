/**
 * SVG symbol definitions for the Atlas fantasy map.
 * Clean, readable fantasy-cartography style symbols.
 */
import type { Point } from '@atlas/kernel';

/** Seeded PRNG for deterministic placement */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/** All SVG symbol definitions to place in <defs> */
export function MapSymbolDefs() {
  return (
    <defs>
      {/* Village: small cluster of houses */}
      <symbol id="sym-village" viewBox="-12 -12 24 24">
        <circle cx="0" cy="2" r="4" fill="#8B7355" stroke="#5C4033" strokeWidth="0.8" />
        <polygon points="-4,-2 0,-6 4,-2" fill="#A0522D" stroke="#5C4033" strokeWidth="0.6" />
        <circle cx="-5" cy="4" r="2.5" fill="#8B7355" stroke="#5C4033" strokeWidth="0.6" />
        <polygon points="-7.5,1.5 -5,-1.5 -2.5,1.5" fill="#A0522D" stroke="#5C4033" strokeWidth="0.5" />
      </symbol>

      {/* Town: larger settlement */}
      <symbol id="sym-town" viewBox="-14 -14 28 28">
        <rect x="-5" y="-2" width="10" height="8" rx="1" fill="#8B7355" stroke="#5C4033" strokeWidth="0.8" />
        <polygon points="-6,-2 0,-8 6,-2" fill="#A0522D" stroke="#5C4033" strokeWidth="0.6" />
        <rect x="-8" y="2" width="6" height="5" rx="0.5" fill="#8B7355" stroke="#5C4033" strokeWidth="0.6" />
        <polygon points="-9,2 -5,-1.5 -1,2" fill="#A0522D" stroke="#5C4033" strokeWidth="0.5" />
        <rect x="4" y="1" width="5" height="5" rx="0.5" fill="#8B7355" stroke="#5C4033" strokeWidth="0.6" />
        <polygon points="3.5,1 6.5,-2 9.5,1" fill="#A0522D" stroke="#5C4033" strokeWidth="0.5" />
      </symbol>

      {/* City: walled settlement */}
      <symbol id="sym-city" viewBox="-16 -16 32 32">
        <rect x="-10" y="-6" width="20" height="14" rx="1.5" fill="none" stroke="#5C4033" strokeWidth="1.5" />
        <rect x="-6" y="-3" width="5" height="8" rx="0.5" fill="#8B7355" stroke="#5C4033" strokeWidth="0.6" />
        <polygon points="-7,-3 -3.5,-8 0,-3" fill="#A0522D" stroke="#5C4033" strokeWidth="0.5" />
        <rect x="1" y="-1" width="7" height="7" rx="0.5" fill="#8B7355" stroke="#5C4033" strokeWidth="0.6" />
        <polygon points="0,-1 4.5,-6 9,-1" fill="#A0522D" stroke="#5C4033" strokeWidth="0.5" />
        {/* Tower tops */}
        <rect x="-11" y="-8" width="3" height="4" fill="#8B7355" stroke="#5C4033" strokeWidth="0.6" />
        <polygon points="-11.5,-8 -9.5,-11 -7.5,-8" fill="#A0522D" stroke="#5C4033" strokeWidth="0.4" />
        <rect x="8" y="-8" width="3" height="4" fill="#8B7355" stroke="#5C4033" strokeWidth="0.6" />
        <polygon points="7.5,-8 9.5,-11 11.5,-8" fill="#A0522D" stroke="#5C4033" strokeWidth="0.4" />
      </symbol>

      {/* Fort */}
      <symbol id="sym-fort" viewBox="-14 -14 28 28">
        <rect x="-8" y="-4" width="16" height="10" fill="#8B8682" stroke="#5C5552" strokeWidth="1" />
        {/* Battlements */}
        <rect x="-8" y="-6" width="3" height="3" fill="#8B8682" stroke="#5C5552" strokeWidth="0.6" />
        <rect x="-3" y="-6" width="3" height="3" fill="#8B8682" stroke="#5C5552" strokeWidth="0.6" />
        <rect x="2" y="-6" width="3" height="3" fill="#8B8682" stroke="#5C5552" strokeWidth="0.6" />
        <rect x="7" y="-6" width="3" height="3" fill="#8B8682" stroke="#5C5552" strokeWidth="0.6" />
        <rect x="-2" y="-1" width="4" height="7" fill="#6B6562" stroke="#5C5552" strokeWidth="0.6" />
      </symbol>

      {/* Castle */}
      <symbol id="sym-castle" viewBox="-16 -16 32 32">
        <rect x="-10" y="-2" width="20" height="10" fill="#8B8682" stroke="#5C5552" strokeWidth="1" />
        {/* Left tower */}
        <rect x="-12" y="-8" width="5" height="14" fill="#8B8682" stroke="#5C5552" strokeWidth="0.8" />
        <polygon points="-12.5,-8 -9.5,-13 -6.5,-8" fill="#7B7672" stroke="#5C5552" strokeWidth="0.5" />
        {/* Right tower */}
        <rect x="7" y="-8" width="5" height="14" fill="#8B8682" stroke="#5C5552" strokeWidth="0.8" />
        <polygon points="6.5,-8 9.5,-13 12.5,-8" fill="#7B7672" stroke="#5C5552" strokeWidth="0.5" />
        {/* Center tower */}
        <rect x="-3" y="-6" width="6" height="10" fill="#9B9692" stroke="#5C5552" strokeWidth="0.6" />
        <polygon points="-3.5,-6 0,-11 3.5,-6" fill="#7B7672" stroke="#5C5552" strokeWidth="0.5" />
        {/* Battlements */}
        <rect x="-10" y="-4" width="2" height="2.5" fill="#8B8682" stroke="#5C5552" strokeWidth="0.4" />
        <rect x="-6" y="-4" width="2" height="2.5" fill="#8B8682" stroke="#5C5552" strokeWidth="0.4" />
        <rect x="4" y="-4" width="2" height="2.5" fill="#8B8682" stroke="#5C5552" strokeWidth="0.4" />
        <rect x="8" y="-4" width="2" height="2.5" fill="#8B8682" stroke="#5C5552" strokeWidth="0.4" />
        {/* Gate */}
        <path d="M -2,8 L -2,2 A 2,2 0 0,1 2,2 L 2,8" fill="#4A4542" stroke="#5C5552" strokeWidth="0.5" />
      </symbol>

      {/* Temple */}
      <symbol id="sym-temple" viewBox="-14 -14 28 28">
        <rect x="-8" y="0" width="16" height="7" fill="#C4A882" stroke="#8B7355" strokeWidth="0.8" />
        <polygon points="-10,0 0,-9 10,0" fill="#D4B892" stroke="#8B7355" strokeWidth="0.8" />
        {/* Columns */}
        <line x1="-6" y1="0" x2="-6" y2="7" stroke="#8B7355" strokeWidth="1.2" />
        <line x1="-2" y1="0" x2="-2" y2="7" stroke="#8B7355" strokeWidth="1.2" />
        <line x1="2" y1="0" x2="2" y2="7" stroke="#8B7355" strokeWidth="1.2" />
        <line x1="6" y1="0" x2="6" y2="7" stroke="#8B7355" strokeWidth="1.2" />
        {/* Steps */}
        <rect x="-9" y="7" width="18" height="1.5" fill="#C4A882" stroke="#8B7355" strokeWidth="0.4" />
      </symbol>

      {/* Harbour */}
      <symbol id="sym-harbour" viewBox="-14 -14 28 28">
        <path d="M -8,2 Q -8,-6 0,-6 Q 8,-6 8,2" fill="none" stroke="#4A7FB5" strokeWidth="1.5" />
        <line x1="-10" y1="2" x2="10" y2="2" stroke="#5C4033" strokeWidth="1.5" />
        {/* Anchor */}
        <circle cx="0" cy="-2" r="1.5" fill="none" stroke="#4A7FB5" strokeWidth="1" />
        <line x1="0" y1="-0.5" x2="0" y2="5" stroke="#4A7FB5" strokeWidth="1" />
        <path d="M -4,4 Q 0,7 4,4" fill="none" stroke="#4A7FB5" strokeWidth="1" />
      </symbol>

      {/* Ruins */}
      <symbol id="sym-ruins" viewBox="-14 -14 28 28">
        <line x1="-6" y1="-6" x2="-6" y2="5" stroke="#8B8682" strokeWidth="1.5" />
        <line x1="-6" y1="-6" x2="-2" y2="-6" stroke="#8B8682" strokeWidth="1.5" />
        <line x1="2" y1="-4" x2="2" y2="5" stroke="#8B8682" strokeWidth="1.5" />
        <line x1="6" y1="-7" x2="6" y2="3" stroke="#8B8682" strokeWidth="1.5" />
        <line x1="2" y1="-4" x2="6" y2="-7" stroke="#8B8682" strokeWidth="1" strokeDasharray="1 1" />
        <rect x="-8" y="5" width="16" height="1.5" fill="#8B8682" stroke="#6B6562" strokeWidth="0.4" />
      </symbol>

      {/* Monument */}
      <symbol id="sym-monument" viewBox="-12 -14 24 28">
        <polygon points="0,-12 3,6 -3,6" fill="#A0998F" stroke="#6B6562" strokeWidth="0.8" />
        <rect x="-5" y="6" width="10" height="3" rx="0.5" fill="#8B8682" stroke="#6B6562" strokeWidth="0.6" />
      </symbol>

      {/* Bridge */}
      <symbol id="sym-bridge" viewBox="-14 -10 28 20">
        <path d="M -10,2 A 10,8 0 0,1 10,2" fill="none" stroke="#8B7355" strokeWidth="2" />
        <line x1="-10" y1="2" x2="-10" y2="6" stroke="#8B7355" strokeWidth="1.5" />
        <line x1="10" y1="2" x2="10" y2="6" stroke="#8B7355" strokeWidth="1.5" />
        <line x1="0" y1="-5" x2="0" y2="2" stroke="#8B7355" strokeWidth="1" />
      </symbol>

      {/* Volcano */}
      <symbol id="sym-volcano" viewBox="-14 -14 28 28">
        <polygon points="-10,8 -3,-4 0,-2 3,-4 10,8" fill="#6B4C3B" stroke="#4A3528" strokeWidth="1" />
        <ellipse cx="0" cy="-3" rx="3.5" ry="2" fill="#D4442A" stroke="#A0331E" strokeWidth="0.6" />
        {/* Smoke puffs */}
        <circle cx="-1" cy="-8" r="2" fill="#9E9E9E" opacity="0.5" />
        <circle cx="1.5" cy="-10" r="1.8" fill="#9E9E9E" opacity="0.4" />
        <circle cx="0" cy="-12" r="1.5" fill="#9E9E9E" opacity="0.3" />
      </symbol>

      {/* Waterfall */}
      <symbol id="sym-waterfall" viewBox="-12 -14 24 28">
        <polygon points="-8,8 -4,-6 4,-6 8,8" fill="#6B6562" stroke="#4A4542" strokeWidth="0.8" />
        {/* Water streams */}
        <path d="M -1,-4 Q -2,0 -1,4 Q 0,6 -1,8" fill="none" stroke="#4A9FD4" strokeWidth="1.2" />
        <path d="M 1,-4 Q 2,0 1,4 Q 0,6 1,8" fill="none" stroke="#4A9FD4" strokeWidth="1.2" />
        {/* Splash */}
        <ellipse cx="0" cy="9" rx="4" ry="1.5" fill="#4A9FD4" opacity="0.5" />
      </symbol>

      {/* Single tree for forests */}
      <symbol id="sym-tree" viewBox="-6 -10 12 14">
        <line x1="0" y1="0" x2="0" y2="4" stroke="#5C4033" strokeWidth="1" />
        <circle cx="0" cy="-2" r="4" fill="#3A7D44" stroke="#2D5F33" strokeWidth="0.6" />
      </symbol>

      {/* Conifer tree */}
      <symbol id="sym-conifer" viewBox="-5 -12 10 16">
        <line x1="0" y1="1" x2="0" y2="4" stroke="#5C4033" strokeWidth="0.8" />
        <polygon points="-4,1 0,-4 4,1" fill="#2D5F33" stroke="#1A4023" strokeWidth="0.4" />
        <polygon points="-3,-2 0,-7 3,-2" fill="#3A7D44" stroke="#1A4023" strokeWidth="0.4" />
        <polygon points="-2,-5 0,-10 2,-5" fill="#4A9D54" stroke="#1A4023" strokeWidth="0.4" />
      </symbol>

      {/* Mountain peak */}
      <symbol id="sym-mountain" viewBox="-10 -12 20 16">
        <polygon points="-8,4 0,-10 8,4" fill="#8B7B6B" stroke="#5C4C3B" strokeWidth="0.8" />
        <polygon points="-2,-4 0,-10 2,-4 1,-5" fill="#E8E0D8" stroke="none" />
      </symbol>
    </defs>
  );
}

/** Get the symbol ID for a node kind */
export function getSymbolId(kind: string): string | null {
  const map: Record<string, string> = {
    village: 'sym-village',
    town: 'sym-town',
    city: 'sym-city',
    fort: 'sym-fort',
    castle: 'sym-castle',
    temple: 'sym-temple',
    harbour: 'sym-harbour',
    ruins: 'sym-ruins',
    monument: 'sym-monument',
    bridge: 'sym-bridge',
    volcano: 'sym-volcano',
    waterfall: 'sym-waterfall',
  };
  return map[kind] || null;
}

/** Get the display icon emoji for a node kind (for UI lists) */
export function getKindIcon(kind: string): string {
  const icons: Record<string, string> = {
    island: '🏝️',
    village: '🏘️',
    town: '🏠',
    city: '🏰',
    fort: '🏰',
    castle: '🏯',
    temple: '⛩️',
    harbour: '⚓',
    ruins: '🏛️',
    monument: '🗿',
    bridge: '🌉',
    volcano: '🌋',
    waterfall: '💧',
    forest: '🌲',
    mountain_range: '⛰️',
    river: '〰️',
    road: '━━',
    label: '🏷️',
    settlement: '🏘️',
    landmark: '⭐',
  };
  return icons[kind] || '📍';
}

/** Check if a point is inside a polygon */
function pointInPoly(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i], pj = polygon[j];
    if (!pi || !pj) continue;
    const intersect = (pi.y > point.y) !== (pj.y > point.y) &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Generate tree positions inside a polygon region.
 */
export function generateTreePositions(
  polygon: Point[],
  density: number = 0.5,
  scale: number = 1,
  seed: string = 'forest'
): { x: number; y: number; scale: number; type: 'tree' | 'conifer' }[] {
  const rng = mulberry32(hashSeed(seed));

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polygon) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const spacing = Math.max(8, 30 / (density + 0.1)) * scale;
  const trees: { x: number; y: number; scale: number; type: 'tree' | 'conifer' }[] = [];

  for (let x = minX; x <= maxX; x += spacing) {
    for (let y = minY; y <= maxY; y += spacing) {
      const jitterX = (rng() - 0.5) * spacing * 0.7;
      const jitterY = (rng() - 0.5) * spacing * 0.7;
      const px = x + jitterX;
      const py = y + jitterY;

      if (pointInPoly({ x: px, y: py }, polygon)) {
        const treeScale = scale * (0.7 + rng() * 0.6);
        const type = rng() > 0.4 ? 'conifer' as const : 'tree' as const;
        trees.push({ x: px, y: py, scale: treeScale, type });
      }
    }
  }

  return trees;
}

/**
 * Generate mountain positions along a path or inside a region polygon.
 */
export function generateMountainPositions(
  polygon: Point[],
  density: number = 0.5,
  scale: number = 1,
  seed: string = 'mountains'
): { x: number; y: number; scale: number }[] {
  const rng = mulberry32(hashSeed(seed));

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polygon) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const spacing = Math.max(15, 50 / (density + 0.1)) * scale;
  const mountains: { x: number; y: number; scale: number }[] = [];

  for (let x = minX; x <= maxX; x += spacing) {
    for (let y = minY; y <= maxY; y += spacing) {
      const jitterX = (rng() - 0.5) * spacing * 0.5;
      const jitterY = (rng() - 0.5) * spacing * 0.4;
      const px = x + jitterX;
      const py = y + jitterY;

      if (pointInPoly({ x: px, y: py }, polygon)) {
        const mScale = scale * (0.8 + rng() * 0.5);
        mountains.push({ x: px, y: py, scale: mScale });
      }
    }
  }

  return mountains;
}
