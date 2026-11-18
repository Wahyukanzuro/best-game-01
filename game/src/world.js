// PAPER STORM v2 — world.js: the whole simulation. One job: state + rules.
// Everything deterministic: every random draw comes from S.rng (mulberry32).
// Live play and staged screenshots step the same function with the same control shape.

function comboOf(S) {
  return Math.min(1 + CFG.COMBO_STEP * Math.max(0, S.chain - 1), CFG.COMBO_MAX);
}

function dashCooldown(S) {
  return CFG.DASH_CD / Math.pow(2, S.upgradesPicked.fold);
}

function magnetRadius(S) {
  return S.upgradesPicked.wind > 0 ? 90 + 90 * S.upgradesPicked.wind : 0;
}

function createWorld(seed) {
  const rng = mulberry32(seed);
  const S = {
    rng, seed, time: 0, state: 'title', prevState: 'play',
    front: 1, frontTime: 0, frontsCleared: 0,
    hull: 3, maxHull: 3, score: 0, best: 0, letters: 0,
    chain: 0, chainTimer: 0, bestCombo: 1,
    dashCd: 0, dashTime: 0, dashDirX: 1, dashDirY: 0, shield: 0,
    plane: { x: 640, y: 460, vx: 0, vy: 0, angle: -Math.PI / 2 },
    blots: [], notes: [], particles: [], popups: [],
    banner: null, shake: 0, flash: 0,
    upgradesPicked: { wax: 0, fold: 0, wind: 0 }, picks: 0,
    tempest: { hp: CFG.TEMPEST_HP, charge: 0, ringTimer: 1.5 },
    blotTimer: 0.5, noteTimer: 0.3, elitesSpawned: 0,
    closeCalls: 0, clouds: [], speckles: [], vignette: [],
  };
  // Ambient decor, drawn from the same seeded stream (fixed creation order).
  for (let i = 0; i < 14; i++) {
    S.clouds.push({ x: rng() * CFG.W, y: rng() * CFG.H, w: 120 + rng() * 220, speed: 6 + rng() * 14, a: 0.10 + rng() * 0.12 });
  }
  for (let i = 0; i < 260; i++) {
    S.speckles.push({ x: rng() * CFG.W, y: rng() * CFG.H, r: 0.6 + rng() * 1.4, a: 0.04 + rng() * 0.08 });
  }
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    S.vignette.push({ x: t * CFG.W, y: 10 + Math.sin(t * 21 + seed) * 4 });
  }
  return S;
}

function startRun(S) {
  const best = S.best;
  const fresh = createWorld(S.seed);
  fresh.best = best;
  Object.keys(fresh).forEach((k) => { S[k] = fresh[k]; });
  S.state = 'play';
}

function addPopup(S, x, y, text, color, size) {
  S.popups.push({ x, y, text, color: color || PALETTE.goldDeep, size: size || 22, life: 1.1, max: 1.1 });
}

function addBurst(S, x, y, color, n, speed, size) {
  for (let i = 0; i < n; i++) {
    const a = S.rng() * Math.PI * 2;
    const v = speed * (0.3 + S.rng() * 0.7);
    S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + S.rng() * 0.5, max: 1, size: size * (0.6 + S.rng() * 0.8), color, kind: 'dot' });
  }
}

function addScraps(S, x, y) {
  for (let i = 0; i < 10; i++) {
    const a = S.rng() * Math.PI * 2;
    S.particles.push({ x, y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140 - 40, life: 0.7 + S.rng() * 0.4, max: 1.1, size: 5 + S.rng() * 6, color: i % 2 ? PALETTE.cream : PALETTE.goldSoft, kind: 'scrap', rot: S.rng() * 6.28, vr: (S.rng() - 0.5) * 12 });
  }
}

