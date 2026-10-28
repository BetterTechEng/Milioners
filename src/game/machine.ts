import type {
  AnswerIndex,
  AppData,
  GameEventType,
  GameState,
  LifelineId,
  Phase,
  RoundResult,
} from '../types';
import { currentWinnings, isThreshold, levelCount, playQuestions, phoneRemainingMs } from './rules';

/** Fixed show timings (ms), counted from the event that starts them. */
export const TRANSITION_MS = 5000;
export const FIFTY_AFTER_MS = 8000;
export const AUDIENCE_AFTER_MS = 32000;

export type Action =
  | { type: 'START_GAME'; participant?: string }
  | { type: 'NEXT_QUESTION' }
  | { type: 'SHOW_ANSWER' }
  | { type: 'ADVANCE' }
  | { type: 'PREV_QUESTION' }
  | { type: 'SKIP_QUESTION' }
  | { type: 'SELECT'; answer: AnswerIndex }
  | { type: 'REVEAL' }
  | { type: 'END_GAME' }
  | { type: 'PLAY_VIDEO'; which: 'answer' | 'question' }
  | { type: 'VIDEO_CONTROL'; playing?: boolean; seekTo?: number; maximized?: boolean }
  | { type: 'VIDEO_ENDED' }
  | { type: 'CLOSE_VIDEO' }
  | { type: 'FIFTY_START'; removed: AnswerIndex[] }
  | { type: 'FIFTY_APPLY' }
  | { type: 'AUDIENCE_START'; results: [number, number, number, number] }
  | { type: 'AUDIENCE_SHOW' }
  | { type: 'PHONE_START' }
  | { type: 'PHONE_TIMER'; cmd: 'start' | 'pause' | 'reset' }
  | { type: 'PHONE_END' }
  | { type: 'LIFELINE_CLOSE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART_QUESTION' }
  | { type: 'NEW_GAME'; participant?: string }
  | { type: 'TOGGLE_MUSIC' }
  | { type: 'TEST_QUESTION'; index: number }
  | { type: 'LOAD_GAME'; game: GameState };

export function initialGame(participant = ''): GameState {
  return {
    phase: 'IDLE',
    paused: false,
    phaseStartedAt: Date.now(),
    index: 0,
    selected: null,
    removed: [],
    lifelinesUsed: { fifty: false, phone: false, audience: false },
    activeLifeline: null,
    audience: null,
    phone: null,
    video: null,
    videoWatched: false,
    videoReturnPhase: null,
    results: [],
    participant,
    testMode: false,
    musicOn: true,
    events: [],
    eventSeq: 0,
    finalPrize: null,
    endReason: null,
    pausedAt: 0,
    lifelineAt: 0,
    fiftyPending: null,
    answersShown: 0,
    nextIndex: 0,
    breakPending: false,
    breakDone: false,
  };
}

/** Ad break comes after this 0-based question (question 5). */
const BREAK_AFTER_INDEX = 4;

const ACTIONS_WHILE_PAUSED = new Set<Action['type']>(['RESUME', 'TOGGLE_MUSIC', 'NEW_GAME', 'LOAD_GAME', 'VIDEO_CONTROL']);

/** Phases where the current question is on screen and can be changed by the host. */
const QUESTION_PHASES: Phase[] = ['QUESTION_INTRO', 'QUESTION_ACTIVE', 'ANSWER_LOCKED', 'ANSWER_CORRECT', 'ANSWER_INCORRECT'];

function emit(g: GameState, type: GameEventType, data?: Record<string, unknown>): GameState {
  const seq = g.eventSeq + 1;
  return { ...g, eventSeq: seq, events: [...g.events, { seq, type, data }].slice(-24) };
}

function toPhase(g: GameState, phase: Phase): GameState {
  return { ...g, phase, phaseStartedAt: Date.now() };
}

/** Clears everything that belongs to the previous question (lifeline overlays, pending timers, video). */
function freshQuestion(g: GameState, index: number): GameState {
  return {
    ...g,
    index,
    selected: null,
    removed: [],
    activeLifeline: null,
    audience: null,
    phone: null,
    video: null,
    videoWatched: false,
    videoReturnPhase: null,
    lifelineAt: 0,
    fiftyPending: null,
    answersShown: 0,
  };
}

function setResult(results: RoundResult[], r: RoundResult): RoundResult[] {
  return [...results.filter((x) => x.index !== r.index), r].sort((a, b) => a.index - b.index);
}

function lifelineAllowed(data: AppData, id: LifelineId): boolean {
  const g = data.game;
  return data.settings.lifelinesEnabled[id] && !g.lifelinesUsed[id] && g.activeLifeline === null && g.phase === 'QUESTION_ACTIVE';
}

