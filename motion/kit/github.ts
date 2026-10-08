import type { Film } from "../engine/runtime";
import { icon } from "./icons";
import { esc, inline, refAttr, type Box, type Pos } from "./util";
import { roleAvatar, windowShell, type Role } from "./window";

// A GitHub pull request page: title, state, meta line, tabs, and the conversation
// (comments and timeline events) that the film fills with its own content.

export const PR_WIN: Box = { w: 880, h: 760 };

export type GhComment = {
  ref?: string;
  author: string;
  role?: Role;
  when: string;
  // The small label on the right of the header, such as "Author".
  badge?: string;
  // The comment's content (markup): headings, paragraphs, mdChecklist(), a player.
  body: string;
};

export const ghComment = (c: GhComment): string =>
  `<div class="k-gh-comment"${refAttr(c.ref)}>
    <div class="k-gh-ch">${c.role ? roleAvatar(c.role, 24) : ""}<span><b>${esc(c.author)}</b> commented ${esc(c.when)}</span>${c.badge ? `<span class="k-gh-who">${esc(c.badge)}</span>` : ""}</div>
    <div class="k-gh-body">${c.body}</div>
  </div>`;

export type GhEvent = { ref?: string; author: string; role?: Role; text: string; shas?: string[]; when: string };

// A timeline line such as "sid597 added 3 commits  9e41b7a c27d0f3  just now".
export const ghEvent = (e: GhEvent): string =>
  `<div class="k-gh-event"${refAttr(e.ref)}>${e.role ? roleAvatar(e.role, 22) : ""}<span><b>${esc(e.author)}</b> ${esc(e.text)}</span>${e.shas?.length ? `<span class="k-gh-shas">${e.shas.map((sha) => `<code>${esc(sha)}</code>`).join("")}</span>` : ""}<span class="k-gh-when">${esc(e.when)}</span></div>`;

// A link in a comment. `hover` underlines it, for a scene that points at it.
export const ghLink = (text: string, ref?: string): string => `<a class="k-gh-link"${refAttr(ref)}>${esc(text)}</a>`;

export type MdItem = { ref?: string; html: string; on?: boolean; kids?: MdItem[] };

// A markdown task list: a box per item (ticked when `on`), nested lists under items.
export const mdChecklist = (items: MdItem[], ref?: string): string =>
  `<ul class="k-md"${refAttr(ref)}>${items
    .map(
      (item) =>
        `<li${refAttr(item.ref)}><span class="k-cb${item.on ? " on" : ""}">${icon("check", 15, 3.4)}</span>${item.html}${item.kids?.length ? mdChecklist(item.kids) : ""}</li>`,
    )
    .join("")}</ul>`;

export type PullRequestSpec = {
  id?: string;
  at: Pos;
  size?: Box;
  // "owner/repo".
  repo: string;
  number: number;
  title: string;
  author: string;
  base: string;
  head: string;
  commits: number;
  files?: number;
  checks?: number;
  role?: Role;
  // The conversation tab's content: ghComment() and ghEvent() markup.
  conversation: string;
};

export const pullRequestBody = (s: PullRequestSpec): string => {
  const tab = (label: string, count: number | undefined, on = false): string =>
    `<span${on ? ' class="on"' : ""}>${esc(label)}${count === undefined ? "" : ` <i class="k-n">${count}</i>`}</span>`;
  return `<div class="k-gh">
    <h1 class="k-gh-title"${refAttr("gh-title")}>${inline(s.title)} <span class="k-num">#${s.number}</span></h1>
    <div class="k-gh-meta"><span class="k-gh-open">${icon("pr", 15, 2.2)}Open</span><span><b>${esc(s.author)}</b> wants to merge ${s.commits} commit${s.commits === 1 ? "" : "s"} into <span class="k-gh-ref">${esc(s.base)}</span> from <span class="k-gh-ref">${esc(s.head)}</span></span></div>
    <div class="k-gh-tabs">${tab("Conversation", 1, true)}${tab("Commits", s.commits)}${tab("Checks", s.checks ?? 0)}${tab("Files changed", s.files ?? 0)}</div>
    <div${refAttr("gh-conversation")}>${s.conversation}</div>
    <div class="k-fade-bottom" style="height:110px"></div>
  </div>`;
};

export type PullRequest = {
  win: HTMLElement;
  title: HTMLElement;
  conversation: HTMLElement;
  q: <T extends HTMLElement = HTMLElement>(ref: string) => T;
};

export const buildPullRequest = (f: Film, spec: PullRequestSpec): PullRequest => {
  const win = windowShell({
    id: spec.id ?? "pr",
    ...(spec.size ?? PR_WIN),
    ...spec.at,
    url: `github.com/${spec.repo}/pull/${spec.number}`,
    role: spec.role,
    body: pullRequestBody(spec),
  });
  f.world.append(win);
  const q = <T extends HTMLElement = HTMLElement>(ref: string): T => f.q<T>(`[data-ref="${ref}"]`, win);
  return { win, title: q("gh-title"), conversation: q("gh-conversation"), q };
};

// A bare comment window (the PR's comment on its own, such as a bot's report).
export const commentWindow = (
  f: Film,
  spec: { id: string; at: Pos; size?: Box; url: string; role?: Role; comment: GhComment },
): { win: HTMLElement; q: <T extends HTMLElement = HTMLElement>(ref: string) => T } => {
  const win = windowShell({
    id: spec.id,
    ...(spec.size ?? { w: 900, h: 900 }),
    ...spec.at,
    url: spec.url,
    role: spec.role,
    body: `<div class="k-gh" style="padding-top:22px">${ghComment(spec.comment)}</div>`,
  });
  f.world.append(win);
  return { win, q: <T extends HTMLElement = HTMLElement>(ref: string): T => f.q<T>(`[data-ref="${ref}"]`, win) };
};
