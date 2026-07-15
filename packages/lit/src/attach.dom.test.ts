// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MotionDoc } from "@blinn-motion/core";
import { attachBlinnMotion, BlinnMotionElement, defineBlinnMotionElement } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, "../../../fixtures/card.motion.json"), "utf8")) as MotionDoc;
const pkg = JSON.parse(readFileSync(join(here, "../package.json"), "utf8")) as { sideEffects: boolean | string[] };

beforeAll(() => {
  (HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () =>
    new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === "canvas") return undefined;
          return (..._a: unknown[]) => {
            if (prop === "createLinearGradient" || prop === "createRadialGradient" || prop === "createConicGradient")
              return { addColorStop() {} };
            return undefined;
          };
        },
        set() {
          return true;
        },
      },
    );
  defineBlinnMotionElement();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("package registration contract", () => {
  it("declares sideEffects so custom-element registration is not tree-shaken", () => {
    // Auto-register + defineBlinnMotionElement must survive prod bundling.
    expect(pkg.sideEffects).toBe(true);
  });

  it("defineBlinnMotionElement registers blinn-motion on customElements", () => {
    expect(customElements.get("blinn-motion")).toBe(BlinnMotionElement);
  });
});

describe("attachBlinnMotion (lit package)", () => {
  it("mount → play → seek → setProgress → dispose", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const handle = attachBlinnMotion(host, { doc, autoplay: false });
    handle.seek(0.2);
    handle.setProgress(0.8);
    handle.play();
    handle.pause();
    handle.stop();
    handle.setRate(0.5);
    handle.seekFraction(1);
    expect(host.querySelector('[data-id="card"]')).not.toBeNull();
    handle.dispose();
    expect(host.innerHTML).toBe("");
  });
});

describe("<blinn-motion> custom element", () => {
  it("registers and paints MotionDoc layers into the host", async () => {
    const el = document.createElement("blinn-motion") as BlinnMotionElement;
    document.body.appendChild(el);
    el.doc = doc;
    el.renderer = "dom";
    el.autoplay = false;
    await el.updateComplete;
    await el.updateComplete;

    expect(customElements.get("blinn-motion")).toBeTruthy();
    const host = el.shadowRoot?.querySelector(".host") as HTMLElement;
    expect(host).not.toBeNull();
    // Real paint path: DomPlayer writes data-id layers
    expect(host.querySelectorAll("[data-id]").length).toBeGreaterThanOrEqual(1);
    expect(host.querySelector('[data-id="card"]')).not.toBeNull();

    el.seekFraction(1);
    el.setProgress(0.5);
    el.play();
    el.pause();
    el.stop();
    el.setRate(2);
    expect(el.player).not.toBeNull();
    expect(el.duration).toBeGreaterThan(0);

    el.renderer = "canvas";
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    expect(host.querySelector("canvas")).not.toBeNull();
    el.remove();
  });

  it("fires frame events when seeking (onFrame path)", async () => {
    const el = document.createElement("blinn-motion") as BlinnMotionElement;
    document.body.appendChild(el);
    el.doc = doc;
    el.autoplay = false;
    await el.updateComplete;
    await el.updateComplete;

    let frames = 0;
    el.addEventListener("frame", () => {
      frames++;
    });
    el.seek(0.4);
    expect(frames).toBeGreaterThan(0);
    el.remove();
  });
});
