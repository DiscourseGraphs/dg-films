import type { Rect, Viewport } from "../engine/camera-math";
import type { Film } from "../engine/runtime";
import { typingCurve } from "../engine/typing";

// Scene helpers: small pure rules and thin wrappers over the engine, written once
// so every film frames, lifts and pulls the same way.

export type Region = (t: number) => Rect;
type Pad = number | { x: number; y: number };

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;

// ------------------------------------------------------------- finding rows

// The row of a block (kit blocks; a film's own `.row` works too).
export const rowOf = (block: Element): HTMLElement => {
  const row = block.querySelector<HTMLElement>(":scope > .k-row, :scope > .row");
  if (!row) throw new Error("block has no row");
  return row;
};

// A block's children container.
export const kidsOf = (block: Element): HTMLElement => {
  const kids = block.querySelector<HTMLElement>(":scope > .k-kids, :scope > .kids");
  if (!kids) throw new Error("block has no children");
  return kids;
};

// The text span of a block's row: what f.type writes into. It keeps a minimum height, so a
// row that is still empty does not collapse and shove the blocks below it.
export const txtOf = (block: Element): HTMLElement => {
  const txt = rowOf(block).querySelector<HTMLElement>(":scope > .k-txt");
  if (!txt) throw new Error("block has no text span");
  return txt;
};

// -------------------------------------------------------------- small moves

// Fade something in with a short rise.
export const reveal = (f: Film, el: Element | Element[], at: number, dur = 0.5, rise = 8): number =>
  f.to(el, { opacity: [0, 1], y: [rise, 0] }, { at, dur, ease: "arrive" });

// A ring that blinks to say "this one".
export const pulse = (f: Film, ring: Element, halo: Element, at: number): void => {
  f.to(ring, { scale: [1, 1.24] }, { at, dur: 0.2, ease: "outCubic" });
  f.to(ring, { scale: 1 }, { at: at + 0.2, dur: 0.55, ease: "outBack" });
  f.to(halo, { opacity: [0, 1], scale: [0.7, 1.15] }, { at, dur: 0.3, ease: "outCubic" });
  f.to(halo, { opacity: 0 }, { at: at + 0.3, dur: 0.5, ease: "outQuad" });
};

// Fade something out with a short drift up; the other half of reveal().
export const fadeOut = (f: Film, el: Element | Element[], at: number, dur = 0.3, rise = -6): number =>
  f.to(el, { opacity: 0, y: rise }, { at, dur, ease: "outQuad" });

// One page gives way to another in the same window: the first fades out as the
// second (made with `hidden: true`) fades in.
export const crossfade = (f: Film, out: Element, into: Element, at: number, dur = 0.3): number => {
  f.to(out, { opacity: 0 }, { at, dur, ease: "outQuad" });
  return f.to(into, { opacity: 1 }, { at, dur, ease: "outQuad" });
};

// A dialog opens over its scrim: the scrim fades in, the dialog rises into place.
export const openDialog = (f: Film, dialog: Element, scrim: Element | null, at: number): number => {
  if (scrim) f.to(scrim, { opacity: [0, 1] }, { at, dur: 0.4, ease: "outQuad" });
  return f.to(dialog, { opacity: [0, 1], y: [14, 0] }, { at, dur: 0.5, ease: "arrive" });
};

export const closeDialog = (f: Film, dialog: Element, scrim: Element | null, at: number): number => {
  if (scrim) f.to(scrim, { opacity: 0 }, { at, dur: 0.35, ease: "outQuad" });
  return fadeOut(f, dialog, at, 0.35, -8);
};

// Type into a field that shows a placeholder until the first character lands.
// Returns when the typing ends. See also charTimes() for reacting to each key.
export const typeInto = (
  f: Film,
  field: { typed: Element; placeholder?: Element },
  text: string,
  opts: { at: number; dur: number },
): number => {
  if (field.placeholder) f.to(field.placeholder, { opacity: [1, 0] }, { at: opts.at, dur: 0.05, ease: "linear" });
  return f.type(field.typed, text, opts);
};

// A block's row arrives and its text types itself in. The text is plain: markup in the row is replaced.
export const typeBlock = (f: Film, block: Element, text: string, opts: { at: number; dur: number }): number => {
  reveal(f, rowOf(block), opts.at - 0.1, 0.3, 4);
  return f.type(txtOf(block), text, opts);
};

// Move the pointer to something and press it. Returns when the press lands.
export const clickOn = (
  f: Film,
  target: Element | string,
  opts: {
    at: number;
    dur?: number;
    anchor?: { x: number; y: number };
    offset?: { x: number; y: number };
    settle?: number;
  },
): number => {
  const dur = opts.dur ?? 0.9;
  f.cursor.to(target, { at: opts.at, dur, anchor: opts.anchor, offset: opts.offset });
  const click = opts.at + dur + (opts.settle ?? 0.2);
  f.cursor.click(click);
  return click;
};

