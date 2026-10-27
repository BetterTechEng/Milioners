import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Film,
  Flag,
  Lock,
  Maximize,
  Minimize2,
  Music,
  Pause,
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  RefreshCw,
  RotateCcw,
  Rewind,
  FastForward,
  SkipForward,
  Sparkles,
  Users,
  Volume2,
  X,
  Eye,
  Wand2,
} from 'lucide-react';
import type { AnswerIndex, AppData } from '../types';
import { ANSWER_LETTERS } from '../types';
import { store } from '../game/store';
import { canDo, currentQuestion, phoneLeftMs, type Action } from '../game/machine';
import { formatMoney, ladder, levelCount, normalizeTo100, pickFiftyFifty, simulateAudience } from '../game/rules';
import { MediaVideo } from '../components/Media';
import { Btn, Card, PHASE_LABEL, Slider } from './ui';

type ScreenStatus = ReturnType<typeof import('./hooks').useScreenStatus>;

export function act(action: Action) {
  store.dispatch(action);
}

export function playAnswerVideo(data: AppData) {
  const q = currentQuestion(data);
  if (q?.answerVideo) act({ type: 'PLAY_VIDEO', which: 'answer' });
}

export function ControlTab({ data, screen, onFullscreen }: { data: AppData; screen: ScreenStatus; onFullscreen: () => void }) {
  const g = data.game;
  const s = data.settings;
  const q = currentQuestion(data);
  const total = g.testMode ? data.questions.length : levelCount(data.questions, s);
  const can = (a: Action) => canDo(data, a);
  const prizes = ladder(data.questions, s);

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_340px]">
      {/* ---- Flow ---- */}
      <div className="space-y-4">
        <NextStep data={data} />
        <Card title="Przebieg gry" icon={<Play size={16} />}>
          <div className="grid grid-cols-2 gap-2">
            <Btn tone="gold" icon={<Sparkles size={16} />} disabled={!can({ type: 'START_GAME' })} onClick={() => act({ type: 'START_GAME' })} className="col-span-2" hint="N">
              Start gry
            </Btn>
            <Btn icon={<ChevronLeft size={16} />} disabled={!can({ type: 'PREV_QUESTION' })} onClick={() => act({ type: 'PREV_QUESTION' })}>
              Poprzednie
            </Btn>
            <Btn icon={<ChevronRight size={16} />} disabled={!can({ type: 'NEXT_QUESTION' })} onClick={() => act({ type: 'NEXT_QUESTION' })} hint="N">
              Następne
            </Btn>
            <Btn tone="gold" icon={<Lock size={16} />} disabled={!can({ type: 'LOCK' })} onClick={() => act({ type: 'LOCK' })} hint="Enter">
              Zatwierdź
            </Btn>
            <Btn tone="green" icon={<Eye size={16} />} disabled={!can({ type: 'REVEAL' })} onClick={() => act({ type: 'REVEAL' })} hint="R">
              Odkryj
            </Btn>
            <Btn tone="violet" icon={<Film size={16} />} disabled={!can({ type: 'PLAY_VIDEO', which: 'answer' })} onClick={() => act({ type: 'PLAY_VIDEO', which: 'answer' })} hint="V" className="col-span-2">
              Odtwórz film z odpowiedzią
            </Btn>
            <Btn icon={<SkipForward size={16} />} disabled={!can({ type: 'SKIP_QUESTION' })} onClick={() => confirm('Pominąć to pytanie?') && act({ type: 'SKIP_QUESTION' })}>
              Pomiń
            </Btn>
            <Btn icon={<RotateCcw size={16} />} disabled={!can({ type: 'RESTART_QUESTION' })} onClick={() => act({ type: 'RESTART_QUESTION' })}>
              Restart pytania
            </Btn>
            <Btn
              tone={g.paused ? 'green' : 'blue'}
              icon={g.paused ? <Play size={16} /> : <Pause size={16} />}
              disabled={!can({ type: g.paused ? 'RESUME' : 'PAUSE' })}
              onClick={() => act({ type: g.paused ? 'RESUME' : 'PAUSE' })}
              hint="Spacja"
              className="col-span-2"
            >
              {g.paused ? 'Wznów grę' : 'Pauza'}
            </Btn>
            <Btn icon={<Music size={16} />} onClick={() => act({ type: 'TOGGLE_MUSIC' })} hint="M" tone={g.musicOn ? 'blue' : 'ghost'}>
              {g.musicOn ? 'Muzyka: wł.' : 'Muzyka: wył.'}
            </Btn>
            <Btn icon={<Maximize size={16} />} onClick={onFullscreen} hint="F">
              Pełny ekran
            </Btn>
            <Btn tone="red" icon={<Flag size={16} />} disabled={!can({ type: 'END_GAME' })} onClick={() => confirm(g.phase === 'ANSWER_INCORRECT' ? 'Zakończyć grę z kwotą gwarantowaną?' : 'Gracz rezygnuje i zabiera obecną wygraną?') && act({ type: 'END_GAME' })} className="col-span-2">
              {g.phase === 'ANSWER_INCORRECT' ? 'Zakończ grę (przegrana)' : 'Gracz rezygnuje'}
            </Btn>
            <Btn tone="ghost" icon={<RefreshCw size={16} />} onClick={() => confirm('Zrestartować całą grę? Postęp tej rozgrywki zostanie utracony.') && act({ type: 'NEW_GAME' })} className="col-span-2">
              Restart gry
            </Btn>
          </div>
        </Card>
        <VolumeCard data={data} />
      </div>

      {/* ---- Current question ---- */}
      <div className="space-y-4 min-w-0">
        <Card
          title={q ? `Pytanie ${g.index + 1} z ${total}${g.testMode ? ' · test' : ''}` : 'Brak pytania'}
          right={
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${g.paused ? 'bg-amber-500 text-black' : 'bg-[#1d2a7a] text-blue-100'}`}>
              {g.paused ? 'PAUZA · ' : ''}
              {PHASE_LABEL[g.phase]}
            </span>
          }
        >
          {q ? (
            <>
              <div className="mb-1 flex flex-wrap gap-3 text-xs text-blue-200/70">
                <span>Stawka: <b className="text-gold-300">{formatMoney(prizes[g.index] ?? 0, s.currency)}</b></span>
                <span>Trudność: {['', 'łatwe', 'średnie', 'trudne'][q.difficulty]}</span>
                {q.answerVideo && <span className="text-violet-300">Film z odpowiedzią ({(q.videoTiming ?? s.videoTiming) === 'before' ? 'przed ujawnieniem' : 'po ujawnieniu'}){g.videoWatched ? ' ✓ obejrzany' : ''}</span>}
              </div>
              <p className="mb-4 text-xl font-semibold leading-snug text-white">{q.text}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {([0, 1, 2, 3] as AnswerIndex[]).map((i) => {
                  const removed = g.removed.includes(i);
                  const selected = g.selected === i;
                  const correct = q.correct === i;
                  return (
                    <button
                      key={i}
                      disabled={!can({ type: 'SELECT', answer: i })}
                      onClick={() => act({ type: 'SELECT', answer: i })}
                      className={`relative flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition disabled:cursor-not-allowed ${
                        removed
                          ? 'border-transparent bg-black/30 text-slate-600 line-through'
                          : selected
                            ? 'border-amber-300 bg-gradient-to-b from-amber-500 to-orange-700 text-white'
                            : 'border-[#2c3880] bg-[#0f1660] text-white hover:border-gold-400 enabled:hover:bg-[#16207a]'
                      }`}
                    >
                      <span className="font-display text-lg font-black text-gold-300">{ANSWER_LETTERS[i]}</span>
                      <span className="flex-1 font-medium">{q.answers[i]}</span>
                      {correct && <CheckCircle2 size={20} className="shrink-0 text-green-400" aria-label="Poprawna odpowiedź" />}
                      <kbd className="rounded bg-black/30 px-1.5 text-[10px] font-mono text-blue-200">{i + 1}</kbd>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
                Poprawna odpowiedź (widzi tylko prowadzący): <b>{ANSWER_LETTERS[q.correct]}: {q.answers[q.correct]}</b>
              </div>
              {q.hostComment && (
                <div className="mt-2 rounded-lg border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-sm text-gold-100">
                  <b>Komentarz:</b> {q.hostComment}
                </div>
              )}
            </>
          ) : (
            <p className="text-blue-200">Dodaj pytania w zakładce „Pytania”.</p>
          )}
        </Card>

        <VideoCard data={data} screen={screen} />
      </div>

      {/* ---- Lifelines + ladder ---- */}
      <div className="space-y-4">
        <LifelinesCard data={data} />
        <Card title="Drabinka" icon={<Flag size={16} />}>
          <ol className="flex flex-col-reverse gap-0.5 text-sm">
            {prizes.map((p, i) => {
              const res = g.results.find((r) => r.index === i);
              return (
                <li
                  key={i}
                  className={`flex justify-between rounded px-2 py-0.5 ${i === g.index && g.phase !== 'IDLE' ? 'bg-orange-500/80 font-bold text-white' : s.thresholds.includes(i) ? 'text-white' : 'text-gold-300/80'}`}
                >
                  <span>
                    {i + 1}. {formatMoney(p, s.currency)}
                    {s.thresholds.includes(i) && ' ★'}
                  </span>
                  <span>{res ? (res.outcome === 'correct' ? '✓' : res.outcome === 'incorrect' ? '✗' : '↷') : ''}</span>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </div>
  );
}

function NextStep({ data }: { data: AppData }) {
  const g = data.game;
  const q = currentQuestion(data);
  const timing = q?.videoTiming ?? data.settings.videoTiming;
  let label = '';
  let action: Action | null = null;
  let note = '';
  if (g.paused) {
    label = 'Wznów grę';
    action = { type: 'RESUME' };
  } else
    switch (g.phase) {
      case 'IDLE':
        label = 'Start gry';
        action = { type: 'START_GAME' };
        break;
      case 'INTRO':
        label = 'Pokaż pierwsze pytanie';
        action = { type: 'NEXT_QUESTION' };
        break;
      case 'QUESTION_INTRO':
        note = 'Odpowiedzi pojawiają się na ekranie…';
        break;
      case 'QUESTION_ACTIVE':
        note = g.activeLifeline ? 'Trwa koło ratunkowe. Zamknij je, aby kontynuować.' : 'Wskaż odpowiedź uczestnika (1–4).';
        break;
      case 'ANSWER_SELECTED':
        label = 'Zatwierdź odpowiedź';
        action = { type: 'LOCK' };
        if (g.activeLifeline) {
          label = '';
          action = null;
          note = 'Zamknij koło ratunkowe.';
        }
        break;
      case 'ANSWER_LOCKED':
        if (q?.answerVideo && timing === 'before' && !g.videoWatched) {
          label = 'Odtwórz film z odpowiedzią';
          action = { type: 'PLAY_VIDEO', which: 'answer' };
        } else {
          label = 'Odkryj odpowiedź';
          action = { type: 'REVEAL' };
        }
        break;
      case 'VIDEO_PLAYING':
        label = 'Zamknij film';
        action = { type: 'CLOSE_VIDEO' };
        break;
      case 'ANSWER_REVEAL':
        note = 'Dramatyczna pauza…';
        break;
      case 'ANSWER_CORRECT':
        if (q?.answerVideo && timing === 'after' && !g.videoWatched) {
          label = 'Odtwórz film z odpowiedzią';
          action = { type: 'PLAY_VIDEO', which: 'answer' };
        } else if (canDo(data, { type: 'NEXT_QUESTION' })) {
          label = g.testMode ? 'Zakończ test' : 'Następne pytanie';
          action = { type: 'NEXT_QUESTION' };
        } else note = 'Finał! Za chwilę ekran zwycięstwa.';
        break;
      case 'ANSWER_INCORRECT':
        if (q?.answerVideo && timing === 'after' && !g.videoWatched) {
          label = 'Odtwórz film z odpowiedzią';
          action = { type: 'PLAY_VIDEO', which: 'answer' };
        } else if (g.testMode) {
          label = 'Zakończ test';
          action = { type: 'NEXT_QUESTION' };
        } else {
          label = 'Zakończ grę';
          action = { type: 'END_GAME' };
          note = 'Możesz też kontynuować przyciskiem „Następne”.';
        }
        break;
      case 'GAME_WON':
      case 'GAME_LOST':
        label = 'Nowa gra';
        action = { type: 'NEW_GAME' };
        break;
    }
  return (
    <Card title="Następny krok">
      {action ? (
        <Btn tone="gold" big className="w-full" onClick={() => act(action)}>
          {label}
        </Btn>
      ) : (
        <div className="rounded-xl border border-dashed border-[#2c3880] px-4 py-4 text-center text-blue-200">{note || '—'}</div>
      )}
      {action && note && <p className="mt-2 text-xs text-blue-300/70">{note}</p>}
    </Card>
  );
}

function LifelinesCard({ data }: { data: AppData }) {
  const g = data.game;
  const s = data.settings;
  const q = currentQuestion(data);
  const can = (a: Action) => canDo(data, a);
  const [draft, setDraft] = useState<[number, number, number, number]>([25, 25, 25, 25]);
  const [, setNow] = useState(0);

  useEffect(() => {
    if (g.audience) setDraft(g.audience.results);
  }, [g.audience]);

  useEffect(() => {
    if (!g.phone?.running) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [g.phone?.running]);

  const sum = draft.reduce((a, b) => a + b, 0);
  const generate = () => (q ? simulateAudience(q.correct, q.difficulty, g.removed) : ([25, 25, 25, 25] as [number, number, number, number]));

  const setVote = (i: number, v: number) => {
    const next = [...draft] as [number, number, number, number];
    next[i] = Math.max(0, Math.min(100, Math.round(v) || 0));
    setDraft(next);
    act({ type: 'AUDIENCE_SET', results: next });
  };

  const phoneSecs = Math.ceil(phoneLeftMs(g) / 1000);

  return (
    <Card title="Koła ratunkowe" icon={<Sparkles size={16} />}>
      <div className="grid grid-cols-3 gap-2">
        <Btn tone="primary" disabled={!q || !can({ type: 'FIFTY', removed: q ? pickFiftyFifty(q.correct) : [] })} onClick={() => q && act({ type: 'FIFTY', removed: pickFiftyFifty(q.correct) })} className="flex-col !gap-1 py-3">
          <span className="font-display font-black">50:50</span>
        </Btn>
        <Btn tone="primary" icon={<Phone size={16} />} disabled={!can({ type: 'PHONE_START' })} onClick={() => act({ type: 'PHONE_START' })}>
          Telefon
        </Btn>
        <Btn tone="primary" icon={<Users size={16} />} disabled={!can({ type: 'AUDIENCE_START', results: [25, 25, 25, 25] })} onClick={() => act({ type: 'AUDIENCE_START', results: generate() })}>
          Publiczność
        </Btn>
      </div>
      <div className="mt-2 flex gap-3 text-xs text-blue-300/70">
        {(['fifty', 'phone', 'audience'] as const).map((id) => (
          <span key={id} className={g.lifelinesUsed[id] ? 'line-through' : ''}>
            {id === 'fifty' ? '50:50' : id === 'phone' ? 'Telefon' : 'Publiczność'}: {!s.lifelinesEnabled[id] ? 'wyłączone' : g.lifelinesUsed[id] ? 'wykorzystane' : 'dostępne'}
          </span>
        ))}
      </div>

      {g.activeLifeline === 'audience' && g.audience && (
        <div className="mt-4 rounded-xl border border-[#2c3880] bg-[#070b33] p-3">
          <div className="mb-2 text-sm font-bold text-gold-300">Głosowanie publiczności</div>
          <div className="grid grid-cols-4 gap-2">
            {ANSWER_LETTERS.map((l, i) => (
              <label key={l} className="text-center">
                <span className="text-xs font-bold text-gold-300">{l}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft[i]}
                  disabled={g.audience?.status !== 'voting' || g.removed.includes(i as AnswerIndex)}
                  onChange={(e) => setVote(i, Number(e.target.value))}
                  className="w-full rounded-lg border border-[#2c3880] bg-[#060a2e] px-2 py-1 text-center text-white disabled:opacity-40"
                />
              </label>
            ))}
          </div>
          <div className={`mt-1 text-xs ${sum === 100 ? 'text-green-300' : 'text-red-300'}`}>Suma: {sum}% {sum !== 100 && '(musi wynosić 100%)'}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Btn icon={<Wand2 size={14} />} disabled={g.audience.status !== 'voting'} onClick={() => { const r = generate(); setDraft(r); act({ type: 'AUDIENCE_SET', results: r }); }}>
              Generuj
            </Btn>
            <Btn disabled={g.audience.status !== 'voting'} onClick={() => { const r = normalizeTo100(draft); setDraft(r); act({ type: 'AUDIENCE_SET', results: r }); }}>
              Wyrównaj do 100
            </Btn>
            <Btn tone="gold" disabled={!can({ type: 'AUDIENCE_SHOW' })} onClick={() => act({ type: 'AUDIENCE_SHOW' })}>
              Pokaż wyniki
            </Btn>
            <Btn tone="ghost" icon={<X size={14} />} onClick={() => act({ type: 'LIFELINE_CLOSE' })}>
              Zamknij
            </Btn>
          </div>
        </div>
      )}

      {g.activeLifeline === 'phone' && g.phone && (
        <div className="mt-4 rounded-xl border border-[#2c3880] bg-[#070b33] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-gold-300">Telefon do przyjaciela</span>
            <span className={`font-display text-3xl font-black ${phoneSecs <= 5 && g.phone.status === 'connected' ? 'text-red-400' : 'text-white'}`}>{g.phone.status === 'calling' ? '…' : phoneSecs}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {g.phone.status === 'calling' && (
              <Btn tone="green" icon={<PhoneCall size={14} />} className="col-span-2" onClick={() => act({ type: 'PHONE_CONNECT' })}>
                Połączono
              </Btn>
            )}
            {g.phone.status === 'connected' && (
              <>
                {g.phone.running ? (
                  <Btn icon={<Pause size={14} />} onClick={() => act({ type: 'PHONE_TIMER', cmd: 'pause' })}>Pauza licznika</Btn>
                ) : (
                  <Btn tone="gold" icon={<Play size={14} />} disabled={!can({ type: 'PHONE_TIMER', cmd: 'start' })} onClick={() => act({ type: 'PHONE_TIMER', cmd: 'start' })}>
                    {phoneSecs < s.phoneSeconds ? 'Wznów licznik' : 'Start licznika'}
                  </Btn>
                )}
                <Btn icon={<RotateCcw size={14} />} onClick={() => act({ type: 'PHONE_TIMER', cmd: 'reset' })}>Reset</Btn>
                <Btn tone="red" icon={<PhoneOff size={14} />} onClick={() => act({ type: 'PHONE_END' })}>Zakończ rozmowę</Btn>
              </>
            )}
            <Btn tone="ghost" icon={<X size={14} />} onClick={() => act({ type: 'LIFELINE_CLOSE' })} className={g.phone.status === 'connected' ? '' : 'col-span-2'}>
              Zamknij
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

function fmtTime(t: number) {
  if (!isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function VideoCard({ data, screen }: { data: AppData; screen: ScreenStatus }) {
  const g = data.game;
  const q = currentQuestion(data);
  const v = g.video;
  const prog = screen.video;
  const can = (a: Action) => canDo(data, a);

  return (
    <Card title="Wideo" icon={<Film size={16} />} right={screen.videoError && <button className="text-xs text-red-300 underline" onClick={screen.clearVideoError}>{screen.videoError} ✕</button>}>
      {!q?.answerVideo && !q?.video && <p className="text-sm text-blue-300/70">To pytanie nie ma przypisanego filmu. Dodasz go w zakładce „Pytania”.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {q?.answerVideo && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-violet-300">Podgląd: film z odpowiedzią (tylko dla Ciebie)</div>
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              <MediaVideo media={q.answerVideo} className="h-full w-full" muted controls />
            </div>
          </div>
        )}
        {q?.video && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-blue-300">Podgląd: materiał do pytania</div>
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              <MediaVideo media={q.video} className="h-full w-full" muted controls />
            </div>
            <Btn className="mt-2 w-full" icon={<Play size={14} />} disabled={!can({ type: 'PLAY_VIDEO', which: 'question' })} onClick={() => act({ type: 'PLAY_VIDEO', which: 'question' })}>
              Pokaż materiał na ekranie
            </Btn>
          </div>
        )}
      </div>

      {v && (
        <div className="mt-4 rounded-xl border border-violet-500/40 bg-violet-950/40 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold text-violet-200">Na ekranie gry: {v.which === 'answer' ? 'film z odpowiedzią' : 'materiał do pytania'}</span>
            <span className="font-mono text-blue-100">
              {fmtTime(prog?.current ?? 0)} / {fmtTime(prog?.duration ?? 0)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(1, prog?.duration ?? 1)}
            step={0.1}
            value={prog?.current ?? 0}
            onChange={(e) => act({ type: 'VIDEO_CONTROL', seekTo: Number(e.target.value) })}
            className="w-full"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Btn tone={v.playing ? 'blue' : 'gold'} icon={v.playing ? <Pause size={14} /> : <Play size={14} />} onClick={() => act({ type: 'VIDEO_CONTROL', playing: !v.playing })}>
              {v.playing ? 'Pauza' : 'Odtwarzaj'}
            </Btn>
            <Btn icon={<Rewind size={14} />} onClick={() => act({ type: 'VIDEO_CONTROL', seekTo: Math.max(0, (prog?.current ?? 0) - 10) })}>-10 s</Btn>
            <Btn icon={<FastForward size={14} />} onClick={() => act({ type: 'VIDEO_CONTROL', seekTo: (prog?.current ?? 0) + 10 })}>+10 s</Btn>
            <Btn icon={<RotateCcw size={14} />} onClick={() => act({ type: 'VIDEO_CONTROL', seekTo: 0, playing: true })}>Od początku</Btn>
            <Btn icon={v.maximized ? <Minimize2 size={14} /> : <Maximize size={14} />} onClick={() => act({ type: 'VIDEO_CONTROL', maximized: !v.maximized })}>
              {v.maximized ? 'Zmniejsz' : 'Cały ekran'}
            </Btn>
            <Btn tone="red" icon={<X size={14} />} onClick={() => act({ type: 'CLOSE_VIDEO' })}>Zamknij film</Btn>
          </div>
          {!screen.connected && <p className="mt-2 text-xs text-amber-300">Ekran gry nie jest otwarty — film nie jest nigdzie odtwarzany.</p>}
        </div>
      )}
    </Card>
  );
}

function VolumeCard({ data }: { data: AppData }) {
  const vol = data.settings.volume;
  const set = (k: keyof typeof vol, v: number) => store.setSettings({ volume: { ...vol, [k]: v } });
  return (
    <Card title="Głośność" icon={<Volume2 size={16} />}>
      <div className="space-y-2">
        <Slider label="Główna" value={vol.master} onChange={(v) => set('master', v)} />
        <Slider label="Muzyka" value={vol.music} onChange={(v) => set('music', v)} />
        <Slider label="Efekty" value={vol.sfx} onChange={(v) => set('sfx', v)} />
        <Slider label="Wideo" value={vol.video} onChange={(v) => set('video', v)} />
      </div>
    </Card>
  );
}
