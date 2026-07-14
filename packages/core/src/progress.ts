/**
 * Progress helpers — drive a MotionDoc from an external 0..1 signal
 * (scroll, gesture, scrubber, React state) without caring about duration units.
 */

/** Clamp to [0, 1]. */
export function clampProgress(p: number): number {
  if (Number.isNaN(p)) return 0;
  return Math.max(0, Math.min(1, p));
}

/** Map progress 0..1 → timeline time in seconds. */
export function progressToTime(duration: number, progress: number): number {
  const d = duration > 0 ? duration : 0;
  return clampProgress(progress) * d;
}

/** Map timeline time → progress 0..1. */
export function timeToProgress(duration: number, time: number): number {
  if (!(duration > 0)) return 0;
  return clampProgress(time / duration);
}

/**
 * Element scroll progress 0..1 — how far `el` has scrolled through its scroll range.
 * Returns 0 when not scrollable. Works in browsers; in non-DOM hosts returns 0.
 */
export function scrollProgress(el: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}): number {
  const range = el.scrollHeight - el.clientHeight;
  if (!(range > 0)) return 0;
  return clampProgress(el.scrollTop / range);
}

/**
 * Viewport intersection progress for a target element: 0 when the element’s top
 * hits the bottom of the viewport, 1 when its bottom hits the top (classic
 * scroll-linked range). Returns 0 outside a browser / without getBoundingClientRect.
 */
export function viewportProgress(
  el: { getBoundingClientRect(): { top: number; bottom: number; height: number } },
  viewHeight?: number,
): number {
  if (typeof el.getBoundingClientRect !== "function") return 0;
  const vh =
    viewHeight ??
    (typeof globalThis !== "undefined" && (globalThis as any).innerHeight
      ? (globalThis as any).innerHeight
      : 0);
  if (!(vh > 0)) return 0;
  const r = el.getBoundingClientRect();
  // start when top enters bottom of viewport; end when bottom leaves top
  const start = vh;
  const end = -r.height;
  const y = r.top;
  if (start === end) return 0;
  return clampProgress((start - y) / (start - end));
}
