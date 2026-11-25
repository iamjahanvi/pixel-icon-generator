// Renders site/tools/og.html to site/og.png (1200x630). Needs a local server on the site folder:
//   cd site && python3 -m http.server 8765   then   node site/tools/render-og.cjs
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto("http://localhost:8765/tools/og.html", { waitUntil: "networkidle" });
  await p.waitForSelector("body[data-ready]");
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
  console.log("site/og.png written");
})();
