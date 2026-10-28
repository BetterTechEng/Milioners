import { useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  Film,
  Flag,
  Maximize,
  Minimize2,
  Music,
  Pause,
  PhoneOff,
  Play,
  RefreshCw,
  RotateCcw,
  Settings as SettingsIcon,
  SkipForward,
  Sparkles,
  X,
  VolumeX,
} from 'lucide-react';
import type { AppData } from '../types';
import { store } from '../game/store';
import { canDo, currentQuestion, type Action } from '../game/machine';
import { levelCount } from '../game/rules';
import { QuestionsTab } from './QuestionsTab';
import { SettingsTab } from './SettingsTab';
import { SavesTab } from './SavesTab';

function Small({
  children,
  icon,
  onClick,
  disabled,
  tone = 'blue',
  title,
}: {
  children?: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'blue' | 'gold' | 'red' | 'violet';
  title?: string;
}) {
  const tones = {
    blue: 'border-[#3a4bb0] bg-[#101a5c]/90 text-blue-50 hover:bg-[#1d2a7a]',
    gold: 'border-[#ffe7a8] bg-gradient-to-b from-[#ffd36b] to-[#d0901c] text-[#2a1600] hover:brightness-110',
    red: 'border-[#ff9b9b] bg-[#7a1414]/90 text-white hover:bg-[#9b1c1c]',
    violet: 'border-[#c2a3ff] bg-[#4a1fa8]/90 text-white hover:brightness-110',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${tones[tone]}`}
    >
      {icon}
      {children}
    </button>
  );
}

const act = (a: Action) => store.dispatch(a);

/** Small host controls placed directly in the game page. */
export function HostBar({ data, onFullscreen, menuOpen, setMenuOpen }: { data: AppData; onFullscreen: () => void; menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  const g = data.game;
  const s = data.settings;
  const q = currentQuestion(data);
  const can = (a: Action) => canDo(data, a);
  const total = g.testMode ? data.questions.length : levelCount(data.questions, s);
  const last = g.index >= total - 1;

  let primary: { label: string; action: Action } | null = null;
  if (g.phase === 'IDLE') primary = { label: 'Start gry', action: { type: 'START_GAME' } };
  else if (g.phase === 'INTRO') primary = { label: 'Pierwsze pytanie', action: { type: 'NEXT_QUESTION' } };
  else if (g.phase === 'ANSWER_CORRECT' || g.phase === 'ANSWER_INCORRECT')
    primary = { label: g.testMode ? 'Zakończ test' : last ? 'Zakończ teleturniej' : 'Następne pytanie', action: { type: 'NEXT_QUESTION' } };
  else if (g.phase === 'GAME_WON' || g.phase === 'GAME_LOST') primary = { label: 'Nowa gra', action: { type: 'NEW_GAME' } };

  return (
    <>
      <div className={`group fixed inset-x-0 bottom-0 z-[60] flex justify-center px-2 pb-2 pt-6 ${s.presentationMode ? 'opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100' : ''}`}>
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-xl border border-[#2c3880]/80 bg-[#050826]/80 px-2 py-1.5 shadow-lg backdrop-blur">
          {g.phase === 'IDLE' && s.participants.length > 1 && (
            <select
              className="h-7 rounded-md border border-[#3a4bb0] bg-[#101a5c] px-1 text-[11px] text-white"
              value={g.participant}
              onChange={(e) => act({ type: 'NEW_GAME', participant: e.target.value })}
              title="Uczestnik"
            >
              {s.participants.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          )}
          {primary && (
            <Small tone="gold" icon={<Sparkles size={12} />} disabled={!can(primary.action)} onClick={() => act(primary.action)}>
              {primary.label}
            </Small>
          )}

          {/* Lifeline controls */}
          {g.activeLifeline === 'phone' && g.phone && (
            <>
              {g.phone.status === 'connected' &&
                (g.phone.running ? (
                  <Small icon={<Pause size={12} />} onClick={() => act({ type: 'PHONE_TIMER', cmd: 'pause' })}>Pauza licznika</Small>
                ) : (
                  <Small icon={<Play size={12} />} disabled={!can({ type: 'PHONE_TIMER', cmd: 'start' })} onClick={() => act({ type: 'PHONE_TIMER', cmd: 'start' })}>Wznów licznik</Small>
                ))}
              {g.phone.status === 'connected' && <Small icon={<RotateCcw size={12} />} onClick={() => act({ type: 'PHONE_TIMER', cmd: 'reset' })}>Reset</Small>}
              {g.phone.status === 'connected' && <Small tone="red" icon={<PhoneOff size={12} />} onClick={() => act({ type: 'PHONE_END' })}>Zakończ rozmowę</Small>}
              <Small icon={<X size={12} />} onClick={() => act({ type: 'LIFELINE_CLOSE' })}>Zamknij telefon</Small>
            </>
          )}
          {g.activeLifeline === 'audience' && <Small icon={<X size={12} />} onClick={() => act({ type: 'LIFELINE_CLOSE' })}>Zamknij publiczność</Small>}

          {/* Video */}
          {q?.answerVideo && can({ type: 'PLAY_VIDEO', which: 'answer' }) && (
            <Small tone="violet" icon={<Film size={12} />} onClick={() => act({ type: 'PLAY_VIDEO', which: 'answer' })}>Film z odpowiedzią</Small>
          )}
          {q?.video && can({ type: 'PLAY_VIDEO', which: 'question' }) && (
            <Small tone="violet" icon={<Film size={12} />} onClick={() => act({ type: 'PLAY_VIDEO', which: 'question' })}>Materiał wideo</Small>
          )}
          {g.video && (
            <>
              <Small icon={g.video.playing ? <Pause size={12} /> : <Play size={12} />} onClick={() => act({ type: 'VIDEO_CONTROL', playing: !g.video!.playing })}>
                {g.video.playing ? 'Pauza filmu' : 'Odtwarzaj'}
              </Small>
              <Small icon={g.video.maximized ? <Minimize2 size={12} /> : <Maximize size={12} />} onClick={() => act({ type: 'VIDEO_CONTROL', maximized: !g.video!.maximized })}>
                {g.video.maximized ? 'Zmniejsz film' : 'Film na cały ekran'}
              </Small>
              <Small tone="red" icon={<X size={12} />} onClick={() => act({ type: 'CLOSE_VIDEO' })}>Zamknij film</Small>
            </>
          )}

          <span className="mx-0.5 h-5 w-px bg-[#2c3880]" />
          <Small icon={<ChevronLeft size={12} />} title="Poprzednie pytanie" disabled={!can({ type: 'PREV_QUESTION' })} onClick={() => act({ type: 'PREV_QUESTION' })} />
          <Small icon={<SkipForward size={12} />} title="Pomiń pytanie" disabled={!can({ type: 'SKIP_QUESTION' })} onClick={() => confirm('Pominąć to pytanie?') && act({ type: 'SKIP_QUESTION' })} />
          <Small icon={<RotateCcw size={12} />} title="Restart pytania" disabled={!can({ type: 'RESTART_QUESTION' })} onClick={() => act({ type: 'RESTART_QUESTION' })} />
          <Small
            icon={g.paused ? <Play size={12} /> : <Pause size={12} />}
            title={g.paused ? 'Wznów (Spacja)' : 'Pauza (Spacja)'}
            tone={g.paused ? 'gold' : 'blue'}
            disabled={!can({ type: g.paused ? 'RESUME' : 'PAUSE' })}
            onClick={() => act({ type: g.paused ? 'RESUME' : 'PAUSE' })}
          />
          <Small icon={g.musicOn ? <Music size={12} /> : <VolumeX size={12} />} title={g.musicOn ? 'Wycisz muzykę (M)' : 'Włącz muzykę (M)'} onClick={() => act({ type: 'TOGGLE_MUSIC' })} />
          <Small icon={<Maximize size={12} />} title="Pełny ekran (F)" onClick={onFullscreen} />
          <Small
            icon={<Flag size={12} />}
            title="Gracz rezygnuje i zabiera obecną wygraną"
            disabled={!can({ type: 'END_GAME' })}
            onClick={() => confirm('Gracz rezygnuje i zabiera obecną wygraną?') && act({ type: 'END_GAME' })}
          />
          <Small
            icon={<RefreshCw size={12} />}
            title="Restart gry"
            onClick={() => confirm('Zrestartować całą grę? Postęp tej rozgrywki zostanie utracony.') && act({ type: 'NEW_GAME' })}
          />
          <Small icon={<SettingsIcon size={12} />} title="Pytania, ustawienia, zapis" onClick={() => setMenuOpen(true)}>
            Menu
          </Small>
        </div>
      </div>
      {menuOpen && <HostMenu data={data} onClose={() => setMenuOpen(false)} />}
    </>
  );
}

type Tab = 'questions' | 'settings' | 'saves';

function HostMenu({ data, onClose }: { data: AppData; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('questions');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'questions', label: 'Pytania' },
    { id: 'settings', label: 'Ustawienia' },
    { id: 'saves', label: 'Zapis i historia' },
  ];
  return (
    <div className="fixed inset-0 z-[70] overflow-auto bg-[#070a24]/95 text-white backdrop-blur" role="dialog" aria-label="Menu prowadzącego">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-[#1d2766] bg-[#070a24]/95 px-4 py-2">
        <span className="gold-text mr-2 font-display text-lg font-black uppercase">{data.settings.title}</span>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1 text-sm font-semibold ${tab === t.id ? 'bg-gold-400 text-[#2a1600]' : 'text-blue-100 hover:bg-white/5'}`}
          >
            {t.label}
          </button>
        ))}
        <button onClick={onClose} className="ml-auto flex items-center gap-1 rounded-md border border-[#3a4bb0] px-3 py-1 text-sm hover:bg-white/5">
          <X size={14} /> Wróć do gry
        </button>
      </div>
      <div className="mx-auto max-w-[1400px] p-4">
        {tab === 'questions' && <QuestionsTab data={data} onTest={onClose} />}
        {tab === 'settings' && <SettingsTab data={data} />}
        {tab === 'saves' && <SavesTab data={data} />}
      </div>
    </div>
  );
}
