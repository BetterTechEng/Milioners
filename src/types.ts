export type AnswerIndex = 0 | 1 | 2 | 3;
export const ANSWER_LETTERS = ['A', 'B', 'C', 'D'] as const;

export type Difficulty = 1 | 2 | 3;

/** A media reference: an external URL or a file stored in IndexedDB. */
export type MediaRef =
  | { kind: 'url'; url: string }
  | { kind: 'file'; id: string; name: string; mime: string };

export interface Question {
  id: string;
  text: string;
  answers: [string, string, string, string];
  correct: AnswerIndex;
  difficulty: Difficulty;
  /** Optional prize override for this question's level. */
  prize?: number;
  image?: MediaRef;
  video?: MediaRef;
  answerVideo?: MediaRef;
  hostComment?: string;
  /** When the answer video should play. Defaults to settings.videoTiming. */
  videoTiming?: 'before' | 'after';
}

export type Phase =
  | 'IDLE'
  | 'INTRO'
  | 'QUESTION_INTRO'
  | 'QUESTION_ACTIVE'
  | 'ANSWER_SELECTED'
  | 'ANSWER_LOCKED'
  | 'VIDEO_PLAYING'
  | 'ANSWER_REVEAL'
  | 'ANSWER_CORRECT'
  | 'ANSWER_INCORRECT'
  | 'QUESTION_COMPLETED'
  | 'GAME_WON'
  | 'GAME_LOST';

export type LifelineId = 'fifty' | 'phone' | 'audience';

export type ThemeId = 'classic' | 'royal' | 'emerald';

export interface Settings {
  title: string;
  questionCount: number;
  participants: string[];
  prizes: number[];
  /** 0-based level indexes that are guaranteed. */
  thresholds: number[];
  lifelinesEnabled: Record<LifelineId, boolean>;
  theme: ThemeId;
  volume: { master: number; music: number; sfx: number; video: number };
  phoneSeconds: number;
  /** Multiplier for UI animation durations (0.5 – 2). */
  animationSpeed: number;
  /** Dramatic pause between "Reveal" and the result in ms. */
  revealDelayMs: number;
  videoTiming: 'before' | 'after';
  presentationMode: boolean;
  autoTransitions: boolean;
  reducedMotion: boolean;
  shortcutsEnabled: boolean;
  currency: string;
}

export interface AudienceState {
  status: 'voting' | 'results';
  results: [number, number, number, number];
}

export interface PhoneState {
  status: 'calling' | 'connected' | 'ended';
  running: boolean;
  /** Remaining ms at the moment of the last start/pause. */
  remainingMs: number;
  /** Epoch ms when the timer was last started (valid when running). */
  startedAt: number;
}

export interface VideoState {
  open: boolean;
  questionId: string;
  which: 'answer' | 'question';
  playing: boolean;
  maximized: boolean;
  seek: { time: number; seq: number };
  ended: boolean;
}

export interface RoundResult {
  questionId: string;
  index: number;
  outcome: 'correct' | 'incorrect' | 'skipped';
  answer: AnswerIndex | null;
}

export interface GameEvent {
  seq: number;
  type: GameEventType;
  data?: Record<string, unknown>;
}

export type GameEventType =
  | 'gameStart'
  | 'reset'
  | 'questionIn'
  | 'questionActive'
  | 'fiftyApplied'
  | 'select'
  | 'lock'
  | 'reveal'
  | 'correct'
  | 'threshold'
  | 'incorrect'
  | 'won'
  | 'lost'
  | 'next'
  | 'fifty'
  | 'phoneStart'
  | 'phoneConnected'
  | 'phoneEnd'
  | 'audienceStart'
  | 'audienceResults'
  | 'lifelineClose'
  | 'pause'
  | 'resume'
  | 'videoStart'
  | 'videoEnd';

export interface GameState {
  phase: Phase;
  paused: boolean;
  /** Epoch ms when the current phase started (used for timed sequences). */
  phaseStartedAt: number;
  index: number;
  selected: AnswerIndex | null;
  removed: AnswerIndex[];
  lifelinesUsed: Record<LifelineId, boolean>;
  activeLifeline: LifelineId | null;
  audience: AudienceState | null;
  phone: PhoneState | null;
  video: VideoState | null;
  /** Answer video already watched for the current question. */
  videoWatched: boolean;
  /** Phase to return to after the video closes. */
  videoReturnPhase: Phase | null;
  results: RoundResult[];
  participant: string;
  testMode: boolean;
  musicOn: boolean;
  events: GameEvent[];
  eventSeq: number;
  /** Final prize when game finished. */
  finalPrize: number | null;
  endReason: 'wrong' | 'stopped' | null;
  /** Epoch ms when the game was paused. */
  pausedAt: number;
  /** Epoch ms when the active lifeline started (shifted on resume). */
  lifelineAt: number;
  /** Answers 50:50 will remove once its 8 s sequence finishes. */
  fiftyPending: AnswerIndex[] | null;
}

export interface HistoryEntry {
  id: string;
  date: string;
  participant: string;
  outcome: 'won' | 'lost' | 'stopped';
  prize: number;
  reachedLevel: number;
}

export interface AppData {
  version: number;
  origin: string;
  game: GameState;
  questions: Question[];
  settings: Settings;
  history: HistoryEntry[];
}
