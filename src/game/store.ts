import { useSyncExternalStore } from 'react';
import type { AppData, Question, Settings } from '../types';
import { reduceGame, type Action } from './machine';
import { DATA_STORAGE_KEY, historyEntry, loadAppData, parseStoredAppData, persistAppData } from './storage';

/**
 * Shared app store. Every window keeps a copy; a change is saved to
 * localStorage and broadcast to the other windows over BroadcastChannel.
 * The newest version wins (ties broken by origin id).
 */

export type Role = 'admin' | 'screen' | 'launcher';

export type EphemeralMessage =
  | { type: 'videoProgress'; current: number; duration: number; paused: boolean }
  | { type: 'videoError'; message: string }
  | { type: 'presence'; role: Role; id: string; audioReady?: boolean }
  | { type: 'fullscreen' }
  | { type: 'ping' };

type WireMessage = { kind: 'data'; data: AppData } | { kind: 'eph'; msg: EphemeralMessage; from: string };

const ORIGIN = Math.random().toString(36).slice(2, 10);
const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('milioners-sync') : null;

let data: AppData = loadAppData();
const listeners = new Set<() => void>();
const ephListeners = new Set<(msg: EphemeralMessage, from: string) => void>();

function notify() {
  listeners.forEach((l) => l());
}

function isNewer(incoming: AppData): boolean {
  if (incoming.version !== data.version) return incoming.version > data.version;
  return incoming.origin > data.origin;
}

function accept(incoming: AppData) {
  if (!incoming || typeof incoming.version !== 'number' || !isNewer(incoming)) return;
  data = incoming;
  notify();
}

channel?.addEventListener('message', (ev: MessageEvent<WireMessage>) => {
  const m = ev.data;
  if (m.kind === 'data') accept(m.data);
  else if (m.kind === 'eph') ephListeners.forEach((l) => l(m.msg, m.from));
});

// Fallback for browsers without BroadcastChannel and for state changed while this tab slept.
window.addEventListener('storage', (ev) => {
  if (ev.key !== DATA_STORAGE_KEY) return;
  const parsed = parseStoredAppData(ev.newValue);
  if (parsed) accept(parsed);
});

function commit(next: Omit<AppData, 'version' | 'origin'>) {
  data = { ...next, version: data.version + 1, origin: ORIGIN };
  persistAppData(data);
  channel?.postMessage({ kind: 'data', data } satisfies WireMessage);
  notify();
}

export const store = {
  get: () => data,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Run a guarded game action. Returns false when it was not allowed. */
  dispatch(action: Action): boolean {
    const game = reduceGame(data, action);
    if (game === data.game) return false;
    let history = data.history;
    const finished = (p: string) => p === 'GAME_WON' || p === 'GAME_LOST';
    if (finished(game.phase) && !finished(data.game.phase) && !game.testMode) {
      history = [historyEntry(game, game.finalPrize ?? 0), ...history].slice(0, 100);
    }
    commit({ ...data, game, history });
    return true;
  },
  setQuestions(questions: Question[]) {
    commit({ ...data, questions });
  },
  setSettings(patch: Partial<Settings>) {
    commit({ ...data, settings: { ...data.settings, ...patch } });
  },
  replaceAll(next: Omit<AppData, 'version' | 'origin'>) {
    commit(next);
  },
  clearHistory() {
    commit({ ...data, history: [] });
  },
  send(msg: EphemeralMessage) {
    channel?.postMessage({ kind: 'eph', msg, from: ORIGIN } satisfies WireMessage);
  },
  onMessage(fn: (msg: EphemeralMessage, from: string) => void) {
    ephListeners.add(fn);
    return () => ephListeners.delete(fn);
  },
  origin: ORIGIN,
  hasChannel: channel !== null,
};

export function useAppData(): AppData {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// Handy for manual testing in the browser console during development.
if (import.meta.env.DEV) (window as unknown as { __store: typeof store }).__store = store;
