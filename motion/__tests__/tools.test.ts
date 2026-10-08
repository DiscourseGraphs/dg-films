import assert from "node:assert/strict";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseArgs } from "../engine/args";
import {
  clipCacheDir,
  clipKey,
  fitNarration,
  fitRecap,
  fitTable,
  rewriteAts,
  spokenDurations,
  tooShort,
  wavDurationMs,
  writableAts,
  type Speak,
} from "../engine/fit";
import {
  acquireLock,
  clockTime,
  releaseOnSignals,
  waitingMessage,
  withRenderLock,
  type LockDeps,
  type LockHolder,
  type SignalHost,
} from "../engine/lock";
import { describeSheet, pickTimes, planSheets, sheetArgs, tileLabel, xstackLayout, type Tile } from "../engine/stills";
import type { MotionInfo } from "../engine/types";
import type { Narration, NarrationLine } from "../engine/voiceover";

const near = (actual: number, expected: number, message?: string): void =>
  assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `${actual} is not ${expected}`);

const film: MotionInfo = {
  title: "A film",
  width: 1280,
  height: 720,
  fps: 60,
  duration: 30,
  beats: [
    {
      id: "a",
      title: "First",
      at: 0,
      end: 8,
      shows: "",
      talk: [],
      cues: [{ at: 2.5, label: "The card lands" }],
    },
    { id: "b", title: "Second", at: 8, end: 14, shows: "", talk: [], cues: [] },
    {
      id: "c",
      title: "Third",
      at: 14,
      end: 30,
      shows: "",
      talk: [],
      cues: [
        { at: 20, label: "Halfway" },
        { at: 29, label: "The end" },
      ],
    },
  ],
};

const line = (id: string, beat: string, at: number, text = `Words of ${id}.`): NarrationLine => ({
  id,
  beat,
  at,
  text,
});

const clips = (seconds: Record<string, number>): Map<string, number> =>
  new Map(Object.entries(seconds).map(([id, s]) => [id, Math.round(s * 1000)]));

// ---- Fitting narration to beats ----

test("fit puts the first line a lead after the beat starts and each next one a gap after the last ended", () => {
  const [a] = fitNarration(
    [line("a1", "a", 9), line("a2", "a", 9), line("a3", "a", 9)],
    film,
    clips({ a1: 2, a2: 1.5, a3: 1 }),
  );
  assert.deepEqual(
    a.lines.map((l) => [l.id, l.at, l.end]),
    [
      ["a1", 0.5, 2.5],
      ["a2", 2.85, 4.35],
      ["a3", 4.7, 5.7],
    ],
  );
  near(a.needed, 6.3, "the last line's end plus 0.6 s");
  near(a.length, 8);
  near(a.spare, 1.7);
  assert.equal(tooShort(a), false);
});

test("fit takes its lead and gap from the options", () => {
  const [a] = fitNarration([line("a1", "a", 0), line("a2", "a", 0)], film, clips({ a1: 2, a2: 1 }), {
    lead: 1,
    gap: 0.5,
    tail: 1,
  });
  assert.deepEqual(
    a.lines.map((l) => l.at),
    [1, 3.5],
  );
  near(a.needed, 5.5);
});

test("fit rounds a start up to a hundredth, so the gap is never a hair short", () => {
  const [a] = fitNarration([line("a1", "a", 0), line("a2", "a", 0)], film, clips({ a1: 2.004, a2: 1 }));
  const [first, second] = a.lines;
  assert.equal(second.at, 2.86);
  assert.ok(second.at - first.end >= 0.35 - 1e-9 && second.at - first.end < 0.36);
});

test("fit follows the film's beat order and each beat's script order, and skips a beat with no lines", () => {
  const fits = fitNarration(
    [line("c1", "c", 5), line("a2", "a", 0.1), line("c2", "c", 1), line("a1", "a", 7)],
    film,
    clips({ c1: 1, c2: 1, a1: 1, a2: 1 }),
  );
  assert.deepEqual(
    fits.map((fit) => fit.id),
    ["a", "c"],
  );
  assert.deepEqual(
    fits[0].lines.map((l) => [l.id, l.at, l.was]),
    [
      ["a2", 0.5, 0.1],
      ["a1", 1.85, 7],
    ],
    "a line keeps its place in the script whatever its old at says",
  );
  assert.deepEqual(
    fits[1].lines.map((l) => l.id),
    ["c1", "c2"],
  );
});

test("a beat shorter than its narration needs is flagged, with how much it is short", () => {
  const fits = fitNarration([line("b1", "b", 0), line("b2", "b", 0)], film, clips({ b1: 3, b2: 3 }));
  const [b] = fits;
  near(b.needed, 7.45, "3.85 + 3 + 0.6: the second line starts after the first and a gap");
  near(b.spare, 6 - 7.45);
  assert.equal(tooShort(b), true);
  assert.match(fitRecap(fits), /Too short, 1 of 1: b needs 7\.45 s and has 6\.00 s/);
  assert.equal(tooShort({ ...b, spare: -0.004 }), false, "a difference under half a hundredth is not worth reporting");
});

