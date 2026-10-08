// Product screens as a template-lab user sees them: the extension's UI under the
// template graph's roam/css (brackets hidden, an icon and a color per node type).
// Pure markup, no timing. Each part names the source it is drawn from.
import { esc } from "../../../engine/runtime";
import { icon } from "../../../kit";
import { KINDS, MENU_ORDER, type Kind } from "./data";

const refAttr = (ref?: string): string => (ref ? ` data-ref="${esc(ref)}"` : "");

// Blueprint 3.30 icon paths at 16 px (@blueprintjs/icons iconSvgPaths.js).
const BP_PATHS = {
  diagramTree:
    "M15 8v3h-2V9H9v2H7V9H3v2H1V8a1 1 0 011-1h5V5h2v2h5a1 1 0 011 1zM1 12h2a1 1 0 011 1v2a1 1 0 01-1 1H1a1 1 0 01-1-1v-2a1 1 0 011-1zm12 0h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 011-1zm-6 0h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2a1 1 0 011-1zM7 0h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1V1a1 1 0 011-1z",
  infoSign: "M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zM7 3h2v2H7V3zm3 10H6v-1h1V7H6V6h3v6h1v1z",
  cross:
    "M9.41 8l3.29-3.29c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71L8 6.59l-3.29-3.3a1.003 1.003 0 00-1.42 1.42L6.59 8 3.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71L8 9.41l3.29 3.29c.18.19.43.3.71.3a1.003 1.003 0 00.71-1.71L9.41 8z",
  pin: "M9.41.92c-.51.51-.41 1.5.15 2.56L4.34 7.54C2.8 6.48 1.45 6.05.92 6.58l3.54 3.54-3.54 4.95 4.95-3.54 3.54 3.54c.53-.53.1-1.88-.96-3.42l4.06-5.22c1.06.56 2.04.66 2.55.15L9.41.92z",
  filter:
    "M13.99.99h-12a1.003 1.003 0 00-.71 1.71l4.71 4.71V14a1.003 1.003 0 001.71.71l2-2c.18-.18.29-.43.29-.71V7.41L14.7 2.7a1.003 1.003 0 00-.71-1.71z",
  link: "M4.99 11.99c.28 0 .53-.11.71-.29l6-6a1.003 1.003 0 00-1.42-1.42l-6 6a1.003 1.003 0 00.71 1.71zm3.85-2.02L6.4 12.41l-1 1-.01-.01c-.36.36-.85.6-1.4.6-1.1 0-2-.9-2-2 0-.55.24-1.04.6-1.4l-.01-.01 1-1 2.44-2.44c-.33-.1-.67-.16-1.03-.16-1.1 0-2.09.46-2.81 1.19l-.02-.02-1 1 .02.02c-.73.72-1.19 1.71-1.19 2.81 0 2.21 1.79 4 4 4 1.1 0 2.09-.46 2.81-1.19l.02.02 1-1-.02-.02c.73-.72 1.19-1.71 1.19-2.81 0-.35-.06-.69-.15-1.02zm7.15-5.98c0-2.21-1.79-4-4-4-1.1 0-2.09.46-2.81 1.19l-.02-.02-1 1 .02.02c-.72.72-1.19 1.71-1.19 2.81 0 .36.06.69.15 1.02l2.44-2.44 1-1 .01.01c.36-.36.85-.6 1.4-.6 1.1 0 2 .9 2 2 0 .55-.24 1.04-.6 1.4l.01.01-1 1-2.43 2.45c.33.09.67.15 1.02.15 1.1 0 2.09-.46 2.81-1.19l.02.02 1-1-.02-.02a3.92 3.92 0 001.19-2.81z",
};
export const bpIcon = (name: keyof typeof BP_PATHS, size = 16, color = "currentColor"): string =>
  `<svg class="bpi" width="${size}" height="${size}" viewBox="0 0 16 16"><path fill="${color}" fill-rule="evenodd" d="${BP_PATHS[name]}"/></svg>`;

// ------------------------------------------------------------ references

// `[[@source]]`: a grey chip (roam/css `span[data-link-title^="@"]`).
export const sourceLink = (src: string, ref?: string): string =>
  `<span class="tl-src"${refAttr(ref)}>${esc(src)}</span>`;

// A page reference to a node, `[[[[EVD]] - text - [[@src]]]]`, under the
// template's css: the type's icon, then code, text and source in its color.
export const nodeLink = (kind: Kind, content: string, source?: string, ref?: string): string => {
  const k = KINDS[kind];
  const src = source ? `<span class="tl-dash"> - </span>${sourceLink(source)}` : "";
  return `<span class="tl-ref" style="--k:${k.color}"${refAttr(ref)}><span class="tl-ic">${esc(k.icon)}</span><span class="tl-code">${kind}</span><span class="tl-dash"> - </span><span class="tl-txt">${esc(content)}</span>${src}</span>`;
};

// A node page's title out of edit mode: nested refs render, brackets hidden.
export const nodeTitle = (kind: Kind, content: string, source?: string): string => {
  const k = KINDS[kind];
  const src = source ? ` - ${sourceLink(source)}` : "";
  return `<span class="tl-title" style="--k:${k.color}"><span class="tl-code">${kind}</span> - ${esc(content)}${src}</span>`;
};

// The same title in edit mode: the raw text with its brackets and a caret, as the
// extension leaves it right after it creates the page (createDiscourseNode.ts
// dispatches a mousedown on the sidebar title).
export const rawTitle = (kind: Kind, content: string, source?: string): string =>
  `<span class="tl-raw">${esc(`[[${kind}]] - ${content}${source ? ` - [[${source}]]` : ""}`)}</span>`;

// ------------------------------------------------------------ discourse context

