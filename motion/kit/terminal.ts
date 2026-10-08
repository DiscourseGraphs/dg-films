import type { Film } from "../engine/runtime";
import { esc, type Box, type Pos } from "./util";
import { windowShell, type Role } from "./window";

// A dark terminal window that prints lines, with a caret, typed spans and a
// scroll to any line. A line is a row of markup, built from the helpers below.

export const TERM_WIN: Box = { w: 860, h: 640 };

export type TermColor = "p" | "dim" | "hi" | "ok" | "no" | "am" | "bl";

// A colored span: p (prompt green), dim, hi (bright), ok, no, am (amber), bl (blue).
export const tspan = (color: TermColor, text: string): string => `<span class="k-t-${color}">${esc(text)}</span>`;

// A blinking block that a scene turns on while something is being typed. `name` finds it in Terminal.carets.
export const tcaret = (name: string): string => `<span class="k-caret" data-c="${esc(name)}"></span>`;

// A span a scene fills with f.type; find it as `[data-t=name]` inside its line.
export const ttyped = (name: string, color: TermColor = "hi"): string =>
  `<span class="k-t-${color}" data-t="${esc(name)}"></span>${tcaret(name)}`;

// "$ command" with the command typed on: `caret` names its caret.
export const tprompt = (command: string, caret: string): string =>
  `${tspan("p", "$")} <span class="k-t-hi">${esc(command)}</span>${tcaret(caret)}`;

export type TermLine = { id: string; html: string };

export type TermSpec = {
  id?: string;
  at: Pos;
  size?: Box;
  // What the title bar shows where a browser shows an address.
  title: string;
  role?: Role;
  lines: TermLine[];
};

export type Terminal = {
  win: HTMLElement;
  // Everything printed; it scrolls up (y goes negative) as the terminal fills.
  inner: HTMLElement;
  lines: Record<string, HTMLElement>;
  carets: Record<string, HTMLElement>;
  // How far down the printed text a line starts, measured at build time.
  offsetOf: (id: string) => number;
};

export const terminalBody = (lines: TermLine[]): string =>
  `<div class="k-term"><div class="k-term-inner">${lines.map((l) => `<div class="k-ln" data-line="${esc(l.id)}">${l.html}</div>`).join("")}</div></div>`;

// The y that puts a line where the first line sat, at the top of the terminal's padding;
// `air` leaves that many units of the lines above it showing.
export const scrollY = (lineOffset: number, air = 0): number => -Math.max(0, lineOffset - air);

export const buildTerminal = (f: Film, spec: TermSpec): Terminal => {
  const win = windowShell({
    id: spec.id ?? "term",
    ...(spec.size ?? TERM_WIN),
    ...spec.at,
    url: spec.title,
    role: spec.role,
    dark: true,
    body: terminalBody(spec.lines),
  });
  f.world.append(win);
  const lines: Record<string, HTMLElement> = {};
  const carets: Record<string, HTMLElement> = {};
  for (const { id } of spec.lines) lines[id] = f.q(`[data-line="${id}"]`, win);
  for (const el of win.querySelectorAll<HTMLElement>("[data-c]")) carets[el.dataset.c ?? ""] = el;
  const inner = f.q(".k-term-inner", win);
  // Measured now, while every line still holds its full text and nothing is scrolled.
  const top = inner.getBoundingClientRect().top;
  const offsets = new Map(spec.lines.map(({ id }) => [id, Math.max(0, lines[id].getBoundingClientRect().top - top)]));
  return { win, inner, lines, carets, offsetOf: (id) => offsets.get(id) ?? 0 };
};

// Scroll the terminal so a line sits at the top, the way a terminal does when it fills.
export const scrollTerm = (f: Film, term: Terminal, lineId: string, at: number, dur = 0.6): number =>
  f.to(term.inner, { y: scrollY(term.offsetOf(lineId)) }, { at, dur, ease: "glide" });