test("fit refuses a line it can't place", () => {
  assert.throws(() => fitNarration([line("x", "nope", 0)], film, clips({ x: 1 })), /beat "nope".*a, b, c/);
  assert.throws(() => fitNarration([line("x", "a", 0)], film, clips({})), /No clip for line "x"/);
  assert.throws(
    () => fitNarration([line("x", "a", 0), line("x", "b", 0)], film, clips({ x: 1 })),
    /Two narration lines are called "x"/,
  );
  assert.throws(
    () => fitNarration([line("x", "a", 0)], film, clips({ x: 1 }), { lead: 0.5, gap: -1, tail: 0.6 }),
    /gap/,
  );
});

test("the table lists each beat's lines with start and end, what it needs, its length and the difference", () => {
  const fits = fitNarration(
    [line("a1", "a", 0.5, "Hello."), line("a2", "a", 4, "Again."), line("b1", "b", 0, "Too long.")],
    film,
    clips({ a1: 2, a2: 1.5, b1: 7 }),
  );
  const table = fitTable(fits);
  assert.match(table, /^a {2}0:00\.0 → 0:08\.0$/m);
  assert.match(table, /a1 +0\.50 → +2\.50 +2\.00 s +Hello\./);
  assert.match(table, /a2 +2\.85 → +4\.35 +1\.50 s +was 4\.00 +Again\./, "a changed start shows what it was");
  assert.ok(!/a1.*was/.test(table), "an unchanged start shows nothing");
  assert.match(table, /needs at least 4\.95 s, beat is 8\.00 s, difference \+3\.05 s$/m);
  assert.match(table, /needs at least 8\.10 s, beat is 6\.00 s, difference -2\.10 s {2}TOO SHORT$/m);
});

// ---- Writing the new at values back ----

// Prettier's style, as the films' own narration.json files are written: one line
// each, long ones broken, and blank lines between groups.
const PRETTY = `{
  "voice": "af_heart",
  "speed": 0.88,
  "lines": [
    { "id": "one", "beat": "a", "at": 0.5, "text": "First." },
    { "id": "two", "beat": "a", "at": 3.30, "text": "Second, with \\"at\\": 9 inside." },

    {
      "id": "three",
      "beat": "b",
      "at": 1,
      "text": "Third."
    }
  ]
}
`;

const numbersZeroed = (text: string): string => text.replace(/("at": )-?[\d.]+/g, "$10");

test("rewriting changes the at values and nothing else, blank lines and line breaks included", () => {
  const { text, changed } = rewriteAts(
    PRETTY,
    new Map([
      ["one", 0.75],
      ["two", 3.3],
      ["three", 2.05],
    ]),
  );
  assert.equal(changed, 2, "two is the same number as before");
  assert.equal(numbersZeroed(text), numbersZeroed(PRETTY));
  assert.ok(text.includes('"at": 0.75, "text": "First."'));
  assert.ok(text.includes('"at": 3.30,'), "an unchanged value keeps the way it was written");
  assert.ok(text.includes('"at": 2.05,'));
  const parsed = JSON.parse(text) as Narration;
  assert.deepEqual(
    parsed.lines.map((l) => [l.id, l.beat, l.at, l.text]),
    [
      ["one", "a", 0.75, "First."],
      ["two", "a", 3.3, 'Second, with "at": 9 inside.'],
      ["three", "b", 2.05, "Third."],
    ],
    "ids, order and text are as they were",
  );
});

test("rewriting works on two-space JSON and with the keys in any order", () => {
  const source = JSON.stringify(
    {
      voice: "v",
      speed: 1,
      lines: [
        { text: "T1", at: 1, beat: "a", id: "x" },
        { id: "y", beat: "a", at: 2, text: "T2" },
      ],
    },
    null,
    2,
  );
  const { text } = rewriteAts(
    source,
    new Map([
      ["x", 10],
      ["y", 20.25],
    ]),
  );
  assert.equal(numbersZeroed(text), numbersZeroed(source));
  const lines = (JSON.parse(text) as Narration).lines;
  assert.deepEqual(
    lines.map((l) => [l.id, l.at]),
    [
      ["x", 10],
      ["y", 20.25],
    ],
  );
  assert.ok(text.includes('"at": 10,'));
});

