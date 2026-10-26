type SfxName =
  | "shoot"
  | "splat"
  | "hit"
  | "crit"
  | "hurt"
  | "die"
  | "coin"
  | "key"
  | "heart"
  | "item"
  | "bomb"
  | "explode"
  | "door"
  | "locked"
  | "boss"
  | "bossdie"
  | "victory"
  | "click"
  | "revive";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private dangerGain: GainNode | null = null;
  private dangerOsc: OscillatorNode | null = null;
  private intensity: 0 | 1 | 2 = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private hostMuted = false;
  private lastSfx = new Map<string, number>();
  private floor = 0;

  constructor() {
    /* Mute is owned by the meta settings and restored by Game. */
  }

  get isMuted(): boolean {
    return this.muted || this.hostMuted;
  }

  get isUserMuted(): boolean {
    return this.muted;
  }

  unlock(): void {
    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.isMuted ? 0 : 0.85;
        this.master.connect(this.ctx.destination);
        this.noiseBuffer = this.makeNoise();
      } catch {
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGain();
  }

  /** Host/ad mute is separate from the player's saved sound setting. */
  setHostMuted(muted: boolean): void {
    this.hostMuted = muted;
    this.applyGain();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private applyGain(): void {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  private tone(opts: {
    f0: number;
    f1?: number;
    dur: number;
    type?: OscillatorType;
    gain?: number;
    attack?: number;
    filter?: number;
    delay?: number;
  }): void {
    if (!this.ctx || !this.master || this.isMuted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(opts.f0, now);
    if (opts.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), now + opts.dur);
    const attack = opts.attack ?? 0.006;
    const level = opts.gain ?? 0.12;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
    let lastNode: AudioNode = gain;
    if (opts.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = opts.filter;
      gain.connect(filter);
      lastNode = filter;
    }
    osc.connect(gain);
    lastNode.connect(this.master);
    osc.start(now);
    osc.stop(now + opts.dur + 0.02);
  }

  private noise(opts: {
    dur: number;
    gain?: number;
    filter?: number;
    type?: BiquadFilterType;
    delay?: number;
  }): void {
    if (!this.ctx || !this.master || !this.noiseBuffer || this.isMuted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.type ?? "lowpass";
    filter.frequency.value = opts.filter ?? 1200;
    const gain = ctx.createGain();
    const level = opts.gain ?? 0.14;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
    src.stop(now + opts.dur + 0.02);
  }

  play(name: SfxName, pitch = 1): void {
    if (!this.ctx) return;
    if (this.isMuted) return;
    const now = performance.now();
    const throttle = name === "shoot" || name === "splat" || name === "hit" ? 45 : 20;
    const prev = this.lastSfx.get(name) ?? 0;
    if (now - prev < throttle) return;
    this.lastSfx.set(name, now);

    switch (name) {
      case "shoot":
        this.tone({ f0: 620 * pitch, f1: 240, dur: 0.09, type: "triangle", gain: 0.05 });
        this.noise({ dur: 0.05, gain: 0.02, filter: 1800, type: "highpass" });
        break;
      case "splat":
        this.noise({ dur: 0.075, gain: 0.035, filter: 800 });
        break;
      case "hit":
        this.tone({ f0: 170 * pitch, f1: 90, dur: 0.06, type: "square", gain: 0.035 });
        break;
      case "crit":
        this.tone({ f0: 980, f1: 420, dur: 0.08, type: "square", gain: 0.045 });
        this.noise({ dur: 0.1, gain: 0.05, filter: 2400, type: "highpass" });
        break;
      case "hurt":
        this.tone({ f0: 240, f1: 58, dur: 0.34, type: "sawtooth", gain: 0.16, filter: 600 });
        this.noise({ dur: 0.3, gain: 0.12, filter: 380 });
        break;
      case "die":
        this.tone({ f0: 180, f1: 40, dur: 1.1, type: "sawtooth", gain: 0.12, filter: 420 });
        this.tone({ f0: 120, f1: 34, dur: 1.4, type: "sine", gain: 0.14 });
        break;
      case "coin":
        this.tone({ f0: 880, dur: 0.06, type: "triangle", gain: 0.08 });
        this.tone({ f0: 1320, dur: 0.16, type: "triangle", gain: 0.06, delay: 0.055 });
        break;
      case "key":
        this.tone({ f0: 1200, dur: 0.1, type: "triangle", gain: 0.07 });
        this.tone({ f0: 1600, dur: 0.2, type: "sine", gain: 0.05, delay: 0.07 });
        break;
      case "heart":
        this.tone({ f0: 523, dur: 0.18, type: "sine", gain: 0.09 });
        this.tone({ f0: 784, dur: 0.3, type: "sine", gain: 0.07, delay: 0.1 });
        this.tone({ f0: 1046, dur: 0.4, type: "sine", gain: 0.045, delay: 0.2 });
        break;
      case "item":
        [392, 523, 659, 784].forEach((f, i) =>
          this.tone({ f0: f, dur: 0.35, type: "triangle", gain: 0.08, delay: i * 0.09 }),
        );
        this.noise({ dur: 0.6, gain: 0.03, filter: 2200, type: "highpass" });
        break;
      case "bomb":
        this.tone({ f0: 260, f1: 140, dur: 0.08, type: "square", gain: 0.05 });
        break;
      case "explode":
        this.noise({ dur: 0.7, gain: 0.32, filter: 620 });
        this.tone({ f0: 120, f1: 28, dur: 0.65, type: "sine", gain: 0.28 });
        this.noise({ dur: 0.25, gain: 0.12, filter: 3000, type: "highpass" });
        break;
      case "door":
        this.noise({ dur: 0.4, gain: 0.09, filter: 700 });
        this.tone({ f0: 90, f1: 60, dur: 0.35, type: "triangle", gain: 0.05 });
        break;
      case "locked":
        this.tone({ f0: 140, f1: 100, dur: 0.12, type: "square", gain: 0.06 });
        this.tone({ f0: 110, f1: 90, dur: 0.16, type: "square", gain: 0.05, delay: 0.1 });
        break;
      case "boss":
        this.tone({ f0: 72, f1: 46, dur: 1.5, type: "sawtooth", gain: 0.22, filter: 260 });
        this.tone({ f0: 108, f1: 64, dur: 1.3, type: "square", gain: 0.07, filter: 400 });
        this.noise({ dur: 1.2, gain: 0.1, filter: 500 });
        break;
      case "bossdie":
        this.tone({ f0: 160, f1: 30, dur: 1.8, type: "sawtooth", gain: 0.2, filter: 380 });
        this.noise({ dur: 1.6, gain: 0.24, filter: 500 });
        this.tone({ f0: 42, f1: 24, dur: 2.2, type: "sine", gain: 0.3, delay: 0.2 });
        break;
      case "victory":
        [261, 329, 392, 523, 659, 784].forEach((f, i) =>
          this.tone({ f0: f, dur: 2.2, type: "triangle", gain: 0.075, delay: i * 0.16 }),
        );
        this.noise({ dur: 2, gain: 0.025, filter: 1400, type: "highpass" });
        break;
      case "click":
        this.tone({ f0: 320, dur: 0.04, type: "triangle", gain: 0.04 });
        break;
      case "revive":
        this.tone({ f0: 261, f1: 523, dur: 0.8, type: "sine", gain: 0.14 });
        this.tone({ f0: 392, f1: 784, dur: 0.9, type: "triangle", gain: 0.06, delay: 0.2 });
        break;
    }
  }

  startAmbient(floor: number): void {
    if (!this.ctx || !this.master) return;
    if (this.floor === floor && this.ambientGain) return;
    this.floor = floor;
    this.stopAmbient();
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    this.ambientGain = gain;
    gain.gain.setTargetAtTime(0.06, ctx.currentTime, 1.2);

    const roots = [55, 49, 43.65];
    const root = roots[Math.min(roots.length - 1, floor)];
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    lp.Q.value = 0.7;
    lp.connect(gain);

    const oscA = ctx.createOscillator();
    oscA.type = "sawtooth";
    oscA.frequency.value = root;
    const gainA = ctx.createGain();
    gainA.gain.value = 0.18;
    oscA.connect(gainA);
    gainA.connect(lp);

    const oscB = ctx.createOscillator();
    oscB.type = "triangle";
    oscB.frequency.value = root * 1.5;
    const gainB = ctx.createGain();
    gainB.gain.value = 0.12;
    oscB.connect(gainB);
    gainB.connect(lp);

    const danger = ctx.createOscillator();
    danger.type = "sawtooth";
    danger.frequency.value = root * 3;
    const dangerFilter = ctx.createBiquadFilter();
    dangerFilter.type = "lowpass";
    dangerFilter.frequency.value = 420;
    const dangerGain = ctx.createGain();
    dangerGain.gain.value = 0;
    danger.connect(dangerFilter);
    dangerFilter.connect(dangerGain);
    dangerGain.connect(this.master);
    danger.start();
    this.dangerOsc = danger;
    this.dangerGain = dangerGain;
    this.ambientNodes.push(danger, dangerFilter, dangerGain);
    this.setIntensity(this.intensity);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.06 + floor * 0.014;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.value = 480;
      nf.Q.value = 0.4;
      const ng = ctx.createGain();
      ng.gain.value = 0.045;
      src.connect(nf);
      nf.connect(ng);
      ng.connect(gain);
      src.start();
      this.ambientNodes.push(src, nf, ng);
    }

    oscA.start();
    oscB.start();
    lfo.start();
    this.ambientNodes.push(oscA, oscB, lfo, gainA, gainB, lp, gain);
  }

  setIntensity(level: 0 | 1 | 2): void {
    this.intensity = level;
    if (!this.ctx || !this.dangerGain || !this.dangerOsc) return;
    const now = this.ctx.currentTime;
    const gain = level === 2 ? 0.032 : level === 1 ? 0.014 : 0;
    this.dangerGain.gain.setTargetAtTime(gain, now, 0.6);
    this.dangerOsc.frequency.setTargetAtTime(
      level === 2 ? 74 : level === 1 ? 58 : 44,
      now,
      1.2,
    );
  }

  stopAmbient(): void {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    this.ambientGain.gain.setTargetAtTime(0, now, 0.2);
    for (const node of this.ambientNodes) {
      if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
        try {
          node.stop(now + 0.6);
        } catch {
          /* already stopped */
        }
      }
    }
    this.ambientNodes = [];
    const old = this.ambientGain;
    this.ambientGain = null;
    this.dangerGain = null;
    this.dangerOsc = null;
    setTimeout(() => old.disconnect(), 1000);
  }

  setDucked(ducked: boolean): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(this.isMuted ? 0 : ducked ? 0.35 : 0.85, this.ctx.currentTime, 0.1);
  }
}
