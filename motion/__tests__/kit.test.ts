import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fitRect, type Rect } from "../engine/camera-math";
import { seeded } from "../engine/prng";
import { checkName, fill, scaffoldFilm, TEMPLATE_DIR, titleOf } from "../engine/scaffold";
import { typingCurve } from "../engine/typing";
import {
  arrowPath,
  canvasHtml,
  contextHeights,
  contextPanelHtml,
  drawerHtml,
  drawerMatches,
  freeSlot,
  groupDrawerEntries,
  pageRef,
  DG_KINDS,
} from "../kit/canvas";
import { COLORS, TOKENS } from "../kit/colors";
import { advancedSearch, dgContext, nodeSettingsDialog } from "../kit/dg";
import { logoPaths } from "../kit/dg-logo";
import { ghComment, ghEvent, ghLink, mdChecklist, pullRequestBody } from "../kit/github";
import { charTimes, liftRect, pullDim, PULL_DIM, sideRect, spanRect, unionRect } from "../kit/helpers";
import { hudHtml, stageStates } from "../kit/hud";
import { hasIcon, icon, iconNames } from "../kit/icons";
import { ticketBody } from "../kit/linear";
import { lockupHtml } from "../kit/lockup-markup";
import { chapterAt, fillPercent, playerHtml } from "../kit/player";
import {
  button,
  commandPalette,
  dialog,
  dialogTabs,
  popMenu,
  scrim,
  searchMenu,
  shareDialog,
  toast,
} from "../kit/popups";
import { attr, blk, chip, collapse, roamBodyHtml, roamPage, roamTopBar } from "../kit/roam";
import { scrollY, tcaret, terminalBody, tprompt, tspan, ttyped, type TermColor } from "../kit/terminal";
import { startsOf, totalOf } from "../kit/timeline";
import { clock, placeCss, styleAttr } from "../kit/util";
import { ROLE_LIST, roleAvatar, windowHtml } from "../kit/window";
// The template is real TypeScript that films are copied from, so the whole program type-checks it in place.
import type * as TemplateFilm from "../kit/template/film";

void (null as unknown as typeof TemplateFilm);

const KIT = path.resolve(__dirname, "../kit");
const css = fs.readFileSync(path.join(KIT, "kit.css"), "utf8");

const near = (actual: number, expected: number, tolerance = 1e-6, message?: string): void =>
  assert.ok(Math.abs(actual - expected) <= tolerance, message ?? `${actual} is not within ${tolerance} of ${expected}`);

// -------------------------------------------------------------------- lift

const VP = { w: 1280, h: 720 };
type Pad = number | { x: number; y: number };

// How many units of frame are left between the bottom of `base` and the bottom of the frame
// once the camera has fitted `lifted` with `pad`.
const clearance = (base: Rect, lifted: Rect, pad: Pad): number => {
  const view = fitRect(lifted, VP, pad);
  return (view.cy + VP.h / (2 * view.zoom) - (base.y + base.h)) * view.zoom;
};

test("lift leaves the promised room under the content, for any region and padding", () => {
  const rand = seeded(7);
  for (let i = 0; i < 300; i += 1) {
    const base: Rect = {
      x: rand() * 2000 - 1000,
      y: rand() * 2000 - 1000,
      w: 40 + rand() * 1500,
      h: 30 + rand() * 900,
    };
    const pad: Pad = rand() < 0.5 ? 0.02 + rand() * 0.1 : { x: 0.02 + rand() * 0.1, y: 0.02 + rand() * 0.1 };
    const lifted = liftRect(base, VP, pad, 90);
    near(lifted.x, base.x);
    near(lifted.y, base.y);
    near(lifted.w, base.w);
    assert.ok(lifted.h >= base.h, "the region only grows downward");
    const room = clearance(base, lifted, pad);
    assert.ok(room >= 90 - 1e-6, `only ${room.toFixed(3)} units clear for ${JSON.stringify({ base, pad })}`);
  }
});

test("lift is tight where the height limits the shot: the room is the safe area plus the padding", () => {
  const base: Rect = { x: 0, y: 0, w: 300, h: 500 };
  const lifted = liftRect(base, VP, 0.05, 90);
  near(clearance(base, lifted, 0.05), 90 + 0.05 * VP.h, 1e-6);
});

