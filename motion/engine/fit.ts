// Retiming narration by hand is a loop of guesses: speak the lines, read when
// each one ends, nudge an `at`, speak again. `voiceover --fit` does the
// arithmetic. In every beat the lines go in script order, the first a short lead
// after the beat starts and each next one a gap after the last ended, and a
// table says how long each beat has to be to hold what is said in it. Clips are
// kept by what they say, so only a line whose words changed is spoken again.

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { stamp } from "./beats";
import { probeFilm } from "./render";
import type { MotionInfo } from "./types";
import { startOf, synthesize, type Narration, type NarrationLine } from "./voiceover";

export type FitOptions = {
  // Seconds from a beat's start to its first line.
  lead: number;
  // Seconds of quiet between one line's end and the next line's start.
  gap: number;
  // Seconds a beat needs after its last line ends, to let the picture settle.
  tail: number;
};

export const FIT_DEFAULTS: FitOptions = { lead: 0.5, gap: 0.35, tail: 0.6 };

export type FitLine = {
  id: string;
  text: string;
  // Seconds after the beat starts: where the line goes now, and its end.
  at: number;
  end: number;
  durationMs: number;
  // The `at` it has in narration.json.
  was: number;
  // Pinned lines keep it: `at` is `was`.
  pinned: boolean;
};

export type BeatFit = {
  id: string;
  title: string;
  start: number;
  length: number;
  lines: FitLine[];
  // The shortest the beat can be and still hold its last line plus the tail.
  needed: number;
  // length - needed: how much room the beat has, negative when it is too short.
  spare: number;
  // Lines that run into the pinned line after them.
  warnings: string[];
};

// Round up to a hundredth, so a gap that was asked for is never a hair short.
const ceilHundredths = (value: number): number => Math.ceil(value * 100 - 1e-6) / 100;

const seconds = (value: number): string => value.toFixed(2);

// Every line has to name a beat the film has, and its own id: the id is how a
// line is found again in narration.json.
export const checkLines = (lines: readonly NarrationLine[], info: MotionInfo): void => {
  const ids = new Set<string>();
  for (const line of lines) {
    if (ids.has(line.id)) throw new Error(`Two narration lines are called "${line.id}"`);
    ids.add(line.id);
    startOf(line, info);
    if (line.pin !== undefined && typeof line.pin !== "boolean")
      throw new Error(`Line "${line.id}" has "pin": ${JSON.stringify(line.pin)}, which should be true or false`);
    if (line.pin === true && !Number.isFinite(line.at))
      throw new Error(`Line "${line.id}" is pinned, so it needs an "at" to keep`);
  }
};

// An unpinned line has to leave `gap` clear before the pinned line that follows it.
const pinWarnings = (lines: readonly FitLine[], gap: number): string[] =>
  lines.flatMap((line, i) => {
    const next = lines[i + 1];
    if (line.pinned || !next?.pinned) return [];
    const clear = next.at - line.end;
    if (clear >= gap - 0.005) return [];
    return [
      clear >= 0
        ? `"${line.id}" ends ${seconds(clear)} s before pinned "${next.id}" starts, less than the ${seconds(gap)} s gap`
        : `"${line.id}" ends ${seconds(-clear)} s after pinned "${next.id}" starts`,
    ];
  });

export const fitNarration = (
  lines: readonly NarrationLine[],
  info: MotionInfo,
  durationsMs: ReadonlyMap<string, number>,
  options: FitOptions = FIT_DEFAULTS,
): BeatFit[] => {
  if (!(options.lead >= 0)) throw new Error("The lead needs a number of seconds, 0 or more");
  if (!(options.gap >= 0)) throw new Error("The gap needs a number of seconds, 0 or more");
  checkLines(lines, info);
  return info.beats
    .map((beat): BeatFit | null => {
      const own = lines.filter((line) => line.beat === beat.id);
      if (!own.length) return null;
      // Where a line that isn't pinned starts: the lead for the first, then a gap
      // after whatever came before it, pinned or not.
      let cursor = options.lead;
      const placed = own.map((line): FitLine => {
        const durationMs = durationsMs.get(line.id);
        if (durationMs === undefined) throw new Error(`No clip for line "${line.id}"`);
        const pinned = line.pin === true;
        const at = pinned ? line.at : ceilHundredths(cursor);
        const end = at + durationMs / 1000;
        cursor = end + options.gap;
        return { id: line.id, text: line.text, at, end, durationMs, was: line.at, pinned };
      });
      const needed = ceilHundredths(Math.max(...placed.map((line) => line.end)) + options.tail);
      const length = beat.end - beat.at;
      return {
        id: beat.id,
        title: beat.title,
        start: beat.at,
        length,
        lines: placed,
        needed,
        spare: length - needed,
        warnings: pinWarnings(placed, options.gap),
      };
    })
    .filter((fit): fit is BeatFit => fit !== null);
};

