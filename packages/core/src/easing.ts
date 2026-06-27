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
 * Normalized damped-spring step response (Figma `CUSTOM_SPRING` / `NormalizedSpring`).
 * `bounce` maps to the damping ratio ζ = 1 − bounce: 0 → critically damped (no
 * overshoot), → 1 → lightly damped (very wobbly). `p(0) = 0`, settles at `p(≥1) ≈ 1`,
 * and may exceed 1 (overshoot). This is a proper underdamped oscillator, not the old
 * cosine-envelope approximation, so it tracks Figma's spring feel closely.
 */
export function springFn(bounce?: number): EasingFn {
  const b = clamp(bounce == null ? 0.3 : bounce, 0, 0.99);
  const zeta = 1 - b; // damping ratio: 1 (no overshoot) .. ~0.01 (very bouncy)
  const omega = 6 + b * 12; // natural frequency: more bounce → more visible oscillations
  return (u) => {
    if (u <= 0) return 0;
    if (u >= 1.6) return 1; // fully settled
    if (zeta >= 0.999) {
      // critically damped: no oscillation
      return 1 - Math.exp(-omega * u) * (1 + omega * u);
    }
    const wd = omega * Math.sqrt(1 - zeta * zeta); // damped angular frequency
    return 1 - Math.exp(-zeta * omega * u) * (Math.cos(wd * u) + ((zeta * omega) / wd) * Math.sin(wd * u));
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
