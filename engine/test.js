/* Headless sanity tests for motion-engine.js (no DOM needed). Run: node engine/test.js */
const ME = require('./motion-engine.js');
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? '  -> ' + detail : '')); }
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps == null ? 1e-3 : eps); }

console.log('Easing');
const lin = ME._easing.cubicBezier(0, 0, 1, 1);
ok('linear bezier midpoint = 0.5', near(lin(0.5), 0.5));
ok('bezier endpoints', near(lin(0), 0) && near(lin(1), 1));
const eo = ME._easing.cubicBezier(0, 0, 0.58, 1);
ok('easeOut is ahead of linear at u=0.5', eo(0.5) > 0.5);
const spr0 = ME._easing.spring(0);
ok('spring(0) settles ~1 at u=1', near(spr0(1), 1, 0.05), spr0(1).toFixed(3));
ok('spring(0) starts at 0', near(spr0(0), 0));
const sprB = ME._easing.spring(0.8);
let overshot = false; for (let u = 0; u <= 1; u += 0.02) if (sprB(u) > 1.02) overshot = true;
ok('spring(0.8) overshoots past 1', overshot);

console.log('Color');
ok('parse #RRGGBBAA alpha', near(ME._color.parse('#FF000080').a, 128 / 255));
ok('lerp red->blue midpoint is purple-ish', /rgba\(12[0-9],0,12[0-9]/.test(ME._color.lerp('#FF0000FF', '#0000FFFF', 0.5)));
// regression: animated colors come back as rgba() strings and must re-parse correctly
// (not get mangled into faint green by the hex-only parser)
ok('parse rgba() string round-trips', (function () { var p = ME._color.parse('rgba(223,183,183,1)'); return p.r === 223 && p.g === 183 && p.b === 183; })());
ok('animated color round-trip (lerp -> parse) stays purple, not green',
  (function () { var p = ME._color.parse(ME._color.lerp('#FF0000FF', '#0000FFFF', 0.5)); return near(p.r, 127, 2) && p.g === 0 && near(p.b, 127, 2); })());

console.log('Track eval + op');
ok('offset op adds base', ME._evalTrack({ property: 'x', op: 'offset', base: 10, keys: [{ t: 0, v: 5, easing: { type: 'hold' } }, { t: 1, v: 5 }] }, 0) === 15);
ok('scale op multiplies base', ME._evalTrack({ property: 's', op: 'scale', base: 2, keys: [{ t: 0, v: 3, easing: { type: 'hold' } }, { t: 1, v: 3 }] }, 0) === 6);
ok('hold easing keeps from-value mid-segment',
  ME._evalTrack({ property: 'o', op: 'set', base: 0, keys: [{ t: 0, v: 0, easing: { type: 'hold' } }, { t: 1, v: 1 }] }, 0.5) === 0);
ok('linear midpoint interpolates',
  near(ME._evalTrack({ property: 'o', op: 'set', base: 0, keys: [{ t: 0, v: 0, easing: { type: 'linear' } }, { t: 1, v: 10 }] }, 0.5), 5));

console.log('Sample doc invariants (examples/sample.motion.json)');
const doc = JSON.parse(fs.readFileSync(path.join(__dirname, '../examples/sample.motion.json'), 'utf8'));
function find(tree, id) {
  for (const l of tree.layers) { const r = findL(l, id); if (r) return r; }
  return null;
}
function findL(l, id) { if (l.id === id) return l; for (const c of l.children || []) { const r = findL(c, id); if (r) return r; } return null; }

const t0 = ME.sample(doc, 0);
const card0 = find(t0, 'card').state;
ok('card opacity ~0 at t=0', near(card0.opacity, 0, 0.02), String(card0.opacity));
ok('card translateY = 80 at t=0', near(card0.translateY, 80), String(card0.translateY));
ok('card scale = 0.7 at t=0', near(card0.scaleX, 0.7), String(card0.scaleX));

const t08 = ME.sample(doc, 0.8);
const card08 = find(t08, 'card').state;
ok('card opacity held =1 by t=0.8', near(card08.opacity, 1), String(card08.opacity));
ok('card translateY ~0 by t=0.8', near(card08.translateY, 0, 0.5), String(card08.translateY));
ok('card scale ~1 by t=0.8', near(card08.scaleX, 1, 0.02), String(card08.scaleX));

const tEnd = ME.sample(doc, 1.6);
const badgeEnd = find(tEnd, 'badge').state;
ok('badge rotation = 360 at end', near(badgeEnd.rotation, 360), String(badgeEnd.rotation));

const t04 = ME.sample(doc, 0.4);
ok('title opacity held =0 before its first key (0.5)', near(find(t04, 'title').state.opacity, 0), String(find(t04, 'title').state.opacity));
const t1 = ME.sample(doc, 1.0);
ok('title opacity =1 after fade (t=1.0)', near(find(t1, 'title').state.opacity, 1), String(find(t1, 'title').state.opacity));
ok('badge fillColor animates to cyan-ish by t=1.0', /rgba\(3[0-9],2/.test(ME._color.toCss(ME._color.parse(find(t1, 'badge').state.fillColorOverride))) || find(t1, 'badge').state.fillColorOverride === '#22D3EEFF', find(t1, 'badge').state.fillColorOverride);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
