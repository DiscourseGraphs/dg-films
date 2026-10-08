import { icon } from "./icons";
import { esc, inline, refAttr, styleAttr, type Place } from "./util";

// Popups for the Roam surface's popup layer. Each returns markup. Coordinates are
// the Roam surface's (the window body); pass `left: "center"` plus a width to
// center. `hidden: true` starts the part at opacity 0, for a scene that fades it
// in; a scene that tweens `opacity: [0, 1]` does not need it.

type Common = Place & { ref?: string; hidden?: boolean };

// ------------------------------------------------------------- search menu

export type MenuSection = { heading: string; items: Array<string | { text: string; hot?: boolean }> };

// The node search menu that opens under the caret: sections of results, the
// highlighted one marked `hot`.
export const searchMenu = (s: Common & { sections: MenuSection[] }): string =>
  `<div class="k-pop"${refAttr(s.ref)}${styleAttr({ width: 420, ...s }, { hidden: s.hidden })}>${s.sections
    .map(
      (sec) =>
        `<div class="k-pop-sect"><div class="k-pop-h">${inline(sec.heading)}</div>${sec.items
          .map((item) => {
            const it = typeof item === "string" ? { text: item, hot: false } : item;
            return `<div class="k-pop-item${it.hot ? " hot" : ""}">${inline(it.text)}</div>`;
          })
          .join("")}</div>`,
    )
    .join("")}</div>`;

// ----------------------------------------------------------- dialog + scrim

// The dim behind a dialog. `heavy` is Blueprint's dark backdrop, for a dialog that owns the screen.
export const scrim = (o: { ref?: string; hidden?: boolean; heavy?: boolean } = {}): string =>
  `<div class="k-scrim${o.heavy ? " heavy" : ""}"${refAttr(o.ref)}${o.hidden ? ' style="opacity:0"' : ""}></div>`;

export const dialogTabs = (labels: string[], on: number, inner = false): string =>
  `<div class="k-dlg-tabs${inner ? " inner" : ""}">${labels
    .map((label, i) => `<span${i === on ? ' class="on"' : ""}>${esc(label)}</span>`)
    .join("")}</div>`;

export type DialogSpec = Common & {
  title: string;
  tabs?: { labels: string[]; on: number };
  // The dialog's content (markup).
  body: string;
};

// A Roam dialog: a header with a close button, optional tabs, and a body.
// Put scrim() before it in the layer to dim what is behind.
export const dialog = (s: DialogSpec): string =>
  `<div class="k-dlg"${refAttr(s.ref)}${styleAttr(s, { hidden: s.hidden })}>
    <div class="k-dlg-h">${inline(s.title)}<span class="k-dlg-x">${icon("x", 16)}</span></div>
    ${s.tabs ? dialogTabs(s.tabs.labels, s.tabs.on) : ""}
    ${s.body}
  </div>`;

// ---------------------------------------------------------- toast and share

export const toast = (s: Common & { text: string }): string =>
  `<div class="k-toast"${refAttr(s.ref)}${styleAttr(s, { hidden: s.hidden })}>${icon("check", 14, 3)}${esc(s.text)}</div>`;

export const button = (text: string, kind?: "primary" | "go" | "no" | "off"): string =>
  `<span class="k-btn${kind ? ` ${kind}` : ""}">${esc(text)}</span>`;

export type ShareSpec = Common & {
  title?: string;
  page: string;
  groups: Array<{ name: string; on?: boolean }>;
  action?: string;
};

// Roam's share dialog: the page, a switch per group, one action.
export const shareDialog = (s: ShareSpec): string =>
  dialog({
    ...s,
    width: s.width ?? 520,
    title: s.title ?? "Share a page",
    body: `<div class="k-dlg-pad">
      <div style="color:var(--roam-muted);font-size:12px;margin-bottom:10px">${inline(s.page)}</div>
      ${s.groups
        .map(
          (g) =>
            `<div class="k-share-row"><span>${esc(g.name)}</span><span class="k-switch${g.on ? " on" : ""}"><i></i></span></div>`,
        )
        .join("")}
      <div style="display:flex;justify-content:flex-end;margin-top:18px">${button(s.action ?? "Publish", "primary")}</div>
    </div>`,
  });

// ------------------------------------------------------------- palette, menu

export type PaletteSpec = Common & {
  query?: string;
  items: Array<{ text: string; tag?: string; on?: boolean }>;
};

// Roam's command palette. With a ref, the query span carries `<ref>-q` for f.type.
export const commandPalette = (s: PaletteSpec): string =>
  `<div class="k-palette"${refAttr(s.ref)}${styleAttr({ width: 560, ...s }, { hidden: s.hidden })}>
    <div class="k-palette-in">${icon("command", 16, 1.8)}<span class="k-palette-q"${refAttr(s.ref ? `${s.ref}-q` : undefined)}>${esc(s.query ?? "")}</span><i class="k-palette-caret"></i></div>
    <div class="k-palette-list">${s.items
      .map(
        (it) =>
          `<div class="k-palette-it${it.on ? " on" : ""}"><span>${esc(it.text)}</span>${it.tag ? `<span class="k-palette-k">${esc(it.tag)}</span>` : ""}</div>`,
      )
      .join("")}</div>
  </div>`;

export type MenuItem = {
  text: string;
  // A shortcut on the right.
  key?: string;
  // A colored dot on the left (a css color).
  dot?: string;
  on?: boolean;
  ref?: string;
};

// A Blueprint menu: items with an optional colored dot and shortcut. This is the
// tag menu on a canvas block card.
export const popMenu = (s: Common & { items: MenuItem[] }): string =>
  `<div class="k-menu"${refAttr(s.ref)}${styleAttr(s, { hidden: s.hidden })}><ul>${s.items
    .map(
      (it) =>
        `<li class="k-menu-it${it.on ? " on" : ""}"${refAttr(it.ref)}>${it.dot ? `<i class="k-menu-dot" style="background:${esc(it.dot)}"></i>` : ""}<span>${esc(it.text)}</span>${it.key ? `<span class="k-menu-key">${esc(it.key)}</span>` : ""}</li>`,
    )
    .join("")}</ul></div>`;
