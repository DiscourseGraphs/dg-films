// Scene helpers for the series: framing under the headline band, headlines and
// their holds, key caps, small entrances, and the end card. Framing, captions and
// the canvas helpers start as copies of dg-explainer-v2/scenes/helpers.ts.
import type { Rect } from "../../../engine/camera-math";
import { esc, html, type Film } from "../../../engine/runtime";
import { around, type Margin, type Region } from "../../../kit";
import { CTA, EPISODES, SERIES } from "./data";

export const PAD = 0.05;
// The top of the frame the headlines use; every shot keeps it clear.
export const HEADROOM = 150;

// ------------------------------------------------------------------ framing

// The region to hand the camera so `base` lands below the headline band: grown
// upward by HEADROOM/zoom at the zoom it ends with.
export const roomRect = (base: Rect, viewport: { w: number; h: number }, pad = PAD, top = HEADROOM): Rect => {
  const zoom = Math.min((viewport.w * (1 - 2 * pad)) / base.w, (viewport.h * (1 - 2 * pad) - top) / base.h);
  if (!Number.isFinite(zoom) || zoom <= 0) return base;
  return { x: base.x, y: base.y - top / zoom, w: base.w, h: base.h + top / zoom };
};

export const room =
  (f: Film, region: Region, pad = PAD): Region =>
  (t) =>
    roomRect(region(t), f.viewport, pad);

// A shot of some elements with the headline band kept clear.
export const shot = (f: Film, els: Element | Element[], margin: Margin = {}, pad = PAD): Region =>
  room(f, around(f, els, margin), pad);

// Where `child` sits inside `ancestor`, in the ancestor's own (unscaled) units.
export const offsetIn = (child: Element, ancestor: Element): { x: number; y: number; w: number; h: number } => {
  const a = ancestor.getBoundingClientRect();
  const c = child.getBoundingClientRect();
  const scale = a.width / (ancestor as HTMLElement).offsetWidth || 1;
  return { x: (c.left - a.left) / scale, y: (c.top - a.top) / scale, w: c.width / scale, h: c.height / scale };
};

// ------------------------------------------------------------------ headlines

export type Headline = { root: HTMLElement; words: HTMLElement[]; text: string };

// One line in the band at the top of the frame, built word by word.
export const headline = (f: Film, text: string): Headline => {
  const words = text
    .split(" ")
    .map((w) => `<span class="w">${esc(w)}</span>`)
    .join(" ");
  const root = html(`<div class="hl"><div class="hl-t">${words}</div></div>`);
  f.overlay.append(root);
  return { root, words: f.qa(".w", root) as HTMLElement[], text };
};

// PLAN.md: at least 2.4 s, plus 0.3 s for each word past five.
export const holdFor = (h: Headline): number => 2.4 + 0.3 * Math.max(0, h.words.length - 5);

// Every headline's time on screen, from the start of its entrance to the end
// of its exit, so a film can refuse to build with two on screen at once.
const shown: Array<{ text: string; from: number; to: number }> = [];

// A headline arrives word by word and leaves as one. It shows from `at` until
// `until`, never shorter than its hold; returns when it is gone.
export const say = (f: Film, h: Headline, at: number, until: number): number => {
  const end = Math.max(until, at + 0.5 + holdFor(h));
  f.to(h.words, { opacity: [0, 1], y: [16, 0], blur: [6, 0] }, { at, dur: 0.5, ease: "arrive", stagger: 0.05 });
  const gone = f.to(h.root, { opacity: [1, 0], y: [0, -8], blur: [0, 4] }, { at: end, dur: 0.35, ease: "inQuad" });
  shown.push({ text: h.text, from: at, to: gone });
  return gone;
};

// Call once after every `say`: throws, naming both, if two headlines overlap.
export const checkHeadlines = (): void => {
  const sorted = [...shown].sort((a, b) => a.from - b.from);
  const clashes = sorted.slice(1).flatMap((h, i) =>
    h.from < sorted[i].to - 0.01
      ? [`"${sorted[i].text}" (to ${sorted[i].to.toFixed(2)} s) overlaps "${h.text}" (from ${h.from.toFixed(2)} s)`]
      : [],
  );
  if (clashes.length) throw new Error(`Headlines overlap:\n${clashes.join("\n")}`);
};

// The series mark, small and constant in the top left. It names the product
// ("ONE QUESTION" alone meant nothing to test viewers and clashed with the
// Question node type): "Discourse Graphs for Roam · 1/10".
export const seriesMark = (f: Film, n: number): HTMLElement => {
  const el = html(`<div class="oq-mark"><b>Discourse Graphs for Roam</b><span>${n}/${SERIES.total}</span></div>`);
  f.overlay.append(el);
  return el;
};

// ------------------------------------------------------------------ pointer shapes

