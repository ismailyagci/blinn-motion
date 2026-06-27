import { create as createDom, type DomPlayer } from "@fottie/dom";
import { create as createCanvas, type CanvasPlayer } from "@fottie/canvas";
import type { MotionDoc } from "@fottie/core";
import card from "../../../fixtures/card.motion.json";
import showcase from "../../../fixtures/showcase.motion.json";

const docs: Record<string, MotionDoc> = { card: card as MotionDoc, showcase: showcase as MotionDoc };
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let dom: DomPlayer;
let canvas: CanvasPlayer;

function mount(doc: MotionDoc) {
  // Same doc, two backends. The DOM player owns the clock + onFrame for the UI;
  // the canvas player is kept in lockstep by seeking it to the same time.
  canvas = createCanvas($("canvas"), doc, { autoplay: false, loop: true });
  dom = createDom($("dom"), doc, {
    autoplay: true,
    loop: true,
    onframe: (t, f) => {
      canvas.seek(t);
      const scrub = $<HTMLInputElement>("scrub");
      if (document.activeElement !== scrub) scrub.value = String(Math.round(f * 1000));
      $("time").textContent = `${t.toFixed(2)}s / ${dom.duration.toFixed(2)}s`;
    },
  });
  $("toggle").textContent = "❚❚ Pause";
}

mount(docs.showcase!);

$<HTMLSelectElement>("doc").addEventListener("change", (e) => {
  mount(docs[(e.target as HTMLSelectElement).value]!);
});

$("toggle").addEventListener("click", () => {
  dom.toggle();
  $("toggle").textContent = dom.isPlaying ? "❚❚ Pause" : "▶ Play";
});

$("restart").addEventListener("click", () => {
  dom.seek(0);
  dom.play();
  $("toggle").textContent = "❚❚ Pause";
});

$<HTMLInputElement>("scrub").addEventListener("input", (e) => {
  const f = Number((e.target as HTMLInputElement).value) / 1000;
  dom.pause();
  dom.seekFraction(f);
  canvas.seekFraction(f);
  $("toggle").textContent = "▶ Play";
});

$<HTMLSelectElement>("speed").addEventListener("change", (e) => {
  dom.setRate(Number((e.target as HTMLSelectElement).value));
});
