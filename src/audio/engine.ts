/**
 * Low-level Web Audio graph:
 *   music tracks ─┬─> musicBus ─┐
 *                 └─> musicVerb ┘
 *   sfx voices  ──┬─> sfxBus ───┼─> compressor ─> master ─> speakers
 *                 └─> sfxVerb ──┘
 * Pausing suspends the AudioContext, so every scheduled note freezes in place.
 */
export class AudioEngine {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly musicBus: GainNode;
  readonly musicMute: GainNode;
  readonly sfxBus: GainNode;
  readonly musicVerb: ConvolverNode;
  readonly sfxVerbIn: GainNode;
  readonly noise: AudioBuffer;
  private pausedByGame = false;

  constructor() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: 'interactive' });
    const ctx = this.ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    comp.connect(this.master).connect(ctx.destination);

    this.musicMute = ctx.createGain();
    this.musicMute.connect(comp);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.7;
    this.musicBus.connect(this.musicMute);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.85;
    this.sfxBus.connect(comp);

    const ir = this.makeImpulse(2.8, 2.4);
    this.musicVerb = ctx.createConvolver();
    this.musicVerb.buffer = ir;
    const musicVerbOut = ctx.createGain();
    musicVerbOut.gain.value = 0.55;
    this.musicVerb.connect(musicVerbOut).connect(this.musicBus);

    const sfxVerb = ctx.createConvolver();
    sfxVerb.buffer = ir;
    this.sfxVerbIn = ctx.createGain();
    this.sfxVerbIn.gain.value = 1;
    const sfxVerbOut = ctx.createGain();
    sfxVerbOut.gain.value = 0.45;
    this.sfxVerbIn.connect(sfxVerb).connect(sfxVerbOut).connect(this.sfxBus);

    this.noise = this.makeNoise(2);
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  get running(): boolean {
    return this.ctx.state === 'running';
  }

  async unlock(): Promise<void> {
    if (this.ctx.state !== 'running' && !this.pausedByGame) await this.ctx.resume();
  }

  setVolumes(v: { master: number; music: number; sfx: number }) {
    const t = this.now;
    this.master.gain.setTargetAtTime(v.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(v.music, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(v.sfx, t, 0.05);
  }

  setMusicMuted(muted: boolean) {
    this.musicMute.gain.setTargetAtTime(muted ? 0 : 1, this.now, 0.25);
  }

  /** Fade out and freeze all audio. */
  async pause(): Promise<void> {
    if (this.pausedByGame) return;
    this.pausedByGame = true;
    const t = this.now;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0.0001, t + 0.35);
    await new Promise((r) => setTimeout(r, 380));
    if (this.pausedByGame) await this.ctx.suspend();
  }

  async resume(masterVolume: number): Promise<void> {
    if (!this.pausedByGame) return;
    this.pausedByGame = false;
    await this.ctx.resume();
    const t = this.now;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(0.0001, t);
    this.master.gain.linearRampToValueAtTime(masterVolume, t + 0.4);
  }

  private makeNoise(seconds: number): AudioBuffer {
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * seconds), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const early = i < rate * 0.03 ? 0.4 : 1;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * early;
      }
    }
    return buf;
  }
}

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
