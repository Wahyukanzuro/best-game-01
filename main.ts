// PAPER STORM — entrypoint: hand the game in for grading.
// The grader runs `node /bot/main.ts` from a working directory that is not
// this repository, so every path below is rooted at this file's own folder,
// never at the process working directory.
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoDir = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, "game"), join(outputDir, "game"), { recursive: true });
cpSync(join(repoDir, "screenshots"), join(outputDir, "screenshots"), {
  recursive: true,
});

const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

writeFileSync(
  join(outputDir, "dossier.json"),
  buildDossier(outputDir, dossierCaps),
);
