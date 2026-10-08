// Renders a film frame by frame. Chromium opens the film's page, the renderer
// sets the clock with window.__motion.seek(t), takes a screenshot, and pipes the
// PNG to ffmpeg. Frames are independent of each other and of real time, so
// several pages (workers) can render in parallel and the writer puts their
// frames back in order.
//
// The browser is always headed, never headless: sid watches every automated
// window, and i3 floats Playwright's Chromium on workspace 9. Don't focus or
// resize those windows while a render runs.

import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser, CDPSession, Page } from "playwright";
import { beatSheetMarkdown, chapterMetadata, stamp } from "./beats";
import { buildFilm } from "./bundle";
import { loadPlaywright } from "./deps";
import type { MotionApi, MotionInfo } from "./types";

export type Variant = {
  // Output file suffix; the height in pixels ("2160p") when left out.
  suffix?: string;
  // Output height in pixels; the width follows the film's aspect ratio. Left
  // out, the output keeps the rendered size.
  height?: number;
  crf: number;
  preset: string;
};

export type RenderOptions = {
  filmDir: string;
  outDir: string;
  cacheDir: string;
  dsf: number;
  fps?: number;
  from?: number;
  to?: number;
  workers: number;
  variants: Variant[];
  log?: (message: string) => void;
};

type Log = (message: string) => void;

const READY_TIMEOUT_MS = 120_000;
const LOOKAHEAD = 12;

const even = (value: number): number => Math.round(value / 2) * 2;

const launchBrowser = async (): Promise<Browser> =>
  loadPlaywright().chromium.launch({
    headless: false,
    args: ["--force-color-profile=srgb", "--disable-lcd-text", "--font-render-hinting=none", "--hide-scrollbars"],
  });

// One worker is one Chromium process with one window: Playwright's screenshots
// (and Chromium's own PNG encoding) serialize inside a browser, so extra pages
// in the same browser add nothing, while extra browsers scale.
type Worker = { browser: Browser; page: Page; cdp: CDPSession; info: MotionInfo };

type Size = { width: number; height: number };

const timeout = async <T>(work: Promise<T>, ms: number, what: string): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${what} took longer than ${ms / 1000} s`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

// Open the film in a fresh browser window sized to the film's frame. `size` is
// null for the first worker, which learns the film's frame from the film.
const openWorker = async (htmlPath: string, dsf: number, size: Size | null, log: Log): Promise<Worker> => {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: size ?? { width: 1280, height: 720 }, deviceScaleFactor: dsf });
  const page = await context.newPage();
  page.on("pageerror", (error) => log(`page error: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") log(`page console: ${message.text()}`);
  });
  await page.goto(pathToFileURL(htmlPath).href);
  const info = await timeout(
    page.evaluate(() => (window as unknown as { __motion: MotionApi }).__motion.ready),
    READY_TIMEOUT_MS,
    "Building the film",
  );
  if (!size) await page.setViewportSize({ width: info.width, height: info.height });
  const cdp = await context.newCDPSession(page);
  // A session of our own doesn't inherit Playwright's emulation, and without it
  // a capture comes back at the display's native scale, not the film's.
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: info.width,
    height: info.height,
    deviceScaleFactor: dsf,
    mobile: false,
  });
  return { browser, page, cdp, info };
};

// optimizeForSpeed trades PNG size for encode time: the pixels are still
// lossless, and it is what makes 4K frames take tens of milliseconds, not hundreds.
const grab = async (worker: Worker, t: number): Promise<Buffer> => {
  await worker.page.evaluate((time) => (window as unknown as { __motion: MotionApi }).__motion.seek(time), t);
  const { width, height } = worker.info;
  const shot = await worker.cdp.send("Page.captureScreenshot", {
    format: "png",
    optimizeForSpeed: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  });
  return Buffer.from(shot.data, "base64");
};

const closeAll = async (workers: Worker[]): Promise<void> => {
  await Promise.all(workers.map((worker) => worker.browser.close().catch(() => undefined)));
};

type Plan = { frames: number; first: number; fps: number };

