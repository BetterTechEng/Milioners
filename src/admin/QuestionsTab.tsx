import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Download, FlaskConical, Pencil, Plus, Trash2, Upload, Film, ImageIcon, X, Save } from 'lucide-react';
import type { AnswerIndex, AppData, MediaRef, Question } from '../types';
import { ANSWER_LETTERS } from '../types';
import { store } from '../game/store';
import { uid } from '../data/defaults';
import { deleteMediaFile, exportQuestionsJson, parseQuestionsJson, putMediaFile } from '../game/storage';
import { formatMoney, prizeAt } from '../game/rules';
import { Btn, Card, Field, inputCls } from './ui';

function emptyQuestion(): Question {
  return { id: uid('q'), text: '', answers: ['', '', '', ''], correct: 0, difficulty: 1 };
}

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function QuestionsTab({ data, onTest }: { data: AppData; onTest: () => void }) {
  const qs = data.questions;
  const [editing, setEditing] = useState<Question | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gameRunning = !['IDLE', 'GAME_WON', 'GAME_LOST'].includes(data.game.phase) && !data.game.testMode;

  const save = (list: Question[]) => store.setQuestions(list);

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= qs.length) return;
    const list = [...qs];
    [list[i], list[j]] = [list[j], list[i]];
    save(list);
  };

  const remove = (q: Question) => {
    if (!confirm(`Usunąć pytanie „${q.text.slice(0, 60)}”?`)) return;
    for (const m of [q.image, q.video, q.answerVideo]) if (m?.kind === 'file') void deleteMediaFile(m.id);
    save(qs.filter((x) => x.id !== q.id));
  };

  const duplicate = (q: Question, i: number) => {
    const list = [...qs];
    list.splice(i + 1, 0, { ...structuredClone(q), id: uid('q'), text: q.text + ' (kopia)' });
    save(list);
  };

  const upsert = (q: Question) => {
    const exists = qs.some((x) => x.id === q.id);
    save(exists ? qs.map((x) => (x.id === q.id ? q : x)) : [...qs, q]);
    setEditing(null);
  };

  const onImport = async (file: File) => {
    try {
      const list = parseQuestionsJson(await file.text());
      const replace = confirm(`Wczytano ${list.length} pytań.\n\nOK — zastąp obecne pytania\nAnuluj — dopisz na końcu`);
      save(replace ? list : [...qs, ...list.map((q) => (qs.some((x) => x.id === q.id) ? { ...q, id: uid('q') } : q))]);
      setMessage(`Zaimportowano ${list.length} pytań.`);
    } catch (err) {
      setMessage(`Błąd importu: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card
        title={`Pytania (${qs.length}) · w grze: ${Math.min(data.settings.questionCount, qs.length)}`}
        right={
          <div className="flex flex-wrap gap-2">
            <Btn tone="gold" icon={<Plus size={14} />} onClick={() => setEditing(emptyQuestion())}>Dodaj pytanie</Btn>
            <Btn icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>Import JSON</Btn>
            <Btn icon={<Download size={14} />} onClick={() => download('milioners-pytania.json', exportQuestionsJson(qs))}>Eksport JSON</Btn>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ''; }} />
          </div>
        }
      >
        {message && (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-[#16205e] px-3 py-2 text-sm">
            {message}
            <button onClick={() => setMessage(null)}><X size={14} /></button>
          </div>
        )}
        {gameRunning && <p className="mb-3 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-200">Trwa gra. Zmiana kolejności lub usuwanie pytań wpływa na bieżącą rozgrywkę.</p>}
        <p className="mb-3 text-xs text-blue-300/70">
          Pliki wideo i obrazy dodane z dysku są zapisywane w tej przeglądarce (IndexedDB). Eksport JSON zawiera tylko odnośniki do nich. Na innym komputerze trzeba je dodać ponownie albo użyć linków URL.
        </p>
        <ol className="space-y-2">
          {qs.map((q, i) => (
            <li key={q.id} className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 ${i < data.settings.questionCount ? 'border-[#2c3880] bg-[#0f1660]' : 'border-dashed border-[#2c3880] bg-transparent opacity-60'}`}>
              <span className="w-8 text-center font-display font-black text-gold-300">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">{q.text || <i className="text-blue-300">(bez treści)</i>}</div>
                <div className="flex flex-wrap gap-3 text-xs text-blue-200/70">
                  <span>✓ {ANSWER_LETTERS[q.correct]}: {q.answers[q.correct]}</span>
                  <span>{['', 'łatwe', 'średnie', 'trudne'][q.difficulty]}</span>
                  <span>{formatMoney(prizeAt(qs, data.settings, i), data.settings.currency)}{q.prize ? ' (własna)' : ''}</span>
                  {q.image && <span className="flex items-center gap-1"><ImageIcon size={12} /> obraz</span>}
                  {q.video && <span className="flex items-center gap-1"><Film size={12} /> wideo</span>}
                  {q.answerVideo && <span className="flex items-center gap-1 text-violet-300"><Film size={12} /> film z odpowiedzią</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Btn tone="ghost" title="W górę" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={14} /></Btn>
                <Btn tone="ghost" title="W dół" onClick={() => move(i, 1)} disabled={i === qs.length - 1}><ArrowDown size={14} /></Btn>
                <Btn tone="ghost" title="Testuj na ekranie gry" onClick={() => { if (!gameRunning || confirm('Trwa gra. Test przerwie bieżącą rozgrywkę. Kontynuować?')) { store.dispatch({ type: 'TEST_QUESTION', index: i }); onTest(); } }}><FlaskConical size={14} /></Btn>
                <Btn tone="ghost" title="Edytuj" onClick={() => setEditing(structuredClone(q))}><Pencil size={14} /></Btn>
                <Btn tone="ghost" title="Duplikuj" onClick={() => duplicate(q, i)}><Copy size={14} /></Btn>
                <Btn tone="ghost" title="Usuń" onClick={() => remove(q)}><Trash2 size={14} className="text-red-300" /></Btn>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {editing && <QuestionEditor key={editing.id} initial={editing} onCancel={() => setEditing(null)} onSave={upsert} />}
    </div>
  );
}

function QuestionEditor({ initial, onSave, onCancel }: { initial: Question; onSave: (q: Question) => void; onCancel: () => void }) {
  const [q, setQ] = useState<Question>(initial);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Question>(k: K, v: Question[K]) => setQ((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!q.text.trim()) return setError('Wpisz treść pytania.');
    if (q.answers.some((a) => !a.trim())) return setError('Uzupełnij wszystkie cztery odpowiedzi.');
    onSave({ ...q, text: q.text.trim(), answers: q.answers.map((a) => a.trim()) as Question['answers'], hostComment: q.hostComment?.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-[#2c3880] bg-[#0b1040] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-gold-300">Edycja pytania</h2>
          <button onClick={onCancel} aria-label="Zamknij"><X /></button>
        </div>
        <div className="space-y-4">
          <Field label="Treść pytania">
            <textarea className={inputCls} rows={2} value={q.text} onChange={(e) => set('text', e.target.value)} autoFocus />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {q.answers.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-xl border p-2 ${q.correct === i ? 'border-green-400 bg-green-500/10' : 'border-[#2c3880]'}`}>
                <label className="flex cursor-pointer flex-col items-center px-1" title="Poprawna odpowiedź">
                  <input type="radio" name="correct" checked={q.correct === i} onChange={() => set('correct', i as AnswerIndex)} className="accent-green-500" />
                  <span className="font-display font-black text-gold-300">{ANSWER_LETTERS[i]}</span>
                </label>
                <input
                  className={inputCls}
                  value={a}
                  placeholder={`Odpowiedź ${ANSWER_LETTERS[i]}`}
                  onChange={(e) => {
                    const answers = [...q.answers] as Question['answers'];
                    answers[i] = e.target.value;
                    set('answers', answers);
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-300/70">Zaznacz kółko przy poprawnej odpowiedzi.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Poziom trudności">
              <select className={inputCls} value={q.difficulty} onChange={(e) => set('difficulty', Number(e.target.value) as Question['difficulty'])}>
                <option value={1}>Łatwe</option>
                <option value={2}>Średnie</option>
                <option value={3}>Trudne</option>
              </select>
            </Field>
            <Field label="Wartość nagrody (opcjonalnie)" hint="Puste = kwota z drabinki">
              <input className={inputCls} type="number" min={0} value={q.prize ?? ''} onChange={(e) => set('prize', e.target.value ? Number(e.target.value) : undefined)} />
            </Field>
            <Field label="Moment filmu z odpowiedzią">
              <select className={inputCls} value={q.videoTiming ?? ''} onChange={(e) => set('videoTiming', (e.target.value || undefined) as Question['videoTiming'])}>
                <option value="">Domyślnie (z ustawień)</option>
                <option value="before">Przed ujawnieniem</option>
                <option value="after">Po ujawnieniu</option>
              </select>
            </Field>
          </div>
          <Field label="Komentarz prowadzącego (widoczny tylko w panelu)">
            <textarea className={inputCls} rows={2} value={q.hostComment ?? ''} onChange={(e) => set('hostComment', e.target.value)} />
          </Field>
          <MediaField label="Grafika do pytania" accept="image/*" value={q.image} onChange={(v) => set('image', v)} />
          <MediaField label="Wideo do pytania" accept="video/mp4,video/webm,video/*" value={q.video} onChange={(v) => set('video', v)} video />
          <MediaField label="Film z odpowiedzią (np. nagranie osoby)" accept="video/mp4,video/webm,video/*" value={q.answerVideo} onChange={(v) => set('answerVideo', v)} video />
          {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p>}
          <div className="flex justify-end gap-2">
            <Btn tone="ghost" onClick={onCancel}>Anuluj</Btn>
            <Btn tone="gold" icon={<Save size={14} />} onClick={submit}>Zapisz pytanie</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaField({ label, accept, value, onChange, video }: { label: string; accept: string; value?: MediaRef; onChange: (v: MediaRef | undefined) => void; video?: boolean }) {
  const [url, setUrl] = useState(value?.kind === 'url' ? value.url : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const onFile = async (f: File) => {
    setBusy(true);
    setErr(null);
    try {
      if (value?.kind === 'file') void deleteMediaFile(value.id);
      onChange(await putMediaFile(f));
      setUrl('');
    } catch (e) {
      setErr(`Nie udało się zapisać pliku: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label={label} hint={video ? 'MP4/WebM z dysku albo link (bezpośredni plik .mp4/.webm lub YouTube).' : 'Plik z dysku albo link do obrazu.'}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} min-w-[240px] flex-1`}
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => {
            if (url.trim()) onChange({ kind: 'url', url: url.trim() });
            else if (value?.kind === 'url') onChange(undefined);
          }}
        />
        <Btn icon={<Upload size={14} />} disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Zapisywanie…' : 'Plik z dysku'}</Btn>
        {value && (
          <Btn tone="ghost" icon={<X size={14} />} onClick={() => { if (value.kind === 'file') void deleteMediaFile(value.id); onChange(undefined); setUrl(''); }}>
            Usuń
          </Btn>
        )}
        <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
      </div>
      {value?.kind === 'file' && <div className="mt-1 text-xs text-green-300">Plik: {value.name}</div>}
      {err && <div className="mt-1 text-xs text-red-300">{err}</div>}
    </Field>
  );
}
