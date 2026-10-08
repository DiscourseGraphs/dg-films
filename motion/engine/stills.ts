// Reviewing a film from stills without picking the times by hand: take a few
// inside every beat (and at its cues), render them all in one browser, and tile
// them into numbered sheets with each frame's time written on it.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { stamp } from "./beats";
import { renderStills } from "./render";
import type { MotionInfo } from "./types";

export const SHEET_SIZE = 12;
export const SHEET_COLUMNS = 4;
const TILE_WIDTH = 640;
const GUTTER = 12;
const BACKDROP = "0x20242c";

export type StillPick = {
  t: number;
  beat: string;
  // Where the time came from: a share of a beat, one of its cues, or --at.
  kind: "beat" | "cue" | "at";
  label: string;
};

const hundredths = (value: number): number => Math.round(value * 100) / 100;

const beatAt = (info: MotionInfo, t: number): string =>
  [...info.beats].reverse().find((beat) => beat.at <= t)?.id ?? info.beats[0]?.id ?? "";

const RANK = { beat: 0, at: 1, cue: 2 } as const;

// `perBeat` times spread evenly through each beat (the middle of each of that
// many equal parts, so none lands on a cut), plus each cue's time when asked,
// plus any given by hand. In time order; two at the same time are one frame.
export const pickTimes = (
  info: MotionInfo,
  opts: { perBeat: number; cues: boolean; extra?: readonly number[] },
): StillPick[] => {
  const picks: StillPick[] = [];
  const clamp = (t: number): number => hundredths(Math.min(info.duration, Math.max(0, t)));
  for (const beat of info.beats) {
    const length = beat.end - beat.at;
    for (let k = 0; k < opts.perBeat; k += 1)
      picks.push({
        t: clamp(beat.at + ((k + 0.5) * length) / opts.perBeat),
        beat: beat.id,
        kind: "beat",
        label: beat.title,
      });
    if (opts.cues)
      for (const cue of beat.cues) picks.push({ t: clamp(cue.at), beat: beat.id, kind: "cue", label: cue.label });
  }
  for (const t of opts.extra ?? []) picks.push({ t: clamp(t), beat: beatAt(info, t), kind: "at", label: "" });
  const byTime = new Map<number, StillPick>();
  for (const pick of picks) {
    const held = byTime.get(pick.t);
    if (!held || RANK[pick.kind] > RANK[held.kind]) byTime.set(pick.t, pick);
  }
  return [...byTime.values()].sort((a, b) => a.t - b.t);
};

export type Tile = StillPick & { file: string };
export type SheetPlan = { file: string; tiles: Tile[] };

export const planSheets = (tiles: readonly Tile[], dir: string, perSheet = SHEET_SIZE): SheetPlan[] => {
  const sheets: SheetPlan[] = [];
  for (let from = 0; from < tiles.length; from += perSheet)
    sheets.push({
      file: path.join(dir, `sheet-${String(sheets.length + 1).padStart(2, "0")}.png`),
      tiles: tiles.slice(from, from + perSheet),
    });
  return sheets;
};

const describeTile = (tile: StillPick): string =>
  `${tile.t.toFixed(2)} ${tile.beat}${tile.kind === "cue" ? ` (cue: ${tile.label})` : ""}`;

// Which times are on a sheet, laid out as the sheet is: a line per row.
export const describeSheet = (sheet: SheetPlan, columns = SHEET_COLUMNS): string => {
  const rows: string[] = [];
  for (let from = 0; from < sheet.tiles.length; from += columns)
    rows.push(
      `  row ${rows.length + 1}: ${sheet.tiles
        .slice(from, from + columns)
        .map(describeTile)
        .join(" | ")}`,
    );
  return [`${path.basename(sheet.file)} (${sheet.tiles.length} frames, ${columns} across)`, ...rows].join("\n");
};

// What is written on a tile. Plain characters only: it goes through ffmpeg's
// drawtext, where colons, quotes and percent signs mean something.
export const tileLabel = (tile: StillPick): string =>
  `${tile.t.toFixed(2)}s ${tile.beat}${tile.kind === "cue" ? " cue" : ""}`.replace(/[^A-Za-z0-9 .\-_]/g, "");

