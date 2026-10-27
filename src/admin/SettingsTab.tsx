import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { AppData, Settings, ThemeId } from '../types';
import { store } from '../game/store';
import { DEFAULT_PRIZES } from '../data/defaults';
import { formatMoney } from '../game/rules';
import { Btn, Card, Field, inputCls, Slider, Toggle } from './ui';

export function SettingsTab({ data }: { data: AppData }) {
  const s = data.settings;
  const set = (patch: Partial<Settings>) => store.setSettings(patch);
  const [newName, setNewName] = useState('');
  const maxQuestions = Math.max(1, data.questions.length);

  const setCount = (n: number) => {
    const count = Math.max(1, Math.min(50, Math.round(n) || 1));
    const prizes = [...s.prizes];
    while (prizes.length < count) prizes.push(Math.round((prizes.at(-1) ?? 1000) * 1.5));
    set({ questionCount: count, prizes, thresholds: s.thresholds.filter((t) => t < count) });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Teleturniej">
        <div className="space-y-3">
          <Field label="Tytuł gry">
            <input className={inputCls} value={s.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="Liczba pytań w grze" hint={`Dostępnych pytań: ${data.questions.length}. Gra używa pierwszych N z listy.`}>
            <input className={inputCls} type="number" min={1} max={50} value={s.questionCount} onChange={(e) => setCount(Number(e.target.value))} />
          </Field>
          {s.questionCount > maxQuestions && <p className="text-xs text-amber-300">Masz mniej pytań niż ustawiona liczba. Gra będzie miała {maxQuestions} pytań.</p>}
          <Field label="Waluta">
            <input className={inputCls} value={s.currency} onChange={(e) => set({ currency: e.target.value })} />
          </Field>
          <Field label="Motyw kolorystyczny">
            <select className={inputCls} value={s.theme} onChange={(e) => set({ theme: e.target.value as ThemeId })}>
              <option value="classic">Klasyczny granat</option>
              <option value="royal">Królewski fiolet</option>
              <option value="emerald">Szmaragdowe studio</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card title="Uczestnicy">
        <ul className="mb-3 space-y-2">
          {s.participants.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                className={inputCls}
                value={p}
                onChange={(e) => {
                  const list = [...s.participants];
                  list[i] = e.target.value;
                  set({ participants: list });
                }}
              />
              <Btn tone={data.game.participant === p ? 'gold' : 'blue'} onClick={() => store.dispatch({ type: 'NEW_GAME', participant: p })} disabled={!['IDLE', 'GAME_WON', 'GAME_LOST'].includes(data.game.phase)}>
                {data.game.participant === p ? 'Gra teraz' : 'Wybierz'}
              </Btn>
              <Btn tone="ghost" onClick={() => set({ participants: s.participants.filter((_, j) => j !== i) })} disabled={s.participants.length <= 1}>
                <Trash2 size={14} />
              </Btn>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Imię uczestnika" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && newName.trim() && (set({ participants: [...s.participants, newName.trim()] }), setNewName(''))} />
          <Btn icon={<Plus size={14} />} disabled={!newName.trim()} onClick={() => { set({ participants: [...s.participants, newName.trim()] }); setNewName(''); }}>Dodaj</Btn>
        </div>
        <p className="mt-2 text-xs text-blue-300/70">Uczestnika wybierzesz przed startem gry. Jego imię widać na ekranie i w historii.</p>
      </Card>

      <Card title="Nagrody i progi gwarantowane" right={<Btn tone="ghost" onClick={() => set({ prizes: DEFAULT_PRIZES, thresholds: [4, 9], questionCount: 15 })}>Przywróć domyślne</Btn>}>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5">
          {Array.from({ length: s.questionCount }, (_, i) => (
            <div key={i} className="contents">
              <span className="w-6 text-right font-display text-sm font-bold text-gold-300">{i + 1}</span>
              <input
                className={inputCls}
                type="number"
                min={0}
                value={s.prizes[i] ?? 0}
                onChange={(e) => {
                  const prizes = [...s.prizes];
                  prizes[i] = Math.max(0, Number(e.target.value) || 0);
                  set({ prizes });
                }}
              />
              <label className="flex items-center gap-1 text-xs text-blue-200" title="Próg gwarantowany">
                <input
                  type="checkbox"
                  checked={s.thresholds.includes(i)}
                  onChange={(e) => set({ thresholds: e.target.checked ? [...s.thresholds, i].sort((a, b) => a - b) : s.thresholds.filter((t) => t !== i) })}
                  className="accent-amber-400"
                />
                próg
              </label>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-blue-300/70">Najwyższa kwota: {formatMoney(s.prizes[s.questionCount - 1] ?? 0, s.currency)}.</p>
      </Card>

      <div className="space-y-4">
        <Card title="Koła ratunkowe i telefon">
          <Toggle label="50:50" checked={s.lifelinesEnabled.fifty} onChange={(v) => set({ lifelinesEnabled: { ...s.lifelinesEnabled, fifty: v } })} />
          <Toggle label="Telefon do przyjaciela" checked={s.lifelinesEnabled.phone} onChange={(v) => set({ lifelinesEnabled: { ...s.lifelinesEnabled, phone: v } })} />
          <Toggle label="Pytanie do publiczności" checked={s.lifelinesEnabled.audience} onChange={(v) => set({ lifelinesEnabled: { ...s.lifelinesEnabled, audience: v } })} />
          <div className="mt-3">
            <Slider label="Czas telefonu" value={s.phoneSeconds} min={10} max={120} step={5} onChange={(v) => set({ phoneSeconds: v })} format={(v) => `${v} s`} />
          </div>
        </Card>

        <Card title="Przebieg i animacje">
          <Slider label="Szybkość animacji (mnożnik czasu)" value={s.animationSpeed} min={0.5} max={2} step={0.1} onChange={(v) => set({ animationSpeed: v })} format={(v) => `×${v.toFixed(1)}`} />
          <Slider label="Dramatyczna pauza przed wynikiem" value={s.revealDelayMs} min={0} max={6000} step={100} onChange={(v) => set({ revealDelayMs: v })} format={(v) => `${(v / 1000).toFixed(1)} s`} />
          <Field label="Domyślny moment filmu z odpowiedzią">
            <select className={inputCls} value={s.videoTiming} onChange={(e) => set({ videoTiming: e.target.value as Settings['videoTiming'] })}>
              <option value="before">Przed ujawnieniem wyniku</option>
              <option value="after">Po ujawnieniu wyniku</option>
            </select>
          </Field>
          <div className="mt-2">
            <Toggle label="Automatyczne przejścia" hint="Intro → pierwsze pytanie i poprawna odpowiedź → następne pytanie bez klikania. Domyślnie wyłączone." checked={s.autoTransitions} onChange={(v) => set({ autoTransitions: v })} />
            <Toggle label="Tryb prezentacyjny" hint="Ukrywa kursor i podpowiedzi na ekranie gry." checked={s.presentationMode} onChange={(v) => set({ presentationMode: v })} />
            <Toggle label="Ogranicz animacje" hint="Wyłącza ruch tła i skraca animacje (dostępność)." checked={s.reducedMotion} onChange={(v) => set({ reducedMotion: v })} />
            <Toggle label="Skróty klawiaturowe" hint="1–4 wybór, Enter zatwierdź, Spacja pauza, N dalej, R odkryj, V film, F pełny ekran, M muzyka." checked={s.shortcutsEnabled} onChange={(v) => set({ shortcutsEnabled: v })} />
          </div>
        </Card>
      </div>
    </div>
  );
}
