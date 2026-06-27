/*
 * build.js — assembles the self-contained Figma plugin UI.
 *
 * The Figma UI must be a single HTML file with no module loading / CDN
 * (manifest networkAccess: none). So we inline the self-contained
 * @fottie/dom browser bundle (which bundles @fottie/core and exposes the
 * global `Fottie`) into ui.template.html at the ENGINE marker → ui.html.
 *
 * Run after `tsc` (see npm "build"). Requires @fottie/dom to be built first
 * (npm run build --workspace @fottie/dom) so dist/fottie.global.js exists.
 */
const fs = require("fs");
const path = require("path");
const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const write = (p, c) => fs.writeFileSync(path.join(root, p), c);

const enginePath = path.join(root, "../dom/dist/fottie.global.js");
if (!fs.existsSync(enginePath)) {
  throw new Error(
    "Missing ../dom/dist/fottie.global.js — build the DOM adapter first: " +
      "`npm run build --workspace @fottie/dom`",
  );
}
const engine = fs.readFileSync(enginePath, "utf8");

const tpl = read("ui.template.html");
if (tpl.indexOf("/*__ENGINE__*/") < 0) throw new Error("ui.template.html: missing /*__ENGINE__*/ marker");
write("ui.html", tpl.replace("/*__ENGINE__*/", () => "\n" + engine + "\n"));
console.log("✓ ui.html  (@fottie/dom global inlined, " + engine.length + " bytes)");
