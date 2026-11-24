// Synthesised WebAudio sound effects and music — no audio files.
export class AudioSys {
  constructor() {
    this.ctx = null; this.master = null; this.musicOn = true;
    this.engineOsc = null; this.engineGain = null;
    this.sirenOsc = null; this.sirenGain = null; this.sirenTimer = null;
    this.musicTimer = null; this.musicStep = 0;
  }
  // Must be called from a user gesture (start button).
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // Engine hum: two detuned saws through a lowpass, pitch follows speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(lp); lp.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Police siren: square wave alternating 700/950 Hz.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'square';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    this.sirenTimer = setInterval(() => {
      if (!this.ctx) return;
      this.sirenOsc.frequency.value = this.sirenOsc.frequency.value < 800 ? 950 : 700;
    }, 420);
    this.startMusic();
  }
  setEngine(speed01, on) {
    if (!this.ctx) return;
    this.engineOsc.frequency.value = 50 + speed01 * 140;
    this.engineGain.gain.value = on ? 0.05 + speed01 * 0.06 : 0;
  }
  setSiren(on) { if (this.ctx) this.sirenGain.gain.value = on ? 0.045 : 0; }
  tone(freq, dur, type = 'sine', vol = 0.2, slideTo = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.25, freq = 1200) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }
  shot() { this.noise(0.14, 0.4, 2600); this.tone(180, 0.1, 'square', 0.16, 60); }
  punch() { this.noise(0.08, 0.3, 500); this.tone(120, 0.08, 'sine', 0.2, 70); }
  crash() { this.noise(0.3, 0.35, 700); this.tone(90, 0.25, 'sawtooth', 0.2, 40); }
  pickup() { this.tone(660, 0.09, 'sine', 0.2); setTimeout(() => this.tone(990, 0.12, 'sine', 0.2), 90); }
  click() { this.tone(1200, 0.04, 'square', 0.08); }
  denied() { this.tone(160, 0.18, 'square', 0.15, 110); }
  missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.22), i * 110)); }
  busted() { this.tone(440, 0.4, 'sawtooth', 0.18, 220); this.tone(220, 0.5, 'sawtooth', 0.15, 110); }
  // Loose sunny loop: Am – F – C – G bass with a plucky arpeggio, scheduled per bar.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const bass = [110, 87.31, 130.81, 98];
    const arp = [440, 523.25, 659.25, 880, 659.25, 523.25];
    this.musicTimer = setInterval(() => {
      if (!this.musicOn || !this.ctx || this.ctx.state !== 'running') return;
      const bar = this.musicStep++ % 4;
      this.tone(bass[bar], 0.9, 'triangle', 0.10);
      const n = arp[(this.musicStep * 2) % arp.length];
      this.tone(n, 0.22, 'square', 0.035);
      this.tone(n * 1.5, 0.22, 'square', 0.025);
    }, 460);
  }
  toggleMusic() { this.musicOn = !this.musicOn; return this.musicOn; }
}
