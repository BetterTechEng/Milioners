import type { AppData, GameEvent } from '../types';

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
  fifty: 'fastest-finger.mp3',
  audience: 'ask-the-audience.mp3',
  music64000: 'music-64000.mp3',
  music125000: 'music-125000.mp3',
  music500000: 'music-500000.mp3',
  klakson: 'klakson.mp3',
};

/**
 * Loops: the thinking beds, and final answer, which keeps playing until the host
 * reveals the result. Every other track plays once.
 */
const LOOPING: TrackId[] = ['music64000', 'music125000', 'music500000', 'finalAnswer'];

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
  /** Track that the browser blocked; retried on the first user interaction. */
  private blocked: TrackId | null = null;
  private onIdle: (() => void) | null = null;

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

  get currentId(): TrackId | null {
    return this.current?.id ?? null;
  }

  setVolume(master: number, music: number) {
    this.volume = Math.max(0, Math.min(1, master * music));
    this.els.forEach((el) => (el.volume = this.volume));
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.els.forEach((el) => (el.muted = muted));
  }

  play(id: TrackId) {
    this.stop();
    this.blocked = null;
    const el = this.el(id);
    el.loop = LOOPING.includes(id);
    el.volume = this.volume;
    el.muted = this.muted;
    el.currentTime = 0;
    this.current = { id, el };
    if (this.paused) return;
    el.play().catch((err: unknown) => {
      if (this.current?.el !== el) return;
      if ((err as DOMException)?.name === 'NotAllowedError') this.blocked = id;
    });
  }

  stop() {
    if (this.current) {
      this.current.el.pause();
      this.current.el.currentTime = 0;
    }
    this.current = null;
    this.blocked = null;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
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
      case 'audienceStart':
        this.play('audience');
        break;
      case 'phoneStart':
        this.play('phone');
        break;
      // The countdown and the phone music run together.
      case 'phoneTimerPause':
        if (this.currentId === 'phone') this.current?.el.pause();
        break;
      case 'phoneTimerStart':
        if (this.currentId === 'phone' && !this.paused) this.current?.el.play().catch(() => undefined);
        break;
      case 'phoneEnd':
        if (this.currentId === 'phone') this.stop();
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
