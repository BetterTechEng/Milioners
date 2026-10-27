import type { AppData, GameState, HistoryEntry, MediaRef, Question, Settings } from '../types';
import { createSampleQuestions, DEFAULT_SETTINGS, uid } from '../data/defaults';
import { initialGame } from './machine';

const KEY_DATA = 'milioners.data.v1';
const KEY_SAVES = 'milioners.saves.v1';

export function defaultAppData(): AppData {
  return {
    version: 0,
    origin: '',
    game: initialGame(DEFAULT_SETTINGS.participants[0]),
    questions: createSampleQuestions(),
    settings: structuredClone(DEFAULT_SETTINGS),
    history: [],
  };
}

function mergeSettings(s: Partial<Settings> | undefined): Settings {
  const d = structuredClone(DEFAULT_SETTINGS);
  if (!s) return d;
  return {
    ...d,
    ...s,
    volume: { ...d.volume, ...(s.volume ?? {}) },
    lifelinesEnabled: { ...d.lifelinesEnabled, ...(s.lifelinesEnabled ?? {}) },
    prizes: Array.isArray(s.prizes) && s.prizes.length ? s.prizes : d.prizes,
    thresholds: Array.isArray(s.thresholds) ? s.thresholds : d.thresholds,
    participants: Array.isArray(s.participants) && s.participants.length ? s.participants : d.participants,
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(KEY_DATA);
    if (!raw) return defaultAppData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const base = defaultAppData();
    return {
      version: parsed.version ?? 0,
      origin: parsed.origin ?? '',
      game: { ...base.game, ...(parsed.game ?? {}) },
      questions: Array.isArray(parsed.questions) ? parsed.questions : base.questions,
      settings: mergeSettings(parsed.settings),
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return defaultAppData();
  }
}

export function persistAppData(data: AppData): void {
  try {
    localStorage.setItem(KEY_DATA, JSON.stringify(data));
  } catch (err) {
    console.warn('Nie udało się zapisać stanu gry', err);
  }
}

export function parseStoredAppData(raw: string | null): AppData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

export const DATA_STORAGE_KEY = KEY_DATA;

/* ---------- Save slots ---------- */

export interface SaveSlot {
  id: string;
  name: string;
  date: string;
  game: GameState;
}

export function listSaves(): SaveSlot[] {
  try {
    const raw = localStorage.getItem(KEY_SAVES);
    return raw ? (JSON.parse(raw) as SaveSlot[]) : [];
  } catch {
    return [];
  }
}

export function writeSaves(saves: SaveSlot[]): void {
  localStorage.setItem(KEY_SAVES, JSON.stringify(saves));
}

export function addSave(name: string, game: GameState): SaveSlot[] {
  const slot: SaveSlot = { id: uid('save'), name, date: new Date().toISOString(), game: structuredClone(game) };
  const saves = [slot, ...listSaves()].slice(0, 30);
  writeSaves(saves);
  return saves;
}

export function deleteSave(id: string): SaveSlot[] {
  const saves = listSaves().filter((s) => s.id !== id);
  writeSaves(saves);
  return saves;
}

export function clearAllStorage(): void {
  localStorage.removeItem(KEY_DATA);
  localStorage.removeItem(KEY_SAVES);
}

/* ---------- Questions import / export ---------- */

export function exportQuestionsJson(questions: Question[]): string {
  return JSON.stringify({ format: 'milioners-questions', version: 1, questions }, null, 2);
}

export function parseQuestionsJson(text: string): Question[] {
  const parsed = JSON.parse(text) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { questions?: unknown }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : null;
  if (!list) throw new Error('Plik nie zawiera listy pytań.');
  return list.map((item, i) => {
    const q = item as Partial<Question> & { answers?: unknown; correct?: unknown };
    if (typeof q.text !== 'string' || !q.text.trim()) throw new Error(`Pytanie ${i + 1}: brak treści.`);
    if (!Array.isArray(q.answers) || q.answers.length !== 4 || q.answers.some((a) => typeof a !== 'string'))
      throw new Error(`Pytanie ${i + 1}: wymagane są dokładnie 4 odpowiedzi tekstowe.`);
    let correct = q.correct as unknown;
    if (typeof correct === 'string') correct = 'ABCD'.indexOf(correct.toUpperCase());
    if (typeof correct !== 'number' || correct < 0 || correct > 3)
      throw new Error(`Pytanie ${i + 1}: poprawna odpowiedź musi być 0–3 lub A–D.`);
    const difficulty = q.difficulty === 2 || q.difficulty === 3 ? q.difficulty : 1;
    return {
      id: typeof q.id === 'string' && q.id ? q.id : uid('q'),
      text: q.text,
      answers: q.answers as [string, string, string, string],
      correct: correct as 0 | 1 | 2 | 3,
      difficulty,
      prize: typeof q.prize === 'number' ? q.prize : undefined,
      image: isMediaRef(q.image) ? q.image : undefined,
      video: isMediaRef(q.video) ? q.video : undefined,
      answerVideo: isMediaRef(q.answerVideo) ? q.answerVideo : undefined,
      hostComment: typeof q.hostComment === 'string' ? q.hostComment : undefined,
      videoTiming: q.videoTiming === 'after' || q.videoTiming === 'before' ? q.videoTiming : undefined,
    };
  });
}

function isMediaRef(v: unknown): v is MediaRef {
  if (!v || typeof v !== 'object') return false;
  const r = v as MediaRef;
  return (r.kind === 'url' && typeof r.url === 'string') || (r.kind === 'file' && typeof r.id === 'string');
}

/* ---------- History ---------- */

export function historyEntry(game: GameState, prize: number): HistoryEntry {
  return {
    id: uid('h'),
    date: new Date().toISOString(),
    participant: game.participant || '—',
    outcome: game.phase === 'GAME_WON' ? 'won' : game.endReason === 'stopped' ? 'stopped' : 'lost',
    prize,
    reachedLevel: game.results.reduce((m, r) => (r.outcome === 'correct' ? Math.max(m, r.index + 1) : m), 0),
  };
}

/* ---------- Media files in IndexedDB ---------- */

const DB_NAME = 'milioners-media';
const STORE = 'files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putMediaFile(file: File): Promise<MediaRef> {
  const db = await openDb();
  const id = uid('media');
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return { kind: 'file', id, name: file.name, mime: file.type };
}

export async function getMediaBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMediaFile(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function clearMedia(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

const urlCache = new Map<string, string>();

export type ResolvedMedia =
  | { type: 'video' | 'image'; src: string }
  | { type: 'youtube'; embedId: string }
  | { type: 'missing'; reason: string };

export function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Turn a MediaRef into something a <video>/<img>/<iframe> can show. */
export async function resolveMedia(ref: MediaRef, as: 'video' | 'image'): Promise<ResolvedMedia> {
  if (ref.kind === 'url') {
    const yt = youTubeId(ref.url);
    if (yt && as === 'video') return { type: 'youtube', embedId: yt };
    return { type: as, src: ref.url };
  }
  const cached = urlCache.get(ref.id);
  if (cached) return { type: as, src: cached };
  const blob = await getMediaBlob(ref.id);
  if (!blob) return { type: 'missing', reason: `Brak pliku „${ref.name}” w tej przeglądarce.` };
  const src = URL.createObjectURL(blob);
  urlCache.set(ref.id, src);
  return { type: as, src };
}
