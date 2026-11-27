---
name: pixel-icons
description: Turn a word into a 16x16 pixel icon in the Pixtober style by Jahanvi Singh and save it as a Figma-ready SVG file. Use when someone asks for a pixel icon, pixel art icon or 16x16 icon of something.
---

# Pixel icons (16×16, Pixtober style)

The style comes from **Pixtober by Jahanvi Singh** ([@me_Jahanvi](https://x.com/me_Jahanvi)), her daily pixel-icon series, specifically the colour icons of Pixtober 2024.

The user gives a word ("lantern", "Monday", "courage"). You pick **one idea** for it, draw it as a 16×16 colour pixel icon, save it as an SVG in the user's project, and refine it on request.

Every icon is authored as a text grid. A bundled script renders the grid to SVG and checks it. You never hand-write SVG.

## 1. The tool

The script is `scripts/pixelicon.mjs`, inside the folder this SKILL.md lives in. Resolve that folder's path first: it is wherever your agent loaded this skill from, for example `.agents/skills/pixel-icons/`, `.cursor/skills/pixel-icons/` or `.claude/skills/pixel-icons/`. Then run:

```bash
node <skill-folder>/scripts/pixelicon.mjs <command>
```

It needs only Node 18 or newer and has no dependencies. Don't install anything for it.

| Command | What it does |
|---|---|
| `check a.json …` | Validates the grid and the hard style rules. Exits 1 on any error. |
| `png a.json … --out DIR` | Writes enlarged PNGs on a checkerboard, so you can look at your own work. |
| `svg a.json … --out DIR` | Writes the final SVG: one 1×1 `<rect>` per pixel and a `fill="none"` root, the same shape as a Figma export. |
| `preview page.html a.json --title "…"` | Writes a page showing the icon enlarged on a pixel grid, at 1×/2×/4×, with its palette and check results. |
| `import icon.svg name --out DIR` | Converts an existing pixel icon (SVG or PNG) back into a grid. Use it to edit an icon you saved earlier, or to read the user's own references. |

## 2. Files: what goes where

**Only the final SVG goes into the user's project.** Everything else is scratch: the JSON grid, the review PNG and the preview page.

- **Scratch work** goes in a temporary folder outside the project, such as a `pixel-icons/<word>/` folder inside the system temp directory, or your own scratch area if your environment has one. Never leave grids or PNGs in the repo.
- **Where to save the SVG: always ask first.** The first time in a session, ask the user which folder to save into before writing anything. If you can see an existing icons folder (`src/assets/icons/`, `public/icons/`, `icons/` and so on), offer it as the suggestion. Reuse the answer for the rest of the session.
- **File name**: `<word>.svg` in lowercase kebab-case (`hot-air-balloon.svg`). If a file with that name exists, ask before overwriting it.
- **Editing later**: to change an icon that's already in the project, `import` its SVG into scratch, edit the grid, then write the SVG back over the same file. Version control keeps the history, so don't create `-v2` copies in the project.

Icon grid format, for scratch files:

```json
{"name": "coffee", "label": "Mug with steam",
 "palette": {"K": "#000000", "a": "#f4f1ea", "b": "#cfc7b8", "c": "#6b3b1f"},
 "grid": [
  "................",
  "... 16 rows, each exactly 16 characters ...",
  "................"]}
```

- `.` is transparent. Every other character must be a key in `palette`.
- `K` is always black, `#000000`.
- Use lowercase letters for the other colours.

## 3. The style (Pixtober 2024)

These come from the five Pixtober 2024 reference icons in section 5. The first group is hard rules that the artist stated directly or that hold in every reference. `check` enforces most of them.

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
- **Vertical objects keep their proportions.** For things that are naturally taller than they are wide, such as an ice cream cone, a light bulb, a bottle, a candle or a lantern, use the full 16px height but **no more than 14px of width**. Don't stretch them sideways to fill the square. A slim object can be narrower than 14px if that reads truer. The SVG stays 16×16: centre the drawing, leaving the outer columns empty.
- **Personality is welcome but optional.** A simple face is a 1px black eye or two and a short black mouth, like the smiling screen on the computer. A creature can have attitude, like the ogre. Use it when it suits the idea; never force a face onto every icon.

## 4. Workflow

1. **Pick one idea.**
   - If the word is concrete, draw the thing itself, in its most recognisable form.
   - If it's abstract (an emotion, a day, a concept), choose a strong visual metaphor without asking, for example "courage → a small shield with a heart".
   - Say in one line which idea you chose and why.
   - At 16px a face only works on a calm, flat area. Don't put one on top of an object's own defining line, like a bean's crease: the two lines read as a scar.

2. **Plan before writing pixels.** Decide:
   - the silhouette's bounding box, which should span 14–16px; for a vertical object, up to 16px tall and at most 14px wide
   - where the black inner lines go
   - which side gets the shadow band
   - where the highlight streak goes
   - each material and its real-world colour, written as a short list like "mug: white ceramic, coffee: dark brown"

   Then draw in layers: silhouette in base colours → black outline around it → black inner lines → shadow band → highlight.

3. **Write the grid row by row.** Count every row to exactly 16 characters, and check the left/right symmetry where the object should be symmetric.

4. **Run `check`, then fix every error.**
   - For an outline gap, add black around the pixel listed.
   - For a stray pixel, remove it or connect it.
   - Treat warnings as judgement calls.

5. **Look at the result.** Run `png` and view the image. If you can't view images, re-read the grid row by row as a picture instead. Fix anything that reads badly at 16px, such as a muddy silhouette, a lopsided shape or an unclear subject.
   - Would someone name the word from the 1× icon alone?
   - Are these the colours this thing has in real life?

   Repeat steps 3–5 until it passes and reads clearly.

6. **Deliver.**
   - Ask where to save, if you haven't yet this session (section 2).
   - Run `svg` into that folder, and `preview` for a page kept in scratch.
   - Tell the user the file path and the preview page's path, plus your one-line idea.
   - Ask whether to change anything.

7. **Refine.** The user asks for changes in plain words ("rounder", "add a handle", "warmer brown"). Edit the grid, re-run check → png → svg (writing over the same file) → preview, and report what changed. Change only what they asked for.

## 5. Reference icons (study these before drawing)

These are five of Jahanvi's Pixtober 2024 icons, converted pixel for pixel from her SVGs. The same grids are in `references/` as JSON. Each block lists the palette, then the 16 rows.

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