function spawnBlot(S, ring) {
  const t = FRONT_TUNING[S.front] || FRONT_TUNING[3];
  const elite = !ring && S.elitesSpawned < t.elites && S.rng() < 0.10;
  let x, y, vx, vy;
  if (ring) {
    const a = S.rng() * Math.PI * 2;
    x = CFG.VORTEX_X + Math.cos(a) * 170; y = CFG.VORTEX_Y + Math.sin(a) * 170;
    vx = Math.cos(a) * 46; vy = Math.sin(a) * 46;
  } else {
    const edge = Math.floor(S.rng() * 4);
    if (edge === 0) { x = -40; y = S.rng() * CFG.H; }
    else if (edge === 1) { x = CFG.W + 40; y = S.rng() * CFG.H; }
    else if (edge === 2) { x = S.rng() * CFG.W; y = -40; }
    else { x = S.rng() * CFG.W; y = CFG.H + 40; }
    const tx = 200 + S.rng() * 880, ty = 120 + S.rng() * 480;
    const sp = t.blotSpeed[0] + S.rng() * (t.blotSpeed[1] - t.blotSpeed[0]);
    const d = Math.hypot(tx - x, ty - y) || 1;
    vx = (tx - x) / d * sp; vy = (ty - y) / d * sp;
  }
  const r = elite ? 48 + S.rng() * 10 : t.blotR[0] + S.rng() * (t.blotR[1] - t.blotR[0]);
  if (elite) S.elitesSpawned++;
  const pts = [];
  for (let i = 0; i < 9; i++) pts.push(0.78 + S.rng() * 0.42);
  S.blots.push({ x, y, vx, vy, r, r0: r, seed: S.rng() * 6.28, pts, elite, grazed: false, wob: 0.6 + S.rng() * 0.9 });
}

function spawnNote(S) {
  const x = -30 + S.rng() * (CFG.W + 60);
  const y = -30;
  S.notes.push({ x, y, vx: (S.rng() - 0.5) * 26, vy: 34 + S.rng() * 30, r: 17, spin: (S.rng() - 0.5) * 1.2, rot: S.rng() * 6.28 });
}

function hurtPlane(S, x, y) {
  if (S.shield > 0 || S.dashTime > 0) return;
  S.hull -= 1;
  S.shield = CFG.SHIELD_TIME;
  S.chain = 0; S.chainTimer = 0;
  S.shake = 14;
  addBurst(S, x, y, PALETTE.ink, 22, 260, 4);
  addPopup(S, S.plane.x, S.plane.y - 40, '-1 HULL', PALETTE.vermilion, 26);
  Sound.hit();
  if (S.hull <= 0) {
    S.state = 'over';
    S.best = Math.max(S.best, S.score);
    Sound.lose();
  }
}

function pickUpgrade(S, id) {
  if (id === 'wax') { S.maxHull = Math.min(5, S.maxHull + 1); S.hull = Math.min(S.maxHull, S.hull + 1); }
  S.upgradesPicked[id] = (S.upgradesPicked[id] || 0) + 1;
  S.picks++;
  addPopup(S, S.plane.x, S.plane.y - 50, UPGRADES.find((u) => u.id === id).name + '!', PALETTE.goldDeep, 24);
  Sound.front();
}

// Called after a break pick: move to the next front, or into the Tempest.
function advanceFront(S) {
  S.blotTimer = 0.5; S.noteTimer = 0.3; S.elitesSpawned = 0;
  if (S.front < 3) {
    S.front++;
    S.frontTime = 0;
    S.state = 'play';
  } else {
    S.front = 4;
    S.frontTime = 0;
    S.state = 'play';
    S.tempest.hp = CFG.TEMPEST_HP;
    S.tempest.charge = 0;
    S.tempest.ringTimer = 1.5;
  }
}

