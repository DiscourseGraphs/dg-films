// Product parts for episodes 2 to 4 of "One Question": the discourse context
// card under a node page's title, the Create relation and create-node dialogs,
// their toasts, candidate tags with their hover popover, the image tools, and a
// film tip chip. Pure markup, no timing, like ./parts.ts.
//
// Source: apps/roam/src at main 065cab5e (release 0.23.0); paths below are
// relative to it. The template-lab graph was read through the discourse-graph
// MCP (roam/css X8V4gy32s, config z10PcVCUx). Blueprint values are 3.50.4's
// (apps/roam/package.json pins it), but the built extension uses Roam's own
// Blueprint at runtime (scripts/compile.ts:96 maps @blueprintjs/core to
// window.Blueprint.Core), whose version the repo does not record. Tailwind
// classes come from Roam's global tailwind.min.css (Tailwind 2.1, no preflight;
// the extension builds none: tailwind.config.ts content is []). Sizes are CSS px
// of the product. Classes: cx- for product parts, oq- for the film overlay.
import { esc } from "../../../engine/runtime";
import { scrim } from "../../../kit";
import { KINDS, titleOf, type Kind } from "./data";

const refAttr = (ref?: string): string => (ref ? ` data-ref="${esc(ref)}"` : "");

// ------------------------------------------------------------ Blueprint icons

// @blueprintjs/icons 3.30.2 lib/esm/generated/iconSvgPaths.js. Icons under 20 px
// use the 16 px grid (icon.js render: pixelGridSize), the Callout's 20 px icon
// the 20 px grid.
const BP16 = {
  cross:
    "M9.41 8l3.29-3.29c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71L8 6.59l-3.29-3.3a1.003 1.003 0 00-1.42 1.42L6.59 8 3.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71L8 9.41l3.29 3.29c.18.19.43.3.71.3a1.003 1.003 0 00.71-1.71L9.41 8z",
  filter:
    "M13.99.99h-12a1.003 1.003 0 00-.71 1.71l4.71 4.71V14a1.003 1.003 0 001.71.71l2-2c.18-.18.29-.43.29-.71V7.41L14.7 2.7a1.003 1.003 0 00-.71-1.71z",
  refresh:
    "M14.99 6.99c-.55 0-1 .45-1 1 0 3.31-2.69 6-6 6-1.77 0-3.36-.78-4.46-2h1.46c.55 0 1-.45 1-1s-.45-1-1-1h-4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1s1-.45 1-1v-1.74a7.95 7.95 0 006 2.74c4.42 0 8-3.58 8-8 0-.55-.45-1-1-1zm0-7c-.55 0-1 .45-1 1v1.74a7.95 7.95 0 00-6-2.74c-4.42 0-8 3.58-8 8 0 .55.45 1 1 1s1-.45 1-1c0-3.31 2.69-6 6-6 1.77 0 3.36.78 4.46 2h-1.46c-.55 0-1 .45-1 1s.45 1 1 1h4c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1z",
  more: "M2 6.03a2 2 0 100 4 2 2 0 100-4zM14 6.03a2 2 0 100 4 2 2 0 100-4zM8 6.03a2 2 0 100 4 2 2 0 100-4z",
  delete:
    "M11.99 4.99a1.003 1.003 0 00-1.71-.71l-2.29 2.3L5.7 4.29a.965.965 0 00-.71-.3 1.003 1.003 0 00-.71 1.71l2.29 2.29-2.29 2.29A1.003 1.003 0 005.7 11.7l2.29-2.29 2.29 2.29a1.003 1.003 0 001.42-1.42L9.41 7.99 11.7 5.7c.18-.18.29-.43.29-.71zm-4-5c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.68 6-6 6z",
  caretRight: "M11 8c0-.15-.07-.28-.17-.37l-4-3.5A.495.495 0 006 4.5v7a.495.495 0 00.83.37l4-3.5c.1-.09.17-.22.17-.37z",
  chevronLeft:
    "M7.41 8l3.29-3.29c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71l-4 4C5.11 7.47 5 7.72 5 8c0 .28.11.53.29.71l4 4a1.003 1.003 0 001.42-1.42L7.41 8z",
  chevronRight:
    "M10.71 7.29l-4-4a1.003 1.003 0 00-1.42 1.42L8.59 8 5.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71l4-4c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71z",
  doubleChevronLeft:
    "M4.41 8L7.7 4.71c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71l-4 4C2.11 7.47 2 7.72 2 8c0 .28.11.53.29.71l4 4a1.003 1.003 0 001.42-1.42L4.41 8zm5 0l3.29-3.29c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71l-4 4C7.11 7.47 7 7.72 7 8c0 .28.11.53.29.71l4 4a1.003 1.003 0 001.42-1.42L9.41 8z",
  doubleChevronRight:
    "M9 8c0-.28-.11-.53-.29-.71l-4-4a1.003 1.003 0 00-1.42 1.42L6.59 8 3.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71l4-4C8.89 8.53 9 8.28 9 8zm4.71-.71l-4-4a1.003 1.003 0 00-1.42 1.42L11.59 8 8.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71l4-4c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71z",
  doubleCaretVertical:
    "M5 7h6a1.003 1.003 0 00.71-1.71l-3-3C8.53 2.11 8.28 2 8 2s-.53.11-.71.29l-3 3A1.003 1.003 0 005 7zm6 2H5a1.003 1.003 0 00-.71 1.71l3 3c.18.18.43.29.71.29s.53-.11.71-.29l3-3A1.003 1.003 0 0011 9z",
  label:
    "M11 2H1c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V7l-5-5zm3 10H2V4h8v2H3v1h7v1h4v4zm-3-5V4l3 3h-3zm-8 3h10V9H3v1z",
  edit: "M3.25 10.26l2.47 2.47 6.69-6.69-2.46-2.48-6.7 6.7zM.99 14.99l3.86-1.39-2.46-2.44-1.4 3.83zm12.25-14c-.48 0-.92.2-1.24.51l-1.44 1.44 2.47 2.47 1.44-1.44c.32-.32.51-.75.51-1.24.01-.95-.77-1.74-1.74-1.74z",
} as const;
type Bp16 = keyof typeof BP16;
const PLUS_20 =
  "M16 9h-5V4c0-.55-.45-1-1-1s-1 .45-1 1v5H4c-.55 0-1 .45-1 1s.45 1 1 1h5v5c0 .55.45 1 1 1s1-.45 1-1v-5h5c.55 0 1-.45 1-1s-.45-1-1-1z";