test("lift matches the fixed point of the fit loop it replaces", () => {
  const rand = seeded(11);
  for (let i = 0; i < 50; i += 1) {
    const base: Rect = { x: 0, y: 0, w: 100 + rand() * 1200, h: 100 + rand() * 600 };
    let grown = base;
    for (let pass = 0; pass < 80; pass += 1) {
      const view = fitRect(grown, VP, 0.04);
      grown = { ...base, h: base.h + 90 / view.zoom };
    }
    near(liftRect(base, VP, 0.04, 90).h, grown.h, 1e-6);
  }
});

test("lift with no safe area, or a frame too small to hold one, hands the region back", () => {
  const base: Rect = { x: 5, y: 6, w: 700, h: 300 };
  assert.deepEqual(liftRect(base, VP, 0.05, 0), base);
  assert.deepEqual(liftRect(base, { w: 1280, h: 80 }, 0.05, 90), base);
});

test("a pull never dims past 5%", () => {
  assert.equal(PULL_DIM, 0.05);
  assert.equal(pullDim(), 0.05);
  assert.equal(pullDim(0.3), 0.05);
  assert.equal(pullDim(0.02), 0.02);
  assert.equal(pullDim(-1), 0);
});

// ----------------------------------------------------------------- regions

test("unionRect boxes several rects and adds margin per side", () => {
  const boxed = unionRect(
    [
      { x: 10, y: 20, w: 100, h: 50 },
      { x: 200, y: 0, w: 40, h: 40 },
    ],
    { l: 5, r: 10, t: 15, b: 20 },
  );
  assert.deepEqual(boxed, { x: 5, y: -15, w: 245, h: 105 });
  assert.deepEqual(unionRect([{ x: 1, y: 2, w: 3, h: 4 }]), { x: 1, y: 2, w: 3, h: 4 });
});

test("spanRect runs from the top of one rect to the bottom of another and widens for rects that are not aligned", () => {
  const a: Rect = { x: 100, y: 100, w: 400, h: 30 };
  const b: Rect = { x: 100, y: 400, w: 400, h: 50 };
  assert.deepEqual(spanRect(a, b, { x: 30, top: 20, bottom: 40 }), { x: 70, y: 80, w: 460, h: 410 });
  const shifted = spanRect(a, { ...b, x: 300, w: 400 }, { x: 0, top: 0, bottom: 0 });
  assert.equal(shifted.x, 100);
  assert.equal(shifted.w, 600);
});

test("a sidebar region reaches left of the sidebar and keeps its own height", () => {
  assert.deepEqual(sideRect({ x: 680, y: 46, w: 440, h: 600 }, { left: 640, top: 6, h: 520 }), {
    x: 40,
    y: 52,
    w: 1080,
    h: 520,
  });
});

test("charTimes puts every character inside the typing window, in order", () => {
  const times = charTimes("node search", 10, 2, 7);
  const curve = typingCurve("node search", 7);
  assert.equal(times.length, 11);
  times.forEach((t, i) => near(t, 10 + curve[i + 1] * 2));
  assert.ok(times.every((t, i) => i === 0 || t > times[i - 1]));
  near(times[times.length - 1], 12);
});

test("beat starts accumulate the lengths before them and round to a hundredth", () => {
  const starts = startsOf({ open: 6, feature: 14.005, close: 6 });
  assert.deepEqual(starts, { open: 0, feature: 6, close: 20.01 });
  assert.equal(totalOf({ a: 1.1, b: 2.2 }), 3.3);
});

// ----------------------------------------------------------- placement, text

test("center needs a size, uses margins rather than transforms, and hidden parts start at opacity 0", () => {
  assert.equal(placeCss({ left: "center", top: 20, width: 400 }), "left:50%;margin-left:-200px;top:20px;width:400px");
  assert.equal(placeCss({ top: "center", height: 300 }), "top:50%;margin-top:-150px;height:300px");
  assert.throws(() => placeCss({ left: "center" }), /needs a width/);
  assert.throws(() => placeCss({ top: "center" }), /needs a height/);
  assert.equal(styleAttr({ left: 1, top: 2 }, { hidden: true }), ' style="left:1px;top:2px;opacity:0"');
  assert.equal(styleAttr({}), "");
});

test("clock prints m:ss and never goes negative", () => {
  assert.equal(clock(0), "0:00");
  assert.equal(clock(9.9), "0:09");
  assert.equal(clock(242), "4:02");
  assert.equal(clock(-3), "0:00");
});