export const planFrames = (info: MotionInfo, opts: { fps?: number; from?: number; to?: number }): Plan => {
  const fps = opts.fps ?? info.fps;
  const first = Math.max(0, Math.round((opts.from ?? 0) * fps));
  const last = Math.min(Math.ceil(info.duration * fps), Math.ceil((opts.to ?? info.duration) * fps));
  if (last <= first)
    throw new Error(`Nothing to render between ${opts.from ?? 0} s and ${opts.to ?? info.duration} s.`);
  return { frames: last - first, first, fps };
};

export const ffmpegArgs = (args: {
  fps: number;
  outputs: Array<{ path: string; width: number; height: number; crf: number; preset: string }>;
}): string[] => {
  const { fps, outputs } = args;
  const head =
    outputs.length > 1 ? `[0:v]split=${outputs.length}${outputs.map((_, i) => `[s${i}]`).join("")}` : "[0:v]null[s0]";
  const scales = outputs.map(
    (output, i) =>
      `[s${i}]scale=${output.width}:${output.height}:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p[o${i}]`,
  );
  const command = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "image2pipe",
    "-framerate",
    String(fps),
    "-c:v",
    "png",
    "-i",
    "pipe:0",
    "-filter_complex",
    [head, ...scales].join(";"),
  ];
  for (const [i, output] of outputs.entries()) {
    command.push(
      "-map",
      `[o${i}]`,
      "-r",
      String(fps),
      "-c:v",
      "libx264",
      "-preset",
      output.preset,
      "-crf",
      String(output.crf),
      "-profile:v",
      "high",
      "-g",
      String(fps * 2),
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-color_range",
      "tv",
      "-movflags",
      "+faststart",
      output.path,
    );
  }
  return command;
};

class Signal {
  private waiters: Array<() => void> = [];
  wait(): Promise<void> {
    return new Promise((resolve) => this.waiters.push(resolve));
  }
  fire(): void {
    const waiting = this.waiters;
    this.waiters = [];
    for (const resolve of waiting) resolve();
  }
}

