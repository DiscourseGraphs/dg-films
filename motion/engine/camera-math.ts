// Camera math, free of the DOM. A view is the world point at the center of the
// frame and a zoom. fly() is van Wijk and Nuij's "smooth and efficient zooming
// and panning" curve (the one behind d3-zoom and Mapbox flyTo): between two
// distant views the camera pulls back, travels, and pushes in again, at an
// even perceived speed. Easing its parameter gives a move that starts and
// settles softly without the stop-and-go of panning and zooming separately.

export type View = { cx: number; cy: number; zoom: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Viewport = { w: number; h: number };

export const isView = (value: unknown): value is View =>
  typeof value === "object" && value !== null && "cx" in value && "zoom" in value;

export const isRect = (value: unknown): value is Rect =>
  typeof value === "object" && value !== null && "w" in value && "h" in value && "x" in value;

export type FitMode = "contain" | "width" | "height";

// The view that frames `rect` inside the viewport with `pad` (a fraction of the
// viewport) kept clear on every side. "width" and "height" fit one axis only,
// for tall or wide content where the other axis is meant to overflow.
export const fitRect = (
  rect: Rect,
  viewport: Viewport,
  pad: number | { x: number; y: number } = 0.08,
  mode: FitMode = "contain",
): View => {
  const padX = typeof pad === "number" ? pad : pad.x;
  const padY = typeof pad === "number" ? pad : pad.y;
  const zoomX = (viewport.w * (1 - 2 * padX)) / rect.w;
  const zoomY = (viewport.h * (1 - 2 * padY)) / rect.h;
  const zoom = mode === "width" ? zoomX : mode === "height" ? zoomY : Math.min(zoomX, zoomY);
  return { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, zoom };
};

export const lerpView = (a: View, b: View, u: number): View => ({
  cx: a.cx + (b.cx - a.cx) * u,
  cy: a.cy + (b.cy - a.cy) * u,
  zoom: a.zoom * (b.zoom / a.zoom) ** u,
});

const EPSILON2 = 1e-6;

// `rho` is the curve's willingness to zoom out on long moves: near 0 it is a
// straight pan with an exponential zoom, around 1.4 (the default) it arcs.
export const flyPath = (a: View, b: View, viewport: Viewport, rho = Math.SQRT2): ((u: number) => View) => {
  const w0 = viewport.w / a.zoom;
  const w1 = viewport.w / b.zoom;
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const d2 = dx * dx + dy * dy;
  const rho2 = rho * rho;
  const rho4 = rho2 * rho2;
  if (d2 < EPSILON2) {
    const span = Math.log(w1 / w0) / rho;
    return (u) => ({
      cx: a.cx + u * dx,
      cy: a.cy + u * dy,
      zoom: viewport.w / (w0 * Math.exp(rho * u * span)),
    });
  }
  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1);
  const b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
  const r0 = -Math.asinh(b0);
  const r1 = -Math.asinh(b1);
  const span = (r1 - r0) / rho;
  const coshR0 = Math.cosh(r0);
  const sinhR0 = Math.sinh(r0);
  return (u) => {
    const s = u * span;
    const travelled = (w0 / (rho2 * d1)) * (coshR0 * Math.tanh(rho * s + r0) - sinhR0);
    return {
      cx: a.cx + travelled * dx,
      cy: a.cy + travelled * dy,
      zoom: viewport.w / ((w0 * coshR0) / Math.cosh(rho * s + r0)),
    };
  };
};

// The screen position of a world point under a view, and back.
export const worldToScreen = (view: View, viewport: Viewport, x: number, y: number): { x: number; y: number } => ({
  x: (x - view.cx) * view.zoom + viewport.w / 2,
  y: (y - view.cy) * view.zoom + viewport.h / 2,
});

export type Knot = { t: number; view: View };

// Slopes for a monotone cubic Hermite curve through (ts, ys) (Fritsch and
// Butland): a component that keeps going one way never overshoots a key, and
// one that turns around comes to rest at the turn. The ends are at rest.
const monotoneSlopes = (ts: readonly number[], ys: readonly number[]): number[] => {
  const n = ts.length;
  const step = (k: number): number => ts[k + 1] - ts[k];
  const secant = (k: number): number => (ys[k + 1] - ys[k]) / step(k);
  const slopes = new Array<number>(n).fill(0);
  for (let k = 1; k < n - 1; k += 1) {
    const before = secant(k - 1);
    const after = secant(k);
    if (before * after <= 0) continue;
    const w1 = 2 * step(k) + step(k - 1);
    const w2 = step(k) + 2 * step(k - 1);
    slopes[k] = (w1 + w2) / (w1 / before + w2 / after);
  }
  return slopes;
};

// One continuous move through several framings: the camera passes each key at
// its time without stopping, and is at rest only at the first and the last.
// Pan and zoom are interpolated separately (the zoom in logarithms, so a
// zoom feels even), which suits moves inside one window; between distant
// windows fly() is the better curve. Two keys in a row with the same view make
// the camera hold there.
export const pathThrough = (knots: readonly Knot[]): ((t: number) => View) => {
  if (knots.length < 2) throw new Error("A camera path needs at least two keys.");
  for (let k = 1; k < knots.length; k += 1)
    if (!(knots[k].t > knots[k - 1].t)) throw new Error("Camera path keys must be in increasing time order.");
  const ts = knots.map((knot) => knot.t);
  const channels = [
    knots.map((knot) => knot.view.cx),
    knots.map((knot) => knot.view.cy),
    knots.map((knot) => Math.log(knot.view.zoom)),
  ];
  const slopes = channels.map((ys) => monotoneSlopes(ts, ys));
  return (t) => {
    const clamped = Math.min(ts[ts.length - 1], Math.max(ts[0], t));
    let k = 0;
    while (k < ts.length - 2 && clamped > ts[k + 1]) k += 1;
    const h = ts[k + 1] - ts[k];
    const s = (clamped - ts[k]) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;
    const [cx, cy, lz] = channels.map(
      (ys, c) => h00 * ys[k] + h10 * h * slopes[c][k] + h01 * ys[k + 1] + h11 * h * slopes[c][k + 1],
    );
    return { cx, cy, zoom: Math.exp(lz) };
  };
};

// Standard deviation, in frame units, of the blur from a shutter open for half
// a frame while the picture moves `speed` frame units a second. Speed up to
// `free` carries smoothly at the film's frame rate and gets none; beyond it the
// blur eases in along a knee instead of starting at a step, so it never
// switches on between two frames.
export const blurSpread = (speed: number, free: number, frame: number): number => {
  const over = Math.max(0, speed - free);
  const knee = free * 0.25;
  return ((over * over) / (over + knee || 1)) * 0.5 * frame * 0.29;
};
