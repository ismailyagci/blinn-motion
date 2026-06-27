// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import type { LayerBase } from "@fottie/core";
import { buildPathSvg, type SvgEl } from "./svg.js";

describe("@fottie/dom buildPathSvg", () => {
  it("builds an <svg> with a stroked <path> and an arrow <marker>/<defs>", () => {
    const el = document.createElement("div") as SvgEl;
    const b = {
      width: 100,
      height: 100,
      shape: {
        kind: "path",
        vw: 100,
        vh: 100,
        paths: [
          { d: "M10 10 L90 90", fill: null, stroke: "#4ADE80FF", strokeWidth: 9, cap: "round", markerEnd: "arrow" },
        ],
      },
    } as LayerBase;
    buildPathSvg(el, b);

    const svg = el.querySelector("svg");
    expect(svg).toBeTruthy();

    // _svgPaths records exactly the one drawn path (not the marker's triangle).
    expect(el._svgPaths!.length).toBe(1);
    const path = el._svgPaths![0]!;
    expect(path.getAttribute("d")).toBe("M10 10 L90 90");
    expect(path.getAttribute("fill")).toBe("none");
    expect(path.getAttribute("stroke")).toContain("rgba(");
    expect(path.getAttribute("stroke-width")).toBe("9");
    expect(path.getAttribute("stroke-linecap")).toBe("round");

    const defs = svg!.querySelector("defs");
    const marker = svg!.querySelector("marker");
    expect(defs).toBeTruthy();
    expect(marker).toBeTruthy();
    expect(marker!.getAttribute("orient")).toBe("auto");
    expect(path.getAttribute("marker-end")).toContain("url(#" + marker!.getAttribute("id"));
  });

  it("renders a filled path with no stroke and no <defs>", () => {
    const el = document.createElement("div") as SvgEl;
    buildPathSvg(el, {
      width: 50,
      height: 50,
      shape: { kind: "path", paths: [{ d: "M0 0 L10 0 L10 10 z", fill: "#FF0000FF" }] },
    } as LayerBase);

    expect(el._svgPaths!.length).toBe(1);
    const path = el._svgPaths![0]!;
    expect(path.getAttribute("fill")).toContain("rgba(255,0,0");
    expect(path.getAttribute("stroke")).toBeNull();
    expect(el.querySelector("defs")).toBeNull();
  });

  it("falls back to the layer stroke for color/width when the path omits them", () => {
    const el = document.createElement("div") as SvgEl;
    buildPathSvg(el, {
      stroke: { color: "#123456FF", weight: 5 },
      shape: { kind: "path", paths: [{ d: "M0 0 L10 10" }] },
    } as LayerBase);
    const path = el._svgPaths![0]!;
    expect(path.getAttribute("stroke")).toContain("rgba(18,52,86"); // #123456
    expect(path.getAttribute("stroke-width")).toBe("5");
  });

  it("does nothing for a non-path shape", () => {
    const el = document.createElement("div") as SvgEl;
    buildPathSvg(el, { shape: { kind: "polygon", points: 5 } } as LayerBase);
    expect(el.querySelector("svg")).toBeNull();
    expect(el._svgPaths).toBeUndefined();
  });
});
