/* Verifies multiple tracks on ONE property compose in order (set -> offset -> scale),
   instead of last-wins. Run: node engine/test-compose.js */
const ME = require('./motion-engine.js');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d ? '  -> ' + d : '')); } };
const near = (a, b, e) => Math.abs(a - b) <= (e == null ? 1e-3 : e);

const hold = { type: 'hold' };
const lin = { type: 'linear' };

const doc = {
  format: 'motion-engine', version: '1.0', duration: 1, fps: 60,
  stage: { width: 100, height: 100, background: '#00000000' },
  layers: [{
    id: 'a', name: 'a', type: 'rect',
    base: { x: 0, y: 0, width: 50, height: 50, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1, anchor: { x: .5, y: .5 }, cornerRadius: [0, 0, 0, 0] },
    tracks: [
      // translateX: SET to 100, then OFFSET by +50 over time  -> composed 100, then 150
      { property: 'translateX', op: 'set', base: 0, keys: [{ t: 0, v: 100, easing: hold }, { t: 1, v: 100, easing: hold }] },
      { property: 'translateX', op: 'offset', base: 0, keys: [{ t: 0, v: 0, easing: lin }, { t: 1, v: 50, easing: hold }] },
      // scaleX: base 2 via SET, then SCALE by 1.5 -> 3
      { property: 'scaleX', op: 'set', base: 1, keys: [{ t: 0, v: 2, easing: hold }, { t: 1, v: 2, easing: hold }] },
      { property: 'scaleX', op: 'scale', base: 1, keys: [{ t: 0, v: 1.5, easing: hold }, { t: 1, v: 1.5, easing: hold }] },
    ],
  }],
};

const s0 = ME.sample(doc, 0).layers[0].state;
const s1 = ME.sample(doc, 1).layers[0].state;

ok('t=0 translateX = 100 (set, offset adds 0)', near(s0.translateX, 100), String(s0.translateX));
ok('t=1 translateX = 150 (set 100 + offset 50) — NOT last-wins 50', near(s1.translateX, 150), String(s1.translateX));
ok('scaleX = 3 (set 2 * scale 1.5) — NOT last-wins 1.5', near(s1.scaleX, 3), String(s1.scaleX));

// single-track behavior must be unchanged
const single = {
  format: 'motion-engine', version: '1.0', duration: 1, fps: 60, stage: { width: 10, height: 10 },
  layers: [{ id: 'b', name: 'b', type: 'rect', base: { x: 0, y: 0, width: 10, height: 10, cornerRadius: [0, 0, 0, 0] },
    tracks: [{ property: 'translateY', op: 'offset', base: 0, keys: [{ t: 0, v: 0, easing: lin }, { t: 1, v: 20, easing: hold }] }] }],
};
ok('single offset track still = 10 at t=0.5', near(ME.sample(single, 0.5).layers[0].state.translateY, 10), String(ME.sample(single, 0.5).layers[0].state.translateY));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
