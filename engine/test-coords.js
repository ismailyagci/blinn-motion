/* Proves the nested-coordinate fix against the REAL Frame 2 geometry (from
   ~/Downloads/Frame_2.raw.json). Figma groups are coordinate-transparent: every
   descendant's x/y is frame-relative, so absoluteTransform-difference nesting must
   reproduce the correct on-screen positions. Run: node engine/test-coords.js */
const path = require('path');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d ? '  -> ' + d : '')); } };

// absoluteTransform helper: page-absolute origin (frameRel + frame page origin 1960,0)
const FX = 1960, FY = 0;
const at = (frameRelX, frameRelY) => [[1, 0, FX + frameRelX], [0, 1, FY + frameRelY]];
function n(id, name, type, frX, frY, w, h, extra) {
  return Object.assign({
    id, name, type, x: frX, y: frY, width: w, height: h, rotation: 0, opacity: 1, cornerRadius: 0,
    absoluteTransform: type === 'FRAME' && id === '5:17' ? [[1, 0, FX], [0, 1, FY]] : at(frX, frY),
    fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0.5, g: 0.5, b: 0.5 } }], strokes: [], strokeWeight: 0,
  }, extra || {});
}

const vecTrack = (dy) => ({ TRANSLATION_XY: { baseValue: { type: 'VECTOR', value: { x: 0, y: 0 } }, timelineDuration: 27,
  tracks: [{ id: 't', keyframeOperation: 'SET', keyframes: [
    { id: 'a', timelinePosition: 0, easing: { type: 'LINEAR' }, value: { type: 'VECTOR', value: { x: 0, y: 0 } } },
    { id: 'b', timelinePosition: 1, easing: { type: 'HOLD' }, value: { type: 'VECTOR', value: { x: 0, y: dy } } },
  ] }] } });

const text = n('5:22', 'Fima Motion', 'TEXT', 765, 482, 558, 116, { characters: 'Fima Motion', fontSize: 80, fontName: { family: 'Inter', style: 'Bold' }, textAlignHorizontal: 'LEFT' });
const vector = n('5:23', 'Rectangle 2', 'VECTOR', 710, 434, 18, 202);
const mask = n('5:21', 'Mask group', 'GROUP', 765, 482, 558, 116); mask.children = [text, vector];
const rect1 = n('5:20', 'Rectangle 1', 'RECTANGLE', 814, 1104, 292, 292, { animations: { ROTATION: { baseValue: { type: 'FLOAT', value: 0 }, timelineDuration: 27, tracks: [{ id: 'r', keyframeOperation: 'OFFSET', keyframes: [{ id: 'r0', timelinePosition: 0, easing: { type: 'LINEAR' }, value: { type: 'FLOAT', value: 0 } }, { id: 'r1', timelinePosition: 1, easing: { type: 'HOLD' }, value: { type: 'FLOAT', value: 90 } }] }] } } });
const group1 = n('5:19', 'Group 1', 'GROUP', 765, 482, 558, 914, { animations: vecTrack(-200) }); group1.children = [rect1, mask];
const group2 = n('5:18', 'Group 2', 'GROUP', -784, 412, 2107, 984, { animations: vecTrack(-1693) }); group2.children = [group1];
const frame = n('5:17', 'Frame 2', 'FRAME', 0, 0, 1920, 1080, { clipsContent: true, timelines: [{ id: '5:17', duration: 27 }], animations: {}, parent: { type: 'PAGE' } });
frame.x = FX; frame.y = FY; // frame's own x is page-relative (like real Figma)
frame.children = [group2];

const captured = [];
global.__html__ = '<x>';
global.figma = {
  showUI() {}, on() {}, notify() {}, closePlugin() {}, mixed: Symbol('mixed'),
  ui: { onmessage: null, postMessage(m) { captured.push(m); }, resize() {} },
  currentPage: { selection: [frame] },
  viewport: { center: { x: 0, y: 0 }, scrollAndZoomIntoView() {} },
  createFrame: () => ({}), createRectangle: () => ({}), createEllipse: () => ({}),
  base64Encode: () => 'AAAA',
};
require(path.join(__dirname, '../code.js'));
// converter is async (rasterizes the VECTOR node) — wait a tick for the export message
setTimeout(run, 50);
function run() {
const doc = captured.filter((m) => m.type === 'export').pop().doc;

function find(layers, id) { for (const l of layers) { if (l.id === id) return l; const r = l.children && find(l.children, id); if (r) return r; } return null; }
const G2 = find(doc.layers, '5:18'), G1 = find(doc.layers, '5:19'), R1 = find(doc.layers, '5:20'), MK = find(doc.layers, '5:21'), TX = find(doc.layers, '5:22');

console.log('Nested base offsets (each relative to its parent layer):');
ok('Group2 base = (-784, 412)  [frame-relative]', G2.base.x === -784 && G2.base.y === 412, JSON.stringify(G2.base));
ok('Group1 base = (1549, 70)   [765-(-784), 482-412]', G1.base.x === 1549 && G1.base.y === 70, JSON.stringify(G1 && G1.base));
ok('Rect1 base = (49, 622)     [814-765, 1104-482]', R1.base.x === 49 && R1.base.y === 622, JSON.stringify(R1 && R1.base));
ok('Mask base = (0, 0)         [same coords as Group1]', MK.base.x === 0 && MK.base.y === 0, JSON.stringify(MK && MK.base));
ok('Text base = (0, 0)         [same coords as Mask]', TX.base.x === 0 && TX.base.y === 0, JSON.stringify(TX && TX.base));

// absolute on-screen position = sum of base offsets down the chain -> must equal frame-relative coords
const sum = (...ls) => ls.reduce((a, l) => ({ x: a.x + l.base.x, y: a.y + l.base.y }), { x: 0, y: 0 });
const rect1Abs = sum(G2, G1, R1);
ok('Rect1 absolute-in-frame = (814, 1104)', rect1Abs.x === 814 && rect1Abs.y === 1104, JSON.stringify(rect1Abs));
const textAbs = sum(G2, G1, MK, TX);
ok('Text absolute-in-frame = (765, 482)', textAbs.x === 765 && textAbs.y === 482, JSON.stringify(textAbs));

ok('Group translate animation preserved (inheritance)', G2.tracks.length === 1 && G2.tracks[0].property === 'translateXY');
ok('duration recovered (~27)', Math.round(doc.duration) === 27, String(doc.duration));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
}
