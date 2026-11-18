// PAPER STORM v2 — audio.js: synthesized sound only, no audio files.
// WebAudio oscillators + filtered noise; every call is a no-op until the first
// user gesture creates the context, and a no-op while muted. Sound never touches
// game state, so it cannot affect the deterministic simulation.

const Sound = {
  ctx: null, master: null, muted: false, windSrc: null, windGain: null, windFilter: null,

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this._startWind();
    } catch (e) { this.ctx = null; }
  },

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  },

  // Quiet looping wind: brown-ish noise through a lowpass, pitch follows the storm.
  _startWind() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    this.windSrc = this.ctx.createBufferSource();
    this.windSrc.buffer = buf; this.windSrc.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass'; this.windFilter.frequency.value = 320;
    this.windGain = this.ctx.createGain(); this.windGain.gain.value = 0.05;
    this.windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    this.windSrc.start();
  },

  // 0 = calm front 1, 1 = full Tempest.
  setWind(level) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.04 + 0.06 * level, t, 0.4);
    this.windFilter.frequency.setTargetAtTime(300 + 700 * level, t, 0.4);
  },

  _tone(freq0, freq1, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  _noise(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t);
  },

  pickup() { this._tone(660, 990, 0.12, 'sine', 0.25); this._tone(1320, 1320, 0.08, 'triangle', 0.12); },
  hit() { this._noise(0.25, 0.5, 500); this._tone(160, 50, 0.3, 'sawtooth', 0.3); },
  dash() { this._noise(0.18, 0.25, 2400); },
  shatter() { this._tone(520, 1560, 0.35, 'triangle', 0.3); this._noise(0.3, 0.3, 3000); },
  click() { this._tone(880, 880, 0.05, 'square', 0.08); },
  front() { this._tone(392, 523, 0.25, 'triangle', 0.2); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, f, 0.3, 'triangle', 0.22), i * 140)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this._tone(f, f, 0.3, 'sine', 0.2), i * 160)); },
};
