// PAPER STORM v2 — render.js: everything the eye sees. One job: draw the world.
// Layout is the #1 lesson: a frame must read at a glance — dense HUD, named
// upgrades, popups, banner — while the field stays a coherent paper/ink scene.

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = (weight || 'bold') + ' ' + size + 'px Arial, Helvetica, sans-serif';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function panel(ctx, x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill || 'rgba(251,246,234,0.94)';
  ctx.strokeStyle = stroke || PALETTE.ink;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 10);
  ctx.fill(); ctx.stroke();
}

function drawUpgradeIcon(ctx, id, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color || PALETTE.ink;
  ctx.fillStyle = color || PALETTE.ink;
  ctx.lineWidth = 2;
  if (id === 'wax') {           // shield
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, -s * 0.4); ctx.lineTo(s * 0.8, s * 0.3);
    ctx.quadraticCurveTo(s * 0.8, s * 0.9, 0, s); ctx.quadraticCurveTo(-s * 0.8, s * 0.9, -s * 0.8, s * 0.3);
    ctx.lineTo(-s * 0.8, -s * 0.4); ctx.closePath(); ctx.stroke();
  } else if (id === 'fold') {   // lightning fold
    ctx.beginPath();
    ctx.moveTo(s * 0.3, -s); ctx.lineTo(-s * 0.5, s * 0.1); ctx.lineTo(-s * 0.05, s * 0.1);
    ctx.lineTo(-s * 0.3, s); ctx.lineTo(s * 0.5, -s * 0.1); ctx.lineTo(s * 0.05, -s * 0.1);
    ctx.closePath(); ctx.fill();
  } else {                      // tailwind swirl
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.7, 0.3, 4.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.35, 2.2, 5.6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScene(ctx, S) {
  ctx.save();
  if (S.shake > 0) {
    ctx.translate(Math.sin(S.time * 127.3) * S.shake, Math.cos(S.time * 141.7) * S.shake);
  }
  drawPaper(ctx, S);
  drawNotes(ctx, S);
  drawBlots(ctx, S);
  if (S.front === 4 && (S.state === 'play' || S.state === 'break' || S.state === 'over' || S.state === 'win')) drawVortex(ctx, S);
  if (S.state === 'play' || S.state === 'break' || S.state === 'pause') drawPlane(ctx, S);
  drawParticles(ctx, S);
  drawPopups(ctx, S);
  drawBanner(ctx, S);
  if (S.state === 'play' || S.state === 'break' || S.state === 'pause') drawHud(ctx, S);
  ctx.restore();
  if (S.state === 'title') drawTitle(ctx, S);
  else if (S.state === 'break') drawBreak(ctx, S);
  else if (S.state === 'over') drawEnd(ctx, S, false);
  else if (S.state === 'win') drawEnd(ctx, S, true);
  else if (S.state === 'pause') drawPause(ctx, S);
  if (S.flash > 0) {
    ctx.fillStyle = 'rgba(251,246,234,' + (S.flash * 0.5).toFixed(3) + ')';
    ctx.fillRect(0, 0, CFG.W, CFG.H);
  }
}

function drawPaper(ctx, S) {
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-20, -20, CFG.W + 40, CFG.H + 40);
  for (const sp of S.speckles) {
    ctx.fillStyle = 'rgba(30,42,74,' + sp.a.toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, 6.283); ctx.fill();
  }
  for (const c of S.clouds) {
    ctx.fillStyle = 'rgba(255,255,255,' + c.a.toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w / 2, 16, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.2, c.y - 8, c.w / 3, 12, 0, 0, 6.283); ctx.fill();
  }
  // Torn-paper vignette: wavy dark border.
  ctx.strokeStyle = 'rgba(30,42,74,0.28)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  for (const v of S.vignette) ctx.lineTo(v.x, v.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, CFG.H - 14);
  for (const v of S.vignette) ctx.lineTo(v.x, CFG.H - v.y);
  ctx.stroke();
}

function drawNotes(ctx, S) {
  for (const n of S.notes) {
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(n.rot * 0.2);
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 10;
    ctx.fillStyle = PALETTE.cream;
    ctx.strokeStyle = PALETTE.goldDeep; ctx.lineWidth = 2;
    rr(ctx, -18, -13, 36, 26, 3); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = PALETTE.inkSoft; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-18, -13); ctx.lineTo(0, 2); ctx.lineTo(18, -13);
    ctx.moveTo(-18, 13); ctx.lineTo(-2, 0); ctx.moveTo(18, 13); ctx.lineTo(2, 0);
    ctx.stroke();
    ctx.fillStyle = PALETTE.vermilion;
    ctx.fillRect(8, -11, 8, 9);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = 'bold 7px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('1', 12, -3.5);
    ctx.restore();
  }
}

