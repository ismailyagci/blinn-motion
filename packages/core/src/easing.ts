/**
 * Easing functions. Each `makeEasing` result maps a normalized progress
 * `u` in 0..1 to an eased fraction (which may exceed 0..1 for overshoot/back).
 */
import type { Easing } from "./types.js";
import { clamp } from "./color.js";

export type EasingFn = (u: number) => number;

/**
 * Cubic-bezier solver (Newton-Raphson, then bisection fallback) matching the
 * CSS `cubic-bezier()` timing function.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  function solve(x: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    let e: number;
    let d: number;
    for (let i = 0; i < 8; i++) {
      e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return t;
      d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      e = sx(t);
      if (Math.abs(e - x) < 1e-6) break;
      if (x > e) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  }
  return (u) => sy(solve(u));
}

/**
 * Perceptual damped spring. bounce 0 → no overshoot; 1 → very wobbly.
 * `p(0) = 0`, settles near `p(1) = 1`. May exceed 1 (overshoot).
 */
export function springFn(bounce?: number): EasingFn {
  const b = clamp(bounce == null ? 0.3 : bounce, 0, 1);
  const decay = 4 + (1 - b) * 5; // 4..9 envelope decay
  const freq = b * 6 * Math.PI; // 0..~18.8 rad → up to ~3 visible bounces
  return (u) => {
    if (u <= 0) return 0;
    if (u >= 1 && freq === 0) return 1;
    return 1 - Math.exp(-decay * u) * Math.cos(freq * u);
  };
}

const IDENTITY: EasingFn = (u) => u;
const ZERO: EasingFn = () => 0;

export function makeEasing(easing?: Easing): EasingFn {
  if (!easing || easing.type === "linear") return IDENTITY;
  if (easing.type === "hold") return ZERO;
  if (easing.type === "cubicBezier") {
    const p = easing.p || [0, 0, 1, 1];
    return cubicBezier(p[0], p[1], p[2], p[3]);
  }
  if (easing.type === "spring") return springFn(easing.bounce);
  return IDENTITY;
}
