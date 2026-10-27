import type { AudioEngine } from './engine';
import {
  bass,
  bell,
  brass,
  drone,
  hat,
  heartbeat,
  impact,
  kick,
  pad,
  pluck,
  reverseCymbal,
  riser,
  shimmer,
  snare,
  stab,
  timpani,
  type Out,
} from './synth';

/** Looping, step-sequenced track (16th-note steps). */
interface LoopTrack {
  kind: 'loop';
  bpm: number;
  steps: number;
  send: number;
  step(e: AudioEngine, out: Out, step: number, t: number, sd: number): void;
}

/** One-shot musical sting scheduled in absolute time. Returns its length in seconds. */
interface StingTrack {
  kind: 'sting';
  send: number;
  play(e: AudioEngine, out: Out, t: number): number;
}

type Track = LoopTrack | StingTrack;

export type MusicId =
  | 'lobby'
  | 'tension1'
  | 'tension2'
  | 'tension3'
  | 'tension4'
  | 'suspense1'
  | 'suspense2'
  | 'suspense3'
  | 'suspense4'
  | 'afterglow'
  | 'aftermath'
  | 'celebration'
  | 'intro'
  | 'success'
  | 'threshold'
  | 'fail'
  | 'victory'
  | 'farewell';

// D minor tension progression: Dm – Bb – Gm – A (2 bars each).
const MINOR_PROG = [
  [50, 53, 57, 62],
  [46, 50, 53, 58],
  [43, 50, 55, 58],
  [45, 49, 52, 57],
];
// D major bright progression: D – G – Bm – A.
const MAJOR_PROG = [
  [50, 54, 57, 62],
  [43, 50, 55, 59],
  [47, 50, 54, 59],
  [45, 49, 52, 57],
];

const chordAt = (prog: number[][], step: number, stepsPerChord = 32) =>
  prog[Math.floor(step / stepsPerChord) % prog.length];

function tension(tier: 1 | 2 | 3): LoopTrack {
  const bpm = tier === 1 ? 92 : tier === 2 ? 100 : 108;
  return {
    kind: 'loop',
    bpm,
    steps: 128,
    send: 0.35,
    step(e, out, s, t, sd) {
      const chord = chordAt(MINOR_PROG, s);
      const root = chord[0] - 12;
      if (s % 32 === 0) {
        pad(e, out, t, chord.map((n) => n + 12), sd * 32, {
          vol: tier === 1 ? 0.09 : 0.11,
          cutoff: tier === 1 ? 1100 : tier === 2 ? 1500 : 2100,
          attack: 0.8,
          release: 1.2,
        });
        bell(e, out, t, chord[3] + 24, tier === 3 ? 0.05 : 0.04, 2.5);
      }
      // Bass pulse: quarters → eighths → sixteenths as tension grows.
      const bassEvery = tier === 1 ? 4 : tier === 2 ? 2 : 1;
      if (s % bassEvery === 0) bass(e, out, t, root, sd * bassEvery * 0.9, tier === 3 ? 0.13 : 0.15);
      if (tier === 1 && s % 16 === 0) heartbeat(e, out, t, 0.28);
      if (tier >= 2 && s % 4 === 0) kick(e, out, t, tier === 3 ? 0.42 : 0.3, { decay: 0.25 });
      if (s % 4 === 2) hat(e, out, t, tier === 1 ? 0.025 : 0.04);
      if (tier >= 2) {
        const arp = [chord[1], chord[2], chord[3], chord[2] + 12][s % 4];
        pluck(e, out, t, arp + 12, { vol: tier === 2 ? 0.045 : 0.05, dur: 0.22 });
      }
      if (tier === 3) {
        const pattern = [1, 0, 1, 0, 1, 1, 0, 1];
        if (pattern[s % 8] && s % 2 === 0) stab(e, out, t, [chord[1] + 12, chord[3] + 12], { vol: 0.07 });
        if (s % 16 === 8) snare(e, out, t, 0.08);
        if (s % 32 === 0) timpani(e, out, t, root, 0.3);
        if (s % 128 === 112) riser(e, out, t, sd * 16, 0.07);
      }
      if (tier === 2 && s % 32 === 28) {
        snare(e, out, t, 0.05, 0.08);
        snare(e, out, t + sd, 0.07, 0.08);
        snare(e, out, t + sd * 2, 0.09, 0.08);
      }
    },
  };
}