// Blueprint's Icon: a span holding a block svg filled with currentColor
// (icon.js render; blueprint.css .bp3-icon, .bp3-icon > svg).
const bpIcon = (name: Bp16, size = 16, color?: string): string =>
  `<span class="cx-ic"${color ? ` style="color:${color}"` : ""}><svg width="${size}" height="${size}" viewBox="0 0 16 16"><path fill-rule="evenodd" d="${BP16[name]}"/></svg></span>`;

// ------------------------------------------------------------ Blueprint button

type ButtonSpec = {
  text?: string;
  icon?: Bp16;
  rightIcon?: Bp16;
  minimal?: boolean;
  outlined?: boolean;
  small?: boolean;
  fill?: boolean;
  primary?: boolean;
  disabled?: boolean;
  // Under the pointer: Blueprint's :hover background.
  hot?: boolean;
  cls?: string;
  ref?: string;
  title?: string;
};

// Blueprint's Button (AbstractButton.renderChildren): left icon, the text in
// .bp3-button-text, right icon. A span, so no browser button styles leak in.
const bpButton = (b: ButtonSpec): string => {
  const cls = [
    "cx-btn",
    b.minimal && "min",
    b.outlined && "outl",
    b.small && "sm",
    b.fill && "fill",
    b.primary && "primary",
    b.disabled && "off",
    b.hot && "hot",
    !b.text && "only",
    b.cls,
  ]
    .filter(Boolean)
    .join(" ");
  const kids =
    (b.icon ? bpIcon(b.icon) : "") +
    (b.text ? `<span class="cx-btn-t">${esc(b.text)}</span>` : "") +
    (b.rightIcon ? bpIcon(b.rightIcon) : "");
  return `<span class="${cls}"${refAttr(b.ref)}${b.title ? ` title="${esc(b.title)}"` : ""}>${kids}</span>`;
};

// ------------------------------------------------------------ titles

// A node's page title as stored, in the template-lab formats (get_discourse_node_types):
// `[[EVD]] - {content} - {Source}`, `[[CLM]] - {content}`; Source and Experiment
// pages are `@{content}`, and their `content` here is the whole `@...` title.
export type NodeSpec = { kind: Kind; content: string; source?: string };
export const pageTitleOf = (n: NodeSpec): string => (n.kind === "SRC" || n.kind === "EXP" ? n.content : titleOf(n));

// ------------------------------------------------------------ discourse context card

// How a results-table cell reads in template-lab. The cell is an
// `a.rm-page-ref[data-link-title=<title>]` holding the raw title as plain text in
// spans (results-view/ResultsTable.tsx:342-379, cell() 258-268), so brackets show;
// it is not a rendered page ref and `nodeLink` (./parts.ts) does not apply.
// The text is toCellValue's: extractTag leaves `[[X]] - … - [[@s]]` whole, and a
// page title is cut to its last `/` segment under Roam's default namespace option
// "full" (utils/toCellValue.ts:46-65), so a title holding `@type/name` shows only
// what follows the last slash. roam/css (X8V4gy32s) then adds the type's icon to
// any element with a matching data-link-title (`[data-link-title^="[[EVD]] "]:before`;
// HYP's rule is span-only, so a HYP cell gets no icon) and colors the cell's spans
// through its "Query Builder Table" rules (`td[data-cell-content^="[[EVD]] - "] > a > span`).
// Source, Caveat and Request have no such rules and keep the link color.
const TABLE_ICON: Partial<Record<Kind, string>> = {
  QUE: "🔎 ",
  CLM: "🌲 ",
  EVD: "🌱 ",
  RES: "🧱 ",
  ISS: "🎙 ",
  EXP: "🧩EXP - ",
};
const TABLE_COLORED: Kind[] = ["QUE", "CLM", "EVD", "RES", "HYP", "ISS", "EXP"];