// The engine's pointer is an arrow. Roam shows an I-beam over text and a hand over
// buttons and menu rows (evidence/zHcMKQmk_M.gif), so a film adds both shapes to
// the pointer once (pointerShapes) and switches per stretch (pointer). Each stretch
// gets its own class: two windows of one class would fight (skin.css matches by prefix).
const IBEAM_D = "M2.5 1.5Q6 1.5 6 3.5Q6 1.5 9.5 1.5M6 3.5V20.5M2.5 22.5Q6 22.5 6 20.5Q6 22.5 9.5 22.5";
const HAND_D =
  "M9 2.5c-1 0-1.8.8-1.8 1.8V13l-1.6-1.6c-.7-.7-1.9-.7-2.6 0-.7.7-.7 1.8 0 2.5l4.6 5.1c1.3 1.5 3.1 2.5 5.1 2.5h1.7c3.3 0 6-2.7 6-6v-4.3c0-1-.8-1.8-1.8-1.8-.5 0-.9.2-1.2.5v-.2c0-1-.8-1.8-1.8-1.8-.5 0-1 .2-1.3.5-.2-.8-.9-1.4-1.8-1.4-.4 0-.8.1-1.1.4V4.3C10.8 3.3 10 2.5 9 2.5z";
export const pointerShapes = (f: Film): void => {
  f.cursor.el.insertAdjacentHTML(
    "beforeend",
    `<svg class="cur-ibeam" width="12" height="24" viewBox="0 0 12 24"><path d="${IBEAM_D}" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><path d="${IBEAM_D}" fill="none" stroke="#111" stroke-width="1.4" stroke-linecap="round"/></svg>` +
      `<svg class="cur-hand" width="24" height="24" viewBox="0 0 24 24"><path d="${HAND_D}" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  );
};
let shapeN = 0;
export const pointer = (f: Film, shape: "ibeam" | "hand", from: number, to: number): void => {
  f.cls(f.cursor.el, `${shape}-${shapeN++}`, { from, to });
};

// ------------------------------------------------------------------ small motions

export const pop = (f: Film, el: Element | Element[], at: number, stagger = 0): number =>
  f.to(el, { opacity: [0, 1], scale: [0.6, 1] }, { at, dur: 0.4, ease: "pop", stagger });
export const gone = (f: Film, el: Element | Element[], at: number, dur = 0.25): number =>
  f.to(el, { opacity: 0 }, { at, dur, ease: "outQuad" });

// A key cap springs in, is pressed, and fades.
export const press = (f: Film, key: Element, at: number, hold = 1.1): number => {
  f.to(key, { opacity: [0, 1], y: [10, 0], scale: [0.8, 1] }, { at, dur: 0.3, ease: "pop" });
  f.cls(key, "down", { from: at + 0.32, to: at + 0.5 });
  return f.to(key, { opacity: 0, y: -6 }, { at: at + hold, dur: 0.3, ease: "inQuad" });
};

// A rewind cue over the frame: two back-pointing triangles in a disc, for the
// cut from an episode's promise (its end state) back to the start.
export const rewindCue = (f: Film, at: number): HTMLElement => {
  const el = html(
    `<div class="oq-rewind"><svg viewBox="0 0 48 48" width="46" height="46"><path d="M23 13 9 24l14 11zM39 13 25 24l14 11z" fill="currentColor"/></svg></div>`,
  );
  f.overlay.append(el);
  f.to(el, { opacity: [0, 1], scale: [0.7, 1] }, { at, dur: 0.22, ease: "outQuad" });
  f.to(el, { opacity: 0, scale: 1.08 }, { at: at + 0.75, dur: 0.3, ease: "inQuad" });
  return el;
};

// ------------------------------------------------------------------ end card

export type EndCard = { root: HTMLElement; veil: HTMLElement; parts: HTMLElement[]; dots: HTMLElement[] };

// The last five seconds of every episode: what is next (with a glimpse of its
// payoff), where this one sits in the series, its tutorial, and what to get.
export const buildEndCard = (f: Film, n: number, glimpse: string): EndCard => {
  const ep = EPISODES[n - 1];
  const next = EPISODES[n];
  const dots = EPISODES.map(
    (e) => `<i class="${e.n < n ? "done" : e.n === n ? "now" : ""}"></i>`,
  ).join("");
  const nextBlock = next
    ? `<div class="ec-next" data-part><div class="ec-label">Next · ${next.n}/${SERIES.total}</div><div class="ec-title">${esc(next.title)}</div></div><div class="ec-glimpse" data-part>${glimpse}</div>`
    : `<div class="ec-next" data-part><div class="ec-label">Start again · 1/${SERIES.total}</div><div class="ec-title">${esc(EPISODES[0].title)}</div></div><div class="ec-glimpse" data-part>${glimpse}</div>`;
  const root = html(`<div class="oq-end">
    <div class="ec-veil"></div>
    <div class="ec-body">${nextBlock}</div>
    <div class="ec-foot" data-part>
      <div class="ec-rail">${dots}</div>
      <div class="ec-src">Written tutorial: Tutorial/${esc(ep.tutorial)}</div>
      <div class="ec-cta">${esc(CTA[ep.needs])}</div>
    </div>
  </div>`);
  f.overlay.append(root);
  return {
    root,
    veil: f.q(".ec-veil", root),
    parts: f.qa("[data-part]", root) as HTMLElement[],
    dots: f.qa(".ec-rail i", root) as HTMLElement[],
  };
};

export const endCardIn = (f: Film, card: EndCard, at: number): number => {
  f.set(card.root, { opacity: 1 }, at);
  f.to(card.veil, { opacity: [0, 1] }, { at, dur: 0.6, ease: "outQuad" });
  f.to(card.parts, { opacity: [0, 1], y: [18, 0] }, { at: at + 0.25, dur: 0.6, ease: "arrive", stagger: 0.12 });
  return at + 0.9;
};
