import { esc, html, type Film } from "../../../engine/runtime";
import { blk, buildRoam, floor, roamPage, type Roam } from "../../../kit";
import { GRAPH, PAPERS } from "../shared/data";
import { buildEndCard, headline, pointerShapes, seriesMark, type EndCard, type Headline } from "../shared/helpers";
import { contextButton, nodeTitle } from "../shared/parts";
import {
  contextCard,
  createdRelationToast,
  createRelationDialog,
  dialogBackdrop,
  tipChip,
} from "../shared/parts-context";
import { templateBlocks } from "../shared/templates";
import { CLAIM_TITLE, CLM, EVD, HEADLINES, TIP } from "./data";
import { POS, ROAM_WIN } from "./timeline";

export type World = {
  f: Film;
  roam: Roam;
  q: Roam["q"];
  h: { [K in keyof typeof HEADLINES]: Headline };
  tip: HTMLElement;
  end: EndCard;
};

// A node page: its title, the discourse context button under it, the card the
// button opens (one per state, the scene shows one at a time), the template.
const nodePage = (
  ref: string,
  kind: "EVD" | "CLM",
  counts: { score: number; refs: number },
  cards: string[],
): string => {
  const page = roamPage({ ref, titleRef: `${ref}-title`, title: " ", hidden: ref === "pclm", blocks: templateBlocks(kind, ref) });
  const tadd = `<div class="tl-tadd">${contextButton(`${ref}-ctx`, counts.score, counts.refs)}<div class="tl-cardwrap" data-ref="${ref}-cardwrap">${cards
    .map((c, i) => `<div data-ref="${ref}-card${i}">${c}</div>`)
    .join("")}</div></div>`;
  return page.replace("</h1>", `</h1>${tadd}`);
};

export const buildWorld = (f: Film): World => {
  floor(f, { x: POS.roam.cx - ROAM_WIN.w / 2, y: POS.roam.cy - ROAM_WIN.h / 2, w: ROAM_WIN.w, h: ROAM_WIN.h }, 1400);

  // The Evidence page: no relations yet, referenced once (the daily note). Its card
  // has two states: empty, and after the relation.
  const evd = nodePage("pevd", "EVD", { score: 0, refs: 1 }, [
    contextCard({ ref: "ec0", tabs: [] }),
    contextCard({ ref: "ec1", tabs: [{ label: "Supports", rows: [CLM] }] }),
  ]);
  // The Claim page, after: what supports it.
  const clm = nodePage("pclm", "CLM", { score: 1, refs: 1 }, [
    contextCard({ ref: "cc1", tabs: [{ label: "Supported By", rows: [EVD] }] }),
  ]);

  const roam = buildRoam(f, {
    id: "roam",
    at: POS.roam,
    size: ROAM_WIN,
    graph: GRAPH,
    pages: [evd, clm],
    popups:
      dialogBackdrop("scrim") +
      createRelationDialog({
        ref: "rd",
        from: EVD,
        query: "",
        options: [CLAIM_TITLE],
      }) +
      createdRelationToast("toast"),
  });
  const q = roam.q;
  q("pevd-title").innerHTML = nodeTitle("EVD", EVD.content, EVD.source);
  q("pclm-title").innerHTML = nodeTitle("CLM", CLM.content);

  f.overlay.append(html(`<div class="hl-scrim"></div>`));
  const h = Object.fromEntries(Object.entries(HEADLINES).map(([k, text]) => [k, headline(f, text)])) as World["h"];
  seriesMark(f, 2);
  f.overlay.insertAdjacentHTML("beforeend", tipChip(TIP, "tip"));
  const end = buildEndCard(f, 2, glimpse());
  pointerShapes(f);

  return { f, roam, q, h, tip: f.q('[data-ref="tip"]', f.overlay), end };
};

// Episode 3's payoff in miniature: the paper's page as a ZoteroRoam import writes
// it in template-lab (shared/data.ts PAPERS): the plain `@citekey` title and the
// first children of `metadata::`. Roam renders `Name:: value` as a bold "Name:".
const glimpse = (): string => {
  const p = PAPERS.moreau;
  const attr = (name: string, value: string): string => blk("", `<b class="gl-attr">${esc(name)}:</b> ${esc(value)}`);
  return `<div class="gl">
  <div class="gl-title">${esc(p.citekey)}</div>
  ${blk("", `<b class="gl-attr">metadata:</b>`, attr("Title", p.title) + attr("Year", p.year) + attr("Author(s)", p.authors) + attr("Abstract", p.abstract))}
</div>`;
};
