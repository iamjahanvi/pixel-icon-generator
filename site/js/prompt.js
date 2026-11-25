// The copy-and-paste version of the skill, for AI tools without skills support.
// `examples` is a library entry (both styles) shown to the model as a worked example.

export function buildPrompt(word, example) {
  const w = (word || "").trim() || "WORD";
  const ex = (style) => JSON.stringify({ name: style === "bw" ? `${example.slug}-bw` : example.slug, style, palette: example[style].palette, grid: example[style].grid }, null, 1)
    .replace(/\[\n\s+/g, "[\n  ").replace(/",\n\s+"/g, '",\n  "');
  return `Draw "${w}" as a 16x16 pixel icon in the Pixtober style by Jahanvi Singh (pixelicons.iamjahanvi.com).

Pick ONE idea for the word. For an abstract word, choose a clear visual metaphor. Draw that idea twice: once in colour (Pixtober 2024) and once in black and white (Pixtober 2025).

FORMAT
Each icon is JSON with "name", "style" ("color" or "bw"), "palette" and "grid".
"grid" is exactly 16 strings of exactly 16 characters. "." is transparent. Every other character is a key in "palette". "K" is always black, #000000.

COLOUR STYLE (Pixtober 2024)
- A 1px pure black outline that wraps the whole shape with no gaps. No coloured pixel may touch "." or the canvas edge.
- Black also draws the inner lines: separations between parts, faces, details.
- Colours are the object's real-world colours (grey rock, white ceramic mug, terracotta pot). Black plus 2-4 colours.
- One darker shade per material, as a 1px band on one side. Highlights are a thin 1px streak.
- Flat colour only: no dithering, gradients or anti-aliasing. No stray single pixels.
- Round corners with 1px diagonal steps. The subject fills the canvas (14-16px) and is centred.

BLACK & WHITE STYLE (Pixtober 2025)
- Only "K" #000000 and "w" #ffffff on a transparent background. No greys, no drop shadow.
- The outer outline is solid black and at least 2px thick everywhere. Test every white pixel: the 5x5 square around it, minus its 4 corner cells, must not contain "." or go off the canvas.
- Lines inside the shape are 1px.
- White is the shape and the light. Black is lines, shadow, dark materials and holes. A checker pattern is only for texture.
- Same idea and silhouette as the colour icon, simplified to fit.

Before you answer, count every row: 16 rows, 16 characters each.

Reply with one line saying which idea you drew, then one code block containing a JSON array with both icons, colour first.

EXAMPLE ("${example.label.toLowerCase()}")
[
${ex("color")},
${ex("bw")}
]

To check the icons and download SVGs, paste the whole reply into the editor at pixelicons.iamjahanvi.com/#editor.`;
}