const cellText = (title: string): string => title.split("/").slice(-1)[0];

// One results row: the cell link, and the delete button that stored relations add
// to the last column (ResultsTable.tsx:385-397). It is hidden until the row is
// hovered (DiscourseContext.tsx:181-190) but, floated right, it still takes room,
// so a one-line row is 30 + 2 x 8 px tall.
const contextRow = (n: NodeSpec, o: { ref?: string; hot?: boolean; stored: boolean }): string => {
  const title = pageTitleOf(n);
  const color = TABLE_COLORED.includes(n.kind) ? ` style="--k:${KINDS[n.kind].color}"` : "";
  const icon = TABLE_ICON[n.kind];
  const ic = icon ? `<span class="cx-a-ic"${n.kind === "EXP" ? ` style="color:${KINDS.EXP.color}"` : ""}>${esc(icon)}</span>` : "";
  const del = o.stored ? bpButton({ icon: "delete", minimal: true, cls: "cx-del", title: "Delete relation" }) : "";
  return `<tr${refAttr(o.ref)}${o.hot ? ' class="hot"' : ""}><td class="cx-cell"><a class="cx-a"${color}>${ic}<span class="cx-a-t">${esc(cellText(title))}</span></a>${del}</td></tr>`;
};

export type ContextTab = { label: string; rows: NodeSpec[] };

export type ContextCardSpec = {
  ref?: string;
  // Tabs in the code's order: the relation order of the graph's grammar, forward
  // and complement per relation (utils/getDiscourseContextResults.ts:219-234).
  // Labels are the relation's label or complement, e.g. "Supported By". An empty
  // list draws the empty state.
  tabs: ContextTab[];
  active?: number;
  // Stored relations on (the series' world): "Add relation" and the row delete
  // buttons render. Off, as in a fresh template-lab copy, neither does
  // (CreateRelationDialog.tsx:395, ResultsTable.tsx:385).
  storedRelations?: boolean;
  // A row under the pointer (index in the active tab): Blueprint's interactive
  // row tint and its delete button.
  hoverRow?: number;
  // "Add relation" under the pointer.
  addHot?: boolean;
};

// The card that opens under a node page's title when its discourse context button
// is clicked: DiscourseContextOverlay.tsx:289-329 (Collapse, Card "my-3") holding
// ContextContent (components/DiscourseContext.tsx:179-259). Vertical Tabs titled
// "(n) Label" (206); Blueprint renders non-Tab children inside the tab list
// (core tabs.js render: renderTabTitle returns them as they are), so the
// controls (224-238: Switch "Group By Target", off by default (175), and a fill
// outlined "Add relation") sit at the bottom of the tab column (`mt-auto`, and the
// list is stretched by the inline style at 192-194). The active panel is a
// ResultsView (results-view/ResultsView.tsx:464-1517) in `simplified` mode with
// default settings, parsed from the node page itself (utils/parseResultSettings.ts:
// showInterface true, table layout, page size 10): the refresh and "more" buttons
// top right, a table whose header holds only the column's filter button (the
// label is hidden when simplified, ResultsTable.tsx:114-133, and styles.css:71-78
// shrinks it to 12 px), the rows, and the "Showing n of m results" footer with the
// pager. Fills its parent's width, like the card in the title additions column
// (utils/handleTitleAdditions.ts:27-37).
export const contextCard = (c: ContextCardSpec): string => {
  const ref = c.ref ?? "ctx";
  const stored = c.storedRelations ?? true;
  const addButton = (fill: boolean): string =>
    stored
      ? bpButton({ text: "Add relation", minimal: true, outlined: true, fill, hot: c.addHot, cls: "m-0", ref: `${ref}-add` })
      : "";
  if (!c.tabs.length) {
    // DiscourseContext.tsx:254-258: the text shows once TentativeRelationInstances
    // reports 0 (it renders nothing without tentative rows, TentativeRelationInstances.tsx:164).
    return `<div class="cx-bp cx-card"${refAttr(ref)}><div class="cx-empty"><span>No discourse relations found.</span>${addButton(false)}</div></div>`;
  }
  const active = c.active ?? 0;
  const tabs = c.tabs
    .map(
      (t, i) =>
        `<div class="cx-tab${i === active ? " on" : ""}"${refAttr(`${ref}-tab-${i}`)}>(${t.rows.length}) ${esc(t.label)}</div>`,
    )
    .join("");
  const controls = `<div class="cx-controls"><label class="cx-switch"${refAttr(`${ref}-switch`)}><span class="cx-switch-ind"></span>Group By Target</label>${addButton(true)}</div>`;
  const rows = c.tabs[active].rows;
  const body = rows.map((n, i) => contextRow(n, { ref: `${ref}-row-${i}`, hot: c.hoverRow === i, stored })).join("");
  const filter = `<span class="cx-btn min sm only cx-filter">${bpIcon("filter", 16, "#5c7080")}</span>`;
  // ResultsView.tsx:589-594 (refresh, wrapped in a Tooltip) and 595-614 ("more").
  const icons = `<div class="cx-rv-icons">${bpButton({ icon: "refresh", minimal: true })}${bpButton({ icon: "more", minimal: true })}</div>`;
  // ResultsView.tsx:1434-1510; every pager button is disabled on a single page.
  const pager = ["doubleChevronLeft", "chevronLeft"]
    .map((i) => bpButton({ icon: i as Bp16, minimal: true, small: true, disabled: true }))
    .concat(`<span class="cx-page">1</span>`)
    .concat(
      ["chevronRight", "doubleChevronRight"].map((i) =>
        bpButton({ icon: i as Bp16, minimal: true, small: true, disabled: true }),
      ),
    )
    .join("");
  const meta = `<div class="cx-meta"><div class="cx-meta-in"><span><i class="cx-meta-i">${bpButton({ icon: "caretRight", minimal: true, small: true, cls: "cx-caret16" })}Showing ${rows.length} of ${rows.length} results</i></span><span class="cx-pager">${pager}</span></div></div>`;
  const table = `<table class="cx-table"><thead><tr><td class="cx-hcell"><div class="cx-hflex">${filter}</div></td></tr></thead><tbody>${body}</tbody></table>`;
  const panel = `<div class="cx-panel"${refAttr(`${ref}-panel`)}><div class="cx-rv"><div class="cx-rv-in">${icons}${table}${meta}</div></div></div>`;
  return `<div class="cx-bp cx-card"${refAttr(ref)}><div class="cx-tabs"><div class="cx-tablist">${tabs}${controls}</div>${panel}</div></div>`;
};

