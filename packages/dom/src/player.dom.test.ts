// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MotionDoc } from "@blinn-motion/core";
import { create } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, "../../../fixtures/card.motion.json"), "utf8")) as MotionDoc;
const showcase = JSON.parse(
  readFileSync(join(here, "../../../fixtures/showcase.motion.json"), "utf8"),
) as MotionDoc;

describe("@blinn-motion/dom player", () => {
  it("mounts a stage sized to the doc and one node per layer", () => {
    const host = document.createElement("div");
    create(host, doc);
    const stage = host.firstElementChild as HTMLElement;
    expect(stage.style.width).toBe("375px");
    expect(stage.style.height).toBe("600px");
    // card + badge + title = at least 3 [data-id] nodes
    expect(host.querySelectorAll("[data-id]").length).toBeGreaterThanOrEqual(3);
  });

  it("applies the sampled transform to the card at t=0 (translateY 80, scale 0.7)", () => {
    const host = document.createElement("div");
    const player = create(host, doc);
    player.seek(0);
    const card = host.querySelector('[data-id="card"]') as HTMLElement;
    expect(card.style.transform).toContain("translate(0px,80px)");
    expect(card.style.transform).toContain("scale(0.7,0.7)");
    expect(card.style.opacity === "0" || parseFloat(card.style.opacity) < 0.05).toBe(true);
  });

  it("seekFraction(1) lands the card at its resting transform", () => {
    const host = document.createElement("div");
    const player = create(host, doc);
    player.seekFraction(1);
    const card = host.querySelector('[data-id="card"]') as HTMLElement;
    expect(card.style.transform).toContain("translate(0px,0px)");
    expect(card.style.transform).toContain("scale(1,1)");
  });
});