// Signed, to a hundredth; a difference too small to show is zero.
const signed = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? "0.00" : `${rounded > 0 ? "+" : "-"}${seconds(Math.abs(rounded))}`;
};

export const tooShort = (fit: BeatFit): boolean => Math.round(fit.spare * 100) < 0;

export const fitTable = (fits: readonly BeatFit[]): string => {
  const idWidth = Math.max(0, ...fits.flatMap((fit) => fit.lines.map((line) => line.id.length)));
  return fits
    .map((fit) => {
      const rows = fit.lines.map((line) => {
        const note = line.pinned ? "pinned" : Math.abs(line.was - line.at) >= 0.005 ? `was ${seconds(line.was)}` : "";
        return (
          `  ${line.id.padEnd(idWidth)} ${seconds(line.at).padStart(6)} → ${seconds(line.end).padStart(6)}` +
          `  ${seconds(line.durationMs / 1000).padStart(5)} s  ${note.padEnd(9)}  ${line.text}`
        );
      });
      return [
        `${fit.id}  ${stamp(fit.start)} → ${stamp(fit.start + fit.length)}`,
        ...rows,
        ...fit.warnings.map((warning) => `  ! ${warning}`),
        `  needs at least ${seconds(fit.needed)} s, beat is ${seconds(fit.length)} s, difference ${signed(fit.spare)} s${tooShort(fit) ? "  TOO SHORT" : ""}`,
      ].join("\n");
    })
    .join("\n\n");
};

export const fitRecap = (fits: readonly BeatFit[]): string => {
  const short = fits.filter(tooShort);
  const warned = fits.reduce((sum, fit) => sum + fit.warnings.length, 0);
  const lengths = short.length
    ? `Too short, ${short.length} of ${fits.length}: ${short
        .map((fit) => `${fit.id} needs ${seconds(fit.needed)} s and has ${seconds(fit.length)} s`)
        .join("; ")}.`
    : `Every beat with narration is long enough for it (${fits.length}).`;
  return warned
    ? `${lengths}\n${warned} line(s) run into a pinned line after them; see the lines marked ! above.`
    : lengths;
};

// The `at` values `--write` may change: never a pinned line's.
export const writableAts = (fits: readonly BeatFit[]): Map<string, number> =>
  new Map(
    fits.flatMap((fit) => fit.lines.filter((line) => !line.pinned).map((line): [string, number] => [line.id, line.at])),
  );

// ---- Writing the new `at` values back ----

type Node =
  | { kind: "object"; entries: Array<[key: string, value: Node]> }
  | { kind: "array"; items: Node[] }
  | { kind: "string"; value: string }
  | { kind: "number"; value: number; start: number; end: number }
  | { kind: "other" };

