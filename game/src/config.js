// PAPER STORM v2 — config.js: palette, field, tuning, seeded RNG, upgrade catalogue.
// One job: every number the game tunes lives here, nothing else reads magic numbers.

const CFG = {
  W: 1280, H: 720,
  FRONT_DUR: 40,            // seconds per weather front
  PLANE_R: 16,
  PLANE_SPEED: 340,        // px/s, keyboard steering
  MOUSE_SPEED: 460,        // px/s, cursor follow
  DASH_SPEED: 780,         // px/s burst
  DASH_TIME: 0.22,         // seconds of burst
  DASH_CD: 2.5,            // seconds between dashes
  DASH_INVULN: 0.6,        // seconds of invulnerability after a dash
  SHIELD_TIME: 1.2,        // seconds of invulnerability after a hit
  COMBO_WINDOW: 3.0,       // seconds between pickups to keep the chain
  COMBO_STEP: 0.5,         // combo grows this much per chain link
  COMBO_MAX: 5.0,
  LETTER_SCORE: 100,       // base points per letter, times combo
  CLOSE_CALL: 150,         // bonus for grazing a blot
  CLOSE_DIST: 110,         // graze radius
  SHATTER_LETTERS: 10,     // letters collected in the Tempest per shatter pulse
  SHATTER_DMG: 25,         // Tempest HP lost per pulse (percent)
  TEMPEST_HP: 100,
  VORTEX_X: 640, VORTEX_Y: 300, VORTEX_R: 95,
  RING_EVERY: 2.5,         // seconds between blot rings in the Tempest
  RING_COUNT: 8,
};

// Blot spawn tuning per front: interval seconds, simultaneous cap, speed range, size range.
const FRONT_TUNING = [
  null,
  { blotEvery: 1.0, blotCap: 26, letterEvery: 0.9, blotSpeed: [55, 95], blotR: [22, 34], elites: 2 },
  { blotEvery: 0.7, blotCap: 34, letterEvery: 0.8, blotSpeed: [70, 115], blotR: [24, 38], elites: 3 },
  { blotEvery: 0.62, blotCap: 44, letterEvery: 0.7, blotSpeed: [85, 135], blotR: [24, 42], elites: 3 },
];

const PALETTE = {
  paper: '#F2E8D5', paperDark: '#E6D8BE', paperDeep: '#D8C7A4',
  cream: '#FBF6EA', ink: '#1E2A4A', inkSoft: '#2E3D63', inkFaint: '#46587E',
  vermilion: '#C0392B', vermilionSoft: '#D95F4E',
  gold: '#D9A441', goldSoft: '#E8C078', goldDeep: '#A97A24',
  slate: '#5A6B8A', white: '#FFFFFF',
};

// Upgrade catalogue: the three choices offered at every front break.
const UPGRADES = [
  { id: 'wax',   name: 'WAX COAT',   desc: '+1 hull, up to 5' },
  { id: 'fold',  name: 'SHARP FOLD', desc: 'dash recharges twice as fast' },
  { id: 'wind',  name: 'TAILWIND',   desc: 'letters drift toward your plane' },
];

// Deterministic seeded RNG (mulberry32). All gameplay randomness flows through it.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
