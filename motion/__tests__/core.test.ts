import assert from "node:assert/strict";
import test from "node:test";
import { formatColor, mixColors, parseColor } from "../engine/color";
import {
  blurSpread,
  fitRect,
  flyPath,
  lerpView,
  pathThrough,
  worldToScreen,
  type View,
} from "../engine/camera-math";
import { bezier, easeNames, resolveEase, spring } from "../engine/easing";
import { lerpValue, PropTrack } from "../engine/tracks";
import { charsAt, typingCurve } from "../engine/typing";

const near = (actual: number, expected: number, tolerance = 1e-6, message?: string): void =>
  assert.ok(Math.abs(actual - expected) <= tolerance, message ?? `${actual} is not within ${tolerance} of ${expected}`);

test("every named ease starts at 0 and ends at 1, and stays inside the spring's overshoot", () => {
  for (const name of easeNames()) {
    const ease = resolveEase(name);
    near(ease(0), 0, 1e-9, `${name}(0)`);
    near(ease(1), 1, 1e-9, `${name}(1)`);
    for (let i = 0; i <= 100; i += 1) {
      const value = ease(i / 100);
      assert.ok(Number.isFinite(value) && value > -0.3 && value < 1.3, `${name} at ${i / 100} gave ${value}`);
    }
  }
});

test("eases written as strings resolve, and a typo names the valid ones", () => {
  near(resolveEase("bezier(0.25,0.1,0.25,1)")(0.5), bezier(0.25, 0.1, 0.25, 1)(0.5));
  near(resolveEase("spring(.4)")(0.3), spring(0.4)(0.3));
  assert.throws(() => resolveEase("inOutCubicc"), /Unknown ease "inOutCubicc".*inOutCubic/);
  assert.throws(() => resolveEase("bezier(1,2)"), /four numbers/);
});

test("bezier matches the CSS ease-in-out midpoint, and the spring overshoots then settles", () => {
  near(bezier(0.42, 0, 0.58, 1)(0.5), 0.5, 1e-4);
  const settle = spring(0.35);
  const peak = Math.max(...Array.from({ length: 101 }, (_, i) => settle(i / 100)));
  assert.ok(peak > 1.04 && peak < 1.12, `peak ${peak}`);
  near(settle(1), 1, 1e-12);
  const critical = spring(0);
  const monotone = Array.from({ length: 101 }, (_, i) => critical(i / 100));
  assert.ok(
    monotone.every((value, i) => i === 0 || value >= monotone[i - 1] - 1e-9),
    "critically damped never backs up",
  );
  assert.ok(Math.max(...monotone) <= 1 + 1e-9);
});

test("colors parse from hex and rgb(), and mix without passing through muddy gray", () => {
  assert.deepEqual(parseColor("#2c62c9"), [44, 98, 201, 1]);
  assert.deepEqual(parseColor("#fff"), [255, 255, 255, 1]);
  assert.deepEqual(parseColor("rgba(20, 24, 33, .5)"), [20, 24, 33, 0.5]);
  assert.equal(parseColor("not a color"), null);
  const blue = parseColor("#2c62c9")!;
  const green = parseColor("#15805a")!;
  assert.deepEqual(mixColors(blue, green, 0), blue);
  const mid = mixColors(blue, green, 0.5);
  assert.ok(mid[1] > mid[0], "halfway between blue and green leans green, not gray");
  const fadeIn = mixColors([0, 0, 0, 0], blue, 0.5);
  assert.deepEqual(fadeIn.slice(0, 3), [44, 98, 201]);
  assert.equal(formatColor([1, 2, 3, 1]), "rgb(1,2,3)");
  assert.equal(formatColor([1, 2, 3, 0.25]), "rgba(1,2,3,0.25)");
});

test("lerpValue interpolates numbers, units and colors, and steps through anything else", () => {
  assert.equal(lerpValue(0, 10, 0.25), 2.5);
  assert.equal(lerpValue("10px", "20px", 0.5), "15px");
  assert.equal(lerpValue("0%", "50%", 0.5), "25%");
  assert.equal(lerpValue("#000000", "#ffffff", 1), "rgb(255,255,255)");
  assert.equal(lerpValue("none", "block", 0.99), "none");
  assert.equal(lerpValue("none", "block", 1), "block");
});

test("a track holds its first from before it starts and its last to afterwards", () => {
  const track = new PropTrack(1);
  const ease = resolveEase("linear");
  track.add({ t0: 2, t1: 4, from: 0, to: 10, ease });
  assert.equal(track.valueAt(0), 0, "an entrance is hidden until it starts");
  assert.equal(track.valueAt(2), 0);
  assert.equal(track.valueAt(3), 5);
  assert.equal(track.valueAt(4), 10);
  assert.equal(track.valueAt(99), 10);
});