// ------------------------------------------------------------ template-lab relations

// Template-lab's node type ids (get_discourse_node_types).
const TYPE_ID: Record<Kind, string> = {
  EXP: "sbQCl3p2S",
  EVD: "-YVlXUsDF",
  CVT: "Rl035XYeH",
  RES: "nCZJL7eK5",
  QUE: "WwAi4HfE0",
  REQ: "UhOyj7EXj",
  ISS: "fkc79sI3y",
  SRC: "ytOmQQ4RC",
  HYP: "KjGdEVccK",
  CLM: "eXm8WyS02",
};

// Template-lab's relations in the order of the config page's grammar/relations
// blocks (roam/js/discourse-graph, z10PcVCUx), which getDiscourseRelations reads
// in block order on the default settings path ("Use new settings store" defaults
// to false, components/settings/utils/zodSchema.ts:162; utils/getDiscourseRelations.ts:48-76).
// Three rows with blank labels (after the 14th) have no source or destination and
// never match a node type, so they are left out. [id, label, source, destination, complement].
const TL_RELATIONS: Array<[string, string, Kind, Kind, string]> = [
  ["_cXGCS8Ws", "Informs", "EVD", "QUE", "Informed By"],
  ["2CcUT958c", "Supports", "RES", "HYP", "Supported By"],
  ["HoZktk5F4", "Opposes", "RES", "HYP", "Opposed By"],
  ["oGPApzwQ6", "Addresses", "CLM", "QUE", "AddressedBy"],
  ["FtfCWo3Yq", "Contains", "SRC", "CLM", "ContainedBy"],
  ["o6EDDuUf3", "Contains", "SRC", "EVD", "ContainedBy"],
  ["8APajeaCM", "Produces", "SRC", "RES", "ProducedBy"],
  ["vXKprRGK-", "Motivates", "HYP", "REQ", "MotivatedBy"],
  ["nxisoPHXO", "Motivates", "HYP", "EXP", "MotivatedBy"],
  ["Dy9aA9Qif", "Produces", "EXP", "RES", "ProducedBy"],
  ["UZWHGLe0u", "Supports", "EVD", "CLM", "Supported By"],
  ["PkaUYVdfc", "Opposes", "EVD", "CLM", "Opposed By"],
  ["ih1VUQcGp", "Addresses", "HYP", "QUE", "AddressedBy"],
  ["SYr68JM9F", "Produces", "EXP", "RES", "ProducedBy"],
  ["bwwgZctTh", "motivates", "HYP", "ISS", "is motivated by"],
  ["y1UJHtmJx", "motivates", "HYP", "REQ", "is motivated by"],
  ["XAdjcW5Xu", "Supports", "RES", "HYP", "Supported By"],
  ["_bD5ftiqB", "Opposes", "RES", "HYP", "Opposed By"],
  ["3ulTKfbEN", "Addresses", "HYP", "QUE", "AddressedBy"],
];
// Keeps the table honest about the ids it names.
if (TL_RELATIONS.some(([, , s, d]) => !TYPE_ID[s] || !TYPE_ID[d])) throw new Error("TL_RELATIONS names an unknown type");

