#!/usr/bin/env node
// pixel-icon-generator CLI
//   init     copy the pixel-icons skill into a project (or your home folder) so a coding agent can use it
//   check | svg | png | preview | import   pass straight through to the skill's pixelicon.mjs

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const SKILL_SRC = path.resolve(here, "..", "skills", "pixel-icons");
const SCRIPT = path.join(SKILL_SRC, "scripts", "pixelicon.mjs");

const TARGETS = {
  agents: ".agents/skills", // Cursor, Codex and other tools that follow the Agent Skills standard
  claude: ".claude/skills", // Claude Code
  cursor: ".cursor/skills", // Cursor-only
};

const HELP = `pixel-icon-generator: 16x16 Pixtober-style pixel icons for coding agents

Usage
  npx pixel-icon-generator init [--claude | --cursor] [--global] [--force]

    Copies the pixel-icons skill into this project so your coding agent can use it.
      (default)   .agents/skills/pixel-icons   Cursor, Codex and other Agent Skills tools
      --claude    .claude/skills/pixel-icons   Claude Code
      --cursor    .cursor/skills/pixel-icons   Cursor only
      --global    install in your home folder instead, for every project
      --force     replace an existing copy

  npx pixel-icon-generator <check|svg|png|preview|import> ...
    Runs the icon tool directly (see the README).

Then ask your agent: "make a pixel icon of a lantern".
`;

function init(args) {
  const flag = (f) => args.includes(f);
  const kind = flag("--claude") ? "claude" : flag("--cursor") ? "cursor" : "agents";
  if (flag("--claude") && flag("--cursor")) fail("Pick one of --claude or --cursor.");
  const root = flag("--global") ? os.homedir() : process.cwd();
  const dest = path.join(root, TARGETS[kind], "pixel-icons");
  if (fs.existsSync(dest)) {
    if (!flag("--force")) fail(`Already installed at ${dest}\nRun again with --force to replace it.`);
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(SKILL_SRC, dest, { recursive: true });
  const shown = flag("--global") ? path.join("~", TARGETS[kind], "pixel-icons") : path.relative(process.cwd(), dest);
  console.log(`Installed the pixel-icons skill at ${shown}`);
  console.log(`\nTry it: ask your agent "make a pixel icon of a lantern".`);
  if (kind === "agents") console.log(`Using Claude Code? Run with --claude instead, so it lands in .claude/skills.`);
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") {
  console.log(HELP);
} else if (cmd === "init") {
  init(rest);
} else if (["check", "svg", "png", "preview", "import"].includes(cmd)) {
  const r = spawnSync(process.execPath, [SCRIPT, cmd, ...rest], { stdio: "inherit" });
  process.exit(r.status ?? 1);
} else {
  fail(`Unknown command: ${cmd}\n\n${HELP}`);
}
