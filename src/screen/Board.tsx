import { AnimatePresence, motion } from 'motion/react';
import type { AnswerIndex, GameState, MediaRef, Question } from '../types';
import { ANSWER_LETTERS } from '../types';
import { lifelineBlocksAnswer } from '../game/machine';
import { MediaImage } from '../components/Media';

export type AnswerVisual = 'hidden' | 'idle' | 'selected' | 'locked' | 'dim' | 'correct' | 'wrong' | 'removed';

/** Decide how each answer looks. The correct answer is only used once revealed. */
export function answerVisual(g: GameState, q: Question, i: AnswerIndex): AnswerVisual {
  if (g.removed.includes(i)) return 'removed';
  const sel = g.selected === i;
  switch (g.phase) {
    case 'QUESTION_INTRO':
      return i < g.answersShown ? 'idle' : 'hidden';
    case 'QUESTION_ACTIVE':
      return 'idle';
    case 'ANSWER_SELECTED':
      return sel ? 'selected' : 'idle';
    case 'ANSWER_LOCKED':
    case 'ANSWER_REVEAL':
    case 'VIDEO_PLAYING':
      return sel ? 'locked' : g.selected === null ? 'idle' : 'dim';
    case 'ANSWER_CORRECT':
      return sel ? 'correct' : 'dim';
    case 'ANSWER_INCORRECT':
      if (sel) return 'wrong';
      if (i === q.correct) return 'correct';
      return 'dim';
    default:
      return 'idle';
  }
}

function fontFor(text: string, base: number) {
  if (text.length > 130) return base * 0.72;
  if (text.length > 90) return base * 0.82;
  if (text.length > 55) return base * 0.92;
  return base;
}

export function QuestionBoard({
  g,
  q,
  speed,
  showImage,
  onPick,
}: {
  g: GameState;
  q: Question;
  speed: number;
  showImage: boolean;
  onPick?: (i: AnswerIndex) => void;
}) {
  const leaving = g.phase === 'QUESTION_COMPLETED';
  const questionVisible = true;

  return (
    <>
      <AnimatePresence>
        {showImage && q.image && !leaving && questionVisible && (
          <QuestionImage key={q.id + '-img'} image={q.image} />
        )}
      </AnimatePresence>

      {/* Horizontal light lines that run through the boxes */}
      <motion.div
        className="connector-line"
        style={{ left: 0, width: 1460, top: 662 }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: leaving ? 0 : 1, opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.7 * speed }}
      />
      {[838, 953].map((top) => (
        <motion.div
          key={top}
          className="connector-line"
          style={{ left: 0, width: 1460, top }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: leaving ? 0 : 1, opacity: leaving ? 0 : 0.85 }}
          transition={{ duration: 0.7 * speed, delay: 0.2 * speed }}
        />
      ))}

      <AnimatePresence mode="wait">
        {questionVisible && !leaving && (
          <motion.div
            key={q.id}
            className="absolute"
            style={{ left: 80, width: 1300, top: 582, height: 162 }}
            initial={{ opacity: 0, scaleX: 0.2, scaleY: 0.6, filter: 'brightness(3)' }}
            animate={{ opacity: 1, scaleX: 1, scaleY: 1, filter: 'brightness(1)' }}
            exit={{ opacity: 0, scaleX: 0.3, y: 30, transition: { duration: 0.45 * speed } }}
            transition={{ type: 'spring', stiffness: 160, damping: 20, duration: 0.6 * speed }}
          >
            <div className="hex hex-frame h-full" style={{ ['--cut' as string]: '64px' }}>
              <div className="hex hex-fill hex-sweep flex items-center justify-center px-28" style={{ ['--cut' as string]: '62px' }}>
                <p
                  className="relative text-center font-display font-semibold leading-tight text-white text-glow"
                  style={{ fontSize: fontFor(q.text, 42) }}
                >
                  {q.text}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {([0, 1, 2, 3] as AnswerIndex[]).map((i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return (
          <AnswerBox
            key={q.id + '-' + i}
            letter={ANSWER_LETTERS[i]}
            text={q.answers[i]}
            visual={leaving ? 'hidden' : answerVisual(g, q, i)}
            left={80 + col * 670}
            top={790 + row * 115}
            speed={speed}
            onPick={onPick && g.phase === 'QUESTION_ACTIVE' && !lifelineBlocksAnswer(g) && !g.removed.includes(i) ? () => onPick(i) : undefined}
          />
        );
      })}
    </>
  );
}

