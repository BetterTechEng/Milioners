import type { AnswerIndex, Question, RoundResult, Settings } from '../types';

/** Questions that take part in the game (first N, N = questionCount). */
export function playQuestions(questions: Question[], settings: Settings): Question[] {
  return questions.slice(0, Math.max(1, Math.min(settings.questionCount, questions.length)));
}

export function levelCount(questions: Question[], settings: Settings): number {
  return playQuestions(questions, settings).length;
}

/** Prize for a 0-based level, honouring a per-question override. */
export function prizeAt(questions: Question[], settings: Settings, level: number): number {
  const q = playQuestions(questions, settings)[level];
  if (q?.prize && q.prize > 0) return q.prize;
  return settings.prizes[level] ?? 0;
}

export function ladder(questions: Question[], settings: Settings): number[] {
  const n = levelCount(questions, settings);
  return Array.from({ length: n }, (_, i) => prizeAt(questions, settings, i));
}

export function isThreshold(settings: Settings, level: number): boolean {
  return settings.thresholds.includes(level);
}

/** Highest level answered correctly, or -1. */
export function lastCorrectLevel(results: RoundResult[]): number {
  return results.reduce((max, r) => (r.outcome === 'correct' && r.index > max ? r.index : max), -1);
}

/** What the player takes home after a wrong answer. */
export function guaranteedPrize(questions: Question[], settings: Settings, results: RoundResult[]): number {
  const reached = lastCorrectLevel(results);
  const safe = settings.thresholds.filter((t) => t <= reached).sort((a, b) => b - a)[0];
  return safe === undefined ? 0 : prizeAt(questions, settings, safe);
}

export function currentWinnings(questions: Question[], settings: Settings, results: RoundResult[]): number {
  const reached = lastCorrectLevel(results);
  return reached < 0 ? 0 : prizeAt(questions, settings, reached);
}

export type TensionTier = 1 | 2 | 3 | 4;

/** Music tier: 1–5 calm, 6–10 stronger, 11–14 dramatic, last = final. Scales to any length. */
export function tensionTier(level: number, total: number): TensionTier {
  if (level >= total - 1) return 4;
  const scaled = ((level + 1) / total) * 15;
  if (scaled <= 5) return 1;
  if (scaled <= 10) return 2;
  return 3;
}

/** Pick two wrong answers to remove for 50:50. */
export function pickFiftyFifty(correct: AnswerIndex, rng: () => number = Math.random): AnswerIndex[] {
  const wrong = ([0, 1, 2, 3] as AnswerIndex[]).filter((a) => a !== correct);
  const keep = wrong[Math.floor(rng() * wrong.length)];
  return wrong.filter((a) => a !== keep);
}

/**
 * Simulated audience vote. The correct answer usually leads; on hard
 * questions the crowd is less sure and can be wrong.
 */
export function simulateAudience(
  correct: AnswerIndex,
  difficulty: number,
  removed: AnswerIndex[],
  rng: () => number = Math.random,
): [number, number, number, number] {
  const available = ([0, 1, 2, 3] as AnswerIndex[]).filter((a) => !removed.includes(a));
  const misleadChance = difficulty >= 3 ? 0.3 : difficulty === 2 ? 0.12 : 0.03;
  const favourite = rng() < misleadChance ? available.filter((a) => a !== correct)[Math.floor(rng() * (available.length - 1))] ?? correct : correct;
  const strength = difficulty >= 3 ? 1.6 : difficulty === 2 ? 2.6 : 4.5;
  const weights = [0, 0, 0, 0];
  for (const a of available) {
    weights[a] = 0.4 + rng();
    if (a === favourite) weights[a] += strength + rng();
    else if (a === correct) weights[a] += strength * 0.45;
  }
  return normalizeTo100(weights);
}

/** Scale non-negative numbers so integers sum to exactly 100 (largest remainder). */
export function normalizeTo100(values: number[]): [number, number, number, number] {
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  if (total <= 0) return [25, 25, 25, 25];
  const raw = values.map((v) => (Math.max(0, v) / total) * 100);
  const floored = raw.map(Math.floor);
  let rest = 100 - floored.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r);
  for (const { i } of order) {
    if (rest <= 0) break;
    if (values[i] > 0) {
      floored[i] += 1;
      rest -= 1;
    }
  }
  return [floored[0], floored[1], floored[2], floored[3]];
}

export function formatMoney(value: number, currency: string): string {
  const digits = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${digits} ${currency}`;
}

/** Timings of the question intro sequence, shared by the screen and the director. */
export function introTiming(speed: number) {
  const s = Math.max(0.3, speed);
  const questionMs = 900 * s;
  const firstAnswerMs = 1300 * s;
  const staggerMs = 650 * s;
  return { questionMs, firstAnswerMs, staggerMs, totalMs: firstAnswerMs + staggerMs * 3 + 600 * s };
}

export function phoneRemainingMs(phone: { running: boolean; remainingMs: number; startedAt: number }, now: number): number {
  if (!phone.running) return Math.max(0, phone.remainingMs);
  return Math.max(0, phone.remainingMs - (now - phone.startedAt));
}
