import { esc, html, type Film } from "../../../engine/runtime";
import { blk, buildRoam, floor, inline, roamPage, scrim, type Roam } from "../../../kit";
import { NODES, titleOf } from "../shared/data";
import { buildEndCard, headline, pointerShapes, seriesMark, type EndCard, type Headline } from "../shared/helpers";
import { callout, keyCap, outlineWindow, sourceLink } from "../shared/parts";
import { tipChip } from "../shared/parts-context";
import { citeMenu, zrIcon, zrMenu, zrPanel } from "../shared/parts-zotero";
import { CITE_ROWS, DAY, HEADLINES, ITEM, NOTE, PAPER, TIP } from "./data";
import { POS, ROAM_WIN } from "./timeline";

export type World = {
  f: Film;
  roam: Roam;
  q: Roam["q"];
  side: HTMLElement;
  h: { [K in keyof typeof HEADLINES]: Headline };
  keys: { esc: HTMLElement; shift: HTMLElement };
  tip: HTMLElement;
  end: EndCard;
};

// `Name:: value` as Roam renders it: a bold "Name:" before the value.
const attr = (name: string, value: string): string => `<b class="tl-attr">${esc(name)}:</b> ${value}`;
const link = (text: string): string => `<span class="tl-lk">${esc(text)}</span>`;

// The paper's page as the template-lab SmartBlock "zoteroRoam Roam Depot Source"
// (ihCASk3Y8) writes it: `metadata::` and its fields, then the reading sections.
const paperPage = (): string => {
  const meta: string[] = [
    attr("Title", esc(PAPER.title)),
    attr("Year", esc(PAPER.year)),
    attr("Author(s)", esc(PAPER.authors)),
    attr("Abstract", esc(PAPER.abstract)),
    attr("Type", "Journal Article"),
    attr("Publication", esc(PAPER.publication)),
    attr("URL", link(ITEM.url)),
    attr("Date Added", link(DAY)),
    attr("Zotero Links", `${link("Local Library")}, ${link("Web Library")}`),
    attr("Publication Tags", ""),
    attr("PDF links", link(ITEM.pdf)),
    inline("Item Collection: "),
  ];
  const tick = `<svg class="bpi" width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm3.3-11.1L7 9.2 4.7 6.9 3.3 8.3 7 12l5.7-5.7z"/></svg>`;
  return (
    `<h1 class="sw-title" data-ref="wpap-title"><span data-ref="wpap-title-t">${esc(PAPER.citekey)}</span></h1>` +
    blk(
      "wpap-meta",
      `<b class="tl-attr">metadata:</b>`,
      meta.map((m, i) => blk(`wpap-m${i}`, m)).join("") + blk("", inline("Notes"), blk("", "")),
    ) +
    blk("", inline(" Short Summary"), blk("", `<span class="tl-callout ok">${tick}<b>TL;DR</b></span>`)) +
    blk("", inline("Structured Abstract"), blk("", callout("A plain-language summary built from this paper's discourse-graph nodes.")))
  );
};

export const buildWorld = (f: Film): World => {
  floor(f, { x: POS.roam.cx - ROAM_WIN.w / 2, y: POS.roam.cy - ROAM_WIN.h / 2, w: ROAM_WIN.w, h: ROAM_WIN.h }, 1400);

  // The reading line holds both of its states: what is typed while editing (the
  // query, then the picked title, Roam's closing brackets, the caret) and the
  // grey `@` chip it renders as.
  const cite = `<span class="morph" data-ref="cite"><span class="cite-raw"><span data-ref="ctyped"></span><span class="cpk" data-ref="cpicked">[[${esc(PAPER.citekey)}</span><i class="tl-caret" data-ref="ccaret"></i><span data-ref="cclose">]]</span></span><span class="nd">${sourceLink(PAPER.citekey, "chip")}</span></span>`;
  const daily = roamPage({
    ref: "daily",
    titleRef: "daily-title",
    title: DAY,
    blocks: blk("b-read", `${inline(NOTE.reading)}${cite}`) + NOTE.texture.map((t, i) => blk(`b-t${i}`, inline(t))).join(""),
  });

  const roam = buildRoam(f, {
    id: "roam",
    at: POS.roam,
    size: ROAM_WIN,
    graph: "naps-lab",
    pages: [daily],
    popups: zrMenu("zm") + scrim({ ref: "scrim", heavy: true }) + zrPanel("zp", ITEM) + citeMenu("cm", CITE_ROWS),
  });
  const q = roam.q;

  // ZoteroRoam's icon takes the first tool slot of the top bar (the open book).
  f.q(".k-rm-top .k-rm-ic.small", roam.win).innerHTML = zrIcon("zr-icon");

  const side = html(`<div class="tl-side" data-ref="side">${outlineWindow("wpap", paperPage())}</div>`);
  roam.surface.append(side);

  f.overlay.append(html(`<div class="hl-scrim"></div>`));
  const h = Object.fromEntries(Object.entries(HEADLINES).map(([k, text]) => [k, headline(f, text)])) as World["h"];
  seriesMark(f, 3);
  f.overlay.insertAdjacentHTML("beforeend", keyCap("key-esc", "Esc") + keyCap("key-shift", "Shift") + tipChip(TIP, "tip"));
  const end = buildEndCard(f, 3, glimpse());
  pointerShapes(f);

  return {
    f,
    roam,
    q,
    side,
    h,
    keys: { esc: f.q('[data-ref="key-esc"]', f.overlay), shift: f.q('[data-ref="key-shift"]', f.overlay) },
    tip: f.q('[data-ref="tip"]', f.overlay),
    end,
  };
};

// Episode 4's payoff in miniature: a canvas with the Evidence card, a green
// Supports arrow and the Claim card. A card shows the page's full title (no canvas
// alias is set in template-lab) in getPleasingColors of the type's canvas color
// (EVD fb1313, CLM 48df34; the same pairs as parts-context.ts TAG_COLORS); the
// Supports arrow is tldraw green.
const glimpse = (): string => `<div class="gl4">
  <div class="gl4-card" style="left:26px;top:34px;width:250px;background:#fbd0d0;color:#9c0202">${esc(titleOf(NODES.evd1))}</div>
  <div class="gl4-card" style="left:222px;top:196px;width:220px;background:#d9f6d5;color:#15540d">${esc(titleOf(NODES.clm))}</div>
  <svg class="gl4-ar" width="470" height="290" viewBox="0 0 470 290"><path d="M160 128 C 170 160, 210 180, 262 190" fill="none" stroke="#099268" stroke-width="3"/><path d="M249 181 L262 190 L247 197" fill="none" stroke="#099268" stroke-width="3" stroke-linejoin="round"/></svg>
  <div class="gl4-lbl" style="left:120px;top:150px">Supports</div>
</div>`;