const run = (command: string, args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited ${code}: ${stderr.slice(-600)}`)),
    );
  });

export type RenderResult = { info: MotionInfo; files: string[]; seconds: number };

export const renderFilm = async (opts: RenderOptions): Promise<RenderResult> => {
  const log = opts.log ?? ((message: string) => console.log(`[motion] ${message}`));
  const built = await buildFilm(opts.filmDir, opts.cacheDir);
  await fs.mkdir(opts.outDir, { recursive: true });
  log(
    `Opening ${opts.workers} Chromium window(s), headed. They float on workspace 9; leave them alone until the run ends.`,
  );
  const started = Date.now();
  const workers: Worker[] = [];
  try {
    const first = await openWorker(built.htmlPath, opts.dsf, null, log);
    workers.push(first);
    const { info } = first;
    const size = { width: info.width, height: info.height };
    workers.push(
      ...(await Promise.all(
        Array.from({ length: opts.workers - 1 }, () => openWorker(built.htmlPath, opts.dsf, size, log)),
      )),
    );
    const plan = planFrames(info, opts);
    const renderedWidth = info.width * opts.dsf;
    const renderedHeight = info.height * opts.dsf;
    const partial = plan.first > 0 || plan.first + plan.frames < Math.ceil(info.duration * plan.fps);
    const outputs = opts.variants.map((variant) => {
      const height = variant.height ?? renderedHeight;
      const width = variant.height ? even((variant.height * renderedWidth) / renderedHeight) : renderedWidth;
      const suffix = variant.suffix ?? `${height}p`;
      return {
        ...variant,
        suffix,
        width,
        height,
        path: path.join(opts.outDir, `${built.name}${partial ? "-part" : ""}-${suffix}.mp4`),
      };
    });
    log(
      `${built.name}: ${plan.frames} frames of ${stamp(info.duration)} at ${plan.fps} fps, rendered ${renderedWidth}×${renderedHeight} → ${outputs
        .map((output) => `${output.width}×${output.height}`)
        .join(" + ")}.`,
    );

    const ffmpeg = spawn("ffmpeg", ffmpegArgs({ fps: plan.fps, outputs }), { stdio: ["pipe", "ignore", "pipe"] });
    let ffmpegError = "";
    ffmpeg.stderr.on("data", (chunk: Buffer) => (ffmpegError += chunk.toString()));
    const ffmpegDone = new Promise<void>((resolve, reject) => {
      ffmpeg.once("error", reject);
      ffmpeg.once("exit", (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${ffmpegError.slice(-800)}`)),
      );
    });
    ffmpeg.stdin.on("error", () => undefined);

    const finished = new Map<number, Buffer>();
    const advanced = new Signal();
    const arrived = new Signal();
    let nextToHand = 0;
    let nextToWrite = 0;
    let failure: Error | null = null;
    const renderStart = Date.now();

    const work = async (worker: Worker): Promise<void> => {
      while (!failure) {
        while (nextToHand - nextToWrite >= LOOKAHEAD && !failure) await advanced.wait();
        if (failure) return;
        const index = nextToHand;
        if (index >= plan.frames) return;
        nextToHand += 1;
        finished.set(index, await grab(worker, (plan.first + index) / plan.fps));
        arrived.fire();
      }
    };

    const writer = async (): Promise<void> => {
      while (nextToWrite < plan.frames) {
        if (failure) return;
        const frame = finished.get(nextToWrite);
        if (!frame) {
          await arrived.wait();
          continue;
        }
        finished.delete(nextToWrite);
        nextToWrite += 1;
        advanced.fire();
        if (!ffmpeg.stdin.write(frame)) await once(ffmpeg.stdin, "drain");
        if (nextToWrite % 240 === 0 || nextToWrite === plan.frames) {
          const rate = nextToWrite / ((Date.now() - renderStart) / 1000);
          log(
            `frame ${nextToWrite}/${plan.frames} (${Math.round((nextToWrite / plan.frames) * 100)}%), ${rate.toFixed(1)} fps, about ${Math.ceil((plan.frames - nextToWrite) / rate)} s left`,
          );
        }
      }
      ffmpeg.stdin.end();
    };

    const guarded = async (job: Promise<void>): Promise<void> => {
      try {
        await job;
      } catch (error) {
        failure = error instanceof Error ? error : new Error(String(error));
        ffmpeg.kill("SIGKILL");
        advanced.fire();
        arrived.fire();
      }
    };
    await Promise.all([...workers.map((worker) => guarded(work(worker))), guarded(writer())]);
    if (failure) throw failure;
    await ffmpegDone;

    if (!partial) {
      const chapters = path.join(opts.outDir, "chapters.ffmetadata");
      await fs.writeFile(chapters, chapterMetadata(info));
      for (const output of outputs) {
        const tagged = output.path.replace(/\.mp4$/, ".chapters.mp4");
        await run("ffmpeg", [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-i",
          output.path,
          "-i",
          chapters,
          "-map",
          "0",
          "-map_metadata",
          "1",
          "-map_chapters",
          "1",
          "-c",
          "copy",
          "-movflags",
          "+faststart",
          tagged,
        ]);
        await fs.rename(tagged, output.path);
      }
      await fs.writeFile(path.join(opts.outDir, "beats.json"), `${JSON.stringify(info, null, 2)}\n`);
      await fs.writeFile(path.join(opts.outDir, "beats.md"), beatSheetMarkdown(info));
      log(`Beat sheet: ${path.join(opts.outDir, "beats.md")}`);
    }
    const seconds = (Date.now() - started) / 1000;
    log(`Done in ${Math.round(seconds)} s: ${outputs.map((output) => output.path).join(", ")}`);
    return { info, files: outputs.map((output) => output.path), seconds };
  } finally {
    await closeAll(workers);
  }
};

export const renderStills = async (opts: {
  filmDir: string;
  outDir: string;
  cacheDir: string;
  dsf: number;
  // The seconds to capture, or a function that picks them once the film is loaded.
  times: number[] | ((info: MotionInfo) => number[]);
  log?: (message: string) => void;
}): Promise<{ info: MotionInfo; files: string[] }> => {
  const log = opts.log ?? ((message: string) => console.log(`[motion] ${message}`));
  const built = await buildFilm(opts.filmDir, opts.cacheDir);
  await fs.mkdir(opts.outDir, { recursive: true });
  log("Opening Chromium headed. It floats on workspace 9; leave it alone until the run ends.");
  const worker = await openWorker(built.htmlPath, opts.dsf, null, log);
  try {
    const files: string[] = [];
    const times = typeof opts.times === "function" ? opts.times(worker.info) : opts.times;
    for (const [index, t] of times.entries()) {
      const clamped = Math.min(Math.max(0, t), worker.info.duration);
      const file = path.join(opts.outDir, `still-${String(index + 1).padStart(3, "0")}-t${clamped.toFixed(2)}.png`);
      await fs.writeFile(file, await grab(worker, clamped));
      files.push(file);
    }
    log(`${files.length} still(s) in ${opts.outDir}`);
    return { info: worker.info, files };
  } finally {
    await closeAll([worker]);
  }
};

