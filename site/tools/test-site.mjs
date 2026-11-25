// Checks that the site's core.js matches the skill, and that every library icon passes.
// Run from the repo root: node site/tools/test-site.mjs
import fs from "node:fs";
import * as skill from "../../skills/pixel-icons/scripts/pixelicon.mjs";
import * as site from "../js/core.js";

const lib = JSON.parse(fs.readFileSync("site/data/icons.json", "utf8"));
let bad = 0;
for (const ic of lib) {
  for (const style of ["color", "bw"]) {
    const d = { name: ic.slug, style, ...ic[style] };
    const a = JSON.stringify(skill.check(d)), b = JSON.stringify(site.check(d));
    if (a !== b) { bad++; console.log("check differs:", ic.slug, style); }
    if (skill.svg(d) !== site.svg(d)) { bad++; console.log("svg differs:", ic.slug, style); }
    const [errs] = site.check(d);
    if (errs.length) { bad++; console.log("fails:", ic.slug, style, errs); }
  }
}
console.log(bad ? `${bad} problem(s)` : `ok: ${lib.length * 2} icons match the skill and pass`);
process.exit(bad ? 1 : 0);