function stepWorld(S, ctl, dt) {
  S.time += dt;
  for (const c of S.clouds) { c.x += c.speed * dt; if (c.x - c.w > CFG.W) { c.x = -c.w; c.y = S.rng() * CFG.H; } }
  // Ambient-only states: the storm drifts, nothing else moves.
  if (S.state === 'title') {
    if (S.blots.length < 8 && S.rng() < dt * 0.7) spawnBlot(S, false);
    if (S.notes.length < 5 && S.rng() < dt * 0.5) spawnNote(S);
    driftEntities(S, dt);
    return;
  }
  if (S.state === 'break' || S.state === 'over' || S.state === 'win' || S.state === 'pause') {
    updateFx(S, dt);
    return;
  }

  // ---- play ----
  const p = S.plane;
  const ax = Input.axis(ctl.keys || {});
  let mx = 0, my = 0;
  if (ax.x !== 0 || ax.y !== 0) {
    const len = Math.hypot(ax.x, ax.y) || 1;
    mx = ax.x / len; my = ax.y / len;
  } else if (ctl.mouseIn) {
    const dx = ctl.mx - p.x, dy = ctl.my - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 6) { mx = dx / d; my = dy / d; }
  }
  if (ctl.pressed && ctl.pressed['Space'] && S.dashCd <= 0 && (mx !== 0 || my !== 0)) {
    S.dashTime = CFG.DASH_TIME;
    S.dashCd = dashCooldown(S);
    S.dashDirX = mx; S.dashDirY = my;
    addScraps(S, p.x, p.y);
    Sound.dash();
  }
  if (S.dashTime > 0) {
    S.dashTime -= dt;
    p.vx = S.dashDirX * CFG.DASH_SPEED; p.vy = S.dashDirY * CFG.DASH_SPEED;
  } else {
    const sp = (ax.x !== 0 || ax.y !== 0) ? CFG.PLANE_SPEED : CFG.MOUSE_SPEED;
    p.vx = mx * sp; p.vy = my * sp;
  }
  p.x = clamp(p.x + p.vx * dt, 24, CFG.W - 24);
  p.y = clamp(p.y + p.vy * dt, 90, CFG.H - 24);
  if (Math.hypot(p.vx, p.vy) > 20) p.angle = Math.atan2(p.vy, p.vx);
  S.dashCd = Math.max(0, S.dashCd - dt);
  S.shield = Math.max(0, S.shield - dt);

  // ---- spawns ----
  const t = FRONT_TUNING[S.front] || FRONT_TUNING[3];
  if (S.front <= 3) {
    S.blotTimer -= dt;
    if (S.blotTimer <= 0 && S.blots.length < t.blotCap) { spawnBlot(S, false); S.blotTimer = t.blotEvery; }
    S.noteTimer -= dt;
    if (S.noteTimer <= 0) { spawnNote(S); S.noteTimer = t.letterEvery; }
  } else {
    S.noteTimer -= dt;
    if (S.noteTimer <= 0) { spawnNote(S); S.noteTimer = 0.6; }
    S.tempest.ringTimer -= dt;
    if (S.tempest.ringTimer <= 0) {
      S.tempest.ringTimer = CFG.RING_EVERY;
      for (let i = 0; i < CFG.RING_COUNT; i++) spawnBlot(S, true);
    }
  }

  // ---- move entities ----
  driftEntities(S, dt);
  const mag = magnetRadius(S);
  for (const n of S.notes) {
    if (mag > 0) {
      const d = Math.hypot(p.x - n.x, p.y - n.y);
      if (d < mag && d > 1) { n.vx += (p.x - n.x) / d * 260 * dt; n.vy += (p.y - n.y) / d * 260 * dt; }
    }
  }

  // ---- collisions ----
  for (let i = S.notes.length - 1; i >= 0; i--) {
    const n = S.notes[i];
    if (dist2(p.x, p.y, n.x, n.y) < (CFG.PLANE_R + n.r + 4) * (CFG.PLANE_R + n.r + 4)) {
      S.notes.splice(i, 1);
      S.letters++;
      S.chain = S.chainTimer > 0 ? S.chain + 1 : 1;
      S.chainTimer = CFG.COMBO_WINDOW;
      const combo = comboOf(S);
      S.bestCombo = Math.max(S.bestCombo, combo);
      const gain = Math.round(CFG.LETTER_SCORE * combo);
      S.score += gain;
      addPopup(S, n.x, n.y - 14, '+' + gain, PALETTE.goldDeep, 22);
      addBurst(S, n.x, n.y, PALETTE.gold, 10, 160, 3);
      Sound.pickup();
      const tier = Math.floor(combo);
      if (tier >= 2 && Math.floor(comboOf({ ...S, chain: S.chain - 1 })) < tier) {
        S.banner = { text: 'CHAIN x' + combo.toFixed(2) + '!', t: 1.4, max: 1.4 };
      } else if (combo >= 3 && !S.banner) {
        // Hot streak: keep the chain banner flashing while the combo holds.
        S.banner = { text: 'CHAIN x' + combo.toFixed(2) + '!', t: 1.4, max: 1.4 };
      }
      if (S.front === 4) {
        S.tempest.charge++;
        if (S.tempest.charge >= CFG.SHATTER_LETTERS) {
          S.tempest.charge = 0;
          S.tempest.hp = Math.max(0, S.tempest.hp - CFG.SHATTER_DMG);
          S.flash = 0.35;
          addPopup(S, CFG.VORTEX_X, CFG.VORTEX_Y - 120, 'SHATTER!', PALETTE.vermilion, 34);
          addBurst(S, CFG.VORTEX_X, CFG.VORTEX_Y, PALETTE.gold, 40, 320, 4);
          Sound.shatter();
          if (S.tempest.hp <= 0) {
            S.state = 'win';
            S.best = Math.max(S.best, S.score);
            Sound.win();
            return;
          }
        }
      }
    }
  }
  for (const b of S.blots) {
    const rr = b.r + CFG.PLANE_R - 4;
    const d2 = dist2(p.x, p.y, b.x, b.y);
    if (d2 < rr * rr) { hurtPlane(S, b.x, b.y); if (S.state !== 'play') return; }
    else if (!b.grazed && d2 < CFG.CLOSE_DIST * CFG.CLOSE_DIST) {
      b.grazed = true;
      S.score += CFG.CLOSE_CALL; S.closeCalls++;
      addPopup(S, b.x, b.y - b.r - 8, 'CLOSE +' + CFG.CLOSE_CALL, PALETTE.inkSoft, 18);
    }
  }
  if (S.front === 4) {
    const rr = CFG.VORTEX_R * 0.85 + CFG.PLANE_R;
    if (dist2(p.x, p.y, CFG.VORTEX_X, CFG.VORTEX_Y) < rr * rr) { hurtPlane(S, CFG.VORTEX_X, CFG.VORTEX_Y); if (S.state !== 'play') return; }
  }

  // ---- timers ----
  if (S.chainTimer > 0) { S.chainTimer -= dt; if (S.chainTimer <= 0) S.chain = 0; }
  S.frontTime += dt;
  if (S.frontTime >= CFG.FRONT_DUR) {
    S.frontsCleared++;
    S.state = 'break';
    Sound.front();
  }
  updateFx(S, dt);
  Sound.setWind(S.front === 4 ? 1 : S.front / 4);
}

