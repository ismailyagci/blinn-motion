/**
 * Inline SVG for a vector layer. Path coords are in the node's local px space
 * (== user units, no viewBox scaling) so they map 1:1 and overflow visibly —
 * important for zero-height shapes (an arrow/line whose thickness is all stroke).
 */
import type { LayerBase } from "@blinn-motion/core";
import { colorCss } from "./css.js";

const NS = "http://www.w3.org/2000/svg";
let uid = 0;

/** Element augmented with the per-path SVG nodes so applyState can animate them. */
export interface SvgEl extends HTMLElement {
  _svgPaths?: SVGPathElement[];
}

export function buildPathSvg(el: SvgEl, b: LayerBase): void {
  const shp = b.shape;
  if (!shp || shp.kind !== "path") return;
  const svg = document.createElementNS(NS, "svg");
  const vw = shp.vw != null ? shp.vw : b.width || 1;
  const vh = shp.vh != null ? shp.vh : b.height || 1;
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.width = Math.max(vw, 1) + "px";
  svg.style.height = Math.max(vh, 1) + "px";
  svg.style.overflow = "visible";
  const paths = shp.paths || [];
  el._svgPaths = [];
  let defs: SVGDefsElement | null = null;
  for (const pd of paths) {
    const p = document.createElementNS(NS, "path");
    const col = colorCss(pd.stroke || (b.stroke && b.stroke.color) || "#000000ff");
    p.setAttribute("d", pd.d || "");
    p.setAttribute("fill", pd.fill ? colorCss(pd.fill) : "none");
    if (pd.stroke || (b.stroke && b.stroke.color)) {
      p.setAttribute("stroke", col);
      p.setAttribute("stroke-width", String(pd.strokeWidth != null ? pd.strokeWidth : b.stroke ? b.stroke.weight : 1));
      p.setAttribute("stroke-linecap", pd.cap || "butt");
      p.setAttribute("stroke-linejoin", "round");
    }
    if (pd.markerEnd === "arrow" || pd.markerStart === "arrow") {
      if (!defs) {
        defs = document.createElementNS(NS, "defs");
        svg.appendChild(defs);
      }
      const mid = "mk" + uid++;
      const mk = document.createElementNS(NS, "marker");
      mk.setAttribute("id", mid);
      mk.setAttribute("viewBox", "0 0 10 10");
      mk.setAttribute("refX", "7");
      mk.setAttribute("refY", "5");
      mk.setAttribute("markerUnits", "strokeWidth");
      mk.setAttribute("markerWidth", "4");
      mk.setAttribute("markerHeight", "4");
      mk.setAttribute("orient", "auto");
      const tri = document.createElementNS(NS, "path");
      tri.setAttribute("d", "M0 0 L10 5 L0 10 z");
      tri.setAttribute("fill", col);
      mk.appendChild(tri);
      defs.appendChild(mk);
      if (pd.markerEnd === "arrow") p.setAttribute("marker-end", "url(#" + mid + ")");
      if (pd.markerStart === "arrow") p.setAttribute("marker-start", "url(#" + mid + ")");
    }
    svg.appendChild(p);
    el._svgPaths.push(p);
  }
  el.appendChild(svg);
}
