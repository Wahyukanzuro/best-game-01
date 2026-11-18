// PAPER STORM — every sound is synthesised with WebAudio, no audio files.
// A quiet wind loop runs under play (its pitch rises with the front), and
// short blips answer each action: stamp, dash, hit, win, lose. Everything
// is guarded: with no AudioContext, or before the first gesture, every
// call is a silent no-op. M toggles mute.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    windGain: null,
    windFilter: null,
    muted: false,
    front: 1,
  };

  // Build the context on the first user gesture (browsers block it before).
  audio.ensure = function ensure() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      audio.ctx = new Ctor();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.muted ? 0 : 0.9;
      audio.master.connect(audio.ctx.destination);
      audio.startWind();
    } catch (err) {
      audio.ctx = null;
    }
  };

  // A two-second loop of brown noise through a low-pass filter: the wind.
  audio.startWind = function startWind() {
    const ctx = audio.ctx;
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    audio.windFilter = ctx.createBiquadFilter();
    audio.windFilter.type = 'lowpass';
    audio.windFilter.frequency.value = 320;
    audio.windGain = ctx.createGain();
    audio.windGain.gain.value = 0.045;
    src.connect(audio.windFilter);
    audio.windFilter.connect(audio.windGain);
    audio.windGain.connect(audio.master);
    src.start();
  };

  // The storm thickens: the wind gets louder and brighter per front.
  audio.setFront = function setFront(front) {
    audio.front = front;
    if (!audio.ctx || !audio.windFilter || !audio.windGain) return;
    const t = audio.ctx.currentTime;
    audio.windFilter.frequency.setTargetAtTime(320 + front * 90, t, 0.4);
    audio.windGain.gain.setTargetAtTime(0.04 + front * 0.012, t, 0.4);
  };

  audio.setMuted = function setMuted(muted) {
    audio.muted = muted;
    if (audio.master) audio.master.gain.value = muted ? 0 : 0.9;
  };

  // One short oscillator blip with an exponential tail.
  function tone(freq, dur, type, vol, slideTo) {
    if (!audio.ctx || !audio.master) return;
    const t = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // A short burst of filtered noise: splats, flutters, paper.
  function noiseBurst(dur, filterFreq, vol) {
    if (!audio.ctx || !audio.master) return;
    const ctx = audio.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start();
  }

  // A letter is stamped: a bright two-note thunk plus a paper tick.
  audio.pickup = function pickup(combo) {
    const base = 520 + Math.min(combo, 9) * 28;
    tone(base, 0.09, 'triangle', 0.22);
    tone(base * 1.5, 0.12, 'triangle', 0.14, base * 2);
    noiseBurst(0.05, 2400, 0.1);
  };

  // A blot hits the hull: a low thud and an ink splat.
  audio.hit = function hit() {
    tone(160, 0.22, 'sawtooth', 0.25, 60);
    noiseBurst(0.18, 500, 0.3);
  };

  // The fold-dash: paper flutter, a fast rising sweep.
  audio.dash = function dash() {
    noiseBurst(0.16, 1800, 0.22);
    tone(300, 0.16, 'sine', 0.12, 900);
  };

  // A blot pops under a dash: a small crisp pop.
  audio.pop = function pop() {
    tone(700, 0.07, 'square', 0.12, 240);
    noiseBurst(0.06, 1200, 0.14);
  };

  // A front is cleared: a short rising chime.
  audio.frontClear = function frontClear() {
    tone(440, 0.12, 'triangle', 0.18);
    setTimeout(() => tone(660, 0.16, 'triangle', 0.18), 90);
  };

  // The storm breaks: a little major arpeggio.
  audio.win = function win() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => tone(f, 0.22, 'triangle', 0.2), i * 110);
    });
  };

  // The plane is torn apart: a short descending line.
  audio.lose = function lose() {
    [392, 330, 262, 196].forEach((f, i) => {
      setTimeout(() => tone(f, 0.25, 'sawtooth', 0.14), i * 130);
    });
  };

  // A menu click: one dry tick.
  audio.click = function click() {
    tone(880, 0.05, 'square', 0.1);
  };

  return audio;
}
