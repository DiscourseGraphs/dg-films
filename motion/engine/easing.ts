// Easing curves for the motion engine. Each is a pure function of progress
// 0..1, so the same code runs in the browser runtime and under node's test
// runner. A scene names a curve ("outCubic"), writes a CSS-style one
// ("bezier(.4,0,.2,1)"), or asks for a spring ("spring(.35)").

export type Ease = (p: number) => number;
export type EaseSpec = Ease | string;

const clamp01 = (p: number): number => (p < 0 ? 0 : p > 1 ? 1 : p);

export const linear: Ease = clamp01;

// CSS cubic-bezier(): Newton's method on x(t) = p, with bisection when the
// slope is too flat to trust it.
export const bezier = (x1: number, y1: number, x2: number, y2: number): Ease => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number): number => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number): number => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number): number => (3 * ax * t + 2 * bx) * t + cx;
  return (p) => {
    const x = clamp01(p);
    if (x === 0 || x === 1) return x;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-7) return sampleY(t);
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 40; i += 1) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-7) break;
      if (error > 0) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
};

const power = (n: number): { in: Ease; out: Ease; inOut: Ease } => ({
  in: (p) => clamp01(p) ** n,
  out: (p) => 1 - (1 - clamp01(p)) ** n,
  inOut: (p) => {
    const x = clamp01(p);
    return x < 0.5 ? 2 ** (n - 1) * x ** n : 1 - (-2 * x + 2) ** n / 2;
  },
});

export const back =
  (overshoot = 1.70158): Ease =>
  (p) => {
    const x = clamp01(p) - 1;
    return 1 + (overshoot + 1) * x ** 3 + overshoot * x ** 2;
  };

// A damped spring that settles by p = 1. `bounce` 0 is critically damped (no
// overshoot); .35 overshoots about 7% and rings once.
export const spring = (bounce = 0.35): Ease => {
  const zeta = Math.min(1, Math.max(0.05, 1 - bounce));
  const omega = -Math.log(0.002) / zeta;
  const raw = (t: number): number => {
    if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
    const damped = omega * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * omega * t) * (Math.cos(damped * t) + ((zeta * omega) / damped) * Math.sin(damped * t));
  };
  const end = raw(1);
  return (p) => {
    const x = clamp01(p);
    return x === 1 ? 1 : raw(x) / end;
  };
};

const quad = power(2);
const cubic = power(3);
const quart = power(4);
const quint = power(5);

const NAMED: Record<string, Ease> = {
  linear,
  inQuad: quad.in,
  outQuad: quad.out,
  inOutQuad: quad.inOut,
  inCubic: cubic.in,
  outCubic: cubic.out,
  inOutCubic: cubic.inOut,
  inQuart: quart.in,
  outQuart: quart.out,
  inOutQuart: quart.inOut,
  inQuint: quint.in,
  outQuint: quint.out,
  inOutQuint: quint.inOut,
  inOutSine: (p) => -(Math.cos(Math.PI * clamp01(p)) - 1) / 2,
  outSine: (p) => Math.sin((clamp01(p) * Math.PI) / 2),
  inExpo: (p) => (clamp01(p) === 0 ? 0 : 2 ** (10 * clamp01(p) - 10)),
  outExpo: (p) => (clamp01(p) === 1 ? 1 : 1 - 2 ** (-10 * clamp01(p))),
  inOutExpo: (p) => {
    const x = clamp01(p);
    if (x === 0 || x === 1) return x;
    return x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2;
  },
  outBack: back(),
  // Tuned for the camera: gentle start, long soft landing.
  smooth: bezier(0.45, 0, 0.15, 1),
  // Symmetric and a touch livelier than inOutCubic, for UI that moves.
  glide: bezier(0.65, 0, 0.35, 1),
  // Quick out, long tail: things that arrive.
  arrive: bezier(0.16, 1, 0.3, 1),
  pop: spring(0.4),
};

export const easeNames = (): string[] => Object.keys(NAMED);

const FUNCTION_SPEC = /^(bezier|spring|back)\(([^)]*)\)$/;

export const resolveEase = (spec: EaseSpec | undefined, fallback: string = "glide"): Ease => {
  if (typeof spec === "function") return spec;
  const name = (spec ?? fallback).trim();
  const named = NAMED[name];
  if (named) return named;
  const match = FUNCTION_SPEC.exec(name);
  if (match) {
    const args = match[2]
      .split(",")
      .filter((part) => part.trim() !== "")
      .map(Number);
    if (args.some((value) => !Number.isFinite(value))) throw new Error(`Bad ease arguments: ${name}`);
    if (match[1] === "bezier") {
      if (args.length !== 4) throw new Error(`bezier() takes four numbers: ${name}`);
      return bezier(args[0], args[1], args[2], args[3]);
    }
    if (match[1] === "spring") return spring(args[0]);
    return back(args[0]);
  }
  throw new Error(`Unknown ease "${name}". Names: ${easeNames().join(", ")}; or bezier(a,b,c,d), spring(b), back(s).`);
};
