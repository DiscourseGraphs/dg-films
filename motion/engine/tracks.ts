// What a property is at time t, given the tweens on it. The runtime keeps one
// PropTrack per (element, property). Evaluation is a pure function of time,
// never of history, so a frame renders the same whether it is the next one or
// a seek from anywhere in the film.

import { formatColor, mixColors, parseColor } from "./color";
import type { Ease } from "./easing";

export type Value = number | string;

export type Segment = {
  t0: number;
  t1: number;
  // Where the segment starts. Left out, it starts from wherever the property
  // was left: the previous segment's end, or the track's base value.
  from: Value | undefined;
  to: Value;
  ease: Ease;
};

const NUMBER_UNIT = /^(-?\d*\.?\d+(?:e[-+]?\d+)?)(px|%|deg|rem|em|vh|vw|s|ms)?$/i;

export const lerpValue = (a: Value, b: Value, p: number): Value => {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * p;
  const left = String(a);
  const right = String(b);
  const numberA = NUMBER_UNIT.exec(left);
  const numberB = NUMBER_UNIT.exec(right);
  if (numberA && numberB && (numberA[2] ?? "") === (numberB[2] ?? "")) {
    const start = Number(numberA[1]);
    return `${start + (Number(numberB[1]) - start) * p}${numberA[2] ?? ""}`;
  }
  const colorA = parseColor(left);
  const colorB = parseColor(right);
  if (colorA && colorB) return formatColor(mixColors(colorA, colorB, p));
  // Nothing to interpolate (a keyword, a path): hold until the end.
  return p >= 1 ? b : a;
};

export class PropTrack {
  private readonly segments: Segment[] = [];

  constructor(readonly base: Value) {}

  add(segment: Segment): void {
    let index = this.segments.length;
    while (index > 0 && this.segments[index - 1].t0 > segment.t0) index -= 1;
    this.segments.splice(index, 0, segment);
  }

  get end(): number {
    return this.segments.reduce((latest, segment) => Math.max(latest, segment.t1), 0);
  }

  get empty(): boolean {
    return this.segments.length === 0;
  }

  valueAt(t: number): Value {
    const segments = this.segments;
    if (!segments.length) return this.base;
    let lo = 0;
    let hi = segments.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (segments[mid].t0 <= t) {
        found = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (found < 0) return segments[0].from ?? this.base;
    const segment = segments[found];
    if (t >= segment.t1) return segment.to;
    const from = segment.from ?? (found > 0 ? segments[found - 1].to : this.base);
    return lerpValue(from, segment.to, segment.ease((t - segment.t0) / (segment.t1 - segment.t0)));
  }
}
