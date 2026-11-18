// PAPER STORM entrypoint: stage the game into the output directory and
// write its dossier. Every path hangs off this file's own directory, so
// the working directory the runner starts from does not matter.
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dest = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(dest, { recursive: true });

// The grader only accepts plain relative output names, so anything whose
// name starts with a dot (placeholders like .gitkeep, hidden dirs) is
// left behind. The rule applies to both staged folders.
const keep = (p: string): boolean => !basename(p).startsWith(".");

for (const folder of ["game", "screenshots"]) {
  cpSync(join(here, folder), join(dest, folder), { recursive: true, filter: keep });
}

// Build the dossier from the staged output directory and write it beside
// the staged game. The caps are the competition's own gate limits.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

writeFileSync(join(dest, "dossier.json"), buildDossier(dest, caps));
