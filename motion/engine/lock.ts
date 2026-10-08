// A queue for renders on one machine. `render` and `preview` each open several
// headed Chromium windows and use every core, so two at once slow each other
// down and fight over the screen. The first takes a lock file; the rest wait
// and look again every few seconds. The lock records who holds it, so one left
// behind by a process that is gone (killed, crashed) is taken over, never
// waited on.

import fs from "node:fs";
import path from "node:path";

export type LockHolder = { pid: number; film: string; command: string; startedAt: string };

export type LockDeps = {
  // This process's id, and whether a given process is running.
  pid: number;
  alive: (pid: number) => boolean;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
  // How often a waiter looks again.
  pollMs: number;
  // How long a lock file nobody can read is assumed to be mid-write.
  graceMs: number;
};

export const pidAlive = (pid: number): boolean => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
};

export const lockDeps = (overrides: Partial<LockDeps> = {}): LockDeps => ({
  pid: process.pid,
  alive: pidAlive,
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log: (message) => console.log(`[motion] ${message}`),
  pollMs: 3000,
  graceMs: 2000,
  ...overrides,
});

// output/motion/.render.lock, or MOTION_RENDER_LOCK when that is set.
export const lockPath = (outputRoot: string): string =>
  process.env.MOTION_RENDER_LOCK ? path.resolve(process.env.MOTION_RENDER_LOCK) : path.join(outputRoot, ".render.lock");

export const clockTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "?";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export const waitingMessage = (holder: LockHolder): string =>
  `waiting for ${holder.film} ${holder.command} started ${clockTime(holder.startedAt)} (pid ${holder.pid})`;

const parseHolder = (text: string): LockHolder | null => {
  try {
    const value = JSON.parse(text) as Partial<LockHolder>;
    return typeof value.pid === "number" &&
      typeof value.film === "string" &&
      typeof value.command === "string" &&
      typeof value.startedAt === "string"
      ? { pid: value.pid, film: value.film, command: value.command, startedAt: value.startedAt }
      : null;
  } catch {
    return null;
  }
};

type Seen = { holder: LockHolder | null; mtimeMs: number };

// The lock as it is now: null when there is none.
const inspect = (file: string): Seen | null => {
  try {
    const mtimeMs = fs.statSync(file).mtimeMs;
    return { holder: parseHolder(fs.readFileSync(file, "utf8")), mtimeMs };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
};

const sameLock = (a: Seen, b: Seen): boolean =>
  a.holder && b.holder
    ? a.holder.pid === b.holder.pid && a.holder.startedAt === b.holder.startedAt
    : a.holder === b.holder && a.mtimeMs === b.mtimeMs;

// Remove a lock we judged stale, unless someone else has taken it over since we looked.
const dropIfUnchanged = (file: string, seen: Seen): void => {
  const now = inspect(file);
  if (now && sameLock(seen, now)) fs.rmSync(file, { force: true });
};

// O_CREAT | O_EXCL: of any number of processes asking at once, exactly one gets it.
const create = (file: string, holder: LockHolder): boolean => {
  let fd: number;
  try {
    fd = fs.openSync(file, "wx");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
  try {
    fs.writeSync(fd, `${JSON.stringify(holder)}\n`);
  } catch (error) {
    fs.closeSync(fd);
    fs.rmSync(file, { force: true });
    throw error;
  }
  fs.closeSync(fd);
  return true;
};

export type LockHandle = { holder: LockHolder; release: () => void };

const handleFor = (file: string, holder: LockHolder): LockHandle => {
  let held = true;
  return {
    holder,
    // Synchronous so a signal handler or an exit handler can call it. Only a lock
    // that still names this process is removed.
    release: () => {
      if (!held) return;
      held = false;
      try {
        const now = inspect(file);
        if (now?.holder && now.holder.pid === holder.pid && now.holder.startedAt === holder.startedAt)
          fs.rmSync(file, { force: true });
      } catch {
        // A lock that can't be removed is taken over once this process is gone.
      }
    },
  };
};

export const acquireLock = async (
  file: string,
  who: { film: string; command: string },
  deps: LockDeps = lockDeps(),
): Promise<LockHandle> => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const holder: LockHolder = {
    pid: deps.pid,
    film: who.film,
    command: who.command,
    startedAt: deps.now().toISOString(),
  };
  const announced = new Set<string>();
  for (;;) {
    if (create(file, holder)) return handleFor(file, holder);
    const seen = inspect(file);
    // Released between our two looks: ask again at once.
    if (seen === null) continue;
    const other = seen.holder;
    if (other === null) {
      // Empty or garbled: either its owner is between creating and writing it, or it is junk.
      if (deps.now().getTime() - seen.mtimeMs < deps.graceMs) {
        await deps.sleep(100);
        continue;
      }
      deps.log("taking over a lock file nobody can read");
      dropIfUnchanged(file, seen);
      continue;
    }
    // A lock naming this very process is a leftover of an earlier one that had the same pid.
    if (other.pid === deps.pid || !deps.alive(other.pid)) {
      deps.log(`taking over the lock from ${other.film} ${other.command} (pid ${other.pid} is gone)`);
      dropIfUnchanged(file, seen);
      continue;
    }
    const key = `${other.pid}@${other.startedAt}`;
    if (!announced.has(key)) {
      announced.add(key);
      deps.log(waitingMessage(other));
    }
    await deps.sleep(deps.pollMs);
  }
};

// What a process needs of its host to give the lock up on its way out.
export type SignalHost = {
  on: (event: string, listener: () => void) => unknown;
  off: (event: string, listener: () => void) => unknown;
  listeners: (event: string) => unknown[];
  exit: (code: number) => unknown;
};

const processHost: SignalHost = {
  on: (event, listener) => process.on(event, listener),
  off: (event, listener) => process.off(event, listener),
  listeners: (event) => process.listeners(event as NodeJS.Signals),
  exit: (code) => process.exit(code),
};

const SIGNALS: Array<[name: string, exitCode: number]> = [
  ["SIGINT", 130],
  ["SIGTERM", 143],
  ["SIGHUP", 129],
];

// Give the lock up when the process is told to stop, or exits by any route that
// runs exit handlers. Playwright installs a SIGINT handler of its own while a
// browser is open, closes the browsers and exits; this leaves that alone, and
// exits itself only when nothing else is going to. Returns the undo.
export const releaseOnSignals = (release: () => void, host: SignalHost = processHost): (() => void) => {
  const installed = SIGNALS.map(([name, code]) => {
    const handler = (): void => {
      release();
      if (host.listeners(name).every((listener) => listener === handler)) host.exit(code);
    };
    host.on(name, handler);
    return { name, handler };
  });
  host.on("exit", release);
  return () => {
    for (const { name, handler } of installed) host.off(name, handler);
    host.off("exit", release);
  };
};

// Wait for the lock, run, and give it up however the run ends.
export const withRenderLock = async <T>(
  file: string,
  who: { film: string; command: string },
  run: () => Promise<T>,
  deps: LockDeps = lockDeps(),
  host: SignalHost = processHost,
): Promise<T> => {
  let handle: LockHandle | undefined;
  const stop = releaseOnSignals(() => handle?.release(), host);
  try {
    handle = await acquireLock(file, who, deps);
    return await run();
  } finally {
    handle?.release();
    stop();
  }
};
