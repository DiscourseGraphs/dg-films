// The browser side of the motion engine. A film is DOM plus a timeline: tweens
// on elements, a camera over a world, a cursor, a focus pull. Nothing runs on
// its own clock. window.__motion.seek(t) puts every element where the timeline
// says it is at t seconds, so the renderer can step the film frame by frame.
//
// Elements sit in the world at world coordinates; the camera is one transform
// on the world. The focus scrim, overlay and any heads-up display live in
// screen space above it.

import {
  blurSpread,
  fitRect,
  flyPath,
  isRect,
  isView,
  lerpView,
  pathThrough,
  worldToScreen,
  type FitMode,
  type Knot,
  type Rect,
  type View,
} from "./camera-math";
import { resolveEase, type Ease, type EaseSpec } from "./easing";
import { hashOf, seeded } from "./prng";
import { PropTrack, type Value } from "./tracks";
import { charsAt, typingCurve } from "./typing";
import type { Beat, Cue, MotionApi, MotionInfo, SoundCue, SoundKind } from "./types";

type StyleEl = (HTMLElement | SVGElement) & ElementCSSInlineStyle;

export type Target = Element | readonly Element[] | ArrayLike<Element> | string;

export type PropSpec =
  | Value
  | readonly [from: Value, to: Value]
  | { from?: Value; to: Value; ease?: EaseSpec; dur?: number; delay?: number };

export type Props = Record<string, PropSpec>;

export type TweenOpts = {
  at: number;
  dur?: number;
  ease?: EaseSpec;
  // Seconds between each element's start when the target matches several.
  stagger?: number;
};

export type FilmOptions = {
  title: string;
  width: number;
  height: number;
  fps: number;
  // Hold on the last frame this long past the last thing that moves.
  tail?: number;
  // Pin the length instead of deriving it.
  duration?: number;
};

type Point = { x: number; y: number };

const BASE_CSS = `
html, body { margin: 0; padding: 0; overflow: hidden; background: #fff; }
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent; }
.mo-stage { position: fixed; left: 0; top: 0; overflow: hidden; isolation: isolate; }
.mo-cam { position: absolute; }
.mo-world { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-origin: 0 0; }
.mo-scrim, .mo-ring, .mo-overlay { position: absolute; left: 0; top: 0; pointer-events: none; }
.mo-scrim { width: 100%; height: 100%; opacity: 0; }
.mo-ring { opacity: 0; box-sizing: border-box; }
.mo-overlay { width: 100%; height: 100%; }
.mo-cursor { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; opacity: 0; z-index: 1000; }
.mo-cursor svg { position: absolute; left: -3px; top: -2px; display: block; overflow: visible;
  filter: drop-shadow(0 2px 3px rgba(20, 24, 33, .28)); transform-origin: 3px 2px; scale: var(--press, 1); }
.mo-ripple { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; opacity: 0; z-index: 999; }
.mo-ripple i { position: absolute; left: -22px; top: -22px; width: 44px; height: 44px; border-radius: 50%;
  border: 2px solid rgba(44, 98, 201, .75); background: rgba(44, 98, 201, .12); box-sizing: border-box; }
`;

const CURSOR_SVG = `<svg width="26" height="30" viewBox="0 0 26 30"><path d="M3 2v20.4l5.3-4.7 3.3 7.6 3.6-1.6-3.3-7.4 7.1-.4z" fill="#141821" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/></svg>`;

const UNITLESS = new Set(["opacity", "zIndex", "fontWeight", "lineHeight", "flexGrow", "flexShrink", "order"]);

const VIRTUAL_DEFAULTS: Record<string, Value> = {
  x: 0,
  y: 0,
  z: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  skewX: 0,
  skewY: 0,
  perspective: 0,
  blur: 0,
  backdropBlur: 0,
  brightness: 1,
  contrast: 1,
  saturate: 1,
  hue: 0,
  grayscale: 0,
  draw: 1,
  clipTop: 0,
  clipRight: 0,
  clipBottom: 0,
  clipLeft: 0,
  clipRadius: 0,
};

const PX_OR_NUMBER = /^(-?\d*\.?\d+)(px)?$/;

const length = (value: Value): string => (typeof value === "number" ? `${value}px` : value);
const asNumber = (value: Value | undefined, fallback: number): number =>
  value === undefined ? fallback : Number(value);

class ElementNode {
  readonly tracks = new Map<string, PropTrack>();
  private last = "";

  constructor(readonly el: StyleEl) {
    if (el instanceof SVGGeometryElement) el.setAttribute("pathLength", "1");
  }

  track(prop: string): PropTrack {
    let track = this.tracks.get(prop);
    if (!track) {
      track = new PropTrack(this.baseOf(prop));
      this.tracks.set(prop, track);
    }
    return track;
  }

  private baseOf(prop: string): Value {
    if (prop in VIRTUAL_DEFAULTS) return VIRTUAL_DEFAULTS[prop];
    const computed = getComputedStyle(this.el);
    const raw = prop.startsWith("--")
      ? computed.getPropertyValue(prop).trim()
      : computed.getPropertyValue(toKebab(prop)).trim();
    if (raw === "") return 0;
    const numeric = PX_OR_NUMBER.exec(raw);
    return numeric ? Number(numeric[1]) : raw;
  }

  apply(t: number): void {
    const values: Record<string, Value> = {};
    let signature = "";
    for (const [prop, track] of this.tracks) {
      const value = track.valueAt(t);
      values[prop] = value;
      signature += `${prop}=${value};`;
    }
    if (signature === this.last) return;
    this.last = signature;
    writeStyle(this.el, values);
  }
}

