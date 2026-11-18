// PAPER STORM — the screenshot scenes behind ?shot=start|play|end.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a
// short game really looks like and the same seed always gives the same frame.

import { FIELD, STEP, TUNING } from './config.js';
import { stepWorld, resetWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_FRONT = 2;
const PLAY_FRONT_SECONDS = 15;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;
const DIRECTIONS = [
  [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.707, 0.707], [0.707, -0.707], [-0.707, 0.707], [-0.707, -0.707],
];

// How dangerous is it to fly in direction (dx, dy) for `horizon` seconds?
// The ghost plane moves at full speed; a blot it would meet costs danger
// in proportion to how soon the meeting happens.
function dangerAt(world, dx, dy, horizon) {
  const p = world.player;
  let danger = 0;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const gx = p.x + dx * TUNING.playerSpeed * t;
    const gy = p.y + dy * TUNING.playerSpeed * t;
    if (gx < 10 || gx > FIELD.width - 10 || gy < 10 || gy > FIELD.height - 10) {
      danger += 2;
    }
    for (const b of world.blots) {
      const bx = b.x + b.vx * t;
      const by = b.y + b.vy * t;
      const d = Math.hypot(bx - gx, by - gy);
      if (d < b.r + TUNING.playerRadius + 14) danger += 3 / (t + 0.1);
    }
  }
  return danger;
}

// The autopilot: among the nine ways to move, take the safest one that
// still drifts toward the nearest letter. `horizon` is how far ahead it
// looks; a short horizon plays like a hurried player and gets caught.
export function autopilot(world, horizon, useDash) {
  const p = world.player;
  let letter = null;
  let letterDist = Infinity;
  for (const l of world.letters) {
    const d = Math.hypot(l.x - p.x, l.y - p.y);
    if (d < letterDist) {
      letterDist = d;
      letter = l;
    }
  }
  let best = [0, 0];
  let bestScore = -Infinity;
  let bestDanger = Infinity;
  for (const [dx, dy] of DIRECTIONS) {
    const danger = dangerAt(world, dx, dy, horizon);
    let pull = 0;
    if (letter) {
      const lx = letter.x - p.x;
      const ly = letter.y - p.y;
      const len = Math.hypot(lx, ly) || 1;
      pull = (dx * lx + dy * ly) / len;
    }
    const score = pull * 1.2 - danger;
    if (score > bestScore) {
      bestScore = score;
      best = [dx, dy];
      bestDanger = danger;
    }
  }
  const dash = useDash && world.dashCd <= 0 && bestDanger > 6;
  return { kx: best[0], ky: best[1], dash };
}

// Set `world` to the named scene (start, play or end; any other name is
// start) and return the screen to draw over it and the best score to show.
export function stageShot(name, world) {
  resetWorld(world, world.seed);
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      const cmd = autopilot(world, 0.7, false);
      stepWorld(world, STEP, { ...cmd, mx: world.player.x, my: world.player.y, mouseFresh: 99 });
      if (world.over) resetWorld(world, world.seed);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    const target = (PLAY_FRONT - 1) * 40 + PLAY_FRONT_SECONDS;
    const steps = Math.floor(target / STEP);
    for (let i = 0; i < steps; i += 1) {
      const cmd = autopilot(world, 0.7, true);
      const events = stepWorld(world, STEP, { ...cmd, mx: world.player.x, my: world.player.y, mouseFresh: 99 });
      if (world.over) {
        resetWorld(world, world.seed);
        return stageShot('play', world);
      }
      // A front break freezes the sim in live play; the staging just
      // keeps flying straight through it.
      if (events & 4) world.frontTime = 0;
    }
    return { screen: SCREEN_PLAY, best: world.score };
  }
  // The end scene: a weak pilot that chases letters and never dodges,
  // so it is caught out once the blots thicken, as a hurried player is.
  const limit = Math.floor(END_LIMIT_SECONDS / STEP);
  for (let i = 0; i < limit; i += 1) {
    const cmd = autopilot(world, 0.15, false);
    stepWorld(world, STEP, { ...cmd, mx: world.player.x, my: world.player.y, mouseFresh: 99 });
    if (world.over) break;
    if (world.won) break;
  }
  return { screen: SCREEN_OVER, best: world.score };
}
