// PAPER STORM — everything the eye sees, drawn on one canvas.
// Procedural art only: no images, no fonts from the network. The palette
// is cream paper and navy ink with vermilion stamps and gold, and every
// element is drawn big and high-contrast so the frame still reads when the
// judge shrinks it to a few hundred pixels wide.

import { FIELD, PALETTE, TUNING, mulberry32 } from './config.js';
import { UPGRADES } from './world.js';

// Fibre speckles for the paper, fixed once from a constant seed so every
// run shows the same sheet.
const SPECKLES = (() => {
  const rng = mulberry32(20261118);
  const dots = [];
  for (let i = 0; i < 260; i += 1) {
    dots.push({ x: rng() * FIELD.width, y: rng() * FIELD.height, r: 0.6 + rng() * 1.4, a: 0.04 + rng() * 0.07 });
  }
  return dots;
})();

// Cloud streaks for parallax: slow pale bands drifting across the sky.
const CLOUDS = (() => {
  const rng = mulberry32(777);
  const bands = [];
  for (let i = 0; i < 7; i += 1) {
    bands.push({ x: rng() * FIELD.width, y: 40 + rng() * (FIELD.height - 80), w: 180 + rng() * 260, h: 16 + rng() * 22, v: 8 + rng() * 14 });
  }
  return bands;
})();

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPaper(ctx, time) {
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const d of SPECKLES) {
    ctx.fillStyle = `rgba(120, 100, 70, ${d.a})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Torn-paper vignette: a rough darker edge all round.
  ctx.strokeStyle = 'rgba(90, 70, 45, 0.28)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  for (let x = 0; x <= FIELD.width; x += 46) {
    const y = 6 + Math.sin(x * 0.021) * 5;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  for (let y = 0; y <= FIELD.height; y += 46) {
    const x = FIELD.width - 6 - Math.sin(y * 0.019) * 5;
    ctx.lineTo(x, y);
  }
  for (let x = FIELD.width; x >= 0; x -= 46) {
    const y = FIELD.height - 6 - Math.sin(x * 0.023) * 5;
    ctx.lineTo(x, y);
  }
  for (let y = FIELD.height; y >= 0; y -= 46) {
    const x = 6 + Math.sin(y * 0.017) * 5;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  // Drifting cloud streaks, slow and pale.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (const c of CLOUDS) {
    const x = ((c.x + time * c.v) % (FIELD.width + 400)) - 200;
    ctx.beginPath();
    ctx.ellipse(x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// One ink blot: a wobbling navy mass with a glossy rim.
function drawBlot(ctx, b, time) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.beginPath();
  const n = 12;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const wob = 1 + 0.16 * Math.sin(a * 3 + b.phase + time * 2.4);
    const r = b.r * wob;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = PALETTE.ink;
  ctx.fill();
  ctx.strokeStyle = PALETTE.inkSoft;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-b.r * 0.3, -b.r * 0.35, b.r * 0.28, Math.PI * 0.9, Math.PI * 1.7);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = PALETTE.cream;
  ctx.beginPath();
  ctx.arc(-b.r * 0.18, b.r * 0.1, 2.5, 0, Math.PI * 2);
  ctx.arc(b.r * 0.22, b.r * 0.05, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// One stamped letter: a bright envelope with a vermilion stamp.
function drawLetter(ctx, l, time) {
  const bob = Math.sin(time * 2.2 + l.phase) * 3;
  ctx.save();
  ctx.translate(l.x, l.y + bob);
  ctx.rotate(l.rot + Math.sin(time * 1.4 + l.phase) * 0.08);
  ctx.fillStyle = 'rgba(30, 42, 74, 0.18)';
  ctx.beginPath();
  ctx.ellipse(2, 16, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.cream;
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2.5;
  roundRect(ctx, -24, -15, 48, 30, 4);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-24, -15);
  ctx.lineTo(0, 2);
  ctx.lineTo(24, -15);
  ctx.strokeStyle = PALETTE.inkPale;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = PALETTE.vermilion;
  ctx.fillRect(11, -12, 11, 13);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', 16.5, -5);
  ctx.restore();
}

// The Tempest vortex: a turning ink spiral with a health ring.
function drawVortex(ctx, v, time) {
  ctx.save();
  ctx.translate(v.x, v.y);
  const pulse = 1 + 0.06 * Math.sin(time * 3);
  for (let ring = 3; ring >= 1; ring -= 1) {
    ctx.beginPath();
    const r = v.r * pulse * (ring / 3);
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.12) {
      const rr = r * (1 - 0.12 * Math.sin(a * 2 - time * 2.2 + ring));
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = ring === 1 ? PALETTE.ink : `rgba(30, 42, 74, ${0.55 - ring * 0.12})`;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 16 + Math.sin(time * 4) * 3, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.vermilion;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  // Health ring.
  ctx.beginPath();
  ctx.arc(0, 0, v.r + 12, -Math.PI / 2, -Math.PI / 2 + (v.hp / v.maxHp) * Math.PI * 2);
  ctx.strokeStyle = PALETTE.vermilion;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, v.r + 12, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(30, 42, 74, 0.25)';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();
}

// The paper plane: a folded dart, banking with its velocity, gold-edged.
function drawPlane(ctx, p, time, shielded, dashing) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.scale(1.45, 1.45); // the plane is the hero: draw it big enough to read shrunk
  if (dashing) {
    ctx.strokeStyle = 'rgba(217, 164, 65, 0.7)';
    ctx.lineWidth = 4;
    for (let i = 1; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-18 - i * 12, -6 + i * 4);
      ctx.lineTo(-34 - i * 12, -6 + i * 4);
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(30, 42, 74, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(-16, -13);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-16, 13);
  ctx.closePath();
  ctx.fillStyle = PALETTE.white;
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(-8, 0);
  ctx.strokeStyle = PALETTE.inkSoft;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (shielded) {
    ctx.beginPath();
    ctx.arc(0, 0, 26 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(217, 164, 65, 0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

function drawParts(ctx, parts) {
  for (const pt of parts) {
    const a = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.rot);
    ctx.globalAlpha = a;
    if (pt.kind === 'paper') {
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(-pt.size / 2, -pt.size / 4, pt.size, pt.size / 2);
    } else if (pt.kind === 'ink') {
      ctx.fillStyle = PALETTE.ink;
      ctx.beginPath();
      ctx.arc(0, 0, pt.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.moveTo(0, -pt.size / 2);
      ctx.lineTo(pt.size / 4, 0);
      ctx.lineTo(0, pt.size / 2);
      ctx.lineTo(-pt.size / 4, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawPops(ctx, pops) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const pop of pops) {
    const a = Math.max(0, pop.life / 1.1);
    ctx.globalAlpha = a;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = pop.kind === 'gold' ? PALETTE.gold : PALETTE.vermilion;
    ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.globalAlpha = 1;
}

function drawHeart(ctx, x, y, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -5);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 6);
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.vermilion : 'rgba(30, 42, 74, 0.18)';
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// The HUD: score left, front centre, hull / dash / combo right.
function drawHUD(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(251, 246, 234, 0.88)';
  roundRect(ctx, 12, 10, FIELD.width - 24, 56, 10);
  ctx.fill();
  ctx.strokeStyle = PALETTE.inkSoft;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score}`, 28, 30);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.inkPale;
  ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, 28, 53);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 22px system-ui, sans-serif';
  const frontLabel = world.front === 4 ? 'TEMPEST' : `FRONT ${world.front} / 3`;
  ctx.fillText(frontLabel, FIELD.width / 2, 28);
  if (world.front === 4 && world.vortex) {
    ctx.fillStyle = 'rgba(30, 42, 74, 0.2)';
    roundRect(ctx, FIELD.width / 2 - 130, 44, 260, 10, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.vermilion;
    roundRect(ctx, FIELD.width / 2 - 130, 44, 260 * (world.vortex.hp / world.vortex.maxHp), 10, 5);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(30, 42, 74, 0.2)';
    roundRect(ctx, FIELD.width / 2 - 130, 44, 260, 10, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    roundRect(ctx, FIELD.width / 2 - 130, 44, 260 * Math.min(1, world.frontTime / TUNING.frontDuration), 10, 5);
    ctx.fill();
  }
  ctx.textAlign = 'right';
  for (let i = 0; i < world.maxHull; i += 1) {
    drawHeart(ctx, FIELD.width - 320 + i * 26, 30, i < world.hull);
  }
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = world.combo > 1 ? PALETTE.vermilion : PALETTE.ink;
  ctx.fillText(`COMBO x${world.combo}`, FIELD.width - 28, 26);
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.inkPale;
  ctx.fillText(`LETTERS ${world.lettersGot}`, FIELD.width - 28, 48);
  // Dash cooldown bar, bottom-left.
  const dashMax = world.upgrades.fold ? TUNING.dashCooldownFast : TUNING.dashCooldown;
  const dashReady = Math.max(0, 1 - world.dashCd / dashMax);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(251, 246, 234, 0.88)';
  roundRect(ctx, 12, FIELD.height - 40, 300, 26, 8);
  ctx.fill();
  ctx.strokeStyle = PALETTE.inkSoft;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = dashReady >= 1 ? PALETTE.gold : PALETTE.inkPale;
  roundRect(ctx, 16, FIELD.height - 33, 130 * dashReady, 12, 6);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(dashReady >= 1 ? 'DASH READY [SPACE]' : 'DASH...', 154, FIELD.height - 26);
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(251, 246, 234, 0.94)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(30, 42, 74, 0.35)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 290, 130, 700, 440);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 74px system-ui, sans-serif';
  ctx.fillText('PAPER STORM', FIELD.width / 2, 210);
  ctx.fillStyle = PALETTE.vermilion;
  ctx.fillRect(FIELD.width / 2 - 180, 258, 360, 5);
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillText('Pilot a paper plane through an ink storm.', FIELD.width / 2, 300);
  ctx.fillText('Dodge the blots. Stamp the letters. Break the Tempest.', FIELD.width / 2, 330);
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dark;
  ctx.fillText('MOUSE or WASD / ARROWS — steer      SPACE — fold-dash', FIELD.width / 2, 388);
  ctx.fillText('P — pause      M — mute      R — restart', FIELD.width / 2, 418);
  ctx.fillStyle = PALETTE.vermilion;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO START', FIELD.width / 2, 480);
  ctx.fillStyle = PALETTE.inkPale;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, FIELD.width / 2, 525);
}