// The relation picker's items when the dialog opens from a page of this kind:
// prepareRelData (CreateRelationDialog.tsx:290-328) lists relations whose source
// is the kind (forward, by label), then those whose destination is (by complement),
// and the dialog keys them by that word, first occurrence first (52-62). The
// first item is the picker's default (63). From Evidence: Informs, Supports,
// Opposes, ContainedBy. From Claim: Addresses, ContainedBy, Supported By, Opposed By.
export const relationLabels = (kind: Kind): string[] => {
  const words = [
    ...TL_RELATIONS.filter(([, , source]) => source === kind).map(([, label]) => label),
    ...TL_RELATIONS.filter(([, , , destination]) => destination === kind).map(([, , , , complement]) => complement),
  ];
  return [...new Set(words)];
};

// ------------------------------------------------------------ dialogs

// The backdrop behind both dialogs: Blueprint's, rgba(16, 22, 26, 0.7) (blueprint.css
// .bp3-overlay-backdrop), which is the kit's heavy scrim. Template-lab's roam/css asks
// for rgba(0,0,0,.65) with `.bp3-dialog.roamjs-canvas-dialog .bp3-overlay-backdrop`,
// but Blueprint renders the backdrop beside the dialog's container, never inside the
// dialog (core overlay.js render, dialog.js render), so that rule matches nothing.
export const dialogBackdrop = (ref?: string, hidden?: boolean): string => scrim({ ref, heavy: true, hidden });

// Both dialogs are `roamjs-canvas-dialog`s, so template-lab's roam/css "Dialog Prompt"
// block restyles them (X8V4gy32s): 750 px wide, 1px #d6d7db border, 0.5rem radius,
// no padding, white (a later rule with the same selector replaces its transparent
// background with #fff); body padding 2.75rem on white; footer padding
// .85rem 2.75rem on rgb(249,250,251) with a #eee top border; and the footer's
// `button:first-of-type` painted #85adff with #fafafa text and margin-left 12px. Its
// outline-color (#528bff) draws nothing: only the SmartBlocks prompt rule sets an
// outline style. Neither dialog has a title, so no header (dialog.js maybeRenderHeader).
// The wrapper is Blueprint's dialog container, which centers the dialog in the
// window (blueprint.css .bp3-dialog-container); scenes animate the dialog itself.
const dialogShell = (ref: string, body: string, footer: string, wrapperRef?: string): string =>
  `<div class="cx-dlgwrap"${refAttr(wrapperRef)}><div class="cx-bp cx-dlg"${refAttr(ref)}>${body}<div class="cx-dlg-foot"><div class="cx-dlg-actions">${footer}</div></div></div></div>`;

// A text field: Blueprint's input (or textarea) look, the typed text and a
// placeholder that kit typeInto() hides at the first key (`<ref>-q`, `<ref>-ph`),
// and a caret for f.type's `caret` option (`<ref>-caret`).
const field = (ref: string, o: { text: string; placeholder: string; focus?: boolean; area?: boolean }): string =>
  `<span class="cx-input${o.area ? " area" : ""}${o.focus ? " focus" : ""}"${refAttr(ref)}><span class="cx-typed"${refAttr(`${ref}-q`)}>${esc(o.text)}</span><i class="cx-caret${o.focus ? " on" : ""}"${refAttr(`${ref}-caret`)}></i><span class="cx-ph"${refAttr(`${ref}-ph`)}${o.text ? ' style="opacity:0"' : ""}>${esc(o.placeholder)}</span></span>`;

// A Blueprint Menu in a minimal popover, as Select and AutocompleteInput show it
// below their target (BOTTOM_LEFT, no arrow, no margin: blueprint.css
// .bp3-popover.bp3-minimal). The active item is filled #137cbd with white text:
// MenuItem adds bp3-intent-primary to an active item without an intent
// (core menuItem.js render; blueprint.css .bp3-menu-item.bp3-intent-primary.bp3-active).
const menuPopover = (
  ref: string,
  items: string[],
  o: { active?: number; hover?: number; cls?: string; open: boolean; multiline?: boolean },
): string =>
  `<div class="cx-menupop${o.cls ? ` ${o.cls}` : ""}"${refAttr(ref)}${o.open ? "" : ' style="opacity:0"'}><ul class="cx-menu">${items
    .map(
      (t, i) =>
        `<li><div class="cx-mi${i === o.active ? " on" : ""}${i === o.hover ? " hot" : ""}"${refAttr(`${ref}-${i}`)}><div class="cx-mi-t${o.multiline ? "" : " ell"}">${esc(t)}</div></div></li>`,
    )
    .join("")}</ul></div>`;

