import type { AppData, GameEvent } from '../types';
import { PHONE_MUSIC_FROM_S } from '../game/machine';

/** The show's MP3 tracks (public/audio). */
export type TrackId =
  | 'arriving'
  | 'mainTheme'
  | 'finalAnswer'
  | 'correct'
  | 'wrong'
  | 'letsPlay'
  | 'newQuestion'
  | 'phone'
  | 'phoneIntro'
  | 'fifty'
  | 'audience'
  | 'music64000'
  | 'music125000'
  | 'music500000'
  | 'klakson';

const FILES: Record<TrackId, string> = {
  arriving: 'candidates-arriving.mp3',
  mainTheme: 'main-theme.mp3',
  finalAnswer: 'final-answer.mp3',
  correct: 'correct-answer.mp3',
  wrong: 'wrong-answer.mp3',
  letsPlay: 'lets-play.mp3',
  newQuestion: 'new-question.mp3',
  phone: 'phone-a-friend.mp3',
  phoneIntro: 'phone-intro.mp3',
  fifty: 'fastest-finger.mp3',
  audience: 'ask-the-audience.mp3',
  music64000: 'music-64000.mp3',
  music125000: 'music-125000.mp3',
  music500000: 'music-500000.mp3',
  klakson: 'klakson.mp3',
};

/**
 * ask-the-audience.mp3 (120 BPM): first phrase 0.17–16.17 s, second phrase 16.17–32.17 s,
 * final hit at 32.17 s. During the vote the second phrase loops (sample-accurate, Web Audio);
 * "Zakończ głosowanie" jumps straight to the final hit.
 */
const AUDIENCE_LOOP_START = 16.15;
const AUDIENCE_LOOP_END = 32.15;
const AUDIENCE_END_FROM = 32.15;

/**
 * Loops: the thinking beds, and final answer, which keeps playing until the host
 * reveals the result. Every other track plays once.
 */
const LOOPING: TrackId[] = ['music64000', 'music125000', 'music500000', 'finalAnswer', 'phoneIntro'];

/** Thinking music by question number: 1–5 → 64 000, 6–8 → 125 000–250 000, 9+ → 500 000. */
export function thinkingTrack(questionNumber: number): TrackId {
  if (questionNumber >= 9) return 'music500000';
  if (questionNumber >= 6) return 'music125000';
  return 'music64000';
}

/**
 * Plays exactly one track at a time: starting a track stops the previous one.
 * Game events are mapped to tracks; all delays (6 s reveal, 8 s 50:50,
 * 32 s audience) are driven by the game state, so nothing stale can fire
 * after the host moves on.
 */
class AudioManagerImpl {
  private els = new Map<TrackId, HTMLAudioElement>();
  private current: { id: TrackId; el: HTMLAudioElement } | null = null;
  private volume = 0.6;
  private muted = false;
  private paused = false;
  /** Web Audio path, used for the audience vote loop. */
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private audienceBuf: AudioBuffer | null = null;
  private audienceLoad: Promise<AudioBuffer | null> | null = null;
  private web: { id: TrackId; src: AudioBufferSourceNode } | null = null;
  private webToken = 0;
  /** Track that the browser blocked; retried on the first user interaction. */
  private blocked: TrackId | null = null;
  private onIdle: (() => void) | null = null;
  private onPhoneSync: ((musicMs: number, at: number) => void) | null = null;

  constructor() {
    const retry = () => {
      // Give the interaction a moment: if it started another track itself, skip the retry.
      const want = this.blocked;
      window.setTimeout(() => {
        if (want && this.blocked === want) this.play(want);
      }, 150);
    };
    window.addEventListener('pointerdown', retry, { capture: true });
    window.addEventListener('keydown', retry, { capture: true });
  }

