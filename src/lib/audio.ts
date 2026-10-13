"use client";

import type { EmotionAura } from "./expressions";

/**
 * Procedural audio. No sample files — every sound here is synthesised in
 * the browser, so the whole ambience ships inside the JS bundle.
 *
 * Layers:
 *   drone      stacked detuned oscillators through a moving lowpass
 *   pad        slow-beating fifths, wide stereo
 *   pulse      heartbeat-shaped noise burst on the current BPM
 *   shimmer    high sparkle grains, density follows the emotion
 *   ui         transient blips for interaction
 */

function makeNoiseBuffer(ctx: AudioContext, seconds = 2) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function makeImpulseResponse(ctx: AudioContext, seconds = 3.4, decay = 2.6) {
  const rate = ctx.sampleRate;
  const length = rate * seconds;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return impulse;
}

export class MindAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private droneGain!: GainNode;
  private padGain!: GainNode;
  private shimmerGain!: GainNode;
  private droneFilter!: BiquadFilterNode;
  private oscillators: OscillatorNode[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private pulseTimer: number | null = null;
  private raf: number | null = null;
  private started = false;
  private muted = false;
  private currentAura: EmotionAura | null = null;

  get isMuted() {
    return this.muted;
  }

  get isRunning() {
    return this.started;
  }

  async start() {
    if (this.started) {
      if (this.ctx?.state === "suspended") await this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    this.ctx = ctx;
    this.noiseBuffer = makeNoiseBuffer(ctx);

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulseResponse(ctx);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.5;
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.master);

    // --- Drone: detuned saw/triangle stack through a moving lowpass
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = "lowpass";
    this.droneFilter.frequency.value = 420;
    this.droneFilter.Q.value = 3.2;

    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.1;
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.master);
    this.droneGain.connect(this.reverbSend);

    const base = 55;
    const ratios = [1, 1.5, 2, 3.01];
    for (let i = 0; i < ratios.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sawtooth" : "triangle";
      osc.frequency.value = base * ratios[i];
      osc.detune.value = (i - 1.5) * 4;
      const g = ctx.createGain();
      g.gain.value = 1 / (i + 1.4);
      osc.connect(g);
      g.connect(this.droneFilter);
      osc.start();
      this.oscillators.push(osc);
    }

    // Slow filter movement so the drone never sits still.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(this.droneFilter.frequency);
    lfo.start();

    // --- Pad: two slowly beating voices, panned wide
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.0;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "bandpass";
    padFilter.frequency.value = 880;
    padFilter.Q.value = 0.8;
    padFilter.connect(this.padGain);
    this.padGain.connect(this.master);
    this.padGain.connect(this.reverbSend);

    [-1, 1].forEach((pan, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = base * 3 * (i === 0 ? 1 : 1.5);
      osc.detune.value = i === 0 ? -7 : 9;
      const p = ctx.createStereoPanner();
      p.pan.value = pan * 0.7;
      const g = ctx.createGain();
      g.gain.value = 0.35;
      osc.connect(g);
      g.connect(p);
      p.connect(padFilter);
      osc.start();
    });

    // --- Shimmer: filtered noise grains
    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.value = 0.0;
    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = "highpass";
    shimmerFilter.frequency.value = 4200;
    const shimmerSrc = ctx.createBufferSource();
    shimmerSrc.buffer = this.noiseBuffer;
    shimmerSrc.loop = true;
    const shimmerLfo = ctx.createOscillator();
    shimmerLfo.frequency.value = 0.17;
    const shimmerLfoGain = ctx.createGain();
    shimmerLfoGain.gain.value = 0.5;
    shimmerSrc.connect(shimmerFilter);
    shimmerFilter.connect(shimmerLfoGain);
    shimmerLfoGain.connect(this.shimmerGain.gain);
    shimmerSrc.connect(shimmerFilter);
    this.shimmerGain.connect(this.master);
    this.shimmerGain.connect(this.reverbSend);
    shimmerSrc.start();
    shimmerLfo.start();

    this.started = true;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, ctx.currentTime, 2.2);
    this.padGain.gain.setTargetAtTime(0.05, ctx.currentTime, 4);
    this.restartPulse(62);
  }

  /** Retune the whole ambience to match the active emotion. */
  setAura(aura: EmotionAura) {
    this.currentAura = aura;
    if (!this.ctx || !this.started) return;
    const now = this.ctx.currentTime;
    const { root, cutoff, detune, shimmer } = aura.drone;

    this.oscillators.forEach((osc, i) => {
      const ratios = [1, 1.5, 2, 3.01];
      osc.frequency.setTargetAtTime(root * ratios[i], now, 1.8);
      osc.detune.setTargetAtTime((i - 1.5) * detune, now, 1.8);
    });
    this.droneFilter.frequency.setTargetAtTime(cutoff, now, 2.4);
    this.droneGain.gain.setTargetAtTime(0.085 + aura.lightIntensity * 0.03, now, 2);
    this.padGain.gain.setTargetAtTime(0.03 + shimmer * 0.09, now, 2.4);
    this.shimmerGain.gain.setTargetAtTime(shimmer * 0.018, now, 2.4);

    this.restartPulse(aura.bpm);
  }

  private restartPulse(bpm: number) {
    if (this.pulseTimer !== null) {
      window.clearTimeout(this.pulseTimer);
      this.pulseTimer = null;
    }
    const interval = 60000 / bpm;
    const tick = () => {
      this.heartbeat();
      this.pulseTimer = window.setTimeout(tick, interval);
    };
    this.pulseTimer = window.setTimeout(tick, 80);
  }

  private heartbeat() {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Lub-dub: a strong beat then a softer echo, like a real heart.
    [0, 0.16].forEach((delay, i) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer!;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = i === 0 ? 130 : 95;
      const gain = ctx.createGain();
      const peak = i === 0 ? 0.32 : 0.16;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(peak, now + delay + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.2);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      gain.connect(this.reverbSend);
      src.start(now + delay);
      src.stop(now + delay + 0.25);
    });
  }

  /** Short synthesised blip. Used for hover, focus and entry. */
  blip(freq = 660, duration = 0.09, volume = 0.14, type: OscillatorType = "sine") {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.6, now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    gain.connect(this.reverbSend);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  hover() {
    this.blip(880, 0.06, 0.05, "sine");
  }

  focus() {
    this.blip(523.25, 0.14, 0.1, "triangle");
    window.setTimeout(() => this.blip(783.99, 0.18, 0.07, "triangle"), 70);
  }

  enter() {
    [261.63, 392, 523.25, 659.25].forEach((f, i) =>
      window.setTimeout(() => this.blip(f, 0.5, 0.09, "sine"), i * 110)
    );
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.5);
  }

  dispose() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    if (this.pulseTimer !== null) window.clearTimeout(this.pulseTimer);
    this.oscillators.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    });
    this.oscillators = [];
    this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}

let singleton: MindAudio | null = null;
export const getMindAudio = () => {
  if (typeof window === "undefined") return null;
  if (!singleton) singleton = new MindAudio();
  return singleton;
};