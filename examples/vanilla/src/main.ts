import { create as createDom } from "@fottie/dom";
import { create as createCanvas } from "@fottie/canvas";
import type { MotionDoc } from "@fottie/core";
import doc from "../../../fixtures/card.motion.json";

const motionDoc = doc as MotionDoc;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// Same doc, two backends. The DOM player owns the clock + onFrame for the UI;
// the canvas player is kept in lockstep by seeking it to the same time.
const canvas = createCanvas($("canvas"), motionDoc, { autoplay: false, loop: true });

const dom = createDom($("dom"), motionDoc, {
  autoplay: true,
  loop: true,
  onframe: (t, f) => {
    canvas.seek(t); // mirror the canvas to the DOM clock
    const scrub = $<HTMLInputElement>("scrub");
    if (document.activeElement !== scrub) scrub.value = String(Math.round(f * 1000));
    $("time").textContent = `${t.toFixed(2)}s / ${dom.duration.toFixed(2)}s`;
  },
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
