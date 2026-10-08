/**
 * Motion engine: render a film (HTML you animate) frame by frame to video.
 *
 *   cd discourse-graph/apps/roam   # for its tsx, playwright and esbuild
 *   npx tsx ../../../dg-films/motion/engine/cli.ts <command> <film> [options]
 *
 * <film> is a directory under motion/films (by name) or a path; it holds film.ts.
 *
 * Commands:
 *   render   Whole film, or --from/--to seconds, to mp4: the rendered size and a
 *            1080p copy. Writes beats.md, beats.json and embeds the beats as
 *            chapters when the whole film is rendered. Waits for its turn (see Queue).
 *   preview  Fast look: 1x scale, 30 fps, one small mp4. Waits for its turn too.
 *   still    PNGs at the seconds given by --at 1.5,4,9; --sheet tiles them into sheet.png.
 *            --beats [N] takes N evenly spaced times inside every beat instead (default 2);
 *            --cues adds each beat cue's time, --at adds times of your own, and --sheet then
 *            tiles the frames 12 to a sheet, 4 across, into sheet-01.png, sheet-02.png... with
 *            each frame's time written on it. Prints which times are on which sheet.
 *   info     Prints the beat sheet without rendering.
 *   lint     Camera lint: each move's length and peak speed, and warnings for
 *            overlapping moves, a move that starts less than 0.4 s after the last one
 *            ended (the camera stops dead), moves too fast to follow, and jumps in speed.
 *   voiceover  Speaks the film's narration.json with Kokoro, cleans and mixes it with the
 *            film's sounds (clicks, keys, whooshes, the cues it asks for, over a quiet room
 *            tone), and muxes it into a rendered video. --video <mp4> (default: the 1080p
 *            render), --to <mp4> (the narrated file; default narrated/<film>.mp4 in the --out
 *            directory), --voice, --speed, --check (timing only, no mixing),
 *            --no-sound (the voice alone), --room <dB> (room tone level, default -49),
 *            --sound-level <dB> (trim on every sound, default 0), --no-room (no room tone).
 *            Clips are kept under voice/fit-cache by what they say (voice, speed, text), so
 *            only lines whose words changed are spoken again, by --check and the mix as well.
 *            --fit [--gap 0.35] [--lead 0.5] [--write] places the lines instead of mixing: in
 *            each beat the first line starts --lead seconds in and each next one --gap after the
 *            last ends, and a table says how long each beat needs to be. A line with "pin": true
 *            keeps its `at` and the others are placed around it; one that would end less than
 *            --gap before the next pinned line starts is warned about. --write puts the new `at`
 *            values into narration.json (never a pinned line's; nothing else in the file changes).
 *   sound    Makes the film's soundtrack alone (sound/soundtrack.wav) and prints what is in it.
 *   new      `new <name>` makes films/<name>/ from the kit's template (kit/template): a film.ts,
 *            film.css, timeline.ts with the beat lengths, data.ts, narration.json and a feature-beat
 *            scene, all built from kit/ parts. It refuses a name that already exists.
 *   probe    Prints the camera view at --at <s> and the world rect of each selector
 *            in --sel "<css>|<css>", to find why a shot is off.
 *
 * Options:
 *   --dsf <n>        Device scale factor (default 3: a 1280x720 film renders 4K).
 *   --workers <n>    Parallel browsers, one window each, for render and preview (default 4).
 *   --fps <n>        Override the film's frame rate.
 *   --from <s> --to <s>   Render only this range (output is named -part). For voiceover, --to is a file.
 *   --crf <n>        x264 quality for the rendered size (default 15; lower is better). The 1080p
 *                    copy uses five less (10 by default, about 6 Mbps on this UI).
 *   --preset <name>  x264 preset (default medium).
 *   --only <name>    Just one output: 1080p, or anything else for the rendered size.
 *   --no-1080        Skip the 1080p copy.
 *   --at <list>      still: seconds to capture; probe: the one second to look at.
 *   --sel <css|css>  probe: selectors, separated by |.
 *   --sheet          still: also tile the captures into sheet.png (sheet-01.png... with --beats).
 *   --columns <n>    still: sheet columns (default 3; 4 with --beats).
 *   --beats [N]      still: N evenly spaced times inside each beat (default 2).
 *   --cues           still: also the time of each beat cue.
 *   --tile <px>      still --beats --sheet: width of each frame on a sheet (default 640).
 *   --out <dir>      Output directory (default output/motion/<film>).
 *
 * Queue: render and preview take output/motion/.render.lock (MOTION_RENDER_LOCK moves it). If a
 * live process holds it they print "waiting for <film> <command> started hh:mm (pid N)" and look
 * again every 3 s; a lock whose process is gone is taken over. still, info, lint, probe,
 * voiceover and sound do not wait.
 *
 * Switches (--check, --force, --fit, --write, --sheet, --cues, --headless and every --no-...) take no
 * value, so they can come before the film's name; any other flag takes the word after it.
 *
 * --headless is refused by policy: every window is headed, on workspace 9.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs, type Flags } from "./args";
import { beatSheetMarkdown } from "./beats";
import { FIT_DEFAULTS, clipCacheDir, runFit, spokenDurations } from "./fit";
import { lintCamera, formatLint } from "./lint";
import { lockPath, withRenderLock } from "./lock";
import { scaffoldFilm } from "./scaffold";
import {
  buildTrack,
  fitProblems,
  measureLoudness,
  mixdown,
  mux,
  placeLines,
  staleProblems,
  timingTable,
  writeSoundtrack,
  type Narration,
} from "./voiceover";
import type { MotionInfo } from "./types";
import { type SoundStats, type SoundtrackOptions } from "./soundtrack";
import { contactSheet, probeAt, probeFilm, renderFilm, renderStills, sampleCamera, type Variant } from "./render";
import { SHEET_COLUMNS, beatStills } from "./stills";

const MOTION_ROOT = path.resolve(__dirname, "..");
const OUTPUT_ROOT = path.resolve(MOTION_ROOT, "../output/motion");

const text = (flags: Flags, name: string): string | undefined => {
  const value = flags.get(name);
  return typeof value === "string" ? value : undefined;
};

const number = (flags: Flags, name: string, fallback: number): number => {
  const raw = text(flags, name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`--${name} needs a number, got "${raw}"`);
  return value;
};

const optionalNumber = (flags: Flags, name: string): number | undefined =>
  flags.has(name) ? number(flags, name, 0) : undefined;

// The beats of the render beside the video, if there is one: the timing of that
// very video, to check the film still matches it before a voice is laid over it.
const renderedBeats = async (outDir: string): Promise<MotionInfo | null> => {
  try {
    return JSON.parse(await fs.readFile(path.join(outDir, "beats.json"), "utf8")) as MotionInfo;
  } catch {
    return null;
  }
};

const soundOptions = (flags: Flags): SoundtrackOptions => ({
  roomDb: flags.has("no-room") ? null : number(flags, "room", -49),
  level: number(flags, "sound-level", 0),
});

const soundSummary = (stats: SoundStats): string =>
  [
    `sounds: ${
      Object.entries(stats.cues)
        .map(([kind, count]) => `${count} ${kind}`)
        .join(", ") || "none"
    }`,
    `soundtrack: peak ${stats.peakDb.toFixed(1)} dBFS, RMS ${stats.rmsDb.toFixed(1)} dBFS, quietest 0.1 s ${stats.quietestDb.toFixed(1)} dBFS, loudest 0.1 s ${stats.loudestDb.toFixed(1)} dBFS`,
  ].join("\n");

const resolveFilm = async (name: string): Promise<{ dir: string; name: string }> => {
  const candidates = [path.resolve(name), path.join(MOTION_ROOT, "films", name)];
  for (const candidate of candidates) {
    const found = await fs.stat(path.join(candidate, "film.ts")).then(
      () => true,
      () => false,
    );
    if (found) return { dir: candidate, name: path.basename(candidate) };
  }
  throw new Error(`No film "${name}": looked for film.ts in ${candidates.join(" and ")}`);
};

const main = async (): Promise<void> => {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [command, filmName] = positional;
  if (flags.has("headless") || process.env.HEADLESS === "true") {
    console.log("[motion] --headless is disabled by policy; rendering headed on workspace 9.");
  }
  if (!command || !filmName || command === "help") {
    console.log(
      "motion render|preview|still|info|lint|probe|voiceover|sound <film> [options], or new <name>; see the header of engine/cli.ts",
    );
    return;
  }
  if (command === "new") {
    const made = await scaffoldFilm(filmName);
    console.log(
      `[motion] Made films/${filmName}:\n${made.map((file) => `  ${file}`).join("\n")}\n` +
        `[motion] Next: write narration.json, run voiceover ${filmName} --fit, then info, still --beats 2 --sheet, lint, preview.`,
    );
    return;
  }
  const film = await resolveFilm(filmName);
  const outDir = path.resolve(text(flags, "out") ?? path.join(OUTPUT_ROOT, film.name));
  const cacheDir = path.join(OUTPUT_ROOT, ".cache");
  const queue = <T>(run: () => Promise<T>): Promise<T> =>
    withRenderLock(lockPath(OUTPUT_ROOT), { film: film.name, command }, run);

  if (command === "sound") {
    const info = await probeFilm({ filmDir: film.dir, cacheDir });
    const out = path.join(outDir, "sound", "soundtrack.wav");
    const stats = await writeSoundtrack(info, out, soundOptions(flags));
    console.log(`[motion] ${out}\n${soundSummary(stats)}`);
    return;
  }

  if (command === "voiceover") {
    if (flags.has("write") && !flags.has("fit")) throw new Error("--write goes with --fit.");
    if (flags.has("fit")) {
      await runFit({
        filmDir: film.dir,
        outDir,
        cacheDir,
        voice: text(flags, "voice"),
        speed: optionalNumber(flags, "speed"),
        lead: number(flags, "lead", FIT_DEFAULTS.lead),
        gap: number(flags, "gap", FIT_DEFAULTS.gap),
        write: flags.has("write"),
      });
      return;
    }
    const script = JSON.parse(await fs.readFile(path.join(film.dir, "narration.json"), "utf8")) as Narration;
    const narration: Narration = {
      ...script,
      voice: text(flags, "voice") ?? script.voice,
      speed: number(flags, "speed", script.speed),
    };
    const info = await probeFilm({ filmDir: film.dir, cacheDir });
    const rendered = await renderedBeats(outDir);
    const stale = rendered ? staleProblems(info, rendered) : [];
    if (stale.length)
      console.log(
        `[motion] The render beside this film is out of date: ${stale.join("; ")}. Render again before muxing.`,
      );
    const clipsDir = path.join(outDir, "voice", `${narration.voice}-${narration.speed}`);
    await fs.mkdir(clipsDir, { recursive: true });
    console.log(`[motion] Speaking ${narration.lines.length} lines as ${narration.voice} at ${narration.speed}x...`);
    const { clips, spoken: made, reused } = await spokenDurations(narration, clipCacheDir(outDir));
    console.log(`[motion] ${made} spoken, ${reused} reused from earlier runs.`);
    const placed = placeLines(narration.lines, info, new Map([...clips].map(([id, clip]) => [id, clip.durationMs])));
    console.log(timingTable(placed));
    const spoken = placed.reduce((sum, line) => sum + line.durationMs, 0) / 1000;
    console.log(
      `\n${placed.reduce((sum, line) => sum + line.text.split(/\s+/).length, 0)} words, ${spoken.toFixed(0)} s of speech in ${info.duration.toFixed(1)} s (${Math.round((spoken / info.duration) * 100)}%).`,
    );
    const problems = fitProblems(placed, info);
    if (problems.length) console.log(`\nDoesn't fit:\n${problems.map((problem) => `  ${problem}`).join("\n")}`);
    if (flags.has("check")) return;
    if (problems.length && !flags.has("force")) throw new Error("Fix the lines above, or pass --force to mix anyway.");
    if (stale.length && !flags.has("force")) throw new Error("Render the film again, or pass --force to mux anyway.");
    const track = path.join(clipsDir, "narration.wav");
    await buildTrack(placed, clips, info.duration, track);
    let mixed = track;
    if (!flags.has("no-sound")) {
      const soundtrack = path.join(outDir, "sound", "soundtrack.wav");
      console.log(`\n[motion] ${soundSummary(await writeSoundtrack(info, soundtrack, soundOptions(flags)))}`);
      mixed = path.join(clipsDir, "mix.wav");
      await mixdown(track, soundtrack, info.duration, mixed);
    }
    const video = path.resolve(text(flags, "video") ?? path.join(outDir, `${film.name}-1080p.mp4`));
    const out = path.resolve(text(flags, "to") ?? path.join(outDir, "narrated", `${film.name}.mp4`));
    await fs.mkdir(path.dirname(out), { recursive: true });
    await mux(video, mixed, out);
    const loudness = await measureLoudness(out);
    console.log(
      `\n[motion] ${out}\n[motion] loudness ${loudness.integrated} LUFS, range ${loudness.range} LU, peak ${loudness.peak} dBFS`,
    );
    return;
  }

  if (command === "lint") {
    const data = await sampleCamera({ filmDir: film.dir, cacheDir, dt: 1 / 60 });
    console.log(formatLint(lintCamera(data)));
    return;
  }

  if (command === "probe") {
    const found = await probeAt({
      filmDir: film.dir,
      cacheDir,
      t: number(flags, "at", 0),
      selectors: (text(flags, "sel") ?? "").split("|").filter(Boolean),
    });
    console.log(JSON.stringify(found, null, 2));
    return;
  }

  if (command === "info") {
    process.stdout.write(beatSheetMarkdown(await probeFilm({ filmDir: film.dir, cacheDir })));
    return;
  }

  if (command === "still") {
    if (flags.has("beats") || flags.has("cues")) {
      const perBeat = number(flags, "beats", 2);
      if (!Number.isInteger(perBeat) || perBeat < 0) throw new Error("--beats needs a whole number, like --beats 2");
      await beatStills({
        filmDir: film.dir,
        stillsDir: path.join(outDir, "stills"),
        cacheDir,
        dsf: number(flags, "dsf", 2),
        perBeat,
        cues: flags.has("cues"),
        extra: (text(flags, "at") ?? "")
          .split(",")
          .filter((part) => part.trim() !== "")
          .map(Number)
          .filter(Number.isFinite),
        sheet: flags.has("sheet"),
        columns: number(flags, "columns", SHEET_COLUMNS),
        tileWidth: optionalNumber(flags, "tile"),
      });
      return;
    }
    const times = (text(flags, "at") ?? "0")
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((value) => Number.isFinite(value));
    if (!times.length) throw new Error("--at needs seconds, like --at 1.5,4,9");
    const stillsDir = path.join(outDir, "stills");
    await fs.mkdir(stillsDir, { recursive: true });
    for (const old of await fs.readdir(stillsDir)) if (old.startsWith("still-")) await fs.rm(path.join(stillsDir, old));
    const { files } = await renderStills({
      filmDir: film.dir,
      outDir: stillsDir,
      cacheDir,
      dsf: number(flags, "dsf", 2),
      times,
    });
    if (flags.has("sheet") && files.length > 1) {
      const sheet = path.join(stillsDir, "sheet.png");
      await contactSheet(files, sheet, number(flags, "columns", 3), 960);
      console.log(`[motion] Sheet: ${sheet}`);
    }
    return;
  }

  if (command === "preview") {
    await queue(() =>
      renderFilm({
        filmDir: film.dir,
        outDir,
        cacheDir,
        dsf: number(flags, "dsf", 1),
        fps: number(flags, "fps", 30),
        from: optionalNumber(flags, "from"),
        to: optionalNumber(flags, "to"),
        workers: number(flags, "workers", 4),
        variants: [{ suffix: "preview", crf: 20, preset: "veryfast" }],
      }),
    );
    return;
  }

  if (command === "render") {
    const crf = number(flags, "crf", 15);
    const preset = text(flags, "preset") ?? "medium";
    const only = text(flags, "only");
    const variants: Variant[] = [{ crf, preset }];
    // The 1080p copy is the one people watch and share, so it gets the finer quality
    // setting: small text in motion needs bits, and at crf 17 it came out near 3.5 Mbps.
    if (!flags.has("no-1080")) variants.push({ suffix: "1080p", height: 1080, crf: Math.max(0, crf - 5), preset });
    const chosen =
      only === undefined
        ? variants
        : variants.filter((variant) => (only === "1080p" ? variant.height === 1080 : variant.height === undefined));
    await queue(() =>
      renderFilm({
        filmDir: film.dir,
        outDir,
        cacheDir,
        dsf: number(flags, "dsf", 3),
        fps: optionalNumber(flags, "fps"),
        from: optionalNumber(flags, "from"),
        to: optionalNumber(flags, "to"),
        workers: number(flags, "workers", 4),
        variants: chosen.length ? chosen : variants,
      }),
    );
    return;
  }

  throw new Error(`Unknown command "${command}": render, preview, still, info, lint, probe, voiceover or sound.`);
};

main().catch((error: unknown) => {
  console.error(`[motion] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