const toKebab = (name: string): string => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

const writeStyle = (el: StyleEl, values: Record<string, Value>): void => {
  const style = el.style;
  const has = (key: string): boolean => key in values;
  const n = (key: string, fallback: number): number => asNumber(values[key], fallback);

  if (has("x") || has("y") || has("z")) {
    style.translate = has("z") ? `${n("x", 0)}px ${n("y", 0)}px ${n("z", 0)}px` : `${n("x", 0)}px ${n("y", 0)}px`;
  }
  if (has("rotate")) style.rotate = `${n("rotate", 0)}deg`;
  if (has("scale") || has("scaleX") || has("scaleY")) {
    const uniform = n("scale", 1);
    style.scale = `${n("scaleX", uniform)} ${n("scaleY", uniform)}`;
  }
  if (has("rotateX") || has("rotateY") || has("skewX") || has("skewY") || has("perspective")) {
    const parts: string[] = [];
    if (n("perspective", 0) > 0) parts.push(`perspective(${n("perspective", 0)}px)`);
    if (has("rotateX")) parts.push(`rotateX(${n("rotateX", 0)}deg)`);
    if (has("rotateY")) parts.push(`rotateY(${n("rotateY", 0)}deg)`);
    if (has("skewX")) parts.push(`skewX(${n("skewX", 0)}deg)`);
    if (has("skewY")) parts.push(`skewY(${n("skewY", 0)}deg)`);
    style.transform = parts.join(" ");
  }
  if (has("opacity")) style.opacity = String(n("opacity", 1));

  const filters: string[] = [];
  if (has("blur")) filters.push(`blur(${n("blur", 0)}px)`);
  if (has("brightness")) filters.push(`brightness(${n("brightness", 1)})`);
  if (has("contrast")) filters.push(`contrast(${n("contrast", 1)})`);
  if (has("saturate")) filters.push(`saturate(${n("saturate", 1)})`);
  if (has("hue")) filters.push(`hue-rotate(${n("hue", 0)}deg)`);
  if (has("grayscale")) filters.push(`grayscale(${n("grayscale", 0)})`);
  if (filters.length) style.filter = filters.join(" ");
  if (has("backdropBlur"))
    style.backdropFilter = n("backdropBlur", 0) > 0.01 ? `blur(${n("backdropBlur", 0)}px)` : "none";

  if (has("clipTop") || has("clipRight") || has("clipBottom") || has("clipLeft") || has("clipRadius")) {
    const side = (key: string): string => length(values[key] ?? 0);
    style.clipPath = `inset(${side("clipTop")} ${side("clipRight")} ${side("clipBottom")} ${side("clipLeft")} round ${side("clipRadius")})`;
  }
  if (has("draw")) {
    style.strokeDasharray = "1 1";
    style.strokeDashoffset = String(1 - n("draw", 1));
  }
  for (const [prop, value] of Object.entries(values)) {
    if (prop in VIRTUAL_DEFAULTS) continue;
    if (prop.startsWith("--")) {
      style.setProperty(prop, String(value));
    } else {
      const css = typeof value === "number" && !UNITLESS.has(prop) ? `${value}px` : String(value);
      style.setProperty(toKebab(prop), css);
    }
  }
};

type Seg<T> = { t0: number; t1: number; from: T | undefined; to: T; ease: Ease };

const evalSegments = <T>(segments: readonly Seg<T>[], t: number, base: T, mix: (a: T, b: T, p: number) => T): T => {
  if (!segments.length) return base;
  let found = -1;
  for (let i = 0; i < segments.length; i += 1) {
    if (segments[i].t0 <= t) found = i;
    else break;
  }
  if (found < 0) return segments[0].from ?? base;
  const segment = segments[found];
  if (t >= segment.t1) return segment.to;
  const from = segment.from ?? (found > 0 ? segments[found - 1].to : base);
  return mix(from, segment.to, segment.ease((t - segment.t0) / (segment.t1 - segment.t0)));
};

const insertSorted = <T extends { t0: number }>(list: T[], item: T): void => {
  let index = list.length;
  while (index > 0 && list[index - 1].t0 > item.t0) index -= 1;
  list.splice(index, 0, item);
};

// Where to point the camera or the focus: an element or selector (measured as it
// will be when the move ends), a world rect or view, or a function that returns
// a rect for the time it is asked about.
export type RectSource = (t: number) => Rect;

export type CameraOpts = {
  at: number;
  dur?: number;
  ease?: EaseSpec;
  // "fly" arcs between distant views; "lerp" is a plain pan with exponential zoom.
  mode?: "fly" | "lerp";
  rho?: number;
  // Clear space left around the target, as a fraction of the frame.
  pad?: number | { x: number; y: number };
  fit?: FitMode;
  // Set the zoom outright, or scale the fitted zoom.
  zoom?: number;
  zoomBy?: number;
  // Nudge the final view, in world units.
  shift?: Point;
  // Where in the frame the target's center lands, as fractions (default .5, .5).
  anchor?: Point;
  // A fast move gets a whoosh in the soundtrack unless this is false.
  sound?: boolean;
};

// One leg of a camera path: where to be `dur` seconds after the previous key.
export type PathLeg = Pick<CameraOpts, "pad" | "fit" | "zoom" | "zoomBy" | "shift" | "anchor"> & {
  dur: number;
  target: Element | string | Rect | View | RectSource | null;
};

type CameraSegment = Seg<View> & {
  mode: "fly" | "lerp" | "path";
  rho: number;
  path?: (t: number) => View;
  quiet?: boolean;
};

class Camera {
  private readonly segments: CameraSegment[] = [];
  private initial: View;
  private readonly flies = new WeakMap<CameraSegment, (u: number) => View>();

