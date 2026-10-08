import assert from "node:assert/strict";
import test from "node:test";
import { dbToGain, gainToDb, renderSound, rmsOf, roomTone, SAMPLE_RATE } from "../engine/sfx";
import { panGains, renderSoundtrack, soundStats, wavOf } from "../engine/soundtrack";
import type { MotionInfo, SoundCue, SoundKind } from "../engine/types";
import { staleProblems } from "../engine/voiceover";

const KINDS: SoundKind[] = ["click", "key", "tick", "pop", "pass", "fail", "chime", "whoosh", "swell", "bloom"];

const cue = (kind: SoundKind, at: number, extra: Partial<SoundCue> = {}): SoundCue => ({
  at,
  kind,
  gain: 0,
  pan: 0,
  pitch: 0,
  ...extra,
});

const peakOf = (buffer: ArrayLike<number>): number => {
  let peak = 0;
  for (let i = 0; i < buffer.length; i += 1) peak = Math.max(peak, Math.abs(buffer[i]));
  return peak;
};

// Energy of a buffer at one frequency (the Goertzel recurrence), in dB.
const energyAt = (buffer: Float32Array, hz: number): number => {
  const w = (2 * Math.PI * hz) / SAMPLE_RATE;
  const coeff = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (const x of buffer) {
    const s0 = x + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return 10 * Math.log10(Math.max(power, 1e-20));
};

test("every sound is finite, audible, under its own ceiling, and the same each time", () => {
  for (const kind of KINDS) {
    const a = renderSound(cue(kind, 3.25));
    const b = renderSound(cue(kind, 3.25));
    assert.ok(a.length > 100, `${kind} has samples`);
    assert.ok(a.every(Number.isFinite), `${kind} is finite`);
    assert.deepEqual(Array.from(a.slice(0, 500)), Array.from(b.slice(0, 500)), `${kind} is deterministic`);
    const peakDb = gainToDb(peakOf(a));
    assert.ok(peakDb > -32 && peakDb < -16, `${kind} peaks at ${peakDb.toFixed(1)} dBFS`);
  }
  const other = renderSound(cue("click", 3.26));
  const same = renderSound(cue("click", 3.25));
  assert.notDeepEqual(Array.from(other.slice(0, 200)), Array.from(same.slice(0, 200)), "two clicks are not clones");
});

test("sounds sit where their names say: a pass rings at 880 Hz, a tick high, a fail low, a whoosh broad", () => {
  const pass = renderSound(cue("pass", 1));
  assert.ok(energyAt(pass, 880) > energyAt(pass, 700) + 15, "a pass has its pitch");
  const higher = renderSound(cue("pass", 1, { pitch: 12 }));
  assert.ok(energyAt(higher, 1760) > energyAt(higher, 880) + 10, "an octave of pitch doubles the frequency");
  const tick = renderSound(cue("tick", 1));
  assert.ok(energyAt(tick, 2200) > energyAt(tick, 300) + 15, "a tick is high");
  const fail = renderSound(cue("fail", 1));
  assert.ok(energyAt(fail, 110) > energyAt(fail, 2500) + 20, "a fail is low");
  const whoosh = renderSound(cue("whoosh", 1, { dur: 1.2 }));
  assert.ok(whoosh.length > 1.2 * SAMPLE_RATE, "a whoosh lasts as long as it is told to");
  const bands = [300, 800, 1600, 3000].map((hz) => energyAt(whoosh, hz));
  assert.ok(Math.max(...bands) - Math.min(...bands) < 30, "a whoosh is broad, not a tone");
});

test("a whoosh and a swell stretch to the length asked, and start and end at nothing", () => {
  for (const kind of ["whoosh", "swell"] as const) {
    const short = renderSound(cue(kind, 0, { dur: 0.6 }));
    const long = renderSound(cue(kind, 0, { dur: 2 }));
    assert.ok(long.length > short.length * 2.5, `${kind} gets longer`);
    assert.ok(Math.abs(long[0]) < 0.01 * peakOf(long), `${kind} starts quietly`);
    assert.ok(Math.abs(long[long.length - 1]) < 0.02 * peakOf(long), `${kind} ends quietly`);
  }
});

test("room tone sits at the level it is given and never goes silent", () => {
  const tone = roomTone(8, 11, -49);
  const db = gainToDb(rmsOf(tone));
  assert.ok(Math.abs(db - -49) < 0.5, `room tone is ${db.toFixed(1)} dBFS`);
  const stats = soundStats({ left: tone, right: tone }, []);
  assert.ok(stats.quietestDb > -58, `quietest tenth of a second is ${stats.quietestDb.toFixed(1)} dBFS`);
  const other = roomTone(8, 12, -49);
  assert.notDeepEqual(Array.from(tone.slice(0, 100)), Array.from(other.slice(0, 100)), "the two sides differ");
});

test("a soundtrack puts each cue at its time, in the right speaker, with its gain", () => {
  const track = renderSoundtrack([cue("click", 1, { pan: -1 }), cue("click", 2, { pan: 1, gain: -6 })], 3, {
    roomDb: null,
  });
  const window = (side: Float32Array, from: number, to: number): number =>
    peakOf(side.subarray(Math.round(from * SAMPLE_RATE), Math.round(to * SAMPLE_RATE)));
  assert.ok(window(track.left, 1, 1.1) > 0.05, "left click is in the left speaker");
  assert.ok(window(track.right, 1, 1.1) < 1e-6, "and not in the right");
  assert.ok(window(track.right, 2, 2.1) > 0.02 && window(track.left, 2, 2.1) < 1e-6, "right click is on the right");
  assert.ok(window(track.left, 1.5, 1.9) === 0, "silence between cues when there is no room tone");
  const louder = window(track.left, 1, 1.1);
  const softer = window(track.right, 2, 2.1);
  assert.ok(Math.abs(gainToDb(louder / softer) - 6) < 0.5, "-6 dB is half the amplitude");
});

test("a cue that sweeps pans from one speaker to the other", () => {
  const track = renderSoundtrack([cue("whoosh", 0.5, { dur: 1.5, pan: -0.8, panTo: 0.8 })], 3, { roomDb: null });
  const slice = (side: Float32Array, from: number, to: number): number =>
    rmsOf(side.subarray(Math.round(from * SAMPLE_RATE), Math.round(to * SAMPLE_RATE)));
  assert.ok(slice(track.left, 0.6, 0.9) > slice(track.right, 0.6, 0.9) * 1.5, "starts left");
  assert.ok(slice(track.right, 1.6, 1.9) > slice(track.left, 1.6, 1.9) * 1.5, "ends right");
});

test("equal-power panning keeps loudness steady across the field", () => {
  for (const pan of [-1, -0.5, 0, 0.5, 1]) {
    const [l, r] = panGains(pan);
    assert.ok(Math.abs(l * l + r * r - 1) < 1e-9, `power at ${pan}`);
  }
  const [cl, cr] = panGains(0);
  assert.ok(Math.abs(gainToDb(cl) - -3.01) < 0.01 && Math.abs(cl - cr) < 1e-12);
  assert.ok(Math.abs(dbToGain(-20) - 0.1) < 1e-12);
});

test("the WAV is 32-bit float stereo at 48 kHz and carries the samples back out", () => {
  const left = Float32Array.from([0, 0.5, -0.25, 1]);
  const right = Float32Array.from([0.1, -0.5, 0.25, -1]);
  const wav = wavOf({ left, right });
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt16LE(20), 3, "IEEE float");
  assert.equal(wav.readUInt16LE(22), 2, "stereo");
  assert.equal(wav.readUInt32LE(24), 48000);
  assert.equal(wav.readUInt16LE(34), 32);
  assert.equal(wav.readUInt32LE(40), 4 * 8);
  assert.equal(wav.length, 44 + 4 * 8);
  assert.equal(wav.readFloatLE(44 + 2 * 8), -0.25, "left of the third frame");
  assert.equal(wav.readFloatLE(44 + 2 * 8 + 4), 0.25, "right of the third frame");
});

