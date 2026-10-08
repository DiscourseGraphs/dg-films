// ZoteroRoam's UI as template-lab users see it, drawn from the real captures in
// tutorial-series/evidence/zotero-Q8piUCWbV/ (Tutorial/Import and cite articles)
// and evidence/zotero-setup-gttthprpe/ (Tutorial/ZoteroRoam setup). ZoteroRoam is a
// third-party Roam Depot extension; its code is not in this repo, so the captures
// are the only source. Icons are Blueprint 3.30's 16 px paths. Pure markup, no
// timing. Classes: zr- for ZoteroRoam, rc- for Roam's own autocomplete.
import { esc } from "../../../engine/runtime";

const refAttr = (ref?: string): string => (ref ? ` data-ref="${esc(ref)}"` : "");

// @blueprintjs/icons 3.30.2 lib/esm/generated/iconSvgPaths.js, 16 px grid.
const BP16 = {
  manual:
    "M15.99 1.13c-.02-.41-.33-.77-.78-.87C12.26-.36 9.84.13 8 1.7 6.16.13 3.74-.36.78.26.33.35.03.72.01 1.13H0v12c0 .08 0 .17.02.26.12.51.65.82 1.19.71 2.63-.55 4.59-.04 6.01 1.57.02.03.06.04.08.06.02.02.03.04.05.06.04.03.09.04.13.07.05.03.09.05.14.07.11.04.23.07.35.07h.04c.12 0 .24-.03.35-.07.05-.02.09-.05.14-.07.04-.02.09-.04.13-.07.02-.02.03-.04.05-.06.03-.02.06-.03.08-.06 1.42-1.6 3.39-2.12 6.010-1.57.54.11 1.07-.21 1.19-.71.04-.09.04-.18.04-.26l-.01-12zM7 12.99c-1.4-.83-3.07-1.14-5-.93V1.96c2.11-.28 3.75.2 5 1.46v9.57zm7-.92c-1.93-.21-3.6.1-5 .93V3.42c1.25-1.26 2.89-1.74 5-1.46v10.11z",
  settings:
    "M3 1c0-.55-.45-1-1-1S1 .45 1 1v3h2V1zm0 4H1c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V6c0-.55-.45-1-1-1zm12-4c0-.55-.45-1-1-1s-1 .45-1 1v2h2V1zM9 1c0-.55-.45-1-1-1S7 .45 7 1v6h2V1zM1 15c0 .55.45 1 1 1s1-.45 1-1v-5H1v5zM15 4h-2c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1zm-2 11c0 .55.45 1 1 1s1-.45 1-1V9h-2v6zM9 8H7c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-2 7c0 .55.45 1 1 1s1-.45 1-1v-2H7v2z",
  dashboard:
    "M5 4c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zM4 7c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm4-2c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm-2 6c0 1.1.9 2 2 2s2-.9 2-2c0-.53-2-5-2-5s-2 4.47-2 5zM8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm4-9c0-.55-.45-1-1-1s-1 .45-1 1 .45 1 1 1 1-.45 1-1zm0 2c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z",
  search:
    "M15.55 13.43l-2.67-2.68a6.940 6.940 0 001.11-3.76c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7c1.39 0 2.68-.42 3.76-1.11l2.68 2.67a1.498 1.498 0 102.12-2.12zm-8.56-1.44c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z",
  console:
    "M15 15H1c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zM14 5H2v8h12V5zM4 6c.28 0 .53.11.71.29l2 2c.18.18.29.43.29.71s-.11.53-.29.71l-2 2a1.003 1.003 0 01-1.42-1.42L4.59 9l-1.3-1.29A1.003 1.003 0 014 6zm5 4h3c.55 0 1 .45 1 1s-.45 1-1 1H9c-.55 0-1-.45-1-1s.45-1 1-1z",
  arrowRight:
    "M14.7 7.29l-5-5a.965.965 0 00-.71-.3 1.003 1.003 0 00-.71 1.71l3.29 3.29H1.99c-.55 0-1 .45-1 1s.45 1 1 1h9.59l-3.29 3.29a1.003 1.003 0 001.42 1.420l5-5c.18-.18.29-.43.29-.71s-.12-.52-.3-.7z",
  add: "M10.99 6.99h-2v-2c0-.55-.45-1-1-1s-1 .45-1 1v2h-2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1zm-3-7c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.68 6-6 6z",
  chat: "M6 10c-1.1 0-2-.9-2-2V3H1c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1v2a1.003 1.003 0 001.71.71L5.41 13H10c.55 0 1-.45 1-1v-1.17l-.83-.83H6zm9-10H6c-.55 0-1 .45-1 1v7c0 .55.45 1 1 1h4.59l2.71 2.71c.17.18.42.29.7.29.55 0 1-.45 1-1V9c.55 0 1-.45 1-1V1c0-.55-.45-1-1-1z",
  application:
    "M3.5 7h7c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-7c-.28 0-.5.22-.5.5s.22.5.5.5zM15 1H1c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1zm-1 12H2V5h12v8zM3.5 9h4c.28 0 .5-.22.5-.5S7.78 8 7.5 8h-4c-.28 0-.5.22-.5.5s.22.5.5.5zm0 2h5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-5c-.28 0-.5.22-.5.5s.22.5.5.5z",
  cloud: "M12 6c-.03 0-.07 0-.1.01A5 5 0 002 7c0 .11.01.22.02.33A3.51 3.51 0 000 10.5C0 12.43 1.57 14 3.5 14H12c2.21 0 4-1.79 4-4s-1.79-4-4-4z",
  eyeOpen:
    "M8.002 7.003a1.003 1.003 0 000 2.005 1.003 1.003 0 000-2.005zm7.988.972v-.02-.01-.02-.02a.675.675 0 00-.17-.36c-.509-.673-1.118-1.264-1.737-1.806-1.328-1.173-2.846-2.155-4.523-2.546a6.702 6.702 0 00-2.925-.06c-.889.18-1.738.541-2.546.992C2.84 4.837 1.692 5.81.694 6.902c-.18.211-.36.411-.53.632a.742.742 0 000 .932c.51.672 1.119 1.264 1.738 1.805 1.328 1.173 2.846 2.156 4.523 2.547.968.23 1.947.24 2.925.04.889-.18 1.738-.542 2.546-.993 1.248-.712 2.397-1.684 3.395-2.777.18-.2.37-.411.54-.632.09-.1.149-.23.169-.36v-.02-.02-.01-.02-.03c0-.01-.01-.01-.01-.02zm-7.988 3.038a2.998 2.998 0 01-2.995-3.008 2.998 2.998 0 012.995-3.008 2.998 2.998 0 012.996 3.008 2.998 2.998 0 01-2.996 3.008z",
  clipboard:
    "M11 2c0-.55-.45-1-1-1h.22C9.88.4 9.24 0 8.5 0S7.12.4 6.78 1H7c-.55 0-1 .45-1 1v1h5V2zm2 0h-1v2H5V2H4c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h9c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1z",
  paperclip:
    "M14.68 2.31A4.54 4.54 0 0011.46.99c-1.15 0-2.31.44-3.19 1.32L.95 9.63c-.63.63-.95 1.46-.95 2.28a3.21 3.21 0 003.23 3.22c.83 0 1.66-.31 2.3-.95l7.31-7.32c.76-.77.76-1.98.01-2.73s-1.99-.76-2.75 0l-6.07 6.08c-.24.25-.24.65.01.9s.65.25.91.01l6.07-6.08c.25-.25.67-.25.91-.01.25.25.25.67 0 .92l-7.31 7.32c-.75.75-2.04.74-2.76.01-.75-.75-.73-2.02.01-2.76L9.2 3.21c1.24-1.24 3.35-1.26 4.58-.03 1.24 1.24 1.24 3.36 0 4.6l-7.12 7.13c-.24.25-.24.64.01.88.24.24.63.24.88.01v.01l7.13-7.13A4.41 4.41 0 0016 5.51c0-1.16-.44-2.32-1.32-3.2z",
  highlight:
    "M9.12 11.07l2-2.02.71.71 4-4.04L10.17 0l-4 4.04.71.71-2 2.02 4.24 4.3zM2 12.97h4c.28 0 .53-.11.71-.3l1-1.01-3.42-3.45-3 3.030c-.18.18-.29.44-.29.72 0 .55.45 1.01 1 1.01zm13 1.01H1c-.55 0-1 .45-1 1.01S.45 16 1 16h14c.55 0 1-.45 1-1.01s-.45-1.01-1-1.01z",
  caretRight: "M11 8c0-.15-.07-.28-.17-.37l-4-3.5A.495.495 0 006 4.5v7a.495.495 0 00.83.37l4-3.5c.1-.09.17-.22.17-.37z",
  cross:
    "M9.41 8l3.29-3.29c.19-.18.3-.43.3-.71a1.003 1.003 0 00-1.71-.71L8 6.59l-3.29-3.3a1.003 1.003 0 00-1.42 1.42L6.59 8 3.3 11.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71L8 9.41l3.29 3.29c.18.19.43.3.71.3a1.003 1.003 0 00.71-1.71L9.41 8z",
} as const;
type Bp = keyof typeof BP16;

