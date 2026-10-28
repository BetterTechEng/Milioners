import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Tone = 'primary' | 'gold' | 'green' | 'red' | 'ghost' | 'blue' | 'violet';

const TONES: Record<Tone, string> = {
  primary: 'bg-gradient-to-b from-[#3d58ff] to-[#1f2fb8] border-[#7d90ff] text-white hover:brightness-110',
  gold: 'bg-gradient-to-b from-[#ffd36b] to-[#d0901c] border-[#ffe7a8] text-[#2a1600] hover:brightness-110',
  green: 'bg-gradient-to-b from-[#36d673] to-[#11853f] border-[#9df5bd] text-white hover:brightness-110',
  red: 'bg-gradient-to-b from-[#ff5d5d] to-[#b31818] border-[#ffb0b0] text-white hover:brightness-110',
  blue: 'bg-[#16205e] border-[#3a4bb0] text-blue-50 hover:bg-[#1d2a7a]',
  violet: 'bg-gradient-to-b from-[#8a4dff] to-[#5220c0] border-[#c2a3ff] text-white hover:brightness-110',
  ghost: 'bg-transparent border-[#2c3880] text-blue-100 hover:bg-white/5',
};

export function Btn({
  tone = 'blue',
  icon,
  children,
  hint,
  className = '',
  big,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; icon?: ReactNode; hint?: string; big?: boolean }) {
  return (
    <button
      {...rest}
      title={rest.title ?? hint}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition select-none disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:brightness-100 ${
        big ? 'px-5 py-4 text-lg' : 'px-3 py-2 text-sm'
      } ${TONES[tone]} ${className}`}
    >
      {icon}
      <span className="truncate">{children}</span>
      {hint && <kbd className="ml-1 hidden rounded min-[1600px]:inline max-xl:inline bg-black/30 px-1.5 py-0.5 text-[10px] font-mono opacity-80">{hint}</kbd>}
    </button>
  );
}

export function Card({ title, icon, children, className = '', right }: { title?: ReactNode; icon?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-[#222c70] bg-[#0b1040]/85 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${className}`}>
      {title && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-gold-300">
            {icon}
            {title}
          </h3>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-blue-200/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-blue-300/60">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-[#2c3880] bg-[#060a2e] px-3 py-2 text-sm text-white placeholder:text-blue-300/40 focus:border-gold-400 focus:outline-none';

export function Slider({ label, value, onChange, min = 0, max = 1, step = 0.01, format }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs text-blue-200/80">
        <span>{label}</span>
        <span className="font-mono">{format ? format(value) : `${Math.round(value * 100)}%`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition ${checked ? 'border-gold-300 bg-gold-500' : 'border-[#2c3880] bg-[#060a2e]'}`}
      >
        <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} style={{ width: 18, height: 18 }} />
      </button>
      <span>
        <span className="text-sm text-white">{label}</span>
        {hint && <span className="block text-xs text-blue-300/60">{hint}</span>}
      </span>
    </label>
  );
}

export const PHASE_LABEL: Record<string, string> = {
  IDLE: 'Oczekiwanie',
  INTRO: 'Intro',
  QUESTION_INTRO: 'Prezentacja pytania',
  QUESTION_ACTIVE: 'Czekamy na odpowiedź',
  ANSWER_SELECTED: 'Odpowiedź wskazana',
  ANSWER_LOCKED: 'Odpowiedź zatwierdzona',
  VIDEO_PLAYING: 'Odtwarzanie filmu',
  ANSWER_REVEAL: 'Ujawnianie…',
  ANSWER_CORRECT: 'Poprawna odpowiedź',
  ANSWER_INCORRECT: 'Błędna odpowiedź',
  QUESTION_COMPLETED: 'Przejście',
  GAME_WON: 'Wygrana',
  GAME_LOST: 'Koniec gry',
};
