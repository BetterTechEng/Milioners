import { mtof, type AudioEngine } from './engine';

/** Where an instrument plays: a dry node and an optional reverb send. */
export interface Out {
  dry: AudioNode;
  wet?: AudioNode;
  /** Reverb send level 0..1 */
  send?: number;
}

function voiceOut(e: AudioEngine, out: Out, level: number, send = out.send ?? 0.3): GainNode {
  const g = e.ctx.createGain();
  g.gain.value = 0;
  g.connect(out.dry);
  if (out.wet && send > 0) {
    const s = e.ctx.createGain();
    s.gain.value = send;
    g.connect(s).connect(out.wet);
  }
  void level;
  return g;
}

function env(p: AudioParam, t: number, a: number, peak: number, hold: number, r: number) {
  p.cancelScheduledValues(t);
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + Math.max(0.002, a));
  p.setValueAtTime(peak, t + a + hold);
  p.exponentialRampToValueAtTime(0.0001, t + a + hold + Math.max(0.01, r));
}

function osc(e: AudioEngine, type: OscillatorType, freq: number, t: number, stop: number, detune = 0) {
  const o = e.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detune;
  o.start(t);
  o.stop(stop);
  return o;
}

function noiseSrc(e: AudioEngine, t: number, stop: number) {
  const s = e.ctx.createBufferSource();
  s.buffer = e.noise;
  s.loop = true;
  s.loopStart = Math.random();
  s.start(t, Math.random());
  s.stop(stop);
  return s;
}

/** Warm string/synth pad: detuned saws through a soft lowpass. */
export function pad(
  e: AudioEngine,
  out: Out,
  t: number,
  notes: number[],
  dur: number,
  o: { vol?: number; cutoff?: number; attack?: number; release?: number; send?: number } = {},
) {
  const vol = (o.vol ?? 0.12) / Math.sqrt(notes.length);
  const attack = o.attack ?? 0.6;
  const release = o.release ?? 1.2;
  const end = t + dur + release + 0.1;
  const g = voiceOut(e, out, vol, o.send ?? 0.5);
  env(g.gain, t, attack, vol, Math.max(0, dur - attack), release);
  const f = e.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime((o.cutoff ?? 1600) * 0.6, t);
  f.frequency.linearRampToValueAtTime(o.cutoff ?? 1600, t + attack + dur * 0.5);
  f.Q.value = 0.7;
  f.connect(g);
  for (const n of notes) {
    const fr = mtof(n);
    osc(e, 'sawtooth', fr, t, end, -8).connect(f);
    osc(e, 'sawtooth', fr, t, end, 8).connect(f);
    const sub = e.ctx.createGain();
    sub.gain.value = 0.6;
    osc(e, 'triangle', fr / 2, t, end).connect(sub).connect(f);
  }
}

/** Short bowed-string stab. */
export function stab(e: AudioEngine, out: Out, t: number, notes: number[], o: { vol?: number; dur?: number; bright?: number } = {}) {
  const vol = (o.vol ?? 0.1) / Math.sqrt(notes.length);
  const dur = o.dur ?? 0.18;
  const g = voiceOut(e, out, vol, 0.35);
  env(g.gain, t, 0.012, vol, dur * 0.3, dur);
  const f = e.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(o.bright ?? 3200, t);
  f.frequency.exponentialRampToValueAtTime(600, t + dur * 1.5);
  f.connect(g);
  for (const n of notes) {
    osc(e, 'sawtooth', mtof(n), t, t + dur * 2 + 0.1, -5).connect(f);
    osc(e, 'square', mtof(n), t, t + dur * 2 + 0.1, 6).connect(f);
  }
}

/** Plucked arpeggio note. */
export function pluck(e: AudioEngine, out: Out, t: number, note: number, o: { vol?: number; dur?: number; type?: OscillatorType; send?: number } = {}) {
  const vol = o.vol ?? 0.08;
  const dur = o.dur ?? 0.35;
  const g = voiceOut(e, out, vol, o.send ?? 0.4);
  env(g.gain, t, 0.004, vol, 0, dur);
  const f = e.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(5000, t);
  f.frequency.exponentialRampToValueAtTime(700, t + dur);
  f.connect(g);
  osc(e, o.type ?? 'triangle', mtof(note), t, t + dur + 0.1).connect(f);
  osc(e, 'sine', mtof(note + 12), t, t + dur + 0.1).connect(f);
}

