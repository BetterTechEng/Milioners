import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Film } from 'lucide-react';
import type { AppData, MediaRef } from '../types';
import { store } from '../game/store';
import { useResolvedMedia, youTubeCommand, youTubeSrc } from '../components/Media';

/** Big video player on the game screen, fully driven by the host panel. */
export function VideoOverlay({ data }: { data: AppData }) {
  const g = data.game;
  const v = g.video;
  const q = v ? data.questions.find((x) => x.id === v.questionId) : undefined;
  const media = v && q ? (v.which === 'answer' ? q.answerVideo : q.video) : undefined;
  const open = !!(v?.open && media);

  return (
    <AnimatePresence>
      {open && v && media && (
        <motion.div
          key="video"
          className="absolute inset-0 z-30 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          <motion.div className="absolute inset-0 bg-[rgba(2,4,26,0.78)] backdrop-blur-[12px]" />
          <motion.div
            className="relative overflow-hidden bg-black"
            initial={{ scale: 0.6, opacity: 0, y: 80, width: 1600, height: 900, borderRadius: 24 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              width: v.maximized ? 1920 : 1600,
              height: v.maximized ? 1080 : 900,
              borderRadius: v.maximized ? 0 : 24,
            }}
            exit={{ scale: 0.7, opacity: 0, y: 60 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            style={{ boxShadow: v.maximized ? 'none' : '0 0 0 4px #e8bd4f, 0 0 80px rgba(var(--beam),0.8)' }}
          >
            <Player media={media} data={data} />
            {!v.maximized && (
              <div className="pointer-events-none absolute left-6 top-5 flex items-center gap-2 rounded-full bg-black/55 px-5 py-2 font-display text-xl font-bold text-gold-300">
                <Film size={22} /> {v.which === 'answer' ? 'Nagranie z odpowiedzią' : 'Materiał do pytania'}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Player({ media, data }: { media: MediaRef; data: AppData }) {
  const res = useResolvedMedia(media, 'video');
  if (!res) return <div className="flex h-full items-center justify-center text-3xl text-blue-200">Ładowanie wideo…</div>;
  if (res.type === 'missing') {
    return <div className="flex h-full items-center justify-center p-16 text-center text-3xl text-red-300">{res.reason}</div>;
  }
  if (res.type === 'youtube') return <YouTubePlayer id={res.embedId} data={data} />;
  return <HtmlPlayer src={res.src} data={data} />;
}

function useVideoVolume(data: AppData) {
  const { master, video } = data.settings.volume;
  return Math.max(0, Math.min(1, master * video));
}

function HtmlPlayer({ src, data }: { src: string; data: AppData }) {
  const ref = useRef<HTMLVideoElement>(null);
  const g = data.game;
  const v = g.video!;
  const volume = useVideoVolume(data);
  const shouldPlay = v.playing && !g.paused;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (shouldPlay) {
      el.play().catch((err: unknown) => store.send({ type: 'videoError', message: `Nie można odtworzyć: ${String(err)}` }));
    } else el.pause();
  }, [shouldPlay, src]);

  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (ref.current && v.seek.seq > 0) ref.current.currentTime = v.seek.time;
  }, [v.seek.seq, v.seek.time]);

  // Report progress to the host panel.
  useEffect(() => {
    const id = window.setInterval(() => {
      const el = ref.current;
      if (el) store.send({ type: 'videoProgress', current: el.currentTime, duration: el.duration || 0, paused: el.paused });
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      className="h-full w-full bg-black object-contain"
      playsInline
      onEnded={() => store.dispatch({ type: 'VIDEO_ENDED' })}
      onError={() => store.send({ type: 'videoError', message: 'Nie udało się wczytać pliku wideo (format lub adres).' })}
    />
  );
}

function YouTubePlayer({ id, data }: { id: string; data: AppData }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const g = data.game;
  const v = g.video!;
  const volume = useVideoVolume(data);
  const shouldPlay = v.playing && !g.paused;
  const [loaded, setLoaded] = useState(false);
  const [src] = useState(() => youTubeSrc(id, true, false));

  useEffect(() => {
    if (!loaded) return;
    youTubeCommand(ref.current, shouldPlay ? 'playVideo' : 'pauseVideo');
  }, [shouldPlay, loaded]);

  useEffect(() => {
    if (loaded) youTubeCommand(ref.current, 'setVolume', [Math.round(volume * 100)]);
  }, [volume, loaded]);

  useEffect(() => {
    if (loaded && v.seek.seq > 0) youTubeCommand(ref.current, 'seekTo', [v.seek.time, true]);
  }, [v.seek.seq, v.seek.time, loaded]);

  // Listen to the player's state/time messages (iframe API protocol).
  useEffect(() => {
    let current = 0;
    let duration = 0;
    let paused = true;
    const onMsg = (ev: MessageEvent) => {
      if (!String(ev.origin).includes('youtube')) return;
      let msg: { event?: string; info?: { playerState?: number; currentTime?: number; duration?: number } };
      try {
        msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
      } catch {
        return;
      }
      const info = msg.info;
      if (!info) return;
      if (typeof info.currentTime === 'number') current = info.currentTime;
      if (typeof info.duration === 'number') duration = info.duration;
      if (typeof info.playerState === 'number') {
        paused = info.playerState !== 1;
        if (info.playerState === 0) store.dispatch({ type: 'VIDEO_ENDED' });
      }
      store.send({ type: 'videoProgress', current, duration, paused });
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const onLoad = () => {
    setLoaded(true);
    ref.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'milioners' }), '*');
  };

  return (
    <iframe
      ref={ref}
      src={src}
      onLoad={onLoad}
      className="h-full w-full"
      allow="autoplay; fullscreen; encrypted-media"
      allowFullScreen
      title="Wideo"
    />
  );
}
