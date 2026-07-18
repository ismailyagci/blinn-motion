/**
 * Pixel-faithful Blinn recreation of LottieFiles "Successful" (lf20_jbrw3hcz).
 *
 * Geometry, keyframes, easings, and layer order extracted from
 * public/compare/success.lottie.json — not a loose restyle.
 *
 * Renders via SVG so we can match stroke-trim check + polystars exactly.
 * Sampling is pure (sampleFrame(t)) — same idea as Blinn's sample(doc, t).
 */

export const FR = 29.9700012207031;
export const OP_FRAMES = 47.0000019143492;
export const DURATION = OP_FRAMES / FR; // ≈ 1.56823s
export const STAGE = { width: 1920, height: 1080 };

type Vec = number[];
type Ease = { ox: number; oy: number; ix: number; iy: number } | "hold" | "linear";

type KF = { t: number; v: number | Vec; ease: Ease };

function easeBezier(ox: number, oy: number, ix: number, iy: number, x: number): number {
  // Newton-Raphson on cubic-bezier(ox, oy, ix, iy)
  const cx = 3 * ox;
  const bx = 3 * (ix - ox) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * oy;
  const by = 3 * (iy - oy) - cy;
  const ay = 1 - cy - by;
  const fx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dfx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  let t = x;
  for (let i = 0; i < 10; i++) {
    const e = fx(t) - x;
    if (Math.abs(e) < 1e-6) break;
    const d = dfx(t);
    if (Math.abs(d) < 1e-6) break;
    t -= e / d;
  }
  t = Math.min(1, Math.max(0, t));
  return ((ay * t + by) * t + cy) * t;
}

function sampleKFs(keys: KF[], tFrame: number): number | Vec {
  if (tFrame <= keys[0].t) return keys[0].v;
  const last = keys[keys.length - 1];
  if (tFrame >= last.t) return last.v;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= tFrame) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const local = (tFrame - a.t) / (b.t - a.t);
  let e = local;
  if (a.ease === "hold") e = 0;
  else if (a.ease === "linear") e = local;
  else e = easeBezier(a.ease.ox, a.ease.oy, a.ease.ix, a.ease.iy, local);

  if (typeof a.v === "number" && typeof b.v === "number") return a.v + (b.v - a.v) * e;
  const av = a.v as Vec;
  const bv = b.v as Vec;
  return av.map((v, j) => v + (bv[j] - v) * e);
}

// Lottie temporal ease used throughout this file: o(0.333,0) → i(0.667,1)
const EASE_OUT: Ease = { ox: 0.333, oy: 0, ix: 0.667, iy: 1 };
const EASE_TEXT: Ease = { ox: 0.167, oy: 0.167, ix: 0.833, iy: 0.833 };

function asNum(v: number | Vec): number {
  return typeof v === "number" ? v : v[0];
}
function asScale(v: number | Vec): number {
  return (typeof v === "number" ? v : v[0]) / 100;
}

/** Resolved frame state — pure numbers for the SVG painter. */
export type FrameState = {
  // ellipse bold
  boldO: number;
  boldS: number;
  // ellipse light
  lightO: number;
  lightS: number;
  // check trim end 0..100
  checkTrim: number;
  // stars group
  starsO: number;
  starsS: number;
  // confetti dots group
  dotsO: number;
  dotsS: number;
  // text (empty string in source — kept for fidelity)
  textO: number;
};

