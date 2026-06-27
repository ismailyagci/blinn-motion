/* Reproduces the real Figma case from the user's screenshots:
   a top-level RECTANGLE selected directly, TRANSLATION_XY animation, node.timelines duration 0.
   Run: node engine/test-real.js */
const path = require('path');
const ME = require('./motion-engine.js');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d ? '  -> ' + d : '')); } };
const near = (a, b, e) => Math.abs(a - b) <= (e == null ? 1e-3 : e);

const rect = {
  id: '50:6', name: 'Rectangle 6', type: 'RECTANGLE',
  x: 2752, y: -685, width: 696, height: 594, rotation: 0, opacity: 1, cornerRadius: 0,
  fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0.85, g: 0.85, b: 0.85 } }],
  strokes: [], strokeWeight: 0,
  timelines: [{ id: 'tl', duration: 0 }],           // <- the bug source: API reports 0
  animations: {
    TRANSLATION_XY: {
      baseValue: { type: 'VECTOR', value: { x: 0, y: 0 } },
      timelineDuration: 1.0,                          // <- real duration lives here
      tracks: [{
        id: 'KeyframeTrackId:50:3', keyframeOperation: 'OFFSET',
        keyframes: [
          { id: '50:4', timelinePosition: 0, easing: { type: 'LINEAR', easingFunctionCubicBezier: { x1: 0, y1: 0, x2: 1, y2: 1 } }, value: { type: 'VECTOR', value: { x: 0, y: 0 } } },
          { id: '50:5', timelinePosition: 0.5, easing: { type: 'HOLD' }, value: { type: 'VECTOR', value: { x: 300, y: 150 } } },
        ],
      }],
    },
  },
  parent: { type: 'PAGE' },
};

const captured = [];
global.__html__ = '<html></html>';
global.figma = {
  showUI() {}, on() {}, notify() {}, closePlugin() {}, mixed: Symbol('mixed'),
  ui: { onmessage: null, postMessage(m) { captured.push(m); }, resize() {} },
  currentPage: { selection: [rect] },
  viewport: { center: { x: 0, y: 0 }, scrollAndZoomIntoView() {} },
  createFrame() { return {}; }, createRectangle() { return {}; }, createEllipse() { return {}; },
};
delete require.cache[require.resolve(path.join(__dirname, '../code.js'))];
require(path.join(__dirname, '../code.js'));

const msg = captured.filter((m) => m.type === 'export').pop();
ok('export emitted', !!msg);
const doc = msg.doc;
ok('root stayed the rect (parent is PAGE)', doc.meta.figmaNodeId === '50:6');
ok('duration recovered from binding.timelineDuration (not 0)', doc.duration === 1.0, String(doc.duration));
ok('stage = rect size', doc.stage.width === 696 && doc.stage.height === 594);
ok('leaf stage background transparent', doc.stage.background === '#00000000', doc.stage.background);
ok('single layer', doc.layers.length === 1);
ok('layer anchored to origin (not off-canvas)', doc.layers[0].base.x === 0 && doc.layers[0].base.y === 0,
  doc.layers[0].base.x + ',' + doc.layers[0].base.y);
const txy = doc.layers[0].tracks.find((t) => t.property === 'translateXY');
ok('translateXY track present, op offset', txy && txy.op === 'offset');
ok('hasMotion true', msg.hasMotion === true);

const s0 = ME.sample(doc, 0).layers[0].state;
const s05 = ME.sample(doc, 0.5).layers[0].state;
ok('t=0 translateX 0', near(s0.translateX, 0), String(s0.translateX));
ok('t=0.5 translateX 300', near(s05.translateX, 300), String(s05.translateX));
ok('t=0.5 translateY 150', near(s05.translateY, 150), String(s05.translateY));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
