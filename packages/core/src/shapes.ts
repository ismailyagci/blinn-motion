/**
 * Backend-agnostic shape geometry. Vertices are returned in a unit square
 * (0..1, with the shape inscribed in it) so any backend can scale them to the
 * node box — DOM turns them into `clip-path: polygon(... %)`, canvas multiplies
 * by width/height, etc.
 *
 * A fractional polygon count (POLYGON_COUNT mid-morph, e.g. 3 → 11) traces a
 * continuously deforming outline instead of snapping, by sampling the perimeter.
 */
import type { Vec2 } from "./types.js";

/** Vertex of a regular n-gon, in unit-square coords (0..1). `rot` in degrees. */
function ngonVertex(k: number, n: number, rot: number): Vec2 {
  const ang = ((-90 + rot + (k % n) * 360 / n) * Math.PI) / 180;
  return [0.5 + 0.5 * Math.cos(ang), 0.5 + 0.5 * Math.sin(ang)];
}

/** Regular polygon (or sampled morph for fractional `n`) as unit-square vertices. */
export function polygonVertices(n: number, rot = 0, samples = 72): Vec2[] {
  if (!(n >= 3)) n = 3;
  const isInt = Math.abs(n - Math.round(n)) < 1e-4;
  const pts: Vec2[] = [];
  if (isInt) {
    const ni = Math.round(n);
    for (let i = 0; i < ni; i++) pts.push(ngonVertex(i, ni, rot));
  } else {
    for (let i = 0; i <= samples; i++) {
      const vk = (i / samples) * n;
      const k0 = Math.floor(vk);
      const f = vk - k0;
      const a = ngonVertex(k0, n, rot);
      const b = ngonVertex(k0 + 1, n, rot);
      pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
  }
  return pts;
}

/** N-point star as unit-square vertices. Outer radius 0.5, inner = 0.5 * ratio. */
export function starVertices(n: number, ratio = 0.4, rot = 0): Vec2[] {
  if (!(n >= 3)) n = 3;
  n = Math.round(n);
  const ir = 0.5 * ratio;
  const pts: Vec2[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? 0.5 : ir;
    const ang = ((-90 + rot + (i * 180) / n) * Math.PI) / 180;
    pts.push([0.5 + r * Math.cos(ang), 0.5 + r * Math.sin(ang)]);
  }
  return pts;
}

/**
 * Ellipse arc / pie / donut sector as unit-square vertices. Angles in degrees
 * (0 = 3 o'clock, clockwise). `innerRadius` 0 = pie wedge, >0 = donut sector
 * (fraction of the outer radius).
 */
export function arcVertices(startAngle = 0, endAngle = 360, innerRadius = 0, samples = 64): Vec2[] {
  const a0 = (startAngle * Math.PI) / 180;
  const a1 = (endAngle * Math.PI) / 180;
  const span = a1 - a0;
  const n = Math.max(2, Math.round((Math.abs(span) / (Math.PI * 2)) * samples));
  const outer = 0.5;
  const inner = 0.5 * Math.max(0, Math.min(1, innerRadius));
  const pt = (ang: number, r: number): Vec2 => [0.5 + r * Math.cos(ang), 0.5 + r * Math.sin(ang)];
  const pts: Vec2[] = [];
  for (let i = 0; i <= n; i++) pts.push(pt(a0 + (span * i) / n, outer));
  if (inner > 0) {
    for (let i = n; i >= 0; i--) pts.push(pt(a0 + (span * i) / n, inner));
  } else {
    pts.push([0.5, 0.5]); // pie wedge closes through the center
  }
  return pts;
}

/** CSS `clip-path: polygon(...)` from unit-square vertices. */
export function verticesToClipPath(v: Vec2[]): string {
  return "polygon(" + v.map((p) => (p[0] * 100).toFixed(2) + "% " + (p[1] * 100).toFixed(2) + "%").join(", ") + ")";
}