test("every icon draws an svg, aliases match their target and a typo lists the names", () => {
  for (const name of iconNames()) {
    assert.match(
      icon(name as Parameters<typeof icon>[0], 12),
      /^<svg class="ic" width="12" height="12" viewBox="0 0 24 24"/,
    );
  }
  assert.equal(icon("caret"), icon("caretRight"));
  assert.equal(icon("dots"), icon("dotsH"));
  assert.notEqual(icon("back"), icon("chevronLeft"), "back is the arrow, as in the Roam top bar");
  assert.ok(hasIcon("flask") && !hasIcon("flaskk"));
  assert.throws(() => icon("flaskk" as never), /No icon "flaskk".*flask/);
  assert.ok(iconNames().length >= 60, `merged set has ${iconNames().length}`);
});

// --------------------------------------------------------- markup is escaped

test("text that reaches the page is escaped, and backticks become code", () => {
  const evil = "<img src=x onerror=1>";
  assert.ok(!attr(evil).includes("<img"));
  assert.ok(!chip(evil).includes("<img"));
  assert.ok(!roamPage({ title: evil, blocks: "" }).includes("<img"));
  assert.ok(!searchMenu({ left: 0, top: 0, sections: [{ heading: evil, items: [evil] }] }).includes("<img"));
  assert.ok(!toast({ left: 0, top: 0, text: evil }).includes("<img"));
  assert.ok(!windowHtml({ id: evil, cx: 0, cy: 0, w: 1, h: 1, url: evil, body: "" }).includes("<img"));
  assert.ok(!ghComment({ author: evil, when: evil, body: "" }).includes("<img"));
  assert.ok(!tspan("hi", evil).includes("<img"));
  assert.match(roamPage({ title: "Use `fit` here", blocks: "" }), /Use <code>fit<\/code> here/);
});

// ------------------------------------------------------------------ the rail

test("the rail lights the stage it is at, with earlier stages done and later ones idle", () => {
  assert.deepEqual(stageStates(4, 2), ["done", "done", "on", "idle"]);
  assert.deepEqual(stageStates(3, 3), ["done", "done", "done"]);
  assert.deepEqual(stageStates(3, 0), ["on", "idle", "idle"]);
});

