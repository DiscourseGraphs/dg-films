import { esc, html, type Film } from "../../../engine/runtime";
import { blk, buildRoam, floor, icon, inline, roamPage, type Roam } from "../../../kit";
import { GRAPH, KINDS } from "../shared/data";
import { buildEndCard, headline, pointerShapes, seriesMark, type EndCard, type Headline } from "../shared/helpers";
import {
  callout,
  contextButton,
  embedBlock,
  keyCap,
  nodeLink,
  nodeMenu,
  nodeTitle,
  outlineWindow,
  rawTitle,
  selectionButton,
  slider,
  sourceLink,
} from "../shared/parts";
import { DAY, HEADLINES, NOTE, TEMPLATE, type Section } from "./data";
import { POS, ROAM_WIN } from "./timeline";

export type World = {
  f: Film;
  roam: Roam;
  q: Roam["q"];
  side: HTMLElement;
  h: { [K in keyof typeof HEADLINES]: Headline };
  keys: { slash: HTMLElement; c: HTMLElement };
  end: EndCard;
};

// A template section: its name, then the info callout, an empty block, and what
// the section ends with (an embed, a slider).
const section = (ref: string, s: Section): string => {
  const name = s.button
    ? `${inline(s.name)} <span class="tl-sbbtn">${icon("plus", 12, 2.2)}${esc(s.button)}</span>`
    : inline(s.name);
  const tail =
    s.tail === "embed"
      ? blk("", "") + blk("", embedBlock())
      : s.tail === "slider"
        ? blk("", slider())
        : blk("", "");
  return blk(ref, name, blk("", callout(s.info)) + tail);
};

// A new node's page in the right sidebar: its title (raw while it is being edited,
// rendered after), the discourse context button, the template. Its counts read
// 0 and 0 right after creation: they load once, before the source block is
// rewritten to reference the page (truth-pass.md row 19, evidence/g140).
const nodeWindow = (ref: string, kind: "EVD" | "CLM", content: string, source?: string): string =>
  outlineWindow(
    ref,
    `<h1 class="sw-title" data-ref="${ref}-title"><span class="sw-raw">${rawTitle(kind, content, source)}<i class="tl-caret on"></i></span><span class="sw-done">${nodeTitle(kind, content, source)}</span></h1>
    <div class="sw-ctx">${contextButton(`${ref}-ctx`, 0, 0)}</div>${TEMPLATE[kind].map((s, i) => section(`${ref}-t${i}`, s)).join("")}`,
  );

export const buildWorld = (f: Film): World => {
  floor(f, { x: POS.roam.cx - ROAM_WIN.w / 2, y: POS.roam.cy - ROAM_WIN.h / 2, w: ROAM_WIN.w, h: ROAM_WIN.h }, 1400);

  // The daily note. The finding and the claim each hold both of their states:
  // the plain text (selected, typed) and the node link it becomes.
  const find = `<span class="morph" data-ref="find"><span class="tl-sel" data-ref="sel">${esc(NOTE.finding)}</span><span class="nd">${nodeLink("EVD", NOTE.finding, NOTE.source, "evdlink")}</span></span>`;
  const claim = `<span class="morph" data-ref="claim"><span class="tl-sel" data-ref="csel"><span data-ref="ctyped">${esc(NOTE.claim)}</span></span><i class="tl-caret" data-ref="ccaret"></i><span class="nd">${nodeLink("CLM", NOTE.claim, undefined, "clmlink")}</span></span>`;
  const daily = roamPage({
    ref: "daily",
    title: DAY,
    blocks:
      blk("b-read", `${inline(NOTE.reading)}${sourceLink(NOTE.source)}`, blk("b-find", find) + blk("b-aside", inline(NOTE.aside))) +
      NOTE.texture.map((t, i) => blk(`b-tex${i}`, inline(t))).join("") +
      blk("b-claim", claim),
  });

  const roam = buildRoam(f, {
    id: "roam",
    at: POS.roam,
    size: ROAM_WIN,
    graph: GRAPH,
    pages: [daily],
    popups: selectionButton("selbtn") + selectionButton("selbtn2") + nodeMenu("menu1") + nodeMenu("menu2"),
  });
  const q = roam.q;

  // The right sidebar: a full-height panel, newest window on top. The claim's
  // window sits in a wrapper whose height opens when the claim is created.
  const side = html(`<div class="tl-side" data-ref="side">
    <div class="sw-wrap" data-ref="clmwrap">${nodeWindow("wclm", "CLM", NOTE.claim)}</div>
    ${nodeWindow("wevd", "EVD", NOTE.finding, NOTE.source)}
  </div>`);
  roam.surface.append(side);

  // Overlays: the band behind the headlines, the headlines, the series mark, the
  // key caps, the end card; and the pointer's I-beam and hand.
  f.overlay.append(html(`<div class="hl-scrim"></div>`));
  const h = Object.fromEntries(Object.entries(HEADLINES).map(([k, text]) => [k, headline(f, text)])) as World["h"];
  seriesMark(f, 1);
  f.overlay.insertAdjacentHTML("beforeend", keyCap("key-slash", "\\") + keyCap("key-c", "C"));
  const end = buildEndCard(f, 1, glimpse());
  pointerShapes(f);

  return {
    f,
    roam,
    q,
    side,
    h,
    keys: { slash: f.q('[data-ref="key-slash"]', f.overlay), c: f.q('[data-ref="key-c"]', f.overlay) },
    end,
  };
};

// Episode 2's payoff in miniature: the claim page, its context card open on
// "(1) Supported By". The card's result row is the raw title (the results table's
// link view), which roam/css colors and prefixes but does not unbracket; the
// selected vertical tab is Blueprint's light blue (DiscourseContext.tsx, truth-pass row 37-38).
const glimpse = (): string => `<div class="gl">
  <div class="gl-title">${nodeTitle("CLM", NOTE.claim)}</div>
  <div class="gl-ctx">${contextButton("gl-ctx", 1, 1)}</div>
  <div class="gl-card">
    <div class="gl-tabs"><div class="gl-tab on">(1) Supported By</div>
      <div class="gl-ctl"><span class="gl-sw"><i></i>Group By Target</span><span class="gl-add">Add relation</span></div></div>
    <div class="gl-row" style="--k:${KINDS.EVD.color}">🌱 ${esc(`[[EVD]] - ${NOTE.finding} - [[${NOTE.source}]]`)}</div>
  </div>
</div>`;
