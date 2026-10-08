import type { Film } from "../engine/runtime";
import { icon } from "./icons";
import { dialog, dialogTabs } from "./popups";
import { esc, inline, refAttr, styleAttr, type Place } from "./util";

// Discourse Graphs screens that live in a Roam page or over it: the context row
// under a title, the node settings dialog (with its Index tab) and Advanced Node
// Search. The canvas and its menus are in canvas.ts.

type Common = Place & { ref?: string; hidden?: boolean };

// The row under a page title that opens the page's discourse context.
export const dgContext = (o: { ref?: string; hidden?: boolean; label?: string; action?: string } = {}): string =>
  `<div class="k-dg-context"${refAttr(o.ref)}${o.hidden ? ' style="opacity:0"' : ""}>${icon("caretRight", 14, 2.6)}<span class="k-lbl">${esc(o.label ?? "Discourse Context")}</span><span class="k-pill">${esc(o.action ?? "Add relation")}</span></div>`;

// ------------------------------------------------------ node settings dialog

export type NodeSettingsSpec = Common & {
  title?: string;
  tabs?: string[];
  tab?: number;
  // The node types listed on the left, and which one is open.
  nodes: string[];
  node: string;
  subTabs?: string[];
  subTab?: number;
  // The line above the results, and the results of the node type's query (its index).
  heading: string;
  results: string[];
};

export const nodeSettingsDialog = (s: NodeSettingsSpec): string =>
  dialog({
    ...s,
    width: s.width ?? 590,
    height: s.height ?? 420,
    title: s.title ?? "Discourse Graph Settings",
    tabs: { labels: s.tabs ?? ["Home", "Nodes", "Relations", "Export"], on: s.tab ?? 1 },
    body: `<div class="k-ns-body">
      <div class="k-ns-list">${s.nodes
        .map((name) => `<div class="k-ns-item${name === s.node ? " on" : ""}">${esc(name)}</div>`)
        .join("")}</div>
      <div class="k-ns-main">
        ${dialogTabs(s.subTabs ?? ["General", "Attributes", "Specification", "Index"], s.subTab ?? 3, true)}
        <div class="k-ns-note">${inline(s.heading)}</div>
        ${s.results.map((title) => `<div class="k-ns-result">${inline(title)}</div>`).join("")}
      </div>
    </div>`,
  });

// ------------------------------------------------------ Advanced Node Search

// The type badge in front of a result, in the node type's colors.
export type SearchBadge = { text: string; bg: string; fg: string; border: string };

export type AdvancedSearchSpec = Common & {
  placeholder?: string;
  results: Array<{ badge: SearchBadge; title: string }>;
  // One preview per result you will switch to; the first is showing.
  previews: Array<{ meta: string; title: string; blocks: string[] }>;
  // Keyboard hints in the footer, left group; Escape closes on the right.
  hints?: Array<{ keys: string[]; label: string }>;
};

const keyHtml = (key: string): string =>
  key === "Enter"
    ? `<kbd>${icon("keyEnter", 12, 2)}</kbd>`
    : key === "Shift"
      ? `<kbd>${icon("keyShift", 12, 2)}</kbd>`
      : key === "Escape"
        ? `<kbd>${icon("keyEscape", 12, 2)}</kbd>`
        : `<kbd>${esc(key)}</kbd>`;

const hintHtml = (keys: string[], label: string): string =>
  `<span class="k-foot-h">${keys.map(keyHtml).join("")}${esc(label)}</span>`;

export const DEFAULT_SEARCH_HINTS = [
  { keys: ["Alt", "Enter"], label: "dock results" },
  { keys: ["Enter"], label: "open" },
  { keys: ["Shift", "Enter"], label: "sidebar" },
];

export const advancedSearch = (s: AdvancedSearchSpec): string =>
  `<div class="k-adv"${refAttr(s.ref)}${styleAttr({ width: 896, height: 592, ...s }, { hidden: s.hidden })}>
    <div class="k-adv-head">
      <div class="k-adv-field">${icon("search", 16, 1.9)}<span class="k-adv-q"><span class="k-typed"></span><span class="k-ph">${esc(s.placeholder ?? "Search discourse nodes...")}</span></span></div>
      <span class="k-bpb min gray">${icon("filter", 16, 1.8)}</span>
      <span class="k-bpb min gray">${icon("sort", 16, 1.8)}</span>
      <span class="k-bpb min">${icon("x", 16, 2)}</span>
    </div>
    <div class="k-adv-body">
      <div class="k-adv-spin"><svg viewBox="0 0 24 24" width="20" height="20"><circle class="k-trk" cx="12" cy="12" r="8.5"/><circle class="k-arc" cx="12" cy="12" r="8.5" pathLength="100" stroke-dasharray="26 74"/></svg></div>
      <div class="k-adv-split">
        <div class="k-adv-list">${s.results
          .map(
            (r, i) =>
              `<div class="k-adv-row${i === 0 ? " on" : ""}" data-r="${i}"><span class="k-adv-tag" style="background:${esc(r.badge.bg)};color:${esc(r.badge.fg)};border-color:${esc(r.badge.border)}">${esc(r.badge.text)}</span><span class="k-adv-rt">${inline(r.title)}</span></div>`,
          )
          .join("")}</div>
        <div class="k-adv-prev">${s.previews
          .map(
            (p, i) =>
              `<div class="k-adv-pv" data-p="${i}"><div class="k-adv-meta">${esc(p.meta)}</div><div class="k-adv-page"><div class="k-adv-pt">${inline(p.title)}</div>${p.blocks.map((b) => `<div class="k-adv-b"><i></i><span>${inline(b)}</span></div>`).join("")}</div></div>`,
          )
          .join("")}</div>
      </div>
    </div>
    <div class="k-adv-foot">
      <div class="k-foot-l">${(s.hints ?? DEFAULT_SEARCH_HINTS).map((h) => hintHtml(h.keys, h.label)).join("")}</div>
      ${hintHtml(["Escape"], "close")}
    </div>
  </div>`;

export type AdvancedSearchParts = {
  root: HTMLElement;
  typed: HTMLElement;
  placeholder: HTMLElement;
  spinner: HTMLElement;
  split: HTMLElement;
  list: HTMLElement;
  results: HTMLElement[];
  previews: HTMLElement[];
  foot: HTMLElement;
};

// The parts of an Advanced Node Search dialog already in the page, to animate:
// type into `typed`, fade the spinner, bring up `split` and its `results`, cross
// the `previews`.
export const advancedSearchParts = (f: Film, root: HTMLElement): AdvancedSearchParts => ({
  root,
  typed: f.q(".k-typed", root),
  placeholder: f.q(".k-ph", root),
  spinner: f.q(".k-adv-spin", root),
  split: f.q(".k-adv-split", root),
  list: f.q(".k-adv-list", root),
  results: f.qa(".k-adv-row", root),
  previews: f.qa(".k-adv-pv", root),
  foot: f.q(".k-adv-foot", root),
});
