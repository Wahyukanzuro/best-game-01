// PAPER STORM — the simulation: fronts, blots, letters, the Tempest, hull,
// combo, dash and upgrades. Pure logic, no drawing, no sound. Everything
// random comes from the world's own seeded generator, so the same seed
// always plays the same storm.

import {
  FIELD, STEP, TUNING, EVENT_HIT, EVENT_PICKUP, EVENT_FRONT, EVENT_OVER,
  EVENT_WIN, EVENT_DASH, EVENT_POP, mulberry32,
} from './config.js';

// The event flags live in config.js; re-export them so the loop can read
// them from here alongside the world itself.
export { EVENT_HIT, EVENT_PICKUP, EVENT_FRONT, EVENT_OVER, EVENT_WIN, EVENT_DASH, EVENT_POP };

// The three upgrades offered between fronts. Picking one already owned
// pays 500 points instead of stacking it.
export const UPGRADES = [
  { id: 'coat', key: '1', name: 'WAX COAT', desc: '+1 hull, patched and sealed' },
  { id: 'fold', key: '2', name: 'SHARP FOLD', desc: 'Dash recharges twice as fast' },
  { id: 'tailwind', key: '3', name: 'TAILWIND', desc: 'Letters drift toward your plane' },
];

export function createWorld(seed) {
  const world = {
    seed,
    rng: mulberry32(seed),
    time: 0,
    front: 1,
    frontTime: 0,
    score: 0,
    best: 0,
    combo: 1,
    comboTimer: 0,
    lettersGot: 0,
    hull: TUNING.hullStart,
    maxHull: TUNING.hullStart,
    dashCd: 0,
    dashTime: 0,
    shield: 0,
    upgrades: { coat: false, fold: false, tailwind: false },
    player: { x: 320, y: 360, vx: 0, vy: 0, angle: 0 },
    blots: [],
    letters: [],
    parts: [],
    pops: [],
    vortex: null,
    blotT: 0.8,
    letterT: 0.5,
    over: false,
    won: false,
  };
  return world;
}

// Put the world back to the start of front 1 with a fresh generator.
export function resetWorld(world, seed) {
  const fresh = createWorld(seed);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}

// One blot: a wobbling ink mass drifting in from an edge, growing slowly.
function spawnBlot(world) {
  const rng = world.rng;
  const edge = Math.floor(rng() * 4);
  const r = TUNING.blotRadius[0] + rng() * (TUNING.blotRadius[1] - TUNING.blotRadius[0]);
  const speed = TUNING.blotSpeed[world.front - 1] || TUNING.blotSpeed[2];
  const blot = { x: 0, y: 0, vx: 0, vy: 0, r, r0: r, phase: rng() * Math.PI * 2, wob: 14 + rng() * 22 };
  if (edge === 0) { blot.x = -r; blot.y = rng() * FIELD.height; blot.vx = speed * (0.7 + rng() * 0.5); blot.vy = (rng() - 0.5) * 40; }
  if (edge === 1) { blot.x = FIELD.width + r; blot.y = rng() * FIELD.height; blot.vx = -speed * (0.7 + rng() * 0.5); blot.vy = (rng() - 0.5) * 40; }
  if (edge === 2) { blot.x = rng() * FIELD.width; blot.y = -r; blot.vx = (rng() - 0.5) * 40; blot.vy = speed * (0.7 + rng() * 0.5); }
  if (edge === 3) { blot.x = rng() * FIELD.width; blot.y = FIELD.height + r; blot.vx = (rng() - 0.5) * 40; blot.vy = -speed * (0.7 + rng() * 0.5); }
  world.blots.push(blot);
}

// One stamped letter: a bright pickup drifting left, bobbing gently.
function spawnLetter(world) {
  const rng = world.rng;
  world.letters.push({
    x: FIELD.width + 30,
    y: 60 + rng() * (FIELD.height - 120),
    vx: -(14 + rng() * 22),
    phase: rng() * Math.PI * 2,
    rot: (rng() - 0.5) * 0.5,
  });
}

// A ring of blots bursting out of the vortex during the Tempest.
function spawnRing(world) {
  const v = world.vortex;
  const n = 8;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + world.time * 0.3;
    const speed = 120 + world.rng() * 40;
    world.blots.push({
      x: v.x, y: v.y,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      r: 16 + world.rng() * 8, r0: 16,
      phase: world.rng() * Math.PI * 2, wob: 10,
    });
  }
}

// Paper scraps, ink drops or gold sparkles, by kind.
export function burst(world, x, y, kind, n) {
  for (let i = 0; i < n; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const sp = 60 + world.rng() * 180;
    world.parts.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      life: 0.5 + world.rng() * 0.5, maxLife: 1,
      size: 3 + world.rng() * 6,
      rot: world.rng() * Math.PI, vr: (world.rng() - 0.5) * 8,
      kind,
    });
  }
}

