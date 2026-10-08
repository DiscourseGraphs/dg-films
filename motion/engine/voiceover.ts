// Voiceover for a film: a script of lines, each placed a few seconds into a beat,
// spoken by Kokoro (the TTS the PR videos use, through recorder/narrate.py),
// cleaned with the same chain as the recorders, mixed onto one track and muxed
// into the video. A line is placed by its beat, so retiming a beat moves its
// words with it.

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { stamp } from "./beats";
import { renderSoundtrack, soundStats, wavOf, type SoundStats, type SoundtrackOptions } from "./soundtrack";
import type { MotionInfo } from "./types";

// A line with `pin: true` keeps its `at` when `voiceover --fit` places the others.
export type NarrationLine = { id: string; beat: string; at: number; text: string; pin?: boolean };
export type Narration = { voice: string; speed: number; lines: NarrationLine[] };

export type Placed = NarrationLine & { start: number; end: number; durationMs: number };

const TTS_PYTHON = path.resolve(__dirname, "../../tts/.venv/bin/python");
const NARRATE = path.resolve(__dirname, "../../recorder/narrate.py");

// Where each line starts in the film, from its beat.
export const startOf = (line: NarrationLine, info: MotionInfo): number => {
  const beat = info.beats.find((candidate) => candidate.id === line.beat);
  if (!beat)
    throw new Error(
      `Line "${line.id}" names beat "${line.beat}", which the film doesn't have: ${info.beats.map((b) => b.id).join(", ")}`,
    );
  return beat.at + line.at;
};

export const placeLines = (lines: NarrationLine[], info: MotionInfo, durations: Map<string, number>): Placed[] =>
  lines
    .map((line) => {
      const durationMs = durations.get(line.id);
      if (durationMs === undefined) throw new Error(`No clip for line "${line.id}"`);
      const start = startOf(line, info);
      return { ...line, start, end: start + durationMs / 1000, durationMs };
    })
    .sort((a, b) => a.start - b.start);

// What would make the narration read badly: a line running into the next one or
// off the end of the film, and a line that spills past its own beat's end by more
// than a breath.
export const fitProblems = (placed: Placed[], info: MotionInfo, gap = 0.25, spill = 0.6): string[] => {
  const problems: string[] = [];
  placed.forEach((line, index) => {
    const next = placed[index + 1];
    if (next && line.end > next.start - gap) {
      problems.push(
        `"${line.id}" ends at ${stamp(line.end)}, ${(line.end - next.start + gap).toFixed(2)} s too late for "${next.id}" at ${stamp(next.start)}`,
      );
    }
    if (line.end > info.duration - 0.2) problems.push(`"${line.id}" runs off the end of the film (${stamp(line.end)})`);
    const beat = info.beats.find((candidate) => candidate.id === line.beat);
    if (beat && line.end > beat.end + spill)
      problems.push(`"${line.id}" ends ${(line.end - beat.end).toFixed(1)} s after its beat does`);
  });
  return problems;
};

export const timingTable = (placed: Placed[]): string =>
  placed
    .map(
      (line) =>
        `${stamp(line.start).padStart(7)} → ${stamp(line.end).padStart(7)}  ${(line.durationMs / 1000).toFixed(1).padStart(4)} s  ${line.text}`,
    )
    .join("\n");

