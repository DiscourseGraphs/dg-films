import { html, type Film } from "../engine/runtime";
import { COLORS } from "./colors";
import { icon, type IconName } from "./icons";
import { esc } from "./util";
import { ROLES, type Role } from "./window";

// The progress rail: a small pill low in a corner that says where in the story the
// film is, and whose point of view the shot is from. Icons or numbers only: the
// voiceover names the stages. It stays out of the middle of the picture; frame
// shots with lift() (helpers.ts) so its corner is clear.

export type Stage = {
  key: string;
  // An icon in the node; without one the node shows its number, and a tick once reached.
  icon?: IconName;
};

export type HudSpec = {
  stages: Stage[];
  // Role avatars at the rail's left end; hudPerson swells the one whose view the shot is.
  people?: Role[];
  corner?: "left" | "right";
};

export type Hud = {
  root: HTMLElement;
  keys: string[];
  nodes: HTMLElement[];
  segs: HTMLElement[];
  fills: HTMLElement[];
  who: HTMLElement | null;
  people: Partial<Record<Role, HTMLElement>>;
};

export const hudHtml = (spec: HudSpec): string => {
  const people = spec.people ?? [];
  const who = people.length
    ? `<span class="k-who">${people
        .map((role) => `<i class="k-avatar ${role}" data-p="${role}">${icon(ROLES[role].icon, 12, 2.3)}</i>`)
        .join("")}</span><span class="k-rail-div"></span>`
    : "";
  const nodes = spec.stages
    .map(
      (stage, i) =>
        `${i ? '<span class="k-seg"><i></i></span>' : ""}<span class="k-node" data-stage="${esc(stage.key)}">${
          stage.icon ? icon(stage.icon, 11, 2.3) : `<s>${i + 1}</s>${icon("check", 11, 3.2)}`
        }</span>`,
    )
    .join("");
  return `<div class="k-rail${spec.corner === "right" ? " right" : ""}">${who}${nodes}</div>`;
};

export const buildHud = (f: Film, spec: HudSpec): Hud => {
  if (!spec.stages.length) throw new Error("a rail needs at least one stage");
  const root = html(hudHtml(spec));
  f.overlay.append(root);
  const people: Partial<Record<Role, HTMLElement>> = {};
  for (const role of spec.people ?? []) people[role] = f.q<HTMLElement>(`[data-p=${role}]`, root);
  const segs = spec.stages.length > 1 ? f.qa<HTMLElement>(".k-seg", root) : [];
  const fills = spec.stages.length > 1 ? f.qa<HTMLElement>(".k-seg i", root) : [];
  // The rail starts empty: no segment is filled until a stage is reached.
  if (fills.length) f.set(fills, { scaleX: 0 });
  return {
    root,
    keys: spec.stages.map((stage) => stage.key),
    nodes: f.qa(".k-node", root),
    segs,
    fills,
    who: spec.people?.length ? f.q<HTMLElement>(".k-who", root) : null,
    people,
  };
};

export type StageState = "idle" | "on" | "done";

// Earlier stages done, this one lit, later ones idle. `index` equal to the count means all done.
export const stageStates = (count: number, index: number): StageState[] =>
  Array.from({ length: count }, (_, i): StageState => (i < index ? "done" : i === index ? "on" : "idle"));

const LOOK = {
  idle: { backgroundColor: COLORS.idleFill, borderColor: COLORS.idleBorder, color: COLORS.idleInk },
  on: { backgroundColor: COLORS.blue, borderColor: COLORS.blue, color: "#ffffff" },
  done: { backgroundColor: COLORS.green, borderColor: COLORS.green, color: "#ffffff" },
};

// Move the rail to a stage (by key), or "all" for every stage done.
export const hudStage = (f: Film, hud: Hud, stage: string, at: number): void => {
  const index = stage === "all" ? hud.keys.length : hud.keys.indexOf(stage);
  if (index < 0) throw new Error(`No rail stage "${stage}". Stages: ${hud.keys.join(", ")}`);
  const states = stageStates(hud.keys.length, index);
  hud.nodes.forEach((node, i) => {
    f.to(node, LOOK[states[i]], { at, dur: 0.45, ease: "outCubic" });
    const number = node.querySelector("s");
    const tick = node.querySelector("s + .ic");
    if (number && tick) {
      f.to(number, { opacity: states[i] === "done" ? 0 : 1 }, { at, dur: 0.3, ease: "outQuad" });
      f.to(tick, { opacity: states[i] === "done" ? 1 : 0 }, { at, dur: 0.3, ease: "outQuad" });
    }
  });
  hud.fills.forEach((fill, i) => {
    f.to(fill, { scaleX: i < index ? 1 : 0 }, { at, dur: 0.45, ease: "outCubic" });
  });
};

// Whose point of view the shot is from: that role's avatar at the rail's left end
// swells to twice its size for a moment, then settles. The others fade out.
export const hudPerson = (f: Film, hud: Hud, who: Role, at: number): void => {
  if (!hud.people[who]) throw new Error(`The rail has no ${who} avatar; pass people: ["${who}"] to buildHud`);
  for (const [name, el] of Object.entries(hud.people)) {
    const on = name === who;
    f.to(el, { opacity: on ? 1 : 0 }, { at, dur: on ? 0.25 : 0.3, ease: "outQuad" });
    if (on) {
      f.to(el, { scale: [0.5, 2.1] }, { at, dur: 0.4, ease: "outBack" });
      f.to(el, { scale: 1 }, { at: at + 1.1, dur: 0.6, ease: "inOutCubic" });
      f.sound("pop", at, { gain: -4, pitch: -2 });
    }
  }
};

// Every role side by side, for the end.
export const PERSON_STEP = 25;
export const hudEveryone = (f: Film, hud: Hud, at: number): void => {
  const present = Object.values(hud.people);
  if (!hud.who || !present.length) throw new Error("The rail has no avatars to show together");
  f.to(hud.who, { width: [21, 21 + (present.length - 1) * PERSON_STEP] }, { at, dur: 0.6, ease: "glide" });
  present.forEach((el, i) => {
    if (i === 0) f.to(el, { opacity: 1, x: 0 }, { at, dur: 0.4, ease: "outQuad" });
    else f.to(el, { opacity: [0, 1], x: [0, i * PERSON_STEP] }, { at, dur: 0.6, ease: "glide" });
  });
};
