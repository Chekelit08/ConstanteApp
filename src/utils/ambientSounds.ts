/**
 * Offline synthesized ambient sounds using the Web Audio API.
 * Zero external files or network requests required.
 */

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private isMasterMuted: boolean = false;
  private volumes: Record<string, number> = {
    white: 0,
    pink: 0,
    brown: 0,
    rain: 0,
    fire: 0,
    cafe: 0,
    forest: 0,
  };

  private gainNodes: Record<string, GainNode> = {};
  private activeNodes: Record<string, { stop: () => void }> = {};

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(soundId: string, volumePercent: number) {
    this.volumes[soundId] = Math.max(0, Math.min(100, volumePercent));
    this.initContext();
    if (!this.ctx) return;

    if (!this.gainNodes[soundId]) {
      const g = this.ctx.createGain();
      g.connect(this.ctx.destination);
      this.gainNodes[soundId] = g;
    }

    const targetGain = this.isMasterMuted ? 0 : this.volumes[soundId] / 100;
    this.gainNodes[soundId].gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);

    if (this.volumes[soundId] > 0 && !this.activeNodes[soundId]) {
      this.startGenerator(soundId);
    } else if (this.volumes[soundId] === 0 && this.activeNodes[soundId]) {
      this.stopGenerator(soundId);
    }
  }

  public setMasterMute(muted: boolean) {
    this.isMasterMuted = muted;
    if (!this.ctx) return;
    Object.entries(this.volumes).forEach(([id, vol]) => {
      if (this.gainNodes[id]) {
        const target = muted ? 0 : vol / 100;
        this.gainNodes[id].gain.setTargetAtTime(target, this.ctx!.currentTime, 0.05);
      }
    });
  }

  public getVolume(soundId: string): number {
    return this.volumes[soundId] || 0;
  }

  public isMuted(): boolean {
    return this.isMasterMuted;
  }

  public stopAll() {
    Object.keys(this.activeNodes).forEach((id) => this.stopGenerator(id));
  }

  public release() {
    this.stopAll();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.gainNodes = {};
  }

  private stopGenerator(soundId: string) {
    if (this.activeNodes[soundId]) {
      try {
        this.activeNodes[soundId].stop();
      } catch {}
      delete this.activeNodes[soundId];
    }
  }

  private startGenerator(soundId: string) {
    if (!this.ctx) return;
    this.stopGenerator(soundId);
    const dest = this.gainNodes[soundId];
    if (!dest) return;

    if (soundId === 'white') {
      this.activeNodes[soundId] = this.createNoise(dest, 'white');
    } else if (soundId === 'pink') {
      this.activeNodes[soundId] = this.createNoise(dest, 'pink');
    } else if (soundId === 'brown') {
      this.activeNodes[soundId] = this.createNoise(dest, 'brown');
    } else if (soundId === 'rain') {
      this.activeNodes[soundId] = this.createRain(dest);
    } else if (soundId === 'fire') {
      this.activeNodes[soundId] = this.createFire(dest);
    } else if (soundId === 'cafe') {
      this.activeNodes[soundId] = this.createCafe(dest);
    } else if (soundId === 'forest') {
      this.activeNodes[soundId] = this.createForest(dest);
    }
  }

  private createNoise(dest: AudioNode, type: 'white' | 'pink' | 'brown') {
    const ctx = this.ctx!;
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown') {
        // Brownian noise integration
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      } else if (type === 'pink') {
        // Paul Kellet's filter method for pink noise
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        data[i] = white * 0.3;
      }
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    if (type === 'brown') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      noise.connect(filter);
      filter.connect(dest);
    } else {
      noise.connect(dest);
    }

    noise.start();
    return {
      stop: () => {
        try { noise.stop(); } catch {}
      },
    };
  }

  private createRain(dest: AudioNode) {
    const ctx = this.ctx!;
    // Brown noise base + bandpass pinkish splatter
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.2;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    source.connect(filter);
    filter.connect(dest);
    source.start();

    return {
      stop: () => {
        try { source.stop(); } catch {}
      },
    };
  }

  private createFire(dest: AudioNode) {
    const ctx = this.ctx!;
    // Low rumble + occasional crackle
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const isCrackle = Math.random() < 0.003;
      data[i] = isCrackle ? (Math.random() * 2 - 1) * 0.7 : (Math.random() * 2 - 1) * 0.05;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1.5;

    source.connect(filter);
    filter.connect(dest);
    source.start();

    return {
      stop: () => {
        try { source.stop(); } catch {}
      },
    };
  }

  private createCafe(dest: AudioNode) {
    const ctx = this.ctx!;
    // Warm filtered murmur
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      data[i] = last * 1.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 2.0;

    source.connect(filter);
    filter.connect(dest);
    source.start();

    return {
      stop: () => {
        try { source.stop(); } catch {}
      },
    };
  }

  private createForest(dest: AudioNode) {
    const ctx = this.ctx!;
    // Soft wind + periodic subtle bird/cricket chimes
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.05;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    source.connect(filter);
    filter.connect(dest);
    source.start();

    return {
      stop: () => {
        try { source.stop(); } catch {}
      },
    };
  }
}

export const ambientSoundEngine = new AmbientSoundEngine();