test("rewriting leaves lines it wasn't given alone, and says when it can't find or read something", () => {
  const same = rewriteAts(PRETTY, new Map([["one", 0.5]]));
  assert.equal(same.text, PRETTY);
  assert.equal(same.changed, 0);
  const only = rewriteAts(PRETTY, new Map([["three", 4]])).text;
  assert.ok(only.includes('"at": 3.30,') && only.includes('"at": 0.5,') && only.includes('"at": 4,'));
  assert.throws(() => rewriteAts(PRETTY, new Map([["nope", 1]])), /Line "nope" is not in narration\.json/);
  assert.throws(() => rewriteAts('{ "lines": [ { "id": "x" } ] }', new Map([["x", 1]])), /no "at"/);
  assert.throws(() => rewriteAts("{ not json", new Map()), /Can't read narration\.json/);
  assert.throws(() => rewriteAts('{ "voice": "v" }', new Map()), /no "lines"/);
});

// ---- Clips kept by what they say ----

// A 16-bit mono WAV, silent, of the given length.
const wav = (seconds: number, rate = 24000, extra = false): Buffer => {
  const data = Buffer.alloc(Math.round(seconds * rate) * 2);
  const list = extra
    ? Buffer.concat([Buffer.from("LIST"), Buffer.from([3, 0, 0, 0]), Buffer.from("abc"), Buffer.from([0])])
    : Buffer.alloc(0);
  const head = Buffer.alloc(36);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + list.length + 8 + data.length, 4);
  head.write("WAVE", 8);
  head.write("fmt ", 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  const size = Buffer.alloc(8);
  size.write("data", 0);
  size.writeUInt32LE(data.length, 4);
  return Buffer.concat([head, list, size, data]);
};

test("a clip's length comes from its WAV header, past any chunk before the data, and a broken file is null", () => {
  assert.equal(wavDurationMs(wav(1.5)), 1500);
  assert.equal(wavDurationMs(wav(2.25, 24000, true)), 2250);
  assert.equal(wavDurationMs(wav(1, 48000)), 1000);
  assert.equal(wavDurationMs(wav(1.5).subarray(0, 24000)), null, "cut short in the middle of its data");
  assert.equal(wavDurationMs(Buffer.from("not a wav file at all")), null);
  assert.equal(wavDurationMs(Buffer.alloc(0)), null);
});

const tmp = (): string => fsSync.mkdtempSync(path.join(os.tmpdir(), "motion-tools-"));

// A synthesizer that writes a clip per line, a tenth of a second for each character, and keeps count.
const fakeSpeaker = (): { speak: Speak; asked: string[][] } => {
  const asked: string[][] = [];
  const speak: Speak = async (narration, outDir) => {
    asked.push(narration.lines.map((l) => l.text));
    const out = new Map<string, { path: string; durationMs: number }>();
    for (const l of narration.lines) {
      const file = path.join(outDir, `${l.id}.wav`);
      await fs.writeFile(file, wav(l.text.length / 10));
      out.set(l.id, { path: file, durationMs: l.text.length * 100 });
    }
    return out;
  };
  return { speak, asked };
};

const script = (texts: Record<string, string>, voice = "v", speed = 1): Narration => ({
  voice,
  speed,
  lines: Object.entries(texts).map(([id, text]) => line(id, "a", 0, text)),
});

test("a line is spoken once, and again only when its words, voice or speed change", async () => {
  const cache = tmp();
  const { speak, asked } = fakeSpeaker();
  const first = await spokenDurations(script({ x: "Hello", y: "Hello there" }), cache, speak);
  assert.deepEqual(asked, [["Hello", "Hello there"]]);
  assert.deepEqual(
    [...first.durations],
    [
      ["x", 500],
      ["y", 1100],
    ],
  );
  assert.equal(first.spoken, 2);

  const again = await spokenDurations(script({ x: "Hello", y: "Hello there" }), cache, speak);
  assert.equal(asked.length, 1, "nothing to speak the second time");
  assert.deepEqual([...again.durations], [...first.durations]);
  assert.deepEqual([again.spoken, again.reused], [0, 2]);

  const edited = await spokenDurations(script({ x: "Hello", y: "Goodbye" }), cache, speak);
  assert.deepEqual(asked[1], ["Goodbye"], "only the line that changed");
  assert.equal(edited.durations.get("y"), 700);
  assert.equal(edited.durations.get("x"), 500);

  await spokenDurations(script({ x: "Hello" }, "other"), cache, speak);
  assert.deepEqual(asked[2], ["Hello"], "another voice is another clip");
  await spokenDurations(script({ x: "Hello" }, "v", 0.9), cache, speak);
  assert.deepEqual(asked[3], ["Hello"], "and so is another speed");
});

test("two lines with the same words share a clip, and a clip that was cut short is spoken again", async () => {
  const cache = tmp();
  const { speak, asked } = fakeSpeaker();
  const result = await spokenDurations(script({ x: "Same", y: "Same", z: "Other" }), cache, speak);
  assert.deepEqual(asked, [["Same", "Other"]]);
  assert.deepEqual(
    [...result.durations],
    [
      ["x", 400],
      ["y", 400],
      ["z", 500],
    ],
  );
  const file = path.join(cache, `${clipKey("v", 1, "Other")}.wav`);
  const whole = await fs.readFile(file);
  await fs.writeFile(file, whole.subarray(0, 30));
  await spokenDurations(script({ x: "Same", z: "Other" }), cache, speak);
  assert.deepEqual(asked[1], ["Other"]);
});

// ---- Stills ----

test("stills are taken from the middle of each of N equal parts of every beat, in time order", () => {
  assert.deepEqual(
    pickTimes(film, { perBeat: 2, cues: false }).map((p) => p.t),
    [2, 6, 9.5, 12.5, 18, 26],
  );
  assert.deepEqual(
    pickTimes(film, { perBeat: 1, cues: false }).map((p) => [p.t, p.beat]),
    [
      [4, "a"],
      [11, "b"],
      [22, "c"],
    ],
  );
  assert.deepEqual(pickTimes(film, { perBeat: 0, cues: false }), []);
});

test("cues add their own times, and a cue on the same time as a share is one frame, labelled as the cue", () => {
  const picks = pickTimes(film, { perBeat: 2, cues: true });
  assert.deepEqual(
    picks.map((p) => p.t),
    [2, 2.5, 6, 9.5, 12.5, 18, 20, 26, 29],
  );
  assert.deepEqual(
    picks.filter((p) => p.kind === "cue").map((p) => [p.t, p.beat, p.label]),
    [
      [2.5, "a", "The card lands"],
      [20, "c", "Halfway"],
      [29, "c", "The end"],
    ],
  );
  const onTheSpot = pickTimes(film, { perBeat: 2, cues: true }).filter((p) => p.t === 18);
  assert.equal(onTheSpot.length, 1);
  const only = pickTimes(film, { perBeat: 0, cues: true });
  assert.deepEqual(
    only.map((p) => p.t),
    [2.5, 20, 29],
  );
  const aligned: MotionInfo = { ...film, beats: [{ ...film.beats[0], cues: [{ at: 2, label: "On a share" }] }] };
  const [first] = pickTimes(aligned, { perBeat: 2, cues: true });
  assert.deepEqual([first.t, first.kind], [2, "cue"]);
});

test("times given by hand are added, found a beat, and clamped to the film", () => {
  const picks = pickTimes(film, { perBeat: 0, cues: false, extra: [9, 99, -3] });
  assert.deepEqual(
    picks.map((p) => [p.t, p.beat, p.kind]),
    [
      [0, "a", "at"],
      [9, "b", "at"],
      [30, "c", "at"],
    ],
  );
});

const tiles = (count: number): Tile[] =>
  Array.from({ length: count }, (_, i) => ({
    t: i + 0.5,
    beat: i % 2 ? "b" : "a",
    kind: i === 2 ? "cue" : "beat",
    label: "Lands",
    file: `/stills/still-${i}.png`,
  }));

test("frames fill sheets of twelve, numbered, the last one with what is left", () => {
  const sheets = planSheets(tiles(26), "/out");
  assert.deepEqual(
    sheets.map((s) => [s.file, s.tiles.length]),
    [
      ["/out/sheet-01.png", 12],
      ["/out/sheet-02.png", 12],
      ["/out/sheet-03.png", 2],
    ],
  );
  assert.deepEqual(planSheets(tiles(12), "/out").length, 1);
  assert.deepEqual(planSheets(tiles(0), "/out"), []);
  assert.equal(sheets[1].tiles[0].t, 12.5, "frames stay in order across sheets");
});

test("each sheet is described by the times on it, row by row", () => {
  const [sheet] = planSheets(tiles(6), "/out");
  assert.equal(
    describeSheet(sheet, 4),
    [
      "sheet-01.png (6 frames, 4 across)",
      "  row 1: 0.50 a | 1.50 b | 2.50 a (cue: Lands) | 3.50 b",
      "  row 2: 4.50 a | 5.50 b",
    ].join("\n"),
  );
});

test("the tile layout puts each frame after the widths to its left and below the rows above", () => {
  assert.equal(xstackLayout(2, 4), "0_0|w0_0");
  const layout = xstackLayout(12, 4).split("|");
  assert.equal(layout[0], "0_0");
  assert.equal(layout[3], "w0+w1+w2_0");
  assert.equal(layout[4], "0_h0");
  assert.equal(layout[5], "w4_h0");
  assert.equal(layout[9], "w8_h0+h4");
  assert.equal(layout[11], "w8+w9+w10_h0+h4");
});

test("the sheet command writes a time on each frame and tiles them in one pass", () => {
  const files = tiles(12).map((t) => t.file);
  const labels = tiles(12).map(tileLabel);
  const args = sheetArgs({ files, labels, font: "/fonts/Mono.ttf", out: "/out/sheet-01.png", columns: 4, width: 640 });
  const graph = args[args.indexOf("-filter_complex") + 1];
  assert.equal(args.filter((arg) => arg === "-i").length, 12);
  assert.equal(graph.match(/drawtext=/g)?.length, 12);
  assert.ok(graph.includes("text='0.50s a'"));
  assert.ok(graph.includes("xstack=inputs=12:layout=0_0|w0_0|"));
  assert.equal(args[args.length - 1], "/out/sheet-01.png");
  const plain = sheetArgs({ files, out: "/out/s.png", columns: 4, width: 640 });
  assert.ok(!plain[plain.indexOf("-filter_complex") + 1].includes("drawtext"), "no font, no labels");
  const single = sheetArgs({ files: files.slice(0, 1), out: "/out/s.png", columns: 4, width: 640 });
  const one = single[single.indexOf("-filter_complex") + 1];
  assert.ok(one.endsWith("[t0]null[sheet]") && !one.includes("xstack"), "xstack needs two or more");
});

test("a tile's label keeps to characters ffmpeg's text drawing takes literally", () => {
  assert.equal(tileLabel({ t: 12.4, beat: "done-when", kind: "beat", label: "x" }), "12.40s done-when");
  assert.equal(tileLabel({ t: 1, beat: "it's: 100%", kind: "cue", label: "x" }), "1.00s its 100 cue");
});

// ---- The render queue ----

type Harness = { deps: LockDeps; logs: string[]; sleeps: number[]; advance: (ms: number) => void };

// Time that moves only when a waiter sleeps, a process table the test sets, and a
// hook that runs on each sleep.
const harness = (
  pid: number,
  alive: (pid: number) => boolean,
  onSleep: (count: number) => void = () => undefined,
): Harness => {
  let clock = Date.now();
  const logs: string[] = [];
  const sleeps: number[] = [];
  const deps: LockDeps = {
    pid,
    alive,
    now: () => new Date(clock),
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
      onSleep(sleeps.length);
    },
    log: (message) => logs.push(message),
    pollMs: 3000,
    graceMs: 2000,
  };
  return { deps, logs, sleeps, advance: (ms) => (clock += ms) };
};

