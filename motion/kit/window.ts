import { html, type Film } from "../engine/runtime";
import { icon, type IconName } from "./icons";
import { esc, type Pos } from "./util";

// Roles, not people: a pencil for the author, a flask for QA, an eye for the reviewer.
export type Role = "author" | "reviewer" | "qa";
export const ROLES: Record<Role, { icon: IconName; label: string }> = {
  author: { icon: "pencil", label: "Author" },
  reviewer: { icon: "eye", label: "Reviewer" },
  qa: { icon: "flask", label: "QA" },
};
export const ROLE_LIST = Object.keys(ROLES) as Role[];

// A round avatar for a role, 22 units by default. `tag` is the element to emit,
// so it can sit inside a span or a flex row without invalid nesting.
export const roleAvatar = (role: Role, size = 22, tag: "span" | "div" | "i" = "span"): string =>
  `<${tag} class="k-avatar ${role}"${size === 22 ? "" : ` style="--sz:${size}px"`}>${icon(ROLES[role].icon, Math.round(size * 0.55), 2.3)}</${tag}>`;

// The height of a window's bar; the body is the window minus this.
export const WIN_BAR = 38;

export type WindowSpec = Pos & {
  id: string;
  w: number;
  h: number;
  url: string;
  // The role whose point of view this window is; its avatar sits in the bar.
  role?: Role;
  dark?: boolean;
  // Width of the address field as a percentage of the bar (default 52).
  urlWidth?: number;
  body: string;
};

// A browser-style window: a bar with the page address (and the role's avatar on
// the right), and a body the surface fills. `cx`/`cy` are the window's center in
// world coordinates.
export const windowHtml = (s: WindowSpec): string =>
  `<div class="k-win${s.dark ? " dark" : ""}" data-win="${esc(s.id)}" style="left:${s.cx - s.w / 2}px;top:${s.cy - s.h / 2}px;width:${s.w}px;height:${s.h}px${s.urlWidth ? `;--url-w:${s.urlWidth}%` : ""}">
    <div class="k-win-bar"><i></i><i></i><i></i><div class="k-win-url">${esc(s.url)}</div>${s.role ? roleAvatar(s.role) : ""}</div>
    <div class="k-win-body">${s.body}</div>
  </div>`;

export const windowShell = (spec: WindowSpec): HTMLElement => html(windowHtml(spec));

// The dotted floor the camera travels over. `around` is the world rect the
// windows occupy; the floor extends `margin` past it on every side and fades out
// at the edge, so it reads as motion when windows are far apart.
export const floor = (f: Film, around: { x: number; y: number; w: number; h: number }, margin = 1800): HTMLElement => {
  const el = document.createElement("div");
  el.className = "k-floor";
  el.style.left = `${around.x - margin}px`;
  el.style.top = `${around.y - margin}px`;
  el.style.width = `${around.w + margin * 2}px`;
  el.style.height = `${around.h + margin * 2}px`;
  f.world.append(el);
  return el;
};