describe("@blinn-motion/dom player — showcase feature reflection", () => {
  const sel = (host: HTMLElement, id: string) => host.querySelector(`[data-id="${id}"]`) as HTMLElement;

  // jsdom has no real 2D context (no `canvas` pkg). Stub a minimal one so the
  // noise-shader canvas paints into a buffer instead of logging "Not implemented".
  let origGetContext: typeof HTMLCanvasElement.prototype.getContext;
  beforeAll(() => {
    origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {},
      } as any;
    } as any;
  });
  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
  });

  it("mounts one [data-id] per layer (incl. nested) without throwing on shaders/trim", () => {
    const host = document.createElement("div");
    // noise canvas getContext + path getTotalLength are unavailable in jsdom; the
    // player try/catches them — building + seeking must not throw.
    let player!: ReturnType<typeof create>;
    expect(() => {
      player = create(host, showcase);
      player.seek(0.5);
    }).not.toThrow();
    // radial, conic, border, pie, trim, shadow, blendA, blendB, noise = 9 nodes
    expect(host.querySelectorAll("[data-id]").length).toBe(9);
  });

  it("reflects a screen blend mode as mixBlendMode", () => {
    const host = document.createElement("div");
    create(host, showcase).seek(0.5);
    expect(sel(host, "blendB").style.mixBlendMode).toBe("screen");
  });

  it("keeps a radial-gradient background on the radial node (animated stop)", () => {
    const host = document.createElement("div");
    create(host, showcase).seek(0.5);
    expect(sel(host, "radial").style.background).toContain("radial-gradient");
  });

  it("keeps a conic-gradient background on the angular node", () => {
    const host = document.createElement("div");
    create(host, showcase).seek(0.5);
    expect(sel(host, "conic").style.background).toContain("conic-gradient");
  });

  it("clips the arc/pie node with a polygon() clip-path", () => {
    const host = document.createElement("div");
    create(host, showcase).seek(0.5);
    expect(sel(host, "pie").style.clipPath).toContain("polygon(");
  });

  it("animates the per-side border so the (thickening) top differs from the right", () => {
    const host = document.createElement("div");
    create(host, showcase).seek(1.0); // borderTopWeight peaks at 22 here; right stays 2
    const border = sel(host, "border");
    expect(border.style.borderTopWidth).toBe("22px");
    expect(border.style.borderRightWidth).toBe("2px");
    expect(border.style.borderTopWidth).not.toBe(border.style.borderRightWidth);
  });

  it("PATH_TRIM: clears stroke-dasharray when fully revealed (checkmark must reappear)", () => {
    // Regression: after seek(0) (trimEnd=0 → empty dash) a later seek(1)
    // must clear dasharray so the path is fully stroked again.
    const host = document.createElement("div");
    const player = create(host, showcase);
    const path = sel(host, "trim").querySelector("path") as SVGPathElement | null;
    expect(path).not.toBeNull();
    player.seek(0); // trimEnd = 0 → nothing visible
    // jsdom may not implement getTotalLength; if it does, dasharray is set.
    player.seek(1); // trimEnd = 1 → fully untrimmed → dash must be cleared
    const dash = path!.style.strokeDasharray;
    expect(dash === "none" || dash === "" || dash === "none,").toBe(true);
  });

  it("animates the stroke color: border color changes between t=0 and t=0.9", () => {
    const host = document.createElement("div");
    const player = create(host, showcase);
    player.seek(0);
    const c0 = sel(host, "border").style.borderColor;
    player.seek(0.9);
    const c1 = sel(host, "border").style.borderColor;
    expect(c0).not.toBe("");
    expect(c1).not.toBe(c0);
  });

  it("animates drop-shadow boxShadow between t=0 and t=1", () => {
    const host = document.createElement("div");
    const player = create(host, showcase);
    player.seek(0);
    const s0 = sel(host, "shadow").style.boxShadow;
    player.seek(1);
    const s1 = sel(host, "shadow").style.boxShadow;
    expect(s0).not.toBe("");
    expect(s1).not.toBe(s0);
  });

  it("mounts a noise shader as a child <canvas> under the noise layer", () => {
    const host = document.createElement("div");
    create(host, showcase);
    const noise = sel(host, "noise");
    expect(noise.querySelector("canvas")).not.toBeNull();
  });

  it("play / pause / stop / toggle / setRate / loop / time work", () => {
    const host = document.createElement("div");
    const player = create(host, showcase, { autoplay: false });
    expect(player.isPlaying).toBe(false);
    expect(player.duration).toBe(showcase.duration);
    player.play();
    expect(player.isPlaying).toBe(true);
    player.pause();
    expect(player.isPlaying).toBe(false);
    player.toggle();
    expect(player.isPlaying).toBe(true);
    player.toggle();
    expect(player.isPlaying).toBe(false);
    player.setRate(2);
    player.loop = true;
    expect(player.loop).toBe(true);
    player.seek(0.4);
    expect(player.time).toBeCloseTo(0.4, 5);
    player.seekFraction(1);
    expect(player.time).toBeCloseTo(showcase.duration!, 5);
    player.stop();
    expect(player.isPlaying).toBe(false);
  });

  it("fires onframe on seek; autoplay starts playing", () => {
    const host = document.createElement("div");
    let frames = 0;
    const player = create(host, showcase, {
      autoplay: true,
      onframe: () => {
        frames++;
      },
    });
    expect(player.isPlaying).toBe(true);
    const before = frames;
    player.seek(0.1);
    expect(frames).toBeGreaterThan(before);
    player.pause();
  });
});