const lockFile = (): string => path.join(tmp(), "output", ".render.lock");
const holderOf = (file: string): LockHolder => JSON.parse(fsSync.readFileSync(file, "utf8")) as LockHolder;
const exists = (file: string): boolean => fsSync.existsSync(file);

test("the lock file says who holds it, and is gone once they let go", async () => {
  const file = lockFile();
  const { deps } = harness(4001, () => true);
  const held = await acquireLock(file, { film: "alpha", command: "render" }, deps);
  const holder = holderOf(file);
  assert.equal(holder.pid, 4001);
  assert.equal(holder.film, "alpha");
  assert.equal(holder.command, "render");
  assert.ok(Number.isFinite(new Date(holder.startedAt).getTime()), "the start time is a date");
  held.release();
  assert.equal(exists(file), false);
  held.release();
  const again = await acquireLock(file, { film: "alpha", command: "preview" }, deps);
  assert.equal(holderOf(file).command, "preview");
  again.release();
});

test("a second render waits while the first lives, says so once, and goes when the first lets go", async () => {
  const file = lockFile();
  const first = await acquireLock(file, { film: "alpha", command: "render" }, harness(100, () => true).deps);
  const second = harness(
    200,
    () => true,
    (count) => {
      if (count === 3) first.release();
    },
  );
  const held = await acquireLock(file, { film: "beta", command: "preview" }, second.deps);
  assert.deepEqual(second.sleeps, [3000, 3000, 3000], "it looks again every three seconds");
  assert.equal(second.logs.length, 1, "and says it once");
  assert.equal(second.logs[0], waitingMessage(first.holder));
  assert.match(second.logs[0], /^waiting for alpha render started \d\d:\d\d \(pid 100\)$/);
  assert.equal(holderOf(file).pid, 200);
  held.release();
  assert.equal(exists(file), false);
});