const run = (command: string, args: string[], input?: string): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} exited ${code}: ${stderr.slice(-700)}`)),
    );
    if (input !== undefined) child.stdin?.end(input);
  });

// Speak every line with Kokoro; returns each clip's path and length.
export const synthesize = async (
  narration: Narration,
  outDir: string,
): Promise<Map<string, { path: string; durationMs: number }>> => {
  await fs.mkdir(outDir, { recursive: true });
  const request = JSON.stringify({
    voice: narration.voice,
    speed: narration.speed,
    outDir,
    lines: narration.lines.map(({ id, text }) => ({ id, text })),
  });
  const { stdout } = await run(TTS_PYTHON, [NARRATE], request);
  const clips = JSON.parse(stdout.slice(stdout.indexOf("["))) as Array<{
    id: string;
    path: string;
    durationMs: number;
  }>;
  return new Map(clips.map((clip) => [clip.id, { path: clip.path, durationMs: clip.durationMs }]));
};

// The recorders' chain: delay each clip to its start, mix, drop rumble, denoise
// (Kokoro carries a hush under its words), gate the pauses to silence, then
// normalize loudness. Loudnorm only holds a static gain when it is handed
// measured values, so it runs twice: measure, then apply. A dynamic normalizer
// would lift the hush between words.
const delays = (placed: Placed[]): string =>
  placed.map((line, i) => `[${i}:a]adelay=${Math.round(line.start * 1000)}:all=1[d${i}]`).join(";");

const mixGraph = (placed: Placed[], tail: string): string =>
  `${delays(placed)};${placed.map((_, i) => `[d${i}]`).join("")}amix=inputs=${placed.length}:normalize=0,` +
  `highpass=f=80,anlmdn=s=7:p=0.002:r=0.006,agate=threshold=0.01:ratio=8:attack=5:release=140${tail}`;

export const loudnessTarget = { I: -16, TP: -1.5, LRA: 11 };

export type Measured = {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
};

export const buildTrack = async (
  placed: Placed[],
  clips: Map<string, { path: string }>,
  duration: number,
  out: string,
): Promise<Measured> => {
  const inputs = placed.flatMap((line) => ["-i", clips.get(line.id)?.path ?? ""]);
  const target = `loudnorm=I=${loudnessTarget.I}:TP=${loudnessTarget.TP}:LRA=${loudnessTarget.LRA}`;
  const measure = await run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-y",
    ...inputs,
    "-filter_complex",
    mixGraph(placed, `,${target}:print_format=json[a]`),
    "-map",
    "[a]",
    "-f",
    "null",
    "-",
  ]);
  const json = measure.stderr.slice(measure.stderr.lastIndexOf("{"), measure.stderr.lastIndexOf("}") + 1);
  const measured = JSON.parse(json) as Measured;
  const apply =
    `,${target}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true,` +
    `aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${duration.toFixed(3)}[a]`;
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...inputs,
    "-filter_complex",
    mixGraph(placed, apply),
    "-map",
    "[a]",
    "-t",
    duration.toFixed(3),
    out,
  ]);
  return measured;
};

// The film's soundtrack (its sound cues over room tone) as a WAV, and what is in it.
export const writeSoundtrack = async (
  info: MotionInfo,
  out: string,
  options: SoundtrackOptions = {},
): Promise<SoundStats> => {
  const cues = info.sounds ?? [];
  const track = renderSoundtrack(cues, info.duration, options);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, wavOf(track));
  return soundStats(track, cues);
};

// The voice and the soundtrack on one track. The voice is already at its
// loudness; the soundtrack was made to sit under it, so this only adds them and
// catches any peak where a sound lands on a loud syllable.
export const mixdown = async (voice: string, soundtrack: string, duration: number, out: string): Promise<void> => {
  const stereo = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo";
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    voice,
    "-i",
    soundtrack,
    "-filter_complex",
    `[0:a]${stereo}[v];[1:a]${stereo}[s];[v][s]amix=inputs=2:normalize=0:duration=longest,` +
      `alimiter=limit=${dbToLinear(loudnessTarget.TP).toFixed(4)}:level=false:attack=3:release=60,atrim=0:${duration.toFixed(3)}[a]`,
    "-map",
    "[a]",
    out,
  ]);
};

const dbToLinear = (db: number): number => 10 ** (db / 20);

// What a render has to match for its narration to be laid over it: the length,
// and where each beat starts. Anything else about the film can change without
// redoing the render.
export const staleProblems = (fresh: MotionInfo, rendered: MotionInfo, tolerance = 0.05): string[] => {
  const problems: string[] = [];
  if (Math.abs(fresh.duration - rendered.duration) > tolerance)
    problems.push(`the film is ${fresh.duration.toFixed(2)} s now, the render is ${rendered.duration.toFixed(2)} s`);
  for (const beat of fresh.beats) {
    const old = rendered.beats.find((candidate) => candidate.id === beat.id);
    if (!old) problems.push(`beat "${beat.id}" is not in the render`);
    else if (Math.abs(old.at - beat.at) > tolerance)
      problems.push(`beat "${beat.id}" starts at ${stamp(beat.at)} now, ${stamp(old.at)} in the render`);
  }
  return problems;
};

export const mux = async (video: string, audio: string, out: string): Promise<void> => {
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    video,
    "-i",
    audio,
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-map_chapters",
    "0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    out,
  ]);
};

export type Loudness = { integrated: number; peak: number; range: number };

// Loudness of a finished file, as ffmpeg's EBU R128 meter reports it.
export const measureLoudness = async (file: string): Promise<Loudness> => {
  const { stderr } = await run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    file,
    "-map",
    "0:a",
    "-af",
    "ebur128=peak=true",
    "-f",
    "null",
    "-",
  ]);
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const pick = (label: RegExp): number => Number(label.exec(summary)?.[1] ?? Number.NaN);
  return {
    integrated: pick(/I:\s+(-?[\d.]+) LUFS/),
    range: pick(/LRA:\s+(-?[\d.]+) LU/),
    peak: pick(/Peak:\s+(-?[\d.]+) dBFS/),
  };
};