export type RelationDialogSpec = {
  ref?: string;
  // The page the dialog opened from; its raw title is the dialog's first line.
  from: NodeSpec;
  // The picker's label (default: the first label for `from.kind`).
  relation?: string;
  // The picker's menu: open, its highlighted item (default the current label, as
  // Select starts on the active item), and an item under the pointer.
  pickerOpen?: boolean;
  pickerActive?: string;
  pickerHover?: string;
  // The search field: typed text (empty shows "Search for a page..."), focus.
  query?: string;
  focus?: boolean;
  // The option list under the field: raw page titles, the first active.
  options?: string[];
  optionsOpen?: boolean;
  // A valid existing target is chosen: Create is enabled. Built disabled otherwise;
  // a scene that enables it later toggles `off` on `<ref>-create`.
  canCreate?: boolean;
};

// The Create relation dialog (components/CreateRelationDialog.tsx:234-287): a primary
// Callout titled "Create relation" with a plus icon, which the `invert-icon` class
// draws light on a #106ba3 square (styles/styles.css:144-148); the source page's raw
// title as plain text; the relation picker, roamjs-components MenuItemSelect: a
// default Blueprint button with the label and a double-caret-vertical icon
// (MenuItemSelect.js), in a Label whose popover wrapper sits 5 px down
// (blueprint.css label.bp3-label .bp3-popover-wrapper); the AutocompleteInput
// "Search for a page..." (roamjs-components AutocompleteInput.js: a Blueprint
// InputGroup, a minimal BOTTOM_LEFT popover of multiline MenuItems in a
// `max-h-64 overflow-auto max-w-md` Menu, the first item active); then Cancel
// (minimal) and Create (primary, disabled while no target uid, 280). Typing
// selects the first matching option at once (autoSelectFirstOption), so Create
// enables while the list is still open. Refs: `<ref>` (the dialog), `<ref>-wrap`,
// `<ref>-picker`, `<ref>-pickmenu` (items `<ref>-pickmenu-<i>`), `<ref>-search`
// (with -q, -ph, -caret), `<ref>-options` (items `<ref>-options-<i>`),
// `<ref>-cancel`, `<ref>-create`.
export const createRelationDialog = (d: RelationDialogSpec): string => {
  const ref = d.ref ?? "reldlg";
  const labels = relationLabels(d.from.kind);
  const relation = d.relation ?? labels[0];
  const active = labels.indexOf(d.pickerActive ?? relation);
  const callout = `<div class="cx-callout"><span class="cx-ic"><svg width="20" height="20" viewBox="0 0 20 20"><path fill-rule="evenodd" d="${PLUS_20}"/></svg></span><h4>Create relation</h4></div>`;
  const picker = `<div><label class="cx-label"><span class="cx-lblpop"><span class="cx-anchor">${bpButton({ text: relation, rightIcon: "doubleCaretVertical", ref: `${ref}-picker` })}${menuPopover(`${ref}-pickmenu`, labels, { active, hover: d.pickerHover ? labels.indexOf(d.pickerHover) : undefined, open: !!d.pickerOpen, cls: "cx-selectpop" })}</span></span></label></div>`;
  const search = `<div class="cx-ac"><span class="cx-anchor block">${field(`${ref}-search`, { text: d.query ?? "", placeholder: "Search for a page...", focus: d.focus })}${menuPopover(`${ref}-options`, d.options ?? [], { active: 0, open: !!d.optionsOpen, cls: "cx-acpop", multiline: true })}</span></div>`;
  const body = `<div class="cx-dlg-body">${callout}<div class="cx-col"><div class="cx-srctitle">${esc(pageTitleOf(d.from))}</div>${picker}${search}</div></div>`;
  const footer =
    bpButton({ text: "Cancel", minimal: true, cls: "tl1st", ref: `${ref}-cancel` }) +
    bpButton({ text: "Create", primary: true, disabled: !d.canCreate, ref: `${ref}-create` });
  return dialogShell(ref, body, footer, `${ref}-wrap`);
};

// The format field the create-node dialog adds for a type whose format names
// another node type (utils/formatUtils.ts:109-139): EVD and RES end in {Source}.
const REFERENCED: Partial<Record<Kind, string>> = { EVD: "Source", RES: "Source" };

export type NodeDialogSpec = {
  ref?: string;
  kind: Kind;
  // The Content field: the tagged block's text without the tag (renderNodeTagPopup.tsx:40-47).
  // Empty shows "Enter a <type> ..." (ModifyNodeDialog.tsx:550-556).
  content: string;
  // The referenced node (for EVD and RES, the Source): the page found from the
  // block's page or a parent block's reference (renderNodeTagPopup.tsx:49-85),
  // filled in and locked. Empty draws the unlocked field with its placeholder.
  referenced?: string;
  // Content has focus (FuzzySelectInput autoFocus while it is not locked; default true).
  focus?: boolean;
};

