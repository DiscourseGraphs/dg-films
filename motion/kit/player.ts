import type { Film } from "../engine/runtime";
import { roamTopBar } from "./roam";
import { clamp01 } from "./helpers";
import { clock, esc, refAttr, type Box } from "./util";

// A video player on a page: a mini Roam screen that changes with the video's
// chapters, a caption, a play button until it plays, a scrubber with one tick
// per chapter. A film draws the player's screens from the same kit parts the
// live windows use, scaled down.

// The mini Roam is drawn at this size and scaled to the player (see fitPlayer).
export const SCREEN: Box = { w: 1120, h: 630 };

// One screen the video can show: the main column's content (page markup plus
// any popups, placed in the main column's coordinates).
export type PlayerFrame = { id: string; html: string };

export type Chapter = {
  id: string;
  // Seconds into the video.
  at: number;
  // Shown as the caption while the chapter plays.
  title: string;
  // Which frame the chapter shows.
  frame: string;
};

export type PlayerSpec = {
  // data-ref prefix: the parts are `<id>-fill`, `<id>-time`, `<id>-caption`, `<id>-play`, `<id>-tip`, `<id>-tick-<chapter>`.
  id: string;
  // The video's length in seconds.
  length: number;
  frames: PlayerFrame[];
  chapters?: Chapter[];
  // Draw a tick per chapter on the scrubber.
  ticks?: boolean;
  // A recording made by hand: no captions.
  loom?: boolean;
  graph?: string;
};

export const playerHtml = (s: PlayerSpec): string => {
  const ticks = s.ticks
    ? (s.chapters ?? [])
        .map((c) => `<i class="k-tick"${refAttr(`${s.id}-tick-${c.id}`)} style="left:${(c.at / s.length) * 100}%"></i>`)
        .join("")
    : "";
  return `<div class="k-player${s.loom ? " loom" : ""}"${refAttr(s.id)}>
    <div class="k-screen">
      <div class="k-tf-wrap" style="width:${SCREEN.w}px;height:${SCREEN.h}px">
        <div class="k-roam">
          ${roamTopBar({ graph: s.graph, tools: false })}
          <div class="k-rm-main">${s.frames
            .map(
              (frame, i) =>
                `<div class="k-tf${i === 0 ? " on" : ""}" data-frame="${esc(frame.id)}">${frame.html}</div>`,
            )
            .join("")}</div>
        </div>
      </div>
      <div class="k-caption"${refAttr(`${s.id}-caption`)}></div>
      <div class="k-playbtn"${refAttr(`${s.id}-play`)}><svg width="24" height="24" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></div>
    </div>
    <div class="k-bar"><span${refAttr(`${s.id}-time`)}>0:00</span><div class="k-track"${refAttr(`${s.id}-track`)}><div class="k-fill"${refAttr(`${s.id}-fill`)}></div>${ticks}</div><span>${clock(s.length)}</span><div class="k-tip"${refAttr(`${s.id}-tip`)}></div></div>
  </div>`;
};

// Scale the drawn screen to the player's width. Run once the player is in the
// page and laid out, before the first frame.
export const fitPlayer = (player: HTMLElement): void => {
  const screen = player.querySelector<HTMLElement>(".k-screen");
  const wrap = player.querySelector<HTMLElement>(".k-tf-wrap");
  if (!screen || !wrap) throw new Error("not a player");
  wrap.style.scale = String(screen.getBoundingClientRect().width / SCREEN.w);
};

// The chapter playing at second `s`: the last one that has started.
export const chapterAt = (chapters: Chapter[], s: number): Chapter | undefined => {
  let active: Chapter | undefined;
  for (const chapter of chapters) if (s >= chapter.at && (!active || chapter.at >= active.at)) active = chapter;
  return active;
};

// How far along the scrubber's fill is at second `s`, as a percentage.
export const fillPercent = (s: number, length: number): number => clamp01(s / length) * 100;

// Everything the video changes as it plays, as a function of the second it is
// at: the fill and the clock, which chapters have passed, which screen is up and
// what its caption says. Pure in `s`, so it can be driven from f.fn:
//
//   const video = driveTake(f, player, spec);
//   f.fn({ at: 5, dur: 10, ease: "linear" }, (p) => video(p * spec.length));
export const driveTake = (f: Film, player: HTMLElement, spec: PlayerSpec): ((s: number) => void) => {
  const part = (name: string): HTMLElement => f.q(`[data-ref="${spec.id}-${name}"]`, player);
  const fill = part("fill");
  const time = part("time");
  const caption = part("caption");
  const frames = spec.frames.map((frame) => [frame.id, f.q(`[data-frame="${frame.id}"]`, player)] as const);
  const chapters = spec.chapters ?? [];
  const ticks = chapters.map((c) => ({
    at: c.at,
    el: player.querySelector<HTMLElement>(`[data-ref="${spec.id}-tick-${c.id}"]`),
  }));
  const first = spec.frames[0]?.id;
  return (s) => {
    fill.style.width = `${fillPercent(s, spec.length)}%`;
    time.textContent = clock(s);
    const active = chapterAt(chapters, s);
    const shown = active?.frame ?? first;
    for (const [id, el] of frames) el.classList.toggle("on", id === shown);
    caption.textContent = active ? active.title : "";
    player.classList.toggle("playing", s > 0.05);
    for (const tick of ticks) tick.el?.classList.toggle("passed", s >= tick.at);
  };
};