export function sampleFrame(tSec: number): FrameState {
  const f = Math.min(Math.max(tSec, 0), DURATION) * FR;

  const boldO = asNum(
    sampleKFs(
      [
        { t: 0, v: 0, ease: EASE_OUT },
        { t: 14, v: 81, ease: EASE_OUT },
        { t: 27.0000010997325, v: 100, ease: "hold" },
      ],
      f
    )
  );
  const boldS = asScale(
    sampleKFs(
      [
        { t: 0, v: [41.25, 41.25, 100], ease: EASE_OUT },
        { t: 14, v: [532.5, 532.5, 100], ease: EASE_OUT },
        { t: 21, v: [413.25, 413.25, 100], ease: EASE_OUT },
        { t: 27.0000010997325, v: [508.75, 508.75, 100], ease: "hold" },
      ],
      f
    )
  );

  const lightO = asNum(
    sampleKFs(
      [
        { t: 0, v: 0, ease: EASE_OUT },
        { t: 14, v: 80, ease: EASE_OUT },
        { t: 27.0000010997325, v: 0, ease: "hold" },
      ],
      f
    )
  );
  const lightS = asScale(
    sampleKFs(
      [
        { t: 0, v: [100, 100, 100], ease: EASE_OUT },
        { t: 14, v: [530, 530, 100], ease: EASE_OUT },
        { t: 21, v: [431, 431, 100], ease: EASE_OUT },
        { t: 27.0000010997325, v: [535, 535, 100], ease: "hold" },
      ],
      f
    )
  );

  const checkTrim = asNum(
    sampleKFs(
      [
        { t: 14, v: 0, ease: EASE_OUT },
        { t: 27.0000010997325, v: 100, ease: "hold" },
      ],
      f
    )
  );

  const starsO = asNum(
    sampleKFs(
      [
        { t: 9, v: 0, ease: EASE_OUT },
        { t: 21, v: 100, ease: EASE_OUT },
        { t: 33.0000013441176, v: 0, ease: "hold" },
      ],
      f
    )
  );
  const starsS = asScale(
    sampleKFs(
      [
        { t: 9, v: [89.979, 89.979, 100], ease: EASE_OUT },
        { t: 21, v: [440.397, 440.397, 100], ease: EASE_OUT },
        { t: 33.0000013441176, v: [554.944, 554.944, 100], ease: "hold" },
      ],
      f
    )
  );

  const dotsO = asNum(
    sampleKFs(
      [
        { t: 9, v: 0, ease: EASE_OUT },
        { t: 21, v: 100, ease: EASE_OUT },
        { t: 33.0000013441176, v: 0, ease: "hold" },
      ],
      f
    )
  );
  const dotsS = asScale(
    sampleKFs(
      [
        { t: 9, v: [139.752, 139.752, 100], ease: EASE_OUT },
        { t: 21, v: [535.117, 535.117, 100], ease: EASE_OUT },
        { t: 33.0000013441176, v: [785.336, 785.336, 100], ease: "hold" },
      ],
      f
    )
  );

  const textO = asNum(
    sampleKFs(
      [
        { t: 27, v: 0, ease: EASE_TEXT },
        { t: 37.0000015070409, v: 100, ease: "hold" },
      ],
      f
    )
  );

  return {
    boldO: boldO / 100,
    boldS,
    lightO: lightO / 100,
    lightS,
    checkTrim,
    starsO: starsO / 100,
    starsS,
    dotsO: dotsO / 100,
    dotsS,
    textO: textO / 100,
  };
}

/* ---------- geometry from Lottie (exact) ---------- */

// Check path (open, 3 verts), stroke white 12, round caps
const CHECK_D = "M-23,-3.5 L-7.5,12 L20.5,-16";

// 5-point stars (sy=1) at group local positions
function starPath(cx: number, cy: number, orad: number, irad: number, points = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 === 0 ? orad : irad;
    pts.push(`${(cx + r * Math.cos(ang)).toFixed(3)},${(cy + r * Math.sin(ang)).toFixed(3)}`);
  }
  return `M${pts.join(" ")}Z`;
}

const STARS = [
  { d: starPath(2.5, 81, 8.602, 4.301), fill: "rgb(255,137,3)" },
  { d: starPath(-3.5, -91.75, 5.523, 2.761), fill: "rgb(255,137,3)" },
  { d: starPath(-82, -12, 8.602, 4.301), fill: "rgb(255,137,3)" },
  { d: starPath(89.5, -14.5, 7.28, 3.64), fill: "rgb(255,137,3)" },
];

const DOTS: { cx: number; cy: number; r: number; fill: string }[] = [
  { cx: -0.25, cy: 58.75, r: 7.5 / 2, fill: "rgb(3,255,152)" },
  { cx: -4.25, cy: -61.75, r: 6.5 / 2, fill: "rgb(3,255,152)" },
  { cx: 55, cy: -14, r: 7 / 2, fill: "rgb(3,255,152)" },
  { cx: -56.5, cy: 9.5, r: 6 / 2, fill: "rgb(3,255,152)" },
  { cx: 54.25, cy: 32.75, r: 11.5 / 2, fill: "rgb(3,255,152)" },
  { cx: -50.25, cy: 41.25, r: 14.5 / 2, fill: "rgb(3,255,152)" },
  { cx: -46.75, cy: -50.25, r: 12.5 / 2, fill: "rgb(3,255,152)" },
  { cx: 45.25, cy: -60.75, r: 15.5 / 2, fill: "rgb(3,255,152)" },
];

const COL_BOLD = "rgb(0,207,51)";
const COL_LIGHT = "rgb(58,246,90)";

export interface ExactPlayer {
  play(): void;
  pause(): void;
  seek(tSec: number): void;
  readonly duration: number;
  readonly playing: boolean;
  destroy(): void;
}

/**
 * Mount the exact Blinn recreation into `container`.
 * Same stage aspect as the Lottie (1920×1080), letterboxed to fit.
 */
