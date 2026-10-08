// A film's soundtrack from its sound cues: every cue placed in time and in the
// stereo field, over a quiet room tone so the pauses between words are never
// digital silence. Written as a 32-bit float WAV for ffmpeg to mix under the
// voice.

import { dbToGain, gainToDb, renderSound, roomTone, SAMPLE_RATE } from "./sfx";
import type { SoundCue } from "./types";

export type Stereo = { left: Float32Array; right: Float32Array };

export type SoundtrackOptions = {
  // Room tone level, dBFS RMS per side. Null leaves it out.
  roomDb?: number | null;
  // Trim on every cue, dB.
  level?: number;
};

// Equal-power pan: -1 is all left, 1 all right, 0 is 3 dB down on both.
export const panGains = (pan: number): [left: number, right: number] => {
  const angle = ((Math.min(1, Math.max(-1, pan)) + 1) * Math.PI) / 4;
  return [Math.cos(angle), Math.sin(angle)];
};

export const renderSoundtrack = (
  cues: readonly SoundCue[],
  duration: number,
  options: SoundtrackOptions = {},
): Stereo => {
  const length = Math.ceil(duration * SAMPLE_RATE);
  const roomDb = options.roomDb === undefined ? -49 : options.roomDb;
  const left = roomDb === null ? new Float32Array(length) : roomTone(duration, 0x51ab, roomDb).subarray(0, length).slice();
  const right = roomDb === null ? new Float32Array(length) : roomTone(duration, 0x7c3d, roomDb).subarray(0, length).slice();
  const trim = dbToGain(options.level ?? 0);
  for (const cue of cues) {
    const mono = renderSound(cue);
    const gain = dbToGain(cue.gain) * trim;
    const start = Math.round(cue.at * SAMPLE_RATE);
    const sweep = cue.panTo !== undefined;
    const [fixedLeft, fixedRight] = panGains(cue.pan);
    for (let n = 0; n < mono.length; n += 1) {
      const at = start + n;
      if (at < 0 || at >= length) continue;
      let l = fixedLeft;
      let r = fixedRight;
      if (sweep) [l, r] = panGains(cue.pan + ((cue.panTo ?? cue.pan) - cue.pan) * (n / mono.length));
      const sample = mono[n] * gain;
      left[at] += sample * l;
      right[at] += sample * r;
    }
  }
  return { left, right };
};

// A 32-bit float stereo WAV.
export const wavOf = ({ left, right }: Stereo, rate = SAMPLE_RATE): Buffer => {
  const frames = left.length;
  const data = Buffer.alloc(frames * 8);
  for (let i = 0; i < frames; i += 1) {
    data.writeFloatLE(left[i], i * 8);
    data.writeFloatLE(right[i], i * 8 + 4);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(3, 20); // IEEE float
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 8, 28);
  header.writeUInt16LE(8, 32);
  header.writeUInt16LE(32, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};

export type SoundStats = {
  cues: Record<string, number>;
  peakDb: number;
  // RMS of the whole track, both sides, dBFS.
  rmsDb: number;
  // The quietest and the loudest window of `window` seconds, dBFS RMS.
  quietestDb: number;
  loudestDb: number;
};

export const soundStats = ({ left, right }: Stereo, cues: readonly SoundCue[], window = 0.1): SoundStats => {
  const counts: Record<string, number> = {};
  for (const cue of cues) counts[cue.kind] = (counts[cue.kind] ?? 0) + 1;
  const size = Math.round(window * SAMPLE_RATE);
  let peak = 0;
  let total = 0;
  let quietest = Infinity;
  let loudest = 0;
  for (let from = 0; from + size <= left.length; from += size) {
    let sum = 0;
    for (let i = from; i < from + size; i += 1) {
      const l = left[i];
      const r = right[i];
      peak = Math.max(peak, Math.abs(l), Math.abs(r));
      sum += (l * l + r * r) / 2;
    }
    total += sum;
    const rms = Math.sqrt(sum / size);
    quietest = Math.min(quietest, rms);
    loudest = Math.max(loudest, rms);
  }
  const windows = Math.floor(left.length / size);
  return {
    cues: counts,
    peakDb: gainToDb(peak),
    rmsDb: gainToDb(Math.sqrt(total / Math.max(1, windows * size))),
    quietestDb: gainToDb(quietest === Infinity ? 0 : quietest),
    loudestDb: gainToDb(loudest),
  };
};