test("a lock whose process is gone is taken over at once, not waited on", async () => {
  const file = lockFile();
  fsSync.mkdirSync(path.dirname(file), { recursive: true });
  const left: LockHolder = { pid: 999, film: "old", command: "render", startedAt: new Date().toISOString() };
  fsSync.writeFileSync(file, JSON.stringify(left));
  const run = harness(300, (pid) => pid !== 999);
  const held = await acquireLock(file, { film: "alpha", command: "render" }, run.deps);
  assert.deepEqual(run.sleeps, []);
  assert.deepEqual(run.logs, ["taking over the lock from old render (pid 999 is gone)"]);
  assert.equal(holderOf(file).pid, 300);
  held.release();
});

test("a holder that dies while others wait is taken over on the next look", async () => {
  const file = lockFile();
  fsSync.mkdirSync(path.dirname(file), { recursive: true });
  fsSync.writeFileSync(
    file,
    JSON.stringify({ pid: 555, film: "old", command: "preview", startedAt: new Date().toISOString() }),
  );
  let running = true;
  const run = harness(
    600,
    (pid) => pid === 555 && running,
    (count) => {
      if (count === 2) running = false;
    },
  );
  const held = await acquireLock(file, { film: "alpha", command: "render" }, run.deps);
  assert.deepEqual(run.sleeps, [3000, 3000]);
  assert.match(run.logs[0], /^waiting for old preview started \d\d:\d\d \(pid 555\)$/);
  assert.equal(run.logs[1], "taking over the lock from old preview (pid 555 is gone)");
  held.release();
});

