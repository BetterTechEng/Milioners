import { useEffect, useState } from 'react';
import { MonitorPlay, SlidersHorizontal } from 'lucide-react';
import { AdminApp, openGameScreen } from './admin/AdminApp';
import { GameScreen } from './screen/GameScreen';
import { Emblem } from './screen/Studio';
import { useAppData } from './game/store';

function useRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '') || 'home';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

function Launcher() {
  const data = useAppData();
  return (
    <div className="flex min-h-full flex-col items-center justify-center overflow-auto bg-[radial-gradient(ellipse_at_50%_35%,#1a2390_0%,#070a33_45%,#02041a_80%)] px-4 py-10 text-center">
      <Emblem title={data.settings.title} size={260} />
      <h1 className="mt-6 font-display text-3xl font-black uppercase tracking-wider text-white sm:text-4xl">Teleturniej na żywo</h1>
      <p className="mt-3 max-w-xl text-blue-200/80">
        Otwórz <b>ekran gry</b> na telewizorze lub projektorze, a <b>panel prowadzącego</b> na laptopie. Oba okna muszą działać w tej samej przeglądarce na tym samym komputerze, wtedy synchronizują się na żywo.
      </p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <a href="#/admin" className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-gold-300 to-gold-500 px-8 py-5 font-display text-xl font-black text-[#2a1600] shadow-[0_0_40px_rgba(255,200,80,0.5)] hover:brightness-110">
          <SlidersHorizontal /> Panel prowadzącego
        </a>
        <button onClick={openGameScreen} className="flex items-center justify-center gap-3 rounded-2xl border-2 border-blue-300 px-8 py-5 font-display text-xl font-bold text-blue-50 hover:bg-blue-500/20">
          <MonitorPlay /> Ekran gry (nowe okno)
        </button>
      </div>
      <p className="mt-6 text-sm text-blue-300/60">
        Ekran gry otworzysz też w tej karcie: <a className="underline" href="#/screen">#/screen</a>. Przeciągnij okno na telewizor i naciśnij F, aby włączyć pełny ekran.
      </p>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  if (route.startsWith('admin')) return <AdminApp />;
  if (route.startsWith('screen')) return <GameScreen />;
  return <Launcher />;
}
