import { useState } from 'react';
import { FolderOpen, Save, Trash2, RotateCcw, AlertTriangle, PlusCircle } from 'lucide-react';
import type { AppData } from '../types';
import { store } from '../game/store';
import { addSave, clearAllStorage, clearMedia, defaultAppData, deleteSave, listSaves, type SaveSlot } from '../game/storage';
import { formatMoney } from '../game/rules';
import { Btn, Card, inputCls, PHASE_LABEL } from './ui';

export function SavesTab({ data }: { data: AppData }) {
  const [saves, setSaves] = useState<SaveSlot[]>(listSaves);
  const [name, setName] = useState('');
  const g = data.game;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Zapis i odczyt gry" icon={<Save size={16} />}>
        <p className="mb-3 text-sm text-blue-200/80">
          Stan gry zapisuje się automatycznie po każdej akcji. Po odświeżeniu strony gra wraca do tego samego momentu. Tutaj możesz dodatkowo zapisać nazwany punkt i wrócić do niego później.
        </p>
        <div className="flex gap-2">
          <input className={inputCls} placeholder={`np. ${g.participant || 'Gracz'} – pytanie ${g.index + 1}`} value={name} onChange={(e) => setName(e.target.value)} />
          <Btn tone="gold" icon={<Save size={14} />} onClick={() => { setSaves(addSave(name.trim() || `${g.participant || 'Gra'} – pytanie ${g.index + 1}`, g)); setName(''); }}>
            Zapisz grę
          </Btn>
        </div>
        <ul className="mt-4 space-y-2">
          {saves.length === 0 && <li className="text-sm text-blue-300/60">Brak zapisów.</li>}
          {saves.map((sv) => (
            <li key={sv.id} className="flex items-center gap-2 rounded-xl border border-[#2c3880] bg-[#0f1660] px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{sv.name}</div>
                <div className="text-xs text-blue-200/70">
                  {new Date(sv.date).toLocaleString('pl-PL')} · pytanie {sv.game.index + 1} · {PHASE_LABEL[sv.game.phase]}
                </div>
              </div>
              <Btn icon={<FolderOpen size={14} />} onClick={() => confirm('Wczytać ten zapis? Bieżący stan gry zostanie zastąpiony.') && store.dispatch({ type: 'LOAD_GAME', game: sv.game })}>
                Wczytaj
              </Btn>
              <Btn tone="ghost" onClick={() => setSaves(deleteSave(sv.id))}>
                <Trash2 size={14} />
              </Btn>
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-4">
        <Card title="Nowa gra" icon={<PlusCircle size={16} />}>
          <p className="mb-3 text-sm text-blue-200/80">Przygotowuje świeżą rozgrywkę: pytania od początku i wszystkie koła ratunkowe dostępne. Pytania i ustawienia zostają.</p>
          <div className="flex flex-wrap gap-2">
            {data.settings.participants.map((p) => (
              <Btn key={p} tone="primary" onClick={() => confirm(`Nowa gra dla: ${p}?`) && store.dispatch({ type: 'NEW_GAME', participant: p })}>
                Nowa gra: {p}
              </Btn>
            ))}
          </div>
        </Card>

        <Card title="Wyniki zakończonych rund" right={data.history.length > 0 && <Btn tone="ghost" onClick={() => confirm('Wyczyścić historię?') && store.clearHistory()}>Wyczyść</Btn>}>
          {data.history.length === 0 ? (
            <p className="text-sm text-blue-300/60">Jeszcze nikt nie zakończył gry.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-blue-300/70">
                <tr>
                  <th className="py-1">Data</th>
                  <th>Uczestnik</th>
                  <th>Wynik</th>
                  <th className="text-right">Wygrana</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h.id} className="border-t border-[#1d2766]">
                    <td className="py-1.5 text-blue-200/80">{new Date(h.date).toLocaleString('pl-PL')}</td>
                    <td>{h.participant}</td>
                    <td>{h.outcome === 'won' ? '🏆 wygrana' : h.outcome === 'stopped' ? 'rezygnacja' : 'przegrana'} · {h.reachedLevel} pyt.</td>
                    <td className="text-right font-bold text-gold-300">{formatMoney(h.prize, data.settings.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Reset gry" icon={<AlertTriangle size={16} />}>
          <p className="mb-3 text-sm text-blue-200/80">Przywraca ustawienia fabryczne: przykładowe pytania, domyślne ustawienia, usuwa zapisy, historię i pliki wideo z tej przeglądarki.</p>
          <Btn
            tone="red"
            icon={<RotateCcw size={14} />}
            onClick={async () => {
              if (!confirm('Na pewno przywrócić ustawienia fabryczne? Tej operacji nie można cofnąć.')) return;
              if (!confirm('Ostatnie potwierdzenie: usunąć wszystkie pytania, zapisy i pliki?')) return;
              clearAllStorage();
              await clearMedia();
              const fresh = defaultAppData();
              store.replaceAll({ game: { ...fresh.game, eventSeq: data.game.eventSeq }, questions: fresh.questions, settings: fresh.settings, history: [] });
              setSaves([]);
            }}
          >
            Przywróć ustawienia fabryczne
          </Btn>
        </Card>
      </div>
    </div>
  );
}