// Where xstack puts tile i of a grid: after the widths of the ones to its left,
// below the heights of the first tile of each row above.
export const xstackLayout = (count: number, columns: number): string =>
  Array.from({ length: count }, (_, i) => {
    const column = i % columns;
    const row = Math.floor(i / columns);
    const x = column === 0 ? "0" : Array.from({ length: column }, (_, k) => `w${row * columns + k}`).join("+");
    const y = row === 0 ? "0" : Array.from({ length: row }, (_, k) => `h${k * columns}`).join("+");
    return `${x}_${y}`;
  }).join("|");

const FONTS = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
  "/usr/share/fonts/truetype/noto/NotoSansMono-Regular.ttf",
];

// A font ffmpeg can draw with (the vendored ones are woff2, which it can't read).
export const labelFont = (candidates: readonly string[] = FONTS): string | undefined =>
  candidates.find((candidate) => existsSync(candidate));

const filterPath = (value: string): string => value.replace(/[\\':]/g, (char) => `\\${char}`);

export const sheetArgs = (opts: {
  files: readonly string[];
  // Written on each tile; none are drawn without a font.
  labels?: readonly string[];
  font?: string;
  out: string;
  columns: number;
  width: number;
}): string[] => {
  const { files, labels, font, out, columns, width } = opts;
  const size = Math.max(11, Math.round(width / 28));
  const tiles = files.map((_, i) => {
    const label = labels?.[i];
    const draw =
      font && label
        ? `,drawtext=fontfile='${filterPath(font)}':text='${label}':x=8:y=8:fontsize=${size}:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=6`
        : "";
    return `[${i}:v]scale=${width}:-1:flags=lanczos${draw},pad=iw+${GUTTER}:ih+${GUTTER}:${GUTTER / 2}:${GUTTER / 2}:color=${BACKDROP}[t${i}]`;
  });
  const stack =
    files.length === 1
      ? "[t0]null[sheet]"
      : `${files.map((_, i) => `[t${i}]`).join("")}xstack=inputs=${files.length}:layout=${xstackLayout(files.length, columns)}:fill=${BACKDROP}[sheet]`;
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...files.flatMap((file) => ["-i", file]),
    "-filter_complex",
    `${tiles.join(";")};${stack}`,
    "-map",
    "[sheet]",
    "-frames:v",
    "1",
    "-update",
    "1",
    out,
  ];
};

const runFfmpeg = (args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-600)}`)),
    );
  });

// The stills of a film's beats, in one browser, and optionally the sheets.
export const beatStills = async (opts: {
  filmDir: string;
  stillsDir: string;
  cacheDir: string;
  dsf: number;
  perBeat: number;
  cues: boolean;
  extra: readonly number[];
  sheet: boolean;
  columns: number;
  tileWidth?: number;
  log?: (message: string) => void;
}): Promise<{ tiles: Tile[]; sheets: SheetPlan[] }> => {
  const log = opts.log ?? ((message: string) => console.log(`[motion] ${message}`));
  await fs.mkdir(opts.stillsDir, { recursive: true });
  for (const old of await fs.readdir(opts.stillsDir))
    if (/^(still|sheet)-/.test(old)) await fs.rm(path.join(opts.stillsDir, old), { force: true });
  let picks: StillPick[] = [];
  const { files, info } = await renderStills({
    filmDir: opts.filmDir,
    outDir: opts.stillsDir,
    cacheDir: opts.cacheDir,
    dsf: opts.dsf,
    times: (found) => {
      picks = pickTimes(found, { perBeat: opts.perBeat, cues: opts.cues, extra: opts.extra });
      if (!picks.length) throw new Error("Nothing to capture: --beats 0 needs --cues or --at with it");
      return picks.map((pick) => pick.t);
    },
  });
  const tiles = files.map((file, i): Tile => ({ ...picks[i], file }));
  log(`${tiles.length} frames from ${info.beats.length} beats (${stamp(info.duration)}).`);
  if (!opts.sheet) {
    console.log(tiles.map((tile) => `${describeTile(tile)}  ${path.basename(tile.file)}`).join("\n"));
    return { tiles, sheets: [] };
  }
  const font = labelFont();
  if (!font) log("No font ffmpeg can draw with was found, so the sheets carry no times.");
  const sheets = planSheets(tiles, opts.stillsDir);
  for (const sheet of sheets) {
    await runFfmpeg(
      sheetArgs({
        files: sheet.tiles.map((tile) => tile.file),
        labels: sheet.tiles.map(tileLabel),
        font,
        out: sheet.file,
        columns: opts.columns,
        width: opts.tileWidth ?? TILE_WIDTH,
      }),
    );
    console.log(describeSheet(sheet, opts.columns));
  }
  return { tiles, sheets };
};