const finalTension: LoopTrack = {
  kind: 'loop',
  bpm: 66,
  steps: 64,
  send: 0.5,
  step(e, out, s, t, sd) {
    if (s % 64 === 0) {
      drone(e, out, t, 38, sd * 64, 0.11);
      pad(e, out, t, [62, 65, 69, 76], sd * 64, { vol: 0.08, cutoff: 1800, attack: 2, release: 1.5 });
    }
    if (s % 4 === 0) heartbeat(e, out, t, 0.42);
    if (s % 16 === 0) timpani(e, out, t, 38, 0.32, 2);
    // High tremolo strings with a dissonant semitone rub.
    if (s % 1 === 0) {
      const n = s % 32 < 16 ? [74, 77] : [75, 77];
      stab(e, out, t, n, { vol: 0.03, dur: 0.08, bright: 4500 });
    }
    if (s % 32 === 30) bell(e, out, t, 81, 0.035, 3);
    if (s % 64 === 48) riser(e, out, t, sd * 16, 0.06);
  },
};

function suspense(tier: 1 | 2 | 3 | 4): LoopTrack {
  return {
    kind: 'loop',
    bpm: 72 + tier * 8,
    steps: 64,
    send: 0.45,
    step(e, out, s, t, sd) {
      if (s % 64 === 0) {
        drone(e, out, t, 38, sd * 64, 0.09 + tier * 0.01);
        pad(e, out, t, [57, 62, 64, 69], sd * 64, { vol: 0.07, cutoff: 1300 + tier * 300, attack: 1.5 });
      }
      if (s % 4 === 0) heartbeat(e, out, t, 0.32 + tier * 0.04);
      // Clock-like ticking that builds the wait for the reveal.
      if (s % 2 === 0) pluck(e, out, t, s % 4 === 0 ? 86 : 81, { vol: 0.03, dur: 0.06, type: 'square', send: 0.2 });
      if (tier >= 3 && s % 1 === 0 && s % 2 === 1) hat(e, out, t, 0.02, 0.03);
      if (s % 32 === 24) riser(e, out, t, sd * 8, 0.04 + tier * 0.01);
      if (s % 16 === 0) timpani(e, out, t, 38, 0.18 + tier * 0.03, 1.2);
    },
  };
}

const lobby: LoopTrack = {
  kind: 'loop',
  bpm: 80,
  steps: 128,
  send: 0.55,
  step(e, out, s, t, sd) {
    const chord = chordAt(MAJOR_PROG, s);
    if (s % 32 === 0) pad(e, out, t, chord.map((n) => n + 12), sd * 32, { vol: 0.08, cutoff: 1300, attack: 1.5 });
    if (s % 8 === 0) bass(e, out, t, chord[0] - 12, sd * 6, 0.1);
    if (s % 2 === 0) {
      const arp = [chord[0], chord[1], chord[2], chord[3], chord[2], chord[1], chord[3] + 12, chord[2] + 12][(s / 2) % 8];
      pluck(e, out, t, arp + 12, { vol: 0.035, dur: 0.5, send: 0.6 });
    }
    if (s % 16 === 0) bell(e, out, t + sd * 2, chord[3] + 24, 0.025, 3);
  },
};

