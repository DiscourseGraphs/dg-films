import type { Film } from "../engine/runtime";
import { icon, type IconName } from "./icons";
import { esc, inline, refAttr, type Box, type Pos } from "./util";
import { WIN_BAR, windowShell, type Role } from "./window";

// Roam's own screen: top bar, a main column of pages, an optional right sidebar,
// and a layer over all of it for popups.

export const ROAM_WIN: Box = { w: 1120, h: 660 };
export const ROAM_TOP = 44;
export const SIDE_W = 440;

// ------------------------------------------------------------ blocks (markup)

// `proves::`: a block attribute. The name is escaped.
export const attr = (name: string): string => `<span class="k-attr">${esc(name)}<s>::</s></span>`;

// The little blue tag some blocks start with.
export const chip = (text: string): string => `<span class="k-chip">${esc(text)}</span>`;

// A block: a bullet and a row of text, and nested blocks under it. `rowHtml` and
// `kids` are markup (pass `inline(text)` for plain text). `ref` is the data-ref
// scenes find it by; "" for none. `closed` draws a collapsed block: the bullet
// gets Roam's ring and the children are hidden until the class comes off.
export const blk = (ref: string, rowHtml: string, kids = "", opts: { closed?: boolean } = {}): string =>
  `<div class="k-blk${opts.closed ? " closed" : ""}"${refAttr(ref)}><div class="k-row"><span class="k-bul"></span><span class="k-txt">${rowHtml}</span></div>${kids ? `<div class="k-kids">${kids}</div>` : ""}</div>`;

// A wrapper whose height a scene animates to fold blocks away or open them.
export const collapse = (ref: string, inner: string): string => `<div class="k-collapse"${refAttr(ref)}>${inner}</div>`;

export type PageSpec = {
  ref?: string;
  title: string;
  titleRef?: string;
  // The page's blocks (markup, from blk()).
  blocks: string;
  // Markup between the title and the blocks, such as dgContext().
  before?: string;
  // Tighter rows and a smaller title, so more blocks fit on a screen.
  dense?: boolean;
  // Start at opacity 0, for a page a scene fades in over another.
  hidden?: boolean;
};

// One Roam page. Its right padding (130 units) keeps text away from the sidebar
// edge, so a camera region that starts at the sidebar never cuts through a word.
export const roamPage = (s: PageSpec): string =>
  `<div class="k-rm-page${s.dense ? " dense" : ""}"${refAttr(s.ref)}${s.hidden ? ' style="opacity:0"' : ""}><h1 class="k-rm-title"${refAttr(s.titleRef)}>${inline(s.title)}</h1>${s.before ?? ""}${s.blocks}</div>`;

// -------------------------------------------------------------- bar, sidebar

export const roamTopBar = (o: { graph?: string; tools?: boolean; search?: string } = {}): string => {
  const tool = (name: IconName, size = 17): string => `<span class="k-rm-ic small">${icon(name, size)}</span>`;
  return `<div class="k-rm-top">
    <span class="k-rm-ic">${icon("menu", 18)}</span>
    <span class="k-rm-ic">${icon("back", 18)}</span>
    <span class="k-rm-ic">${icon("forward", 18)}</span>
    ${o.graph ? `<span class="k-rm-graph">${esc(o.graph)}</span>` : ""}
    <span class="k-rm-grow"></span>
    <i class="k-rm-sync"></i>
    <span class="k-rm-search">${icon("search", 14)}<span>${esc(o.search ?? "Find or Create Page")}</span></span>
    ${o.tools === false ? "" : `${tool("book")}${tool("filter", 16)}${tool("calendar")}${tool("dotsH")}${tool("sidebar")}${tool("help")}${tool("sun")}`}
  </div>`;
};

export type SidebarSpec = {
  // The heading of the one item the sidebar holds.
  title: string;
  body: string;
  width?: number;
};

export const roamSidebar = (s: SidebarSpec): string =>
  `<div class="k-rm-side"${refAttr("roam-side")}>
    <div class="k-rm-side-head"><span>${icon("caretDown", 14, 2.4)}</span><span class="k-grow">${esc(s.title)}</span><span>${icon("dotsH", 16)}</span><span>${icon("x", 14)}</span></div>
    ${s.body}
  </div>`;

// --------------------------------------------------------------- the window

export type RoamSpec = {
  id: string;
  at: Pos;
  // The window's outer size (default 1120x660).
  size?: Box;
  graph: string;
  url?: string;
  role?: Role;
  urlWidth?: number;
  // Show the graph's name in the top bar.
  showGraph?: boolean;
  // Stacked pages in the main column (roamPage markup); scenes fade between them.
  pages?: string[];
  // Custom markup for the main column instead of pages, such as a canvas.
  main?: string;
  // Markup for the popup layer (see popups.ts). Coordinates are the Roam surface's.
  popups?: string;
  sidebar?: SidebarSpec;
};

export type Roam = {
  win: HTMLElement;
  // The Roam surface: the window body, where popups are placed.
  surface: HTMLElement;
  main: HTMLElement;
  side: HTMLElement | null;
  layer: HTMLElement;
  // Sizes in design units: the surface (the window minus its bar) and the main column.
  surfaceSize: Box;
  mainSize: Box;
  // Find a part by its data-ref inside this window.
  q: <T extends HTMLElement = HTMLElement>(ref: string) => T;
};

export const surfaceSize = (size: Box): Box => ({ w: size.w, h: size.h - WIN_BAR });

export const roamBodyHtml = (spec: RoamSpec): string => {
  const sideW = spec.sidebar ? (spec.sidebar.width ?? SIDE_W) : 0;
  return `<div class="k-roam" style="--side-w:${sideW}px;--roam-side-w:${sideW}px">
      ${roamTopBar({ graph: spec.showGraph ? spec.graph : undefined })}
      <div class="k-rm-main"${refAttr("roam-main")}>${spec.main ?? (spec.pages ?? []).join("")}</div>
      ${spec.sidebar ? roamSidebar(spec.sidebar) : ""}
      <div class="k-rm-layer"${refAttr("roam-layer")}>${spec.popups ?? ""}</div>
    </div>`;
};

export const buildRoam = (f: Film, spec: RoamSpec): Roam => {
  const size = spec.size ?? ROAM_WIN;
  const win = windowShell({
    id: spec.id,
    ...spec.at,
    ...size,
    url: spec.url ?? `roamresearch.com/#/app/${spec.graph}`,
    role: spec.role,
    urlWidth: spec.urlWidth,
    body: roamBodyHtml(spec),
  });
  f.world.append(win);
  const q = <T extends HTMLElement = HTMLElement>(ref: string): T => f.q<T>(`[data-ref="${ref}"]`, win);
  const surface = surfaceSize(size);
  const sideW = spec.sidebar ? (spec.sidebar.width ?? SIDE_W) : 0;
  return {
    win,
    surface: f.q(".k-roam", win),
    main: q("roam-main"),
    side: spec.sidebar ? q("roam-side") : null,
    layer: q("roam-layer"),
    surfaceSize: surface,
    mainSize: { w: surface.w - sideW, h: surface.h - ROAM_TOP },
    q,
  };
};