test("the rail draws one node per stage, a segment between nodes, and an avatar per role", () => {
  const html = hudHtml({
    stages: [{ key: "a", icon: "ticket" }, { key: "b" }, { key: "c" }],
    people: ["author", "qa"],
    corner: "right",
  });
  assert.equal(html.match(/class="k-node"/g)?.length, 3);
  assert.equal(html.match(/class="k-seg"/g)?.length, 2);
  assert.equal(html.match(/data-p="/g)?.length, 2);
  assert.match(html, /^<div class="k-rail right">/);
  assert.match(html, /<s>2<\/s>/, "a stage without an icon shows its number");
  assert.ok(!hudHtml({ stages: [{ key: "a" }] }).includes("k-who"), "no people, no avatar well");
});

test("the colors the runtime interpolates are the tokens in kit.css", () => {
  for (const [name, token] of Object.entries(TOKENS)) {
    const found = new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
    assert.ok(found, `${token} is not a hex color in kit.css`);
    assert.equal(found[1].toLowerCase(), COLORS[name as keyof typeof COLORS], `${token} drifted from COLORS.${name}`);
  }
});

// ----------------------------------------------------------- video player

test("the player shows the last chapter that has started and fills in proportion to the clock", () => {
  const chapters = [
    { id: "a", at: 8, title: "A", frame: "p" },
    { id: "b", at: 60, title: "B", frame: "s" },
  ];
  assert.equal(chapterAt(chapters, 0), undefined);
  assert.equal(chapterAt(chapters, 8)?.id, "a");
  assert.equal(chapterAt(chapters, 59.9)?.id, "a");
  assert.equal(chapterAt(chapters, 61)?.id, "b");
  assert.equal(chapterAt([...chapters].reverse(), 61)?.id, "b", "order of the list does not matter");
  assert.equal(fillPercent(121, 242), 50);
  assert.equal(fillPercent(-5, 242), 0);
  assert.equal(fillPercent(999, 242), 100);
});

test("a terminal scrolls a line to where the first line sat, leaving air for the lines above if asked", () => {
  assert.equal(scrollY(300), -300);
  assert.equal(scrollY(0), -0);
  assert.equal(scrollY(300, 10), -290);
  assert.equal(scrollY(2, 10), -0, "never scrolls the other way");
});

// ------------------------------------------------------------------- canvas

test("the node card menu is as tall as its rows: tabs, group labels, rows and padding", () => {
  const one = contextHeights([{ label: "Supported By", rows: [{ id: "a", title: "a", on: true }] }]);
  assert.equal(one.listBody, 12 + 20 + 32 + 0 + 12);
  assert.equal(one.list, 4 + 30 + 20 + one.listBody);
  const two = contextHeights([
    {
      label: "Supported By",
      rows: [
        { id: "a", title: "a", on: true },
        { id: "b", title: "b", on: false },
      ],
    },
    { label: "Opposed By", rows: [{ id: "c", title: "c", on: false }] },
  ]);
  assert.equal(two.listBody, 12 + 2 * 20 + 3 * 32 + 12 + 12);
  assert.equal(two.loading, 54 + 44);
  assert.equal(two.styling, 54 + 146);
});

test("a related node goes in the first free slot of the column to the right", () => {
  const claim = { x: 0, y: 100, w: 300, h: 120 };
  const x = 300 + 240;
  assert.deepEqual(freeSlot(claim, [], 280, 100), { x, y: 100 });
  const first = { x, y: 80, w: 280, h: 100 };
  assert.deepEqual(freeSlot(claim, [first], 280, 100), { x, y: 80 + 100 + 24 });
  const second = { x, y: 204, w: 280, h: 100 };
  assert.deepEqual(freeSlot(claim, [first, second], 280, 100), { x, y: 204 + 100 + 24 });
  const farAway = { x: x + 600, y: 100, w: 280, h: 100 };
  assert.deepEqual(freeSlot(claim, [farAway], 280, 100), { x, y: 100 }, "a card outside the column is no obstacle");
});

test("an arrow runs between two cards' outlines with a gap, and its head sits on the target", () => {
  const from = { x: 0, y: 0, w: 100, h: 60 };
  const to = { x: 400, y: 0, w: 100, h: 60 };
  const arrow = arrowPath(from, to);
  assert.equal(arrow.d, "M106.0 30.0L394.0 30.0");
  near(arrow.mid.x, 250);
  near(arrow.mid.y, 30);
  const tip = /L394\.0 30\.0/.exec(arrow.head);
  assert.ok(tip, "the head's strokes meet at the line's end");
  const [first, , second] = arrow.head.split("L");
  const arm = (point: string): number[] => point.replace("M", "").split(" ").map(Number);
  near(arm(first)[1] + arm(second)[1], 60, 0.2);
});

test("the drawer lists a node once, duplicates first, then alphabetically, and filters by substring", () => {
  const entries = groupDrawerEntries([
    { id: "b", title: "Beta" },
    { id: "a", title: "Alpha" },
    { id: "d", title: "Delta" },
    { id: "d", title: "Delta" },
  ]);
  assert.deepEqual(
    entries.map((e) => [e.uid, e.count]),
    [
      ["d", 2],
      ["a", 1],
      ["b", 1],
    ],
  );
  assert.ok(drawerMatches("Naps boost recall", "NAP"));
  assert.ok(drawerMatches("anything", "   "));
  assert.ok(!drawerMatches("Naps boost recall", "nap l"));
});

test("a page reference to a node nests the type code inside the title's brackets", () => {
  assert.equal(pageRef("[[CLM]] - Naps"), pageRef("[[CLM]] - Naps"));
  assert.equal(pageRef("[[CLM]] - Naps").match(/k-br/g)?.length, 4);
  assert.equal(pageRef("@Lab notebook").match(/k-br/g)?.length, 2);
});

// ------------------------------------------------------------- the logo asset

test("the Discourse Graphs lockup svg still holds a glyph path and a wordmark path", () => {
  const svg = fs.readFileSync(path.join(KIT, "assets/dg-lockup.svg"), "utf8");
  const { glyph, word } = logoPaths(svg);
  assert.ok(glyph.startsWith("M") && glyph.length > 100);
  assert.ok(word.startsWith("M") && word.length > 1000);
  assert.throws(() => logoPaths('<svg><path d="M0 0"/></svg>'), /changed shape/);
});

// ------------------------------------------------ every class the kit draws is styled

const stripComments = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, "");

const samples = (): string[] => {
  const paths = { glyph: "M0 0", word: "M1 1" };
  const blocks = blk("r", "x", blk("", attr("a") + chip("c")), { closed: true }) + collapse("c", "");
  const colors: TermColor[] = ["p", "dim", "hi", "ok", "no", "am", "bl"];
  const nodes = [
    { id: "q1", kind: "question", title: "[[QUE]] - Q", at: { x: 0, y: 0 } },
    { id: "b1", kind: "block", title: "A block", at: { x: 0, y: 100 } },
  ];
  const groups = [
    {
      label: "Supported By",
      rows: [
        { id: "e1", title: "[[EVD]] - E", on: true },
        { id: "e2", title: "[[EVD]] - F", on: false },
      ],
    },
  ];
  const badge = { text: "CLM", bg: "#fff", fg: "#000", border: "#ccc" };
  return [
    windowHtml({ id: "w", cx: 0, cy: 0, w: 400, h: 300, url: "u", role: "qa", dark: true, urlWidth: 40, body: "" }),
    ...ROLE_LIST.map((role) => roleAvatar(role, 30)),
    roamTopBar({ graph: "g" }),
    roamPage({
      ref: "p",
      title: "t",
      titleRef: "tt",
      before: dgContext({ hidden: true }),
      blocks,
      dense: true,
      hidden: true,
    }),
    roamBodyHtml({
      id: "r",
      at: { cx: 0, cy: 0 },
      graph: "g",
      showGraph: true,
      pages: [],
      sidebar: { title: "s", body: "" },
      popups: "",
    }),
    searchMenu({ left: 0, top: 0, sections: [{ heading: "h", items: ["a", { text: "b", hot: true }] }] }),
    scrim({ heavy: true, hidden: true }),
    dialog({ left: "center", top: 0, width: 100, title: "t", tabs: { labels: ["a", "b"], on: 0 }, body: "" }),
    dialogTabs(["a"], 0, true),
    toast({ left: 0, top: 0, text: "x" }),
    ...(["primary", "go", "no", "off"] as const).map((kind) => button("b", kind)),
    shareDialog({ left: 0, top: 0, page: "p", groups: [{ name: "g", on: true }, { name: "h" }] }),
    commandPalette({
      ref: "pal",
      left: "center",
      top: 0,
      query: "q",
      items: [{ text: "a", tag: "DG", on: true }, { text: "b" }],
    }),
    popMenu({ left: 0, top: 0, items: [{ text: "a", key: "A", dot: "#fff", on: true }, { text: "b" }] }),
    nodeSettingsDialog({
      left: 0,
      top: 0,
      nodes: ["Claim", "Evidence"],
      node: "Claim",
      heading: "Results",
      results: ["a"],
    }),
    advancedSearch({
      left: "center",
      top: "center",
      results: [
        { badge, title: "a" },
        { badge, title: "b" },
      ],
      previews: [{ meta: "m", title: "t", blocks: ["b"] }],
    }),
    ghComment({
      author: "a",
      role: "author",
      when: "now",
      badge: "Author",
      body: mdChecklist([{ html: "x", on: true, kids: [{ html: "y" }] }]),
    }),
    ghEvent({ author: "a", role: "author", text: "added", shas: ["abc"], when: "now" }),
    ghLink("l", "ref"),
    pullRequestBody({
      at: { cx: 0, cy: 0 },
      repo: "o/r",
      number: 1,
      title: "t",
      author: "a",
      base: "main",
      head: "h",
      commits: 1,
      conversation: "",
    }),
    ticketBody({
      at: { cx: 0, cy: 0 },
      ticketId: "ENG-1",
      slug: "s",
      title: "t",
      props: [
        { kind: "status", text: "a" },
        { kind: "assignee", text: "b", role: "author" },
        { kind: "label", text: "c" },
        { kind: "plain", text: "d" },
      ],
      sections: [
        { heading: "a", text: "b", style: "fold" },
        { heading: "c", text: "d", style: "muted" },
        { heading: "e", text: "f" },
        { heading: "g", items: ["h"] },
      ],
    }),
    terminalBody([
      { id: "a", html: tprompt("cmd", "c") },
      { id: "b", html: colors.map((c) => tspan(c, c)).join("") + ttyped("t") + tcaret("x") },
    ]),
    playerHtml({
      id: "pl",
      length: 100,
      ticks: true,
      loom: true,
      frames: [
        { id: "a", html: "" },
        { id: "b", html: "" },
      ],
      chapters: [{ id: "c", at: 5, title: "t", frame: "a" }],
    }),
    hudHtml({ stages: [{ key: "a", icon: "ticket" }, { key: "b" }], people: ROLE_LIST, corner: "right" }),
    lockupHtml({ brand: "dg", sub: ["for Roam", "0.23"] }, paths),
    lockupHtml({ brand: "word", word: "a b", sub: ["x"] }, paths),
    canvasHtml({
      box: { x: 0, y: 0, w: 100, h: 100 },
      title: "t",
      nodes,
      arrows: [],
      block: { convert: "Convert", tag: { text: "#t", kind: "evidence" } },
    }),
    contextPanelHtml({ groups, styling: true }),
    drawerHtml(
      groupDrawerEntries([
        { id: "a", title: "A" },
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ]),
      { all: 3, duplicates: 2 },
    ),
  ];
};

// Words used as state or structure inside a k- element, which carry no prefix but must be styled.
const STATE = new Set([
  "on",
  "hot",
  "dense",
  "dark",
  "closed",
  "heavy",
  "primary",
  "go",
  "no",
  "off",
  "right",
  "small",
  "inner",
  "fold",
  "muted",
  "loom",
  "author",
  "reviewer",
  "qa",
  "dim",
  "min",
  "sm",
  "gray",
  "sep",
  "spin",
  "nw",
  "ne",
  "sw",
  "se",
  "f-draw",
  "f-sans",
  "f-serif",
  "f-mono",
  "ic",
]);
// Words a scene finds parts by, which need no rule.
const HOOKS = new Set(["plus", "minus"]);

test("every class the kit's markup uses is defined in kit.css", () => {
  const sheet = stripComments(css);
  const used = new Set<string>();
  for (const markup of samples()) {
    for (const match of markup.matchAll(/class="([^"]*)"/g))
      for (const token of match[1].split(/\s+/).filter(Boolean)) used.add(token);
  }
  assert.ok(used.size > 150, `only ${used.size} classes were collected; the samples are not covering the kit`);
  const defined = (token: string): boolean => new RegExp(`\\.${token.replace(/[-]/g, "\\-")}(?![\\w-])`).test(sheet);
  const missing: string[] = [];
  for (const token of used) {
    if (token.startsWith("k-")) {
      if (!defined(token)) missing.push(`${token} (not in kit.css)`);
    } else if (STATE.has(token)) {
      if (!defined(token)) missing.push(`${token} (a state with no rule)`);
    } else if (!HOOKS.has(token)) {
      missing.push(`${token} (unprefixed: name it k-${token}, or add it to STATE or HOOKS here)`);
    }
  }
  assert.deepEqual(missing, []);
});

test("the stylesheet is whole: balanced braces, no editing marker, every custom property it reads is defined", () => {
  const sheet = stripComments(css);
  assert.equal(sheet.split("{").length, sheet.split("}").length, "unbalanced braces");
  assert.ok(!css.includes("@@END@@"), "an editing marker is still in kit.css");
  const defined = new Set([...sheet.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const local = new Set(["--sz", "--url-w", "--side-w", "--press"]);
  const unknown = [...sheet.matchAll(/var\((--[\w-]+)/g)]
    .map((m) => m[1])
    .filter((name) => !defined.has(name) && !local.has(name));
  assert.deepEqual([...new Set(unknown)], []);
});

test("DG node kinds carry the colors the canvas cards use", () => {
  for (const [name, kind] of Object.entries(DG_KINDS)) {
    assert.match(kind.bg, /^#[0-9a-f]{6}$/, `${name}.bg`);
    assert.match(kind.fg, /^#[0-9a-f]{6}$/, `${name}.fg`);
    assert.match(kind.border, /^#[0-9a-f]{6}$/, `${name}.border`);
  }
  assert.equal(DG_KINDS.claim.tag, "#clm-candidate");
});

test("the index exports every module in the kit", () => {
  const index = fs.readFileSync(path.join(KIT, "index.ts"), "utf8");
  const modules = fs.readdirSync(KIT).filter((file) => file.endsWith(".ts") && file !== "index.ts");
  assert.ok(modules.length >= 18);
  for (const file of modules) {
    assert.ok(index.includes(`"./${file.replace(/\.ts$/, "")}"`), `index.ts does not export ./${file}`);
  }
});

// ------------------------------------------------------------ the new-film scaffold

const listFiles = (dir: string, base = dir): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? listFiles(path.join(dir, entry.name), base)
        : [path.relative(base, path.join(dir, entry.name))],
    )
    .sort();

test("film names are plain slugs and titles read like words", () => {
  for (const good of ["roam-0240-launch", "a", "9-lives", "proof-kits"]) checkName(good);
  for (const bad of ["", "Roam", "has space", "a/b", "../x", ".hidden", "_kit-sample", "-lead", "x.y"])
    assert.throws(() => checkName(bad), /not a film name/, bad);
  assert.equal(titleOf("roam-0240-launch"), "Roam 0240 launch");
  assert.equal(fill("{{name}} / {{title}} / {{name}}", { name: "n", title: "T" }), "n / T / n");
});

test("scaffolding writes the template to films/<name>, fills it in, and refuses to overwrite", async () => {
  // The OS clears this directory; nothing in the tests deletes.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kit-scaffold-"));
  const made = await scaffoldFilm("my-first-film", root);
  const filmDir = path.join(root, "films", "my-first-film");
  assert.deepEqual(
    made.map((file) => path.relative(filmDir, file)).sort(),
    listFiles(TEMPLATE_DIR),
    "every template file is written, and only those",
  );
  for (const file of made) {
    assert.ok(fs.existsSync(file), file);
    assert.ok(file.startsWith(filmDir + path.sep), `${file} is inside the film`);
    assert.ok(!/\{\{/.test(fs.readFileSync(file, "utf8")), `${file} still has a placeholder`);
  }
  const film = fs.readFileSync(path.join(filmDir, "film.ts"), "utf8");
  assert.match(film, /title: "My first film"/);
  assert.match(fs.readFileSync(path.join(filmDir, "data.ts"), "utf8"), /name: "my-first-film-graph"/);
  await assert.rejects(scaffoldFilm("my-first-film", root), /already exists/);
  await assert.rejects(scaffoldFilm("Bad Name", root), /not a film name/);
  assert.ok(!fs.existsSync(path.join(root, "films", "Bad Name")), "a refused name leaves nothing behind");
  const second = await scaffoldFilm("another-one", root);
  assert.equal(second.length, made.length);
});

test("the template holds only the two placeholders, and its narration names beats its scenes define", () => {
  const files = listFiles(TEMPLATE_DIR);
  assert.ok(files.includes("film.ts") && files.includes("narration.json") && files.includes("film.css"));
  assert.ok(files.includes("timeline.ts") && files.includes("data.ts") && files.includes("world.ts"));
  assert.ok(
    files.some((file) => file.startsWith("scenes")),
    "a scenes directory with the feature beat",
  );
  let beats = "";
  for (const file of files) {
    const text = fs.readFileSync(path.join(TEMPLATE_DIR, file), "utf8");
    for (const placeholder of text.match(/\{\{[^}]*\}\}/g) ?? [])
      assert.ok(["{{name}}", "{{title}}"].includes(placeholder), `${file}: ${placeholder}`);
    if (file.startsWith("scenes")) beats += text;
  }
  const defined = new Set([...beats.matchAll(/f\.beat\("([\w-]+)"/g)].map((m) => m[1]));
  const narration = JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, "narration.json"), "utf8")) as {
    lines: Array<{ id: string; beat: string; at: number; text: string }>;
  };
  assert.ok(narration.lines.length >= 4);
  for (const line of narration.lines) {
    assert.ok(
      defined.has(line.beat),
      `line "${line.id}" names beat "${line.beat}"; scenes define ${[...defined].join(", ")}`,
    );
    assert.equal(typeof line.at, "number");
  }
  assert.equal(new Set(narration.lines.map((line) => line.id)).size, narration.lines.length, "line ids are unique");
});

test("the kit sample's narration names beats its film defines", () => {
  const dir = path.resolve(__dirname, "../films/_kit-sample");
  const film = fs.readFileSync(path.join(dir, "film.ts"), "utf8");
  const defined = new Set([...film.matchAll(/(?:f\.beat\(|\bbeat\(f, )"([\w-]+)"/g)].map((m) => m[1]));
  assert.ok(defined.size >= 4, `the sample defines ${[...defined].join(", ")}`);
  const narration = JSON.parse(fs.readFileSync(path.join(dir, "narration.json"), "utf8")) as {
    lines: Array<{ id: string; beat: string }>;
  };
  for (const line of narration.lines) assert.ok(defined.has(line.beat), `${line.id} -> ${line.beat}`);
  assert.ok(film.split("\n").length <= 110, "the sample stays about a hundred lines");
});