const afterglow: LoopTrack = {
  kind: 'loop',
  bpm: 84,
  steps: 128,
  send: 0.6,
  step(e, out, s, t, sd) {
    const chord = chordAt(MAJOR_PROG, s);
    if (s % 32 === 0) pad(e, out, t, chord.map((n) => n + 12), sd * 32, { vol: 0.08, cutoff: 2000, attack: 1.2 });
    if (s % 4 === 0) {
      const n = [chord[3] + 12, chord[2] + 12, chord[1] + 24, chord[2] + 12][(s / 4) % 4];
      bell(e, out, t, n, 0.03, 2);
    }
    if (s % 16 === 0) bass(e, out, t, chord[0] - 12, sd * 14, 0.09);
  },
};

const aftermath: LoopTrack = {
  kind: 'loop',
  bpm: 60,
  steps: 64,
  send: 0.6,
  step(e, out, s, t, sd) {
    if (s % 64 === 0) drone(e, out, t, 38, sd * 64, 0.08);
    if (s % 32 === 0) pad(e, out, t, s % 64 === 0 ? [62, 65, 69] : [58, 62, 65], sd * 32, { vol: 0.07, cutoff: 900, attack: 2 });
    if (s % 8 === 4) pluck(e, out, t, [74, 72, 69, 65][(s / 8) % 4 | 0], { vol: 0.03, dur: 1.2, send: 0.7 });
  },
};

const celebration: LoopTrack = {
  kind: 'loop',
  bpm: 120,
  steps: 128,
  send: 0.35,
  step(e, out, s, t, sd) {
    const chord = chordAt(MAJOR_PROG, s);
    if (s % 4 === 0) kick(e, out, t, 0.45, { decay: 0.3 });
    if (s % 8 === 4) snare(e, out, t, 0.12);
    if (s % 2 === 1) hat(e, out, t, 0.04);
    if (s % 2 === 0) bass(e, out, t, chord[0] - 12 + (s % 4 === 2 ? 12 : 0), sd * 1.8, 0.13);
    if (s % 32 === 0) pad(e, out, t, chord.map((n) => n + 12), sd * 32, { vol: 0.08, cutoff: 2600, attack: 0.3 });
    if (s % 16 === 0 || s % 16 === 6 || s % 16 === 12) brass(e, out, t, chord.map((n) => n + 12), sd * 1.5, 0.08);
    pluck(e, out, t, [chord[1], chord[2], chord[3], chord[2] + 12][s % 4] + 24, { vol: 0.025, dur: 0.18 });
  },
};

/* ---------- Stings ---------- */

const intro: StingTrack = {
  kind: 'sting',
  send: 0.5,
  play(e, out, t) {
    riser(e, out, t, 1.8, 0.12);
    reverseCymbal(e, out, t + 0.6, 1.2, 0.1);
    impact(e, out, t + 1.8, 0.6);
    brass(e, out, t + 1.8, [50, 57, 62, 65], 0.9, 0.16);
    timpani(e, out, t + 1.8, 38, 0.4);
    brass(e, out, t + 2.8, [46, 53, 58, 62], 0.9, 0.16);
    timpani(e, out, t + 2.8, 34, 0.35);
    brass(e, out, t + 3.8, [48, 55, 60, 64], 0.9, 0.16);
    timpani(e, out, t + 3.8, 36, 0.35);
    for (let i = 0; i < 12; i++) snare(e, out, t + 4.6 + i * 0.07, 0.03 + i * 0.008, 0.08);
    for (let i = 0; i < 8; i++) pluck(e, out, t + 4.6 + i * 0.1, [62, 66, 69, 74, 78, 81, 86, 90][i], { vol: 0.05 });
    impact(e, out, t + 5.5, 0.7);
    brass(e, out, t + 5.5, [50, 57, 62, 66, 69], 2.6, 0.2);
    timpani(e, out, t + 5.5, 38, 0.5, 2.5);
    shimmer(e, out, t + 5.5, 74, 0.04, 14);
    pad(e, out, t + 5.5, [62, 66, 69, 74], 2.5, { vol: 0.1, cutoff: 3000, attack: 0.1, release: 2 });
    return 8.6;
  },
};