// The create-node dialog that "Create <Type>" opens (components/ModifyNodeDialog.tsx:526-637,
// mode "create"): Content (FuzzySelectInput.tsx:204-266, a growing Blueprint TextArea at
// its default two rows of the dialog body's 18 px line), Node Type (MenuItemSelect, the
// type's name), and, when the format names one, the referenced node's field
// (596-609), locked as FuzzySelectInput.tsx:184-201 draws it: a `rounded border
// border-gray-300 bg-gray-100 px-3 py-2` box with the title and a small minimal cross.
// The footer puts Confirm (primary) before Cancel in the DOM and reverses the row
// (612-634), so Confirm is the `button:first-of-type` template-lab paints #85adff,
// over Blueprint primary's gradient and inset border. Refs: `<ref>`, `<ref>-wrap`,
// `<ref>-content` (with -q, -ph, -caret), `<ref>-type`, `<ref>-referenced`,
// `<ref>-confirm`, `<ref>-cancel`.
export const nodeDialog = (d: NodeDialogSpec): string => {
  const ref = d.ref ?? "nodedlg";
  const k = KINDS[d.kind];
  const refName = REFERENCED[d.kind];
  const content = `<label class="cx-label">Content<span class="cx-lblpop"><span class="cx-taline">${field(`${ref}-content`, { text: d.content, placeholder: `Enter a ${k.name.toLowerCase()} ...`, focus: d.focus ?? true, area: true })}</span></span></label>`;
  const type = `<div class="cx-flexrow"><label class="cx-label">Node Type<span class="cx-lblpop"><span class="cx-anchor">${bpButton({ text: k.name, rightIcon: "doubleCaretVertical", ref: `${ref}-type` })}</span></span></label></div>`;
  let referenced = "";
  if (refName) {
    referenced = d.referenced
      ? `<label class="cx-label">${esc(refName)}<div class="cx-locked"><div class="cx-locked-in cx-twborder"${refAttr(`${ref}-referenced`)}><span class="cx-locked-t">${esc(d.referenced)}</span>${bpButton({ icon: "cross", minimal: true, small: true, cls: "flex-shrink-0" })}</div></div></label>`
      : `<label class="cx-label">${esc(refName)}<span class="cx-lblpop"><span class="cx-taline">${field(`${ref}-referenced`, { text: "", placeholder: "Select a referenced node", area: true })}</span></span></label>`;
  }
  const body = `<div class="cx-dlg-body cx-col">${content}${type}${referenced}</div>`;
  const footer =
    bpButton({ text: "Confirm", primary: true, cls: "tl1st", ref: `${ref}-confirm` }) +
    bpButton({ text: "Cancel", ref: `${ref}-cancel` }) +
    `<span class="cx-grow"></span>`;
  return dialogShell(ref, body, footer.replace('class="cx-dlg-actions"', ""), `${ref}-wrap`).replace(
    'class="cx-dlg-actions"',
    'class="cx-dlg-actions rev"',
  );
};

// ------------------------------------------------------------ toasts

// A Blueprint toast in the toaster roamjs-components creates at the top of the
// window (roamjs-components Toast.js: Toaster.create({ position: "top" })): the
// container centers its toasts and each sits 20 px down (blueprint.css
// .bp3-toast-container, .bp3-toast). No icon was passed, so none renders; the close
// button is a cross (core toast.js render). Success is #0f9960 with white text, and
// links and the button go white at 70% (.bp3-toast[class*="bp3-intent-"] a, .bp3-button).
// Blueprint brings a toast in from translateY(-40px) over 300 ms.
const bpToast = (ref: string, message: string): string =>
  `<div class="cx-bp cx-toaster"><div class="cx-toast success"${refAttr(ref)}><span class="cx-toast-msg">${message}</span><span class="cx-toast-btns">${bpButton({ icon: "cross", minimal: true })}</span></div></div>`;

// "Created relation", intent success, 10 s (CreateRelationDialog.tsx:184-189).
export const createdRelationToast = (ref = "reltoast"): string => bpToast(ref, "<span>Created relation</span>");

// "Created node [[<title>]]", intent success, 10 s (ModifyNodeDialog.tsx:446-477): the
// link text is the new title in double brackets. Its `text-blue-500 font-medium`
// loses the color to Blueprint's toast link rule (0,2,1 against 0,1,0), so it reads
// white at 70%, weight 500. `title` is the raw page title (pageTitleOf).
export const createdNodeToast = (title: string, ref = "nodetoast"): string =>
  bpToast(ref, `<span>Created node <a class="cx-toast-a">${esc(`[[${title}]]`)}</a></span>`);

// ------------------------------------------------------------ candidate tags

// The pill a candidate tag becomes: the extension sets these inline styles on the
// tag span (utils/initializeObserversAndListeners.ts:182-203 with
// utils/getDiscourseNodeColors.ts:65-79), and inline styles beat every property of
// template-lab's roam/css pill rules. The three colors are getPleasingColors
// (packages/utils/src/getPleasingColors.ts) of the type's canvas color, computed
// with the repo's own function; `dot` records that input so a change to
// data.ts KINDS fails here instead of drawing stale colors.
const TAG_COLORS: Partial<Record<Kind, { dot: string; bg: string; text: string; border: string }>> = {
  EVD: { dot: "#fb1313", bg: "#fbd0d0", text: "#9c0202", border: "#fc3636" },
  CLM: { dot: "#48df34", bg: "#d9f6d5", text: "#15540d", border: "#48df34" },
  RES: { dot: "#d10000", bg: "#fccfcf", text: "#9e0000", border: "#ff3838" },
  HYP: { dot: "#00eb1b", bg: "#cffcd4", text: "#003807", border: "#05ff22" },
  ISS: { dot: "#2b00ff", bg: "#d7cffc", text: "#1a009e", border: "#5938ff" },
  QUE: { dot: "#e9cd16", bg: "#f8f3d3", text: "#463e07", border: "#ebd024" },
  CVT: { dot: "#9d78d9", bg: "#e3d9f2", text: "#45237b", border: "#8f64d3" },
};

