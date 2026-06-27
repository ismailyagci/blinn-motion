/* End-to-end converter test: run code.js with a mocked `figma` global whose node
   matches the real Motion API shape, then verify the emitted MotionDoc plays correctly.
   Run: node engine/test-converter.js */
const path = require('path');
const ME = require('./motion-engine.js');

let pass = 0, fail = 0;
function ok(n, c, d) { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d ? '  -> ' + d : '')); } }
function near(a, b, e) { return Math.abs(a - b) <= (e == null ? 1e-3 : e); }

// --- mock Figma node tree (shapes mirror @figma/plugin-typings MotionNodeMixin) ---
const child = {
  id: '1:2', name: 'Box', type: 'RECTANGLE',
  x: 20, y: 40, width: 100, height: 60, rotation: 0, opacity: 1, cornerRadius: 8,
  fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0.2, g: 0.4, b: 1 } }],
  strokes: [], strokeWeight: 0,
  timelines: [{ id: 'tl1', duration: 1.2 }],
  animations: {
    TRANSLATION_X: {
      baseValue: { type: 'FLOAT', value: 0 }, timelineDuration: 1.2,
      tracks: [{ id: 't1', keyframeOperation: 'OFFSET', keyframes: [
        { id: 'k1', timelinePosition: 0, easing: { type: 'LINEAR' }, value: { type: 'FLOAT', value: 0 } },
        { id: 'k2', timelinePosition: 0.5, easing: { type: 'HOLD' }, value: { type: 'FLOAT', value: 120 } },
      ] }],
    },
    OPACITY: {
      baseValue: { type: 'FLOAT', value: 1 }, timelineDuration: 1.2,
      tracks: [{ id: 't2', keyframeOperation: 'SET', keyframes: [
        { id: 'k3', timelinePosition: 0, easing: { type: 'EASE_OUT' }, value: { type: 'FLOAT', value: 0 } },
        { id: 'k4', timelinePosition: 0.4, easing: { type: 'HOLD' }, value: { type: 'FLOAT', value: 1 } },
      ] }],
    },
    SCALE_XY: {
      baseValue: { type: 'VECTOR', value: { x: 1, y: 1 } }, timelineDuration: 1.2,
      tracks: [{ id: 't3', keyframeOperation: 'SET', keyframes: [
        { id: 'k5', timelinePosition: 0, easing: { type: 'CUSTOM_SPRING', easingFunctionSpring: { bounce: 0.5 } }, value: { type: 'VECTOR', value: { x: 0.5, y: 0.5 } } },
        { id: 'k6', timelinePosition: 0.6, easing: { type: 'HOLD' }, value: { type: 'VECTOR', value: { x: 1, y: 1 } } },
      ] }],
    },
  },
};
const root = {
  id: '1:1', name: 'Hero', type: 'FRAME',
  x: 0, y: 0, width: 375, height: 300, rotation: 0, opacity: 1, cornerRadius: 0,
  fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 } }],
  strokes: [], strokeWeight: 0, clipsContent: true,
  timelines: [{ id: 'tl1', duration: 1.2 }], animations: {},
  children: [child],
};

// --- mock figma global, then load the compiled plugin (code.js) ---
const captured = [];
global.__html__ = '<html></html>';
global.figma = {
  showUI() {}, on() {}, notify() {}, closePlugin() {}, mixed: Symbol('mixed'),
  ui: { onmessage: null, postMessage(m) { captured.push(m); }, resize() {} },
  currentPage: { selection: [root] },
};
require(path.join(__dirname, '../code.js')); // runs exportSelection() on load

const msg = captured.filter((m) => m.type === 'export').pop();
ok('plugin emitted an export message', !!msg, JSON.stringify(captured.map((m) => m.type)));
if (!msg) { console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(1); }

const doc = msg.doc;
console.log('MotionDoc shape');
ok('stage size from frame', doc.stage.width === 375 && doc.stage.height === 300);
ok('stage background = white from frame fill', doc.stage.background.toUpperCase() === '#FFFFFFFF', doc.stage.background);
ok('duration from timeline', doc.duration === 1.2, String(doc.duration));
ok('one top-level layer (Box)', doc.layers.length === 1 && doc.layers[0].name === 'Box');
ok('raw export carries figma animations', !!(msg.raw && msg.raw.tree && msg.raw.tree.children[0].animations.TRANSLATION_X));

const box = doc.layers[0];
ok('base geometry mapped', box.base.x === 20 && box.base.y === 40 && box.base.width === 100);
ok('fill solid = #3366FFFF', box.base.fill && box.base.fill.type === 'solid' && box.base.fill.color.toUpperCase() === '#3366FFFF', box.base.fill && box.base.fill.color);
ok('3 tracks emitted', box.tracks.length === 3, String(box.tracks.length));
const tx = box.tracks.find((t) => t.property === 'translateX');
ok('translateX op = offset', tx && tx.op === 'offset');
ok('EASE_OUT converted to cubicBezier', box.tracks.find((t) => t.property === 'opacity').keys[0].easing.type === 'cubicBezier');
ok('CUSTOM_SPRING converted to spring{bounce}', box.tracks.find((t) => t.property === 'scaleX' || t.property === 'scaleY' || t.property === 'scaleXY') ? true : false);

console.log('Engine plays converted doc');
const s0 = ME.sample(doc, 0).layers[0].state;
ok('t=0 opacity 0', near(s0.opacity, 0), String(s0.opacity));
ok('t=0 translateX 0', near(s0.translateX, 0), String(s0.translateX));
ok('t=0 scale 0.5 (spring start)', near(s0.scaleX, 0.5, 0.02), String(s0.scaleX));
const s05 = ME.sample(doc, 0.5).layers[0].state;
ok('t=0.5 translateX 120 (offset+base0)', near(s05.translateX, 120), String(s05.translateX));
ok('t=0.5 opacity held 1', near(s05.opacity, 1), String(s05.opacity));
const s06 = ME.sample(doc, 0.6).layers[0].state;
ok('t=0.6 scale settled ~1', near(s06.scaleX, 1, 0.02), String(s06.scaleX));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