const success: StingTrack = {
  kind: 'sting',
  send: 0.55,
  play(e, out, t) {
    impact(e, out, t, 0.35);
    brass(e, out, t, [62, 66, 69, 74], 1.4, 0.17);
    shimmer(e, out, t + 0.05, 74, 0.045, 12);
    [74, 78, 81, 86].forEach((n, i) => bell(e, out, t + 0.35 + i * 0.16, n, 0.06, 2));
    pad(e, out, t + 0.2, [62, 66, 69, 74], 2.2, { vol: 0.08, cutoff: 2600, attack: 0.2 });
    timpani(e, out, t, 38, 0.3);
    return 3.2;
  },
};

const threshold: StingTrack = {
  kind: 'sting',
  send: 0.55,
  play(e, out, t) {
    riser(e, out, t, 0.7, 0.1);
    impact(e, out, t + 0.7, 0.55);
    brass(e, out, t + 0.7, [50, 57, 62, 66], 0.6, 0.18);
    brass(e, out, t + 1.35, [43, 55, 59, 62], 0.6, 0.18);
    brass(e, out, t + 2.0, [45, 57, 61, 64], 0.6, 0.18);
    brass(e, out, t + 2.65, [50, 57, 62, 66, 69, 74], 2.2, 0.22);
    [0.7, 1.35, 2.0].forEach((d) => timpani(e, out, t + d, 38, 0.35));
    timpani(e, out, t + 2.65, 38, 0.5, 2.5);
    shimmer(e, out, t + 2.65, 74, 0.05, 16);
    reverseCymbal(e, out, t + 1.45, 1.2, 0.1);
    return 5.4;
  },
};

const fail: StingTrack = {
  kind: 'sting',
  send: 0.6,
  play(e, out, t) {
    impact(e, out, t, 0.7);
    timpani(e, out, t, 33, 0.5, 2.4);
    brass(e, out, t, [46, 53, 58, 61], 0.9, 0.17);
    brass(e, out, t + 0.95, [45, 52, 57, 60], 0.9, 0.16);
    brass(e, out, t + 1.9, [44, 51, 56, 59], 1.8, 0.15);
    drone(e, out, t, 26, 3.8, 0.12);
    timpani(e, out, t + 1.9, 32, 0.4, 2.4);
    return 4.2;
  },
};

const victory: StingTrack = {
  kind: 'sting',
  send: 0.5,
  play(e, out, t) {
    riser(e, out, t, 1.4, 0.13);
    reverseCymbal(e, out, t + 0.2, 1.2, 0.12);
    const prog: [number, number[]][] = [
      [1.4, [50, 57, 62, 66, 69]],
      [2.3, [43, 55, 59, 62, 67]],
      [3.2, [45, 57, 61, 64, 69]],
      [4.1, [47, 54, 59, 62, 66]],
      [5.0, [43, 55, 59, 62, 67]],
      [5.9, [45, 57, 61, 64, 69]],
    ];
    for (const [d, ch] of prog) {
      impact(e, out, t + d, 0.4);
      brass(e, out, t + d, ch, 0.8, 0.2);
      timpani(e, out, t + d, ch[0] - 12, 0.4);
    }
    for (let i = 0; i < 16; i++) snare(e, out, t + 6.4 + i * 0.05, 0.03 + i * 0.006, 0.06);
    impact(e, out, t + 7.2, 0.8);
    brass(e, out, t + 7.2, [50, 57, 62, 66, 69, 74], 3.4, 0.25);
    timpani(e, out, t + 7.2, 38, 0.6, 3);
    shimmer(e, out, t + 7.2, 74, 0.05, 20);
    pad(e, out, t + 7.2, [62, 66, 69, 74, 78], 3.2, { vol: 0.12, cutoff: 3500, attack: 0.1, release: 2.5 });
    return 11;
  },
};