// JSON read with the position of every number, so a value can be replaced in
// place and the rest of the file, its line breaks and blank lines included, left
// exactly as it was written.
const readNodes = (source: string): Node => {
  let i = 0;
  const skip = (): void => {
    while (i < source.length && " \t\r\n".includes(source[i])) i += 1;
  };
  const fail = (what: string): never => {
    throw new Error(`Can't read narration.json: ${what} at character ${i}`);
  };
  const string = (): string => {
    const start = i;
    i += 1;
    while (i < source.length && source[i] !== '"') i += source[i] === "\\" ? 2 : 1;
    if (i >= source.length) fail("a string never ends");
    i += 1;
    return JSON.parse(source.slice(start, i)) as string;
  };
  const list = <T>(close: string, item: () => T): T[] => {
    const items: T[] = [];
    skip();
    if (source[i] === close) {
      i += 1;
      return items;
    }
    for (;;) {
      items.push(item());
      skip();
      if (source[i] === ",") {
        i += 1;
        continue;
      }
      if (source[i] === close) {
        i += 1;
        return items;
      }
      return fail(`expected a comma or ${close}`);
    }
  };
  const value = (): Node => {
    skip();
    const char = source[i];
    if (char === "{") {
      i += 1;
      const entries = list<[string, Node]>("}", () => {
        skip();
        if (source[i] !== '"') fail("expected a key");
        const key = string();
        skip();
        if (source[i] !== ":") fail("expected a colon");
        i += 1;
        return [key, value()];
      });
      return { kind: "object", entries };
    }
    if (char === "[") {
      i += 1;
      return { kind: "array", items: list("]", value) };
    }
    if (char === '"') return { kind: "string", value: string() };
    const number = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    number.lastIndex = i;
    const found = number.exec(source);
    if (found) {
      const start = i;
      i += found[0].length;
      return { kind: "number", value: Number(found[0]), start, end: i };
    }
    const word = /true|false|null/y;
    word.lastIndex = i;
    const literal = word.exec(source);
    if (literal) {
      i += literal[0].length;
      return { kind: "other" };
    }
    return fail("unexpected text");
  };
  const root = value();
  skip();
  if (i < source.length) fail("text after the end");
  return root;
};

const formatSeconds = (value: number): string => String(Math.round(value * 100) / 100);

// narration.json with the `at` of the given lines replaced and nothing else touched.
export const rewriteAts = (source: string, ats: ReadonlyMap<string, number>): { text: string; changed: number } => {
  const root = readNodes(source);
  const lines = root.kind === "object" ? root.entries.find(([key]) => key === "lines")?.[1] : undefined;
  if (lines?.kind !== "array") throw new Error('narration.json has no "lines" list');
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const found = new Set<string>();
  for (const item of lines.items) {
    if (item.kind !== "object") continue;
    const id = item.entries.find(([key]) => key === "id")?.[1];
    if (id?.kind !== "string" || !ats.has(id.value)) continue;
    const at = item.entries.find(([key]) => key === "at")?.[1];
    if (at?.kind !== "number") throw new Error(`Line "${id.value}" has no "at" to rewrite`);
    found.add(id.value);
    const next = ats.get(id.value) ?? at.value;
    if (Math.abs(at.value - next) >= 0.005) edits.push({ start: at.start, end: at.end, text: formatSeconds(next) });
  }
  for (const id of ats.keys()) if (!found.has(id)) throw new Error(`Line "${id}" is not in narration.json`);
  let text = source;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  return { text, changed: edits.length };
};

// ---- Clips, kept by what they say ----

export const clipKey = (voice: string, speed: number, text: string): string =>
  createHash("sha1").update(`${voice}\n${speed}\n${text}`).digest("hex").slice(0, 16);

// The length of a WAV in milliseconds, from its header; null if it isn't one
// that is whole.
export const wavDurationMs = (wav: Buffer): number | null => {
  if (wav.length < 12 || wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") return null;
  let rate = 0;
  let blockAlign = 0;
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt " && body + 16 <= wav.length) {
      rate = wav.readUInt32LE(body + 4);
      blockAlign = wav.readUInt16LE(body + 12);
    } else if (id === "data") {
      if (!rate || !blockAlign || size > wav.length - body) return null;
      return Math.round((size / blockAlign / rate) * 1000);
    }
    offset = body + size + (size % 2);
  }
  return null;
};

export type Speak = (
  narration: Narration,
  outDir: string,
) => Promise<Map<string, { path: string; durationMs: number }>>;

const cachedDuration = async (file: string): Promise<number | null> => {
  try {
    const ms = wavDurationMs(await fs.readFile(file));
    return ms !== null && ms > 0 ? ms : null;
  } catch {
    return null;
  }
};

// Where spoken clips are kept between runs: a file for each voice, speed and wording.
export const clipCacheDir = (outDir: string): string => path.join(outDir, "voice", "fit-cache");

export type Clips = Map<string, { path: string; durationMs: number }>;