export function mountExact(container: HTMLElement): ExactPlayer {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${STAGE.width} ${STAGE.height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.style.display = "block";
  svg.style.background = "transparent";

  // Paint order: bottom → top (Lottie array is top-first; reverse for paint)
  // 1. dots ("circle")
  // 2. stars
  // 3. light ellipse
  // 4. bold ellipse
  // 5. check
  // 6. text (empty)

  const gDots = document.createElementNS(svgNS, "g");
  for (const d of DOTS) {
    const c = document.createElementNS(svgNS, "circle");
    c.setAttribute("cx", String(d.cx));
    c.setAttribute("cy", String(d.cy));
    c.setAttribute("r", String(d.r));
    c.setAttribute("fill", d.fill);
    gDots.appendChild(c);
  }

  const gStars = document.createElementNS(svgNS, "g");
  for (const s of STARS) {
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", s.d);
    p.setAttribute("fill", s.fill);
    gStars.appendChild(p);
  }

  // Light ellipse: base size 122.5, group offset [-60.75, -4.25], layer p [960,535.5], a [-60.75,-4.5]
  // Bold ellipse: base 80, group [-62,-4.5], layer p [960,535.5], a [-62,-4.5]
  const gLight = document.createElementNS(svgNS, "g");
  const lightCircle = document.createElementNS(svgNS, "circle");
  lightCircle.setAttribute("cx", "0");
  lightCircle.setAttribute("cy", "0");
  lightCircle.setAttribute("r", String(122.5 / 2));
  lightCircle.setAttribute("fill", COL_LIGHT);
  gLight.appendChild(lightCircle);

  const gBold = document.createElementNS(svgNS, "g");
  const boldCircle = document.createElementNS(svgNS, "circle");
  boldCircle.setAttribute("cx", "0");
  boldCircle.setAttribute("cy", "0");
  boldCircle.setAttribute("r", String(80 / 2));
  boldCircle.setAttribute("fill", COL_BOLD);
  gBold.appendChild(boldCircle);

  // Check: layer p [961.141,540], a [0,0], s 376.304%
  const gCheck = document.createElementNS(svgNS, "g");
  const checkPath = document.createElementNS(svgNS, "path");
  checkPath.setAttribute("d", CHECK_D);
  checkPath.setAttribute("fill", "none");
  checkPath.setAttribute("stroke", "rgb(255,255,255)");
  checkPath.setAttribute("stroke-width", "12");
  checkPath.setAttribute("stroke-linecap", "round");
  checkPath.setAttribute("stroke-linejoin", "round");
  checkPath.setAttribute("pathLength", "100");
  checkPath.setAttribute("stroke-dasharray", "100");
  checkPath.setAttribute("stroke-dashoffset", "100");
  gCheck.appendChild(checkPath);

  // Text layer: content is empty string in source JSON — still mount for fidelity
  const gText = document.createElementNS(svgNS, "g");
  const textEl = document.createElementNS(svgNS, "text");
  textEl.setAttribute("x", "0");
  textEl.setAttribute("y", "0");
  textEl.setAttribute("fill", "rgb(0,255,151)");
  textEl.setAttribute("font-size", "64");
  textEl.setAttribute("font-weight", "700");
  textEl.setAttribute("font-family", "SF Pro Display, SF UI Display, Inter, system-ui, sans-serif");
  textEl.textContent = ""; // exact: t:"" in Lottie
  gText.appendChild(textEl);

  svg.append(gDots, gStars, gLight, gBold, gCheck, gText);
  container.appendChild(svg);

  // Layer transform: T(p) * R * S * T(-a), then shape local offset is already in geometry for dots/stars
  // For ellipses: circle is at 0,0 in group; group is placed so anchor coincides with ellipse center.
  // Layer anchor equals shape TR p, so T(p) * S * T(-a) with circle at 0 in the T(-a) space...
  // Shape ellipse center = tr.p = a. After T(-a), ellipse center is at 0. Then scale, then T(p).
  // So we can just: translate(p) scale(s) with circle at origin. ✓

  const paint = (st: FrameState) => {
    // dots — p [960,540], a [0,0]
    gDots.setAttribute(
      "transform",
      `translate(960 540) scale(${st.dotsS})`
    );
    gDots.setAttribute("opacity", String(st.dotsO));

    // stars — p [960,540], a [0,0]
    gStars.setAttribute(
      "transform",
      `translate(960 540) scale(${st.starsS})`
    );
    gStars.setAttribute("opacity", String(st.starsO));

    // light — p [960,535.5], a [-60.75,-4.5], shape center at that anchor
    gLight.setAttribute(
      "transform",
      `translate(960 535.5) scale(${st.lightS})`
    );
    gLight.setAttribute("opacity", String(st.lightO));

    // bold
    gBold.setAttribute(
      "transform",
      `translate(960 535.5) scale(${st.boldS})`
    );
    gBold.setAttribute("opacity", String(st.boldO));

    // check — p [961.141,540], scale 376.304% constant
    gCheck.setAttribute("transform", `translate(961.141 540) scale(3.76304)`);
    // trim end: dashoffset = 100 - trim
    checkPath.setAttribute("stroke-dashoffset", String(100 - st.checkTrim));

    // text — p [664.641, 864], empty content
    gText.setAttribute("transform", `translate(664.641 864)`);
    gText.setAttribute("opacity", String(st.textO));
  };

  let t = 0;
  let playing = false;
  let raf = 0;
  let last = 0;

  const render = () => paint(sampleFrame(t));

  const tick = (now: number) => {
    if (!playing) return;
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    t += dt;
    if (t >= DURATION) t = t % DURATION;
    render();
    raf = requestAnimationFrame(tick);
  };

  render();

  return {
    get duration() {
      return DURATION;
    },
    get playing() {
      return playing;
    },
    play() {
      if (playing) return;
      playing = true;
      last = 0;
      raf = requestAnimationFrame(tick);
    },
    pause() {
      playing = false;
      cancelAnimationFrame(raf);
    },
    seek(tSec: number) {
      t = Math.min(Math.max(tSec, 0), DURATION);
      render();
    },
    destroy() {
      cancelAnimationFrame(raf);
      svg.remove();
    },
  };
}

/**
 * Compact MotionDoc-style JSON describing this exact animation
 * (used for payload comparison — ships instead of AE shape trees + glyphs).
 */
export function exactDocJSON(): object {
  return {
    format: "motion-engine",
    version: "1.0",
    meta: {
      name: "Successful (exact parity)",
      source: "lottie:lf20_jbrw3hcz",
    },
    duration: DURATION,
    fps: FR,
    stage: { width: STAGE.width, height: STAGE.height, background: "#00000000" },
    layers: [
      {
        id: "dots",
        type: "group",
        base: { x: 960, y: 540 },
        shapes: DOTS.map((d) => ({ kind: "ellipse", cx: d.cx, cy: d.cy, r: d.r, fill: d.fill })),
        tracks: {
          opacity: [
            [9 / FR, 0],
            [21 / FR, 1],
            [33.0000013441176 / FR, 0],
          ],
          scale: [
            [9 / FR, 1.39752],
            [21 / FR, 5.35117],
            [33.0000013441176 / FR, 7.85336],
          ],
        },
      },
      {
        id: "stars",
        type: "group",
        base: { x: 960, y: 540 },
        shapes: STARS.map((s) => ({ kind: "path", d: s.d, fill: s.fill })),
        tracks: {
          opacity: [
            [9 / FR, 0],
            [21 / FR, 1],
            [33.0000013441176 / FR, 0],
          ],
          scale: [
            [9 / FR, 0.89979],
            [21 / FR, 4.40397],
            [33.0000013441176 / FR, 5.54944],
          ],
        },
      },
      {
        id: "ellipse-light",
        type: "ellipse",
        base: { x: 960, y: 535.5, r: 61.25, fill: COL_LIGHT },
        tracks: {
          opacity: [
            [0, 0],
            [14 / FR, 0.8],
            [27.0000010997325 / FR, 0],
          ],
          scale: [
            [0, 1],
            [14 / FR, 5.3],
            [21 / FR, 4.31],
            [27.0000010997325 / FR, 5.35],
          ],
        },
      },
      {
        id: "ellipse-bold",
        type: "ellipse",
        base: { x: 960, y: 535.5, r: 40, fill: COL_BOLD },
        tracks: {
          opacity: [
            [0, 0],
            [14 / FR, 0.81],
            [27.0000010997325 / FR, 1],
          ],
          scale: [
            [0, 0.4125],
            [14 / FR, 5.325],
            [21 / FR, 4.1325],
            [27.0000010997325 / FR, 5.0875],
          ],
        },
      },
      {
        id: "check",
        type: "path",
        base: {
          x: 961.141,
          y: 540,
          scale: 3.76304,
          d: CHECK_D,
          stroke: "#FFFFFF",
          strokeWidth: 12,
          linecap: "round",
          linejoin: "round",
        },
        tracks: {
          trimEnd: [
            [14 / FR, 0],
            [27.0000010997325 / FR, 1],
          ],
        },
      },
    ],
    easing: "cubicBezier(0.333,0,0.667,1)",
  };
}