export const bp = (name: Bp, size = 16): string =>
  `<svg class="zr-i" width="${size}" height="${size}" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="${BP16[name]}"/></svg>`;

// The top-bar icon while ZoteroRoam is running: the open book on a light green
// square (evidence/zotero-setup-gttthprpe/icon-running-ADCzFKMhjQ.png).
export const zrIcon = (ref: string): string => `<span class="zr-top"${refAttr(ref)}>${bp("manual", 16)}</span>`;

// The menu the icon opens (evidence/zotero-Q8piUCWbV/1-ngQ_Q1xLiE.png): a white
// Blueprint menu under the icon. Refs: `<ref>`, `<ref>-search`.
export const zrMenu = (ref: string): string => {
  const row = (icon: Bp, text: string, key?: string, extra = ""): string =>
    `<div class="zr-mi"${refAttr(key ? `${ref}-${key}` : undefined)}>${bp(icon)}<span>${esc(text)}</span>${extra}</div>`;
  return `<div class="zr-menu"${refAttr(ref)}>${row("settings", "Settings")}${row("dashboard", "Dashboard", undefined, `<span class="zr-beta">Beta</span>`)}${row("search", "Search in library", "search")}${row("console", "View logs")}</div>`;
};

export type ZrItem = {
  title: string;
  // "Moreau & Ito (2023)": the panel's author-year line, in blue.
  byline: string;
  publication: string;
  url: string;
  abstract: string;
  pdf: string;
};

