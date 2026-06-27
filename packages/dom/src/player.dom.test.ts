// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MotionDoc } from "@fottie/core";
import { create } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, "../../../fixtures/card.motion.json"), "utf8")) as MotionDoc;

describe("@fottie/dom player", () => {
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
