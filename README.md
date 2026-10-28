# pixel-icon-generator

A Claude skill that turns a single word into a **16×16 pixel icon** in the style of [Pixtober](https://jahanvi-pixtober-2024.framer.website/), Jahanvi Singh's daily pixel-icon series.

Type `sunset` and you get three different takes, a preview page and Figma-ready SVGs. Then you pick one and refine it in plain words.

## What you get

- **Three takes per word**: different ideas, not recolours. "Coffee" might give a mug, a takeaway cup and a moka pot.
- **Figma-ready SVGs**: one 1×1 `<rect>` per pixel, the same shape as a Figma export. Paste one into Figma and every pixel stays editable.
- **A preview page** with each take enlarged on a pixel grid, at 1×, 2× and 4×, plus its palette.
- **Built-in style checks**: a closed 1px black outline, no stray pixels and no anti-aliasing. Claude also renders each icon and looks at it before showing you.
- **Abstract words work too.** Claude picks a visual metaphor and tells you which one, for example "courage → a small shield with a heart".

## Install

### In Claude (web, desktop or mobile)

1. Make sure code execution is on: **Settings → Capabilities → "Code execution and file creation"**. On Team and Enterprise plans, an owner controls this.
2. Download [`pixel-icons.zip`](pixel-icons.zip) from this repo.
3. Go to **Customize → Skills**, click **+**, then **Create skill → Upload a skill**, and choose the ZIP.
4. Toggle the skill on.

These steps follow Anthropic's guide, [Use skills in Claude](https://support.claude.com/en/articles/12512180-use-skills-in-claude). If the menus have moved, check there.

### In Claude Code

```bash
git clone https://github.com/iamjahanvi/pixel-icon-generator.git
cp -r pixel-icon-generator/pixel-icons ~/.claude/skills/pixel-icons
```

To share it with a team instead, copy the folder into a project's `.claude/skills/` directory. See the [Claude Code skills docs](https://code.claude.com/docs/en/skills) for details.

## Use it

Ask for a word, or call the skill directly:

```
/pixel-icons sunset
```

```
make me a pixel icon for "lantern"
```

You'll get three takes plus a preview page. Then refine one:

```
I like 2. Make the snow cap bigger and the sun more orange.
```

Claude edits only what you asked for. It saves the result as a new version (`-v2`), so earlier versions are kept.

Tips:
- **Concrete nouns work best**, like objects, food, plants, animals and places.
- **For abstract words, say the metaphor** if you have one in mind: "Monday, as a coffee-stained calendar".
- **Name colours only if you want something unusual.** By default, colours come from the real object: grey rock, a white mug, a terracotta pot.

## The style

The rules are drawn from five of Jahanvi's Pixtober icons, which ship with the skill as references:

- A **1px pure black outline** that is always closed, with black used for inner lines too
- **Flat colour only**: no dithering, gradients or anti-aliasing
- **Tight palettes** of 2–4 colours plus black, taken from the **real object**
- **One shade per material** as a 1px band, and **thin 1px highlights**
- **Rounded corners** made from 1px diagonal steps, with the subject **filling the canvas** (14–16px)
- **Optional personality**, such as a simple face or a creature with attitude

## Repo layout

```
pixel-icons/              ← the skill (this folder is what gets installed)
  SKILL.md                ← instructions Claude follows
  scripts/pixelicon.py    ← renderer and style checker (Python 3)
  references/             ← the five Pixtober reference icons as JSON grids
pixel-icons.zip           ← the skill folder, zipped for uploading to Claude
```

## Using the script on its own

Icons are stored as JSON: a palette plus 16 rows of 16 characters, where `.` means transparent.

```json
{"name": "coffee-mug",
 "palette": {"K": "#000000", "a": "#f4f1ea", "b": "#cfc7b8", "c": "#6b3b1f"},
 "grid": ["................", "...16 rows..."]}
```

```bash
python3 pixel-icons/scripts/pixelicon.py check my-icon.json              # validate the style rules
python3 pixel-icons/scripts/pixelicon.py svg my-icon.json --out out       # export an SVG
python3 pixel-icons/scripts/pixelicon.py preview out/p.html my-icon.json  # build a preview page
python3 pixel-icons/scripts/pixelicon.py import my-icon.svg my-icon       # convert your own icon to a grid
```

`check`, `svg`, `preview` and SVG `import` need only Python 3. `png` and PNG `import` also need [Pillow](https://pypi.org/project/pillow/).

## Credits

Style and reference icons by **Jahanvi Singh**: [Pixtober 2024](https://jahanvi-pixtober-2024.framer.website/) · [@me_Jahanvi](https://x.com/me_Jahanvi). Skill built with Claude.

## License

[MIT](LICENSE), covering the code, the skill and the reference icons.
