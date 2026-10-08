import { html, type Film } from "../engine/runtime";
import lockupSvg from "./assets/dg-lockup.svg";
import { logoPaths } from "./dg-logo";
import { lockupHtml, type LockupSpec } from "./lockup-markup";

// The title lockup: the brand over a frosted veil, then (at the end) a solid sheet
// the whole film fades out through.

export type Lockup = {
  mode: "dg" | "word";
  // Frosted sheet over the picture; the lockup sits on it.
  veil: HTMLElement;
  root: HTMLElement;
  // Solid, over everything: end the film by fading this in.
  fade: HTMLElement;
  // dg: the glyph. word: the logo square.
  mark: HTMLElement;
  // dg: the wordmark's wrapper (wipes on). word: the row of letters.
  word: HTMLElement;
  letters: HTMLElement[];
  check: SVGPathElement | null;
  // The pieces of the line under the brand.
  parts: HTMLElement[];
};

export const buildLockup = (f: Film, spec: LockupSpec = {}): Lockup => {
  const mode = spec.brand ?? "dg";
  const veil = document.createElement("div");
  veil.className = "k-veil";
  const root = html(lockupHtml(spec, logoPaths(lockupSvg)));
  const fade = document.createElement("div");
  fade.className = "k-endfade";
  f.overlay.append(veil, root, fade);
  return {
    mode,
    veil,
    root,
    fade,
    mark: f.q(mode === "dg" ? ".k-lock-glyph" : ".k-lock-logo", root),
    word: f.q(mode === "dg" ? ".k-lock-wordwrap" : ".k-lock-letters", root),
    letters: mode === "word" ? f.qa(".k-lock-letters span:not(.k-sp)", root) : [],
    check: mode === "word" ? (f.q(".k-lock-logo path", root) as unknown as SVGPathElement) : null,
    parts: spec.sub?.length ? f.qa(".k-lock-sub > *", root) : [],
  };
};

// The brand arrives: the veil comes up, the mark turns or springs in, the name
// wipes or types on, the line under it rises. Returns when it has all landed.
export const lockupIn = (f: Film, lock: Lockup, at: number, opts: { veil?: boolean } = {}): number => {
  if (opts.veil !== false) f.to(lock.veil, { opacity: [0, 1] }, { at: at - 0.2, dur: 0.9, ease: "outCubic" });
  // y and blur are reset too: lockupOut leaves the root lifted and blurred, and a second arrival must not inherit that.
  f.to(lock.root, { opacity: [0, 1], y: [0, 0], blur: [0, 0] }, { at, dur: 0.35, ease: "outQuad" });
  let end: number;
  if (lock.mode === "dg") {
    f.to(
      lock.mark,
      { opacity: [0, 1], scale: [0.62, 1], rotate: [-26, 0] },
      { at: at + 0.1, dur: 1.4, ease: "spring(.3)" },
    );
    f.to(lock.word, { clipRight: ["100%", "0%"] }, { at: at + 0.6, dur: 1.0, ease: "outCubic" });
    end = at + 1.6;
  } else {
    f.to(lock.mark, { scale: [0.66, 1], opacity: [0, 1] }, { at, dur: 1.1, ease: "spring(.4)" });
    if (lock.check) f.to(lock.check, { draw: [0, 1] }, { at: at + 0.55, dur: 0.6, ease: "outCubic" });
    f.to(
      lock.letters,
      { opacity: [0, 1], y: [24, 0], blur: [10, 0] },
      { at: at + 0.3, dur: 0.9, ease: "arrive", stagger: 0.055 },
    );
    f.sound("bloom", at + 0.35, { gain: 0 });
    end = at + 1.3;
  }
  if (lock.parts.length) {
    f.to(
      lock.parts,
      { opacity: [0, 1], y: [16, 0], blur: [8, 0] },
      { at: at + 1.5, dur: 0.8, ease: "arrive", stagger: 0.2 },
    );
    end = at + 2.3 + 0.2 * (lock.parts.length - 1);
  }
  return end;
};

// A slow drift of scale while the lockup holds, so a still frame is not dead.
export const lockupHold = (f: Film, lock: Lockup, at: number, dur: number, to = 1.02): void => {
  f.to(lock.root, { scale: [1, to] }, { at, dur, ease: "inOutSine" });
};

// The brand leaves, then the veil lifts, so the two never overlap the page.
export const lockupOut = (f: Film, lock: Lockup, at: number, opts: { veil?: boolean } = {}): number => {
  f.to(lock.root, { opacity: 0, y: -10, blur: 8 }, { at, dur: 0.4, ease: "inCubic" });
  if (opts.veil === false) return at + 0.4;
  f.to(lock.veil, { opacity: 0 }, { at: at + 0.4, dur: 0.6, ease: "outQuad" });
  return at + 1.0;
};

// The end: a solid sheet fades in over everything.
export const endFade = (f: Film, lock: Lockup, at: number, dur = 0.7): number =>
  f.to(lock.fade, { opacity: [0, 1] }, { at, dur, ease: "inOutQuad" });