  constructor(
    private readonly film: Film,
    private readonly viewport: { w: number; h: number },
  ) {
    this.initial = { cx: viewport.w / 2, cy: viewport.h / 2, zoom: 1 };
  }

  // Frame `target` from the first frame on, without a move.
  start(
    target: Element | string | Rect | View | RectSource,
    opts: Omit<CameraOpts, "at" | "dur" | "ease" | "mode" | "rho"> = {},
  ): void {
    this.film.job(0, () => {
      this.initial = this.resolve(target, opts, 0, undefined);
    });
  }

  // Move to `target` (an element, a world rect, a view, or null to stay put and
  // only apply zoomBy, shift and the like). Targets are measured as they will
  // be when the move ends.
  to(target: Element | string | Rect | View | RectSource | null, opts: CameraOpts): number {
    const dur = opts.dur ?? 1.2;
    this.film.job(opts.at, () => {
      const before = this.viewAt(opts.at);
      insertSorted(this.segments, {
        t0: opts.at,
        t1: opts.at + dur,
        from: before,
        to: this.resolve(target, opts, opts.at + dur, before),
        ease: resolveEase(opts.ease, "smooth"),
        mode: opts.mode ?? "fly",
        rho: opts.rho ?? 1.2,
        quiet: opts.sound === false,
      });
    });
    this.film.noteEnd(opts.at + dur);
    return opts.at + dur;
  }

  // One continuous move through several framings: from where the camera is at
  // `at`, through the target of each leg at its time, ending at rest on the
  // last. The camera does not stop at the keys in between, which is what makes
  // two moves one. Repeat a target to hold there.
  path(at: number, legs: PathLeg[], opts: { sound?: boolean } = {}): number {
    if (!legs.length) throw new Error("camera.path needs at least one leg");
    const end = at + legs.reduce((sum, leg) => sum + leg.dur, 0);
    this.film.job(at, () => {
      const start = this.viewAt(at);
      const knots: Knot[] = [{ t: at, view: start }];
      let t = at;
      for (const leg of legs) {
        t += leg.dur;
        knots.push({ t, view: this.resolve(leg.target, leg, t, knots[knots.length - 1].view) });
      }
      insertSorted(this.segments, {
        t0: at,
        t1: end,
        from: start,
        to: knots[knots.length - 1].view,
        ease: resolveEase("linear"),
        mode: "path",
        rho: 0,
        path: pathThrough(knots),
        quiet: opts.sound === false,
      });
    });
    this.film.noteEnd(end);
    return end;
  }

  private resolve(
    target: Element | string | Rect | View | RectSource | null,
    opts: Partial<CameraOpts>,
    measureAt: number,
    current: View | undefined,
  ): View {
    let view: View;
    if (target === null) {
      view = { ...(current ?? this.initial) };
    } else if (typeof target === "function") {
      view = fitRect(target(measureAt), this.viewport, opts.pad ?? 0.08, opts.fit ?? "contain");
    } else if (isView(target)) {
      view = { ...target };
    } else {
      const rect = isRect(target) ? target : this.film.rectAt(this.film.one(target), measureAt);
      view = fitRect(rect, this.viewport, opts.pad ?? 0.08, opts.fit ?? "contain");
    }
    if (opts.zoom !== undefined) view.zoom = opts.zoom;
    if (opts.zoomBy !== undefined) view.zoom *= opts.zoomBy;
    if (opts.anchor) {
      view.cx += (0.5 - opts.anchor.x) * (this.viewport.w / view.zoom);
      view.cy += (0.5 - opts.anchor.y) * (this.viewport.h / view.zoom);
    }
    if (opts.shift) {
      view.cx += opts.shift.x;
      view.cy += opts.shift.y;
    }
    return view;
  }

  moves(): Array<[number, number]> {
    return this.segments.map((segment) => [segment.t0, segment.t1]);
  }

  // Each move with whether the film asked it to be silent.
  details(): Array<{ t0: number; t1: number; quiet: boolean }> {
    return this.segments.map((segment) => ({ t0: segment.t0, t1: segment.t1, quiet: Boolean(segment.quiet) }));
  }

  viewAt(t: number): View {
    let found = -1;
    for (let i = 0; i < this.segments.length; i += 1) {
      if (this.segments[i].t0 <= t) found = i;
      else break;
    }
    if (found < 0) return this.initial;
    const segment = this.segments[found];
    if (t >= segment.t1) return segment.to;
    if (segment.path) return segment.path(t);
    const from = segment.from ?? (found > 0 ? this.segments[found - 1].to : this.initial);
    const p = segment.ease((t - segment.t0) / (segment.t1 - segment.t0));
    if (p <= 0) return from;
    if (p >= 1) return segment.to;
    if (segment.mode === "lerp") return lerpView(from, segment.to, p);
    let path = this.flies.get(segment);
    if (!path) {
      path = flyPath(from, segment.to, this.viewport, segment.rho);
      this.flies.set(segment, path);
    }
    return path(p);
  }
}

type CursorMove = { t0: number; t1: number; from: Point | undefined; to: Point; bend: number; ease: Ease };

export type CursorOpts = {
  at: number;
  dur?: number;
  ease?: EaseSpec;
  // Sideways bow of the path as a fraction of its length.
  bend?: number;
  // Where on the target the pointer lands, as fractions of its box.
  anchor?: Point;
  // World-unit nudge from that point.
  offset?: Point;
};