/** Pulsing synth bass. */
export function bass(e: AudioEngine, out: Out, t: number, note: number, dur: number, vol = 0.18) {
  const g = voiceOut(e, out, vol, 0.05);
  env(g.gain, t, 0.008, vol, dur * 0.5, dur * 0.6);
  const f = e.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(900, t);
  f.frequency.exponentialRampToValueAtTime(220, t + dur);
  f.Q.value = 4;
  f.connect(g);
  osc(e, 'sawtooth', mtof(note), t, t + dur * 1.2 + 0.05).connect(f);
  osc(e, 'sine', mtof(note - 12), t, t + dur * 1.2 + 0.05).connect(g);
}

/** Long sustained low drone with slow filter motion. */
export function drone(e: AudioEngine, out: Out, t: number, note: number, dur: number, vol = 0.1) {
  const g = voiceOut(e, out, vol, 0.4);
  env(g.gain, t, dur * 0.25, vol, dur * 0.5, dur * 0.3);
  const f = e.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(200, t);
  f.frequency.linearRampToValueAtTime(700, t + dur * 0.6);
  f.frequency.linearRampToValueAtTime(250, t + dur);
  f.Q.value = 6;
  f.connect(g);
  osc(e, 'sawtooth', mtof(note), t, t + dur + 0.1, -10).connect(f);
  osc(e, 'sawtooth', mtof(note), t, t + dur + 0.1, 10).connect(f);
  osc(e, 'sine', mtof(note - 12), t, t + dur + 0.1).connect(g);
}

export function kick(e: AudioEngine, out: Out, t: number, vol = 0.5, o: { from?: number; to?: number; decay?: number } = {}) {
  const g = voiceOut(e, out, vol, 0.08);
  const decay = o.decay ?? 0.35;
  env(g.gain, t, 0.002, vol, 0.01, decay);
  const s = osc(e, 'sine', o.from ?? 140, t, t + decay + 0.05);
  s.frequency.exponentialRampToValueAtTime(o.to ?? 42, t + decay * 0.6);
  s.connect(g);
}

/** "Lub-dub" heartbeat. */
export function heartbeat(e: AudioEngine, out: Out, t: number, vol = 0.45) {
  kick(e, out, t, vol, { from: 90, to: 38, decay: 0.28 });
  kick(e, out, t + 0.2, vol * 0.7, { from: 80, to: 36, decay: 0.3 });
}

export function hat(e: AudioEngine, out: Out, t: number, vol = 0.05, decay = 0.05) {
  const g = voiceOut(e, out, vol, 0.15);
  env(g.gain, t, 0.001, vol, 0, decay);
  const f = e.ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7500;
  noiseSrc(e, t, t + decay + 0.05).connect(f).connect(g);
}

export function snare(e: AudioEngine, out: Out, t: number, vol = 0.12, decay = 0.16) {
  const g = voiceOut(e, out, vol, 0.3);
  env(g.gain, t, 0.001, vol, 0, decay);
  const f = e.ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1800;
  f.Q.value = 0.8;
  noiseSrc(e, t, t + decay + 0.05).connect(f).connect(g);
  const tone = e.ctx.createGain();
  tone.gain.value = 0.5;
  const s = osc(e, 'triangle', 190, t, t + 0.1);
  s.frequency.exponentialRampToValueAtTime(120, t + 0.08);
  s.connect(tone).connect(g);
}

export function timpani(e: AudioEngine, out: Out, t: number, note: number, vol = 0.35, decay = 1.6) {
  const g = voiceOut(e, out, vol, 0.5);
  env(g.gain, t, 0.004, vol, 0.02, decay);
  const f = e.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 900;
  f.connect(g);
  const s = osc(e, 'sine', mtof(note) * 1.04, t, t + decay + 0.1);
  s.frequency.exponentialRampToValueAtTime(mtof(note), t + 0.08);
  s.connect(f);
  const s2 = osc(e, 'sine', mtof(note) * 1.5, t, t + decay * 0.5);
  const g2 = e.ctx.createGain();
  g2.gain.value = 0.3;
  s2.connect(g2).connect(f);
  const thump = e.ctx.createGain();
  env(thump.gain, t, 0.001, 0.5, 0, 0.08);
  noiseSrc(e, t, t + 0.12).connect(thump).connect(f);
}

/** Bright metallic bell with inharmonic partials. */
export function bell(e: AudioEngine, out: Out, t: number, note: number, vol = 0.08, decay = 2.2) {
  const g = voiceOut(e, out, vol, 0.6);
  env(g.gain, t, 0.002, vol, 0, decay);
  const base = mtof(note);
  const partials: [number, number][] = [
    [1, 1],
    [2.0, 0.45],
    [2.76, 0.3],
    [5.4, 0.12],
  ];
  for (const [ratio, level] of partials) {
    const pg = e.ctx.createGain();
    pg.gain.value = level;
    osc(e, 'sine', base * ratio, t, t + decay + 0.1).connect(pg).connect(g);
  }
}