function drawBlots(ctx, S) {
  for (const b of S.blots) {
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.elite) { ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 16; }
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + Math.sin(S.time * b.wob + b.seed) * 0.08;
      const r = b.r * b.pts[i];
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    if (b.elite) {
      ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, b.r + 5, 0, 6.283); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-b.r * 0.25, -b.r * 0.3, b.r * 0.3, 3.6, 5.4); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(-b.r * 0.22, -b.r * 0.05, 2.6, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(b.r * 0.22, -b.r * 0.05, 2.6, 0, 6.283); ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath(); ctx.arc(-b.r * 0.22 + 1, -b.r * 0.05, 1.2, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(b.r * 0.22 + 1, -b.r * 0.05, 1.2, 0, 6.283); ctx.fill();
    ctx.restore();
  }
}

function drawVortex(ctx, S) {
  const x = CFG.VORTEX_X, y = CFG.VORTEX_Y;
  ctx.save();
  ctx.shadowColor = PALETTE.ink; ctx.shadowBlur = 30;
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath(); ctx.arc(x, y, CFG.VORTEX_R, 0, 6.283); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, CFG.VORTEX_R - 6, S.time * 1.4, S.time * 1.4 + 4.4); ctx.stroke();
  ctx.strokeStyle = 'rgba(217,164,65,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, CFG.VORTEX_R - 22, -S.time * 1.1, -S.time * 1.1 + 3.6); ctx.stroke();
  ctx.fillStyle = PALETTE.cream;
  ctx.beginPath(); ctx.arc(x, y, 26 + Math.sin(S.time * 3) * 5, 0, 6.283); ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.283); ctx.fill();
  // HP ring
  ctx.strokeStyle = PALETTE.vermilion; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(x, y, CFG.VORTEX_R + 12, -Math.PI / 2, -Math.PI / 2 + (S.tempest.hp / 100) * Math.PI * 2); ctx.stroke();
  text(ctx, 'THE TEMPEST', x, y - CFG.VORTEX_R - 30, 20, PALETTE.vermilion, 'center');
  text(ctx, 'SHATTER ' + S.tempest.charge + '/' + CFG.SHATTER_LETTERS, x, y + CFG.VORTEX_R + 34, 15, PALETTE.goldDeep, 'center');
  ctx.restore();
}

function drawPlane(ctx, S) {
  const p = S.plane;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle + Math.PI / 2);
  ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 18;
  ctx.fillStyle = PALETTE.cream;
  ctx.strokeStyle = PALETTE.goldDeep; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(15, 14); ctx.lineTo(0, 7); ctx.lineTo(-15, 14);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = PALETTE.inkSoft; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(11, 10); ctx.moveTo(0, -8); ctx.lineTo(-11, 10); ctx.stroke();
  ctx.restore();
  if (S.shield > 0) {
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.3 * Math.sin(S.time * 18);
    ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 30, 0, 6.283); ctx.stroke();
    ctx.restore();
  }
}

