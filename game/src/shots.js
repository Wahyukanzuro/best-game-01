// PAPER STORM v2 — shots.js: deterministic staged scenes for the screenshots.
// One job: run the seeded simulation forward (no rendering) until the exact frame
// the shot needs, with an autopilot that steers through the same controls live
// play uses. Same seed always yields the same frame.

const DT = 1 / 60;

function pilotCtl(S, skill) {
  const p = S.plane;
  let nearestBlot = null, nd = 1e9;
  for (const b of S.blots) {
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d < nd) { nd = d; nearestBlot = b; }
  }
  let nearestNote = null;
  let md = 1e9;
  for (const n of S.notes) {
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    if (d < md) { md = d; nearestNote = n; }
  }
  const ctl = { mx: p.x, my: p.y, mouseIn: true, keys: {}, pressed: {}, clicked: false };
  if (skill === 'strong') {
    if (nearestBlot && nd < 160) {
      // Escape: sample 12 directions, take the one whose landing spot is
      // farthest from every blot (and from the vortex in the Tempest).
      let best = -1e9, bx = p.x, by = p.y;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const tx = clamp(p.x + Math.cos(a) * 200, 70, CFG.W - 70);
        const ty = clamp(p.y + Math.sin(a) * 200, 120, CFG.H - 50);
        let minD = 1e9;
        for (const b of S.blots) minD = Math.min(minD, Math.hypot(b.x - tx, b.y - ty));
        if (S.front === 4) minD = Math.min(minD, Math.hypot(CFG.VORTEX_X - tx, CFG.VORTEX_Y - ty) - CFG.VORTEX_R);
        const sc = Math.min(minD, 280) - Math.max(0, 130 - tx) * 0.3 - Math.max(0, tx - (CFG.W - 130)) * 0.3;
        if (sc > best) { best = sc; bx = tx; by = ty; }
      }
      ctl.mx = bx; ctl.my = by;
      if (nd < 90 && S.dashCd <= 0) ctl.pressed['Space'] = true;
    } else if (nearestNote) {
      ctl.mx = nearestNote.x; ctl.my = nearestNote.y;
    } else {
      ctl.mx = CFG.W / 2; ctl.my = CFG.H / 2;
    }
    return ctl;
  }
  // Weak pilot: slow reactions, chases notes, never dashes — it gets caught.
  const fleeAt = 55;
  if (nearestBlot && nd < fleeAt) {
    const dx = p.x - nearestBlot.x, dy = p.y - nearestBlot.y;
    const d = Math.hypot(dx, dy) || 1;
    ctl.mx = p.x + (dx / d) * 220; ctl.my = p.y + (dy / d) * 220;
  } else if (nearestNote) {
    ctl.mx = nearestNote.x; ctl.my = nearestNote.y;
  } else {
    ctl.mx = CFG.W / 2; ctl.my = CFG.H / 2;
  }
  return ctl;
}

// Run the sim until stopFn(S) is true or maxSteps run out. Breaks auto-pick.
function runSim(S, skill, maxSteps, stopFn) {
  const picks = ['wind', 'fold', 'wax'];
  let pickIdx = 0;
  for (let i = 0; i < maxSteps; i++) {
    if (S.state === 'break') {
      pickUpgrade(S, picks[pickIdx % picks.length]);
      pickIdx++;
      advanceFront(S);
      continue;
    }
    if (S.state !== 'play') break;
    stepWorld(S, pilotCtl(S, skill), DT);
    if (stopFn && stopFn(S)) return i;
  }
  return maxSteps;
}

function stageShot(kind, seed) {
  const S = createWorld(seed);
  if (kind === 'start') {
    for (let i = 0; i < 5 * 60; i++) stepWorld(S, { mx: 640, my: 360, mouseIn: false, keys: {}, pressed: {}, clicked: false }, DT);
    S.state = 'title';
  } else if (kind === 'play') {
    S.state = 'play';
    // Fast-forward to the Tempest climax: vortex up, HP falling, combo high,
    // a score popup and the chain banner fresh in frame.
    runSim(S, 'strong', 400 * 60, (s) =>
      s.front === 4 && s.tempest.hp <= 60 && comboOf(s) >= 3.0 && (s.banner || s.popups.length > 0));
  } else { // end: a weak pilot that gets caught, for the game-over screen.
    S.state = 'play';
    runSim(S, 'weak', 300 * 60, null);
    if (S.state === 'play') { S.hull = 0; S.state = 'over'; S.best = Math.max(S.best, S.score); }
  }
  if (typeof window !== 'undefined') {
    window.__staged = {
      kind, state: S.state, front: S.front, score: S.score,
      combo: comboOf(S), bestCombo: S.bestCombo, letters: S.letters,
      upgrades: Object.keys(S.upgradesPicked).filter((k) => S.upgradesPicked[k] > 0),
      tempestHp: S.tempest.hp, popups: S.popups.length, banner: S.banner ? S.banner.text : null,
    };
  }
  return S;
}
