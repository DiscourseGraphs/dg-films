import { esc, html, type Film } from "../engine/runtime";
import { icon } from "./icons";
import { refAttr } from "./util";

// The Discourse Graphs canvas (a tldraw whiteboard inside a Roam page): node
// cards, relation arrows, tldraw's own chrome, the node card's context menu and
// the canvas drawer. Everything is drawn from the extension's source; the film
// supplies the nodes, arrows and rows.

// ------------------------------------------------------------------ defaults

export type NodeKind = {
  code: string;
  label: string;
  shortcut: string;
  // The tag that makes a block this kind of node ("" when it has none).
  tag: string;
  // `dot` is the configured color; bg, fg and border are what the extension's
  // getPleasingColors returns for it.
  dot: string;
  bg: string;
  fg: string;
  border: string;
};

// Default node types (data/defaultDiscourseNodes.ts) with their card colors.
export const DG_KINDS = {
  question: {
    code: "QUE",
    label: "Question",
    shortcut: "Q",
    tag: "",
    dot: "#99890e",
    bg: "#f8f4d3",
    fg: "#252103",
    border: "#e5cc15",
  },
  claim: {
    code: "CLM",
    label: "Claim",
    shortcut: "C",
    tag: "#clm-candidate",
    dot: "#7da13e",
    bg: "#e8efdc",
    fg: "#58722c",
    border: "#a5c66c",
  },
  evidence: {
    code: "EVD",
    label: "Evidence",
    shortcut: "E",
    tag: "#evd-candidate",
    dot: "#db134a",
    bg: "#f8d3dd",
    fg: "#910d30",
    border: "#ef4875",
  },
  source: {
    code: "SRC",
    label: "Source",
    shortcut: "S",
    tag: "",
    dot: "#9e9e9e",
    bg: "#e6e6e6",
    fg: "#4f4f4f",
    border: "#9c9c9c",
  },
  block: {
    code: "BLK",
    label: "Block",
    shortcut: "B",
    tag: "",
    dot: "#505050",
    bg: "#e6e6e6",
    fg: "#4f4f4f",
    border: "#9c9c9c",
  },
} as const satisfies Record<string, NodeKind>;

export type Relation = { label: string; color: string };

// Relation colors (getRelationColor, in tldraw's palette).
export const DG_RELATIONS = {
  supports: { label: "Supports", color: "#099268" },
  opposes: { label: "Opposes", color: "#e03131" },
  informs: { label: "Informs", color: "#adb5bd" },
} as const satisfies Record<string, Relation>;

// ------------------------------------------------------------------ geometry

export type Box4 = { x: number; y: number; w: number; h: number };

// The gap the Context tab leaves between the selected card and a card it adds,
// and between stacked cards (NEW_NODE_OFFSET_PX, NEW_NODE_GAP_PX in
// CustomStylePanel.tsx).
export const NEW_NODE_OFFSET = 240;
export const NEW_NODE_GAP = 24;

// The first free slot in the column to the right of an anchor, as
// getFreePositionInColumn does it: start level with the anchor's top and step
// below every card in the column that is in the way.
export const freeSlot = (anchor: Box4, others: Box4[], w: number, h: number): { x: number; y: number } => {
  const x = anchor.x + anchor.w + NEW_NODE_OFFSET;
  const blockers = others.filter((b) => b.x < x + w && b.x + b.w > x).sort((a, b) => a.y - b.y);
  let y = anchor.y;
  for (const b of blockers) {
    if (b.y + b.h + NEW_NODE_GAP <= y) continue;
    if (b.y >= y + h + NEW_NODE_GAP) break;
    y = b.y + b.h + NEW_NODE_GAP;
  }
  return { x, y };
};