test("a lock that names this very process is a leftover, not a holder to wait for", async () => {
  const file = lockFile();
  fsSync.mkdirSync(path.dirname(file), { recursive: true });
  fsSync.writeFileSync(
    file,
    JSON.stringify({ pid: 777, film: "ghost", command: "render", startedAt: new Date().toISOString() }),
  );
  const run = harness(777, () => true);
  const held = await acquireLock(file, { film: "alpha", command: "render" }, run.deps);
  assert.deepEqual(run.sleeps, []);
  assert.match(run.logs[0], /taking over the lock from ghost render/);
  held.release();
});

test("an unreadable lock is given a moment in case it is being written, then taken over", async () => {
  const file = lockFile();
  fsSync.mkdirSync(path.dirname(file), { recursive: true });
  fsSync.writeFileSync(file, "");
  const run = harness(800, () => true);
  const held = await acquireLock(file, { film: "alpha", command: "render" }, run.deps);
  assert.ok(run.sleeps.length > 1 && run.sleeps.every((ms) => ms === 100), "it looks again quickly, not every 3 s");
  assert.ok(run.sleeps.length * 100 <= 2200, "and gives up after about two seconds");
  assert.deepEqual(run.logs, ["taking over a lock file nobody can read"]);
  assert.equal(holderOf(file).pid, 800);
  held.release();
});

test("letting go only removes a lock that still names this process", async () => {
  const file = lockFile();
  const held = await acquireLock(file, { film: "alpha", command: "render" }, harness(100, () => true).deps);
  const other: LockHolder = { pid: 300, film: "beta", command: "render", startedAt: new Date().toISOString() };
  fsSync.writeFileSync(file, JSON.stringify(other));
  held.release();
  assert.deepEqual(holderOf(file), other);
});

const fakeHost = (): {
  host: SignalHost;
  exits: number[];
  emit: (event: string) => void;
  count: (event: string) => number;
} => {
  const handlers = new Map<string, Array<() => void>>();
  const exits: number[] = [];
  return {
    exits,
    emit: (event) => {
      for (const handler of [...(handlers.get(event) ?? [])]) handler();
    },
    count: (event) => handlers.get(event)?.length ?? 0,
    host: {
      on: (event, listener) => handlers.set(event, [...(handlers.get(event) ?? []), listener]),
      off: (event, listener) =>
        handlers.set(
          event,
          (handlers.get(event) ?? []).filter((candidate) => candidate !== listener),
        ),
      listeners: (event) => handlers.get(event) ?? [],
      exit: (code) => exits.push(code),
    },
  };
};

test("the lock is let go when the process is told to stop, and the process exits if nothing else will", () => {
  for (const [signal, code] of [
    ["SIGINT", 130],
    ["SIGTERM", 143],
    ["SIGHUP", 129],
  ] as const) {
    const { host, exits, emit } = fakeHost();
    let released = 0;
    releaseOnSignals(() => (released += 1), host);
    emit(signal);
    assert.equal(released, 1, `${signal} lets go`);
    assert.deepEqual(exits, [code], `and exits with ${code}`);
  }
});

test("a signal handler that someone else installed (Playwright's) is left to do the exiting", () => {
  const { host, exits, emit, count } = fakeHost();
  host.on("SIGINT", () => undefined);
  let released = 0;
  const stop = releaseOnSignals(() => (released += 1), host);
  emit("SIGINT");
  assert.equal(released, 1);
  assert.deepEqual(exits, [], "it does not cut the other handler short");
  assert.equal(count("SIGINT"), 2);
  stop();
  assert.equal(count("SIGINT"), 1, "its own handler is taken off again");
  assert.equal(count("exit"), 0);
});

test("a render runs with the lock held and lets go however it ends", async () => {
  const file = lockFile();
  const { host, count } = fakeHost();
  const run = harness(900, () => true);
  const value = await withRenderLock(
    file,
    { film: "alpha", command: "render" },
    async () => {
      assert.equal(holderOf(file).pid, 900, "held while it runs");
      assert.equal(count("SIGINT"), 1);
      return 42;
    },
    run.deps,
    host,
  );
  assert.equal(value, 42);
  assert.equal(exists(file), false);
  assert.equal(count("SIGINT"), 0, "signal handlers come off");

  await assert.rejects(
    withRenderLock(
      file,
      { film: "alpha", command: "preview" },
      async () => {
        throw new Error("the render broke");
      },
      run.deps,
      host,
    ),
    /the render broke/,
  );
  assert.equal(exists(file), false, "released after a failure too");
});