// Times at which each character of a typed string shows, matching f.type().
export const charTimes = (text: string, at: number, dur: number, seed = 7): number[] => {
  const curve = typingCurve(text, seed);
  return [...text].map((_, i) => at + curve[i + 1] * dur);
};

// -------------------------------------------------------------- focus pull

// The most a pull may dim the frame. A heavier dim makes the frame pump, and a
// device used on every shot stops being one: pull about six times in a film.
export const PULL_DIM = 0.05;

export const pullDim = (dim: number = PULL_DIM): number => Math.min(PULL_DIM, Math.max(0, dim));

// Everything but the target blurs and dims by a breath (5%) for `hold` seconds,
// then lets go. Returns when it is gone.
export const pull = (
  f: Film,
  target: Element | string | Rect | Region,
  opts: { at: number; hold: number; pad?: Pad; radius?: number; blur?: number; dim?: number },
): number => {
  f.focus.on(target, {
    at: opts.at,
    dur: 0.8,
    pad: opts.pad ?? { x: 14, y: 8 },
    radius: opts.radius ?? 10,
    blur: opts.blur ?? 5,
    dim: pullDim(opts.dim),
  });
  return f.focus.off({ at: opts.at + 0.8 + opts.hold, dur: 0.6 });
};

// --------------------------------------------------------------- the rail's room

// A rail sits 16 units from the bottom-left corner and is 28 tall; keep this much
// of the frame (140 px at 1080p) free under every shot's content.
export const SAFE_BOTTOM = 90;

// The region to hand the camera so `base` ends up with `safe` units of the frame
// clear below it. The camera fits a region to the frame with `pad` kept clear;
// growing the region downward by safe/zoom adds exactly `safe` units of frame
// under the content at the zoom it ends with. Zoom is the smaller of the width fit
// and the height fit of the grown region, which has a closed form.
export const liftRect = (base: Rect, viewport: Viewport, pad: Pad = 0.05, safe = SAFE_BOTTOM): Rect => {
  const padX = typeof pad === "number" ? pad : pad.x;
  const padY = typeof pad === "number" ? pad : pad.y;
  const zoomByWidth = (viewport.w * (1 - 2 * padX)) / base.w;
  const zoomByHeight = (viewport.h * (1 - 2 * padY) - safe) / base.h;
  const zoom = Math.min(zoomByWidth, zoomByHeight);
  if (!Number.isFinite(zoom) || zoom <= 0) return base;
  return { ...base, h: base.h + safe / zoom };
};

// A region lifted by the safe area. Hand it to f.camera.to with the same `pad`.
export const lift =
  (f: Film, region: Region, pad: Pad = 0.05, safe = SAFE_BOTTOM): Region =>
  (t) =>
    liftRect(region(t), f.viewport, pad, safe);

// ---------------------------------------------------------------- regions

export type Margin = { l?: number; r?: number; t?: number; b?: number };

// The box around some rects, with room around it.
export const unionRect = (rects: Rect[], margin: Margin = {}): Rect => {
  const x0 = Math.min(...rects.map((r) => r.x)) - (margin.l ?? 0);
  const y0 = Math.min(...rects.map((r) => r.y)) - (margin.t ?? 0);
  const x1 = Math.max(...rects.map((r) => r.x + r.w)) + (margin.r ?? 0);
  const y1 = Math.max(...rects.map((r) => r.y + r.h)) + (margin.b ?? 0);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

// A camera target that follows an element, or the box around several, as they
// are at the time the move ends.
export const around =
  (f: Film, target: Element | Element[], margin: Margin = {}): Region =>
  (t) =>
    unionRect(
      (Array.isArray(target) ? target : [target]).map((el) => f.rectAt(el, t)),
      margin,
    );

// From the top of one rect to the bottom of another, with margin.
export const spanRect = (a: Rect, b: Rect, margin: { x: number; top: number; bottom: number }): Rect => {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x + a.w, b.x + b.w);
  return {
    x: x0 - margin.x,
    y: a.y - margin.top,
    w: x1 - x0 + margin.x * 2,
    h: b.y + b.h - a.y + margin.top + margin.bottom,
  };
};

export const spanning =
  (f: Film, from: Element, to: Element, margin: { x: number; top: number; bottom: number }): Region =>
  (t) =>
    spanRect(f.rectAt(from, t), f.rectAt(to, t), margin);

// A slice of a sidebar, widened to the left so the page being driven stays in the
// shot. The left edge falls in the margin between the page's text and the
// sidebar (the Roam page keeps 130 units clear there), never through a word.
export const sideRect = (side: Rect, o: { left: number; top: number; h: number }): Rect => ({
  x: side.x - o.left,
  y: side.y + o.top,
  w: side.w + o.left,
  h: o.h,
});

export const sidebarRegion =
  (f: Film, roam: { side: Element | null }, o: { left: number; top: number; h: number }): Region =>
  (t) => {
    if (!roam.side) throw new Error("this Roam window has no sidebar");
    return sideRect(f.rectAt(roam.side, t), o);
  };