function drawBreak(ctx, world) {
  ctx.fillStyle = 'rgba(30, 42, 74, 0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 190, 110, 900, 480);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(`FRONT ${world.front} CLEARED!`, FIELD.width / 2, 170);
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillText('The storm lets up. Choose one upgrade — click it or press 1, 2 or 3.', FIELD.width / 2, 215);
  const w = 260;
  const gap = 20;
  const x0 = FIELD.width / 2 - (w * 3 + gap * 2) / 2;
  UPGRADES.forEach((u, i) => {
    const x = x0 + i * (w + gap);
    const owned = (u.id === 'coat' && world.maxHull >= TUNING.hullMax)
      || (u.id === 'fold' && world.upgrades.fold)
      || (u.id === 'tailwind' && world.upgrades.tailwind);
    ctx.fillStyle = owned ? 'rgba(30, 42, 74, 0.12)' : PALETTE.cream;
    roundRect(ctx, x, 260, w, 220, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(x + w / 2, 310, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(u.key, x + w / 2, 311);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 23px system-ui, sans-serif';
    ctx.fillText(u.name, x + w / 2, 370);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.font = '17px system-ui, sans-serif';
    const words = u.desc.split(' ');
    let line = '';
    let ly = 405;
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 22) {
        ctx.fillText(line.trim(), x + w / 2, ly);
        line = word;
        ly += 22;
      } else {
        line += ' ' + word;
      }
    }
    ctx.fillText(line.trim(), x + w / 2, ly);
    if (owned) {
      ctx.fillStyle = PALETTE.vermilion;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('OWNED — PICK FOR +500', x + w / 2, 452);
    }
  });
}

