import type { AudioEngine } from './engine';
import {
  bell,
  brass,
  crowd,
  impact,
  kick,
  pluck,
  reverseCymbal,
  riser,
  shimmer,
  snare,
  timpani,
  tone,
  whoosh,
  type Out,
} from './synth';

export type SfxId =
  | 'questionIn'
  | 'answerIn'
  | 'select'
  | 'lock'
  | 'revealRoll'
  | 'transition'
  | 'fifty'
  | 'lifeline'
  | 'lifelineClose'
  | 'dial'
  | 'ring'
  | 'pickup'
  | 'tick'
  | 'tickUrgent'
  | 'callEnd'
  | 'crowd'
  | 'audienceReveal'
  | 'pause'
  | 'resume'
  | 'ladderStep';

/** Sounds in the same group never overlap: a new one fades out the previous one. */
const GROUP: Partial<Record<SfxId, string>> = {
  questionIn: 'intro',
  answerIn: 'intro',
  select: 'select',
  lock: 'lock',
  revealRoll: 'roll',
  dial: 'phone',
  ring: 'phone',
  pickup: 'phone',
  callEnd: 'phone',
  tick: 'tick',
  tickUrgent: 'tick',
  crowd: 'crowd',
  audienceReveal: 'crowd',
  pause: 'pause',
  resume: 'pause',
};

type Player = (e: AudioEngine, out: Out, t: number, arg: number) => void;

const DTMF: [number, number][] = [
  [697, 1209],
  [770, 1336],
  [852, 1477],
  [941, 1336],
  [697, 1336],
  [770, 1209],
  [852, 1336],
  [770, 1477],
  [697, 1477],
];

const PLAYERS: Record<SfxId, Player> = {
  questionIn(e, out, t) {
    whoosh(e, out, t, 0.7, 0.14, true);
    impact(e, out, t + 0.62, 0.35);
    brass(e, out, t + 0.62, [50, 57, 62], 0.5, 0.08);
    bell(e, out, t + 0.62, 86, 0.04, 1.6);
  },
  // arg = answer index 0..3: four related, rising hits.
  answerIn(e, out, t, i) {
    const notes = [62, 65, 69, 74];
    whoosh(e, out, t - 0.12, 0.2, 0.05, true);
    kick(e, out, t, 0.25, { from: 160, to: 60, decay: 0.2 });
    pluck(e, out, t, notes[i] + 12, { vol: 0.08, dur: 0.6, type: 'triangle', send: 0.5 });
    bell(e, out, t, notes[i] + 24, 0.035, 1.2);
  },
  select(e, out, t) {
    pluck(e, out, t, 81, { vol: 0.08, dur: 0.3, type: 'square', send: 0.3 });
    pluck(e, out, t + 0.06, 86, { vol: 0.07, dur: 0.45, type: 'triangle', send: 0.4 });
    bell(e, out, t + 0.06, 93, 0.03, 0.8);
  },
  lock(e, out, t) {
    reverseCymbal(e, out, t - 0.0, 0.35, 0.08);
    impact(e, out, t + 0.35, 0.65);
    timpani(e, out, t + 0.35, 38, 0.45, 2);
    brass(e, out, t + 0.35, [38, 45, 50, 53], 1.2, 0.14);
    snare(e, out, t + 0.35, 0.12, 0.3);
  },
  // arg = duration in seconds: snare roll building into the reveal.
  revealRoll(e, out, t, dur) {
    const d = Math.max(0.5, dur);
    const hits = Math.floor(d / 0.055);
    for (let i = 0; i < hits; i++) snare(e, out, t + i * 0.055, 0.02 + (i / hits) * 0.07, 0.07);
    timpani(e, out, t, 38, 0.2, d);
    riser(e, out, t + d * 0.3, d * 0.7, 0.06);
  },
  transition(e, out, t) {
    whoosh(e, out, t, 0.9, 0.13, false);
    pluck(e, out, t + 0.2, 69, { vol: 0.05, dur: 0.6 });
    pluck(e, out, t + 0.35, 74, { vol: 0.05, dur: 0.8 });
    bell(e, out, t + 0.5, 81, 0.035, 1.5);
  },
  fifty(e, out, t) {
    for (const [d, f0] of [
      [0, 1800],
      [0.42, 1400],
    ] as const) {
      const o = e.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t + d);
      o.frequency.exponentialRampToValueAtTime(90, t + d + 0.38);
      const g = e.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.linearRampToValueAtTime(0.09, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.4);
      const f = e.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 3000;
      o.connect(f).connect(g).connect(out.dry);
      if (out.wet) g.connect(out.wet);
      o.start(t + d);
      o.stop(t + d + 0.45);
      kick(e, out, t + d + 0.02, 0.25, { from: 200, to: 50, decay: 0.2 });
    }
  },
  lifeline(e, out, t) {
    whoosh(e, out, t, 0.5, 0.1, true);
    shimmer(e, out, t + 0.3, 79, 0.04, 8);
    brass(e, out, t + 0.35, [57, 62, 66, 69], 0.5, 0.08);
  },
  lifelineClose(e, out, t) {
    whoosh(e, out, t, 0.5, 0.08, false);
    bell(e, out, t + 0.2, 74, 0.03, 1);
  },
  dial(e, out, t) {
    tone(e, out, t, 350, 0.6, 0.05);
    tone(e, out, t, 440, 0.6, 0.05);
    DTMF.forEach(([lo, hi], i) => {
      const s = t + 0.8 + i * 0.16;
      tone(e, out, s, lo, 0.1, 0.05);
      tone(e, out, s, hi, 0.1, 0.05);
    });
  },
  // arg = repeat count of the European ringback tone.
  ring(e, out, t, count) {
    for (let i = 0; i < Math.max(1, count); i++) {
      const s = t + i * 2.2;
      for (const f of [425, 450]) tone(e, out, s, f, 1, 0.045);
      // A soft bell layer so the ring sounds produced, not raw.
      bell(e, out, s, 88, 0.012, 0.6);
    }
  },
  pickup(e, out, t) {
    kick(e, out, t, 0.2, { from: 400, to: 120, decay: 0.06 });
    tone(e, out, t + 0.08, 1200, 0.05, 0.04, 'square');
    shimmer(e, out, t + 0.15, 81, 0.03, 6);
  },
  tick(e, out, t) {
    pluck(e, out, t, 93, { vol: 0.05, dur: 0.05, type: 'square', send: 0.1 });
    kick(e, out, t, 0.12, { from: 900, to: 400, decay: 0.03 });
  },
  tickUrgent(e, out, t) {
    tone(e, out, t, 1320, 0.12, 0.08, 'square');
    tone(e, out, t + 0.14, 1320, 0.08, 0.05, 'square');
    kick(e, out, t, 0.3, { from: 120, to: 45, decay: 0.2 });
  },
  callEnd(e, out, t) {
    [0, 0.3, 0.6].forEach((d) => tone(e, out, t + d, 480, 0.2, 0.07, 'square'));
    impact(e, out, t + 0.9, 0.3);
  },
  // arg = duration of the voting murmur in seconds.
  crowd(e, out, t, dur) {
    crowd(e, out, t, Math.max(2, dur), 0.12);
    for (let i = 0; i < 26; i++) {
      const s = t + 0.4 + Math.random() * Math.max(1, dur - 1);
      tone(e, out, s, 2200 + Math.random() * 800, 0.025, 0.02, 'square');
    }
  },
  audienceReveal(e, out, t) {
    riser(e, out, t, 0.6, 0.06);
    impact(e, out, t + 0.6, 0.3);
    shimmer(e, out, t + 0.6, 74, 0.04, 10);
  },
  pause(e, out, t) {
    const o = e.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(600, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.3);
    const g = e.ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g).connect(out.dry);
    o.start(t);
    o.stop(t + 0.35);
  },
  resume(e, out, t) {
    whoosh(e, out, t, 0.4, 0.07, true);
    bell(e, out, t + 0.3, 81, 0.03, 0.8);
  },
  ladderStep(e, out, t) {
    bell(e, out, t, 86, 0.04, 0.9);
  },
};