export const contactSheet = async (files: string[], out: string, columns: number, width: number): Promise<void> => {
  const scaled = files.map((_, i) => `[${i}:v]scale=${width}:-1:flags=lanczos[t${i}]`).join(";");
  const stack = files.map((_, i) => `[t${i}]`).join("");
  // xstack places each input by the widths and heights of the ones before it.
  const layout = files
    .map((_, i) => {
      const column = i % columns;
      const row = Math.floor(i / columns);
      const x = column === 0 ? "0" : Array.from({ length: column }, (_, k) => `w${row * columns + k}`).join("+");
      const y = row === 0 ? "0" : Array.from({ length: row }, (_, k) => `h${k * columns}`).join("+");
      return `${x}_${y}`;
    })
    .join("|");
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...files.flatMap((file) => ["-i", file]),
    "-filter_complex",
    `${scaled};${stack}xstack=inputs=${files.length}:layout=${layout}:fill=white[sheet]`,
    "-map",
    "[sheet]",
    "-frames:v",
    "1",
    out,
  ]);
};

export const probeFilm = async (opts: {
  filmDir: string;
  cacheDir: string;
  log?: (message: string) => void;
}): Promise<MotionInfo> => {
  const log = opts.log ?? ((message: string) => console.log(`[motion] ${message}`));
  const built = await buildFilm(opts.filmDir, opts.cacheDir);
  const worker = await openWorker(built.htmlPath, 1, null, log);
  try {
    return worker.info;
  } finally {
    await closeAll([worker]);
  }
};

// Where the camera is at time t and where each selector's element sits in the
// world then, for working out why a shot frames the wrong thing.
export const probeAt = async (opts: {
  filmDir: string;
  cacheDir: string;
  t: number;
  selectors: string[];
  log?: (message: string) => void;
}): Promise<{
  view: { cx: number; cy: number; zoom: number };
  rects: Record<string, { x: number; y: number; w: number; h: number } | string>;
}> => {
  const log = opts.log ?? ((message: string) => console.log(`[motion] ${message}`));
  const built = await buildFilm(opts.filmDir, opts.cacheDir);
  const worker = await openWorker(built.htmlPath, 1, null, log);
  try {
    return await worker.page.evaluate(
      ({ t, selectors }) => {
        const motion = (window as unknown as { __motion: MotionApi }).__motion;
        const rects: Record<string, { x: number; y: number; w: number; h: number } | string> = {};
        for (const selector of selectors) {
          try {
            rects[selector] = motion.debug.rect(selector, t);
          } catch (error) {
            rects[selector] = String(error);
          }
        }
        return { view: motion.debug.view(t), rects };
      },
      { t: opts.t, selectors: opts.selectors },
    );
  } finally {
    await closeAll([worker]);
  }
};

export type CameraSamples = {
  samples: Array<[number, number, number, number]>;
  moves: Array<[number, number]>;
  width: number;
  height: number;
};

// The camera's path sampled every `dt` seconds, for the lint command.
export const sampleCamera = async (opts: {
  filmDir: string;
  cacheDir: string;
  dt: number;
  log?: (message: string) => void;
}): Promise<CameraSamples> => {
  const log = opts.log ?? ((message: string) => console.log(`[motion] ${message}`));
  const built = await buildFilm(opts.filmDir, opts.cacheDir);
  const worker = await openWorker(built.htmlPath, 1, null, log);
  try {
    const data = await worker.page.evaluate(
      (dt) => (window as unknown as { __motion: MotionApi }).__motion.debug.camera(dt),
      opts.dt,
    );
    return { ...data, width: worker.info.width, height: worker.info.height };
  } finally {
    await closeAll([worker]);
  }
};
