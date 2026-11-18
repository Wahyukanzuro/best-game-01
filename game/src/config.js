// PAPER STORM — shared tuning, palette and the seeded random source.
// Every number that shapes the game lives here so the other files stay small
// and the whole run is reproducible from one seed.

// The play field: a fixed 1280x720 canvas, scaled by CSS in the page.
export const FIELD = { width: 1280, height: 720 };

// Fixed simulation step: the loop always advances the world in STEP slices,
// so a staged run and a live run agree frame for frame.
export const STEP = 1 / 60;

// The paper-and-ink palette. Cream paper, navy ink, vermilion stamps, gold.
export const PALETTE = {
  paper: '#F2E8D5',
  paperDark: '#E6D8BC',
  paperEdge: '#D9C9A6',
  cream: '#FBF6EA',
  ink: '#1E2A4A',
  inkSoft: '#2E3D5C',
  inkPale: '#5A6B8F',
  vermilion: '#C0392B',
  vermilionSoft: '#D96A5B',
  gold: '#D9A441',
  goldSoft: '#E8C47C',
  dark: '#20242E',
  white: '#FFFFFF',
};

// Difficulty and feel, one place to tune them.
export const TUNING = {
  frontDuration: 40, // seconds per weather front (fronts 1-3)
  hullStart: 3,
  hullMax: 5,
  playerRadius: 14,
  playerSpeed: 340, // px per second
  playerAccel: 2600,
  dashTime: 0.18, // seconds of burst
  dashSpeed: 3, // burst multiplier on speed
  dashCooldown: 2.5,
  dashCooldownFast: 1.25, // with the Sharp Fold upgrade
  dashInvuln: 0.35, // seconds of safety around a dash
  shieldTime: 1.5, // seconds of safety after a hit
  comboWindow: 3, // seconds to keep the chain alive
  comboMax: 9,
  letterScore: 100,
  blotPopScore: 25,
  tempestHP: 100,
  tempestLetterDamage: 12,
  blotCap: 48,
  letterCap: 8,
  // Blot spawn interval per front (seconds); the Tempest uses ring spawns.
  blotInterval: [1.0, 0.7, 0.55],
  blotSpeed: [85, 115, 150],
  blotRadius: [15, 34],
  letterInterval: 1.6,
};

// Event flags the world hands back from a step, so the loop can answer them
// with sound, particles and screen changes without peeking at internals.
export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_FRONT = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;
export const EVENT_DASH = 32;
export const EVENT_POP = 64;
export const EVENT_UPGRADE = 128;

// A tiny deterministic generator (mulberry32). Same seed, same storm.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Turn any string (a seed from the URL) into a 32-bit number.
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