// Every line spoken: its clip and how long it is. The synthesizer speaks every
// line it is handed, every time, so this hands it only the lines whose words,
// voice or speed have no clip in `cacheDir` yet, and reads the rest from the
// clips it kept. `clips` is keyed by line id, like the synthesizer's own result.
export const spokenDurations = async (
  narration: Narration,
  cacheDir: string,
  speak: Speak = synthesize,
): Promise<{ durations: Map<string, number>; clips: Clips; spoken: number; reused: number }> => {
  await fs.mkdir(cacheDir, { recursive: true });
  const keyOf = (line: NarrationLine): string => clipKey(narration.voice, narration.speed, line.text);
  const known = new Map<string, number>();
  const missing = new Map<string, string>();
  for (const line of narration.lines) {
    const key = keyOf(line);
    if (known.has(key) || missing.has(key)) continue;
    const ms = await cachedDuration(path.join(cacheDir, `${key}.wav`));
    if (ms === null) missing.set(key, line.text);
    else known.set(key, ms);
  }
  if (missing.size) {
    const request: Narration = {
      voice: narration.voice,
      speed: narration.speed,
      lines: [...missing].map(([key, text]) => ({ id: key, beat: "", at: 0, text })),
    };
    const made = await speak(request, cacheDir);
    for (const key of missing.keys()) {
      const clip = made.get(key);
      if (!clip) throw new Error(`The synthesizer returned no clip for "${missing.get(key)}"`);
      known.set(key, clip.durationMs);
    }
  }
  const clips: Clips = new Map();
  const durations = new Map<string, number>();
  for (const line of narration.lines) {
    const key = keyOf(line);
    const durationMs = known.get(key) ?? 0;
    clips.set(line.id, { path: path.join(cacheDir, `${key}.wav`), durationMs });
    durations.set(line.id, durationMs);
  }
  return { durations, clips, spoken: missing.size, reused: known.size - missing.size };
};

// ---- The command ----

export const runFit = async (opts: {
  filmDir: string;
  outDir: string;
  cacheDir: string;
  voice?: string;
  speed?: number;
  lead: number;
  gap: number;
  write: boolean;
  log?: (message: string) => void;
}): Promise<{ fits: BeatFit[]; changed: number }> => {
  const log = opts.log ?? ((message: string) => console.log(`[motion] ${message}`));
  const scriptPath = path.join(opts.filmDir, "narration.json");
  const source = await fs.readFile(scriptPath, "utf8");
  const script = JSON.parse(source) as Narration;
  if (!script.lines?.length) throw new Error(`${scriptPath} has no lines to fit`);
  const narration: Narration = {
    ...script,
    voice: opts.voice ?? script.voice,
    speed: opts.speed ?? script.speed,
  };
  const info = await probeFilm({ filmDir: opts.filmDir, cacheDir: opts.cacheDir });
  checkLines(narration.lines, info);
  log(`Fitting ${narration.lines.length} lines as ${narration.voice} at ${narration.speed}x...`);
  const { durations, spoken, reused } = await spokenDurations(narration, clipCacheDir(opts.outDir));
  log(`${spoken} spoken, ${reused} reused from earlier runs.`);
  const fits = fitNarration(narration.lines, info, durations, {
    lead: opts.lead,
    gap: opts.gap,
    tail: FIT_DEFAULTS.tail,
  });
  console.log(`\n${fitTable(fits)}\n\n${fitRecap(fits)}`);
  const ats = writableAts(fits);
  if (!opts.write) {
    log(`Nothing written. Add --write to put these at values in ${scriptPath}.`);
    return { fits, changed: 0 };
  }
  const { text, changed } = rewriteAts(source, ats);
  if (text !== source) await fs.writeFile(scriptPath, text);
  const pinned = narration.lines.length - ats.size;
  log(
    `Wrote ${changed} changed at value(s) to ${scriptPath}${pinned ? `; ${pinned} pinned line(s) left as they are` : ""}.`,
  );
  if (narration.voice !== script.voice || narration.speed !== script.speed)
    log(
      `These fit ${narration.voice} at ${narration.speed}x, but narration.json says ${script.voice} at ${script.speed}x. Change it there to match.`,
    );
  return { fits, changed };
};
