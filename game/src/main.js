// PAPER STORM v2 — main.js: the live game loop and state machine. One job:
// wire input, sound, world and render together, and stage ?shot= scenes.

(function () {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = parseInt(params.get('seed') || '1', 10) || 1;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  Input.init(canvas);

  let S = createWorld(seed);
  let last = performance.now();
  let acc = 0;

  function startFresh() {
    S = createWorld(seed);
    S.best = window.__best || 0;
    startRun(S);
    Sound.ensure();
    Sound.setWind(0.25);
  }

  function toBreakPick(i) {
    if (S.state !== 'break') return;
    pickUpgrade(S, UPGRADES[i].id);
    advanceFront(S);
    Sound.ensure();
  }

  if (shot) {
    // Staged screenshot: simulate forward, render one frame, stop.
    S = stageShot(shot, seed);
    drawScene(ctx, S);
    window.__shotReady = true;
    return;
  }

  function frame(now) {
    const dtMs = Math.min(100, now - last);
    last = now;
    acc += dtMs / 1000;
    if (acc > 0.25) acc = 0.25; // never spiral after a long title/break pause
    const ctl = Input.snapshot();
    // Global keys.
    if (ctl.pressed['KeyM']) Sound.setMuted(!Sound.muted);
    if (ctl.pressed['KeyP']) {
      if (S.state === 'play') { S.prevState = 'play'; S.state = 'pause'; }
      else if (S.state === 'pause') S.state = 'play';
    }
    if (S.state === 'title') {
      if (ctl.pressed['Enter'] || ctl.clicked) { startFresh(); Sound.click(); }
      stepWorld(S, ctl, DT);
    } else if (S.state === 'break') {
      if (ctl.pressed['Digit1']) toBreakPick(0);
      else if (ctl.pressed['Digit2']) toBreakPick(1);
      else if (ctl.pressed['Digit3']) toBreakPick(2);
      else if (ctl.clicked) {
        // Click a card: three cards, same geometry as render.js drawBreak.
        const cw = 250, gap = 25, x0 = 640 - (cw * 3 + gap * 2) / 2;
        const r = canvas.getBoundingClientRect();
        const mx = (ctl.mx), my = (ctl.my);
        for (let i = 0; i < 3; i++) {
          const x = x0 + i * (cw + gap);
          if (mx >= x && mx <= x + cw && my >= 250 && my <= 500) { toBreakPick(i); break; }
        }
      }
      stepWorld(S, ctl, DT);
    } else if (S.state === 'over' || S.state === 'win') {
      if (ctl.pressed['KeyR'] || ctl.clicked) { startFresh(); Sound.click(); }
      stepWorld(S, ctl, DT);
    } else if (S.state === 'play') {
      while (acc >= DT) { stepWorld(S, Input.snapshot(), DT); acc -= DT; }
      if (ctl.pressed['KeyR']) startFresh();
      if (S.state === 'over' || S.state === 'win') window.__best = S.best;
    } else if (S.state === 'pause') {
      stepWorld(S, ctl, DT);
    }
    Input.endFrame();
    drawScene(ctx, S);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