class Cursor {
  readonly el: HTMLElement;
  private readonly ripple: HTMLElement;
  private readonly moves: CursorMove[] = [];
  private readonly clicks: number[] = [];
  private placed: Point = { x: 0, y: 0 };
  private index = 0;
  private readonly body: HTMLElement;

  constructor(private readonly film: Film) {
    this.el = document.createElement("div");
    this.el.className = "mo-cursor";
    this.el.innerHTML = CURSOR_SVG;
    this.body = this.el;
    this.ripple = document.createElement("div");
    this.ripple.className = "mo-ripple";
    this.ripple.innerHTML = "<i></i>";
    film.world.append(this.ripple, this.el);
  }

  private point(
    target: Point | Element | string | ((t: number) => Point),
    opts: Pick<CursorOpts, "anchor" | "offset">,
    at: number,
  ): Point {
    const base: Point =
      typeof target === "function"
        ? target(at)
        : isPoint(target)
          ? target
          : (() => {
              const rect = this.film.rectAt(this.film.one(target), at);
              const anchor = opts.anchor ?? { x: 0.5, y: 0.5 };
              return { x: rect.x + rect.w * anchor.x, y: rect.y + rect.h * anchor.y };
            })();
    return { x: base.x + (opts.offset?.x ?? 0), y: base.y + (opts.offset?.y ?? 0) };
  }

  // Put the pointer somewhere without travelling there, and show it.
  place(
    target: Point | Element | string | ((t: number) => Point),
    opts: Pick<CursorOpts, "anchor" | "offset"> & { at: number },
  ): void {
    this.film.job(opts.at, () => {
      const to = this.point(target, opts, opts.at);
      insertSorted(this.moves, { t0: opts.at, t1: opts.at, from: undefined, to, bend: 0, ease: resolveEase("linear") });
    });
  }

  to(target: Point | Element | string | ((t: number) => Point), opts: CursorOpts): number {
    const dur = opts.dur ?? 0.9;
    this.film.job(opts.at, () => {
      const to = this.point(target, opts, opts.at + dur);
      insertSorted(this.moves, {
        t0: opts.at,
        t1: opts.at + dur,
        from: undefined,
        to,
        bend: opts.bend ?? (this.moves.length % 2 === 0 ? 0.1 : -0.1),
        ease: resolveEase(opts.ease, "smooth"),
      });
    });
    this.film.noteEnd(opts.at + dur);
    return opts.at + dur;
  }

  click(at: number): void {
    this.clicks.push(at);
    this.film.noteEnd(at + 0.6);
  }

  clickTimes(): number[] {
    return [...this.clicks].sort((a, b) => a - b);
  }

  show(at: number, dur = 0.25): void {
    this.film.to(this.el, { opacity: [0, 1] }, { at, dur, ease: "outQuad" });
  }

  hide(at: number, dur = 0.3): void {
    this.film.to(this.el, { opacity: 0 }, { at, dur, ease: "outQuad" });
  }

  positionAt(t: number): Point {
    if (!this.moves.length) return this.placed;
    let found = -1;
    for (let i = 0; i < this.moves.length; i += 1) {
      if (this.moves[i].t0 <= t) found = i;
      else break;
    }
    if (found < 0) return this.moves[0].from ?? this.moves[0].to;
    const move = this.moves[found];
    if (t >= move.t1) return move.to;
    const from = move.from ?? (found > 0 ? this.moves[found - 1].to : move.to);
    const p = move.ease((t - move.t0) / (move.t1 - move.t0));
    const dx = move.to.x - from.x;
    const dy = move.to.y - from.y;
    const control = { x: from.x + dx / 2 - dy * move.bend, y: from.y + dy / 2 + dx * move.bend };
    const q = 1 - p;
    return {
      x: q * q * from.x + 2 * q * p * control.x + p * p * move.to.x,
      y: q * q * from.y + 2 * q * p * control.y + p * p * move.to.y,
    };
  }

  apply(t: number, zoom: number): void {
    const position = this.positionAt(t);
    const counter = zoom ** -0.35;
    this.el.style.translate = `${position.x}px ${position.y}px`;
    this.el.style.scale = String(counter);
    let press = 1;
    let rippleAt = -1;
    for (const click of this.clicks) {
      const down = click - 0.07;
      const up = click + 0.1;
      if (t >= down && t <= up) {
        const phase = t < click ? (t - down) / 0.07 : 1 - (t - click) / 0.1;
        press = Math.min(press, 1 - 0.16 * Math.max(0, Math.min(1, phase)));
      }
      if (t >= click && t <= click + 0.6) rippleAt = click;
    }
    this.el.style.setProperty("--press", String(press));
    if (rippleAt >= 0) {
      const p = (t - rippleAt) / 0.6;
      const where = this.positionAt(rippleAt);
      this.ripple.style.translate = `${where.x}px ${where.y}px`;
      this.ripple.style.scale = String(counter * (0.35 + 1.1 * (1 - (1 - p) ** 3)));
      this.ripple.style.opacity = String(0.9 * (1 - p));
    } else {
      this.ripple.style.opacity = "0";
    }
  }
}

const isPair = (spec: PropSpec): spec is readonly [Value, Value] => Array.isArray(spec);

const isPoint = (value: unknown): value is Point =>
  typeof value === "object" &&
  value !== null &&
  "x" in value &&
  "y" in value &&
  !("w" in value) &&
  !(value instanceof Element);

export type FocusOpts = {
  at: number;
  dur?: number;
  ease?: EaseSpec;
  // Extra room around the target inside the sharp window, world units.
  pad?: number | { x: number; y: number };
  radius?: number;
  // Blur radius in frame units, and how dark the dimming gets (0..1).
  blur?: number;
  dim?: number;
};

