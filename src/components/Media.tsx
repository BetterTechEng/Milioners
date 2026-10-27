import { useEffect, useState, type RefObject } from 'react';
import type { MediaRef } from '../types';
import { resolveMedia, type ResolvedMedia } from '../game/storage';

export function useResolvedMedia(media: MediaRef | undefined, as: 'video' | 'image'): ResolvedMedia | null {
  const [res, setRes] = useState<ResolvedMedia | null>(null);
  const key = media ? (media.kind === 'url' ? media.url : media.id) : '';
  useEffect(() => {
    let alive = true;
    setRes(null);
    if (!media) return;
    resolveMedia(media, as)
      .then((r) => alive && setRes(r))
      .catch((err: unknown) => alive && setRes({ type: 'missing', reason: String(err) }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, as]);
  return res;
}

export function MediaImage({ media, className }: { media: MediaRef; className?: string }) {
  const res = useResolvedMedia(media, 'image');
  if (!res) return null;
  if (res.type === 'missing') return <div className="p-6 text-sm text-red-300">{res.reason}</div>;
  if (res.type === 'youtube') return null;
  return <img src={res.src} alt="" className={className} />;
}

/** Send a command to a YouTube iframe (enablejsapi=1). */
export function youTubeCommand(frame: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}

export function youTubeSrc(id: string, autoplay: boolean, muted: boolean) {
  const p = new URLSearchParams({
    enablejsapi: '1',
    autoplay: autoplay ? '1' : '0',
    mute: muted ? '1' : '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    origin: window.location.origin,
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${p.toString()}`;
}

/**
 * Plain <video> or YouTube iframe for a MediaRef.
 * Used by the admin preview (muted, own controls).
 */
export function MediaVideo({
  media,
  className,
  muted,
  controls,
  videoRef,
}: {
  media: MediaRef;
  className?: string;
  muted?: boolean;
  controls?: boolean;
  videoRef?: RefObject<HTMLVideoElement | null>;
}) {
  const res = useResolvedMedia(media, 'video');
  if (!res) return <div className="flex h-full items-center justify-center text-sm text-slate-400">Ładowanie…</div>;
  if (res.type === 'missing') return <div className="p-4 text-sm text-red-300">{res.reason}</div>;
  if (res.type === 'youtube')
    return <iframe className={className} src={youTubeSrc(res.embedId, false, !!muted)} allow="autoplay; fullscreen" allowFullScreen title="Podgląd" />;
  return <video ref={videoRef} className={className} src={res.src} muted={muted} controls={controls} playsInline preload="metadata" />;
}
