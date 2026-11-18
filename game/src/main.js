// PAPER STORM — the loop: a fixed-step simulation, a state machine
// (title / play / break / over / win), and the screenshot staging.
// With ?shot=start|play|end in the URL the game stages one deterministic
// scene and draws it once; without it, it plays live.

import { FIELD, STEP, TUNING, hashSeed } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  createWorld, resetWorld, stepWorld, applyUpgrade, UPGRADES,
  EVENT_HIT, EVENT_PICKUP, EVENT_FRONT, EVENT_OVER, EVENT_WIN,
  EVENT_DASH, EVENT_POP,
} from './world.js';
import {
  drawScene,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_BREAK, SCREEN_OVER, SCREEN_WIN,
} from './render.js';
import { stageShot, autopilot } from './shots.js';

// The three upgrade cards, laid out exactly as render.js draws them.
const CARD = { x0: 230, y: 260, w: 260, h: 220, gap: 20 };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedText = params.get('seed') || '1';
const seed = hashSeed(seedText);

function loadBest() {
  try {
    return Number(window.localStorage.getItem('paperStormBest') || 0) || 0;
  } catch (err) {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('paperStormBest', String(value));
  } catch (err) {
    // A browser without storage still plays; the best just does not stick.
  }
}

let best = loadBest();
let screen = SCREEN_TITLE;
let paused = false;
const world = createWorld(seed);
world.best = best;

// --- Screenshot staging -----------------------------------------------------
// With ?shot= in the URL there is no loop: stage the scene, draw it once,
// and leave it on the canvas for the screenshot.
if (shotName) {
  const staged = stageShot(shotName, world);
  world.best = Math.max(world.best, staged.best);
  screen = staged.screen;
  drawScene(ctx, world, screen, false);
  window.__shotReady = true;
} else {
  startLoop();
}

function startGame() {
  resetWorld(world, (Date.now() % 2147483647) >>> 0);
  world.best = best;
  screen = SCREEN_PLAY;
  paused = false;
  audio.ensure();
  audio.setFront(1);
  input.clearQueued();
}

function cardAt(x, y) {
  if (y < CARD.y || y > CARD.y + CARD.h) return 0;
  for (let i = 0; i < 3; i += 1) {
    const x0 = CARD.x0 + i * (CARD.w + CARD.gap);
    if (x >= x0 && x <= x0 + CARD.w) return i + 1;
  }
  return 0;
}

// One frame of input, answered by the screen showing.
function handleFrame(q) {
  if (q.mute) audio.setMuted(!audio.muted);
  if (q.pause && screen === SCREEN_PLAY) paused = !paused;
  if (screen === SCREEN_TITLE && (q.start || q.restart)) {
    audio.ensure();
    startGame();
    return;
  }
  if ((screen === SCREEN_OVER || screen === SCREEN_WIN) && (q.restart || q.start)) {
    audio.ensure();
    audio.click();
    startGame();
    return;
  }
  if (screen === SCREEN_BREAK) {
    let pick = q.choice;
    if (!pick && q.click) pick = cardAt(q.clickX, q.clickY);
    if (pick >= 1 && pick <= 3) {
      applyUpgrade(world, UPGRADES[pick - 1].id);
      audio.click();
      screen = SCREEN_PLAY;
      input.clearQueued();
    }
  }
}

// One fixed simulation step, by screen.
function tick(dt, q, firstStep) {
  if (screen === SCREEN_TITLE) {
    const cmd = autopilot(world, 0.7, false);
    stepWorld(world, dt, { ...cmd, mx: world.player.x, my: world.player.y, mouseFresh: 99 });
    if (world.over) resetWorld(world, world.seed);
    return;
  }
  if (screen !== SCREEN_PLAY || paused) return;
  const steer = input.steer(dt);
  const cmd = {
    kx: steer.kx,
    ky: steer.ky,
    mx: input.mouseX,
    my: input.mouseY,
    mouseFresh: input.mouseFresh,
    dash: firstStep && q.dash,
  };
  const events = stepWorld(world, dt, cmd);
  if (events & EVENT_PICKUP) audio.pickup(world.combo);
  if (events & EVENT_HIT) audio.hit();
  if (events & EVENT_DASH) audio.dash();
  if (events & EVENT_POP) audio.pop();
  if (events & EVENT_FRONT) {
    audio.setFront(world.front);
    audio.frontClear();
    if (world.front === 2 || world.front === 3) {
      screen = SCREEN_BREAK;
      input.clearQueued();
    }
  }
  if (events & EVENT_OVER) {
    screen = SCREEN_OVER;
    best = Math.max(best, world.score);
    world.best = best;
    saveBest(best);
    audio.lose();
  }
  if (events & EVENT_WIN) {
    screen = SCREEN_WIN;
    best = Math.max(best, world.score);
    world.best = best;
    saveBest(best);
    audio.win();
  }
}

function startLoop() {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    const q = input.takeQueued();
    handleFrame(q);
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      acc -= STEP;
      steps += 1;
      tick(STEP, q, steps === 1);
    }
    if (steps === 5) acc = 0;
    drawScene(ctx, world, screen, paused);
  }
  requestAnimationFrame(frame);
}
