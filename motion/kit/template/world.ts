import type { Film } from "../../engine/runtime";
import {
  attr,
  blk,
  buildHud,
  buildLockup,
  buildRoam,
  floor,
  inline,
  roamPage,
  searchMenu,
  type Hud,
  type Lockup,
  type Roam,
} from "../../kit";
import { BRAND, GRAPH, PAGE, SEARCH } from "./data";
import { POS } from "./timeline";

export type World = { f: Film; roam: Roam; hud: Hud; lockup: Lockup };

// Builds every window, popup and overlay once, hidden or in place. Scenes animate
// them and never create markup.
export const buildWorld = (f: Film): World => {
  floor(f, { x: POS.roam.cx - 560, y: POS.roam.cy - 330, w: 1120, h: 660 });

  const blocks = PAGE.blocks
    .map((b, i) => blk(`b${i + 1}`, inline(b.text), blk("", `${attr("source")} ${inline(b.source)}`)))
    .join("");
  const roam = buildRoam(f, {
    id: "roam",
    at: POS.roam,
    graph: GRAPH.name,
    showGraph: true,
    pages: [
      roamPage({ ref: "page", title: PAGE.title, dense: true, blocks: blocks + blk("result", inline(PAGE.result)) }),
    ],
    popups: searchMenu({ ref: "menu", left: 96, top: 238, sections: SEARCH.sections }),
  });

  // The rail: one stage per feature beat. Add { key, icon } entries as the film grows.
  const hud = buildHud(f, { stages: [{ key: "feature", icon: "search" }] });
  const lockup = buildLockup(f, { sub: BRAND.sub });
  return { f, roam, hud, lockup };
};
