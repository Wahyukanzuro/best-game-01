[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/Wahyukanzuro/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/Wahyukanzuro/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

# Paper Storm

Pilot a paper plane through an ink storm. Dodge the drifting ink blots,
stamp the letters, survive three weather fronts, and break the Tempest —
a giant ink vortex that rings the sky with blots.

## How to play

- **Mouse or WASD / arrows** — steer the plane (it follows your cursor)
- **Space** — fold-dash: a burst of speed with brief invulnerability
- **P** — pause, **M** — mute, **R** — restart
- Between fronts, pick one of three upgrades (click or press 1 / 2 / 3):
  Wax Coat (+1 hull), Sharp Fold (dash recharges twice as fast), Tailwind
  (letters drift toward you)
- A blot hit costs 1 hull and breaks your combo. Letters build the combo
  multiplier. During the Tempest, every letter you stamp damages the vortex.

## Build

- `game/` — the playable game as static files (vanilla canvas 2D, no
  libraries, no network, no image or audio files; all art is procedural
  and all sound is synthesised with WebAudio)
- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json`
- `screenshots/` — three real renders of the game's own code: the title,
  mid-flight play with the HUD, and the game-over screen

Play it locally: `python3 -m http.server --directory game 8080`, then open
http://localhost:8080 in a desktop browser.

MIT licensed. Entry for [Make the best game](https://make.fun/bounty/best-game-01).

## Screenshots

The three screenshots are deterministic staged scenes of the game's own
code (`?shot=start|play|end&seed=1`): the title over a live storm, a
mid-flight moment in front 2 with the HUD and a combo running, and the
game-over screen after a hurried pilot is caught out.
