import { useEffect, useState } from 'react';
import { Gamepad2, ListChecks, MonitorPlay, Save, Settings as SettingsIcon, Wifi, WifiOff, Volume2, VolumeX, Keyboard } from 'lucide-react';
import { useAppData, store } from '../game/store';
import { ControlTab, playAnswerVideo } from './ControlTab';
import { QuestionsTab } from './QuestionsTab';
import { SettingsTab } from './SettingsTab';
import { SavesTab } from './SavesTab';
import { useDirector, useScreenStatus, useShortcuts } from './hooks';
import { Btn } from './ui';

type Tab = 'control' | 'questions' | 'settings' | 'saves';

export function openGameScreen() {
  const url = `${window.location.pathname}${window.location.search}#/screen`;
  window.open(url, 'milioners-screen', 'popup,width=1280,height=720');
}

export function AdminApp() {
  const data = useAppData();
  const screen = useScreenStatus();
  const [tab, setTab] = useState<Tab>('control');

  useEffect(() => {
    document.body.classList.add('admin-body');
    document.title = `Panel prowadzącego · ${data.settings.title}`;
    return () => document.body.classList.remove('admin-body');
  }, [data.settings.title]);

  const fullscreen = () => store.send({ type: 'fullscreen' });

  useDirector(data);
  useShortcuts(data, { playVideo: () => playAnswerVideo(data), fullscreen });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'control', label: 'Sterowanie', icon: <Gamepad2 size={16} /> },
    { id: 'questions', label: 'Pytania', icon: <ListChecks size={16} /> },
    { id: 'settings', label: 'Ustawienia', icon: <SettingsIcon size={16} /> },
    { id: 'saves', label: 'Zapis i historia', icon: <Save size={16} /> },
  ];

  return (
    <div className="min-h-full bg-[radial-gradient(ellipse_at_top,#141d6b_0%,#070a24_55%)] text-white">
      <header className="sticky top-0 z-40 border-b border-[#1d2766] bg-[#070a24]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-2">
            <div className="gold-text font-display text-xl font-black uppercase tracking-wider">{data.settings.title}</div>
            <div className="text-xs text-blue-300/70">Panel prowadzącego</div>
          </div>
          <nav className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === t.id ? 'bg-gold-400 text-[#2a1600]' : 'text-blue-100 hover:bg-white/5'}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 ${screen.connected ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
              {screen.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {screen.connected ? 'Ekran gry połączony' : 'Ekran gry zamknięty'}
            </span>
            {screen.connected && (
              <span className={`flex items-center gap-1 rounded-full px-3 py-1 ${screen.audioReady ? 'bg-green-500/15 text-green-300' : 'bg-amber-500/15 text-amber-300'}`}>
                {screen.audioReady ? <Volume2 size={14} /> : <VolumeX size={14} />}
                {screen.audioReady ? 'Dźwięk aktywny' : 'Kliknij ekran gry, aby włączyć dźwięk'}
              </span>
            )}
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 ${data.settings.shortcutsEnabled ? 'bg-[#16205e] text-blue-100' : 'bg-black/30 text-blue-300/60'}`}>
              <Keyboard size={14} /> Skróty {data.settings.shortcutsEnabled ? 'wł.' : 'wył.'}
            </span>
            <Btn tone="gold" icon={<MonitorPlay size={16} />} onClick={openGameScreen}>
              Otwórz ekran gry
            </Btn>
          </div>
        </div>
        {!store.hasChannel && (
          <div className="bg-amber-500/20 px-4 py-1 text-center text-xs text-amber-200">
            Ta przeglądarka nie obsługuje BroadcastChannel. Synchronizacja działa wolniej przez localStorage.
          </div>
        )}
      </header>

      <main className="admin-scroll mx-auto max-w-[1700px] p-4">
        {tab === 'control' && <ControlTab data={data} screen={screen} onFullscreen={fullscreen} />}
        {tab === 'questions' && <QuestionsTab data={data} onTest={() => setTab('control')} />}
        {tab === 'settings' && <SettingsTab data={data} />}
        {tab === 'saves' && <SavesTab data={data} />}
      </main>
    </div>
  );
}