test("a segment without a from continues from the one before it, or the base", () => {
  const track = new PropTrack(1);
  const ease = resolveEase("linear");
  track.add({ t0: 4, t1: 6, from: undefined, to: 0, ease });
  track.add({ t0: 0, t1: 2, from: undefined, to: 3, ease });
  assert.equal(track.valueAt(-1), 1, "before anything, the base");
  assert.equal(track.valueAt(1), 2, "from the base to 3");
  assert.equal(track.valueAt(3), 3, "held between segments");
  assert.equal(track.valueAt(5), 1.5, "from the earlier end to 0");
  assert.equal(track.end, 6);
});

test("a zero-length segment is a step, and evaluation doesn't depend on the order of calls", () => {
  const track = new PropTrack("a");
  const ease = resolveEase("linear");
  track.add({ t0: 1, t1: 1, from: undefined, to: "b", ease });
  assert.equal(track.valueAt(0.99), "a");
  assert.equal(track.valueAt(1), "b");
  const forward = [0, 0.5, 1, 1.5].map((t) => track.valueAt(t));
  const backward = [1.5, 1, 0.5, 0].map((t) => track.valueAt(t)).reverse();
  assert.deepEqual(forward, backward);
});

const VIEWPORT = { w: 1280, h: 720 };

test("fitRect frames a rect with its padding, and width mode ignores the height", () => {
  const view = fitRect({ x: 100, y: 200, w: 640, h: 360 }, VIEWPORT, 0.1);
  near(view.cx, 420);
  near(view.cy, 380);
  near(view.zoom, 1.6);
  const tall = fitRect({ x: 0, y: 0, w: 640, h: 3600 }, VIEWPORT, 0.1, "width");
  near(tall.zoom, 1.6);
});

test("fly starts and ends exactly on its views and pulls back on a long move", () => {
  const a: View = { cx: 0, cy: 0, zoom: 1 };
  const b: View = { cx: 3000, cy: 800, zoom: 1.4 };
  const path = flyPath(a, b, VIEWPORT);
  const start = path(0);
  const end = path(1);
  near(start.cx, 0, 1e-6);
  near(start.zoom, 1, 1e-9);
  near(end.cx, 3000, 1e-6);
  near(end.cy, 800, 1e-6);
  near(end.zoom, 1.4, 1e-9);
  const lowest = Math.min(...Array.from({ length: 101 }, (_, i) => path(i / 100).zoom));
  assert.ok(lowest < 0.5, `a 3000-unit move should zoom out well below 1, got ${lowest}`);
});

test("fly is continuous, and a short pan stays close to a straight line", () => {
  const path = flyPath({ cx: 0, cy: 0, zoom: 1 }, { cx: 3000, cy: 0, zoom: 1 }, VIEWPORT);
  let previous = path(0);
  for (let i = 1; i <= 600; i += 1) {
    const view = path(i / 600);
    assert.ok(Math.abs(view.cx - previous.cx) < 60, `jump in cx at ${i}`);
    assert.ok(Math.abs(Math.log(view.zoom / previous.zoom)) < 0.02, `jump in zoom at ${i}`);
    previous = view;
  }
  const short = flyPath({ cx: 0, cy: 0, zoom: 2 }, { cx: 40, cy: 20, zoom: 2 }, VIEWPORT);
  for (let i = 0; i <= 20; i += 1) {
    const view = short(i / 20);
    near(view.zoom, 2, 0.03, "a short pan barely breathes");
  }
});

test("fly with the same view twice stays put, and a pure zoom keeps its center", () => {
  const still = flyPath({ cx: 5, cy: 6, zoom: 1.2 }, { cx: 5, cy: 6, zoom: 1.2 }, VIEWPORT);
  for (const u of [0, 0.3, 1]) {
    const view = still(u);
    assert.deepEqual([view.cx, view.cy], [5, 6]);
    near(view.zoom, 1.2, 1e-9);
  }
  const zoomIn = flyPath({ cx: 50, cy: 60, zoom: 1 }, { cx: 50, cy: 60, zoom: 3 }, VIEWPORT);
  near(zoomIn(0.5).cx, 50);
  near(zoomIn(1).zoom, 3, 1e-9);
});

test("lerpView zooms exponentially, and worldToScreen puts the view center mid-frame", () => {
  const view = lerpView({ cx: 0, cy: 0, zoom: 1 }, { cx: 10, cy: 0, zoom: 4 }, 0.5);
  near(view.zoom, 2);
  near(view.cx, 5);
  const screen = worldToScreen({ cx: 100, cy: 50, zoom: 2 }, VIEWPORT, 100, 50);
  assert.deepEqual(screen, { x: 640, y: 360 });
  assert.deepEqual(worldToScreen({ cx: 100, cy: 50, zoom: 2 }, VIEWPORT, 110, 60), { x: 660, y: 380 });
});