// The panel "Search in library" opens, showing one item
// (evidence/zotero-Q8piUCWbV/2-EdpdWJC53T.png): the query bar with the Quick Copy
// switch and a close cross; on the left the title, "Author (year)" and the
// publication, the URL and the abstract in a grey box; on the right Copy reference,
// ACTIONS and LINKED CONTENT. "Go to Roam page" sits in a wrapper that opens once the
// page exists (Tutorial/View notes for an article). Refs: `<ref>` (the panel),
// `<ref>-q` (typed query), `<ref>-caret`, `<ref>-body` (the item view), `<ref>-go`
// (the wrapper), `<ref>-import`, `<ref>-close`.
export const zrPanel = (ref: string, item: ZrItem): string => {
  const act = (icon: Bp, text: string, key?: string): string =>
    `<div class="zr-act"${refAttr(key ? `${ref}-${key}` : undefined)}>${bp(icon)}<span>${esc(text)}</span></div>`;
  const ribbon = `<svg class="zr-rib" width="16" height="18" viewBox="0 0 16 18"><circle cx="8" cy="6.5" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 10.6 4 17l4-2.2 4 2.2-1-6.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const head = `<div class="zr-head">${ribbon}<span class="zr-q"${refAttr(`${ref}-q`)}></span><i class="zr-caret"${refAttr(`${ref}-caret`)}></i><span class="zr-grow"></span><span class="zr-qc"><i class="zr-sw"></i>Quick Copy</span><span class="zr-x"${refAttr(`${ref}-close`)}>${bp("cross", 16)}</span></div>`;
  const left = `<div class="zr-left"><div class="zr-title">${esc(item.title)}</div><div class="zr-by"><span class="zr-lk">${esc(item.byline)}</span> <span class="zr-pub">${esc(item.publication)}</span></div><div class="zr-lk zr-url">${esc(item.url)}</div><div class="zr-abs-h">Abstract</div><div class="zr-abs">${esc(item.abstract)}</div></div>`;
  const right = `<div class="zr-right"><div class="zr-copy">${bp("clipboard")}<span>Copy reference</span>${bp("caretRight")}</div><div class="zr-h">ACTIONS</div><div class="zr-gowrap"${refAttr(`${ref}-go`)}>${act("arrowRight", "Go to Roam page")}</div>${act("add", "Import metadata", "import")}${act("chat", "Import notes")}${act("application", "Open in Zotero")}${act("cloud", "Open in Zotero (web)")}${act("eyeOpen", "View raw metadata")}<div class="zr-h">LINKED CONTENT</div><div class="zr-act top">${bp("paperclip")}<span>${esc(item.pdf)}</span></div><div class="zr-act">${bp("highlight")}<span class="zr-ell">Highlights &amp; N...</span><kbd>alt+N</kbd></div></div>`;
  return `<div class="zr-wrap"><div class="zr-panel"${refAttr(ref)}>${head}<div class="zr-body"${refAttr(`${ref}-body`)}>${left}<div class="zr-scroll"><i></i></div>${right}</div></div></div>`;
};

// Roam's `[[` autocomplete as the capture shows it after `[[@U`
// (evidence/zotero-Q8piUCWbV/3-tWF82zJ9Bm.png): a dark list, the typed text first,
// then the matching pages. Refs: `<ref>`, `<ref>-<i>`.
export const citeMenu = (ref: string, rows: string[]): string =>
  `<div class="rc-menu"${refAttr(ref)}>${rows.map((r, i) => `<div class="rc-row"${refAttr(`${ref}-${i}`)}>${esc(r)}</div>`).join("")}</div>`;