test("stats count the cues by kind and report the quietest and loudest tenth of a second", () => {
  const track = renderSoundtrack([cue("click", 0.5), cue("click", 1.2), cue("pass", 1.6)], 3, { roomDb: -50 });
  const stats = soundStats(track, [cue("click", 0.5), cue("click", 1.2), cue("pass", 1.6)]);
  assert.deepEqual(stats.cues, { click: 2, pass: 1 });
  assert.ok(stats.loudestDb > stats.quietestDb + 15);
  assert.ok(stats.peakDb < -10);
});

test("a render is stale when the film's length or any beat start has moved", () => {
  const base: MotionInfo = {
    title: "t",
    width: 1280,
    height: 720,
    fps: 60,
    duration: 100,
    beats: [
      { id: "a", title: "A", at: 0, end: 40, shows: "", talk: [], cues: [] },
      { id: "b", title: "B", at: 40, end: 100, shows: "", talk: [], cues: [] },
    ],
  };
  assert.deepEqual(staleProblems(base, base), []);
  assert.match(staleProblems({ ...base, duration: 101 }, base)[0], /101\.00 s now, the render is 100\.00 s/);
  const moved = { ...base, beats: [base.beats[0], { ...base.beats[1], at: 42 }] };
  assert.match(staleProblems(moved, base)[0], /beat "b" starts at 0:42\.0 now, 0:40\.0 in the render/);
  assert.match(staleProblems({ ...base, beats: [...base.beats, { ...base.beats[1], id: "c" }] }, base)[0], /"c" is not in/);
});
