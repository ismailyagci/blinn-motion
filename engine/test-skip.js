/* Regression: a node whose `animations` getter THROWS (Figma Beta "Unsupported base value
   type") must not fail the whole export — that node is skipped, others still animate.
   Run: node engine/test-skip.js */
const path = require('path');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d ? '  -> ' + d : '')); } };

function good(id) {
  return {
    id, name: 'Good ' + id, type: 'RECTANGLE',
    x: 10, y: 10, width: 80, height: 80, rotation: 0, opacity: 1, cornerRadius: 0,
    fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0.2, g: 0.5, b: 1 } }], strokes: [], strokeWeight: 0,
    animations: {
      OPACITY: { baseValue: { type: 'FLOAT', value: 1 }, timelineDuration: 1.0,
        tracks: [{ id: 't', keyframeOperation: 'SET', keyframes: [
          { id: 'a', timelinePosition: 0, easing: { type: 'LINEAR' }, value: { type: 'FLOAT', value: 0 } },
          { id: 'b', timelinePosition: 0.5, easing: { type: 'HOLD' }, value: { type: 'FLOAT', value: 1 } },
        ] }] },
    },
  };
}
// a node whose `animations` getter throws, mimicking Figma's Beta serializer error
const bad = {
  id: 'BAD', name: 'Bad', type: 'RECTANGLE',
  x: 200, y: 10, width: 80, height: 80, rotation: 0, opacity: 1, cornerRadius: 0,
  fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 0.3, b: 0.3 } }], strokes: [], strokeWeight: 0,
};
Object.defineProperty(bad, 'animations', { get() { throw new Error('in get_animations: Unsupported base value type: 0'); } });

const frame = {
  id: 'F', name: 'Frame 1', type: 'FRAME',
  x: 0, y: 0, width: 400, height: 200, rotation: 0, opacity: 1, cornerRadius: 0,
  fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0.1, g: 0.1, b: 0.1 } }], strokes: [], strokeWeight: 0,
  clipsContent: true, timelines: [{ id: 'tl', duration: 1.0 }], animations: {},
  children: [good('G1'), bad, good('G2')], parent: { type: 'PAGE' },
};

const captured = [];
global.__html__ = '<x>';
global.figma = {
  showUI() {}, on() {}, notify() {}, closePlugin() {}, mixed: Symbol('mixed'),
  ui: { onmessage: null, postMessage(m) { captured.push(m); }, resize() {} },
  currentPage: { selection: [frame] },
  viewport: { center: { x: 0, y: 0 }, scrollAndZoomIntoView() {} },
  createFrame: () => ({}), createRectangle: () => ({}), createEllipse: () => ({}),
};
require(path.join(__dirname, '../code.js'));

const msg = captured.filter((m) => m.type === 'export').pop();
const err = captured.filter((m) => m.type === 'error').pop();
ok('export emitted (did NOT throw a hard error)', !!msg && !err, err ? err.message : '');
if (msg) {
  const byName = {};
  msg.doc.layers.forEach((l) => { byName[l.name] = l; });
  ok('all 3 children present as layers', msg.doc.layers.length === 3);
  ok('good layer G1 has its opacity track', byName['Good G1'] && byName['Good G1'].tracks.length === 1);
  ok('good layer G2 has its opacity track', byName['Good G2'] && byName['Good G2'].tracks.length === 1);
  ok('bad layer present but with 0 tracks (skipped, renders static)', byName['Bad'] && byName['Bad'].tracks.length === 0);
  ok('duration still recovered (1.0)', msg.doc.duration === 1.0, String(msg.doc.duration));
  ok('soft notice reports 1 skipped layer', /1 layer skipped/.test(msg.notice || ''), JSON.stringify(msg.notice));
  ok('hasMotion still true', msg.hasMotion === true);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