test("a signal while a render holds the lock removes the file", async () => {
  const file = lockFile();
  const { host, emit, exits } = fakeHost();
  await withRenderLock(
    file,
    { film: "alpha", command: "render" },
    async () => {
      assert.equal(exists(file), true);
      emit("SIGTERM");
      assert.equal(exists(file), false);
    },
    harness(901, () => true).deps,
    host,
  );
  assert.deepEqual(exits, [143]);
});

test("the wait message shows the start as hours and minutes", () => {
  const started = new Date(2026, 9, 5, 14, 7, 30);
  assert.equal(clockTime(started.toISOString()), "14:07");
  assert.equal(clockTime(new Date(2026, 9, 5, 9, 5).toISOString()), "09:05");
  assert.equal(clockTime("garbage"), "?");
  assert.equal(
    waitingMessage({ pid: 12345, film: "roam-0230-launch", command: "render", startedAt: started.toISOString() }),
    "waiting for roam-0230-launch render started 14:07 (pid 12345)",
  );
});

// ---- Pinned lines ----

const pinned = (id: string, beat: string, at: number, text = `Words of ${id}.`): NarrationLine => ({
  ...line(id, beat, at, text),
  pin: true,
});

test("a pinned line keeps the at it was given, and the line after it starts a gap after it ends", () => {
  const [a] = fitNarration(
    [line("u1", "a", 9), pinned("p1", "a", 4), line("u2", "a", 9)],
    film,
    clips({ u1: 2, p1: 1, u2: 1 }),
  );
  assert.deepEqual(
    a.lines.map((l) => [l.id, l.at, l.pinned]),
    [
      ["u1", 0.5, false],
      ["p1", 4, true],
      ["u2", 5.35, false],
    ],
  );
  near(a.lines[1].end, 5);
  near(a.needed, 6.95, "u2 ends at 6.35, plus 0.6");
  assert.deepEqual(a.warnings, []);
});

test("a pinned first line stands in for the lead, and a pinned time is kept exactly as written", () => {
  const [a] = fitNarration([pinned("p0", "a", 1.234), line("u1", "a", 9)], film, clips({ p0: 1, u1: 1 }));
  assert.equal(a.lines[0].at, 1.234, "not rounded");
  assert.equal(a.lines[1].at, 2.59, "2.234 + the 0.35 gap = 2.584, up to a hundredth");
});

test("what a beat needs comes from the line that ends last, which a pin can make not the last in the script", () => {
  const [a] = fitNarration([line("u1", "a", 0), pinned("p1", "a", 1)], film, clips({ u1: 3, p1: 1 }));
  near(a.needed, 4.1, "u1 runs 0.5 to 3.5, and p1 ends at 2");
});

test("an unpinned line that leaves less than a gap before the next pinned one is warned about, naming both", () => {
  const warnings = (pinAt: number): string[] =>
    fitNarration([line("u1", "a", 0), pinned("p1", "a", pinAt)], film, clips({ u1: 2, p1: 1 }))[0].warnings;
  assert.deepEqual(warnings(2.85), [], "exactly a gap is enough");
  assert.deepEqual(warnings(4), []);
  const tight = warnings(2.7);
  assert.equal(tight.length, 1);
  assert.match(tight[0], /"u1" ends 0\.20 s before pinned "p1" starts, less than the 0\.35 s gap/);
  assert.match(warnings(2)[0], /"u1" ends 0\.50 s after pinned "p1" starts/);
});

test("a pinned line after a pinned one, or an unpinned one after a pinned one, is nobody's to warn about", () => {
  const warnings = (lines: NarrationLine[]): string[] => fitNarration(lines, film, clips({ x: 2, y: 2 }))[0].warnings;
  assert.deepEqual(warnings([pinned("x", "a", 1), pinned("y", "a", 2)]), []);
  assert.deepEqual(warnings([pinned("x", "a", 1), line("y", "a", 0)]), []);
});

test("the table marks pinned lines and puts each warning under its beat, and the recap counts them", () => {
  const fits = fitNarration([line("u1", "a", 0), pinned("p1", "a", 2.7)], film, clips({ u1: 2, p1: 1 }));
  const table = fitTable(fits);
  assert.match(table, /p1 +2\.70 → +3\.70 +1\.00 s +pinned +Words of p1\./);
  assert.match(table, /^ {2}! "u1" ends 0\.20 s before pinned "p1" starts/m);
  assert.match(fitRecap(fits), /1 line\(s\) run into a pinned line after them/);
  const plain = fitNarration([line("u1", "a", 0)], film, clips({ u1: 1 }));
  assert.ok(!/pinned|!/.test(fitTable(plain) + fitRecap(plain)), "nothing is marked without pins");
});