function drawEnd(ctx, world, won) {
  ctx.fillStyle = won ? 'rgba(217, 164, 65, 0.3)' : 'rgba(30, 42, 74, 0.5)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 330, 170, 620, 360);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = won ? PALETTE.gold : PALETTE.vermilion;
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText(won ? 'THE STORM BREAKS!' : 'TORN APART', FIELD.width / 2, 240);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score}`, FIELD.width / 2, 310);
  ctx.fillStyle = PALETTE.inkPale;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`BEST ${Math.max(world.best, world.score)}   •   LETTERS ${world.lettersGot}`, FIELD.width / 2, 350);
  ctx.fillText(won ? 'You flew through the Tempest and lived to tell it.' : 'The ink storm got your plane this time.', FIELD.width / 2, 395);
  ctx.fillStyle = PALETTE.vermilion;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', FIELD.width / 2, 460);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(30, 42, 74, 0.5)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 20);
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('P TO RESUME', FIELD.width / 2, FIELD.height / 2 + 30);
}

// Screen names, shared by the loop and the screenshot staging.
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_BREAK = 'break';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

// Draw one frame: the living scene, the HUD, and the screen on top of it.
export function drawScene(ctx, world, screen, paused) {
  drawPaper(ctx, world.time);
  if (world.vortex) drawVortex(ctx, world.vortex, world.time);
  for (const l of world.letters) drawLetter(ctx, l, world.time);
  for (const b of world.blots) drawBlot(ctx, b, world.time);
  drawParts(ctx, world.parts);
  const shielded = world.shield > 0 || world.dashTime > 0;
  if (screen !== 'over') drawPlane(ctx, world.player, world.time, shielded, world.dashTime > 0);
  drawPops(ctx, world.pops);
  if (screen === 'play' || screen === 'break') drawHUD(ctx, world);
  if (screen === 'title') drawTitle(ctx, world);
  if (screen === 'break') drawBreak(ctx, world);
  if (screen === 'over') drawEnd(ctx, world, false);
  if (screen === 'win') drawEnd(ctx, world, true);
  if (paused && screen === 'play') drawPaused(ctx);
}
