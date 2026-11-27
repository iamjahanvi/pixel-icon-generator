// The copy-and-paste version of the skill, for AI tools without skills support.
// `example` is a library entry shown to the model as a worked example.

export function buildPrompt(word, example, { api = false } = {}) {
  // the word goes inside "…" in the prompt: straighten any quotes in it and keep it to one short line
  const w = (word || "").replace(/["\u201c\u201d`]/g, "'").replace(/\s+/g, " ").trim().slice(0, 60) || "WORD";
  const file = w.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "icon";
  const ex = JSON.stringify({ name: example.slug, palette: example.color.palette, grid: example.color.grid }, null, 1)
    .replace(/\[\n\s+/g, "[\n  ").replace(/",\n\s+"/g, '",\n  "');
  return `${api ? "" : `👉 Just press Enter to create your icon. (Everything below is instructions for the AI.)

`}Draw "${w}" as a 16x16 pixel icon in the Pixtober style by Jahanvi Singh (pixbits.iamjahanvi.com).

Pick ONE idea for the word. For an abstract word, choose a clear visual metaphor.

FORMAT
The icon is JSON with "name", "palette" and "grid".
"grid" is exactly 16 strings of exactly 16 characters. "." is transparent. Every other character is a key in "palette". "K" is always black, #000000.

STYLE
- A 1px pure black outline that wraps the whole shape with no gaps. No coloured pixel may touch "." or the canvas edge.
- Black also draws the inner lines: separations between parts, faces, details.
- Colours are the object's real-world colours (grey rock, white ceramic mug, terracotta pot). Black plus 2-4 colours.
- One darker shade per material, as a 1px band on one side. Highlights are a thin 1px streak.
- Flat colour only: no dithering, gradients or anti-aliasing. No stray single pixels.
- Round corners with 1px diagonal steps. The subject fills the canvas (14-16px) and is centred.

Before you answer, count every row: 16 rows, 16 characters each.

Reply with one line saying which idea you drew, then one code block containing the icon's JSON.${api ? "" : `

Then turn the JSON into files I can use right away:
- ${file}.svg: viewBox="0 0 16 16", width and height 512, shape-rendering="crispEdges", one <rect> per run of same-colour pixels in a row, no background.
- ${file}.png: 512x512 with a transparent background, each pixel scaled up 32x with no smoothing.
If you can run code or create files, attach both as downloads. If you can't, put the full SVG in a second code block.`}

EXAMPLE ("${example.label.toLowerCase()}")
${ex}`;
}
