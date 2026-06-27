/* Verifies rasterization: vector/polygon/shader/effect nodes are exported to a PNG
   (exact appearance) and their baked fill/stroke tracks are dropped, transforms kept.
   Run: node engine/test-raster.js */
const path = require('path');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d ? '  -> ' + d : '')); } };

// a POLYGON with a non-solid (shader-ish) fill + a fillColor animation + a scale animation
const poly = {
  id: 'P', name: 'Polygon 1', type: 'POLYGON',
  x: 100, y: 100, width: 200, height: 200, rotation: 0, opacity: 1, cornerRadius: 0,
  fills: [{ type: 'PATTERN', visible: true }],        // non-solid -> needs raster
  strokes: [], strokeWeight: 0, effects: [],
  absoluteTransform: [[1, 0, 100], [0, 1, 100]],
  exportAsync: async () => new Uint8Array([1, 2, 3, 4]),
  animations: {
    SCALE_XY: { baseValue: { type: 'VECTOR', value: { x: 1, y: 1 } }, timelineDuration: 1, tracks: [{ id: 's', keyframeOperation: 'SET', keyframes: [
      { id: 's0', timelinePosition: 0, easing: { type: 'LINEAR' }, value: { type: 'VECTOR', value: { x: 1, y: 1 } } },
      { id: 's1', timelinePosition: 1, easing: { type: 'HOLD' }, value: { type: 'VECTOR', value: { x: 2, y: 2 } } },
    ] }] },
    fills: { 0: { baseValue: { type: 'COLOR', value: { r: 0, g: 0, b: 1, a: 1 } }, timelineDuration: 1, tracks: [{ id: 'f', keyframeOperation: 'SET', keyframes: [
      { id: 'f0', timelinePosition: 0, easing: { type: 'LINEAR' }, value: { type: 'COLOR', value: { r: 0, g: 0, b: 1, a: 1 } } },
      { id: 'f1', timelinePosition: 1, easing: { type: 'HOLD' }, value: { type: 'COLOR', value: { r: 1, g: 0, b: 0, a: 1 } } },
    ] }] } },
  },
};
const frame = {
  id: 'F', name: 'Frame', type: 'FRAME', x: 0, y: 0, width: 400, height: 400, rotation: 0, opacity: 1, cornerRadius: 0,
  fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 } }], strokes: [], strokeWeight: 0,
  clipsContent: true, timelines: [{ id: 't', duration: 1 }], animations: {},
  absoluteTransform: [[1, 0, 0], [0, 1, 0]], parent: { type: 'PAGE' }, children: [poly],
};

const captured = [];
global.__html__ = '<x>';
global.figma = {
  showUI() {}, on() {}, notify() {}, closePlugin() {}, mixed: Symbol('mixed'),
  ui: { onmessage: null, postMessage(m) { captured.push(m); }, resize() {} },
  currentPage: { selection: [frame] },
  viewport: { center: { x: 0, y: 0 }, scrollAndZoomIntoView() {} },
  createFrame: () => ({}), createRectangle: () => ({}), createEllipse: () => ({}),
  base64Encode: (b) => Buffer.from(b).toString('base64'),
};
require(path.join(__dirname, '../code.js'));

setTimeout(() => {
  const msg = captured.filter((m) => m.type === 'export').pop();
  ok('export emitted', !!msg);
  const layer = msg.doc.layers.find((l) => l.id === 'P');
  ok('polygon layer present', !!layer);
  ok('rasterized to a PNG data URL', !!(layer.base.image && layer.base.image.indexOf('data:image/png;base64,') === 0), layer.base.image && layer.base.image.slice(0, 30));
  ok('base fill cleared (baked into PNG)', layer.base.fill == null);
  ok('base rotation zeroed (baked)', layer.base.rotation === 0);
  ok('fillColor track dropped (appearance baked)', !layer.tracks.some((t) => t.property === 'fillColor'));
  ok('scale animation KEPT (transforms still animate)', layer.tracks.some((t) => t.property === 'scaleXY'));

  // engine renders the image as background, not a solid override
  const ME = require('./motion-engine.js');
  const s = ME.sample(msg.doc, 0.5).layers.find((l) => l.id === 'P').state;
  ok('engine scale animates at t=0.5 (~1.5)', Math.abs(s.scaleX - 1.5) < 0.01, String(s.scaleX));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}, 50);