// A straight arrow between two cards: centre to centre, trimmed to each card's
// outline plus a gap, with an open head at the end. `d` is the line, `head` the
// two strokes of the arrowhead, `mid` where the label sits.
export const arrowPath = (
  from: Box4,
  to: Box4,
  opts: { gap?: number; arm?: number; spread?: number } = {},
): { d: string; head: string; mid: { x: number; y: number } } => {
  const gap = opts.gap ?? 6;
  const arm = opts.arm ?? 13;
  const spread = opts.spread ?? 0.5;
  const cs = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
  const ct = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
  const dx = ct.x - cs.x;
  const dy = ct.y - cs.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // How far along the direction from a card's centre its outline lies.
  const reach = (b: Box4): number => {
    const tx = ux === 0 ? Infinity : b.w / 2 / Math.abs(ux);
    const ty = uy === 0 ? Infinity : b.h / 2 / Math.abs(uy);
    return Math.min(tx, ty);
  };
  const a = { x: cs.x + ux * (reach(from) + gap), y: cs.y + uy * (reach(from) + gap) };
  const b = { x: ct.x - ux * (reach(to) + gap), y: ct.y - uy * (reach(to) + gap) };
  const back = Math.atan2(uy, ux) + Math.PI;
  const p1 = { x: b.x + Math.cos(back + spread) * arm, y: b.y + Math.sin(back + spread) * arm };
  const p2 = { x: b.x + Math.cos(back - spread) * arm, y: b.y + Math.sin(back - spread) * arm };
  const n = (v: number): string => v.toFixed(1);
  return {
    d: `M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}`,
    head: `M${n(p1.x)} ${n(p1.y)}L${n(b.x)} ${n(b.y)}L${n(p2.x)} ${n(p2.y)}`,
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
};

// ------------------------------------------------------------------- canvas

export type CanvasNode = {
  id: string;
  kind: string;
  // The page title as the card shows it; a block card shows its block text.
  title: string;
  // Card origin in canvas units. Cards without one stay unplaced until the film places them.
  at?: { x: number; y: number };
};

export type CanvasArrow = { id: string; from: string; to: string; relation: string };

export type CanvasSpec = {
  id?: string;
  // The tldraw container, in the host's coordinates.
  box: { x: number; y: number; w: number; h: number };
  // The page title shown above the container (left 52).
  title?: string;
  kinds?: Record<string, NodeKind>;
  relations?: Record<string, Relation>;
  nodes: CanvasNode[];
  arrows?: CanvasArrow[];
  zoom?: string;
  // Block cards (kind "block") get the sidebar, Add tag and Convert buttons.
  block?: { convert: string; tag: { text: string; kind: string } };
};

export type Card = {
  id: string;
  node: CanvasNode;
  kind: NodeKind;
  el: HTMLElement;
  // The selection outline and handles, shown when the card is selected.
  sel: HTMLElement;
  // Canvas units. w and h are measured once fonts are in.
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ArrowShape = {
  def: CanvasArrow;
  g: SVGGElement;
  line: SVGPathElement;
  head: SVGPathElement;
  label: HTMLElement;
};

export type BlockParts = { card: Card; addTag: HTMLElement; convert: HTMLElement; text: HTMLElement; tag: HTMLElement };

export type Canvas = {
  tl: HTMLElement;
  // The pannable, zoomable layer: tween x, y and scale on it.
  cv: HTMLElement;
  cards: Record<string, Card>;
  arrows: Record<string, ArrowShape>;
  toolbar: HTMLElement;
  zoomLabel: HTMLElement;
  drawerToggle: HTMLElement;
  block: BlockParts | null;
  // Move a card's element to its x, y.
  place: (card: Card) => void;
  // Aim every arrow at its cards' current boxes.
  aimAll: () => void;
};

const SVG_NS = "http://www.w3.org/2000/svg";

const cardHtml = (id: string, node: CanvasNode, kind: NodeKind, spec: CanvasSpec): string => {
  const style = `background:${kind.bg};color:${kind.fg}`;
  const sel = `<i class="k-sel">${["nw", "ne", "sw", "se"].map((c) => `<b class="k-hd ${c}"></b>`).join("")}</i>`;
  if (node.kind === "block" && spec.block) {
    const tagKind = ((spec.kinds ?? DG_KINDS) as Record<string, NodeKind>)[spec.block.tag.kind];
    if (!tagKind) throw new Error(`Block tag kind "${spec.block.tag.kind}" is not one of the canvas kinds`);
    return `<div class="k-nd" data-node="${esc(id)}" data-shape="${esc(id)}" style="${style}">
      <div class="k-nd-tools">
        <span class="k-bpb sm min" title="Open in sidebar (Shift+Click)">${icon("panelStats", 16, 1.8)}</span>
        <span class="k-bpb sm min k-addtag"${refAttr("addtag")}><span class="k-hashg">#</span><span>Add tag</span></span>
        <span class="k-bpb sm min k-convert"${refAttr("convert")}>${icon("plus", 15, 2)}<span>${esc(spec.block.convert)}</span></span>
      </div>
      <div class="k-nd-t"><span${refAttr("blocktext")}>${esc(node.title)}</span><span class="k-b-tag"${refAttr("blocktag")}> <span class="k-tagpill" style="background:${tagKind.bg};color:${tagKind.fg};border-color:${tagKind.border}">${esc(spec.block.tag.text)}</span></span></div>
      ${sel}
    </div>`;
  }
  return `<div class="k-nd" data-node="${esc(id)}" data-shape="${esc(id)}" style="${style}"><div class="k-nd-t">${esc(node.title)}</div>${sel}</div>`;
};

// tldraw's own chrome around the canvas, as the extension shows it.
const chromeHtml = (zoom: string): string => `
  <div class="k-tl-ui">
    <div class="k-tl-menu">
      <span class="k-tlb">${icon("menu", 16)}</span>
      <span class="k-tl-page"><span>Page 1</span>${icon("caretDown", 14)}</span>
      <span class="k-tlb">${icon("undo", 15)}</span>
      <span class="k-tlb dim">${icon("redo", 15)}</span>
      <span class="k-tlb dim">${icon("trash", 15)}</span>
      <span class="k-tlb dim">${icon("copy", 15)}</span>
      <span class="k-tlb">${icon("dotsV", 15)}</span>
    </div>
    <div class="k-tl-zoom"${refAttr("zoomlabel")}>${esc(zoom)}</div>
    <div class="k-tl-bar"${refAttr("toolbar")}>
      <span class="k-tlt"><svg viewBox="0 0 48 48" width="19" height="19"><path fill-rule="evenodd" fill="currentColor" d="m29.24 45.2c-2.87 2.87-7.52 2.87-10.39 0l-15.57-15.57c-2.87-2.87-2.87-7.52 0-10.39l7.79-7.78c1.43-1.43 3.75-1.43 5.19 0 1.43 1.43 1.43 3.76 0 5.19l-2.6 2.59c-2.86 2.87-2.86 7.52 0 10.39l7.79 7.79c1.43 1.43 3.76 1.43 5.19 0 1.44-1.44 1.44-3.76 0-5.2l-2.6-2.59c-2.86-2.87-2.86-7.52 0-10.39 2.87-2.86 2.87-7.51 0-10.38l-2.59-2.59c-1.44-1.44-1.44-3.76 0-5.19 1.43-1.44 3.76-1.44 5.19 0l18.17 18.16c2.87 2.87 2.87 7.52 0 10.39zm7.79-23.37c-1.44-1.43-3.76-1.43-5.2 0-1.43 1.44-1.43 3.76 0 5.19 1.44 1.44 3.76 1.44 5.2 0 1.43-1.43 1.43-3.75 0-5.19z"/></svg></span>
      <span class="k-tlt on">${icon("pointer", 17)}</span>
      <span class="k-tlt">${icon("hand", 18, 1.7)}</span>
      <span class="k-tlt">${icon("pencil", 17, 1.8)}</span>
      <span class="k-tlt">${icon("eraser", 18, 1.7)}</span>
      <span class="k-tlt">${icon("arrowUpRight", 18, 1.8)}</span>
      <span class="k-tlt">${icon("textT", 18, 1.8)}</span>
      <span class="k-tlt">${icon("note", 18, 1.7)}</span>
      <span class="k-tlt">${icon("image", 18, 1.7)}</span>
      <span class="k-tlt">${icon("caretUp", 16, 2)}</span>
    </div>
    <div class="k-tl-dtoggle"${refAttr("dtoggle")}><span class="k-bpb min">${icon("addColumnLeft", 17, 1.8)}</span></div>
  </div>`;

export const canvasHtml = (spec: CanvasSpec): string => {
  const kinds: Record<string, NodeKind> = spec.kinds ?? DG_KINDS;
  const { x, y, w, h } = spec.box;
  const kindOf = (node: CanvasNode): NodeKind => {
    const kind = kinds[node.kind];
    if (!kind)
      throw new Error(`Node "${node.id}" has kind "${node.kind}"; known kinds: ${Object.keys(kinds).join(", ")}`);
    return kind;
  };
  return `${spec.title ? `<h1 class="k-rm-ptitle">${esc(spec.title)}</h1>` : ""}
    <div class="k-tl"${refAttr("tl")} style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
      <div class="k-cv"${refAttr("cv")}>
        ${spec.nodes.map((node) => cardHtml(node.id, node, kindOf(node), spec)).join("")}
        <svg class="k-ar-svg" width="1" height="1"></svg>
      </div>
      ${chromeHtml(spec.zoom ?? "100%")}
    </div>`;
};

// Build the canvas into `host` (a Roam main column or surface). Cards are
// measured and placed once fonts are in; film code that places cards itself
// does so in its own f.job(0, ...) after this call, then calls aimAll().
export const buildCanvas = (f: Film, host: HTMLElement, spec: CanvasSpec): Canvas => {
  const relations: Record<string, Relation> = spec.relations ?? DG_RELATIONS;
  const kinds: Record<string, NodeKind> = spec.kinds ?? DG_KINDS;
  host.insertAdjacentHTML("beforeend", canvasHtml(spec));
  const q = <T extends HTMLElement = HTMLElement>(ref: string): T => f.q<T>(`[data-ref="${ref}"]`, host);
  const tl = q("tl");
  const cv = q("cv");

  const cards: Record<string, Card> = {};
  for (const node of spec.nodes) {
    const el = f.q(`[data-shape="${node.id}"]`, cv);
    cards[node.id] = {
      id: node.id,
      node,
      kind: kinds[node.kind],
      el,
      sel: f.q(".k-sel", el),
      x: node.at?.x ?? 0,
      y: node.at?.y ?? 0,
      w: 0,
      h: 0,
    };
  }

  // One group per relation: a line, an open arrowhead and a label.
  const svg = f.q<SVGSVGElement>(".k-ar-svg", cv);
  const arrows: Record<string, ArrowShape> = {};
  for (const def of spec.arrows ?? []) {
    const rel = relations[def.relation];
    if (!rel)
      throw new Error(`Arrow "${def.id}" has relation "${def.relation}"; known: ${Object.keys(relations).join(", ")}`);
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("data-arrow", def.id);
    const line = document.createElementNS(SVG_NS, "path");
    line.setAttribute("class", "k-ar-line");
    line.setAttribute("stroke", rel.color);
    const head = document.createElementNS(SVG_NS, "path");
    head.setAttribute("class", "k-ar-head");
    head.setAttribute("stroke", rel.color);
    g.append(line, head);
    svg.append(g);
    const label = html(
      `<div class="k-ar-label" data-label="${esc(def.id)}" style="color:${rel.color}">${esc(rel.label)}</div>`,
    );
    cv.append(label);
    arrows[def.id] = { def, g, line, head, label };
  }

  const place = (card: Card): void => {
    card.el.style.left = `${card.x}px`;
    card.el.style.top = `${card.y}px`;
  };
  const aimAll = (): void => {
    for (const shape of Object.values(arrows)) {
      const from = cards[shape.def.from];
      const to = cards[shape.def.to];
      const path = arrowPath(from, to);
      shape.line.setAttribute("d", path.d);
      shape.head.setAttribute("d", path.head);
      shape.label.style.left = `${path.mid.x}px`;
      shape.label.style.top = `${path.mid.y}px`;
    }
  };
  // Measure once fonts are in, place the cards that have a position, aim the arrows.
  f.job(0, () => {
    for (const card of Object.values(cards)) {
      card.w = card.el.offsetWidth;
      card.h = card.el.offsetHeight;
    }
    for (const card of Object.values(cards)) if (card.node.at) place(card);
    aimAll();
  });

  const blockCard = spec.block ? Object.values(cards).find((c) => c.node.kind === "block") : undefined;
  return {
    tl,
    cv,
    cards,
    arrows,
    toolbar: q("toolbar"),
    zoomLabel: q("zoomlabel"),
    drawerToggle: q("dtoggle"),
    block:
      blockCard && spec.block
        ? { card: blockCard, addTag: q("addtag"), convert: q("convert"), text: q("blocktext"), tag: q("blocktag") }
        : null,
    place,
    aimAll,
  };
};

// ----------------------------------------------------------- context panel

// How the node card's context menu renders a page reference to a node: the
// whole title as a page link, with the type code inside it as a link too.
export const pageRef = (title: string): string => {
  const m = /^\[\[(\w+)\]\](.*)$/s.exec(title);
  const br = (s: string): string => `<span class="k-br">${s}</span>`;
  if (!m) return `<span class="k-pr">${br("[[")}<span class="k-lk">${esc(title)}</span>${br("]]")}</span>`;
  return `<span class="k-pr">${br("[[")}<span class="k-pr">${br("[[")}<span class="k-lk">${esc(m[1])}</span>${br("]]")}</span><span class="k-lk">${esc(m[2])}</span>${br("]]")}</span>`;
};

export type ContextRow = { id: string; title: string; on: boolean };
export type ContextGroup = { label: string; rows: ContextRow[] };

// Layout constants of the real panel, in canvas-container pixels.
const TAB_LIST = 30;
const TAB_GAP = 20;
const ROW = 32;
const GROUP_LABEL = 20;
const PAD = 12;
const LOADING = 44;
const STYLING = 138 + 8;

// The panel's height in each state: loading, listing relations, or on the Styling tab.
export const contextHeights = (
  groups: ContextGroup[],
): { list: number; loading: number; styling: number; listBody: number } => {
  const rowCount = groups.reduce((n, g) => n + g.rows.length, 0);
  const listBody = PAD + groups.length * GROUP_LABEL + rowCount * ROW + Math.max(0, groups.length - 1) * PAD + PAD;
  const head = 4 + TAB_LIST + TAB_GAP;
  return { listBody, loading: head + LOADING, list: head + listBody, styling: head + STYLING };
};

export type ContextRowHandle = {
  li: HTMLElement;
  btn: HTMLElement;
  plus: HTMLElement;
  minus: HTMLElement;
  spin: HTMLElement;
};

export type ContextPanel = {
  el: HTMLElement;
  tabContext: HTMLElement;
  tabStyling: HTMLElement;
  ctx: HTMLElement;
  loading: HTMLElement;
  list: HTMLElement;
  sty: HTMLElement;
  rows: Record<string, ContextRowHandle>;
  heights: { loading: number; list: number; styling: number };
};

const spinnerHtml = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><circle class="k-trk" cx="12" cy="12" r="8.5"/><circle class="k-arc" cx="12" cy="12" r="8.5" pathLength="100" stroke-dasharray="26 74"/></svg>`;

const stylingHtml = (): string => `
  <div class="k-sty">
    <div class="k-sty-sec"><div class="k-sty-slider"><i class="k-sty-trk"></i><i class="k-sty-fill"></i><i class="k-sty-thumb"></i></div></div>
    <div class="k-sty-sec k-sty-row"><span class="k-sty-b on">S</span><span class="k-sty-b">M</span><span class="k-sty-b">L</span><span class="k-sty-b">XL</span></div>
    <div class="k-sty-sec k-sty-row"><span class="k-sty-b f-draw">A</span><span class="k-sty-b f-sans on">A</span><span class="k-sty-b f-serif">A</span><span class="k-sty-b f-mono">A</span></div>
  </div>`;

// The panel's inner markup: a Context tab listing the node's relations with a
// plus or minus per row, and (with `styling`) a Styling tab.
export const contextPanelHtml = (spec: { groups: ContextGroup[]; styling: boolean }): string => {
  const h = contextHeights(spec.groups);
  const rowHtml = (r: ContextRow): string => `<li class="k-ctx-li" data-row="${esc(r.id)}">
      <span class="k-ctx-t" title="${esc(r.title)}">${pageRef(r.title)}</span>
      <span class="k-bpb sm min k-ctx-btn" title="${r.on ? "Remove node from canvas" : "Add node to canvas"}">
        <i class="k-ico plus"${r.on ? ' style="opacity:0"' : ""}>${icon("plus", 16, 1.9)}</i>
        <i class="k-ico minus"${r.on ? "" : ' style="opacity:0"'}>${icon("minus", 16, 1.9)}</i>
        <i class="k-ico spin">${spinnerHtml(16)}</i>
      </span>
    </li>`;
  const groups = spec.groups
    .map(
      (g) =>
        `<div class="k-ctx-g"><div class="k-ctx-gl">${esc(g.label)}</div><ul class="k-ctx-ul">${g.rows.map(rowHtml).join("")}</ul></div>`,
    )
    .join("");
  return `
    <div class="k-node-style">
      <div class="k-bp-tabs"><span class="k-bp-tab on" data-tab="context">Context</span><span class="k-bp-tab" data-tab="styling">Styling</span></div>
      <div class="k-bp-tabpanel">
        <div class="k-ctx">
          <div class="k-ctx-load">Loading relations...</div>
          <div class="k-ctx-list" style="height:${h.listBody}px">${groups}</div>
        </div>
        ${spec.styling ? stylingHtml() : ""}
      </div>
    </div>`;
};

// The node card menu, as CustomStylePanel renders it, placed in a canvas (`host` is
// Canvas.tl). Its height follows its content: tween `el` between `heights`.
export const buildContextPanel = (
  f: Film,
  host: HTMLElement,
  spec: { id: string; groups: ContextGroup[]; styling: boolean },
): ContextPanel => {
  const h = contextHeights(spec.groups);
  const el = document.createElement("div");
  el.className = "k-tlp";
  el.setAttribute("data-panel", spec.id);
  el.style.height = `${h.list}px`;
  el.innerHTML = contextPanelHtml(spec);
  host.append(el);
  const rows: Record<string, ContextRowHandle> = {};
  for (const li of el.querySelectorAll<HTMLElement>(".k-ctx-li")) {
    rows[li.getAttribute("data-row") ?? ""] = {
      li,
      btn: f.q(".k-ctx-btn", li),
      plus: f.q(".plus", li),
      minus: f.q(".minus", li),
      spin: f.q(".spin", li),
    };
  }
  return {
    el,
    tabContext: f.q("[data-tab=context]", el),
    tabStyling: f.q("[data-tab=styling]", el),
    ctx: f.q(".k-ctx", el),
    loading: f.q(".k-ctx-load", el),
    list: f.q(".k-ctx-list", el),
    sty: spec.styling ? f.q(".k-sty", el) : el,
    rows,
    heights: { loading: h.loading, list: h.list, styling: h.styling },
  };
};

// ------------------------------------------------------------------- drawer

export type DrawerEntry = { uid: string; title: string; count: number };

// The drawer's own grouping: one row per node, duplicates first, then alphabetical.
export const groupDrawerEntries = (shapes: Array<{ id: string; title: string }>): DrawerEntry[] => {
  const byUid = new Map<string, { title: string; count: number }>();
  for (const s of shapes) {
    const g = byUid.get(s.id);
    if (g) g.count += 1;
    else byUid.set(s.id, { title: s.title, count: 1 });
  }
  return [...byUid.entries()]
    .map(([uid, g]) => ({ uid, ...g }))
    .sort((a, b) => {
      if (a.count > 1 !== b.count > 1) return a.count > 1 ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
};

// The drawer's rule for which rows a query keeps: a case-insensitive substring.
export const drawerMatches = (title: string, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || title.toLowerCase().includes(q);
};

export type DrawerGroup = DrawerEntry & { row: HTMLElement };

export type Drawer = {
  el: HTMLElement;
  typed: HTMLElement;
  placeholder: HTMLElement;
  clear: HTMLElement;
  reset: HTMLElement;
  input: HTMLElement;
  list: HTMLElement;
  groups: DrawerGroup[];
  counts: { all: number; duplicates: number };
};

export const drawerCounts = (
  shapes: Array<{ id: string }>,
  entries: DrawerEntry[],
): { all: number; duplicates: number } => ({
  all: shapes.length,
  duplicates: entries.filter((e) => e.count > 1).reduce((n, e) => n + e.count, 0),
});

export const drawerHtml = (entries: DrawerEntry[], counts: { all: number; duplicates: number }): string => {
  const row = (e: DrawerEntry): string => {
    const dup = e.count > 1;
    return `<div class="k-dr-row" data-g="${esc(e.uid)}">
      <div class="k-dr-in">
        <div class="k-dr-l">
          <span class="k-bpb sm min">${icon(dup ? "caretRight" : "dot", 16, 1.9)}</span>
          <span class="k-dr-t">${esc(e.title)}</span>
          ${dup ? `<span class="k-bp-tag">${e.count}</span>` : ""}
        </div>
        ${dup ? "" : `<span class="k-bpb sm min">${icon("locate", 16, 1.8)}</span>`}
      </div>
    </div>`;
  };
  return `
    <div class="k-drw-head">
      <span class="k-bpb min">${icon("addColumnLeft", 17, 1.8)}</span>
      <h2>Canvas Drawer</h2>
      <span class="k-bpb sm min">${icon("x", 15, 2)}</span>
    </div>
    <div class="k-drw-body">
      <div class="k-bp-tabs"><span class="k-bp-tab on">All Nodes (${counts.all})</span><span class="k-bp-tab">Duplicates (${counts.duplicates})</span></div>
      <div class="k-bp-input"${refAttr("input")}>
        <span class="k-bp-lic">${icon("search", 16, 1.9)}</span>
        <span class="k-bp-val"><span class="k-typed"></span><span class="k-ph">Search nodes</span></span>
        <span class="k-bpb sm min k-clr">${icon("x", 14, 2.2)}</span>
      </div>
      <div class="k-drw-filter">
        <span class="k-bpb"><span>All</span>${icon("caretDown", 15, 2)}</span>
        <span class="k-bpb min k-reset">${icon("filterRemove", 17, 1.8)}</span>
      </div>
      <div class="k-drw-list">${entries.map(row).join("")}</div>
    </div>`;
};

// The canvas drawer: all nodes on the canvas, a search box, a filter, and a list
// where a node on the canvas twice carries a count. `shapes` are the cards on the
// canvas (a node on it twice appears twice).
export const buildDrawer = (f: Film, host: HTMLElement, shapes: Array<{ id: string; title: string }>): Drawer => {
  const entries = groupDrawerEntries(shapes);
  const counts = drawerCounts(shapes, entries);
  const el = document.createElement("div");
  el.className = "k-drw";
  el.innerHTML = drawerHtml(entries, counts);
  host.append(el);
  return {
    el,
    typed: f.q(".k-typed", el),
    placeholder: f.q(".k-ph", el),
    clear: f.q(".k-clr", el),
    reset: f.q(".k-reset", el),
    input: f.q("[data-ref=input]", el),
    list: f.q(".k-drw-list", el),
    groups: entries.map((e) => ({ ...e, row: f.q(`[data-g="${e.uid}"]`, el) })),
    counts,
  };
};
