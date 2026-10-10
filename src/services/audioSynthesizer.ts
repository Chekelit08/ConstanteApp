/**
 * Synthesizes audio using the standard Web Audio API without any external assets.
 * - Soft chime / meditative bell for timer transitions
 * - Ambient sound generators: White, Pink, and Brown noise with smooth volume control
 */

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioCtx = new AudioCtx();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

/**
 * Plays a soft, calming zen harmonic chime when an interval ends
 */
export function playChimeSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Harmonic frequencies for a serene Tibetan bowl / warm bell (F major pentatonic)
    const notes = [349.23, 523.25, 698.46, 880.0];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18 / (idx + 1), now + idx * 0.05 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 2.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 2.3);
    });
  } catch (e) {
    console.warn('Could not play synthesized chime:', e);
  }
}

export type NoiseType = 'none' | 'white' | 'pink' | 'brown';

class AmbientNoisePlayer {
  private activeSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private currentType: NoiseType = 'none';
  private currentVolume = 0.5;

  private createNoiseBuffer(ctx: AudioContext, type: NoiseType): AudioBuffer {
    const bufferSize = ctx.sampleRate * 4; // 4 seconds loop
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }
    }

    return buffer;
  }

  public setNoise(type: NoiseType, volume: number): void {
    this.currentVolume = volume;
    if (type === 'none') {
      this.stop();
      this.currentType = 'none';
      return;
    }

    if (this.currentType === type && this.activeSource && this.gainNode) {
      // Just update volume
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume * 0.25)), getAudioContext().currentTime);
      return;
    }

    this.stop();
    this.currentType = type;

    try {
      const ctx = getAudioContext();
      const buffer = this.createNoiseBuffer(ctx, type);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume * 0.25)), ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      this.activeSource = source;
      this.gainNode = gain;
    } catch (e) {
      console.warn('Error starting noise generator:', e);
    }
  }

  public stop(): void {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {}
      this.activeSource = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
      this.gainNode = null;
    }
    this.currentType = 'none';
  }
}

export const ambientNoise = new AmbientNoisePlayer();
