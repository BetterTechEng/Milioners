import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useAppData, store } from '../game/store';
import { useDirector, useShortcuts } from '../host/hooks';
import { HostBar } from '../host/HostBar';
import { currentQuestion } from '../game/machine';
import { ladder, levelCount, pickFiftyFifty, randomAudience } from '../game/rules';
import { AudioManager } from '../audio/AudioManager';
import { Emblem, Stage, StudioBackground, type Mood } from './Studio';
import { QuestionBoard } from './Board';
import { Lifelines, MoneyLadder, TopInfo } from './Hud';
import {
  AudienceOverlay,
  EndOverlay,
  IntroOverlay,
  PauseOverlay,
  PhoneOverlay,
  ResultBanner,
  TransitionWipe,
} from './Overlays';
import { VideoOverlay } from './VideoOverlay';
import type { AnswerIndex, AppData, LifelineId } from '../types';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const lastSeq = useRef(g.eventSeq);
  const dataRef = useRef(data);
  dataRef.current = data;

  useDirector(data);
  useShortcuts(data, {
    playVideo: () => store.dispatch({ type: 'PLAY_VIDEO', which: 'answer' }),
    fullscreen: () => void toggleFullscreen(),
    menuOpen,
  });

  // On open: arrival music (or the thinking loop if a question is already on screen).
  useEffect(() => {
    const d = dataRef.current;
    AudioManager.setVolume(d.settings.volume.master, d.settings.volume.music);
    AudioManager.setMuted(!d.game.musicOn);
    AudioManager.setIdleHandler(() => AudioManager.syncLoop(dataRef.current));
    if (d.game.paused) AudioManager.setPaused(true);
    if (AudioManager.desiredLoop(d)) AudioManager.syncLoop(d);
    else AudioManager.playArrival();
    return () => AudioManager.stop();
  }, []);

  // Volumes and music toggle.
  useEffect(() => {
    AudioManager.setVolume(s.volume.master, s.volume.music);
  }, [s.volume.master, s.volume.music]);
  useEffect(() => {
    AudioManager.setMuted(!g.musicOn);
  }, [g.musicOn]);

  // Translate new game events to music.
  useEffect(() => {
    const fresh = g.events.filter((e) => e.seq > lastSeq.current);
    lastSeq.current = Math.max(lastSeq.current, g.eventSeq);
    for (const ev of fresh) AudioManager.handleEvent(ev, data);
  }, [g.eventSeq, g.events, data]);

  const pickAnswer = (i: AnswerIndex) => store.dispatch({ type: 'SELECT', answer: i });
  const useLifeline = (id: LifelineId) => {
    const cq = currentQuestion(dataRef.current);
    if (!cq) return;
    if (id === 'fifty') store.dispatch({ type: 'FIFTY_START', removed: pickFiftyFifty(cq.correct) });
    else if (id === 'phone') store.dispatch({ type: 'PHONE_START' });
    else store.dispatch({ type: 'AUDIENCE_START', results: randomAudience(dataRef.current.game.removed) });
  };

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
                  <div className="mt-10 font-display text-[28px] tracking-[0.3em] text-blue-200/80 uppercase">Prowadzący rozpoczyna grę przyciskiem „Start gry”</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <IntroOverlay data={data} />

          {g.phase !== 'IDLE' && g.phase !== 'INTRO' && (
            <>
              <TopInfo title={s.title} participant={g.participant} testMode={g.testMode} level={g.index} total={total} showMeta={!s.presentationMode} />
              <Lifelines g={g} settings={s} onUse={useLifeline} />
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

          {onBoard && q && <QuestionBoard g={g} q={q} speed={speed} showImage={!g.activeLifeline} onPick={pickAnswer} />}

          <ResultBanner data={data} q={q} />
          <AudienceOverlay g={g} />
          <PhoneOverlay g={g} settings={s} />
          <TransitionWipe active={g.phase === 'QUESTION_COMPLETED'} />
          <VideoOverlay data={data} />
          <EndOverlay data={data} />
          <PauseOverlay paused={g.paused} isBreak={g.breakPending} />

        </div>
      </Stage>
      <HostBar data={data} onFullscreen={() => void toggleFullscreen()} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
    </MotionConfig>
  );
}
