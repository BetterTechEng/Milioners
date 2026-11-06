import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

/** Fixed 1920×1080 stage scaled to fit the window, letterboxed. */
export function Stage({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="fixed inset-0 overflow-hidden bg-black" onScroll={(e) => e.currentTarget.scrollTo(0, 0)}>
      <div
        className={`stage ${className}`}
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
        // The stage must never scroll, even if focus moves to a partly hidden element.
        onScroll={(e) => e.currentTarget.scrollTo(0, 0)}
      >
        {children}
      </div>
    </div>
  );
}

export type Mood = 'calm' | 'tense' | 'locked' | 'correct' | 'wrong' | 'win' | 'paused';

const MOOD_FLASH: Record<Mood, string | null> = {
  calm: null,
  tense: null,
  locked: 'radial-gradient(ellipse at 40% 75%, rgba(255,150,30,0.22), transparent 60%)',
  correct: 'radial-gradient(ellipse at 40% 75%, rgba(40,255,120,0.35), transparent 65%)',
  wrong: 'radial-gradient(ellipse at 40% 75%, rgba(255,30,30,0.35), transparent 65%)',
  win: 'radial-gradient(ellipse at 50% 50%, rgba(255,210,80,0.4), transparent 70%)',
  paused: null,
};

export function StudioBackground({ mood, paused, reduced }: { mood: Mood; paused: boolean; reduced: boolean }) {
  const flash = MOOD_FLASH[mood];
  return (
    <div className="absolute inset-0">
      <div className="studio-base" />
      {!reduced && <div className="studio-beams" />}
      {!reduced && <div className="studio-beams reverse" />}
      {!reduced && <div className="spotlight left" />}
      {!reduced && <div className="spotlight right" />}
      <div className="studio-floor" />
      <Particles paused={paused || reduced} intensity={mood === 'win' ? 2.5 : mood === 'tense' || mood === 'locked' ? 1.3 : 1} gold={mood === 'win' || mood === 'correct'} />
      <AnimatePresence>
        {flash && (
          <motion.div
            key={mood}
            className="mood-flash"
            style={{ background: flash }}
            initial={{ opacity: 0 }}
            animate={{ opacity: mood === 'locked' ? [0.5, 1, 0.5] : 1 }}
            exit={{ opacity: 0 }}
            transition={mood === 'locked' ? { duration: 1.6, repeat: Infinity } : { duration: 0.6 }}
          />
        )}
      </AnimatePresence>
      <div className="vignette" />
    </div>
  );
}

interface P {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  a: number;
  tw: number;
}

/** Light dust drifting through the studio lights. */
function Particles({ paused, intensity, gold }: { paused: boolean; intensity: number; gold: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ paused, intensity, gold });
  opts.current = { paused, intensity, gold };

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const W = 1920;
    const H = 1080;
    const make = (): P => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.6 + Math.random() * 2.2,
      vy: -(0.15 + Math.random() * 0.5),
      vx: (Math.random() - 0.5) * 0.2,
      a: 0.2 + Math.random() * 0.6,
      tw: Math.random() * Math.PI * 2,
    });
    const ps: P[] = Array.from({ length: 140 }, make);
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(50, now - last) / 16.7;
      last = now;
      if (opts.current.paused) return;
      const { intensity, gold } = opts.current;
      ctx.clearRect(0, 0, W, H);
      const visible = Math.floor(70 * intensity);
      for (let i = 0; i < Math.min(ps.length, visible); i++) {
        const p = ps[i];
        p.y += p.vy * dt * intensity;
        p.x += p.vx * dt;
        p.tw += 0.03 * dt;
        if (p.y < -10) Object.assign(p, make(), { y: H + 10 });
        const alpha = p.a * (0.55 + 0.45 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.fillStyle = gold ? `rgba(255,215,120,${alpha})` : `rgba(170,200,255,${alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} width={1920} height={1080} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'screen' }} />;
}

/** Show emblem: the host's photo in a gold ring with rotating rays. */
export function Emblem({ title, size = 340, spinning = true }: { title: string; size?: number; spinning?: boolean }) {
  // The ring's inner edge sits at radius 153 of the 400-unit viewBox.
  const photo = (306 / 400) * size;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <img
        src={`${import.meta.env.BASE_URL}luki.webp`}
        alt={title}
        draggable={false}
        className="absolute rounded-full object-cover"
        style={{ width: photo, height: photo, left: (size - photo) / 2, top: (size - photo) / 2, objectPosition: '50% 35%' }}
      />
      <svg viewBox="0 0 400 400" className="pointer-events-none absolute inset-0 h-full w-full drop-shadow-[0_0_40px_rgba(120,150,255,0.6)]">
        <defs>
          <linearGradient id="em-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3c4" />
            <stop offset="0.35" stopColor="#f0c75e" />
            <stop offset="0.6" stopColor="#b9821f" />
            <stop offset="1" stopColor="#ffe39a" />
          </linearGradient>
          <radialGradient id="em-vignette" cx="50%" cy="50%" r="50%">
            <stop offset="0.7" stopColor="#040733" stopOpacity="0" />
            <stop offset="1" stopColor="#040733" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        <g style={spinning ? { animation: 'spin 60s linear infinite', transformOrigin: '200px 200px' } : undefined}>
          {Array.from({ length: 36 }, (_, i) => (
            <rect key={i} x="198" y="6" width="4" height={i % 3 === 0 ? 26 : 14} rx="2" fill="url(#em-gold)" opacity={i % 3 === 0 ? 0.9 : 0.5} transform={`rotate(${i * 10} 200 200)`} />
          ))}
        </g>
        <circle cx="200" cy="200" r="153" fill="url(#em-vignette)" />
        <circle cx="200" cy="200" r="158" fill="none" stroke="url(#em-gold)" strokeWidth="10" />
        <circle cx="200" cy="200" r="150" fill="none" stroke="url(#em-gold)" strokeWidth="2" opacity="0.8" />
        <ellipse cx="200" cy="120" rx="110" ry="45" fill="white" opacity="0.08" />
      </svg>
    </div>
  );
}
