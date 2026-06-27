/* Verifies the converter emits NATIVE shape/effect data (instead of over-rasterizing):
   - POLYGON -> base.shape {kind:polygon, points} + POLYGON_COUNT -> polygonCount track
   - VECTOR arrow -> base.shape {kind:path, paths:[{d, stroke, markerEnd}]} (NOT rasterized)
   - RECTANGLE + drop shadow -> base.effects (NOT rasterized to a 1x1 PNG)
   - only true texture/shader fills still rasterize, and keep base.shape for clipping
   Run: node engine/test-shapes.js */
const path = require('path');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d ? '  -> ' + d : '')); } };

const at = (x, y) => [[1, 0, x], [0, 1, y]];
function node(o) {
  return Object.assign({
    x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, cornerRadius: 0,
    fills: [], strokes: [], strokeWeight: 0, effects: [], visible: true,
    absoluteTransform: at(o.x || 0, o.y || 0),
  }, o);
}

// A regular polygon with a shader (PATTERN) fill + a POLYGON_COUNT morph 3 -> 11.
// It also fades in (opacity 0 at rest), so a DIRECT export is degenerate (4 bytes) — the
// converter must export a motion-neutralized CLONE (300 bytes) instead, then remove it.
let cloneExported = false, cloneRemoved = false, cloneOpacity = null, cloneOffscreen = false;
const poly = node({
  id: 'P', name: 'Polygon 1', type: 'POLYGON', x: 100, y: 100, width: 255, height: 255,
  pointCount: 3, fills: [{ type: 'PATTERN', visible: true }],
  exportAsync: async () => new Uint8Array([137, 80, 78, 71]), // degenerate in-place (invisible at rest)
  clone() {
    return {
      x: 0, y: 0, opacity: 0, visible: false, rotation: 45,
      exportAsync: async function () { cloneExported = true; cloneOpacity = this.opacity; cloneOffscreen = this.x < -1000; return new Uint8Array(300).fill(7); },
      remove() { cloneRemoved = true; },
    };
  },
  animations: {
    POLYGON_COUNT: { baseValue: { type: 'FLOAT', value: 3 }, timelineDuration: 16, tracks: [{ id: 'pc', keyframeOperation: 'SET', keyframes: [
      { id: 'a', timelinePosition: 12, easing: { type: 'LINEAR' }, value: { type: 'FLOAT', value: 3 } },
      { id: 'b', timelinePosition: 13, easing: { type: 'LINEAR' }, value: { type: 'FLOAT', value: 11 } },
    ] }] },
  },
});

// A zero-height vector "arrow": stroke only, arrow cap, STROKE_WEIGHT 2 -> 36
const arrow = node({
  id: 'A', name: 'Arrow 1', type: 'VECTOR', x: 50, y: 300, width: 780, height: 0,
  vectorPaths: [{ windingRule: 'NONZERO', data: 'M 0 0 L 780 0' }],
  strokes: [{ type: 'SOLID', visible: true, color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
  strokeWeight: 2, strokeCap: 'ARROW_EQUILATERAL',
  animations: {
    STROKE_WEIGHT: { baseValue: { type: 'FLOAT', value: 2 }, timelineDuration: 16, tracks: [{ id: 'sw', keyframeOperation: 'SET', keyframes: [
      { id: 'a', timelinePosition: 5, easing: { type: 'LINEAR' }, value: { type: 'FLOAT', value: 2 } },
      { id: 'b', timelinePosition: 6, easing: { type: 'LINEAR' }, value: { type: 'FLOAT', value: 36 } },
    ] }] },
  },
});

// A solid rectangle with a drop shadow + a scale-0 entrance (the case that used to bake to 1x1)
const rect = node({
  id: 'R', name: 'Rectangle 4', type: 'RECTANGLE', x: 200, y: 200, width: 491, height: 491,
  fills: [{ type: 'SOLID', visible: true, color: { r: 0.85, g: 0.85, b: 0.85 }, opacity: 1 }],
  effects: [{ type: 'DROP_SHADOW', visible: true, color: { r: 0, g: 0, b: 0, a: 0.18 }, offset: { x: 0, y: 16 }, radius: 34, spread: 0 }],
  animations: {
    SCALE_XY: { baseValue: { type: 'VECTOR', value: { x: 1, y: 1 } }, timelineDuration: 16, tracks: [{ id: 's', keyframeOperation: 'SET', keyframes: [
      { id: 'a', timelinePosition: 14, easing: { type: 'LINEAR' }, value: { type: 'VECTOR', value: { x: 0, y: 0 } } },
      { id: 'b', timelinePosition: 14.3, easing: { type: 'LINEAR' }, value: { type: 'VECTOR', value: { x: 1, y: 1 } } },
    ] }] },
  },
});

const frame = node({
  id: 'F', name: 'Frame', type: 'FRAME', x: 0, y: 0, width: 1000, height: 1000,
  fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 } }],
  clipsContent: true, timelines: [{ id: 't', duration: 16 }], animations: {},
  parent: { type: 'PAGE' }, children: [poly, arrow, rect],
});