type FocusRect = { x: number; y: number; w: number; h: number; r: number };

class Focus {
  private readonly scrim: HTMLElement;
  private readonly ring: HTMLElement;
  private readonly rects: Seg<FocusRect>[] = [];
  private readonly amounts: Seg<number>[] = [];
  private blur = 7;
  private dim = 0.32;

  constructor(
    private readonly film: Film,
    private readonly viewport: { w: number; h: number },
  ) {
    this.scrim = document.createElement("div");
    this.scrim.className = "mo-scrim";
    this.ring = document.createElement("div");
    this.ring.className = "mo-ring";
    film.stage.insertBefore(this.scrim, film.overlay);
    film.stage.insertBefore(this.ring, film.overlay);
  }

  // Sharpen `target` and blur and dim everything else, or move the sharp
  // window to a new target if one is already up (a rack focus).
  on(target: Element | string | Rect | RectSource, opts: FocusOpts): number {
    const dur = opts.dur ?? 0.7;
    this.film.job(opts.at, () => {
      const rect =
        typeof target === "function"
          ? target(opts.at + dur)
          : isRect(target)
            ? target
            : this.film.rectAt(this.film.one(target), opts.at + dur);
      const pad = typeof opts.pad === "number" ? { x: opts.pad, y: opts.pad } : (opts.pad ?? { x: 14, y: 8 });
      const to: FocusRect = {
        x: rect.x - pad.x,
        y: rect.y - pad.y,
        w: rect.w + pad.x * 2,
        h: rect.h + pad.y * 2,
        r: opts.radius ?? 12,
      };
      if (opts.blur !== undefined) this.blur = opts.blur;
      if (opts.dim !== undefined) this.dim = opts.dim;
      const ease = resolveEase(opts.ease, "smooth");
      // Already up (or fading): glide the sharp window to the new target.
      // Otherwise it opens in place and the scrim fades in around it.
      const raised = this.amountAt(opts.at) > 0.01;
      insertSorted(this.rects, { t0: opts.at, t1: raised ? opts.at + dur : opts.at, from: undefined, to, ease });
      insertSorted(this.amounts, { t0: opts.at, t1: opts.at + dur, from: raised ? undefined : 0, to: 1, ease });
    });
    this.film.noteEnd(opts.at + dur);
    return opts.at + dur;
  }

  off(opts: { at: number; dur?: number; ease?: EaseSpec }): number {
    const dur = opts.dur ?? 0.6;
    this.film.job(opts.at, () => {
      insertSorted(this.amounts, {
        t0: opts.at,
        t1: opts.at + dur,
        from: undefined,
        to: 0,
        ease: resolveEase(opts.ease, "smooth"),
      });
    });
    this.film.noteEnd(opts.at + dur);
    return opts.at + dur;
  }

  private amountAt(t: number): number {
    return evalSegments(this.amounts, t, 0, (a, b, p) => a + (b - a) * p);
  }

  apply(t: number, view: View): void {
    const amount = this.amountAt(t);
    if (amount < 0.002 || !this.rects.length) {
      this.scrim.style.opacity = "0";
      this.ring.style.opacity = "0";
      return;
    }
    const rect = evalSegments(this.rects, t, this.rects[0].to, (a, b, p) => ({
      x: a.x + (b.x - a.x) * p,
      y: a.y + (b.y - a.y) * p,
      w: a.w + (b.w - a.w) * p,
      h: a.h + (b.h - a.h) * p,
      r: a.r + (b.r - a.r) * p,
    }));
    const topLeft = worldToScreen(view, this.viewport, rect.x, rect.y);
    const w = rect.w * view.zoom;
    const h = rect.h * view.zoom;
    const r = Math.min(rect.r * view.zoom, w / 2, h / 2);
    const { w: W, h: H } = this.viewport;
    const { x, y } = topLeft;
    const outer = `M0 0H${W}V${H}H0Z`;
    const inner =
      `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
      `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
    this.scrim.style.opacity = "1";
    this.scrim.style.background = `rgba(16, 22, 36, ${this.dim * amount})`;
    this.scrim.style.backdropFilter = `blur(${this.blur * amount}px)`;
    this.scrim.style.clipPath = `path(evenodd, "${outer} ${inner}")`;
    this.ring.style.opacity = String(amount);
    this.ring.style.left = `${x}px`;
    this.ring.style.top = `${y}px`;
    this.ring.style.width = `${w}px`;
    this.ring.style.height = `${h}px`;
    this.ring.style.borderRadius = `${r}px`;
    this.ring.style.boxShadow = `0 0 0 1px rgba(255,255,255,.55), 0 ${18 * view.zoom}px ${50 * view.zoom}px rgba(10,16,30,${0.28 * amount})`;
  }
}

type FnTrack = { t0: number; t1: number; ease: Ease; run: (p: number, t: number) => void };
type ClassToggle = { el: Element; name: string; from: number; to: number };
type TextTrack = {
  el: Element;
  steps: Array<{ at: number; text: string }>;
  html: boolean;
  last: number;
  initial: string;
};

export class Film {
  readonly stage: HTMLElement;
  private readonly cam: HTMLElement;
  private readonly blur: SVGElement;
  readonly world: HTMLElement;
  readonly overlay: HTMLElement;
  readonly camera: Camera;
  readonly cursor: Cursor;
  readonly focus: Focus;
  readonly viewport: { w: number; h: number };

