/**
 * Value interpolation: how a keyframe value at time `t` is computed, and how a
 * track's interpolated value combines with its base via `op`.
 */
import type { KeyframeValue, Track, TrackOp } from "./types.js";
import { lerpColor } from "./color.js";
import { makeEasing } from "./easing.js";

export type ValueKind = "num" | "vec" | "color" | "step";

export function valueKind(v: unknown): ValueKind {
  if (Array.isArray(v)) return "vec";
  if (typeof v === "number") return "num";
  if (typeof v === "string" && v.charAt(0) === "#") return "color";
  return "step";
}

/** Interpolate from→to by eased fraction `e`, dispatched on value kind. */
export function interp(from: any, to: any, e: number, kind: ValueKind): any {
  switch (kind) {
    case "num":
      return from + (to - from) * e;
    case "vec":
      if (!Array.isArray(from) || !Array.isArray(to)) return e >= 1 ? to : from;
      return from.map((c: number, i: number) => c + ((to[i] != null ? to[i] : c) - c) * e);
    case "color":
      return lerpColor(from, to, e);
    default:
      return e >= 1 ? to : from; // step / discrete
  }
}

/** Combine an interpolated value with a base value per the track op. */
export function applyOp(op: TrackOp | undefined, base: any, val: any): any {
  if (op === "offset") {
    if (Array.isArray(val)) return val.map((c, i) => (Array.isArray(base) ? base[i] : base || 0) + c);
    if (typeof val === "number") return (typeof base === "number" ? base : 0) + val;
    return val;
  }
  if (op === "scale") {
    if (Array.isArray(val)) return val.map((c, i) => (Array.isArray(base) ? base[i] : base == null ? 1 : base) * c);
    if (typeof val === "number") return (typeof base === "number" ? base : 1) * val;
    return val;
  }
  return val; // 'set'
}

/**
 * Interpolate a track's keyframes at absolute time `t` (no op applied).
 * Convention: a keyframe's easing governs the segment LEAVING it. Before the
 * first key / after the last key the value is held.
 */
export function interpKeys(track: Track, t: number): KeyframeValue | undefined {
  const ks = track.keys || [];
  if (!ks.length) return undefined;
  if (t <= ks[0]!.t) return ks[0]!.v;
  if (t >= ks[ks.length - 1]!.t) return ks[ks.length - 1]!.v;
  let i = 0;
  while (i < ks.length - 1 && t >= ks[i + 1]!.t) i++;
  const k0 = ks[i]!;
  const k1 = ks[i + 1]!;
  const dur = k1.t - k0.t;
  const u = dur > 0 ? Math.max(0, Math.min(1, (t - k0.t) / dur)) : 0;
  const e = makeEasing(k0.easing)(u);
  return interp(k0.v, k1.v, e, valueKind(k0.v));
}

/** Evaluate one isolated track: interpolate, then apply its op against its base. */
export function evalTrack(track: Track, t: number): KeyframeValue | undefined {
  const raw = interpKeys(track, t);
  if (raw === undefined) return undefined;
  return applyOp(track.op, track.base, raw);
}
