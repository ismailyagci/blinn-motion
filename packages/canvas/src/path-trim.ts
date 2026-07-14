/**
 * Pure-JS PATH_TRIM helpers: flatten common SVG path commands to a polyline and
 * extract the [trimStart, trimEnd] sub-range. Used when SVGPathElement measuring
 * is unavailable (Node tests, some hosts) so canvas stroke reveal still works.
 */

export type Pt = { x: number; y: number };

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Tokenize an SVG path `d` into command letters and numbers. */
function tokenize(d: string): Array<string | number> {
  const out: Array<string | number> = [];
  const re = /([MmLlHhVvCcQqSsTtAaZz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    if (m[1]) out.push(m[1]);
    else if (m[2]) out.push(parseFloat(m[2]));
  }
  return out;
}

function dist(a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

function cubicPoint(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

function quadPoint(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function appendCurve(out: Pt[], from: Pt, sample: (t: number) => Pt, steps: number): void {
  for (let i = 1; i <= steps; i++) out.push(sample(i / steps));
}

/**
 * Flatten an SVG path string to a dense polyline of absolute points.
 * Supports M/L/H/V/C/Q/S/T/Z (absolute + relative). Arcs (A/a) approximate as a line.
 */
export function flattenPath(d: string): Pt[] {
  const tokens = tokenize(d || "");
  const out: Pt[] = [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let lastCmd = "";
  let cpx = 0;
  let cpy = 0; // last cubic control (for S)
  let qpx = 0;
  let qpy = 0; // last quad control (for T)

  const read = (): number => {
    const v = tokens[i++];
    return typeof v === "number" ? v : 0;
  };

  while (i < tokens.length) {
    let cmd = tokens[i];
    if (typeof cmd === "string" && /[MmLlHhVvCcQqSsTtAaZz]/.test(cmd)) {
      i++;
      lastCmd = cmd;
    } else {
      // implicit repeat of previous command
      if (!lastCmd) break;
      cmd = lastCmd === "M" ? "L" : lastCmd === "m" ? "l" : lastCmd;
    }
    const c = String(cmd);

    if (c === "M" || c === "m") {
      const rel = c === "m";
      const x = read();
      const y = read();
      cx = rel ? cx + x : x;
      cy = rel ? cy + y : y;
      sx = cx;
      sy = cy;
      out.push({ x: cx, y: cy });
      lastCmd = c === "m" ? "l" : "L";
    } else if (c === "L" || c === "l") {
      const rel = c === "l";
      const x = read();
      const y = read();
      cx = rel ? cx + x : x;
      cy = rel ? cy + y : y;
      out.push({ x: cx, y: cy });
    } else if (c === "H" || c === "h") {
      const x = read();
      cx = c === "h" ? cx + x : x;
      out.push({ x: cx, y: cy });
    } else if (c === "V" || c === "v") {
      const y = read();
      cy = c === "v" ? cy + y : y;
      out.push({ x: cx, y: cy });
    } else if (c === "C" || c === "c") {
      const rel = c === "c";
      const x1 = read();
      const y1 = read();
      const x2 = read();
      const y2 = read();
      const x = read();
      const y = read();
      const p0 = { x: cx, y: cy };
      const p1 = { x: rel ? cx + x1 : x1, y: rel ? cy + y1 : y1 };
      const p2 = { x: rel ? cx + x2 : x2, y: rel ? cy + y2 : y2 };
      const p3 = { x: rel ? cx + x : x, y: rel ? cy + y : y };
      appendCurve(out, p0, (t) => cubicPoint(p0, p1, p2, p3, t), 12);
      cpx = p2.x;
      cpy = p2.y;
      cx = p3.x;
      cy = p3.y;
    } else if (c === "S" || c === "s") {
      const rel = c === "s";
      const x2 = read();
      const y2 = read();
      const x = read();
      const y = read();
      const p0 = { x: cx, y: cy };
      // reflect previous cubic control
      const p1 =
        lastCmd === "C" || lastCmd === "c" || lastCmd === "S" || lastCmd === "s"
          ? { x: 2 * cx - cpx, y: 2 * cy - cpy }
          : { x: cx, y: cy };
      const p2 = { x: rel ? cx + x2 : x2, y: rel ? cy + y2 : y2 };
      const p3 = { x: rel ? cx + x : x, y: rel ? cy + y : y };
      appendCurve(out, p0, (t) => cubicPoint(p0, p1, p2, p3, t), 12);
      cpx = p2.x;
      cpy = p2.y;
      cx = p3.x;
      cy = p3.y;
    } else if (c === "Q" || c === "q") {
      const rel = c === "q";
      const x1 = read();
      const y1 = read();
      const x = read();
      const y = read();
      const p0 = { x: cx, y: cy };
      const p1 = { x: rel ? cx + x1 : x1, y: rel ? cy + y1 : y1 };
      const p2 = { x: rel ? cx + x : x, y: rel ? cy + y : y };
      appendCurve(out, p0, (t) => quadPoint(p0, p1, p2, t), 10);
      qpx = p1.x;
      qpy = p1.y;
      cx = p2.x;
      cy = p2.y;
    } else if (c === "T" || c === "t") {
      const rel = c === "t";
      const x = read();
      const y = read();
      const p0 = { x: cx, y: cy };
      const p1 =
        lastCmd === "Q" || lastCmd === "q" || lastCmd === "T" || lastCmd === "t"
          ? { x: 2 * cx - qpx, y: 2 * cy - qpy }
          : { x: cx, y: cy };
      const p2 = { x: rel ? cx + x : x, y: rel ? cy + y : y };
      appendCurve(out, p0, (t) => quadPoint(p0, p1, p2, t), 10);
      qpx = p1.x;
      qpy = p1.y;
      cx = p2.x;
      cy = p2.y;
    } else if (c === "A" || c === "a") {
      // Arc → straight line to endpoint (good enough for trim approx).
      const rel = c === "a";
      read();
      read();
      read();
      read();
      read(); // rx ry x-axis-rotation large-arc sweep
      const x = read();
      const y = read();
      cx = rel ? cx + x : x;
      cy = rel ? cy + y : y;
      out.push({ x: cx, y: cy });
    } else if (c === "Z" || c === "z") {
      if (out.length && (cx !== sx || cy !== sy)) out.push({ x: sx, y: sy });
      cx = sx;
      cy = sy;
    } else {
      // unknown — stop to avoid infinite loop
      break;
    }
  }
  return out;
}

/** Total polyline length. */
export function polylineLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1]!, pts[i]!);
  return len;
}

/**
 * Extract the sub-polyline covering fraction range [a, b] of the total length.
 * Returns [] if empty / invalid.
 */
export function slicePolyline(pts: Pt[], a: number, b: number): Pt[] {
  if (pts.length < 2) return [];
  const A = clamp01(a);
  const B = clamp01(b);
  if (B <= A) return [];
  const total = polylineLength(pts);
  if (!(total > 0)) return [];
  const start = A * total;
  const end = B * total;

  const out: Pt[] = [];
  let acc = 0;
  let started = false;

  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1]!;
    const p1 = pts[i]!;
    const seg = dist(p0, p1);
    if (seg <= 0) continue;
    const segStart = acc;
    const segEnd = acc + seg;

    if (segEnd < start) {
      acc = segEnd;
      continue;
    }
    if (segStart > end) break;

    const t0 = Math.max(0, (start - segStart) / seg);
    const t1 = Math.min(1, (end - segStart) / seg);
    const a0 = { x: p0.x + (p1.x - p0.x) * t0, y: p0.y + (p1.y - p0.y) * t0 };
    const a1 = { x: p0.x + (p1.x - p0.x) * t1, y: p0.y + (p1.y - p0.y) * t1 };
    if (!started) {
      out.push(a0);
      started = true;
    }
    out.push(a1);
    acc = segEnd;
  }
  return out;
}

/** Build a Path2D from a polyline, or null if Path2D is unavailable. */
export function polylineToPath2D(pts: Pt[]): Path2D | null {
  if (typeof Path2D === "undefined" || pts.length === 0) return null;
  try {
    const p = new Path2D();
    pts.forEach((pt, i) => {
      if (i === 0) p.moveTo(pt.x, pt.y);
      else p.lineTo(pt.x, pt.y);
    });
    return p;
  } catch {
    return null;
  }
}

/**
 * PATH_TRIM for canvas: return a Path2D covering only [trimStart, trimEnd] of `d`.
 * Pure-JS flatten — no DOM / SVG required.
 */
export function trimmedPath2D(d: string, trimStart: number, trimEnd: number): Path2D | null {
  const pts = flattenPath(d);
  if (pts.length < 2) return null;
  const slice = slicePolyline(pts, trimStart, trimEnd);
  if (!slice.length) {
    // empty visible range
    if (typeof Path2D === "undefined") return null;
    try {
      return new Path2D();
    } catch {
      return null;
    }
  }
  return polylineToPath2D(slice);
}