  private readonly nodes = new Map<Element, ElementNode>();
  private readonly fns: FnTrack[] = [];
  private readonly toggles: ClassToggle[] = [];
  private readonly texts: TextTrack[] = [];
  private readonly pending: Array<{ at: number; order: number; run: () => void }> = [];
  private readonly beats: Array<Omit<Beat, "end" | "cues">> = [];
  private readonly cues: Cue[] = [];
  private readonly sounds: SoundCue[] = [];
  private readonly typings: Array<{ el: Element; text: string; at: number; dur: number; seed: number }> = [];
  private latest = 0;

  constructor(readonly options: FilmOptions) {
    this.viewport = { w: options.width, h: options.height };
    this.stage = document.createElement("div");
    this.stage.className = "mo-stage";
    this.stage.style.width = `${options.width}px`;
    this.stage.style.height = `${options.height}px`;
    this.world = document.createElement("div");
    this.world.className = "mo-world";
    this.cam = document.createElement("div");
    this.cam.className = "mo-cam";
    this.cam.style.cssText = `left:${-CAM_MARGIN}px;top:${-CAM_MARGIN}px;width:${options.width + CAM_MARGIN * 2}px;height:${options.height + CAM_MARGIN * 2}px`;
    this.cam.append(this.world);
    this.overlay = document.createElement("div");
    this.overlay.className = "mo-overlay";
    this.stage.append(this.cam, this.overlay);
    document.body.append(this.stage);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="mo-blur" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feGaussianBlur id="mo-blur-g" stdDeviation="0 0"/></filter></svg>`,
    );
    this.blur = document.getElementById("mo-blur-g") as unknown as SVGElement;
    this.camera = new Camera(this, this.viewport);
    this.focus = new Focus(this, this.viewport);
    this.cursor = new Cursor(this);
  }

  // Finding things. These throw rather than return nothing, so a typo in a
  // scene shows up when the film builds and not as a missing animation.
  q<T extends Element = HTMLElement>(selector: string, root: ParentNode = this.stage): T {
    const found = root.querySelector<T>(selector);
    if (!found) throw new Error(`No element matches "${selector}"`);
    return found;
  }

  qa<T extends Element = HTMLElement>(selector: string, root: ParentNode = this.stage): T[] {
    const found = [...root.querySelectorAll<T>(selector)];
    if (!found.length) throw new Error(`No element matches "${selector}"`);
    return found;
  }

  one(target: Element | string): Element {
    return typeof target === "string" ? this.q(target) : target;
  }

  private resolve(target: Target): StyleEl[] {
    if (typeof target === "string") return this.qa<StyleEl>(target);
    if (target instanceof Element) return [target as StyleEl];
    return Array.from(target as ArrayLike<Element>) as StyleEl[];
  }

  private node(el: StyleEl): ElementNode {
    let node = this.nodes.get(el);
    if (!node) {
      node = new ElementNode(el);
      this.nodes.set(el, node);
    }
    return node;
  }

  // Tweens. `props` maps a property to its end value, a [from, to] pair, or
  // { from, to, ease, dur, delay } when one property needs its own timing.
  // Without a from, a property starts where its last tween left it. With one,
  // it holds that value until the tween starts.
  to(target: Target, props: Props, opts: TweenOpts): number {
    const els = this.resolve(target);
    const dur = opts.dur ?? 0.6;
    const defaultEase = resolveEase(opts.ease);
    const stagger = opts.stagger ?? 0;
    let end = opts.at;
    els.forEach((el, index) => {
      for (const [prop, spec] of Object.entries(props)) {
        let from: Value | undefined;
        let to: Value;
        let ease = defaultEase;
        let propDur = dur;
        let delay = 0;
        if (isPair(spec)) {
          from = spec[0];
          to = spec[1];
        } else if (typeof spec === "object") {
          const detailed = spec as { from?: Value; to: Value; ease?: EaseSpec; dur?: number; delay?: number };
          from = detailed.from;
          to = detailed.to;
          if (detailed.ease !== undefined) ease = resolveEase(detailed.ease);
          propDur = detailed.dur ?? dur;
          delay = detailed.delay ?? 0;
        } else {
          to = spec as Value;
        }
        const t0 = opts.at + index * stagger + delay;
        this.node(el)
          .track(prop)
          .add({ t0, t1: t0 + propDur, from, to, ease });
        end = Math.max(end, t0 + propDur);
      }
    });
    this.noteEnd(end);
    return end;
  }

  set(target: Target, props: Record<string, Value>, at = 0): void {
    this.to(target, props, { at, dur: 0 });
  }

  // Drive anything the tweens don't cover. `run` gets eased progress 0..1 on
  // every frame, 0 before the tween starts and 1 after, so it must be a pure
  // function of that progress.
  fn(opts: { at: number; dur: number; ease?: EaseSpec }, run: (p: number, t: number) => void): number {
    this.fns.push({ t0: opts.at, t1: opts.at + opts.dur, ease: resolveEase(opts.ease, "linear"), run });
    this.noteEnd(opts.at + opts.dur);
    return opts.at + opts.dur;
  }

  type(
    el: Element,
    text: string,
    opts: { at: number; dur: number; seed?: number; caret?: Element; sound?: boolean },
  ): number {
    if (opts.sound !== false && text.length > 1)
      this.typings.push({ el, text, at: opts.at, dur: opts.dur, seed: opts.seed ?? 7 });
    const curve = typingCurve(text, opts.seed);
    return this.fn({ at: opts.at, dur: opts.dur, ease: "linear" }, (p) => {
      el.textContent = text.slice(0, charsAt(curve, p));
      if (opts.caret) opts.caret.toggleAttribute("data-typing", p > 0 && p < 1);
    });
  }

  // Swap an element's text or HTML at given times. Before its first step the
  // element shows what it held when this was first called, and calling it again
  // for the same element adds to its steps.
  text(el: Element, steps: Array<[at: number, text: string]>, html = false): void {
    let track = this.texts.find((candidate) => candidate.el === el);
    if (!track) {
      track = { el, steps: [], html, last: -2, initial: html ? el.innerHTML : (el.textContent ?? "") };
      this.texts.push(track);
    }
    track.steps.push(...steps.map(([at, text]) => ({ at, text })));
    track.steps.sort((a, b) => a.at - b.at);
    this.noteEnd(Math.max(...steps.map(([at]) => at)));
  }

  cls(target: Target, name: string, window: { from: number; to?: number }): void {
    for (const el of this.resolve(target))
      this.toggles.push({ el, name, from: window.from, to: window.to ?? Infinity });
    this.noteEnd(window.from);
    if (window.to !== undefined) this.noteEnd(window.to);
  }

  beat(id: string, at: number, meta: { title: string; shows: string; talk?: string[] }): void {
    this.beats.push({ id, at, title: meta.title, shows: meta.shows, talk: meta.talk ?? [] });
  }

  cue(label: string, at: number): void {
    this.cues.push({ at, label });
  }

  // Ask for a sound at a time. Clicks, typing and fast camera moves already get
  // theirs; this is for everything else (a case passing, a step failing, the
  // name landing). `gain` is in dB, `pan` from -1 (left) to 1, `pitch` in semitones.
  sound(
    kind: SoundKind,
    at: number,
    opts: { gain?: number; pan?: number; panTo?: number; dur?: number; pitch?: number } = {},
  ): void {
    this.sounds.push({ at, kind, gain: opts.gain ?? 0, pan: opts.pan ?? 0, panTo: opts.panTo, dur: opts.dur, pitch: opts.pitch ?? 0 });
  }

  // The sounds nobody asked for by name: a tap for each click, a tick for each
  // key typed, a whoosh for each camera move fast enough to feel.
  private autoSounds(): SoundCue[] {
    const out: SoundCue[] = [];
    const { w } = this.viewport;
    const panAt = (x: number, t: number, spread: number): number => {
      const view = this.camera.viewAt(t);
      return Math.max(-spread, Math.min(spread, ((x - view.cx) * view.zoom) / w) * 0.9);
    };

    for (const click of this.cursor.clickTimes()) {
      const where = this.cursor.positionAt(click);
      out.push({ at: click, kind: "click", gain: 0, pan: panAt(where.x, click, 0.35), pitch: 0 });
    }

    for (const typing of this.typings) {
      const curve = typingCurve(typing.text, typing.seed);
      const jitter = seeded(hashOf(typing.text));
      const rect = this.rectAt(typing.el, typing.at + typing.dur);
      const pan = panAt(rect.x + rect.w / 2, typing.at + typing.dur, 0.3);
      let last = -1;
      for (let k = 1; k <= typing.text.length; k += 1) {
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 24; i += 1) {
          const mid = (lo + hi) / 2;
          if (charsAt(curve, mid) >= k) hi = mid;
          else lo = mid;
        }
        const at = typing.at + hi * typing.dur;
        if (at - last < 0.05) continue;
        last = at;
        const space = typing.text[k - 1] === " ";
        out.push({ at, kind: "key", gain: space ? -4 : -jitter() * 4, pan, pitch: space ? -3 : (jitter() - 0.5) * 4 });
      }
    }

    const dt = 1 / 60;
    for (const move of this.camera.details()) {
      if (move.quiet || move.t1 - move.t0 < 0.5) continue;
      let peak = 0;
      let before = this.camera.viewAt(move.t0);
      for (let t = move.t0 + dt; t <= move.t1 + 1e-9; t += dt) {
        const view = this.camera.viewAt(t);
        const pan = Math.hypot((view.cx - before.cx) * view.zoom, (view.cy - before.cy) * view.zoom);
        const zoom = Math.abs(Math.log(view.zoom / before.zoom)) * (w / 2);
        peak = Math.max(peak, (pan + zoom) / dt / w);
        before = view;
      }
      if (peak < 0.45) continue;
      const first = this.camera.viewAt(move.t0);
      const last = this.camera.viewAt(move.t1);
      const toward = Math.sign(last.cx - first.cx);
      const length = move.t1 - move.t0;
      out.push({
        at: move.t0 + length * 0.1,
        kind: "whoosh",
        gain: 4 * Math.log2(Math.min(2, Math.max(0.3, peak))),
        pan: 0.3 * toward,
        panTo: -0.3 * toward,
        dur: length * 0.85,
        pitch: 0,
      });
    }
    return out;
  }

  // Run once the film is built and the fonts are in, in time order: camera,
  // cursor and focus targets are measured here, at the moment they apply.
  job(at: number, run: () => void): void {
    this.pending.push({ at, order: this.pending.length, run });
  }

  get length(): number {
    return this.latest + (this.options.tail ?? 0.8);
  }

  noteEnd(t: number): void {
    if (Number.isFinite(t) && t > this.latest) this.latest = t;
  }

  rectAt(el: Element, t: number): Rect {
    this.render(t, true);
    const box = el.getBoundingClientRect();
    return { x: box.left, y: box.top, w: box.width, h: box.height };
  }

  finalize(): MotionInfo {
    this.pending.sort((a, b) => a.at - b.at || a.order - b.order);
    for (const job of this.pending) job.run();
    this.pending.length = 0;
    const duration = this.options.duration ?? this.latest + (this.options.tail ?? 0.8);
    const beats = [...this.beats]
      .sort((a, b) => a.at - b.at)
      .map((beat, index, all) => ({
        ...beat,
        end: all[index + 1]?.at ?? duration,
        cues: this.cues
          .filter((cue) => cue.at >= beat.at && cue.at < (all[index + 1]?.at ?? Infinity))
          .sort((a, b) => a.at - b.at),
      }));
    const sounds = [...this.sounds, ...this.autoSounds()].sort((a, b) => a.at - b.at);
    this.render(0, false);
    return {
      title: this.options.title,
      width: this.options.width,
      height: this.options.height,
      fps: this.options.fps,
      duration,
      beats,
      sounds,
    };
  }

  seek(t: number): void {
    this.render(t, false);
  }

  // Blur along the camera's motion, as a shutter open for half a frame would
  // smear it, but only for speed beyond what 60 fps already carries smoothly:
  // a slow move stays razor sharp and a whip pan blurs. Pan blurs along the pan;
  // zoom is measured at a radius near the content, since a real zoom smears the
  // edge of the frame and leaves its middle alone.
  private applyMotionBlur(t: number): void {
    const frame = 1 / this.options.fps;
    const h = frame / 2;
    const before = this.camera.viewAt(Math.max(0, t - h));
    const after = this.camera.viewAt(t + h);
    const here = this.camera.viewAt(t);
    const vx = (-(after.cx - here.cx) * after.zoom - (here.cx - before.cx) * before.zoom) / (2 * h);
    const vy = (-(after.cy - here.cy) * after.zoom - (here.cy - before.cy) * before.zoom) / (2 * h);
    const vz = (Math.abs(Math.log(after.zoom / before.zoom)) / (2 * h)) * (this.viewport.w * 0.15);
    const free = this.viewport.w * 0.33;
    const sx = blurSpread(Math.abs(vx) + vz, free, frame);
    const sy = blurSpread(Math.abs(vy) + vz, free, frame);
    if (sx < 0.015 && sy < 0.015) {
      this.cam.style.filter = "";
      return;
    }
    this.blur.setAttribute("stdDeviation", `${sx.toFixed(3)} ${sy.toFixed(3)}`);
    this.cam.style.filter = "url(#mo-blur)";
  }

  private render(t: number, measure: boolean): void {
    for (const node of this.nodes.values()) node.apply(t);
    for (const track of this.fns)
      track.run(track.ease(Math.min(1, Math.max(0, (t - track.t0) / Math.max(1e-9, track.t1 - track.t0)))), t);
    for (const toggle of this.toggles) toggle.el.classList.toggle(toggle.name, t >= toggle.from && t < toggle.to);
    for (const track of this.texts) {
      let index = -1;
      for (let i = 0; i < track.steps.length; i += 1) if (track.steps[i].at <= t) index = i;
      if (index === track.last) continue;
      track.last = index;
      const value = index < 0 ? track.initial : track.steps[index].text;
      if (track.html) track.el.innerHTML = value;
      else track.el.textContent = value;
    }
    if (measure) {
      this.world.style.transform = `translate(${CAM_MARGIN}px, ${CAM_MARGIN}px)`;
      return;
    }
    const view = this.camera.viewAt(t);
    const tx = this.viewport.w / 2 - view.cx * view.zoom + CAM_MARGIN;
    const ty = this.viewport.h / 2 - view.cy * view.zoom + CAM_MARGIN;
    this.world.style.transform = `translate(${tx}px, ${ty}px) scale(${view.zoom})`;
    this.applyMotionBlur(t);
    this.cursor.apply(t, view.zoom);
    this.focus.apply(t, view);
  }
}

// Margin the camera layer extends past the frame, so motion blur at the edges
// samples real content instead of fading to nothing.
const CAM_MARGIN = 96;

// Escape text for interpolation into the HTML strings scenes build from.
export const esc = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Add a film's stylesheet. Films import their CSS as text and pass it here.
export const addCss = (css: string): void => {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
};

// Build one element from an HTML string.
export const html = (markup: string): HTMLElement => {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  const first = template.content.firstElementChild;
  if (!(first instanceof HTMLElement)) throw new Error("html() needs one HTML element");
  return first;
};

const loadFonts = async (): Promise<void> => {
  await Promise.all([...document.fonts].map((face) => face.load().catch(() => face)));
  await document.fonts.ready;
};

declare global {
  interface Window {
    __motion?: MotionApi;
  }
}

// Build a film and publish it for the renderer: window.__motion.ready
// resolves with the film's info once fonts are in and the camera, cursor and
// focus targets are measured.
export const defineFilm = (options: FilmOptions, build: (film: Film) => void): void => {
  const style = document.createElement("style");
  style.textContent = BASE_CSS;
  document.head.append(style);
  let film: Film | undefined;
  const ready = (async (): Promise<MotionInfo> => {
    await loadFonts();
    film = new Film(options);
    build(film);
    return film.finalize();
  })();
  window.__motion = {
    ready,
    seek: (t: number) => {
      if (!film) throw new Error("The film isn't ready: await window.__motion.ready first.");
      film.seek(t);
    },
    debug: {
      view: (t: number) => {
        if (!film) throw new Error("The film isn't ready.");
        return film.camera.viewAt(t);
      },
      rect: (selector: string, t: number) => {
        if (!film) throw new Error("The film isn't ready.");
        return film.rectAt(film.q(selector), t);
      },
      camera: (dt: number) => {
        if (!film) throw new Error("The film isn't ready.");
        const samples: Array<[number, number, number, number]> = [];
        const end = film.options.duration ?? film.length;
        for (let t = 0; t <= end; t += dt) {
          const view = film.camera.viewAt(t);
          samples.push([t, view.cx, view.cy, view.zoom]);
        }
        return { samples, moves: film.camera.moves() };
      },
    },
  };
};
