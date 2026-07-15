import { create as createDom, type DomPlayer } from "@blinn-motion/dom";
import { create as createCanvas, type CanvasPlayer } from "@blinn-motion/canvas";
import type { MotionDoc } from "@blinn-motion/core";
import card from "../../../fixtures/card.motion.json";
import showcase from "../../../fixtures/showcase.motion.json";

const docs: Record<string, { doc: MotionDoc; note: string }> = {
  card: { doc: card as MotionDoc, note: "1.6s product card spring" },
  showcase: { doc: showcase as MotionDoc, note: "gradients · trim · multi-layer" },
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let dom: DomPlayer;
let canvas: CanvasPlayer;
let mode: "clock" | "progress" = "clock";
let scrub = 0;
let progress = 0;
let docId = "showcase";
let rate = 1;

function both(fn: (p: DomPlayer | CanvasPlayer) => void) {
  fn(dom);
  fn(canvas);
}

function setSegOn(root: HTMLElement, attr: string, value: string) {
  root.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("on", b.getAttribute(attr) === value);
  });
}

function mount(id: string) {
  const entry = docs[id]!;
  docId = id;
  $("fixtureNote").textContent = entry.note;

  // dispose previous
  try {
    dom?.pause();
    canvas?.pause();
  } catch {
    /* first mount */
  }
  $("dom").innerHTML = "";
  $("canvas").innerHTML = "";

  const controlled = mode === "progress";
  canvas = createCanvas($("canvas"), entry.doc, {
    autoplay: false,
    loop: true,
    rate,
  });
  dom = createDom($("dom"), entry.doc, {
    autoplay: !controlled,
    loop: true,
    rate,
    onframe: (t, f) => {
      canvas.seek(t);
      if (mode === "clock") scrub = f;
      const scrubEl = $<HTMLInputElement>("scrub");
      if (document.activeElement !== scrubEl && mode === "clock") scrubEl.value = String(f);
      $("timeLabel").innerHTML =
        `${t.toFixed(2)}s <span style="color:var(--ink-3);font-weight:500;font-size:13px">/ ${dom.duration.toFixed(2)}s</span>`;
      $("fracLabel").textContent = `${Math.round(f * 100)}% · f=${f.toFixed(3)}`;
    },
  });

  if (controlled) {
    both((p) => p.setProgress(progress));
    $("toggle").textContent = "▶ Play";
  } else {
    $("toggle").textContent = "❚❚ Pause";
  }
  setSegOn($("docSeg"), "data-doc", id);
}

mount("showcase");

$("docSeg").addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("button[data-doc]");
  if (!btn) return;
  mount(btn.getAttribute("data-doc")!);
});

$("toggle").addEventListener("click", () => {
  if (mode === "progress") return;
  dom.toggle();
  $("toggle").textContent = dom.isPlaying ? "❚❚ Pause" : "▶ Play";
});

$("restart").addEventListener("click", () => {
  scrub = 0;
  progress = 0;
  $<HTMLInputElement>("scrub").value = "0";
  if (mode === "progress") {
    both((p) => p.setProgress(0));
    $("toggle").textContent = "▶ Play";
  } else {
    both((p) => {
      p.seek(0);
      p.play();
    });
    $("toggle").textContent = "❚❚ Pause";
  }
});

$<HTMLInputElement>("scrub").addEventListener("input", (e) => {
  const f = Number((e.target as HTMLInputElement).value);
  scrub = f;
  if (mode === "progress") {
    progress = f;
    both((p) => p.setProgress(f));
  } else {
    both((p) => {
      p.pause();
      p.seekFraction(f);
    });
    $("toggle").textContent = "▶ Play";
  }
});

$("rateSeg").addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("button[data-rate]");
  if (!btn) return;
  rate = Number(btn.getAttribute("data-rate"));
  both((p) => p.setRate(rate));
  setSegOn($("rateSeg"), "data-rate", String(rate));
});

$("modeSeg").addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("button[data-mode]");
  if (!btn) return;
  mode = btn.getAttribute("data-mode") as "clock" | "progress";
  setSegOn($("modeSeg"), "data-mode", mode);
  if (mode === "progress") {
    progress = scrub;
    both((p) => {
      p.pause();
      p.setProgress(progress);
    });
    $("toggle").textContent = "▶ Play";
    $("modeNote").innerHTML =
      "<strong>Progress-driven</strong> — <code>setProgress(0…1)</code>. Use for scroll, drag, or external state.";
  } else {
    both((p) => {
      p.seekFraction(scrub);
      p.play();
    });
    $("toggle").textContent = "❚❚ Pause";
    $("modeNote").innerHTML =
      "<strong>Clock-driven</strong> — shared ticker. Scrub pauses and seeks both stages.";
  }
  // remount so autoplay/progress options bind cleanly
  mount(docId);
  if (mode === "progress") {
    both((p) => p.setProgress(progress));
  }
});
