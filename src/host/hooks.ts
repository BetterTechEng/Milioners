import { useEffect, useRef } from 'react';
import type { AnswerIndex, AppData } from '../types';
import { store } from '../game/store';
import { levelCount } from '../game/rules';
import { AUDIENCE_AFTER_MS, FIFTY_AFTER_MS, TRANSITION_MS, phoneLeftMs, type Action } from '../game/machine';

/**
 * Timed transitions, each counted from the event that started it:
 * transition music → question (5 s), 50:50 start → removal (8 s), audience start → results (32 s),
 * plus the phone time-out. Answers and the result are revealed by the host.
 * Every timer is cleared when the state moves on, so nothing from an old question can fire.
 */
export function useDirector(data: AppData) {
  const g = data.game;
  const s = data.settings;
  const total = levelCount(data.questions, s);

  useEffect(() => {
    if (g.paused) return;
    const elapsed = Date.now() - g.phaseStartedAt;
    let delay: number | null = null;
    let action: Action | null = null;

    switch (g.phase) {
      // The question appears when the 5 s transition music ends.
      case 'QUESTION_COMPLETED':
        delay = TRANSITION_MS;
        action = { type: 'ADVANCE' };
        break;
      case 'ANSWER_CORRECT':
      case 'ANSWER_INCORRECT':
        if (s.autoTransitions && !g.testMode && g.index < total - 1) {
          delay = 8000;
          action = { type: 'NEXT_QUESTION' };
        }
        break;
      case 'INTRO':
        if (s.autoTransitions) {
          delay = 8000;
          action = { type: 'NEXT_QUESTION' };
        }
        break;
    }
    if (delay === null || !action) return;
    const a = action;
    const id = window.setTimeout(() => store.dispatch(a), Math.max(0, delay - elapsed));
    return () => window.clearTimeout(id);
  }, [g.phase, g.phaseStartedAt, g.paused, g.index, g.testMode, s.autoTransitions, total]);

  // Lifeline sequences.
  useEffect(() => {
    if (g.paused || !g.activeLifeline || !g.lifelineAt) return;
    const elapsed = Date.now() - g.lifelineAt;
    let id = 0;
    if (g.activeLifeline === 'fifty' && g.fiftyPending) {
      id = window.setTimeout(() => store.dispatch({ type: 'FIFTY_APPLY' }), Math.max(0, FIFTY_AFTER_MS - elapsed));
    } else if (g.activeLifeline === 'audience' && g.audience?.status === 'voting') {
      id = window.setTimeout(() => store.dispatch({ type: 'AUDIENCE_SHOW' }), Math.max(0, AUDIENCE_AFTER_MS - elapsed));
    }
    return () => window.clearTimeout(id);
  }, [g.activeLifeline, g.lifelineAt, g.paused, g.fiftyPending, g.audience?.status]);

  // Phone time-out ends the call automatically.
  const phone = g.phone;
  useEffect(() => {
    if (!phone || phone.status !== 'connected' || !phone.running || g.paused) return;
    const left = phoneLeftMs(g);
    const id = window.setTimeout(() => store.dispatch({ type: 'PHONE_END' }), left + 50);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone?.status, phone?.running, phone?.startedAt, phone?.remainingMs, g.paused]);
}

/** Keyboard shortcuts for the host. Stage-advancing keys are debounced. */
export function useShortcuts(data: AppData, extra: { playVideo: () => void; fullscreen: () => void; menuOpen: boolean }) {
  const ref = useRef({ data, extra });
  ref.current = { data, extra };
  const lastAdvance = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { data, extra } = ref.current;
      if (extra.menuOpen) return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      const k = e.key.toLowerCase();
      // Fullscreen works even with shortcuts disabled.
      if (k === 'f') return extra.fullscreen();
      if (!data.settings.shortcutsEnabled) return;
      const g = data.game;
      const guarded = (fn: () => void) => {
        const now = Date.now();
        if (now - lastAdvance.current < 800) return;
        lastAdvance.current = now;
        fn();
      };
      if (['1', '2', '3', '4'].includes(k)) {
        store.dispatch({ type: 'SELECT', answer: (Number(k) - 1) as AnswerIndex });
      } else if (k === 'enter') {
        e.preventDefault();
        guarded(() => store.dispatch({ type: 'SHOW_ANSWER' }));
      } else if (k === 'r') {
        guarded(() => store.dispatch({ type: 'REVEAL' }));
      } else if (k === ' ') {
        e.preventDefault();
        guarded(() => store.dispatch({ type: g.paused ? 'RESUME' : 'PAUSE' }));
      } else if (k === 'n') {
        guarded(() => store.dispatch({ type: g.phase === 'IDLE' ? 'START_GAME' : 'NEXT_QUESTION' }));
      } else if (k === 'v') {
        guarded(extra.playVideo);
      } else if (k === 'm') {
        store.dispatch({ type: 'TOGGLE_MUSIC' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