const tagColors = (kind: Kind): { bg: string; text: string; border: string } => {
  const c = TAG_COLORS[kind];
  if (!c || !KINDS[kind].tag) throw new Error(`${kind} has no candidate tag in template-lab`);
  if (c.dot.toLowerCase() !== KINDS[kind].dot.toLowerCase())
    throw new Error(`${kind}: data.ts dot ${KINDS[kind].dot} no longer matches the pill colors' input ${c.dot}`);
  return c;
};

// The hover popover above a candidate tag (utils/renderNodeTagPopup.tsx:103-136): a
// Blueprint popover (not minimal; arrow disabled) whose content is an outlined
// minimal button "Create <Type>" (110). No padding: the box is the button.
export const createNodePopover = (kind: Kind, ref?: string): string =>
  `<span class="cx-bp cx-pop"${refAttr(ref)}><span class="cx-pop-c">${bpButton({ text: `Create ${KINDS[kind].name}`, minimal: true, outlined: true })}</span></span>`;

// A candidate tag as it renders in a block, `#evd-candidate`, in the wrapper the
// popup code puts around it (renderNodeTagPopup.tsx:23-38). With `popover`, the
// "Create <Type>" popover is placed the way the code places it: Position.TOP with
// offset "<tag width / 2>px, 10" against a zero-size target that sits on the text
// baseline at the tag's left edge (128-135, and span.bp3-popover-target is
// inline-block), so it is centered over the tag with its bottom 10 px above the
// baseline: it overlaps the top of the pill by a few px. That geometry is built
// here from the same CSS, not measured; how it lands in Roam's own font is not
// verified. The popover starts hidden unless `popoverOpen`; its ref is `<ref>-pop`.
export const candidateTag = (kind: Kind, o: { ref?: string; popover?: boolean; popoverOpen?: boolean } = {}): string => {
  const c = tagColors(kind);
  const style = `background-color:${c.bg};color:${c.text};border:1px solid ${c.border};font-weight:500;padding:2px 6px;border-radius:12px;margin:0 2px;font-size:0.9em;white-space:nowrap;box-shadow:0 1px 2px rgba(0, 0, 0, 0.05);display:inline-block;cursor:pointer`;
  const tag = `<span class="cx-tag" style="${style}">#${esc(KINDS[kind].tag)}</span>`;
  const pop = o.popover
    ? `<span class="cx-tagroot"><span class="cx-tagbase"><span class="cx-tagrow"${o.popoverOpen ? "" : ' style="opacity:0"'}${refAttr(o.ref ? `${o.ref}-pop` : undefined)}>${createNodePopover(kind)}</span></span></span>`
    : "";
  return `<span class="cx-tagwrap"${refAttr(o.ref)}>${tag}${pop}</span>`;
};

// ------------------------------------------------------------ image tools

// The tools that show at an inline image's bottom right while it is hovered
// (utils/renderImageToolsMenu.tsx:42-78, 110-114): `absolute bottom-2 right-2`
// (its `z-[100]` is not in Roam's Tailwind 2.1), a `flex gap-1 rounded border
// border-gray-200 bg-white p-1 shadow-sm` box with two small minimal buttons: the
// `label` icon, titled "Add Node Tag", which opens the tag menu, and `edit`, "Edit
// Block". Put it inside a positioned image wrapper. Titles are native tooltips and
// are not drawn. `hot`: the button under the pointer.
export const imageTools = (o: { ref?: string; hot?: "tag" | "edit" } = {}): string => {
  const ref = o.ref ?? "imgtools";
  return `<div class="cx-bp cx-imgtools"${refAttr(ref)}><div class="cx-imgtools-in cx-twborder">${bpButton({ icon: "label", minimal: true, small: true, hot: o.hot === "tag", title: "Add Node Tag", ref: `${ref}-tag` })}${bpButton({ icon: "edit", minimal: true, small: true, hot: o.hot === "edit", title: "Edit Block", ref: `${ref}-edit` })}</div></div>`;
};

// ------------------------------------------------------------ film overlay (not product UI)

// A quiet one-line tip for the film overlay (f.overlay), such as "No Add relation?
// Turn on stored relations." 23 px in the 1280 x 720 frame (about 12 px at a 650 px
// embed), centered near the bottom, clear of the headline band.
export const tipChip = (text: string, ref = "tip"): string =>
  `<div class="oq-tip"${refAttr(ref)}><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.2v.1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>${esc(text)}</span></div>`;