function finishGame(data: AppData, g: GameState): GameState {
  const prize = currentWinnings(data.questions, data.settings, g.results);
  return emit(toPhase({ ...g, finalPrize: prize, endReason: null, activeLifeline: null }, 'GAME_WON'), 'won', { prize });
}

/** Returns true when the action is valid in the current state. Used to enable buttons. */
export function canDo(data: AppData, action: Action): boolean {
  return reduceGame(data, action) !== data.game;
}

/** Pure, guarded state transition. Invalid actions return the same object. */
export function reduceGame(data: AppData, action: Action): GameState {
  const g = data.game;
  const total = levelCount(data.questions, data.settings);
  const questions = playQuestions(data.questions, data.settings);
  const q = g.testMode ? data.questions[g.index] : questions[g.index];

  if (g.paused && !ACTIONS_WHILE_PAUSED.has(action.type)) return g;

  switch (action.type) {
    case 'START_GAME': {
      if (g.phase !== 'IDLE' || questions.length === 0) return g;
      const next = initialGame(action.participant ?? g.participant ?? data.settings.participants[0] ?? '');
      next.musicOn = g.musicOn;
      next.eventSeq = g.eventSeq;
      return emit(toPhase(next, 'INTRO'), 'gameStart');
    }

    case 'NEXT_QUESTION': {
      // The question appears only after the 5 s transition music.
      if (g.phase === 'INTRO') return emit(toPhase({ ...g, nextIndex: 0 }, 'QUESTION_COMPLETED'), 'next', { first: true });
      if (g.phase !== 'ANSWER_CORRECT' && g.phase !== 'ANSWER_INCORRECT') return g;
      if (g.testMode) {
        return emit({ ...initialGame(g.participant), musicOn: g.musicOn, eventSeq: g.eventSeq }, 'reset');
      }
      // A wrong answer never ends the game; after the last question the show ends.
      if (g.index >= total - 1) return finishGame(data, g);
      // After question 5: klakson, the game pauses until the host resumes it.
      if (g.index === BREAK_AFTER_INDEX && !g.breakDone) {
        return emit({ ...g, paused: true, pausedAt: Date.now(), breakPending: true, breakDone: true }, 'break');
      }
      return emit(toPhase({ ...g, nextIndex: g.index + 1 }, 'QUESTION_COMPLETED'), 'next');
    }

    // The host reveals the answers one by one: A, B, C, D.
    case 'SHOW_ANSWER': {
      if (g.phase !== 'QUESTION_INTRO' || g.answersShown >= 4) return g;
      const shown = g.answersShown + 1;
      const next = emit({ ...g, answersShown: shown }, 'answerShown', { answer: shown - 1 });
      return shown === 4 ? emit(toPhase(next, 'QUESTION_ACTIVE'), 'questionActive') : next;
    }

    case 'ADVANCE': {
      if (g.phase !== 'QUESTION_COMPLETED') return g;
      const index = Math.min(g.nextIndex, total - 1);
      return emit(toPhase(freshQuestion(g, index), 'QUESTION_INTRO'), 'questionIn', { source: 'advance' });
    }

    case 'PREV_QUESTION': {
      if (!QUESTION_PHASES.includes(g.phase) || g.index === 0 || g.testMode) return g;
      const index = g.index - 1;
      const results = g.results.filter((r) => r.index < index);
      return emit(toPhase({ ...freshQuestion(g, index), results }, 'QUESTION_INTRO'), 'questionIn', { source: 'prev' });
    }

    case 'SKIP_QUESTION': {
      const skippable: Phase[] = ['QUESTION_INTRO', 'QUESTION_ACTIVE', 'ANSWER_LOCKED'];
      if (!skippable.includes(g.phase) || g.index >= total - 1 || g.testMode || !q) return g;
      const results = setResult(g.results, { questionId: q.id, index: g.index, outcome: 'skipped', answer: null });
      return emit(toPhase({ ...freshQuestion(g, g.index), results, nextIndex: g.index + 1 }, 'QUESTION_COMPLETED'), 'next');
    }

    // Clicking an answer locks it at once; it cannot be changed afterwards.
    case 'SELECT': {
      if (g.phase !== 'QUESTION_ACTIVE' || g.activeLifeline || g.removed.includes(action.answer)) return g;
      return emit(toPhase({ ...g, selected: action.answer }, 'ANSWER_LOCKED'), 'lock', { answer: action.answer });
    }

    // The host reveals the result; final answer music plays until then.
    case 'REVEAL': {
      if (g.phase !== 'ANSWER_LOCKED' || g.selected === null || !q) return g;
      const correct = g.selected === q.correct;
      const results = setResult(g.results, {
        questionId: q.id,
        index: g.index,
        outcome: correct ? 'correct' : 'incorrect',
        answer: g.selected,
      });
      const next = toPhase({ ...g, results }, correct ? 'ANSWER_CORRECT' : 'ANSWER_INCORRECT');
      if (!correct) return emit(next, 'incorrect', { correct: q.correct, selected: g.selected });
      return emit(next, isThreshold(data.settings, g.index) && !g.testMode ? 'threshold' : 'correct', { level: g.index });
    }

    // The player may walk away with the current winnings.
    case 'END_GAME': {
      if (g.testMode) return g;
      if (g.phase !== 'QUESTION_ACTIVE' && g.phase !== 'ANSWER_CORRECT' && g.phase !== 'ANSWER_INCORRECT') return g;
      if (g.activeLifeline) return g;
      const prize = currentWinnings(data.questions, data.settings, g.results);
      return emit(toPhase({ ...g, finalPrize: prize, endReason: 'stopped' }, 'GAME_LOST'), 'lost', { prize, stopped: true });
    }

    case 'PLAY_VIDEO': {
      if (!q || g.activeLifeline) return g;
      const ref = action.which === 'answer' ? q.answerVideo : q.video;
      if (!ref) return g;
      const allowed: Phase[] =
        action.which === 'answer'
          ? ['ANSWER_LOCKED', 'ANSWER_CORRECT', 'ANSWER_INCORRECT']
          : ['QUESTION_ACTIVE', 'ANSWER_LOCKED', 'ANSWER_CORRECT', 'ANSWER_INCORRECT'];
      if (!allowed.includes(g.phase)) return g;
      return emit(
        toPhase(
          {
            ...g,
            videoReturnPhase: g.phase,
            video: {
              open: true,
              questionId: q.id,
              which: action.which,
              playing: true,
              maximized: false,
              seek: { time: 0, seq: 0 },
              ended: false,
            },
          },
          'VIDEO_PLAYING',
        ),
        'videoStart',
      );
    }

    case 'VIDEO_CONTROL': {
      if (!g.video) return g;
      const v = { ...g.video };
      if (action.playing !== undefined) v.playing = action.playing;
      if (action.maximized !== undefined) v.maximized = action.maximized;
      if (action.seekTo !== undefined) v.seek = { time: Math.max(0, action.seekTo), seq: v.seek.seq + 1 };
      return { ...g, video: v };
    }

    case 'VIDEO_ENDED':
    case 'CLOSE_VIDEO': {
      if (g.phase !== 'VIDEO_PLAYING' || !g.video) return g;
      const watched = g.video.which === 'answer' ? true : g.videoWatched;
      return emit(
        toPhase({ ...g, video: null, videoWatched: watched, videoReturnPhase: null }, g.videoReturnPhase ?? 'ANSWER_CORRECT'),
        'videoEnd',
      );
    }

    // 50:50 plays its melody first; the two wrong answers disappear 8 s later.
    case 'FIFTY_START': {
      if (!lifelineAllowed(data, 'fifty') || !q) return g;
      const removed = action.removed.filter((a) => a !== q.correct).slice(0, 2);
      if (removed.length !== 2) return g;
      return emit(
        { ...g, activeLifeline: 'fifty', fiftyPending: removed, lifelineAt: Date.now(), lifelinesUsed: { ...g.lifelinesUsed, fifty: true } },
        'fifty',
      );
    }

    case 'FIFTY_APPLY': {
      if (g.activeLifeline !== 'fifty' || !g.fiftyPending) return g;
      return emit({ ...g, removed: g.fiftyPending, fiftyPending: null, activeLifeline: null }, 'fiftyApplied', { removed: g.fiftyPending });
    }

    // Audience: the melody plays and the results appear 32 s later.
    case 'AUDIENCE_START': {
      if (!lifelineAllowed(data, 'audience')) return g;
      return emit(
        {
          ...g,
          activeLifeline: 'audience',
          audience: { status: 'voting', results: action.results },
          lifelineAt: Date.now(),
          lifelinesUsed: { ...g.lifelinesUsed, audience: true },
        },
        'audienceStart',
      );
    }

    case 'AUDIENCE_SHOW': {
      if (g.activeLifeline !== 'audience' || !g.audience || g.audience.status !== 'voting') return g;
      return emit({ ...g, audience: { ...g.audience, status: 'results' } }, 'audienceResults');
    }

    // Phone: the call connects straight away and the countdown starts.
    case 'PHONE_START': {
      if (!lifelineAllowed(data, 'phone')) return g;
      const now = Date.now();
      return emit(
        {
          ...g,
          activeLifeline: 'phone',
          phone: { status: 'connected', running: true, remainingMs: data.settings.phoneSeconds * 1000, startedAt: now },
          lifelineAt: now,
          lifelinesUsed: { ...g.lifelinesUsed, phone: true },
        },
        'phoneStart',
      );
    }

    case 'PHONE_TIMER': {
      const p = g.phone;
      if (g.activeLifeline !== 'phone' || !p || p.status !== 'connected') return g;
      const now = Date.now();
      if (action.cmd === 'start') {
        if (p.running || phoneRemainingMs(p, now) <= 0) return g;
        return { ...g, phone: { ...p, running: true, startedAt: now } };
      }
      if (action.cmd === 'pause') {
        if (!p.running) return g;
        return { ...g, phone: { ...p, running: false, remainingMs: phoneRemainingMs(p, now) } };
      }
      return { ...g, phone: { ...p, running: false, remainingMs: data.settings.phoneSeconds * 1000, startedAt: 0 } };
    }

    case 'PHONE_END': {
      const p = g.phone;
      if (g.activeLifeline !== 'phone' || !p || p.status === 'ended') return g;
      return emit({ ...g, phone: { ...p, status: 'ended', running: false, remainingMs: phoneRemainingMs(p, Date.now()) } }, 'phoneEnd');
    }

    case 'LIFELINE_CLOSE':
      // 50:50 closes by itself after its 8 s sequence.
      if (!g.activeLifeline || g.activeLifeline === 'fifty') return g;
      return emit({ ...g, activeLifeline: null, audience: null, phone: null }, 'lifelineClose');

    case 'PAUSE': {
      if (g.paused || g.phase === 'IDLE') return g;
      const now = Date.now();
      const phone = g.phone && g.phone.running ? { ...g.phone, remainingMs: phoneRemainingMs(g.phone, now), startedAt: now } : g.phone;
      return emit({ ...g, paused: true, pausedAt: now, phone }, 'pause');
    }

    case 'RESUME': {
      if (!g.paused) return g;
      const now = Date.now();
      const shift = now - g.pausedAt;
      const phone = g.phone && g.phone.running ? { ...g.phone, startedAt: now } : g.phone;
      // End of the ad break: carry on to the next question.
      if (g.breakPending) {
        const resumed = emit({ ...g, paused: false, pausedAt: 0, breakPending: false }, 'resume');
        return emit(toPhase({ ...resumed, nextIndex: g.index + 1 }, 'QUESTION_COMPLETED'), 'next');
      }
      return emit(
        {
          ...g,
          paused: false,
          pausedAt: 0,
          phaseStartedAt: g.phaseStartedAt + shift,
          lifelineAt: g.lifelineAt ? g.lifelineAt + shift : 0,
          phone,
        },
        'resume',
      );
    }

    case 'RESTART_QUESTION': {
      if (!QUESTION_PHASES.includes(g.phase) && g.phase !== 'VIDEO_PLAYING') return g;
      const results = g.results.filter((r) => r.index !== g.index);
      // Lifelines stay used; answers removed by an applied 50:50 stay removed.
      const next = { ...freshQuestion(g, g.index), removed: g.removed, results };
      return emit(toPhase(next, 'QUESTION_INTRO'), 'questionIn', { source: 'restart' });
    }

    case 'NEW_GAME': {
      const next = initialGame(action.participant ?? g.participant);
      next.musicOn = g.musicOn;
      next.eventSeq = g.eventSeq;
      return emit(next, 'reset');
    }

    case 'TOGGLE_MUSIC':
      return { ...g, musicOn: !g.musicOn };

    case 'TEST_QUESTION': {
      if (action.index < 0 || action.index >= data.questions.length) return g;
      const next = initialGame(g.participant);
      next.musicOn = g.musicOn;
      next.eventSeq = g.eventSeq;
      next.testMode = true;
      next.index = action.index;
      return emit(toPhase(next, 'QUESTION_INTRO'), 'questionIn', { source: 'test' });
    }

    case 'LOAD_GAME':
      return emit({ ...initialGame(), ...action.game, eventSeq: Math.max(action.game.eventSeq, g.eventSeq), events: [] }, 'reset');
  }
}

/** Phone time left, frozen while the game is paused. */
export function phoneLeftMs(g: GameState, now = Date.now()): number {
  if (!g.phone) return 0;
  return phoneRemainingMs(g.phone, g.paused ? g.pausedAt : now);
}

/** The question shown on screen (test mode may pick one outside the play set). */
export function currentQuestion(data: AppData) {
  const g = data.game;
  if (g.testMode) return data.questions[g.index];
  return playQuestions(data.questions, data.settings)[g.index];
}
