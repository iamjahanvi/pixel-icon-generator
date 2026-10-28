# pixel-icon-generator

An agent skill that turns a single word into a **16×16 pixel icon** in the style of Jahanvi Singh's Pixtober series, drawn twice:

- **Colour**, in the style of [Pixtober 2024](https://jahanvi-pixtober-2024.framer.website/)
- **Black & white**, in the style of [Pixtober 2025](https://jahanvi-pixtober-2025.framer.website/)

Ask your coding agent for "a pixel icon of a lantern" and you get `lantern.svg` and `lantern-bw.svg` in your project, ready for code or Figma.

It works with coding agents that support [Agent Skills](https://agentskills.io), such as Cursor and Claude Code, and in the Claude app. The agent you already use does the drawing, so there's no API key and nothing to pay for beyond your agent.

## What you get

- **One idea per word, in both styles.** The agent picks the strongest idea and tells you why in a line. For abstract words it picks a visual metaphor, for example "courage → a small shield with a heart".
- **Figma-ready SVGs**: one 1×1 `<rect>` per pixel, the same shape as a Figma export. Paste one into Figma and every pixel stays editable.
- **Only the SVGs land in your project.** The agent asks where to save them first, and keeps its working files elsewhere.
- **Built-in style checks** for both styles: closed outlines, no stray pixels, no anti-aliasing, and pure black and white in the black & white version. The agent also renders each icon and looks at it before handing it over.
- **Plain-word edits**: "make the flame bigger" updates both files in place.

## Install

### With npx (any project)

Run this in your project's root folder:

```bash
npx pixel-icon-generator init            # .agents/skills/ (Cursor and other Agent Skills tools)
npx pixel-icon-generator init --claude   # .claude/skills/ (Claude Code)
npx pixel-icon-generator init --cursor   # .cursor/skills/ (Cursor only)
```

Add `--global` to install it in your home folder for every project, and `--force` to replace an existing copy. It needs Node 18 or newer.

Tools differ in where they look for skills. Cursor reads `.agents/skills/` and `.cursor/skills/`, and also picks up `.claude/skills/` ([Cursor docs](https://www.cursor.com/docs/context/skills)). Claude Code reads `.claude/skills/` ([Claude Code docs](https://code.claude.com/docs/en/skills)). For other tools, check their docs and copy the `pixel-icons` folder there.

### By hand

```bash
git clone https://github.com/iamjahanvi/pixel-icon-generator.git
cp -r pixel-icon-generator/pixel-icons your-project/.agents/skills/pixel-icons
```

### In the Claude app (web, desktop or mobile)

1. Make sure code execution is on: **Settings → Capabilities → "Code execution and file creation"**. On Team and Enterprise plans, an owner controls this.
2. Download [`pixel-icons.zip`](pixel-icons.zip) from this repo.
3. Go to **Customize → Skills**, click **+**, then **Create skill → Upload a skill**, and choose the ZIP.
4. Toggle the skill on.

These steps follow [Use skills in Claude](https://support.claude.com/en/articles/12512180-use-skills-in-claude). If the menus have moved, check there.

## Use it

Ask your agent for an icon:

```
make a pixel icon of a lantern
```

In Claude Code you can also call the skill directly with `/pixel-icons lantern`.

The first time in a session, the agent asks which folder to save into, and suggests your existing icons folder if it finds one. Then it saves:

```
src/assets/icons/lantern.svg      ← colour
src/assets/icons/lantern-bw.svg   ← black & white
```

To change it, just say what you want:

```
make the flame bigger and the base wider
```

Edits apply to both styles unless you name one, and overwrite the same files. Your version control keeps the history.

Tips:
- **Concrete nouns work best**, like objects, food, plants, animals and places.
- **For abstract words, say the metaphor** if you have one in mind: "Monday, as a coffee-stained calendar".
- **Name colours only if you want something unusual.** By default, colours come from the real object: grey rock, a white mug, a terracotta pot.

## The styles

Both are 16×16 and use a transparent background.

**Colour (Pixtober 2024)**, drawn from five of Jahanvi's 2024 icons:
- A **1px pure black outline** that is always closed, with black for inner lines too
- **Flat colour only**: no dithering, gradients or anti-aliasing
- **Tight palettes** of 2–4 colours plus black, taken from the **real object**
- **One shade per material** as a 1px band, and **thin 1px highlights**

**Black & white (Pixtober 2025)**, drawn from 18 of Jahanvi's 2025 icons:
- **Only pure black and pure white**, with no greys and no drop shadow
- A **bold outer outline at least 2px thick**, with **fine 1px lines inside**
- **White for the shape and light**, black for lines, shadow and dark materials
- **Checker patterns for texture**, used sparingly

## Repo layout

```
pixel-icons/              ← the skill (this folder is what gets installed)
  SKILL.md                ← instructions the agent follows
  scripts/pixelicon.mjs   ← renderer and style checker (Node 18+, no dependencies)
  references/color/       ← five Pixtober 2024 icons as JSON grids
  references/bw/          ← 18 Pixtober 2025 icons as JSON grids (24px originals)
bin/cli.mjs               ← the npx installer
pixel-icons.zip           ← the skill folder, zipped for uploading to Claude
```

## Using the tool on its own

Icons are stored as JSON: a style, a palette, and 16 rows of 16 characters, where `.` means transparent.

```json
{"name": "lantern", "style": "color",
 "palette": {"K": "#000000", "b": "#d4a52a", "y": "#ffe08a"},
 "grid": ["................", "...16 rows..."]}
```

```bash
npx pixel-icon-generator check lantern.json                    # validate the style rules
npx pixel-icon-generator svg lantern.json --out src/icons      # export an SVG
npx pixel-icon-generator png lantern.json --out view           # enlarged PNG to look at
npx pixel-icon-generator preview page.html lantern.json        # build a preview page
npx pixel-icon-generator import lantern.svg lantern            # turn an SVG or PNG back into a grid
```

`style` is `"color"` or `"bw"`, and it decides which rules `check` applies.

## Credits

Styles and reference icons by **Jahanvi Singh**: [Pixtober 2024](https://jahanvi-pixtober-2024.framer.website/) · [Pixtober 2025](https://jahanvi-pixtober-2025.framer.website/) · [@me_Jahanvi](https://x.com/me_Jahanvi). Skill built with Claude.

## License

[MIT](LICENSE), covering the code, the skill and the reference icons.
