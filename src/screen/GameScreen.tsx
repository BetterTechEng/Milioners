import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useAppData, store } from '../game/store';
import { currentQuestion } from '../game/machine';
import { ladder, levelCount } from '../game/rules';
import { AudioManager } from '../audio/AudioManager';
import { Emblem, Stage, StudioBackground, type Mood } from './Studio';
import { QuestionBoard } from './Board';
import { Lifelines, MoneyLadder, TopInfo } from './Hud';
import {
  AudienceOverlay,
  AudioGate,
  EndOverlay,
  IntroOverlay,
  PauseOverlay,
  PhoneOverlay,
  ResultBanner,
  TransitionWipe,
} from './Overlays';
import { VideoOverlay } from './VideoOverlay';
import type { AppData } from '../types';

function moodFor(data: AppData): Mood {
  const g = data.game;
  if (g.paused) return 'paused';
  switch (g.phase) {
    case 'ANSWER_LOCKED':
    case 'ANSWER_REVEAL':
      return 'locked';
    case 'ANSWER_CORRECT':
      return 'correct';
    case 'ANSWER_INCORRECT':
      return 'wrong';
    case 'GAME_WON':
      return 'win';
    case 'QUESTION_ACTIVE':
    case 'ANSWER_SELECTED':
      return 'tense';
    default:
      return 'calm';
  }
}

async function toggleFullscreen(): Promise<boolean> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}

export function GameScreen() {
  const data = useAppData();
  const g = data.game;
  const s = data.settings;
  const [audioReady, setAudioReady] = useState(AudioManager.ready);
  const [toast, setToast] = useState<string | null>(null);
  const lastSeq = useRef(g.eventSeq);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Announce presence to the host panel.
  useEffect(() => {
    const ping = () => store.send({ type: 'presence', role: 'screen', id: store.origin, audioReady: AudioManager.ready });
    ping();
    const id = window.setInterval(ping, 2000);
    const off = store.onMessage((msg) => {
      if (msg.type === 'ping') ping();
      if (msg.type === 'fullscreen') {
        toggleFullscreen().then((ok) => {
          if (!ok) showToast('Przeglądarka zablokowała pełny ekran zdalnie. Naciśnij F lub kliknij dwukrotnie ten ekran.');
        });
      }
    });
    return () => {
      window.clearInterval(id);
      off();
    };
  }, []);

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 5000);
  }

  // Keyboard: F = fullscreen on this screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') void toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Volumes and music toggle.
  useEffect(() => {
    AudioManager.setVolumes(s.volume);
  }, [s.volume]);
  useEffect(() => {
    AudioManager.setMusicOn(g.musicOn);
  }, [g.musicOn]);

  // Translate new game events to audio cues.
  useEffect(() => {
    const fresh = g.events.filter((e) => e.seq > lastSeq.current);
    lastSeq.current = Math.max(lastSeq.current, g.eventSeq);
    if (!audioReady) return;
    for (const ev of fresh) AudioManager.handleEvent(ev, data);
  }, [g.eventSeq, g.events, audioReady, data]);

  async function enableAudio(fullscreen: boolean) {
    if (fullscreen) await toggleFullscreen();
    const ok = await AudioManager.unlock();
    setAudioReady(ok);
    if (ok) {
      const d = dataRef.current;
      AudioManager.setVolumes(d.settings.volume);
      AudioManager.setMusicOn(d.game.musicOn);
      if (d.game.paused) void AudioManager.setPaused(true);
      else AudioManager.syncMusic(d);
      store.send({ type: 'presence', role: 'screen', id: store.origin, audioReady: true });
    }
  }

  const q = currentQuestion(data);
  const total = g.testMode ? data.questions.length : levelCount(data.questions, s);
  const prizes = ladder(data.questions, s);
  const onBoard =
    q &&
    ['QUESTION_INTRO', 'QUESTION_ACTIVE', 'ANSWER_SELECTED', 'ANSWER_LOCKED', 'VIDEO_PLAYING', 'ANSWER_REVEAL', 'ANSWER_CORRECT', 'ANSWER_INCORRECT', 'QUESTION_COMPLETED'].includes(g.phase);
  const showEmblem = onBoard && !g.activeLifeline && !(q?.image) && g.phase !== 'ANSWER_CORRECT' && g.phase !== 'ANSWER_INCORRECT';
  const speed = s.animationSpeed;

  return (
    <MotionConfig reducedMotion={s.reducedMotion ? 'always' : 'never'}>
      <Stage className={`${g.paused ? 'anim-paused' : ''} ${s.presentationMode ? 'presentation' : ''} ${s.reducedMotion ? 'reduced-motion' : ''}`}>
        <div className="absolute inset-0" data-theme={s.theme} onDoubleClick={() => void toggleFullscreen()}>
          <StudioBackground mood={moodFor(data)} paused={g.paused} reduced={s.reducedMotion} />

          {/* Idle lobby */}
          <AnimatePresence>
            {g.phase === 'IDLE' && (
              <motion.div className="absolute inset-0 flex flex-col items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 5, repeat: Infinity }}>
                  <Emblem title={s.title} size={520} />
                </motion.div>
                {!s.presentationMode && (
                  <div className="mt-10 font-display text-[28px] tracking-[0.3em] text-blue-200/80 uppercase">Czekamy na prowadzącego</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <IntroOverlay data={data} />

          {g.phase !== 'IDLE' && g.phase !== 'INTRO' && (
            <>
              <TopInfo title={s.title} participant={g.participant} testMode={g.testMode} level={g.index} total={total} showMeta={!s.presentationMode} />
              <Lifelines g={g} settings={s} />
              {!g.testMode && <MoneyLadder prizes={prizes} settings={s} g={g} />}
            </>
          )}

          <AnimatePresence>
            {showEmblem && (
              <motion.div
                key="emblem"
                className="absolute"
                style={{ left: 730 - 180, top: 170 }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.6 * speed }}
              >
                <Emblem title={s.title} size={360} />
              </motion.div>
            )}
          </AnimatePresence>

          {onBoard && q && <QuestionBoard g={g} q={q} speed={speed} showImage={!g.activeLifeline} />}

          <ResultBanner data={data} q={q} />
          <AudienceOverlay g={g} />
          <PhoneOverlay g={g} settings={s} />
          <TransitionWipe active={g.phase === 'QUESTION_COMPLETED'} />
          <VideoOverlay data={data} />
          <EndOverlay data={data} />
          <PauseOverlay paused={g.paused} />

          {!audioReady && <AudioGate onEnable={(fs) => void enableAudio(fs)} />}

          <AnimatePresence>
            {toast && (
              <motion.div
                className="absolute bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-black/80 px-10 py-5 font-display text-[26px] text-white"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Stage>
    </MotionConfig>
  );
}
