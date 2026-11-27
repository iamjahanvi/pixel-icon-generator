// Regenerates the search/AI files from the icon library, so they never drift from it:
//   site/llms.txt     what Pixbits is, how to use it, and every icon with its keywords (for AI assistants)
//   site/sitemap.xml  the one page
//   site/robots.txt   crawl everything except the admin page
//   site/index.html   the JSON-LD block between the <!-- seo:jsonld --> markers
// Run: node site/tools/build-seo.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL = "https://pixbits.iamjahanvi.com/";
const lib = JSON.parse(readFileSync(join(SITE, "data/icons.json"), "utf8"));
const cats = [...new Set(lib.map((i) => i.category))];
const today = new Date().toISOString().slice(0, 10);

// ---- llms.txt ----
const llms = `# Pixbits

> ${lib.length} free, open-source 16×16 pixel icons by Jahanvi Singh (MIT licence), and an agent skill that draws new icons in the same style for any word, in Claude, Cursor, Codex and other AI tools.

The style comes from Pixtober, Jahanvi's daily pixel-icon series: a closed 1px black outline, flat colours, no stray pixels, one clear idea per icon. Every icon is a 16×16 grid exported as a crisp SVG (one rect per pixel) or PNG.

## Use it
- Website: ${URL}
- Download every icon: ${URL}downloads/pixel-icons-library.zip
- Claude Code: \`/plugin marketplace add iamjahanvi/pixel-icon-generator\` then \`/plugin install pixel-icons@pixel-icon-generator\`
- Cursor, Codex, Gemini CLI and more: \`npx skills add iamjahanvi/pixel-icon-generator\`
- Any project (npm, Node 18+): \`npx pixel-icon-generator init\`
- Claude app: upload ${URL}downloads/pixel-icons.zip under Customize → Skills
- Source: https://github.com/iamjahanvi/pixel-icon-generator

## Icons (${lib.length})
${cats.map((c) => `\n### ${c}\n` + lib.filter((i) => i.category === c).map((i) => `- ${i.label}: ${i.keywords.join(", ")}`).join("\n")).join("\n")}
`;
writeFileSync(join(SITE, "llms.txt"), llms);

// ---- sitemap + robots ----
writeFileSync(join(SITE, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${URL}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`);
writeFileSync(join(SITE, "robots.txt"), `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${URL}sitemap.xml
`);

// ---- JSON-LD in index.html ----
const author = { "@type": "Person", "@id": `${URL}#jahanvi`, name: "Jahanvi Singh", url: "https://x.com/me_Jahanvi", sameAs: ["https://x.com/me_Jahanvi", "https://github.com/iamjahanvi"] };
const ld = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${URL}#site`, name: "Pixbits", url: URL, description: `${lib.length} free 16×16 pixel icons and an AI skill that draws more in the same style.`, author: { "@id": `${URL}#jahanvi` }, inLanguage: "en" },
    author,
    {
      "@type": "CollectionPage", "@id": `${URL}#library`, name: "Pixbits pixel icon library", url: URL, isPartOf: { "@id": `${URL}#site` },
      about: ["pixel art icons", "16x16 icons", "SVG icons", "free icons"], license: "https://opensource.org/licenses/MIT",
      mainEntity: {
        "@type": "ItemList", numberOfItems: lib.length,
        itemListElement: lib.map((i, n) => ({ "@type": "ListItem", position: n + 1, name: `${i.label} pixel icon`, description: `16×16 pixel art ${i.label.toLowerCase()} icon (${i.category}): ${i.keywords.slice(0, 6).join(", ")}` })),
      },
    },
    {
      "@type": "SoftwareSourceCode", name: "pixel-icon-generator", description: "An agent skill that turns a word into a 16×16 pixel icon in the Pixtober style, saved as an SVG.",
      codeRepository: "https://github.com/iamjahanvi/pixel-icon-generator", license: "https://opensource.org/licenses/MIT", author: { "@id": `${URL}#jahanvi` },
      runtimePlatform: ["Claude Code", "Claude", "Cursor", "Codex", "Gemini CLI", "Node.js"],
    },
  ],
};
const html = readFileSync(join(SITE, "index.html"), "utf8");
const block = `<!-- seo:jsonld -->\n  <script type="application/ld+json">${JSON.stringify(ld)}</script>\n  <!-- /seo:jsonld -->`;
const out = html.includes("<!-- seo:jsonld -->")
  ? html.replace(/<!-- seo:jsonld -->[\s\S]*?<!-- \/seo:jsonld -->/, block)
  : html.replace("</head>", `  ${block}\n</head>`);
writeFileSync(join(SITE, "index.html"), out);
console.log(`llms.txt, sitemap.xml, robots.txt and JSON-LD updated for ${lib.length} icons in ${cats.length} categories`);
