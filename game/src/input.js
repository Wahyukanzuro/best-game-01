// PAPER STORM — mouse and keyboard input, one small object.
// The plane answers the mouse (it steers toward the cursor) and the keys
// (WASD or arrows drive it directly). Edge actions — dash, start, restart,
// pause, mute, upgrade picks — are queued once per press and consumed by
// the loop, so a held key never fires twice.

export function createInput(canvas) {
  const input = {
    mouseX: 640,
    mouseY: 360,
    mouseFresh: 0, // seconds since the mouse last moved
    keys: new Set(),
    dashQueued: false,
    startQueued: false,
    restartQueued: false,
    pauseQueued: false,
    muteQueued: false,
    choice: 0, // 1, 2 or 3 while an upgrade break is showing
    clickX: -1,
    clickY: -1,
    clickQueued: false,
  };

  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    const p = toCanvas(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseFresh = 0;
  });

  canvas.addEventListener('mousedown', (event) => {
    const p = toCanvas(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseFresh = 0;
    input.clickX = p.x;
    input.clickY = p.y;
    input.clickQueued = true;
    input.startQueued = true;
  });

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    input.keys.add(key);
    if (key === ' ') input.dashQueued = true;
    if (key === 'enter') input.startQueued = true;
    if (key === 'r') input.restartQueued = true;
    if (key === 'p') input.pauseQueued = true;
    if (key === 'm') input.muteQueued = true;
    if (key === '1') input.choice = 1;
    if (key === '2') input.choice = 2;
    if (key === '3') input.choice = 3;
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key.toLowerCase());
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  // The loop calls this once per frame: age the mouse, then hand back the
  // held direction keys as a unit vector (zero when none are held).
  input.steer = function steer(dt) {
    input.mouseFresh += dt;
    let kx = 0;
    let ky = 0;
    if (input.keys.has('a') || input.keys.has('arrowleft')) kx -= 1;
    if (input.keys.has('d') || input.keys.has('arrowright')) kx += 1;
    if (input.keys.has('w') || input.keys.has('arrowup')) ky -= 1;
    if (input.keys.has('s') || input.keys.has('arrowdown')) ky += 1;
    if (kx !== 0 && ky !== 0) {
      const len = Math.hypot(kx, ky);
      kx /= len;
      ky /= len;
    }
    return { kx, ky };
  };

  // Take the queued one-shot actions and clear them, so each press acts once.
  input.takeQueued = function takeQueued() {
    const out = {
      dash: input.dashQueued,
      start: input.startQueued,
      restart: input.restartQueued,
      pause: input.pauseQueued,
      mute: input.muteQueued,
      choice: input.choice,
      click: input.clickQueued,
      clickX: input.clickX,
      clickY: input.clickY,
    };
    input.dashQueued = false;
    input.startQueued = false;
    input.restartQueued = false;
    input.pauseQueued = false;
    input.muteQueued = false;
    input.choice = 0;
    input.clickQueued = false;
    return out;
  };

  // Drop every queued one-shot action without reading them: the loop calls
  // this on each screen change so a stale press never leaks into the next one.
  input.clearQueued = function clearQueued() {
    input.dashQueued = false;
    input.startQueued = false;
    input.restartQueued = false;
    input.pauseQueued = false;
    input.muteQueued = false;
    input.choice = 0;
    input.clickQueued = false;
  };

  return input;
}