  private el(id: TrackId): HTMLAudioElement {
    let el = this.els.get(id);
    if (!el) {
      el = new Audio(`${import.meta.env.BASE_URL}audio/${FILES[id]}`);
      el.preload = 'auto';
      el.addEventListener('ended', () => {
        if (this.current?.el === el) {
          this.current = null;
          this.onIdle?.();
        }
      });
      this.els.set(id, el);
    }
    return el;
  }

  /** Called when a one-shot track finishes (used to resume thinking music). */
  setIdleHandler(fn: () => void) {
    this.onIdle = fn;
  }

  /** Called when the countdown music actually (re)starts, with its position past 12 s. */
  setPhoneSyncHandler(fn: (musicMs: number, at: number) => void) {
    this.onPhoneSync = fn;
  }

  private syncPhoneClock() {
    const el = this.current?.id === 'phone' ? this.current.el : null;
    if (!el) return;
    const fire = () => {
      if (this.current?.el !== el) return;
      this.onPhoneSync?.((el.currentTime - PHONE_MUSIC_FROM_S) * 1000, Date.now());
    };
    el.addEventListener('playing', () => window.setTimeout(fire, 60), { once: true });
  }

  get currentId(): TrackId | null {
    return this.web?.id ?? this.current?.id ?? null;
  }