function drawParticles(ctx, S) {
  for (const pt of S.particles) {
    const a = clamp(pt.life / pt.max, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    if (pt.kind === 'scrap') {
      ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot || 0);
      ctx.fillRect(-pt.size / 2, -pt.size / 4, pt.size, pt.size / 2);
    } else {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }
}

function drawPopups(ctx, S) {
  for (const pp of S.popups) {
    const a = clamp(pp.life / pp.max, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    text(ctx, pp.text, pp.x, pp.y, pp.size, pp.color, 'center');
    ctx.restore();
  }
}

function drawBanner(ctx, S) {
  if (!S.banner) return;
  const k = 1 - S.banner.t / S.banner.max;
  const scale = 1 + 0.25 * Math.sin(Math.min(1, k * 3) * Math.PI);
  ctx.save();
  ctx.translate(CFG.W / 2, 530);
  ctx.scale(scale, scale);
  ctx.globalAlpha = clamp(S.banner.t / 0.5, 0, 1);
  ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 24;
  text(ctx, S.banner.text, 0, 0, 44, PALETTE.goldDeep, 'center');
  ctx.restore();
}

function drawHud(ctx, S) {
  // Top bar: score / front + WIN-LOSE / stamps + combo.
  panel(ctx, 8, 8, 1264, 76, 'rgba(251,246,234,0.95)');
  text(ctx, 'SCORE ' + S.score.toLocaleString('en-US'), 24, 40, 30, PALETTE.ink, 'left');
  text(ctx, 'BEST ' + Math.max(S.best, S.score).toLocaleString('en-US'), 24, 64, 13, PALETTE.slate, 'left');
  const frontLabel = S.front === 4 ? 'TEMPEST — FINAL FRONT' : 'FRONT ' + S.front + ' / 3';
  text(ctx, frontLabel, 640, 32, 21, PALETTE.ink, 'center');
  ctx.fillStyle = PALETTE.paperDark;
  rr(ctx, 510, 42, 260, 10, 5); ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  const frac = S.front === 4 ? (100 - S.tempest.hp) / 100 : S.frontTime / CFG.FRONT_DUR;
  rr(ctx, 510, 42, Math.max(10, 260 * clamp(frac, 0, 1)), 10, 5); ctx.fill();
  text(ctx, 'WIN: clear 3 fronts + break the TEMPEST', 640, 66, 11, PALETTE.inkSoft, 'center', 'normal');
  text(ctx, 'LOSE: hull hits 0', 640, 80, 11, PALETTE.vermilion, 'center', 'normal');
  text(ctx, 'STAMPS ' + S.letters, 1256, 32, 16, PALETTE.ink, 'right');
  text(ctx, 'COMBO x' + comboOf(S).toFixed(2), 1256, 58, 24, PALETTE.goldDeep, 'right');
  // Right panel: picked upgrades, incoming, Tempest status.
  const px = 1052, pw = 220;
  panel(ctx, px, 92, pw, 264, 'rgba(251,246,234,0.94)');
  text(ctx, 'RUN UPGRADES ' + S.picks + '/3', px + 12, 118, 14, PALETTE.ink, 'left');
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(px + 12, 124, pw - 24, 2);
  let uy = 148;
  const picked = UPGRADES.filter((u) => S.upgradesPicked[u.id] > 0);
  if (picked.length === 0) {
    text(ctx, '— none yet —', px + 12, uy, 14, PALETTE.slate, 'left', 'normal');
    uy += 24;
  } else {
    for (const u of picked) {
      drawUpgradeIcon(ctx, u.id, px + 22, uy - 5, 9, PALETTE.goldDeep);
      text(ctx, u.name + (S.upgradesPicked[u.id] > 1 ? ' x' + S.upgradesPicked[u.id] : ''), px + 38, uy, 14, PALETTE.ink, 'left');
      uy += 24;
    }
  }
  uy += 6;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(px + 12, uy, pw - 24, 2);
  uy += 24;
  text(ctx, 'INCOMING', px + 12, uy, 14, PALETTE.ink, 'left');
  uy += 22;
  text(ctx, 'ink blot x' + S.blots.length, px + 12, uy, 14, PALETTE.inkSoft, 'left', 'normal');
  uy += 20;
  text(ctx, 'letter x' + S.notes.length, px + 12, uy, 14, PALETTE.inkSoft, 'left', 'normal');
  if (S.front === 4) {
    uy += 26;
    text(ctx, 'TEMPEST ' + Math.round(S.tempest.hp) + '%', px + 12, uy, 15, PALETTE.vermilion, 'left');
    ctx.fillStyle = PALETTE.paperDark;
    rr(ctx, px + 12, uy + 8, pw - 24, 9, 4); ctx.fill();
    ctx.fillStyle = PALETTE.vermilion;
    rr(ctx, px + 12, uy + 8, Math.max(6, (pw - 24) * S.tempest.hp / 100), 9, 4); ctx.fill();
  }
  // Bottom-left: hull hearts + dash.
  panel(ctx, 8, 636, 300, 44, 'rgba(251,246,234,0.94)');
  for (let i = 0; i < S.maxHull; i++) {
    text(ctx, '♥', 26 + i * 26, 668, 22, i < S.hull ? PALETTE.vermilion : PALETTE.paperDeep, 'left');
  }
  const dcMax = dashCooldown(S);
  const dcFrac = 1 - S.dashCd / dcMax;
  ctx.fillStyle = PALETTE.paperDark;
  rr(ctx, 158, 652, 132, 10, 5); ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  rr(ctx, 158, 652, Math.max(8, 132 * clamp(dcFrac, 0, 1)), 10, 5); ctx.fill();
  text(ctx, S.dashCd <= 0 ? 'DASH READY [SPACE]' : 'DASH …', 158, 644, 11, PALETTE.inkSoft, 'left');
  // Bottom hint strip.
  text(ctx, 'MOUSE / WASD — STEER   ·   SPACE — FOLD-DASH   ·   P — PAUSE   ·   M — SOUND   ·   R — RESTART', 640, 706, 13, PALETTE.inkSoft, 'center', 'normal');
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(30,42,74,0.45)';
  ctx.fillRect(0, 0, CFG.W, CFG.H);
}

function drawTitle(ctx, S) {
  dim(ctx);
  panel(ctx, 240, 96, 800, 528);
  text(ctx, 'PAPER STORM', 640, 200, 68, PALETTE.ink, 'center');
  ctx.fillStyle = PALETTE.vermilion;
  ctx.fillRect(520, 218, 240, 4);
  text(ctx, 'Pilot a paper plane through an ink storm.', 640, 268, 22, PALETTE.inkSoft, 'center', 'normal');
  text(ctx, 'Dodge the blots. Stamp the letters. Break the Tempest.', 640, 298, 22, PALETTE.inkSoft, 'center', 'normal');
  text(ctx, '3 FRONTS + THE TEMPEST', 640, 338, 20, PALETTE.goldDeep, 'center');
  text(ctx, 'UPGRADES:  WAX COAT  ·  SHARP FOLD  ·  TAILWIND', 640, 372, 16, PALETTE.ink, 'center');
  text(ctx, 'MOUSE or WASD / ARROWS — steer      SPACE — fold-dash', 640, 420, 17, PALETTE.ink, 'center', 'normal');
  text(ctx, 'P — pause      M — mute      R — restart', 640, 450, 17, PALETTE.ink, 'center', 'normal');
  text(ctx, 'CLICK OR PRESS ENTER TO START', 640, 516, 24, PALETTE.vermilion, 'center');
  text(ctx, 'BEST ' + S.best.toLocaleString('en-US'), 640, 556, 16, PALETTE.slate, 'center');
}

function drawBreak(ctx, S) {
  dim(ctx);
  panel(ctx, 190, 110, 900, 500);
  text(ctx, 'FRONT ' + S.front + ' CLEARED!', 640, 176, 40, PALETTE.ink, 'center');
  text(ctx, 'CHOOSE AN UPGRADE — 1, 2 or 3, or click a card', 640, 214, 18, PALETTE.inkSoft, 'center', 'normal');
  const cw = 250, gap = 25, x0 = 640 - (cw * 3 + gap * 2) / 2;
  UPGRADES.forEach((u, i) => {
    const x = x0 + i * (cw + gap), y = 250;
    panel(ctx, x, y, cw, 250, PALETTE.cream, PALETTE.goldDeep);
    text(ctx, '[' + (i + 1) + ']', x + cw / 2, y + 36, 16, PALETTE.slate, 'center', 'normal');
    drawUpgradeIcon(ctx, u.id, x + cw / 2, y + 92, 26, PALETTE.goldDeep);
    text(ctx, u.name, x + cw / 2, y + 150, 21, PALETTE.ink, 'center');
    text(ctx, u.desc, x + cw / 2, y + 186, 15, PALETTE.inkSoft, 'center', 'normal');
    if (S.upgradesPicked[u.id] > 0) text(ctx, 'OWNED x' + S.upgradesPicked[u.id], x + cw / 2, y + 220, 14, PALETTE.vermilion, 'center');
  });
  text(ctx, 'SCORE ' + S.score.toLocaleString('en-US') + '   ·   STAMPS ' + S.letters, 640, 556, 17, PALETTE.inkSoft, 'center');
}

function pickedNames(S) {
  const names = UPGRADES.filter((u) => S.upgradesPicked[u.id] > 0).map((u) => u.name + (S.upgradesPicked[u.id] > 1 ? ' x' + S.upgradesPicked[u.id] : ''));
  return names.length ? names.join('  ·  ') : 'none';
}

function drawEnd(ctx, S, won) {
  dim(ctx);
  panel(ctx, 290, 120, 700, 480);
  text(ctx, won ? 'TEMPEST BROKEN!' : 'TORN APART', 640, 210, 54, won ? PALETTE.goldDeep : PALETTE.vermilion, 'center');
  text(ctx, won ? 'The ink storm is stamped flat. You win.' : 'The ink storm got your plane this time.', 640, 250, 18, PALETTE.inkSoft, 'center', 'normal');
  text(ctx, 'SCORE ' + S.score.toLocaleString('en-US'), 640, 316, 36, PALETTE.ink, 'center');
  text(ctx, 'BEST ' + Math.max(S.best, S.score).toLocaleString('en-US') + '    ·    LETTERS ' + S.letters, 640, 352, 17, PALETTE.slate, 'center');
  text(ctx, 'BEST COMBO x' + S.bestCombo.toFixed(2) + '    ·    FRONTS CLEARED ' + S.frontsCleared + '/3', 640, 382, 17, PALETTE.slate, 'center');
  text(ctx, 'UPGRADES: ' + pickedNames(S), 640, 412, 16, PALETTE.ink, 'center');
  text(ctx, 'CLOSE CALLS ' + S.closeCalls, 640, 442, 16, PALETTE.slate, 'center');
  text(ctx, 'PRESS R OR CLICK TO FLY AGAIN', 640, 516, 24, PALETTE.vermilion, 'center');
}

function drawPause(ctx, S) {
  dim(ctx);
  panel(ctx, 440, 280, 400, 160);
  text(ctx, 'PAUSED', 640, 348, 40, PALETTE.ink, 'center');
  text(ctx, 'P to resume', 640, 392, 17, PALETTE.inkSoft, 'center', 'normal');
}
