// Small string helpers the kit's markup builders share. Pure: they load in plain
// Node, so the tests can build every part's markup without a browser.

import { esc } from "../engine/runtime";

export { esc };

// Escape text, turning `code` into <code>.
export const inline = (text: string): string => esc(text).replace(/`([^`]+)`/g, "<code>$1</code>");

// ` data-ref="name"`, or nothing for a part nobody needs to find again.
export const refAttr = (name?: string): string => (name ? ` data-ref="${esc(name)}"` : "");

export type Box = { w: number; h: number };
export type Pos = { cx: number; cy: number };

// Where a popup sits in its parent, in design units. "center" centers on that
// axis and needs the size on that axis; it uses a margin, not a transform, so
// it composes with the engine's x/y tweens (which write the `translate` property).
export type Place = { left?: number | "center"; top?: number | "center"; width?: number; height?: number };

export const placeCss = (p: Place): string => {
  const out: string[] = [];
  if (p.left === "center") {
    if (p.width === undefined) throw new Error('left: "center" needs a width');
    out.push("left:50%", `margin-left:${-p.width / 2}px`);
  } else if (p.left !== undefined) out.push(`left:${p.left}px`);
  if (p.top === "center") {
    if (p.height === undefined) throw new Error('top: "center" needs a height');
    out.push("top:50%", `margin-top:${-p.height / 2}px`);
  } else if (p.top !== undefined) out.push(`top:${p.top}px`);
  if (p.width !== undefined) out.push(`width:${p.width}px`);
  if (p.height !== undefined) out.push(`height:${p.height}px`);
  return out.join(";");
};

// A style attribute from a placement plus extras; hidden parts start at opacity 0.
export const styleAttr = (p: Place, opts: { hidden?: boolean; extra?: string } = {}): string => {
  const parts = [placeCss(p), opts.hidden ? "opacity:0" : "", opts.extra ?? ""].filter(Boolean);
  return parts.length ? ` style="${parts.join(";")}"` : "";
};

// Seconds as m:ss, the way a video player shows its clock.
export const clock = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};
