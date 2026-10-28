---
name: pixel-icons
description: Draw 16x16 pixel icons in the Pixtober style by Jahanvi Singh from a single word — three variations as Figma-ready SVGs plus a preview page, then refine the chosen one.
---

# Pixel icons (16×16, Pixtober style)

The style comes from **Pixtober by Jahanvi Singh** ([@me_Jahanvi](https://x.com/me_Jahanvi)), her daily 16×16 pixel-icon series.

The user types a word ("lantern", "Monday", "courage"). You draw it as a 16×16 pixel icon in this style, give **three different takes**, and then refine whichever one the user picks.

Every icon is authored as a text grid. A script renders the grid to SVG and checks it. You never hand-write SVG.

## 1. The tool

The script is bundled at `scripts/pixelicon.py` inside this skill's folder. In Claude Code the folder is `${CLAUDE_SKILL_DIR}`, so run `python3 ${CLAUDE_SKILL_DIR}/scripts/pixelicon.py <command>`. Elsewhere, use the folder this SKILL.md was loaded from. If the folder is read-only, copy the script into your working directory first.

Work on icon files in your working directory, not in the skill folder. The script needs Python 3; only `png` and PNG `import` also need Pillow (`pip install pillow`, adding `--break-system-packages` if pip asks).

| Command | What it does |
|---|---|
| `check a.json …` | Validates the grid and the hard style rules. Exits 1 on any error. |
| `png a.json … --out view` | Writes enlarged PNGs on a checkerboard, so you can look at your own work with the image viewer / Read tool. |
| `svg a.json … --out svg` | Writes the final SVG: one 1×1 `<rect>` per pixel, `fill="none"` root, the same shape as a Figma export. |
| `preview word.html a.json b.json c.json --title "…"` | Writes a side-by-side page with each take enlarged on a pixel grid, at 1×/2×/4×, plus its palette and check results. |
| `import icon.svg name` | Converts an existing pixel icon (SVG or PNG) to a grid. Use it when the user shares their own references. |

## 2. Icon format

```json
{"name": "coffee-mug", "label": "Mug with steam",
 "palette": {"K": "#000000", "a": "#f2e6cf", "b": "#c9b48f", "c": "#6b3b1f"},
 "grid": [
  "................",
  "... 16 rows, each exactly 16 characters ...",
  "................"]}
```

- `.` is transparent. Every other character must be a key in `palette`.
- `K` is always the outline, `#000000`.
- Use lowercase letters for the colours. Name files `<word>-1.json`, `<word>-2.json` and so on.

## 3. Style rules

These come from the five Pixtober reference icons further down. The first group is hard rules that the artist stated directly or that hold in every reference. `check` enforces most of them.

**Hard rules**
- **The outline is 1px and pure black (`#000000`).** It wraps the entire silhouette with no gaps. Never skip it on lit edges, and never tint it.
- **No dithering, no anti-aliasing, no gradients.** Every pixel is a flat colour from the palette.
- **No stray pixels.** Every filled pixel touches another filled pixel, including diagonally.
- **The background is transparent.**

**Style habits**
- **Black also does the inner linework**: screens and bezels, finger gaps, pot rims, faces, and separations between parts. Shapes inside the icon are separated by black, not by a slightly different shade.
- **Colours come from the real object.** Every colour in the references is the thing's true colour: a red apple, a green leaf, a green cactus in a terracotta pot, a cream retro computer, a skin-toned fist, a steel-blue blade.
  - Before choosing hex values, name each material's real-world colour: "rock is grey, snow is white, a ceramic mug is white, coffee is brown".
  - Then pick a clean, slightly brightened version of that colour.
  - Never choose a colour for mood or variety, such as purple mountains, a blue mug or a teal lid, unless the word itself names that colour or the object really comes in it.
  - When an object comes in many colours, like mugs or cars, use its most typical one.
  - Fantasy subjects follow their convention, like a green ogre.
- **Palettes are tight.** Objects use black plus 2–4 colours. A character can go up to about 9. There is no fixed shared palette.
- **Shading is one darker tone per material**, used as a 1px band along one side or the underside. Examples are the right column of the fist, the left column of the screen and the ogre's shadowed jaw. There is at most one shade per material, and never a gradient.
- **Highlights are thin**: a 1px curved streak, like the white line down the apple, or a few accent pixels, like the cactus tips. They are never a large blob.
- **Corners are rounded with 1px diagonal steps** in the outline, as on the apple's curves and the cut corners of the computer case.
- **The subject fills the canvas.** It usually spans 14–16px and can touch the canvas edge. Use the most recognisable view: side-on for fruit, plants and animals, front-on for devices and faces. Centre it.
- **Personality is welcome but optional.** A simple face is a 1px black eye or two and a short black mouth, like the smiling screen on the computer. A creature can have attitude, like the ogre. Use this for at most one of the three takes unless the word asks for it.

## 4. Workflow

1. **Interpret the word.**
   - If it's concrete, draw the thing.
   - If it's abstract (an emotion, a day, a concept), pick a strong visual metaphor yourself without asking. Say in one line which one you chose, for example "courage → a small shield with a heart".
   - Make the three takes three different ideas, compositions or metaphors, not recolours of one drawing. For "coffee", that might be a mug with steam, a takeaway cup, and a moka pot.
   - At 16px a face only works on a calm, flat area. Don't put one on top of an object's own defining line, like a bean's crease: the two lines read as a scar.

2. **Plan each take before writing pixels.** Decide:
   - the silhouette's bounding box, which should span 14–16px
   - where the black inner lines go
   - which side gets the shadow band
   - where the highlight streak goes
   - each material and its real-world colour, written as a short list like "mug: white ceramic, coffee: dark brown"

   Then draw in layers, mentally or as drafts: silhouette in base colours → black outline around it → black inner lines → shadow band → highlight.

3. **Write the grid row by row.** Count every row to exactly 16 characters, and check the left/right symmetry where the object should be symmetric.

4. **Run `check`, then fix every error.**
   - For an outline gap, add black around the pixel listed.
   - For a stray pixel, remove it or connect it.
   - Treat warnings as judgement calls.

5. **Look at the result.** Run `png` and view each image, then fix anything that reads badly at 16px, such as a muddy silhouette, a lopsided shape or an unclear subject. A useful test: would someone name the word from the 1× icon alone? Also ask: are these the colours this thing has in real life? Repeat steps 3–5 until all three takes pass and read clearly.

6. **Deliver.**
   - Run `svg` for the three takes and `preview` for one page containing all three.
   - Show the preview page and send the three SVGs.
   - In 2–3 lines, name each take, say which metaphor you chose if the word was abstract, and ask which one to refine.

7. **Refine.** The user picks a number and asks for changes in plain words ("rounder", "add a handle", "warmer brown"). Edit that grid, then re-run check → png → svg → preview, and send the updated SVG and preview.
   - Keep the file name and bump a suffix (`-v2`) so earlier versions survive.
   - Change only what the user asked for.

## 5. Reference icons (study these before drawing)

These are five of Jahanvi's Pixtober icons, converted pixel for pixel from her SVGs. The same grids are in `references/` as JSON. Each block lists the palette, then the 16 rows.

**apple**: K `#000000` · a `#f7203c` red · b `#ffffff` highlight · c `#2bca30` leaf
```
......K.........
.......K........
...KKK.K.KKKK...
..KaKcKKKaaaaK..
.KaKccKaaaaaaaK.
KaKccKaaaaaaaaaK
KaaKKaaaaaabaaaK
KaaaaaaaaaaabaaK
KaaaaaaaaaaabaaK
KaaaaaaaaaaabaaK
KaaaaaaaaaaabaaK
.KaaaaaaaaabaaK.
.KaaaaaaaaaaaaK.
..KaaaaaaaaaaK..
...KaaaKKaaaK...
....KKK..KKK....
```
The body fills the full 16px width. The highlight is a single 1px curved streak. The leaf sits inside the outline, and the stem is a 1px black diagonal.

**relic** (old computer with a face): K `#000000` · a `#eddfc5` cream case · b `#8ccdc0` screen · c `#549f90` screen shade
```
..KKKKKKKKKKKK..
.KaaaaaaaaaaaaK.
.KaaKKKKKKKKaaK.
.KaKcbbbbbbbKaK.
.KaKcbKbbbKbKaK.
.KaKcbKbKbKbKaK.
.KaKcbbbKbbbKaK.
.KaKcbbKKbbbKaK.
.KaKcbbbbbbbKaK.
.KaaKKKKKKKKaaK.
.KaaaaaaaaaaaaK.
.KaKKaaaaKKKKaK.
.KaaaaaaaaaaaaK.
..KKKKKKKKKKKK..
..KaaaaaaaaaaK..
..KKKKKKKKKKKK..
```
The case corners are cut by 1px. The screen has a black bezel with a 1px shade column on its left. The face is drawn in black lines, and the slots are black dashes.

**cactus**: K `#000000` · a `#8aab1f` cactus green · b `#c7532e` terracotta pot · c `#bfdd4c` light-green accents
```
.......KK.......
...K..KaaK......
..KaK.KaaK..K...
..KcK.KacK.KaK..
..KaK.KaaK.KaK..
..KaK.KaaKKKcK..
..KaaKKcaKaaaK..
...KcaKaaKKKK...
....KKKaaK......
......KaaK......
....KKKacKKK....
...KbbKaaKbbK...
...KbKKKKKKbK...
....KbbbbbbK....
....KbbbbbbK....
.....KKKKKK.....
```
The arms are 1px wide inside the outline. The light accents are single pixels. The pot rim is a black line, and the pot narrows at the bottom with diagonal steps.

**smack** (fist): K `#000000` · a `#ea924e` skin · b `#af5d1f` shade
```
................
................
................
...KKKKKKKKK....
..KaaaaaaaaaK...
.KaaaaaaaaaabK..
.KabKabKabKabK..
.KaaaaaaaaaabK..
.KabKabKabKabK..
.KabKabKabKabK..
.KabKabKabKabK..
..KK.KK.KKaKKK..
.......KaaaabK..
........KKKKK...
................
................
```
This one uses only 3 colours. The finger gaps are black, and the shade is a 1px column on each finger and along the right edge.

**ogre** (character): K `#000000` · a `#7dc03b` skin · b `#437d3d` skin shade · c `#913b21` loincloth · d `#b9eaf8` blade · e `#ffffff` eyes/teeth · f `#7bc0d3` blade shade · g `#7a7302` hilt · h `#fe0002` mouth · i `#b10a0c` mouth shade
```
......KKKK...K..
....KKaaaaKKKdK.
...KaaaaaaaaKdK.
.KKKaaaaaaaaKdfK
KaabKaaaaaaKKdfK
KaabbKKaaKKbKdfK
.KKaaeeaaeeaKdfK
...KaeKaaKeaKdfK
....KaaaaaaKKdfK
..KKbbehhebbKdK.
.KaaaabiibaKgggg
KbbKaaaaaaaaKbbK
.KK.KccccccK.KK.
....KaccccaK....
....KabccbaK....
.....KK..KK.....
```
This is the most complex reference, with 9 colours. The eyes are white with black pupils, the brow is angry, and a sword runs the full height. Note: the hilt row and the bottom of the loincloth skip the outline in this original. `check` flags those spots. Don't copy that; new icons always close the outline.
