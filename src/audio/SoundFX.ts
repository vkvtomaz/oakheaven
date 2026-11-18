export type SoundCue =
  | 'uiStart'
  | 'kaelenAttack'
  | 'flankAlert'
  | 'ballista'
  | 'repulsor'
  | 'alphaRoar'
  | 'groundBreak';

interface SoundProfile {
  frequency: number;
  endFrequency: number;
  duration: number;
  volume: number;
  wave: OscillatorType;
  pulses?: number;
  cooldown?: number;
}

const PROFILES: Record<SoundCue, SoundProfile> = {
  uiStart: { frequency: 330, endFrequency: 520, duration: 0.18, volume: 0.12, wave: 'sine' },
  kaelenAttack: { frequency: 150, endFrequency: 72, duration: 0.12, volume: 0.13, wave: 'triangle', cooldown: 0.08 },
  flankAlert: { frequency: 690, endFrequency: 920, duration: 0.11, volume: 0.11, wave: 'square', pulses: 2, cooldown: 0.2 },
  ballista: { frequency: 250, endFrequency: 110, duration: 0.08, volume: 0.08, wave: 'square', cooldown: 0.05 },
  repulsor: { frequency: 130, endFrequency: 410, duration: 0.2, volume: 0.1, wave: 'sine', cooldown: 0.12 },
  alphaRoar: { frequency: 74, endFrequency: 38, duration: 0.65, volume: 0.18, wave: 'sawtooth', cooldown: 0.5 },
  groundBreak: { frequency: 92, endFrequency: 34, duration: 0.38, volume: 0.2, wave: 'triangle', cooldown: 0.25 },
};

export class SoundFX {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private lastPlayed = new Map<SoundCue, number>();

  initialize(): boolean {
    if (this.context) {
      void this.context.resume();
      return true;
    }
    if (typeof AudioContext === 'undefined') return false;
    try {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.72;
      this.master.connect(this.context.destination);
      void this.context.resume();
      return true;
    } catch {
      this.context = null;
      this.master = null;
      return false;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master && this.context) {
      this.master.gain.setValueAtTime(this.muted ? 0 : 0.72, this.context.currentTime);
    }
    return this.muted;
  }

  play(cue: SoundCue): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.muted) return;
    const profile = PROFILES[cue];
    const now = context.currentTime;
    if (now - (this.lastPlayed.get(cue) ?? -Infinity) < (profile.cooldown ?? 0)) return;
    this.lastPlayed.set(cue, now);
    void context.resume();
    for (let pulse = 0; pulse < (profile.pulses ?? 1); pulse++) {
      const start = now + pulse * (profile.duration + 0.06);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = profile.wave;
      oscillator.frequency.setValueAtTime(profile.frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(profile.endFrequency, start + profile.duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(profile.volume, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + profile.duration);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(start + profile.duration + 0.02);
    }
  }
}