  private audioCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
      this.applyGain();
    }
    return this.ctx;
  }

  private applyGain() {
    if (this.gain && this.ctx) this.gain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
  }

  /** Fetch and decode the audience music ahead of time so the loop starts without delay. */
  preloadAudience(): Promise<AudioBuffer | null> {
    if (!this.audienceLoad) {
      this.audienceLoad = fetch(`${import.meta.env.BASE_URL}audio/${FILES.audience}`)
        .then((r) => r.arrayBuffer())
        .then((b) => this.audioCtx().decodeAudioData(b))
        .then((buf) => (this.audienceBuf = buf))
        .catch(() => null);
    }
    return this.audienceLoad;
  }

  private stopWeb() {
    this.webToken++;
    if (this.web) {
      try {
        this.web.src.stop();
      } catch {
        /* already stopped */
      }
      this.web.src.disconnect();
    }
    this.web = null;
  }

  /** Start the audience music: from the top with the loop, or only its final hit. */
  private async playAudience(part: 'loop' | 'end') {
    this.stop();
    const token = this.webToken;
    const ctx = this.audioCtx();
    const buf = this.audienceBuf ?? (await this.preloadAudience());
    if (!buf || token !== this.webToken) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gain!);
    if (part === 'loop') {
      src.loop = true;
      src.loopStart = AUDIENCE_LOOP_START;
      src.loopEnd = AUDIENCE_LOOP_END;
      src.start(0, 0);
    } else {
      src.start(0, AUDIENCE_END_FROM);
    }
    src.onended = () => {
      if (this.web?.src === src) {
        this.web = null;
        this.onIdle?.();
      }
    };
    this.web = { id: 'audience', src };
    if (this.paused) await ctx.suspend();
    else if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);
  }

  setVolume(master: number, music: number) {
    this.volume = Math.max(0, Math.min(1, master * music));
    this.els.forEach((el) => (el.volume = this.volume));
    this.applyGain();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.els.forEach((el) => (el.muted = muted));
    this.applyGain();
  }

  play(id: TrackId, fromSeconds = 0) {
    this.stop();
    this.blocked = null;
    const el = this.el(id);
    el.loop = LOOPING.includes(id);
    el.volume = this.volume;
    el.muted = this.muted;
    el.currentTime = fromSeconds;
    this.current = { id, el };
    if (this.paused) return;
    el.play().catch((err: unknown) => {
      if (this.current?.el !== el) return;
      if ((err as DOMException)?.name === 'NotAllowedError') this.blocked = id;
    });
  }

  stop() {
    this.stopWeb();
    if (this.current) {
      this.current.el.pause();
      this.current.el.currentTime = 0;
    }
    this.current = null;
    this.blocked = null;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (this.web && this.ctx) {
      if (paused) void this.ctx.suspend();
      else void this.ctx.resume();
    }
    const el = this.current?.el;
    if (!el) return;
    if (paused) el.pause();
    else el.play().catch(() => undefined);
  }

  /** Thinking music that should be playing right now, if any. */
  desiredLoop(data: AppData): TrackId | null {
    const g = data.game;
    if ((g.phase !== 'QUESTION_INTRO' && g.phase !== 'QUESTION_ACTIVE') || g.activeLifeline || g.video || g.paused) return null;
    return thinkingTrack(g.index + 1);
  }

  /** Start the thinking loop when it belongs on screen and nothing else is playing. */
  syncLoop(data: AppData, force = false) {
    const want = this.desiredLoop(data);
    if (!want || this.currentId === want) return;
    if (this.current && !force) return;
    this.play(want);
  }

  handleEvent(ev: GameEvent, data: AppData) {
    switch (ev.type) {
      case 'gameStart':
        this.play('mainTheme');
        break;
      // The thinking music starts as soon as the question appears.
      case 'questionIn':
        this.play(thinkingTrack(data.game.index + 1));
        break;
      // Transition music: only its first 5 s are heard, the question then replaces it.
      case 'next':
        this.play(ev.data?.first ? 'letsPlay' : 'newQuestion');
        break;
      case 'break':
        this.playBreak();
        break;
      case 'lock':
        this.play('finalAnswer');
        break;
      case 'correct':
      case 'threshold':
        this.play('correct');
        break;
      case 'incorrect':
        this.play('wrong');
        break;
      case 'won':
      case 'lost':
        this.play('mainTheme');
        break;
      case 'fifty':
        this.play('fifty');
        break;
      // Audience vote: music loops while the host counts votes; the final hit confirms the result.
      case 'audienceStart':
        void this.playAudience('loop');
        break;
      case 'audienceResults':
        void this.playAudience('end');
        break;
      // Phone: the first 11 s loop while the call is set up…
      case 'phoneStart':
        this.play('phoneIntro');
        break;
      // …then the countdown music from 12 s, whose ticks match the clock.
      case 'phoneConnected':
        this.play('phone', PHONE_MUSIC_FROM_S);
        this.syncPhoneClock();
        break;
      // The countdown and the phone music run together.
      case 'phoneTimerPause':
        if (this.currentId === 'phone') this.current?.el.pause();
        break;
      case 'phoneTimerStart':
        if (this.currentId === 'phone' && !this.paused) {
          this.syncPhoneClock();
          this.current?.el.play().catch(() => undefined);
        }
        break;
      case 'phoneEnd':
        if (!ev.data?.timeout && (this.currentId === 'phone' || this.currentId === 'phoneIntro')) this.stop();
        break;
      case 'lifelineClose':
        this.syncLoop(data, true);
        break;
      case 'videoStart':
        this.stop();
        break;
      case 'videoEnd':
        this.syncLoop(data, true);
        break;
      case 'reset':
        this.stop();
        break;
      case 'pause':
        this.setPaused(true);
        break;
      case 'resume':
        if (this.currentId === 'phone') this.syncPhoneClock();
        this.setPaused(false);
        break;
    }
  }

  /** Ad break: everything stops, the klakson plays once and the game stays paused. */
  private playBreak() {
    this.stop();
    this.paused = true;
    const el = this.el('klakson');
    el.loop = false;
    el.volume = this.volume;
    el.muted = this.muted;
    el.currentTime = 0;
    this.current = { id: 'klakson', el };
    el.play().catch(() => undefined);
  }

  /** Play the arrival music when the game page opens (retried on first click if blocked). */
  playArrival() {
    if (!this.current) this.play('arriving');
  }
}

export const AudioManager = new AudioManagerImpl();

// Handy for manual testing in the browser console during development.
if (import.meta.env.DEV) (window as unknown as { __audio: typeof AudioManager }).__audio = AudioManager;
