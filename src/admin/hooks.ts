import { useEffect, useRef, useState } from 'react';
import type { AnswerIndex, AppData } from '../types';
import { store } from '../game/store';
import { introTiming, levelCount } from '../game/rules';
import { currentQuestion, phoneLeftMs } from '../game/machine';

/**
 * Timed transitions that the host does not have to click:
 * question intro → active, reveal pause → result, transition → next question,
 * final correct answer → victory, phone time-out. Auto mode adds a few more.
 */
export function useDirector(data: AppData) {
  const g = data.game;
  const s = data.settings;
  useEffect(() => {
    if (g.paused) return;
    const elapsed = Date.now() - g.phaseStartedAt;
    const total = levelCount(data.questions, s);
    let delay: number | null = null;
    let action: Parameters<typeof store.dispatch>[0] | null = null;

    switch (g.phase) {
      case 'QUESTION_INTRO':
        delay = introTiming(s.animationSpeed).totalMs;
        action = { type: 'ANSWERS_SHOWN' };
        break;
      case 'ANSWER_REVEAL':
        delay = s.revealDelayMs;
        action = { type: 'RESOLVE' };
        break;
      case 'QUESTION_COMPLETED':
        delay = 1700 * s.animationSpeed;
        action = { type: 'ADVANCE' };
        break;
      case 'ANSWER_CORRECT':
        if (!g.testMode && g.index >= total - 1) {
          delay = 4200;
          action = { type: 'FINISH_WIN' };
        } else if (s.autoTransitions && !g.testMode) {
          delay = 5000;
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
  }, [g.phase, g.phaseStartedAt, g.paused, g.index, g.testMode, s.animationSpeed, s.revealDelayMs, s.autoTransitions, data.questions, s]);

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
export function useShortcuts(data: AppData, extra: { playVideo: () => void; fullscreen: () => void }) {
  const ref = useRef({ data, extra });
  ref.current = { data, extra };
  const lastAdvance = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { data, extra } = ref.current;
      if (!data.settings.shortcutsEnabled || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;
      const g = data.game;
      const guarded = (fn: () => void) => {
        const now = Date.now();
        if (now - lastAdvance.current < 600) return;
        lastAdvance.current = now;
        fn();
      };
      const k = e.key.toLowerCase();
      if (['1', '2', '3', '4'].includes(k)) {
        store.dispatch({ type: 'SELECT', answer: (Number(k) - 1) as AnswerIndex });
      } else if (k === 'enter') {
        e.preventDefault();
        guarded(() => store.dispatch({ type: 'LOCK' }));
      } else if (k === ' ') {
        e.preventDefault();
        guarded(() => store.dispatch({ type: g.paused ? 'RESUME' : 'PAUSE' }));
      } else if (k === 'n') {
        guarded(() => {
          if (g.phase === 'IDLE') store.dispatch({ type: 'START_GAME' });
          else store.dispatch({ type: 'NEXT_QUESTION' });
        });
      } else if (k === 'r') {
        guarded(() => store.dispatch({ type: 'REVEAL' }));
      } else if (k === 'v') {
        guarded(extra.playVideo);
      } else if (k === 'f') {
        extra.fullscreen();
      } else if (k === 'm') {
        store.dispatch({ type: 'TOGGLE_MUSIC' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Tracks whether the game screen is open and audio-enabled, plus video progress. */
export function useScreenStatus() {
  const [lastSeen, setLastSeen] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [video, setVideo] = useState<{ current: number; duration: number; paused: boolean } | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const off = store.onMessage((msg) => {
      if (msg.type === 'presence' && msg.role === 'screen') {
        setLastSeen(Date.now());
        setAudioReady(!!msg.audioReady);
      } else if (msg.type === 'videoProgress') {
        setVideo({ current: msg.current, duration: msg.duration, paused: msg.paused });
      } else if (msg.type === 'videoError') {
        setVideoError(msg.message);
      }
    });
    store.send({ type: 'ping' });
    const id = window.setInterval(() => tick((x) => x + 1), 1000);
    return () => {
      off();
      window.clearInterval(id);
    };
  }, []);
  return {
    connected: Date.now() - lastSeen < 5000,
    audioReady,
    video,
    videoError,
    clearVideoError: () => setVideoError(null),
  };
}

export function useCurrent(data: AppData) {
  return currentQuestion(data);
}
