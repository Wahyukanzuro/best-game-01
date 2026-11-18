// PAPER STORM v2 — input.js: keyboard + mouse, one job only.
// Produces a plain control object the world steps with; the autopilot builds the
// same shape, so live play and staged screenshots share one code path.

const Input = {
  mouseX: 640, mouseY: 360, mouseIn: false, mouseDown: false,
  keys: {},        // code -> held
  pressed: {},     // code -> pressed since last frame (one-shot)
  clicked: false,  // mouse button pressed since last frame (one-shot)
  _canvas: null,

  init(canvas) {
    this._canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
      this.mouseIn = true;
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true; this.clicked = true;
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
      this.mouseIn = true;
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('mouseleave', () => { this.mouseIn = false; });
  },

  // Snapshot the controls the world consumes this step.
  snapshot() {
    return {
      mx: this.mouseX, my: this.mouseY, mouseIn: this.mouseIn,
      keys: this.keys, pressed: this.pressed, clicked: this.clicked,
    };
  },

  // One-shot flags are consumed at the end of each frame.
  endFrame() {
    this.pressed = {};
    this.clicked = false;
  },

  axis(keys) {
    let x = 0, y = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) x -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) x += 1;
    if (keys['ArrowUp'] || keys['KeyW']) y -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) y += 1;
    return { x, y };
  },
};
