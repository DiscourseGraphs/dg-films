import assert from "node:assert/strict";
import test from "node:test";
import { beatSheetMarkdown, chapterMetadata, chaptersOf, stamp, wordBudget } from "../engine/beats";
import { formatLint, lintCamera } from "../engine/lint";
import { ffmpegArgs, planFrames } from "../engine/render";
import type { MotionInfo } from "../engine/types";
import { fitProblems, placeLines, startOf, timingTable, type NarrationLine } from "../engine/voiceover";

const info: MotionInfo = {
  title: "A film",
  width: 1280,
  height: 720,
  fps: 60,
  duration: 20,
  beats: [
    {
      id: "a",
      title: "First",
      at: 0,
      end: 8,
      shows: "A card appears.",
      talk: ["Say hello."],
      cues: [{ at: 2.5, label: "The card lands" }],
    },
    { id: "b", title: "Second; with = odd # chars", at: 8, end: 20, shows: "It moves.", talk: [], cues: [] },
  ],
};

test("stamp prints minutes, seconds and tenths, carrying a rounded-up tenth", () => {
  assert.equal(stamp(0), "0:00.0");
  assert.equal(stamp(7.25), "0:07.3");
  assert.equal(stamp(59.96), "1:00.0");
  assert.equal(stamp(125.04), "2:05.0");
});

test("the word budget leaves a breath, rounds down to five and never goes negative", () => {
  assert.equal(wordBudget({ at: 0, end: 8 }), 15);
  assert.equal(wordBudget({ at: 0, end: 12 }), 25);
  assert.equal(wordBudget({ at: 0, end: 0.5 }), 0);
});

test("beats become chapters in milliseconds, and the metadata escapes what ffmpeg reserves", () => {
  assert.deepEqual(chaptersOf(info), [
    { index: 1, name: "First", startMs: 0, endMs: 8000 },
    { index: 2, name: "Second; with = odd # chars", startMs: 8000, endMs: 20000 },
  ]);
  const metadata = chapterMetadata(info);
  assert.ok(metadata.startsWith(";FFMETADATA1"));
  assert.ok(metadata.includes("title=Second\\; with \\= odd \\# chars"));
});

test("the beat sheet has a timing table, what's on screen, talking points and cues", () => {
  const sheet = beatSheetMarkdown(info);
  assert.ok(sheet.includes("| 1 | First | 0:00.0 | 0:08.0 | 8.0 s | ~15 |"));
  assert.ok(sheet.includes("## 1. First"));
  assert.ok(sheet.includes("On screen: A card appears."));
  assert.ok(sheet.includes("- Say hello."));
  assert.ok(sheet.includes("- 0:02.5 The card lands"));
  assert.ok(!sheet.includes("You can talk about:\n\n## 2"), "a beat with no talking points has no empty list");
});

// A camera that holds, glides across a frame width and holds again.
const sampled = (moves: Array<[number, number]>, speed: (t: number) => number): Parameters<typeof lintCamera>[0] => {
  const samples: Array<[number, number, number, number]> = [];
  let x = 0;
  for (let t = 0; t <= 10; t += 1 / 60) {
    x += speed(t) / 60;
    samples.push([t, x, 0, 1]);
  }
  return { samples, moves, width: 1280, height: 720 };
};

test("a gentle move passes the camera lint", () => {
  const report = lintCamera(sampled([[2, 5]], (t) => (t >= 2 && t <= 5 ? 300 : 0)));
  assert.equal(report.length, 1);
  assert.deepEqual(report[0].warnings, []);
  assert.ok(report[0].peak > 0.2 && report[0].peak < 0.3);
});

test("the lint flags a move too fast to follow, an overlap, and a speed that jumps", () => {
  const fast = lintCamera(sampled([[2, 3]], (t) => (t >= 2 && t <= 3 ? 3000 : 0)));
  assert.ok(fast[0].warnings.some((warning) => /too fast/.test(warning)));
  assert.ok(fast[0].warnings.some((warning) => /jumps/.test(warning)));
  const overlap = lintCamera(
    sampled(
      [
        [1, 4],
        [3, 6],
      ],
      () => 0,
    ),
  );
  assert.ok(overlap[1].warnings.some((warning) => /starts 1\.00 s before/.test(warning)));
  assert.ok(formatLint(overlap).includes("1 of 2 moves have warnings."));
});

test("the lint flags a move that starts just after the last one ends, and not one after a real pause", () => {
  const stutter = lintCamera(
    sampled(
      [
        [1, 3],
        [3.1, 5],
        [6, 7],
      ],
      () => 0,
    ),
  );
  assert.deepEqual(stutter[0].warnings, []);
  assert.ok(stutter[1].warnings.some((warning) => /starts 0\.10 s after the move at 0:01\.0 ends.*camera\.path/.test(warning)));
  assert.deepEqual(stutter[2].warnings, [], "a second of rest is a pause, not a stutter");
});

