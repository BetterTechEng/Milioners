import { motion, AnimatePresence } from 'motion/react';
import { Phone, Users, X } from 'lucide-react';
import type { GameState, LifelineId, Settings } from '../types';
import { formatMoney, lastCorrectLevel } from '../game/rules';

export function MoneyLadder({
  prizes,
  settings,
  g,
}: {
  prizes: number[];
  settings: Settings;
  g: GameState;
}) {
  const reached = lastCorrectLevel(g.results);
  const justWon = g.phase === 'ANSWER_CORRECT' || g.phase === 'GAME_WON';
  const current = g.phase === 'IDLE' || g.phase === 'INTRO' ? -1 : g.index;
  const n = prizes.length;
  const rowH = Math.min(58, Math.floor(880 / n));
  const font = rowH > 50 ? 30 : rowH > 40 ? 26 : 20;

  return (
    <div className="absolute" style={{ left: 1490, top: 40, width: 400, bottom: 40 }}>
      <div className="absolute inset-0 rounded-[28px] border border-[rgba(var(--line),0.45)] bg-gradient-to-b from-[rgba(10,16,70,0.82)] to-[rgba(3,6,32,0.9)] shadow-[0_0_50px_rgba(var(--beam),0.35),inset_0_0_40px_rgba(var(--beam),0.15)] backdrop-blur-md" />
      <div className="absolute inset-x-4 top-4 bottom-4 flex flex-col-reverse justify-center">
        {prizes.map((p, i) => {
          const isCurrent = i === current;
          const passed = i <= reached;
          const thr = settings.thresholds.includes(i);
          return (
            <div key={i} className="relative flex items-center" style={{ height: rowH }}>
              {isCurrent && (
                <motion.div
                  layoutId="ladder-current"
                  className="absolute inset-y-[3px] inset-x-0 hex"
                  style={{
                    ['--cut' as string]: '18px',
                    background:
                      justWon && i === g.index
                        ? 'linear-gradient(180deg,#5af08e,#139a4a)'
                        : 'linear-gradient(180deg,#ffbf47,#d46c00)',
                    boxShadow: '0 0 24px rgba(255,170,40,0.8)',
                  }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                />
              )}
              {isCurrent && justWon && i === g.index && (
                <motion.div
                  className="absolute inset-0"
                  initial={{ opacity: 1, scaleX: 0.6 }}
                  animate={{ opacity: 0, scaleX: 1.3 }}
                  transition={{ duration: 1.2, repeat: 2 }}
                  style={{ background: 'radial-gradient(ellipse, rgba(120,255,170,0.7), transparent 70%)' }}
                />
              )}
              <span
                className="relative w-16 pl-5 font-display font-bold"
                style={{ fontSize: font * 0.8, color: isCurrent ? '#fff' : passed ? '#f5d77a' : '#f0b33f' }}
              >
                {i + 1}
              </span>
              <span className="relative mr-2" style={{ fontSize: font * 0.7, color: passed || isCurrent ? '#fff' : '#f0b33f', opacity: passed ? 1 : 0.6 }}>
                ◆
              </span>
              <span
                className="relative ml-2 font-display font-bold tracking-wide"
                style={{
                  fontSize: font,
                  color: isCurrent ? '#1b0b00' : thr ? '#ffffff' : passed ? '#f5d77a' : '#f0b33f',
                  textShadow: thr && !isCurrent ? '0 0 14px rgba(255,255,255,0.7)' : undefined,
                }}
              >
                {formatMoney(p, settings.currency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const LIFELINES: LifelineId[] = ['fifty', 'phone', 'audience'];

export function Lifelines({ g, settings, onUse }: { g: GameState; settings: Settings; onUse?: (id: LifelineId) => void }) {
  const list = LIFELINES.filter((l) => settings.lifelinesEnabled[l]);
  return (
    <div className="absolute flex gap-8" style={{ left: 730 - (list.length * 150 + (list.length - 1) * 32) / 2, top: 40 }}>
      {list.map((id) => {
        const used = g.lifelinesUsed[id];
        const active = g.activeLifeline === id;
        const usable = !!onUse && !used && !g.activeLifeline && g.phase === 'QUESTION_ACTIVE' && !g.paused;
        return (
          <motion.div
            key={id}
            className={`relative flex h-[86px] w-[150px] items-center justify-center rounded-[50%] border-[3px] ${usable ? 'cursor-pointer hover:brightness-125' : ''}`}
            onClick={usable ? () => onUse?.(id) : undefined}
            role={usable ? 'button' : undefined}
            aria-label={id === 'fifty' ? 'Pół na pół' : id === 'phone' ? 'Telefon do przyjaciela' : 'Pytanie do publiczności'}
            style={{
              borderColor: used ? 'rgba(120,130,200,0.5)' : '#a9b8ff',
              background: used
                ? 'radial-gradient(ellipse at 50% 35%, #1b2468, #070b33)'
                : 'radial-gradient(ellipse at 50% 30%, #3f5cff, #0c1468 70%)',
              boxShadow: active ? '0 0 40px rgba(255,200,80,0.95)' : used ? 'none' : '0 0 22px rgba(var(--beam),0.7)',
            }}
            animate={active ? { scale: [1, 1.15, 1], rotate: [0, -3, 3, 0] } : { scale: 1, opacity: used ? 0.55 : 1 }}
            transition={active ? { duration: 1, repeat: Infinity } : { duration: 0.4 }}
          >
            {id === 'fifty' && <span className="font-display text-[30px] font-black text-white">50:50</span>}
            {id === 'phone' && <Phone size={44} strokeWidth={2.4} className="text-white" />}
            {id === 'audience' && <Users size={46} strokeWidth={2.4} className="text-white" />}
            <AnimatePresence>
              {used && !active && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 2.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                >
                  <X size={92} strokeWidth={3} className="text-red-500 drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

export function TopInfo({ title, participant, testMode, level, total, showMeta }: { title: string; participant: string; testMode: boolean; level: number; total: number; showMeta: boolean }) {
  return (
    <>
      <div className="absolute left-10 top-10">
        <div className="gold-text font-display text-[34px] font-black uppercase tracking-wider">{title}</div>
        {participant && <div className="mt-1 font-display text-[22px] font-semibold text-blue-100/80">{participant}</div>}
      </div>
      {level >= 0 && (
        <div className="absolute right-[460px] top-12 rounded-full border border-[rgba(var(--line),0.5)] bg-[rgba(5,10,50,0.6)] px-6 py-2 font-display text-[22px] font-bold text-blue-100">
          Pytanie {level + 1} / {total}
        </div>
      )}
      {testMode && showMeta && (
        <div className="absolute left-1/2 top-[150px] -translate-x-1/2 rounded-full bg-amber-500/90 px-6 py-1 font-display text-lg font-bold text-black">
          TRYB TESTOWY
        </div>
      )}
    </>
  );
}