function AnswerBox({
  letter,
  text,
  visual,
  left,
  top,
  speed,
  onPick,
}: {
  letter: string;
  text: string;
  visual: AnswerVisual;
  left: number;
  top: number;
  speed: number;
  onPick?: () => void;
}) {
  const shown = visual !== 'hidden' && visual !== 'removed';
  const stateClass =
    visual === 'selected'
      ? 'state-selected'
      : visual === 'locked'
        ? 'state-locked'
        : visual === 'correct'
          ? 'state-correct'
          : visual === 'wrong'
            ? 'state-wrong'
            : '';
  const letterColor = visual === 'selected' || visual === 'locked' || visual === 'correct' || visual === 'wrong' ? '#ffffff' : undefined;

  return (
    <AnimatePresence custom={visual}>
      {shown && (
        <motion.div
          className={`absolute ${stateClass} ${onPick ? 'cursor-pointer hover:brightness-125' : ''}`}
          style={{ left, top, width: 630, height: 96 }}
          onClick={onPick}
          role={onPick ? 'button' : undefined}
          aria-label={onPick ? `Odpowiedź ${letter}: ${text}` : undefined}
          custom={visual}
          variants={{
            exit: (v: AnswerVisual) =>
              v === 'removed'
                ? { opacity: 0, scale: 0.6, filter: 'blur(14px) brightness(3)', transition: { duration: 0.7 * speed } }
                : { opacity: 0, y: 30, transition: { duration: 0.35 * speed } },
          }}
          initial={{ opacity: 0, x: left < 400 ? -80 : 80, scale: 0.9, filter: 'brightness(2.5)' }}
          animate={{
            opacity: visual === 'dim' ? 0.42 : 1,
            x: visual === 'wrong' ? [0, -14, 12, -8, 6, 0] : 0,
            scale: visual === 'selected' ? 1.03 : visual === 'correct' || visual === 'wrong' ? 1.04 : 1,
            filter: visual === 'dim' ? 'brightness(0.6) saturate(0.6)' : 'brightness(1)',
          }}
          exit="exit"
          transition={{
            default: { type: 'spring', stiffness: 220, damping: 22 },
            x: visual === 'wrong' ? { duration: 0.55, ease: 'easeOut' } : { type: 'spring', stiffness: 220, damping: 22 },
            filter: { duration: 0.5 * speed },
            opacity: { duration: 0.4 * speed },
          }}
        >
          <div className="hex hex-frame h-full">
            <div className={`hex hex-fill flex items-center pl-14 pr-12 ${visual === 'idle' ? 'hex-sweep' : ''}`}>
              <span className="relative mr-4 font-display text-[34px] font-black" style={{ color: letterColor ?? '#f2c255', textShadow: '0 0 12px rgba(255,190,60,0.6)' }}>
                {letter}:
              </span>
              <span className="relative font-display font-semibold leading-tight text-white" style={{ fontSize: fontFor(text, 32) * (text.length > 40 ? 0.85 : 1) }}>
                {text}
              </span>
            </div>
          </div>
          {visual === 'correct' && (
            <motion.div
              className="pointer-events-none absolute -inset-6 rounded-full"
              initial={{ opacity: 0.9, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 1.2, repeat: 2 }}
              style={{ background: 'radial-gradient(ellipse, rgba(80,255,140,0.55), transparent 65%)' }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function QuestionImage({ image }: { image: MediaRef }) {
  return (
    <motion.div
      className="absolute flex items-center justify-center"
      style={{ left: 330, width: 800, top: 130, height: 420 }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="rounded-2xl border-2 border-gold-400/70 bg-black/40 p-2 shadow-[0_0_40px_rgba(120,150,255,0.5)]">
        <MediaImage media={image} className="max-h-[396px] max-w-[776px] rounded-xl object-contain" />
      </div>
    </motion.div>
  );
}
