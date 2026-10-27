import type { AppData, GameEvent } from '../types';
import { introTiming, levelCount, tensionTier } from '../game/rules';
import { AudioEngine } from './engine';
import { MusicPlayer, type MusicId } from './music';
import { SoundFx, type SfxId } from './sfx';

/**
 * Central, event-driven audio director for the game screen.
 * Game events (from the shared state) map to music cues and sound effects;
 * the looping bed always follows the current phase.
 */
class AudioManagerImpl {
  private engine: AudioEngine | null = null;
  private music: MusicPlayer | null = null;
  private fx: SoundFx | null = null;
  private volumes = { master: 0.9, music: 0.7, sfx: 0.85 };
  private musicOn = true;
  private paused = false;
  private readyListeners = new Set<() => void>();

  get ready(): boolean {
    return !!this.engine && this.engine.running;
  }

  /** Must be called from a user gesture (browser autoplay rules). */
  async unlock(): Promise<boolean> {
    try {
      if (!this.engine) {
        this.engine = new AudioEngine();
        this.music = new MusicPlayer(this.engine);
        this.fx = new SoundFx(this.engine);
        this.engine.setVolumes(this.volumes);
        this.engine.setMusicMuted(!this.musicOn);
      }
      await this.engine.unlock();
      this.readyListeners.forEach((l) => l());
      return this.engine.running;
    } catch (err) {
      console.error('Audio unlock failed', err);
      return false;
    }
  }

  onReady(fn: () => void) {
    this.readyListeners.add(fn);
    return () => this.readyListeners.delete(fn);
  }

  setVolumes(v: { master: number; music: number; sfx: number }) {
    this.volumes = { master: v.master, music: v.music, sfx: v.sfx };
    if (this.engine && !this.paused) this.engine.setVolumes(this.volumes);
  }

  setMusicOn(on: boolean) {
    this.musicOn = on;
    this.engine?.setMusicMuted(!on);
  }

  sfx(id: SfxId, opts?: { delay?: number; arg?: number }) {
    if (!this.fx || this.paused) return;
    this.fx.play(id, opts);
  }

  /** Music bed that belongs to the current state (no stings). */
  desiredMusic(data: AppData): MusicId | null {
    const g = data.game;
    if (g.activeLifeline || g.video) return null;
    const total = g.testMode ? data.questions.length : levelCount(data.questions, data.settings);
    const tier = tensionTier(g.index, total);
    switch (g.phase) {
      case 'IDLE':
      case 'INTRO':
        return 'lobby';
      case 'QUESTION_ACTIVE':
      case 'ANSWER_SELECTED':
        return `tension${tier}` as MusicId;
      case 'ANSWER_LOCKED':
      case 'ANSWER_REVEAL':
        return `suspense${tier}` as MusicId;
      case 'ANSWER_CORRECT':
        return 'afterglow';
      case 'ANSWER_INCORRECT':
        return 'aftermath';
      case 'GAME_WON':
        return 'celebration';
      case 'GAME_LOST':
        return 'lobby';
      default:
        return null;
    }
  }

  /** Bring the music bed in line with the state (used on load and after interruptions). */
  syncMusic(data: AppData, fade = 1.5) {
    if (!this.music) return;
    const want = this.desiredMusic(data);
    if (want) this.music.play(want, { fade });
    else this.music.stop(fade);
  }

  async setPaused(paused: boolean) {
    if (!this.engine || paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      this.fx?.play('pause');
      await this.engine.pause();
    } else {
      await this.engine.resume(this.volumes.master);
      this.fx?.play('resume');
    }
  }

  handleEvent(ev: GameEvent, data: AppData) {
    const music = this.music;
    const fx = this.fx;
    if (!music || !fx) return;
    const g = data.game;
    const total = g.testMode ? data.questions.length : levelCount(data.questions, data.settings);
    const tier = tensionTier(g.index, total);
    const timing = introTiming(data.settings.animationSpeed);

    switch (ev.type) {
      case 'gameStart':
        fx.cutAll();
        music.play('intro', { then: 'lobby', restart: true });
        break;
      case 'questionIn': {
        music.stop(0.8);
        fx.cut('roll');
        const items: { id: SfxId; delay?: number; arg?: number }[] = [{ id: 'questionIn', delay: 0 }];
        for (let i = 0; i < 4; i++) {
          items.push({ id: 'answerIn', delay: (timing.firstAnswerMs + i * timing.staggerMs) / 1000, arg: i });
        }
        fx.playMany('intro', items);
        music.play(`tension${tier}` as MusicId, { delay: timing.totalMs / 1000 - 0.3, fade: 1.6, restart: true });
        break;
      }
      case 'select':
        fx.play('select');
        break;
      case 'lock':
        fx.play('lock');
        music.play(`suspense${tier}` as MusicId, { delay: 0.35, fade: 1.2 });
        break;
      case 'reveal':
        fx.play('revealRoll', { arg: data.settings.revealDelayMs / 1000 });
        break;
      case 'correct':
        fx.cut('roll', 0.05);
        music.play('success', { then: 'afterglow', restart: true });
        break;
      case 'threshold':
        fx.cut('roll', 0.05);
        music.play('threshold', { then: 'afterglow', restart: true });
        break;
      case 'incorrect':
        fx.cut('roll', 0.05);
        music.play('fail', { then: 'aftermath', restart: true });
        break;
      case 'won':
        music.play('victory', { then: 'celebration', restart: true });
        break;
      case 'lost':
        music.play('farewell', { then: 'lobby', restart: true, fade: 1.5 });
        break;
      case 'next':
        fx.play('transition');
        music.stop(0.8);
        break;
      case 'fifty':
        fx.play('fifty');
        break;
      case 'audienceStart':
        music.stop(0.8);
        fx.play('lifeline');
        fx.play('crowd', { delay: 0.6, arg: 22 });
        break;
      case 'audienceResults':
        fx.cut('crowd', 0.6);
        fx.play('audienceReveal');
        break;
      case 'phoneStart':
        music.stop(0.8);
        fx.play('lifeline');
        fx.playMany('phone', [
          { id: 'dial', delay: 0.5 },
          { id: 'ring', delay: 2.6, arg: 8 },
        ]);
        break;
      case 'phoneConnected':
        fx.play('pickup');
        break;
      case 'phoneEnd':
        fx.cut('tick');
        fx.play('callEnd');
        break;
      case 'lifelineClose':
        fx.cut('crowd', 0.5);
        fx.cut('tick');
        fx.play('lifelineClose');
        this.syncMusic(data, 2);
        break;
      case 'pause':
        void this.setPaused(true);
        break;
      case 'resume':
        void this.setPaused(false);
        break;
      case 'videoStart':
        fx.cutAll();
        music.stop(1.2);
        break;
      case 'videoEnd':
        this.syncMusic(data, 2);
        break;
    }
  }
}

export const AudioManager = new AudioManagerImpl();
