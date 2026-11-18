// PAPER STORM v2 — main.ts: hands the entry in (Node 22, stdlib only).
// Copies game/ and screenshots/ to the output dir and writes dossier.json
// with buildDossier from the kit's vendored library. Deterministic: the same
// input files always produce the same output bytes.
import { buildDossier } from "./vendor/makefun-game.ts";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
cpSync("game", join(outDir, "game"), { recursive: true });
cpSync("screenshots", join(outDir, "screenshots"), { recursive: true });
const dossier = buildDossier(".", {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, "dossier.json"), dossier);