export class SoundFx {
  private groups = new Map<string, GainNode>();

  constructor(private e: AudioEngine) {}

  play(id: SfxId, opts: { delay?: number; arg?: number } = {}) {
    this.playMany(GROUP[id], [{ id, delay: opts.delay, arg: opts.arg }]);
  }

  /** Schedule several sounds as one cancellable unit (e.g. question + four answers). */
  playMany(group: string | undefined, items: { id: SfxId; delay?: number; arg?: number }[]) {
    const e = this.e;
    const gain = e.ctx.createGain();
    // The reverb send is fed by `gain` directly, so instruments only use the dry path.
    gain.connect(e.sfxBus);
    const send = e.ctx.createGain();
    send.gain.value = 0.35;
    gain.connect(send).connect(e.sfxVerbIn);
    if (group) {
      this.cut(group);
      this.groups.set(group, gain);
    }
    const start = e.now + 0.02;
    let longest = 0;
    for (const it of items) {
      const d = it.delay ?? 0;
      longest = Math.max(longest, d + (it.id === 'crowd' || it.id === 'ring' ? 25 : 6));
      PLAYERS[it.id](e, { dry: gain }, start + d, it.arg ?? 0);
    }
    // Free the nodes once the audio clock has passed the sounds (survives pauses).
    const ctx = e.ctx;
    const timer = window.setInterval(() => {
      if (ctx.currentTime > start + longest) {
        window.clearInterval(timer);
        if (group && this.groups.get(group) === gain) this.groups.delete(group);
        gain.disconnect();
      }
    }, 1000);
  }

  /** Fade out and silence everything in a group (cancels scheduled notes). */
  cut(group: string, fade = 0.12) {
    const prev = this.groups.get(group);
    if (!prev) return;
    const t = this.e.now;
    prev.gain.cancelScheduledValues(t);
    prev.gain.setValueAtTime(prev.gain.value, t);
    prev.gain.linearRampToValueAtTime(0, t + fade);
    this.groups.delete(group);
    window.setTimeout(() => prev.disconnect(), (fade + 0.2) * 1000 + 50);
  }

  cutAll() {
    for (const g of [...this.groups.keys()]) this.cut(g);
  }
}
