// The sounds a film can ask for, made from arithmetic: no samples, no downloads,
// nothing that isn't free. Each sound is a pure function of its inputs and a
// seed, so a soundtrack comes out the same every time it is made.
//
// Levels are the sound's own peak in dBFS before the cue's gain; they are set
// well under a voice at -16 LUFS so a sound is felt more than noticed.

import { hashOf, seeded } from "./prng";
import type { SoundCue, SoundKind } from "./types";

export const SAMPLE_RATE = 48_000;

export const dbToGain = (db: number): number => 10 ** (db / 20);
export const gainToDb = (gain: number): number => 20 * Math.log10(Math.max(gain, 1e-12));
const semis = (pitch: number): number => 2 ** (pitch / 12);

export { hashOf, seeded };

// A second-order filter (the RBJ cookbook forms), retunable while it runs.
class Filter {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private z1 = 0;
  private z2 = 0;

  constructor(
    private readonly kind: "lowpass" | "highpass" | "bandpass",
    freq: number,
    q: number,
  ) {
    this.tune(freq, q);
  }

  tune(freq: number, q: number): void {
    const f = Math.min(freq, SAMPLE_RATE * 0.45);
    const w = (2 * Math.PI * f) / SAMPLE_RATE;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    if (this.kind === "lowpass") {
      this.b0 = (1 - cos) / 2 / a0;
      this.b1 = (1 - cos) / a0;
      this.b2 = this.b0;
    } else if (this.kind === "highpass") {
      this.b0 = (1 + cos) / 2 / a0;
      this.b1 = -(1 + cos) / a0;
      this.b2 = this.b0;
    } else {
      this.b0 = alpha / a0;
      this.b1 = 0;
      this.b2 = -alpha / a0;
    }
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  process(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

const lowpass = (freq: number, q = 0.707): Filter => new Filter("lowpass", freq, q);
const highpass = (freq: number, q = 0.707): Filter => new Filter("highpass", freq, q);
const bandpass = (freq: number, q = 1): Filter => new Filter("bandpass", freq, q);

const peakOf = (buffer: Float32Array): number => {
  let peak = 0;
  for (const sample of buffer) peak = Math.max(peak, Math.abs(sample));
  return peak;
};

export const rmsOf = (buffer: Float32Array): number => {
  let sum = 0;
  for (const sample of buffer) sum += sample * sample;
  return Math.sqrt(sum / Math.max(1, buffer.length));
};

const toPeak = (buffer: Float32Array, db: number): Float32Array => {
  const peak = peakOf(buffer);
  if (peak === 0) return buffer;
  const scale = dbToGain(db) / peak;
  for (let i = 0; i < buffer.length; i += 1) buffer[i] *= scale;
  return buffer;
};

const toRms = (buffer: Float32Array, db: number): Float32Array => {
  const rms = rmsOf(buffer);
  if (rms === 0) return buffer;
  const scale = dbToGain(db) / rms;
  for (let i = 0; i < buffer.length; i += 1) buffer[i] *= scale;
  return buffer;
};

const samples = (seconds: number): number => Math.max(1, Math.round(seconds * SAMPLE_RATE));
const TAU = Math.PI * 2;

type Recipe = { pitch: number; dur: number; rand: () => number };

// A soft tap: a short band of noise over a low body that falls a little.
const click = ({ pitch, rand }: Recipe): Float32Array => {
  const f = semis(pitch);
  const out = new Float32Array(samples(0.1));
  const band = bandpass(2400 * f, 1.1);
  let phase = 0;
  for (let n = 0; n < out.length; n += 1) {
    const t = n / SAMPLE_RATE;
    const transient = band.process(rand() * 2 - 1) * Math.exp(-t / 0.0022);
    phase += (TAU * (140 * f + 60 * f * Math.exp(-t / 0.012))) / SAMPLE_RATE;
    const body = Math.sin(phase) * Math.exp(-t / 0.02);
    out[n] = (0.9 * transient + 0.5 * body) * Math.min(1, t / 0.0004);
  }
  return toPeak(out, -17);
};

// A key: smaller and higher than a click, and quiet.
const key = ({ pitch, rand }: Recipe): Float32Array => {
  const f = semis(pitch);
  const out = new Float32Array(samples(0.05));
  const band = bandpass(3200 * f, 1.4);
  let phase = 0;
  for (let n = 0; n < out.length; n += 1) {
    const t = n / SAMPLE_RATE;
    const transient = band.process(rand() * 2 - 1) * Math.exp(-t / 0.0014);
    phase += (TAU * 150 * f) / SAMPLE_RATE;
    const body = Math.sin(phase) * Math.exp(-t / 0.008);
    out[n] = (0.9 * transient + 0.35 * body) * Math.min(1, t / 0.0003);
  }
  return toPeak(out, -29);
};

// A very small high tick, for a line of a checklist settling.
const tick = ({ pitch }: Recipe): Float32Array => {
  const f = semis(pitch);
  const out = new Float32Array(samples(0.07));
  for (let n = 0; n < out.length; n += 1) {
    const t = n / SAMPLE_RATE;
    const tone = Math.sin(TAU * 2200 * f * t) + 0.25 * Math.sin(TAU * 4400 * f * t);
    out[n] = tone * Math.exp(-t / 0.011) * Math.min(1, t / 0.001);
  }
  return toPeak(out, -29);
};

// A soft bubble: a short rise in pitch that decays.
const pop = ({ pitch }: Recipe): Float32Array => {
  const f = semis(pitch);
  const out = new Float32Array(samples(0.2));
  let phase = 0;
  for (let n = 0; n < out.length; n += 1) {
    const t = n / SAMPLE_RATE;
    const freq = f * (640 - 220 * Math.exp(-t / 0.018));
    phase += (TAU * freq) / SAMPLE_RATE;
    out[n] = (Math.sin(phase) + 0.2 * Math.sin(2 * phase)) * Math.exp(-t / 0.055) * Math.min(1, t / 0.003);
  }
  return toPeak(out, -25);
};

// A case passing: a clear, soft ping, a fifth apart. A run of them can climb with `pitch`.
const pass = ({ pitch }: Recipe): Float32Array => {
  const f = semis(pitch);
  const out = new Float32Array(samples(0.8));
  const partials: Array<[ratio: number, level: number, tau: number]> = [
    [1, 1, 0.2],
    [1.5, 0.45, 0.14],
    [3, 0.1, 0.07],
  ];
  for (let n = 0; n < out.length; n += 1) {
    const t = n / SAMPLE_RATE;
    let sum = 0;
    for (const [ratio, level, tau] of partials) sum += level * Math.sin(TAU * 880 * f * ratio * t) * Math.exp(-t / tau);
    out[n] = sum * Math.min(1, t / 0.002);
  }
  return toPeak(out, -24);
};

// A step failing: a low, short thud, not an alarm.
const fail = ({ pitch, rand }: Recipe): Float32Array => {
  const f = semis(pitch);
  const out = new Float32Array(samples(0.6));
  const low = lowpass(520);
  let phase = 0;
  let phase2 = 0;
  for (let n = 0; n < out.length; n += 1) {
    const t = n / SAMPLE_RATE;
    phase += (TAU * f * (96 + 64 * Math.exp(-t / 0.05))) / SAMPLE_RATE;
    phase2 += (TAU * f * 233) / SAMPLE_RATE;
    const body = Math.sin(phase) * Math.exp(-t / 0.12);
    const hum = Math.sin(phase2) * Math.exp(-t / 0.09) * 0.22;
    const knock = low.process(rand() * 2 - 1) * Math.exp(-t / 0.03) * 0.5;
    out[n] = (body + hum + knock) * Math.min(1, t / 0.002);
  }
  return toPeak(out, -21);
};

// The finishing chime: four bell notes, an arpeggio that rings out.
const chime = ({ pitch }: Recipe): Float32Array => {
  const f = semis(pitch);
  const out = new Float32Array(samples(2.4));
  const notes: Array<[hz: number, start: number]> = [
    [523.25, 0],
    [659.25, 0.09],
    [783.99, 0.18],
    [1046.5, 0.3],
  ];
  const bell: Array<[ratio: number, level: number, tau: number]> = [
    [1, 1, 0.9],
    [2.01, 0.35, 0.5],
    [3.0, 0.16, 0.3],
    [4.2, 0.07, 0.18],
  ];
  for (const [hz, start] of notes) {
    const from = samples(start);
    for (let n = from; n < out.length; n += 1) {
      const t = (n - from) / SAMPLE_RATE;
      let sum = 0;
      for (const [ratio, level, tau] of bell) sum += level * Math.sin(TAU * hz * f * ratio * t) * Math.exp(-t / tau);
      out[n] += sum * Math.min(1, t / 0.003) * 0.5;
    }
  }
  return toPeak(out, -25);
};

// The wordmark landing: a low swell with a soft shimmer above it.
const bloom = ({ pitch, rand }: Recipe): Float32Array => {
  const f = semis(pitch);
  const out = new Float32Array(samples(2.6));
  const air = bandpass(1800, 0.6);
  const hush = lowpass(5000);
  const shimmer = [1318.5, 1760, 2093];
  for (let n = 0; n < out.length; n += 1) {
    const t = n / SAMPLE_RATE;
    const rise = (attack: number): number => 1 - Math.exp(-t / attack);
    let sum = 0.62 * Math.sin(TAU * 62 * f * t) * rise(0.09) * Math.exp(-t / 0.75);
    sum += 0.25 * Math.sin(TAU * 124 * f * t) * rise(0.06) * Math.exp(-t / 0.55);
    for (const hz of shimmer) sum += 0.07 * Math.sin(TAU * hz * f * t) * rise(0.12) * Math.exp(-t / 0.9);
    sum += 0.12 * hush.process(air.process(rand() * 2 - 1)) * rise(0.15) * Math.exp(-t / 0.8);
    out[n] = sum;
  }
  return toPeak(out, -23);
};

// A pass of the camera: noise through a band that opens and closes.
const whoosh = ({ dur, rand }: Recipe): Float32Array => {
  const length = samples(dur + 0.12);
  const out = new Float32Array(length);
  const band = bandpass(500, 0.9);
  const low = lowpass(6000);
  const high = highpass(140);
  const body = Math.max(0.05, dur);
  for (let n = 0; n < length; n += 1) {
    const x = Math.min(1, n / SAMPLE_RATE / body);
    if (n % 32 === 0) band.tune(450 * 7 ** Math.sin(Math.PI * x), 0.9);
    const env = Math.sin(Math.PI * x) ** 1.5;
    out[n] = high.process(low.process(band.process(rand() * 2 - 1))) * env;
  }
  return toPeak(out, -21);
};

// A rise into something: noise that climbs and closes just before it lands.
const swell = ({ dur, rand }: Recipe): Float32Array => {
  const length = samples(dur);
  const out = new Float32Array(length);
  const band = bandpass(250, 1.1);
  const low = lowpass(5000);
  for (let n = 0; n < length; n += 1) {
    const x = n / length;
    if (n % 32 === 0) band.tune(250 * 11 ** x ** 1.5, 1.1);
    const env = x ** 2.2 * (x < 0.88 ? 1 : (1 - x) / 0.12);
    out[n] = low.process(band.process(rand() * 2 - 1)) * env;
  }
  return toPeak(out, -26);
};

const RECIPES: Record<SoundKind, (recipe: Recipe) => Float32Array> = {
  click,
  key,
  tick,
  pop,
  pass,
  fail,
  chime,
  bloom,
  whoosh,
  swell,
};

const DEFAULT_DURATION: Partial<Record<SoundKind, number>> = { whoosh: 0.8, swell: 1.6 };

// One cue as a mono buffer at the sound's own level (the cue's gain and pan are
// applied when it is mixed in).
export const renderSound = (cue: SoundCue): Float32Array =>
  RECIPES[cue.kind]({
    pitch: cue.pitch,
    dur: cue.dur ?? DEFAULT_DURATION[cue.kind] ?? 0.5,
    rand: seeded(hashOf(`${cue.kind}:${cue.at.toFixed(3)}`)),
  });

// Air in the room: brown noise low and slow, a breath of high hush over it, and
// a swell in the level every sixteen seconds or so. Two seeds make the sides differ.
export const roomTone = (seconds: number, seed: number, db: number): Float32Array => {
  const length = samples(seconds);
  const rand = seeded(seed);
  const out = new Float32Array(length);
  const rumble = lowpass(420, 0.7);
  const air = bandpass(1800, 0.5);
  let brown = 0;
  const phase = rand() * TAU;
  for (let n = 0; n < length; n += 1) {
    brown = (brown + 0.02 * (rand() * 2 - 1)) / 1.02;
    const low = rumble.process(brown * 18);
    const hush = air.process(rand() * 2 - 1) * 0.03;
    const drift = 1 + 0.12 * Math.sin(phase + (TAU * 0.06 * n) / SAMPLE_RATE);
    out[n] = (low + hush) * drift;
  }
  return toRms(out, db);
};