const captured = [];
global.__html__ = '<x>';
global.figma = {
  showUI() {}, on() {}, notify() {}, closePlugin() {}, mixed: Symbol('mixed'),
  ui: { onmessage: null, postMessage(m) { captured.push(m); }, resize() {} },
  currentPage: { selection: [frame], appendChild() {} },
  viewport: { center: { x: 0, y: 0 }, scrollAndZoomIntoView() {} },
  createFrame: () => ({}), createRectangle: () => ({}), createEllipse: () => ({}),
  base64Encode: (b) => Buffer.from(b).toString('base64'),
};
require(path.join(__dirname, '../code.js'));

setTimeout(() => {
  const msg = captured.filter((m) => m.type === 'export').pop();
  ok('export emitted', !!msg);
  const find = (id) => msg.doc.layers.find((l) => l.id === id);
  const P = find('P'), A = find('A'), R = find('R');

  // --- polygon ---
  ok('polygon: base.shape kind=polygon', P && P.base.shape && P.base.shape.kind === 'polygon', JSON.stringify(P && P.base.shape));
  ok('polygon: points = 3 (base count)', P && P.base.shape.points === 3, String(P && P.base.shape && P.base.shape.points));
  ok('polygon: POLYGON_COUNT -> polygonCount track', P && (P.tracks || []).some((t) => t.property === 'polygonCount'));
  ok('polygon: shader fill still rasterized (texture kept)', P && !!P.base.image);
  ok('polygon: keeps base.shape after raster (engine clips texture)', P && !!P.base.shape);
  ok('polygon: clean export used the CLONE (not the degenerate in-place export)', cloneExported);
  ok('polygon: clone forced visible (opacity 1) before export', cloneOpacity === 1);
  ok('polygon: clone moved off-canvas before export', cloneOffscreen);
  ok('polygon: clone removed after export (no document litter)', cloneRemoved);

  // --- arrow vector ---
  ok('arrow: NOT rasterized (no PNG)', A && !A.base.image, A && A.base.image && 'has image');
  ok('arrow: base.shape kind=path', A && A.base.shape && A.base.shape.kind === 'path', JSON.stringify(A && A.base.shape && A.base.shape.kind));
  ok('arrow: path data carried', A && A.base.shape.paths[0].d === 'M 0 0 L 780 0', A && A.base.shape.paths[0].d);
  ok('arrow: stroke color red', A && A.base.shape.paths[0].stroke && A.base.shape.paths[0].stroke.toLowerCase().indexOf('ff0000') === 1, A && A.base.shape.paths[0].stroke);
  ok('arrow: arrow cap -> markerEnd', A && A.base.shape.paths[0].markerEnd === 'arrow');
  ok('arrow: STROKE_WEIGHT track preserved (animates)', A && (A.tracks || []).some((t) => t.property === 'strokeWeight'));

  // --- rect + drop shadow ---
  ok('rect: NOT rasterized (effect is data, not a 1x1 PNG)', R && !R.base.image);
  ok('rect: base.effects has a drop shadow', R && (R.base.effects || []).some((e) => e.type === 'drop'), JSON.stringify(R && R.base.effects));
  ok('rect: solid fill kept native', R && R.base.fill && R.base.fill.type === 'solid');
  ok('rect: scale entrance track kept', R && (R.tracks || []).some((t) => t.property === 'scaleXY'));

  // --- engine renders the new data without throwing ---
  const ME = require('./motion-engine.js');
  const clip = ME._easing ? null : null; // noop guard
  ok('engine: polygonClip emits a polygon() at fractional count', /^polygon\(/.test(ME._shapes.polygonClip(5.4, 0)));
  ok('engine: effectsToCss builds a box-shadow', ME._shapes.effectsToCss([{ type: 'drop', x: 0, y: 16, radius: 34, color: '#0000002e' }]).boxShadow.indexOf('16px') >= 0);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}, 60);