test("frames are planned from the film's own rate unless told otherwise, and clamped to its length", () => {
  assert.deepEqual(planFrames(info, {}), { frames: 1200, first: 0, fps: 60 });
  assert.deepEqual(planFrames(info, { fps: 30 }), { frames: 600, first: 0, fps: 30 });
  assert.deepEqual(planFrames(info, { from: 5, to: 7 }), { frames: 120, first: 300, fps: 60 });
  assert.deepEqual(planFrames(info, { from: 18, to: 99 }), { frames: 120, first: 1080, fps: 60 });
  assert.throws(() => planFrames(info, { from: 30 }), /Nothing to render/);
});

test("ffmpeg gets one decode, a scaler per output, BT.709 conversion and the film's rate", () => {
  const single = ffmpegArgs({
    fps: 60,
    outputs: [{ path: "a.mp4", width: 3840, height: 2160, crf: 15, preset: "medium" }],
  });
  assert.ok(single.includes("pipe:0"));
  const graph = single[single.indexOf("-filter_complex") + 1];
  assert.ok(graph.startsWith("[0:v]null[s0];"));
  assert.ok(graph.includes("out_color_matrix=bt709:out_range=tv"));
  assert.ok(graph.includes("scale=3840:2160"));
  const double = ffmpegArgs({
    fps: 30,
    outputs: [
      { path: "a.mp4", width: 3840, height: 2160, crf: 15, preset: "medium" },
      { path: "b.mp4", width: 1920, height: 1080, crf: 17, preset: "medium" },
    ],
  });
  const split = double[double.indexOf("-filter_complex") + 1];
  assert.ok(split.startsWith("[0:v]split=2[s0][s1];"));
  assert.ok(split.includes("scale=1920:1080"));
  assert.equal(double.filter((arg) => arg === "-map").length, 2);
  assert.equal(double[double.indexOf("-framerate") + 1], "30");
  assert.ok(double.includes("a.mp4") && double.includes("b.mp4"));
  for (const flag of ["-colorspace", "-color_primaries", "-color_trc"])
    assert.equal(double[double.indexOf(flag) + 1], "bt709");
});

const line = (id: string, beat: string, at: number, text = id): NarrationLine => ({ id, beat, at, text });
const clips = (seconds: Record<string, number>): Map<string, number> =>
  new Map(Object.entries(seconds).map(([id, s]) => [id, s * 1000]));

test("a narration line starts at its beat's start plus its offset, so retiming a beat moves its words", () => {
  assert.equal(startOf(line("x", "b", 1.5), info), 9.5);
  assert.throws(() => startOf(line("x", "nope", 0), info), /beat "nope".*a, b/);
  const moved: MotionInfo = {
    ...info,
    beats: info.beats.map((beat) => (beat.id === "b" ? { ...beat, at: 10, end: 20 } : beat)),
  };
  assert.equal(startOf(line("x", "b", 1.5), moved), 11.5);
});

test("lines are placed in time order with their ends from the clip lengths", () => {
  const placed = placeLines([line("late", "b", 2), line("early", "a", 1)], info, clips({ early: 2, late: 3 }));
  assert.deepEqual(
    placed.map((p) => [p.id, p.start, p.end]),
    [
      ["early", 1, 3],
      ["late", 10, 13],
    ],
  );
  assert.throws(() => placeLines([line("x", "a", 0)], info, clips({})), /No clip/);
  assert.ok(timingTable(placed).includes("early"));
});

test("the fit check flags a line running into the next, off the film, or well past its beat", () => {
  const ok = placeLines(
    [line("a1", "a", 1), line("a2", "a", 4), line("b1", "b", 1)],
    info,
    clips({ a1: 2, a2: 3, b1: 4 }),
  );
  assert.deepEqual(fitProblems(ok, info), []);
  const clash = placeLines([line("a1", "a", 1), line("a2", "a", 3)], info, clips({ a1: 2.5, a2: 1 }));
  assert.match(fitProblems(clash, info)[0], /"a1" ends at 0:03\.5, 0\.75 s too late for "a2"/);
  const off = placeLines([line("b1", "b", 11)], info, clips({ b1: 9.5 }));
  assert.ok(fitProblems(off, info).some((problem) => /off the end of the film/.test(problem)));
  const spill = placeLines([line("a1", "a", 6)], info, clips({ a1: 3 }));
  assert.ok(fitProblems(spill, info).some((problem) => /after its beat does/.test(problem)));
});