test("write never changes a pinned line's at, whatever else moves", () => {
  const source = `{
  "voice": "v",
  "speed": 1,
  "lines": [
    { "id": "u1", "beat": "a", "at": 0.1, "text": "Words of u1." },
    { "id": "p1", "beat": "a", "at": 4.40, "pin": true, "text": "Words of p1." },
    { "id": "u2", "beat": "a", "at": 9, "text": "Words of u2." }
  ]
}
`;
  const narration = JSON.parse(source) as Narration;
  const fits = fitNarration(narration.lines, film, clips({ u1: 2, p1: 1, u2: 1 }));
  const ats = writableAts(fits);
  assert.deepEqual([...ats.keys()], ["u1", "u2"], "the pinned line is not offered for writing");
  const { text, changed } = rewriteAts(source, ats);
  assert.equal(changed, 2);
  assert.ok(text.includes('"at": 4.40, "pin": true'), "the pinned line is byte for byte as it was");
  assert.deepEqual(
    (JSON.parse(text) as Narration).lines.map((l) => [l.id, l.at, l.pin]),
    [
      ["u1", 0.5, undefined],
      ["p1", 4.4, true],
      ["u2", 5.75, undefined],
    ],
  );
});

test("a pin has to be true or false, and a pinned line needs an at to keep", () => {
  const bad = { ...line("x", "a", 1), pin: "yes" as unknown as boolean };
  assert.throws(() => fitNarration([bad], film, clips({ x: 1 })), /"pin": "yes", which should be true or false/);
  assert.throws(
    () => fitNarration([{ ...line("x", "a", Number.NaN), pin: true }], film, clips({ x: 1 })),
    /is pinned, so it needs an "at"/,
  );
  assert.doesNotThrow(() => fitNarration([{ ...line("x", "a", 1), pin: false }], film, clips({ x: 1 })));
});

// ---- Clips from the cache, for the mix too ----

test("clips come back by line id from the cache folder, named for what they say, so the mix can use them", async () => {
  const cache = tmp();
  const { speak, asked } = fakeSpeaker();
  const texts = { x: "Hello", y: "Hello", z: "Other" };
  const first = await spokenDurations(script(texts), cache, speak);
  assert.deepEqual([...first.clips.keys()], ["x", "y", "z"]);
  assert.equal(first.clips.get("x")?.path, path.join(cache, `${clipKey("v", 1, "Hello")}.wav`));
  assert.equal(first.clips.get("x")?.path, first.clips.get("y")?.path, "the same words are the same clip");
  assert.equal(first.clips.get("z")?.durationMs, 500);
  assert.ok(fsSync.existsSync(first.clips.get("z")?.path ?? ""), "and the file is there to mix");
  const again = await spokenDurations(script(texts), cache, speak);
  assert.equal(asked.length, 1, "nothing spoken the second time");
  assert.deepEqual([...again.clips], [...first.clips]);
  assert.equal(clipCacheDir("/out/film"), "/out/film/voice/fit-cache");
});

// ---- The command line ----

test("a switch never takes the word after it, so it can come before the film's name", () => {
  const checked = parseArgs(["voiceover", "--check", "proof-kits-launch"]);
  assert.deepEqual(checked.positional, ["voiceover", "proof-kits-launch"]);
  assert.equal(checked.flags.get("check"), true);
  for (const name of [
    "check",
    "force",
    "headless",
    "sheet",
    "cues",
    "write",
    "fit",
    "no-sound",
    "no-room",
    "no-1080",
  ]) {
    const parsed = parseArgs(["still", `--${name}`, "film"]);
    assert.deepEqual(parsed.positional, ["still", "film"], `--${name} leaves the film alone`);
    assert.equal(parsed.flags.get(name), true);
  }
});

test("a flag with a value takes the word after it, a negative number too, unless that word is a flag", () => {
  const parsed = parseArgs([
    "voiceover",
    "film",
    "--voice",
    "am_michael",
    "--room",
    "-52",
    "--fit",
    "--gap",
    "0.5",
    "--write",
    "--to",
    "/tmp/out.mp4",
  ]);
  assert.deepEqual(parsed.positional, ["voiceover", "film"]);
  assert.equal(parsed.flags.get("voice"), "am_michael");
  assert.equal(parsed.flags.get("room"), "-52");
  assert.equal(parsed.flags.get("gap"), "0.5");
  assert.equal(parsed.flags.get("to"), "/tmp/out.mp4");
  assert.equal(parsed.flags.get("fit"), true);
  assert.equal(parsed.flags.get("write"), true);
  assert.equal(parseArgs(["still", "film", "--beats", "--cues", "--sheet"]).flags.get("beats"), true);
  assert.equal(parseArgs(["still", "film", "--beats", "3", "--cues"]).flags.get("beats"), "3");
  assert.equal(parseArgs(["render", "film", "--only"]).flags.get("only"), true, "a value flag with no word after it");
});