// The button beside a node page's title (DiscourseContextOverlay.tsx,
// DiscourseContextButton): Blueprint small minimal, a diagram-tree icon and the
// relation count, a link icon and the reference count, 10 px icons, 12 px text.
export const contextButton = (ref: string, score: number, refs: number): string =>
  `<span class="tl-ctxbtn"${refAttr(ref)}>${bpIcon("diagramTree", 10)}<b data-ref="${ref}-score">${score}</b>${bpIcon("link", 10)}<b data-ref="${ref}-refs">${refs}</b></span>`;

// ------------------------------------------------------------ the node menu

// The button by a text selection (DiscourseNodeMenu.tsx, TextSelectionNodeMenu):
// white, a #d3d8de border, the Discourse Graphs glyph and a chevron.
const GLYPH =
  "M156.705 252.012C140.72 267.995 114.803 267.995 98.8183 252.012L11.9887 165.182C-3.99622 149.197 -3.99622 123.28 11.9886 107.296L55.4035 63.8807C63.3959 55.8881 76.3541 55.8881 84.3467 63.8807C92.3391 71.8731 92.3391 84.8313 84.3467 92.8239L69.8751 107.296C53.8901 123.28 53.8901 149.197 69.8751 165.182L113.29 208.596C121.282 216.589 134.241 216.589 142.233 208.596C150.225 200.604 150.225 187.646 142.233 179.653L127.761 165.182C111.777 149.197 111.777 123.28 127.761 107.296C143.746 91.3105 143.746 65.3939 127.761 49.4091L113.29 34.9375C105.297 26.9452 105.297 13.9868 113.29 5.99432C121.282 -1.99811 134.241 -1.99811 142.233 5.99434L243.533 107.296C259.519 123.28 259.519 149.197 243.533 165.182L156.705 252.012ZM200.119 121.767C192.127 113.775 179.168 113.775 171.176 121.767C163.184 129.76 163.184 142.718 171.176 150.71C179.168 158.703 192.127 158.703 200.119 150.71C208.112 142.718 208.112 129.76 200.119 121.767Z";
export const selectionButton = (ref: string): string =>
  `<div class="tl-selbtn"${refAttr(ref)}><svg width="18" height="19" viewBox="0 0 256 264"><path fill-rule="evenodd" clip-rule="evenodd" fill="#555" d="${GLYPH}"/></svg>${icon("caretDown", 16, 2.2)}</div>`;

// The node menu (DiscourseNodeMenu.tsx): a Blueprint menu, one row per node type
// with a 16 px dot in the type's canvas color, its name, and the shortcut letter
// in mono. With a selection it lists types; with none, candidate tags.
export const nodeMenu = (ref: string, mode: "types" | "tags" = "types"): string =>
  `<div class="tl-menu"${refAttr(ref)}>${MENU_ORDER.map((kind) => {
    const k = KINDS[kind];
    const off = mode === "tags" && !k.tag;
    const text = mode === "types" ? k.name : k.tag ? `#${k.tag}` : "";
    return `<div class="tl-mi${off ? " off" : ""}" data-ref="${ref}-${kind}"><i style="background:${k.dot}"></i><span class="tl-mi-t">${esc(text)}</span><span class="tl-mi-k">${esc(k.shortcut)}</span></div>`;
  }).join("")}</div>`;

// ------------------------------------------------------------ page parts

// A template block's `> [!info]` line as Roam renders it: a full-width light-blue
// band, a solid blue bar on the left, a filled info circle and bold blue text
// (tutorial-series/evidence/cd8OCHcJ7b.png, a template-lab Claim page).
export const callout = (text: string): string =>
  `<span class="tl-callout">${bpIcon("infoSign", 14)}<b>${esc(text)}</b></span>`;

// A block holding `{{[[embed-children]]: ((uid))}}`: Roam's embed frame around
// the embedded children (here, one empty block). Its exact frame is unverified.
export const embedBlock = (): string =>
  `<span class="tl-embed"><span class="tl-embed-row"><i></i></span></span>`;

// A `{{[[slider]]}}` block: Roam's slider, 0 to 10, its handle at 0.
export const slider = (): string =>
  `<span class="tl-slider"><span class="tl-slider-track"><i></i></span><span class="tl-slider-axis"><b>0</b><b>10</b></span></span>`;

// A right-sidebar window as Roam draws it: "▾ Outline of:" with, at the right edge,
// the window's number and the close, pin and filter buttons stacked; then the page
// (tutorial-series/evidence/sidebar-new-node-g100.png; docs issue-description-nested-text.png).
export const outlineWindow = (ref: string, body: string, n = 1): string =>
  `<div class="tl-outline"${refAttr(ref)}><div class="tl-outline-head">${icon("caretDown", 12, 2.4)}<span>Outline of:</span></div><div class="tl-outline-tools"><span>${n}</span>${bpIcon("cross", 12)}${bpIcon("pin", 12)}${bpIcon("filter", 12)}</div>${body}</div>`;

// A right-sidebar window as episode 1 v1 drew it (header repeating the title). The
// real header is outlineWindow's; this stays for v1's code.
export const sideWindow = (ref: string, headTitle: string, body: string): string =>
  `<div class="tl-sidewin"${refAttr(ref)}><div class="tl-sidehead">${icon("caretDown", 13, 2.4)}<span class="tl-sidehead-t">${esc(headTitle)}</span>${icon("dotsH", 15)}${icon("x", 13)}</div>${body}</div>`;

// ------------------------------------------------------------ film overlays (not product UI)

// A key the viewer should see pressed, drawn as a keyboard key.
export const keyCap = (ref: string, label: string): string =>
  `<span class="oq-key"${refAttr(ref)}>${esc(label)}</span>`;
