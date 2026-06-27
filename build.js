/*
 * build.js — assembles the self-contained plugin assets.
 *  1) inline engine/motion-engine.js into ui.template.html  -> ui.html  (Figma UI must be self-contained)
 *  2) inline examples/sample.motion.json into engine/player.html (so it works on file:// double-click)
 * Run after `tsc` (see npm "build").
 */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, c) => fs.writeFileSync(path.join(root, p), c);

const engine = read('engine/motion-engine.js');

// 1) ui.html
const tpl = read('ui.template.html');
if (tpl.indexOf('/*__ENGINE__*/') < 0) throw new Error('ui.template.html: missing /*__ENGINE__*/ marker');
write('ui.html', tpl.replace('/*__ENGINE__*/', () => '\n' + engine + '\n'));
console.log('✓ ui.html  (engine inlined, ' + engine.length + ' bytes)');

// 2) player.html — inline sample as the default doc (idempotent: replaces the SAMPLE line each build)
const sample = read('examples/sample.motion.json').trim();
let player = read('engine/player.html');
const re = /const SAMPLE = [\s\S]*?;\n/;
if (!re.test(player)) throw new Error('engine/player.html: missing `const SAMPLE = ...;` line');
player = player.replace(re, 'const SAMPLE = ' + sample + ';\n');
write('engine/player.html', player);
console.log('✓ engine/player.html  (sample inlined)');