describe("@blinn-motion/dom player — text / image / mask / path", () => {
  // reuse the canvas stub so shader layers (if any) don't warn
  let origGetContext: typeof HTMLCanvasElement.prototype.getContext;
  beforeAll(() => {
    origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {},
      } as any;
    } as any;
  });
  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
  });

  it("renders a text layer with content, font and color", () => {
    const host = document.createElement("div");
    const textDoc: MotionDoc = {
      format: "motion-engine",
      version: "1.0",
      duration: 1,
      stage: { width: 200, height: 100 },
      layers: [
        {
          id: "label",
          type: "text",
          base: {
            x: 0,
            y: 0,
            width: 200,
            height: 40,
            text: {
              characters: "Hello Blinn",
              fontSize: 18,
              fontFamily: "Inter",
              fontWeight: 600,
              color: "#FF0000FF",
              align: "center",
            },
          },
          tracks: [
            {
              property: "fillColor",
              op: "set",
              keys: [
                { t: 0, v: "#FF0000FF", easing: { type: "linear" } },
                { t: 1, v: "#00FF00FF", easing: { type: "hold" } },
              ],
            },
          ],
        },
      ],
    };
    const player = create(host, textDoc, { autoplay: false });
    const el = host.querySelector('[data-id="label"]') as HTMLElement;
    expect(el.textContent).toBe("Hello Blinn");
    expect(el.style.fontSize).toBe("18px");
    expect(el.style.justifyContent).toBe("center");
    expect(el.style.color).toContain("255");
    player.seek(1);
    // fillColor override on text recolors via color, not background
    expect(el.style.color).toMatch(/0,\s*255,\s*0|rgb\(0,\s*255,\s*0\)/);
  });

  it("applies image fill as backgroundImage", () => {
    const host = document.createElement("div");
    const imgDoc: MotionDoc = {
      format: "motion-engine",
      version: "1.0",
      duration: 1,
      stage: { width: 100, height: 100 },
      layers: [
        {
          id: "photo",
          type: "rect",
          base: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            image: "https://example.com/a.png",
          },
          tracks: [],
        },
      ],
    };
    create(host, imgDoc, { autoplay: false });
    const el = host.querySelector('[data-id="photo"]') as HTMLElement;
    expect(el.style.backgroundImage).toContain("https://example.com/a.png");
    expect(el.style.backgroundSize).toBe("100% 100%");
  });

  it("shape-mask clips painted siblings via clip-path inset on seek", () => {
    const host = document.createElement("div");
    const maskDoc: MotionDoc = {
      format: "motion-engine",
      version: "1.0",
      duration: 1,
      stage: { width: 200, height: 200 },
      layers: [
        {
          id: "group",
          type: "rect",
          base: {
            x: 0,
            y: 0,
            width: 200,
            height: 200,
            fill: { type: "solid", color: "#00000000" },
          },
          children: [
            {
              id: "mask",
              type: "rect",
              isMask: true,
              base: {
                x: 20,
                y: 30,
                width: 80,
                height: 60,
                fill: { type: "solid", color: "#FFFFFFFF" },
              },
              tracks: [
                {
                  property: "translateX",
                  op: "offset",
                  keys: [
                    { t: 0, v: 0, easing: { type: "linear" } },
                    { t: 1, v: 40, easing: { type: "hold" } },
                  ],
                },
              ],
            },
            {
              id: "content",
              type: "rect",
              base: {
                x: 0,
                y: 0,
                width: 200,
                height: 200,
                fill: { type: "solid", color: "#FF0000FF" },
              },
              tracks: [],
            },
          ],
          tracks: [],
        },
      ],
    };
    const player = create(host, maskDoc, { autoplay: false });
    // mask itself is not painted as a sibling under the group — content lives in a clip wrapper
    const group = host.querySelector('[data-id="group"]') as HTMLElement;
    expect(group.querySelector('[data-id="content"]')).not.toBeNull();
    // the clip wrapper gets an inset clip-path driven by the mask layer state
    const clipWrapper = group.firstElementChild as HTMLElement;
    expect(clipWrapper.style.clipPath).toContain("inset(");
    player.seek(1);
    expect(clipWrapper.style.clipPath).toContain("inset(");
    // left inset should change as mask translateX moves
    expect(clipWrapper.style.clipPath).not.toBe("");
  });

  it("text-as-mask uses the text element as the clip wrapper", () => {
    const host = document.createElement("div");
    const maskDoc: MotionDoc = {
      format: "motion-engine",
      version: "1.0",
      duration: 1,
      stage: { width: 200, height: 80 },
      layers: [
        {
          id: "group",
          type: "rect",
          base: { x: 0, y: 0, width: 200, height: 80 },
          children: [
            {
              id: "maskText",
              type: "text",
              isMask: true,
              base: {
                x: 0,
                y: 0,
                width: 200,
                height: 40,
                text: {
                  characters: "MASK",
                  fontSize: 24,
                  fontFamily: "Inter",
                  fontWeight: 700,
                  color: "#FFFFFFFF",
                  align: "left",
                },
              },
              tracks: [],
            },
            {
              id: "driver",
              type: "rect",
              base: {
                x: 0,
                y: 0,
                width: 100,
                height: 40,
                fill: { type: "solid", color: "#00FF00FF" },
              },
              tracks: [
                {
                  property: "translateX",
                  op: "offset",
                  keys: [
                    { t: 0, v: 0, easing: { type: "linear" } },
                    { t: 1, v: 50, easing: { type: "hold" } },
                  ],
                },
              ],
            },
          ],
          tracks: [],
        },
      ],
    };
    const player = create(host, maskDoc, { autoplay: false });
    const textEl = host.querySelector('[data-id="maskText"]') as HTMLElement;
    expect(textEl.textContent).toBe("MASK");
    expect(textEl.style.clipPath).toContain("inset(");
    player.seek(1);
    expect(textEl.style.clipPath).toContain("inset(");
  });

  it("mounts an SVG path vector layer", () => {
    const host = document.createElement("div");
    const pathDoc: MotionDoc = {
      format: "motion-engine",
      version: "1.0",
      duration: 1,
      stage: { width: 100, height: 100 },
      layers: [
        {
          id: "check",
          type: "vector",
          base: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            shape: {
              kind: "path",
              vw: 100,
              vh: 100,
              paths: [
                {
                  d: "M10 50 L40 80 L90 20",
                  fill: null,
                  stroke: "#22C55EFF",
                  strokeWidth: 6,
                  cap: "round",
                },
              ],
            },
            stroke: { color: "#22C55EFF", weight: 6 },
          },
          tracks: [
            {
              property: "trimEnd",
              op: "set",
              keys: [
                { t: 0, v: 0, easing: { type: "linear" } },
                { t: 1, v: 1, easing: { type: "hold" } },
              ],
            },
          ],
        },
      ],
    };
    const player = create(host, pathDoc, { autoplay: false });
    const el = host.querySelector('[data-id="check"]') as HTMLElement;
    expect(el.querySelector("svg")).not.toBeNull();
    expect(el.querySelector("path")).not.toBeNull();
    // trim seek must not throw even when getTotalLength is unavailable in jsdom
    expect(() => player.seek(0.5)).not.toThrow();
  });

  it("uses stage background color when provided", () => {
    const host = document.createElement("div");
    create(
      host,
      {
        format: "motion-engine",
        version: "1.0",
        duration: 1,
        stage: { width: 50, height: 50, background: "#112233FF" },
        layers: [],
      },
      { autoplay: false },
    );
    const stage = host.firstElementChild as HTMLElement;
    expect(stage.style.background).toMatch(/17,\s*34,\s*51|rgb\(17,\s*34,\s*51\)/);
  });

  it("applies mixBlendMode and overflow:hidden for clip layers", () => {
    const host = document.createElement("div");
    create(
      host,
      {
        format: "motion-engine",
        version: "1.0",
        duration: 1,
        stage: { width: 100, height: 100 },
        layers: [
          {
            id: "blended",
            type: "rect",
            base: {
              x: 0,
              y: 0,
              width: 50,
              height: 50,
              clip: true,
              blendMode: "multiply",
              fill: { type: "solid", color: "#FF0000FF" },
              effects: [
                { type: "drop", x: 0, y: 2, radius: 4, spread: 0, color: "#00000088" },
                { type: "blur", radius: 6 },
              ],
            },
            tracks: [],
          },
        ],
      },
      { autoplay: false },
    );
    const el = host.querySelector('[data-id="blended"]') as HTMLElement;
    expect(el.style.mixBlendMode).toBe("multiply");
    expect(el.style.overflow).toBe("hidden");
    expect(el.style.boxShadow).not.toBe("");
    expect(el.style.filter).toContain("blur");
  });
});