const farewell: StingTrack = {
  kind: 'sting',
  send: 0.6,
  play(e, out, t) {
    pad(e, out, t, [62, 65, 69], 1.4, { vol: 0.1, cutoff: 1500, attack: 0.3 });
    pad(e, out, t + 1.4, [58, 62, 65], 1.4, { vol: 0.1, cutoff: 1500, attack: 0.3 });
    pad(e, out, t + 2.8, [57, 61, 64, 69], 2.4, { vol: 0.1, cutoff: 1800, attack: 0.3, release: 2 });
    [74, 72, 69, 73].forEach((n, i) => bell(e, out, t + i * 1.4, n, 0.05, 2.4));
    return 5.4;
  },
};

const TRACKS: Record<MusicId, Track> = {
  lobby,
  tension1: tension(1),
  tension2: tension(2),
  tension3: tension(3),
  tension4: finalTension,
  suspense1: suspense(1),
  suspense2: suspense(2),
  suspense3: suspense(3),
  suspense4: suspense(4),
  afterglow,
  aftermath,
  celebration,
  intro,
  success,
  threshold,
  fail,
  victory,
  farewell,
};

interface Playing {
  id: MusicId;
  gain: GainNode;
  timer: number;
  stopped: boolean;
}

/** Plays one music track at a time with crossfades and sting → loop chaining. */
export class MusicPlayer {
  private current: Playing | null = null;

  constructor(private e: AudioEngine) {}

  get currentId(): MusicId | null {
    return this.current && !this.current.stopped ? this.current.id : null;
  }

  play(id: MusicId, opts: { fade?: number; delay?: number; then?: MusicId; restart?: boolean } = {}) {
    if (this.current && !this.current.stopped && this.current.id === id && !opts.restart) return;
    const fade = opts.fade ?? 1.2;
    this.stop(Math.min(fade, 1.5));
    const e = this.e;
    const track = TRACKS[id];
    const t0 = e.now + 0.06 + (opts.delay ?? 0);
    const gain = e.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, e.now);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(1, t0 + (track.kind === 'sting' ? 0.02 : fade));
    gain.connect(e.musicBus);
    const send = e.ctx.createGain();
    send.gain.value = track.send;
    gain.connect(send).connect(e.musicVerb);
    const out: Out = { dry: gain };

    const playing: Playing = { id, gain, timer: 0, stopped: false };
    this.current = playing;

    if (track.kind === 'sting') {
      const len = track.play(e, out, t0);
      playing.timer = window.setInterval(() => {
        if (playing.stopped) return;
        if (e.now >= t0 + len - 0.4) {
          window.clearInterval(playing.timer);
          if (opts.then && this.current === playing) this.play(opts.then, { fade: 2 });
          else if (this.current === playing) this.release(playing, 2);
        }
      }, 50);
      return;
    }

    const sd = 60 / track.bpm / 4;
    let next = t0;
    let step = 0;
    const schedule = () => {
      if (playing.stopped) return;
      while (next < e.now + 0.25) {
        if (next >= e.now - 0.05) track.step(e, out, step % track.steps, next, sd);
        next += sd;
        step++;
      }
    };
    schedule();
    playing.timer = window.setInterval(schedule, 25);
  }

  stop(fade = 1) {
    if (!this.current) return;
    this.release(this.current, fade);
    this.current = null;
  }

  private release(p: Playing, fade: number) {
    if (p.stopped) return;
    p.stopped = true;
    window.clearInterval(p.timer);
    const t = this.e.now;
    p.gain.gain.cancelScheduledValues(t);
    p.gain.gain.setValueAtTime(Math.max(0.0001, p.gain.gain.value), t);
    p.gain.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.05, fade));
    const ctx = this.e.ctx;
    const check = window.setInterval(() => {
      if (ctx.currentTime >= t + fade + 0.1) {
        window.clearInterval(check);
        p.gain.disconnect();
      }
    }, 200);
  }
}