function driftEntities(S, dt) {
  for (let i = S.blots.length - 1; i >= 0; i--) {
    const b = S.blots[i];
    const wob = Math.sin(S.time * b.wob + b.seed) * 22;
    b.x += (b.vx + Math.cos(b.seed) * wob * 0.4) * dt;
    b.y += (b.vy + Math.sin(b.seed) * wob * 0.4) * dt;
    b.r = Math.min(b.r0 * 1.35, b.r + 0.35 * dt);
    if (b.x < -120 || b.x > CFG.W + 120 || b.y < -120 || b.y > CFG.H + 120) S.blots.splice(i, 1);
  }
  for (let i = S.notes.length - 1; i >= 0; i--) {
    const n = S.notes[i];
    n.x += n.vx * dt; n.y += n.vy * dt; n.rot += n.spin * dt;
    if (n.y > CFG.H + 60 || n.x < -80 || n.x > CFG.W + 80) S.notes.splice(i, 1);
  }
}

function updateFx(S, dt) {
  for (let i = S.particles.length - 1; i >= 0; i--) {
    const pt = S.particles[i];
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vy += 60 * dt; pt.life -= dt;
    if (pt.rot !== undefined) pt.rot += (pt.vr || 0) * dt;
    if (pt.life <= 0) S.particles.splice(i, 1);
  }
  for (let i = S.popups.length - 1; i >= 0; i--) {
    const pp = S.popups[i];
    pp.y -= 34 * dt; pp.life -= dt;
    if (pp.life <= 0) S.popups.splice(i, 1);
  }
  if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }
  if (S.shake > 0) S.shake = Math.max(0, S.shake - 42 * dt);
  if (S.flash > 0) S.flash = Math.max(0, S.flash - dt);
}