function addPopup(world, x, y, text, kind) {
  world.pops.push({ x, y, text, kind, life: 1.1 });
}

// Apply an upgrade picked on a break screen.
export function applyUpgrade(world, id) {
  if (id === 'coat') {
    if (world.maxHull >= TUNING.hullMax) {
      world.score += 500;
      addPopup(world, world.player.x, world.player.y - 40, '+500', 'gold');
      return;
    }
    world.maxHull += 1;
    world.hull += 1;
    world.upgrades.coat = true;
  }
  if (id === 'fold') {
    if (world.upgrades.fold) {
      world.score += 500;
      addPopup(world, world.player.x, world.player.y - 40, '+500', 'gold');
      return;
    }
    world.upgrades.fold = true;
  }
  if (id === 'tailwind') {
    if (world.upgrades.tailwind) {
      world.score += 500;
      addPopup(world, world.player.x, world.player.y - 40, '+500', 'gold');
      return;
    }
    world.upgrades.tailwind = true;
  }
  burst(world, world.player.x, world.player.y, 'gold', 14);
}

// Advance the world one fixed step. cmd carries the steering for this step:
// { kx, ky, mx, my, mouseFresh, dash }. Returns an event bitmask.
export function stepWorld(world, dt, cmd) {
  let events = 0;
  if (world.over || world.won) return events;
  world.time += dt;
  world.frontTime += dt;
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 1;
  }
  if (world.shield > 0) world.shield -= dt;
  if (world.dashCd > 0) world.dashCd -= dt;
  if (world.dashTime > 0) world.dashTime -= dt;

  // --- The plane ------------------------------------------------------------
  const p = world.player;
  const dashing = world.dashTime > 0;
  const maxSpeed = TUNING.playerSpeed * (dashing ? TUNING.dashSpeed : 1);
  if (cmd.dash && world.dashCd <= 0 && !dashing) {
    world.dashTime = TUNING.dashTime;
    world.dashCd = world.upgrades.fold ? TUNING.dashCooldownFast : TUNING.dashCooldown;
    events |= EVENT_DASH;
    burst(world, p.x, p.y, 'paper', 10);
    const dir = Math.atan2(p.vy, p.vx);
    const hasDir = Math.hypot(p.vx, p.vy) > 20;
    const a = hasDir ? dir : Math.atan2(cmd.my - p.y, cmd.mx - p.x);
    p.vx = Math.cos(a) * TUNING.playerSpeed * TUNING.dashSpeed;
    p.vy = Math.sin(a) * TUNING.playerSpeed * TUNING.dashSpeed;
  }
  if (cmd.kx !== 0 || cmd.ky !== 0) {
    p.vx += cmd.kx * TUNING.playerAccel * dt;
    p.vy += cmd.ky * TUNING.playerAccel * dt;
  } else if (cmd.mouseFresh < 2) {
    const dx = cmd.mx - p.x;
    const dy = cmd.my - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      const want = Math.min(maxSpeed, dist * 6);
      p.vx += ((dx / dist) * want - p.vx) * Math.min(1, dt * 8);
      p.vy += ((dy / dist) * want - p.vy) * Math.min(1, dt * 8);
    } else {
      p.vx *= Math.max(0, 1 - dt * 4);
      p.vy *= Math.max(0, 1 - dt * 4);
    }
  } else {
    p.vx *= Math.max(0, 1 - dt * 4);
    p.vy *= Math.max(0, 1 - dt * 4);
  }
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > maxSpeed) {
    p.vx = (p.vx / speed) * maxSpeed;
    p.vy = (p.vy / speed) * maxSpeed;
  }
  p.x = Math.max(18, Math.min(FIELD.width - 18, p.x + p.vx * dt));
  p.y = Math.max(18, Math.min(FIELD.height - 18, p.y + p.vy * dt));
  if (speed > 30) p.angle = Math.atan2(p.vy, p.vx);

  // --- Spawns ---------------------------------------------------------------
  world.blotT -= dt;
  if (world.blotT <= 0 && world.blots.length < TUNING.blotCap && world.front < 4) {
    spawnBlot(world);
    const base = TUNING.blotInterval[world.front - 1];
    world.blotT = base * (0.75 + world.rng() * 0.5);
  }
  world.letterT -= dt;
  if (world.letterT <= 0 && world.letters.length < TUNING.letterCap) {
    spawnLetter(world);
    world.letterT = TUNING.letterInterval * (0.8 + world.rng() * 0.4);
  }

  // --- The Tempest vortex ----------------------------------------------------
  if (world.front === 4 && world.vortex) {
    const v = world.vortex;
    v.pulse += dt;
    v.x += Math.sin(v.pulse * 0.7) * 12 * dt;
    v.y += Math.cos(v.pulse * 0.9) * 10 * dt;
    v.ringT -= dt;
    if (v.ringT <= 0) {
      spawnRing(world);
      v.ringT = 2.6;
    }
  }

  // --- Blots: drift, wobble, grow, leave ------------------------------------
  for (let i = world.blots.length - 1; i >= 0; i -= 1) {
    const b = world.blots[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt + Math.sin(world.time * 2 + b.phase) * b.wob * dt;
    if (b.r < b.r0 * 1.5) b.r += 1.1 * dt;
    if (b.x < -70 || b.x > FIELD.width + 70 || b.y < -70 || b.y > FIELD.height + 70) {
      world.blots.splice(i, 1);
    }
  }

  // --- Letters: drift, bob, magnetise ---------------------------------------
  for (let i = world.letters.length - 1; i >= 0; i -= 1) {
    const l = world.letters[i];
    l.x += l.vx * dt;
    l.y += Math.sin(world.time * 2.2 + l.phase) * 14 * dt;
    if (world.upgrades.tailwind) {
      const dx = p.x - l.x;
      const dy = p.y - l.y;
      const d = Math.hypot(dx, dy);
      if (d < 180 && d > 1) {
        l.x += (dx / d) * 130 * dt;
        l.y += (dy / d) * 130 * dt;
      }
    }
    if (l.x < -50) world.letters.splice(i, 1);
  }

  // --- Collisions ------------------------------------------------------------
  const shielded = world.shield > 0 || world.dashTime > 0;
  for (let i = world.blots.length - 1; i >= 0; i -= 1) {
    const b = world.blots[i];
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d >= b.r + TUNING.playerRadius) continue;
    if (dashing) {
      world.blots.splice(i, 1);
      world.score += TUNING.blotPopScore;
      events |= EVENT_POP;
      burst(world, b.x, b.y, 'ink', 10);
      addPopup(world, b.x, b.y, `+${TUNING.blotPopScore}`, 'gold');
      continue;
    }
    if (shielded) continue;
    world.blots.splice(i, 1);
    world.hull -= 1;
    world.combo = 1;
    world.comboTimer = 0;
    world.shield = TUNING.shieldTime;
    events |= EVENT_HIT;
    burst(world, p.x, p.y, 'ink', 16);
    if (world.hull <= 0) {
      world.over = true;
      events |= EVENT_OVER;
      burst(world, p.x, p.y, 'paper', 26);
      return events;
    }
  }

  for (let i = world.letters.length - 1; i >= 0; i -= 1) {
    const l = world.letters[i];
    if (Math.hypot(l.x - p.x, l.y - p.y) > 30) continue;
    world.letters.splice(i, 1);
    world.lettersGot += 1;
    const gained = TUNING.letterScore * world.combo;
    world.score += gained;
    world.combo = Math.min(world.combo + 1, TUNING.comboMax);
    world.comboTimer = TUNING.comboWindow;
    events |= EVENT_PICKUP;
    burst(world, l.x, l.y, 'gold', 8);
    addPopup(world, l.x, l.y - 14, `+${gained}`, 'gold');
    if (world.front === 4 && world.vortex) {
      world.vortex.hp -= TUNING.tempestLetterDamage;
      if (world.vortex.hp <= 0) {
        world.vortex.hp = 0;
        world.won = true;
        events |= EVENT_WIN;
        burst(world, world.vortex.x, world.vortex.y, 'gold', 40);
        return events;
      }
    }
  }

  // --- Fronts ----------------------------------------------------------------
  if (world.front < 3 && world.frontTime >= TUNING.frontDuration) {
    world.front += 1;
    world.frontTime = 0;
    events |= EVENT_FRONT;
  } else if (world.front === 3 && world.frontTime >= TUNING.frontDuration) {
    world.front = 4;
    world.frontTime = 0;
    world.vortex = {
      x: FIELD.width / 2, y: FIELD.height / 2,
      r: 74, hp: TUNING.tempestHP, maxHp: TUNING.tempestHP,
      pulse: 0, ringT: 1.2,
    };
    events |= EVENT_FRONT;
  }

  // --- Particles and popups ---------------------------------------------------
  for (let i = world.parts.length - 1; i >= 0; i -= 1) {
    const pt = world.parts[i];
    pt.life -= dt;
    if (pt.life <= 0) { world.parts.splice(i, 1); continue; }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 60 * dt;
    pt.rot += pt.vr * dt;
  }
  for (let i = world.pops.length - 1; i >= 0; i -= 1) {
    const pop = world.pops[i];
    pop.life -= dt;
    pop.y -= 34 * dt;
    if (pop.life <= 0) world.pops.splice(i, 1);
  }

  return events;
}
