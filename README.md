# pixel-icon-generator

An agent skill that turns a single word into a **16×16 pixel icon** in the style of [Pixtober 2024](https://jahanvi-pixtober-2024.framer.website/), Jahanvi Singh's daily pixel-icon series.

Ask your AI tool for "a pixel icon of a lantern" and you get `lantern.svg` in your project, ready for code or Figma.

**Website:** [pixelicons.iamjahanvi.com](https://pixelicons.iamjahanvi.com) has a library of 30 icons to download, an editor, and the copy-and-paste prompt.

## What you get

- **One idea per word.** The agent picks the strongest idea and tells you why in a line. For abstract words it picks a visual metaphor, for example "courage → a small shield with a heart".
- **Figma-ready SVGs**: one 1×1 `<rect>` per pixel, the same shape as a Figma export. Paste one into Figma and every pixel stays editable.
- **Only the SVG lands in your project.** The agent asks where to save it first, and keeps its working files elsewhere.
- **Built-in style checks**: a closed outline, no stray pixels, no anti-aliasing. The agent also renders each icon and looks at it before handing it over.
- **Plain-word edits**: "make the flame bigger" updates the file in place.

## Install

### Claude app (web, desktop or mobile)

1. Make sure code execution is on: **Settings → Capabilities → "Code execution and file creation"**. On Team and Enterprise plans, an owner controls this.
2. Download [`pixel-icons.zip`](pixel-icons.zip) from this repo.
3. Go to **Customize → Skills**, click **+**, then **Create skill → Upload a skill**, and choose the ZIP.
4. Toggle the skill on.

These steps follow [Use skills in Claude](https://support.claude.com/en/articles/12512180-use-skills-in-claude). If the menus have moved, check there.

### Claude Code

Add the plugin from inside Claude Code:

```
/plugin marketplace add iamjahanvi/pixel-icon-generator
/plugin install pixel-icons@pixel-icon-generator
```

### Cursor, Codex, OpenCode, Gemini CLI and other agents

Run this in your project and pick your tools when it asks:

```bash
npx skills add iamjahanvi/pixel-icon-generator
```

For GitHub Copilot, use the GitHub CLI:

```bash
gh skill install iamjahanvi/pixel-icon-generator pixel-icons
```

### With npm

```bash
npx pixel-icon-generator init            # .agents/skills/ (Cursor, Codex, Copilot)
npx pixel-icon-generator init --claude   # .claude/skills/ (Claude Code)
npx pixel-icon-generator init --cursor   # .cursor/skills/ (Cursor only)
```

Add `--global` to install it in your home folder for every project, and `--force` to replace an existing copy. It needs Node 18 or newer.

### Any chatbot, without installing anything

On [the website](https://pixelicons.iamjahanvi.com/#install), open **Any chatbot**, type your word and copy the prompt. Paste it into ChatGPT, Gemini, Claude or any other chat, then paste the reply into the site's editor to check the icon and download the SVG.

## Use it

```
make a pixel icon of a lantern
```

The first time in a session, the agent asks which folder to save into, and suggests your existing icons folder if it finds one. Then it saves `lantern.svg` there.

To change it, just say what you want:

```
make the flame bigger and the base wider
```

The edit overwrites the same file. Your version control keeps the history.

Tips:
- **Concrete nouns work best**, like objects, food, plants, animals and places.
- **For abstract words, say the metaphor** if you have one in mind: "Monday, as a coffee-stained calendar".
- **Name colours only if you want something unusual.** By default, colours come from the real object: grey rock, a white mug, a terracotta pot.

## The style

The rules come from five of Jahanvi's Pixtober 2024 icons, which ship with the skill as references:

- A **1px pure black outline** that is always closed, with black for the lines inside too
- **Flat colour only**: no dithering, gradients or anti-aliasing
- **Tight palettes** of 2–4 colours plus black, taken from the **real object**
- **One shade per material** as a 1px band, and **thin 1px highlights**
- **Rounded corners** made from 1px diagonal steps, with the subject **filling the canvas** (14–16px)

## Repo layout

```
skills/pixel-icons/       ← the skill (this folder is what gets installed)
  SKILL.md                ← instructions the agent follows
  scripts/pixelicon.mjs   ← renderer and style checker (Node 18+, no dependencies)
  references/             ← five Pixtober 2024 icons as JSON grids
.claude-plugin/           ← Claude Code plugin and marketplace manifests
bin/cli.mjs               ← the npx installer
pixel-icons.zip           ← the skill folder, zipped for uploading to Claude
site/                     ← the website (static, no build step)
```

## Using the tool on its own

Icons are stored as JSON: a palette and 16 rows of 16 characters, where `.` means transparent.

```json
{"name": "lantern",
 "palette": {"K": "#000000", "b": "#d4a52a", "y": "#ffe08a"},
 "grid": ["................", "...16 rows..."]}
```

```bash
npx pixel-icon-generator check lantern.json                 # validate the style rules
npx pixel-icon-generator svg lantern.json --out src/icons   # export an SVG
npx pixel-icon-generator png lantern.json --out view        # enlarged PNG to look at
npx pixel-icon-generator preview page.html lantern.json     # build a preview page
npx pixel-icon-generator import lantern.svg lantern         # turn an SVG or PNG back into a grid
```

## The website

`site/` is a static site with no build step. To work on it:

```bash
cd site && python3 -m http.server 8765      # then open http://localhost:8765
node site/tools/sync-core.mjs               # after changing the checker in pixelicon.mjs
node site/tools/test-site.mjs               # checks the site matches the skill and every icon passes
```

## Credits

Style and reference icons by **Jahanvi Singh**: [Pixtober 2024](https://jahanvi-pixtober-2024.framer.website/) · [@me_Jahanvi](https://x.com/me_Jahanvi). Skill built with Claude. The site uses the [Allo](https://allo.joshpuckett.me) font by Josh Puckett, under the SIL Open Font License.

## License

[MIT](LICENSE), covering the code, the skill and the icons.
