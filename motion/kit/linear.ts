import type { Film } from "../engine/runtime";
import { icon } from "./icons";
import { esc, inline, refAttr, type Box, type Pos } from "./util";
import { roleAvatar, windowShell, type Role } from "./window";

// A Linear ticket page: breadcrumb, title, property chips, sections of text, and
// a checklist section (Done When) whose rings a scene can pulse and fill.

export const TICKET_WIN: Box = { w: 780, h: 690 };

export type TicketProp = {
  kind: "status" | "assignee" | "label" | "plain";
  text: string;
  // For an assignee: the role whose avatar shows.
  role?: Role;
};

export type TicketSection = {
  ref?: string;
  heading: string;
  // A paragraph. `fold` clamps it to two lines; `muted` is small and grey.
  text?: string;
  style?: "fold" | "muted";
  // A checklist: one ring per item, in a card.
  items?: string[];
};

export type TicketSpec = {
  id?: string;
  at: Pos;
  size?: Box;
  workspace?: string;
  team?: string;
  ticketId: string;
  slug: string;
  title: string;
  props?: TicketProp[];
  sections: TicketSection[];
  role?: Role;
};

const propHtml = (p: TicketProp): string => {
  const lead =
    p.kind === "status"
      ? '<i class="k-dot"></i>'
      : p.kind === "label"
        ? '<i class="k-tag"></i>'
        : p.kind === "assignee" && p.role
          ? roleAvatar(p.role, 16)
          : "";
  return `<div class="k-chip-prop">${lead}${esc(p.text)}</div>`;
};

const sectionHtml = (s: TicketSection): string => {
  if (s.items) {
    return `<div class="k-t-done"${refAttr(s.ref)}><h3>${esc(s.heading)}</h3>${s.items
      .map(
        (text, i) =>
          `<div class="k-dw-item" data-i="${i}"><span class="k-dw-ring"><i class="k-halo"></i>${icon("check", 16, 3.4)}</span><span class="k-dw-text">${inline(text)}</span></div>`,
      )
      .join("")}</div>`;
  }
  const cls = s.style === "fold" ? " fold" : s.style === "muted" ? " muted" : "";
  return `<div class="k-t-sec${cls}"${refAttr(s.ref)}><h3>${esc(s.heading)}</h3>${s.text ? `<p>${inline(s.text)}</p>` : ""}</div>`;
};

export const ticketBody = (s: TicketSpec): string => `<div class="k-ticket">
    <div class="k-t-crumb"><span>${esc(s.team ?? "Engineering")}</span><span class="sep">›</span><span>${esc(s.ticketId)}</span></div>
    <h1 class="k-t-title">${inline(s.title)}</h1>
    <div class="k-t-props">${(s.props ?? []).map(propHtml).join("")}</div>
    ${s.sections.map(sectionHtml).join("")}
    <div class="k-fade-bottom"></div>
  </div>`;

export type Ticket = {
  win: HTMLElement;
  // The first checklist section, or null.
  done: HTMLElement | null;
  items: HTMLElement[];
  rings: HTMLElement[];
  halos: HTMLElement[];
  ticks: HTMLElement[];
  q: <T extends HTMLElement = HTMLElement>(ref: string) => T;
};

export const buildTicket = (f: Film, spec: TicketSpec): Ticket => {
  const win = windowShell({
    id: spec.id ?? "ticket",
    ...(spec.size ?? TICKET_WIN),
    ...spec.at,
    url: `linear.app/${spec.workspace ?? "discourse-graphs"}/issue/${spec.ticketId}/${spec.slug}`,
    role: spec.role,
    body: ticketBody(spec),
  });
  f.world.append(win);
  const hasItems = spec.sections.some((s) => s.items?.length);
  const doneSection = spec.sections.find((s) => s.items);
  return {
    win,
    done: doneSection?.ref
      ? f.q<HTMLElement>(`[data-ref="${doneSection.ref}"]`, win)
      : doneSection
        ? f.q<HTMLElement>(".k-t-done", win)
        : null,
    items: hasItems ? f.qa(".k-dw-item", win) : [],
    rings: hasItems ? f.qa(".k-dw-ring", win) : [],
    halos: hasItems ? f.qa(".k-halo", win) : [],
    ticks: hasItems ? f.qa(".k-dw-ring .ic", win) : [],
    q: <T extends HTMLElement = HTMLElement>(ref: string): T => f.q<T>(`[data-ref="${ref}"]`, win),
  };
};
