import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, animate } from 'motion/react';
import { Pause, Phone, PhoneOff, Users } from 'lucide-react';
import type { AppData, GameState, Question, Settings } from '../types';
import { ANSWER_LETTERS } from '../types';
import { formatMoney, isThreshold, lastCorrectLevel, prizeAt } from '../game/rules';
import { phoneLeftMs } from '../game/machine';
import { Emblem } from './Studio';

/* ---------- Audience ---------- */

function CountUp({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return setV(0);
    const c = animate(0, to, { duration: 2.2, ease: 'easeOut', onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [to, run]);
  return <>{v}%</>;
}

export function AudienceOverlay({ g }: { g: GameState }) {
  const a = g.audience;
  const voting = a?.status === 'voting';
  return (
    <AnimatePresence>
      {g.activeLifeline === 'audience' && a && (
        <motion.div
          className="absolute"
          style={{ left: 380, top: 150, width: 700, height: 410 }}
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: 'spring', stiffness: 160, damping: 20 }}
        >
          <div className="absolute inset-0 rounded-3xl border-2 border-[rgba(var(--line),0.7)] bg-gradient-to-b from-[#101a78]/95 to-[#040733]/95 shadow-[0_0_60px_rgba(var(--beam),0.6)]" />
          <div className="relative flex items-center justify-center gap-3 pt-5 font-display text-[28px] font-bold uppercase tracking-wider text-gold-300">
            <Users size={32} /> Pytanie do publiczności
          </div>
          <div className="relative mx-10 mt-3 flex h-[270px] items-end justify-around border-b-2 border-blue-300/40">
            {[0, 1, 2, 3].map((i) => {
              const removed = g.removed.includes(i as 0);
              const pct = a.results[i];
              return (
                <div key={i} className="flex h-full w-[110px] flex-col items-center justify-end">
                  <div className="mb-2 h-9 font-display text-[28px] font-bold text-white">
                    {!voting && !removed && <CountUp to={pct} run />}
                  </div>
                  <div className="relative w-[78px] flex-1">
                    {voting ? (
                      <motion.div
                        className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-blue-700 to-blue-300 opacity-70"
                        animate={{ height: removed ? '0%' : ['10%', '55%', '25%', '70%', '15%'] }}
                        transition={{ duration: 1.6 + i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    ) : (
                      <motion.div
                        className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-200 shadow-[0_0_24px_rgba(255,190,60,0.7)]"
                        initial={{ height: '0%' }}
                        animate={{ height: `${removed ? 0 : Math.max(1, pct)}%` }}
                        transition={{ duration: 2.2, ease: [0.2, 0.8, 0.2, 1] }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="relative mx-10 flex justify-around">
            {ANSWER_LETTERS.map((l, i) => (
              <div key={l} className={`w-[110px] py-2 text-center font-display text-[30px] font-black ${g.removed.includes(i as 0) ? 'text-slate-500' : 'text-gold-300'}`}>
                {l}
              </div>
            ))}
          </div>
          {voting && (
            <motion.div
              className="absolute inset-x-0 bottom-[-56px] text-center font-display text-[24px] font-semibold text-blue-100"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              Publiczność głosuje…
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Phone a friend ---------- */

export function PhoneOverlay({ g, settings }: { g: GameState; settings: Settings }) {
  const p = g.phone;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!p?.running || g.paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [p?.running, g.paused]);

  const leftMs = p ? phoneLeftMs(g, now) : 0;
  const secs = Math.ceil(leftMs / 1000);
  const total = settings.phoneSeconds;

  const urgent = secs <= 5 && p?.status === 'connected';
  const R = 120;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? leftMs / (total * 1000) : 0;

  return (
    <AnimatePresence>
      {g.activeLifeline === 'phone' && p && (
        <motion.div
          className="absolute"
          style={{ left: 380, top: 150, width: 700, height: 420 }}
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 160, damping: 20 }}
        >
          <div className="absolute inset-0 rounded-3xl border-2 border-[rgba(var(--line),0.7)] bg-gradient-to-b from-[#101a78]/95 to-[#040733]/95 shadow-[0_0_60px_rgba(var(--beam),0.6)]" />
          <div className="relative flex items-center justify-center gap-3 pt-5 font-display text-[28px] font-bold uppercase tracking-wider text-gold-300">
            <Phone size={30} /> Telefon do przyjaciela
          </div>

          {p.status === 'calling' && (
            <div className="relative mt-8 flex flex-col items-center">
              <div className="relative flex h-[180px] w-[180px] items-center justify-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-4 border-blue-300"
                    initial={{ scale: 0.5, opacity: 0.9 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7 }}
                  />
                ))}
                <motion.div animate={{ rotate: [0, -18, 18, -18, 18, 0] }} transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 1.5 }}>
                  <Phone size={110} className="text-white drop-shadow-[0_0_20px_rgba(150,180,255,0.9)]" />
                </motion.div>
              </div>
              <motion.div className="mt-8 font-display text-[30px] font-semibold" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }}>
                Łączenie…
              </motion.div>
            </div>
          )}

          {p.status !== 'calling' && (
            <div className="relative mt-4 flex flex-col items-center">
              <motion.div
                className="relative h-[270px] w-[270px]"
                animate={urgent && p.running && !g.paused ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="150" cy="150" r={R} stroke="rgba(120,150,255,0.25)" strokeWidth="18" fill="none" />
                  <circle
                    cx="150"
                    cy="150"
                    r={R}
                    stroke={urgent ? '#ff4b4b' : '#f2c255'}
                    strokeWidth="18"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - frac)}
                    style={{ transition: 'stroke-dashoffset 0.12s linear, stroke 0.3s', filter: `drop-shadow(0 0 10px ${urgent ? '#ff3030' : '#f2c255'})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    key={secs}
                    initial={{ scale: 1.25, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`font-display text-[120px] font-black leading-none ${urgent ? 'text-red-400' : 'text-white'}`}
                  >
                    {secs}
                  </motion.span>
                  <span className="font-display text-xl text-blue-200">sekund</span>
                </div>
              </motion.div>
              <div className="mt-3 font-display text-[24px] font-semibold text-blue-100">
                {p.status === 'ended' || leftMs <= 0 ? (
                  <span className="flex items-center gap-2 text-red-300">
                    <PhoneOff size={26} /> Koniec połączenia
                  </span>
                ) : p.running ? (
                  'Rozmowa trwa'
                ) : (
                  'Odliczanie wstrzymane'
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Banners after reveal ---------- */

export function ResultBanner({ data, q }: { data: AppData; q: Question | undefined }) {
  const g = data.game;
  const show = (g.phase === 'ANSWER_CORRECT' || g.phase === 'ANSWER_INCORRECT') && !g.activeLifeline;
  const correct = g.phase === 'ANSWER_CORRECT';
  const thr = correct && isThreshold(data.settings, g.index) && !g.testMode;
  const prize = prizeAt(data.questions, data.settings, g.index);
  if (!q) return null;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={g.phase + g.index}
          className="absolute flex flex-col items-center"
          style={{ left: 230, width: 1000, top: 250 }}
          initial={{ opacity: 0, scale: 0.5, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.5 }}
        >
          {correct ? (
            <>
              {thr && (
                <motion.div
                  className="mb-4 rounded-full border-2 border-gold-300 bg-gradient-to-b from-gold-400 to-gold-700 px-10 py-2 font-display text-[30px] font-black uppercase tracking-[0.2em] text-[#2a1600] shadow-[0_0_50px_rgba(255,200,80,0.9)]"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  Kwota gwarantowana
                </motion.div>
              )}
              <div className="gold-text font-display text-[110px] font-black leading-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.8)]">
                {formatMoney(prize, data.settings.currency)}
              </div>
              <div className="mt-3 font-display text-[30px] font-bold uppercase tracking-widest text-green-300 drop-shadow-[0_0_14px_rgba(60,255,120,0.8)]">
                Poprawna odpowiedź!
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-[64px] font-black uppercase text-red-400 drop-shadow-[0_0_24px_rgba(255,40,40,0.8)]">
                Niestety…
              </div>
              <div className="mt-2 font-display text-[32px] font-semibold text-blue-100">
                Prawidłowa odpowiedź: <span className="font-black text-green-300">{ANSWER_LETTERS[q.correct]}</span>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Intro, pause, end ---------- */

export function IntroOverlay({ data }: { data: AppData }) {
  const g = data.game;
  return (
    <AnimatePresence>
      {g.phase === 'INTRO' && (
        <motion.div className="absolute inset-0 flex flex-col items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.2 }} transition={{ duration: 0.8 }}>
          <motion.div
            initial={{ scale: 0.1, rotate: -200, opacity: 0, filter: 'brightness(4)' }}
            animate={{ scale: 1, rotate: 0, opacity: 1, filter: 'brightness(1)' }}
            transition={{ duration: 2.2, delay: 1.2, type: 'spring', stiffness: 60, damping: 14 }}
          >
            <Emblem title={data.settings.title} size={560} />
          </motion.div>
          {g.participant && (
            <motion.div className="mt-10 font-display text-[44px] font-bold text-white text-glow" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 5.6, duration: 0.8 }}>
              Dziś gra: <span className="gold-text">{g.participant}</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PauseOverlay({ paused, isBreak = false }: { paused: boolean; isBreak?: boolean }) {
  return (
    <AnimatePresence>
      {paused && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[rgba(2,4,26,0.72)] backdrop-blur-[10px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="flex h-40 w-40 items-center justify-center rounded-full border-4 border-gold-300 shadow-[0_0_60px_rgba(255,200,80,0.6)]">
            <Pause size={80} className="text-gold-300" />
          </motion.div>
          <motion.div
            className="mt-10 font-display text-[110px] font-black tracking-[0.15em] text-white text-glow"
            animate={{ opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            GAME PAUSED
          </motion.div>
          <div className="mt-2 font-display text-[32px] tracking-[0.4em] text-blue-200">{isBreak ? 'PRZERWA' : 'PAUZA'}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 110 }, (_, i) => ({
        i,
        x: Math.random() * 1920,
        d: 3 + Math.random() * 4,
        delay: Math.random() * 4,
        r: Math.random() * 720 - 360,
        c: ['#ffd76a', '#ffffff', '#f0a830', '#8fb0ff', '#ffe9a6'][i % 5],
        w: 8 + Math.random() * 10,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.i}
          className="absolute top-0"
          style={{ left: p.x, width: p.w, height: p.w * 0.45, background: p.c, borderRadius: 2 }}
          initial={{ y: -40, rotate: 0, opacity: 1 }}
          animate={{ y: 1140, rotate: p.r, opacity: [1, 1, 0.6] }}
          transition={{ duration: p.d, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

export function EndOverlay({ data }: { data: AppData }) {
  const g = data.game;
  const won = g.phase === 'GAME_WON';
  const lost = g.phase === 'GAME_LOST';
  const prize = g.finalPrize ?? 0;
  const lastWasCorrect = g.results.at(-1)?.outcome === 'correct' && lastCorrectLevel(g.results) >= 0;
  return (
    <AnimatePresence>
      {(won || lost) && (
        <motion.div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center"
          style={{ background: won ? 'radial-gradient(ellipse at 50% 45%, rgba(80,60,10,0.45), rgba(2,4,26,0.88) 70%)' : 'radial-gradient(ellipse at 50% 45%, rgba(30,10,40,0.6), rgba(2,4,26,0.92) 70%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          {won && <Confetti />}
          <motion.div initial={{ scale: 0.2, rotate: won ? -180 : 0, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ duration: 1.6, type: 'spring', stiffness: 70, damping: 12 }}>
            <Emblem title={data.settings.title} size={won ? 380 : 260} />
          </motion.div>
          <motion.div
            className={`mt-8 font-display font-black uppercase tracking-[0.12em] ${won ? 'gold-text text-[110px]' : 'text-[72px] text-white'}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            {g.endReason === 'stopped' ? 'Gracz kończy grę' : lastWasCorrect ? 'Gratulacje!' : 'Koniec teleturnieju'}
          </motion.div>
          {g.participant && (
            <motion.div className="mt-2 font-display text-[40px] font-semibold text-blue-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
              {g.participant}
            </motion.div>
          )}
          <motion.div className="mt-6 font-display text-[36px] text-blue-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}>
            {won ? 'wygrywa' : 'zabiera do domu'}
          </motion.div>
          <motion.div
            className="gold-text font-display text-[130px] font-black leading-tight drop-shadow-[0_8px_8px_rgba(0,0,0,0.8)]"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: won ? [1, 1.05, 1] : 1 }}
            transition={{ delay: 2, duration: won ? 2 : 0.8, repeat: won ? Infinity : 0 }}
          >
            {formatMoney(prize, data.settings.currency)}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Light wipe between questions. */
export function TransitionWipe({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none absolute inset-y-0 z-20 w-[700px]"
          style={{ background: 'linear-gradient(100deg, transparent, rgba(var(--line),0.45), rgba(255,255,255,0.6), rgba(var(--line),0.45), transparent)', filter: 'blur(20px)' }}
          initial={{ left: -800 }}
          animate={{ left: 2000 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
      )}
    </AnimatePresence>
  );
}
