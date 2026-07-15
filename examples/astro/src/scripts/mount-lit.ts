import { defineBlinnMotionElement } from "@blinn-motion/lit";
import type { MotionDoc } from "@blinn-motion/core";
import card from "../../../../fixtures/card.motion.json";
import showcase from "../../../../fixtures/showcase.motion.json";

defineBlinnMotionElement();

type FixtureId = "card" | "showcase";
const fixtures: Record<FixtureId, MotionDoc> = {
  card: card as MotionDoc,
  showcase: showcase as MotionDoc,
};

export function mountLitIsland(root: HTMLElement) {
  let docId: FixtureId = "card";
  let mode: "clock" | "progress" = "clock";
  let progress = 0;
  let rate = 1;
  let playing = true;
  let scrub = 0;
  let timeLabel = "0.00s";
  let fracLabel = "0%";

  root.innerHTML = `
    <div class="panel">
      <p class="panel-label">@blinn-motion/lit island</p>
      <div class="stages">
        <div>
          <p class="panel-label">dom</p>
          <div class="stage-host"><blinn-motion id="lit-dom"></blinn-motion></div>
        </div>
        <div>
          <p class="panel-label">canvas</p>
          <div class="stage-host"><blinn-motion id="lit-canvas"></blinn-motion></div>
        </div>
      </div>
      <div class="controls">
        <label class="field">MotionDoc
          <select id="lit-doc">
            <option value="card">Card intro</option>
            <option value="showcase">Showcase</option>
          </select>
        </label>
        <button class="btn" type="button" id="lit-toggle">❚❚ Pause</button>
        <button class="btn ghost" type="button" id="lit-restart">↺ Restart</button>
        <label class="field">Rate
          <select id="lit-rate">
            <option value="0.5">0.5×</option>
            <option value="1" selected>1×</option>
            <option value="2">2×</option>
          </select>
        </label>
        <span class="meter" id="lit-meter">0.00s · 0%</span>
      </div>
      <div class="mode-row">
        <button class="btn active" type="button" id="lit-clock">Clock-driven</button>
        <button class="btn ghost" type="button" id="lit-progress">Progress-driven</button>
        <div class="progress-block">
          <label class="field" style="flex:1">Scrub / progress
            <input type="range" id="lit-scrub" min="0" max="1" step="0.001" value="0" />
          </label>
        </div>
      </div>
      <div class="cases" style="margin-top:12px">
        <div class="case"><strong>Doc switch</strong> card + showcase</div>
        <div class="case"><strong>Dual stages</strong> DOM + Canvas</div>
        <div class="case"><strong>Transport</strong> play / pause / restart</div>
        <div class="case"><strong>Progress mode</strong> controlled 0…1</div>
      </div>
    </div>
  `;

  const dom = root.querySelector("#lit-dom") as BlinnMotionElement;
  const canvas = root.querySelector("#lit-canvas") as BlinnMotionElement;
  const stages = [dom, canvas];

  const sync = () => {
    const doc = fixtures[docId];
    for (const el of stages) {
      el.doc = doc;
      el.loop = true;
      el.rate = rate;
      el.autoplay = mode === "clock";
      el.progress = mode === "progress" ? progress : (undefined as unknown as number);
      if (mode !== "progress") {
        // clear controlled progress by remount path: set undefined
        (el as { progress?: number }).progress = undefined;
      }
    }
    // re-apply after property clear
    for (const el of stages) {
      el.doc = fixtures[docId];
      el.renderer = el.id === "lit-canvas" ? "canvas" : "dom";
      el.loop = true;
      el.rate = rate;
      el.autoplay = mode === "clock";
      if (mode === "progress") el.progress = progress;
    }
  };

  dom.renderer = "dom";
  canvas.renderer = "canvas";
  sync();

  dom.addEventListener("frame", ((e: CustomEvent<{ time: number; fraction: number }>) => {
    timeLabel = `${e.detail.time.toFixed(2)}s`;
    fracLabel = `${Math.round(e.detail.fraction * 100)}%`;
    if (mode === "clock") scrub = e.detail.fraction;
    (root.querySelector("#lit-meter") as HTMLElement).textContent = `${timeLabel} · ${fracLabel}`;
    if (mode === "clock") (root.querySelector("#lit-scrub") as HTMLInputElement).value = String(scrub);
  }) as EventListener);

  root.querySelector("#lit-doc")!.addEventListener("change", (e) => {
    docId = (e.target as HTMLSelectElement).value as FixtureId;
    sync();
  });
  root.querySelector("#lit-toggle")!.addEventListener("click", () => {
    stages.forEach((el) => el.toggle());
    playing = !playing;
    (root.querySelector("#lit-toggle") as HTMLButtonElement).textContent = playing ? "❚❚ Pause" : "▶ Play";
  });
  root.querySelector("#lit-restart")!.addEventListener("click", () => {
    stages.forEach((el) => {
      el.seek(0);
      if (mode === "clock") el.play();
    });
    playing = mode === "clock";
    (root.querySelector("#lit-toggle") as HTMLButtonElement).textContent = playing ? "❚❚ Pause" : "▶ Play";
  });
  root.querySelector("#lit-rate")!.addEventListener("change", (e) => {
    rate = Number((e.target as HTMLSelectElement).value);
    stages.forEach((el) => el.setRate(rate));
  });
  root.querySelector("#lit-clock")!.addEventListener("click", () => {
    mode = "clock";
    stages.forEach((el) => {
      el.seekFraction(scrub);
      el.play();
    });
    playing = true;
    sync();
    (root.querySelector("#lit-clock") as HTMLElement).className = "btn active";
    (root.querySelector("#lit-progress") as HTMLElement).className = "btn ghost";
    (root.querySelector("#lit-toggle") as HTMLButtonElement).textContent = "❚❚ Pause";
  });
  root.querySelector("#lit-progress")!.addEventListener("click", () => {
    mode = "progress";
    stages.forEach((el) => el.pause());
    playing = false;
    progress = scrub;
    sync();
    (root.querySelector("#lit-progress") as HTMLElement).className = "btn active";
    (root.querySelector("#lit-clock") as HTMLElement).className = "btn ghost";
    (root.querySelector("#lit-toggle") as HTMLButtonElement).textContent = "▶ Play";
  });
  root.querySelector("#lit-scrub")!.addEventListener("input", (e) => {
    const v = Number((e.target as HTMLInputElement).value);
    scrub = v;
    if (mode === "progress") {
      progress = v;
      stages.forEach((el) => el.setProgress(v));
    } else {
      stages.forEach((el) => {
        el.pause();
        el.seekFraction(v);
      });
      playing = false;
      (root.querySelector("#lit-toggle") as HTMLButtonElement).textContent = "▶ Play";
    }
  });
}