/** Brass-like fanfare chord with a filter swell. */
export function brass(e: AudioEngine, out: Out, t: number, notes: number[], dur: number, vol = 0.14) {
  const v = vol / Math.sqrt(notes.length);
  const g = voiceOut(e, out, v, 0.45);
  env(g.gain, t, 0.06, v, Math.max(0, dur - 0.06), 0.5);
  const f = e.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 2;
  f.frequency.setValueAtTime(500, t);
  f.frequency.exponentialRampToValueAtTime(3800, t + 0.12);
  f.frequency.exponentialRampToValueAtTime(1800, t + dur);
  f.connect(g);
  for (const n of notes) {
    osc(e, 'sawtooth', mtof(n), t, t + dur + 0.6, -6).connect(f);
    osc(e, 'sawtooth', mtof(n), t, t + dur + 0.6, 7).connect(f);
  }
}

/** Noise + saw riser that builds into a hit. */
export function riser(e: AudioEngine, out: Out, t: number, dur: number, vol = 0.12) {
  const g = voiceOut(e, out, vol, 0.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
  const f = e.ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 3;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(7000, t + dur);
  f.connect(g);
  noiseSrc(e, t, t + dur + 0.1).connect(f);
  const s = osc(e, 'sawtooth', 110, t, t + dur + 0.1);
  s.frequency.exponentialRampToValueAtTime(880, t + dur);
  const sg = e.ctx.createGain();
  sg.gain.value = 0.25;
  s.connect(sg).connect(f);
}

/** Big cinematic impact. */
export function impact(e: AudioEngine, out: Out, t: number, vol = 0.6) {
  kick(e, out, t, vol, { from: 120, to: 28, decay: 1.4 });
  const g = voiceOut(e, out, vol * 0.4, 0.8);
  env(g.gain, t, 0.002, vol * 0.4, 0, 0.9);
  const f = e.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(4000, t);
  f.frequency.exponentialRampToValueAtTime(200, t + 0.8);
  noiseSrc(e, t, t + 1).connect(f).connect(g);
}

export function whoosh(e: AudioEngine, out: Out, t: number, dur = 0.6, vol = 0.12, up = true) {
  const g = voiceOut(e, out, vol, 0.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f = e.ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.5;
  f.frequency.setValueAtTime(up ? 400 : 5000, t);
  f.frequency.exponentialRampToValueAtTime(up ? 5000 : 300, t + dur);
  noiseSrc(e, t, t + dur + 0.05).connect(f).connect(g);
}

export function reverseCymbal(e: AudioEngine, out: Out, t: number, dur = 1.2, vol = 0.12) {
  const g = voiceOut(e, out, vol, 0.4);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
  const f = e.ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 5000;
  noiseSrc(e, t, t + dur + 0.05).connect(f).connect(g);
}

export function shimmer(e: AudioEngine, out: Out, t: number, root: number, vol = 0.05, count = 10) {
  const scale = [0, 4, 7, 11, 12, 16, 19, 24];
  for (let i = 0; i < count; i++) {
    bell(e, out, t + i * 0.045, root + scale[i % scale.length] + 12 * Math.floor(i / scale.length), vol, 1.2);
  }
}

/** Simple tone used for phone sounds and beeps. */
export function tone(e: AudioEngine, out: Out, t: number, freq: number, dur: number, vol = 0.1, type: OscillatorType = 'sine') {
  const g = voiceOut(e, out, vol, 0.05);
  env(g.gain, t, 0.005, vol, Math.max(0, dur - 0.015), 0.01);
  osc(e, type, freq, t, t + dur + 0.05).connect(g);
}

/** Murmuring crowd built from modulated formant-filtered noise. */
export function crowd(e: AudioEngine, out: Out, t: number, dur: number, vol = 0.1) {
  const g = voiceOut(e, out, vol, 0.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.8);
  g.gain.setValueAtTime(vol, t + dur - 0.8);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  for (const fr of [450, 900, 1500, 2400]) {
    const f = e.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = fr;
    f.Q.value = 6;
    const lfo = osc(e, 'sine', 2 + Math.random() * 4, t, t + dur + 0.1);
    const depth = e.ctx.createGain();
    depth.gain.value = fr * 0.15;
    lfo.connect(depth).connect(f.frequency);
    noiseSrc(e, t, t + dur + 0.1).connect(f).connect(g);
  }
}