test("typing curves are monotone, deterministic, and slow down on punctuation", () => {
  const text = "wait for the discourse context, then click.";
  const curve = typingCurve(text);
  assert.equal(curve.length, text.length + 1);
  assert.equal(curve[0], 0);
  assert.equal(curve[curve.length - 1], 1);
  assert.ok(curve.every((value, i) => i === 0 || value > curve[i - 1]));
  assert.deepEqual(typingCurve(text), curve, "the same string always types the same way");
  assert.notDeepEqual(typingCurve(text, 8), curve, "a different seed wobbles differently");
  assert.equal(charsAt(curve, 0), 0);
  assert.equal(charsAt(curve, 1), text.length);
  assert.equal(charsAt(curve, 1.5), text.length);
  const half = charsAt(curve, 0.5);
  assert.ok(half > 15 && half < 28, `half the time, about half the text, got ${half}`);
  const gap = (index: number): number => curve[index + 1] - curve[index];
  assert.ok(gap(text.indexOf(",")) > gap(text.indexOf("w") + 1) * 1.2, "a comma lingers");
});

const at = (cx: number, cy: number, zoom: number): View => ({ cx, cy, zoom });

test("a camera path passes every key at its time and is at rest at both ends", () => {
  const knots = [
    { t: 0, view: at(0, 0, 1) },
    { t: 2, view: at(400, 100, 1.5) },
    { t: 5, view: at(900, 250, 1) },
  ];
  const path = pathThrough(knots);
  for (const knot of knots) {
    const view = path(knot.t);
    near(view.cx, knot.view.cx, 1e-9);
    near(view.cy, knot.view.cy, 1e-9);
    near(view.zoom, knot.view.zoom, 1e-9);
  }
  const speedAt = (t: number): number => {
    const a = path(t - 1e-4);
    const b = path(t + 1e-4);
    return Math.hypot(b.cx - a.cx, b.cy - a.cy) / 2e-4;
  };
  assert.ok(speedAt(1e-3) < 5, "starts at rest");
  assert.ok(speedAt(5 - 1e-3) < 5, "ends at rest");
  assert.ok(speedAt(2) > 100, "does not stop at a key in between");
});

test("a camera path is smooth through a key and does not overshoot a key it is heading past", () => {
  const knots = [
    { t: 0, view: at(0, 0, 1) },
    { t: 1, view: at(100, 0, 1) },
    { t: 3, view: at(700, 0, 1) },
    { t: 4, view: at(800, 0, 1) },
  ];
  const path = pathThrough(knots);
  const eps = 1e-5;
  const velocity = (t: number): number => (path(t + eps).cx - path(t - eps).cx) / (2 * eps);
  near(velocity(1 - 1e-3), velocity(1 + 1e-3), 40, "velocity is continuous at the key");
  let last = -Infinity;
  for (let t = 0; t <= 4; t += 0.01) {
    const x = path(t).cx;
    assert.ok(x >= last - 1e-9, `x went backwards at ${t}`);
    assert.ok(x >= -1e-9 && x <= 800 + 1e-9, `x ${x} left the keys' range at ${t}`);
    last = x;
  }
});

test("a camera path holds where two keys are the same, and zooms evenly in logarithms", () => {
  const path = pathThrough([
    { t: 0, view: at(0, 0, 1) },
    { t: 1, view: at(300, 0, 2) },
    { t: 2, view: at(300, 0, 2) },
    { t: 3, view: at(600, 0, 4) },
  ]);
  near(path(1.5).cx, 300, 1e-9);
  near(path(1.5).zoom, 2, 1e-9);
  assert.ok(path(0.5).zoom > 1 && path(0.5).zoom < 2);
  assert.throws(() => pathThrough([{ t: 0, view: at(0, 0, 1) }]), /at least two keys/);
  assert.throws(
    () =>
      pathThrough([
        { t: 1, view: at(0, 0, 1) },
        { t: 1, view: at(1, 0, 1) },
      ]),
    /increasing time/,
  );
});

test("blur eases in with speed: none while 60 fps carries the move, no step when it starts, never decreasing", () => {
  const free = 1280 * 0.33;
  const frame = 1 / 60;
  assert.equal(blurSpread(0, free, frame), 0);
  assert.equal(blurSpread(free, free, frame), 0);
  let previous = 0;
  let biggestStep = 0;
  for (let speed = free; speed <= free + 4000; speed += 10) {
    const spread = blurSpread(speed, free, frame);
    assert.ok(spread >= previous - 1e-12, "blur never drops as the camera speeds up");
    biggestStep = Math.max(biggestStep, spread - previous);
    previous = spread;
  }
  assert.ok(biggestStep < 0.03, `blur moves by at most ${biggestStep} for a 10 px/s change in speed`);
  assert.ok(blurSpread(free + 5, free, frame) < 0.005, "it starts from nothing, not from a visible blur");
  const linear = (free + 3000 - free) * 0.5 * frame * 0.29;
  assert.ok(blurSpread(free + 3000, free, frame) > linear * 0.9, "a whip pan still blurs about as much as before");
});
