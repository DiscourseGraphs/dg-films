import { charTimes, closeDialog, openDialog } from "../../../kit";
import { checkHeadlines, endCardIn, gone, pointer, press, rewindCue, say, shot } from "../shared/helpers";
import { CITE, QUERY } from "./data";
import { END, SIDE, T } from "./timeline";
import type { World } from "./world";

// The whole episode. Frame 0 is the payoff (the note citing the paper, the paper's
// page beside it), then the note before the paper was in the graph, then the moves:
// search the library, import, cite, open.
export const play = (w: World): void => {
  const { f, q, h } = w;
  const surface = w.roam.surface;
  const icon = q("zr-icon");
  const menu = q("zm");
  const menuSearch = q("zm-search");
  const scrimEl = q("scrim");
  const panel = q("zp");
  const panelQ = q("zp-q");
  const panelCaret = q("zp-caret");
  const panelBody = q("zp-body");
  const goWrap = q("zp-go");
  const importRow = q("zp-import");
  const closeX = q("zp-close");
  const cite = q("cite");
  const typed = q("ctyped");
  const picked = q("cpicked");
  const caret = q("ccaret");
  const closer = q("cclose");
  const list = q("cm");
  const listPick = q("cm-1");
  const chip = q("chip");

  // ------------------------------------------------------------ times
  const tIcon = T.search + 0.9;
  const tMenuRow = T.search + 1.9;
  const tQuery = T.search + 2.7;
  const tItem = T.search + 3.6;
  const tImport = T.import + 0.9;
  const tGo = tImport + 0.2;
  const tClose = T.import + 3.1;
  const tCiteClick = T.cite + 0.45;
  const tCite = T.cite + 0.75;
  const citeDur = 0.9;
  const tList = tCite + citeDur + 0.05;
  const tPick = T.cite + 2.6;
  const tEsc = T.cite + 3.1;
  const tChip = tEsc + 0.4;
  const tShiftClick = T.open + 0.8;
  const tSide = T.open + 0.95;

  // Popups sit in the Roam surface's units: the menu under the icon, left-aligned
  // with it (evidence 1-ngQ_Q1xLiE); the autocomplete under the typed text, a little
  // in from its start (evidence 3-tWF82zJ9Bm). Measured where they show.
  f.job(0, () => {
    const at = (el: Element, t: number): { x: number; y: number; w: number; h: number } => {
      const s = f.rectAt(surface, t);
      const r = f.rectAt(el, t);
      const k = s.w / surface.offsetWidth || 1;
      return { x: (r.x - s.x) / k, y: (r.y - s.y) / k, w: r.w / k, h: r.h / k };
    };
    const i = at(icon, tIcon);
    menu.style.left = `${i.x}px`;
    menu.style.top = `${i.y + i.h + 6}px`;
    const c = at(typed, tList);
    list.style.left = `${c.x + 8}px`;
    list.style.top = `${c.y + c.h + 6}px`;
  });

  // ------------------------------------------------------------ states
  // Frame 0 shows the end state; the film then plays from the start. A tween with
  // an explicit `from` holds that value from t = 0 when it is a property's first
  // segment, so everything frame 0 shows differently is pinned with a set at 0.
  f.cls(cite, "done", { from: 0, to: T.before });
  f.cls(cite, "made", { from: tChip, to: END + 1 });
  f.set(surface, { "--sw": `${SIDE}px` }, 0);
  f.set(surface, { "--sw": "0px" }, T.before);
  f.set(chip, { "--flash": 0 }, 0);
  f.set([menu, list, closer], { opacity: 0 }, 0);
  f.cls(typed, "gone", { from: tPick + 0.05 });
  f.cls(picked, "on", { from: tPick + 0.05 });
  f.cls(caret, "on", { from: tCiteClick, to: tChip });
  f.set(closer, { opacity: 1 }, charTimes(CITE, tCite, citeDur)[1]);

  // ------------------------------------------------------------ shots
  const txt = (id: string): HTMLElement => f.q(".k-txt", f.q(".k-row", q(id)));
  // The camera fits with PAD on each side; shot() makes its headroom with the same.
  const PAD = 0.03;
  const promiseShot = shot(f, [txt("b-read"), q("wpap-title"), txt("wpap-m2")], { l: 30, r: 10, t: 50, b: 40 }, PAD);
  const iconShot = shot(f, [icon, menu], { l: 250, r: 70, t: 24, b: 40 }, PAD);
  const panelShot = shot(f, [f.q(".zr-head", panel), importRow, f.q(".zr-abs", panel)], { l: 10, r: 10, t: 10, b: 12 }, PAD);
  const noteShot = shot(f, [txt("b-read"), list, txt("b-t1")], { l: 40, r: 120, t: 40, b: 40 }, PAD);
  const sideShot = shot(f, [q("wpap-title-t"), q("wpap-m3")], { l: 24, r: 24, t: 16, b: 20 }, PAD);

  // ------------------------------------------------------------ promise
  f.beat("promise", T.promise, {
    title: "The promise",
    shows: "The note cites @moreau2023recall; the paper's page, imported from Zotero, is open beside it.",
  });
  f.camera.start(promiseShot, { pad: PAD });
  say(f, h.promise, T.promise + 0.15, T.before - 0.35);

  // ------------------------------------------------------------ before
  f.beat("before", T.before, { title: "Before", shows: "The same note: Reading, and nothing after it. No paper page." });
  rewindCue(f, T.before - 0.3);
  f.to(w.roam.win, { blur: [0, 5], brightness: [1, 1.08] }, { at: T.before - 0.18, dur: 0.18, ease: "inQuad" });
  f.to(w.roam.win, { blur: [5, 0], brightness: [1.08, 1] }, { at: T.before, dur: 0.3, ease: "outQuad" });
  say(f, h.before, T.before + 0.3, T.search - 0.25);

  // ------------------------------------------------------------ search
  f.beat("search", T.search, { title: "Search the library", shows: "ZoteroRoam's icon, its menu, Search in library; type moreau; the paper." });
  f.camera.to(iconShot, { at: T.search - 0.2, dur: 1.0, mode: "lerp", ease: "inOutSine", pad: PAD });
  say(f, h.search, T.search + 0.3, T.import - 0.5);
  f.cursor.place(icon, { at: T.search + 0.15, offset: { x: -130, y: 150 } });
  f.cursor.show(T.search + 0.2);
  f.cursor.to(icon, { at: T.search + 0.3, dur: 0.5 });
  pointer(f, "hand", T.search + 0.5, tMenuRow + 0.3);
  f.cursor.click(tIcon);
  f.to(menu, { opacity: [0, 1], y: [-4, 0] }, { at: tIcon + 0.05, dur: 0.2, ease: "outQuad" });
  f.cue("The ZoteroRoam menu", tIcon + 0.1);
  f.to(w.tip, { opacity: [0, 1] }, { at: tIcon + 0.3, dur: 0.4, ease: "outQuad" });
  f.to(w.tip, { opacity: 0 }, { at: T.search + 4.4, dur: 0.3, ease: "inQuad" });
  f.cursor.to(menuSearch, { at: T.search + 1.3, dur: 0.4, anchor: { x: 0.35, y: 0.5 } });
  f.cls(menuSearch, "hot", { from: T.search + 1.65, to: tMenuRow + 0.05 });
  f.cursor.click(tMenuRow);
  gone(f, menu, tMenuRow + 0.05, 0.12);
  openDialog(f, panel, scrimEl, tMenuRow + 0.1);
  f.camera.to(panelShot, { at: tMenuRow + 0.15, dur: 1.2, mode: "lerp", ease: "inOutSine", pad: PAD });
  f.cls(panelCaret, "on", { from: tMenuRow + 0.4, to: tClose + 0.1 });
  f.type(panelQ, QUERY, { at: tQuery, dur: 0.7, caret: panelCaret });
  f.to(panelBody, { opacity: [0, 1] }, { at: tItem, dur: 0.3, ease: "outQuad" });
  f.cue("The paper", tItem + 0.2);

  // ------------------------------------------------------------ import
  f.beat("import", T.import, { title: "Import", shows: "Import metadata; Go to Roam page appears: the paper has a page. Close." });
  say(f, h.import, T.import, T.cite - 0.5);
  f.cursor.to(importRow, { at: T.import + 0.2, dur: 0.5, anchor: { x: 0.3, y: 0.5 } });
  pointer(f, "hand", T.import + 0.4, tClose + 0.2);
  f.cls(importRow, "hot", { from: T.import + 0.65, to: tImport + 0.15 });
  f.cursor.click(tImport);
  f.to(goWrap, { "--open": [0, 1] }, { at: tGo, dur: 0.35, ease: "outCubic" });
  f.to(f.q(".zr-act", goWrap), { "--flash": [1, 0] }, { at: tGo + 0.2, dur: 1.5, ease: "outQuad" });
  f.cue("Go to Roam page appears", tGo + 0.3);
  f.cursor.to(closeX, { at: T.import + 2.5, dur: 0.5 });
  f.cursor.click(tClose);
  closeDialog(f, panel, scrimEl, tClose + 0.05);
  f.cursor.hide(tClose + 0.25);
  f.camera.to(noteShot, { at: tClose + 0.2, dur: 1.2, mode: "lerp", ease: "inOutSine", pad: PAD });

  // ------------------------------------------------------------ cite
  f.beat("cite", T.cite, { title: "Cite it", shows: "In the note, [[@mor; the list; @moreau2023recall; Esc: the grey chip." });
  say(f, h.cite, T.cite + 0.2, T.open - 0.4);
  const read = txt("b-read");
  f.cursor.place(read, { at: T.cite + 0.0, anchor: { x: 1, y: 0.5 }, offset: { x: 70, y: 50 } });
  f.cursor.show(T.cite + 0.05);
  f.cursor.to(read, { at: T.cite + 0.1, dur: 0.3, anchor: { x: 1, y: 0.55 }, offset: { x: 4, y: 0 } });
  pointer(f, "ibeam", T.cite + 0.0, T.cite + 1.0);
  f.cursor.click(tCiteClick);
  f.type(typed, CITE, { at: tCite, dur: citeDur, caret });
  f.to(list, { opacity: [0, 1], y: [-4, 0] }, { at: tList, dur: 0.2, ease: "outQuad" });
  f.cue("The list", tList + 0.1);
  f.cursor.to(listPick, { at: T.cite + 1.9, dur: 0.45, anchor: { x: 0.3, y: 0.5 } });
  pointer(f, "hand", T.cite + 1.9, tPick + 0.4);
  f.cls(listPick, "hot", { from: T.cite + 2.3, to: tPick + 0.05 });
  f.cursor.click(tPick);
  gone(f, list, tPick + 0.05, 0.12);
  f.cursor.hide(tPick + 0.4);
  press(f, w.keys.esc, tEsc, 1.2);
  f.to(chip, { "--flash": [1, 0] }, { at: tChip, dur: 1.3, ease: "outQuad" });
  f.cue("Cited", tChip);

  // ------------------------------------------------------------ open
  f.beat("open", T.open, { title: "Open it beside", shows: "Shift-click the chip: the paper's page opens in the sidebar with its metadata." });
  say(f, h.open, T.open + 0.1, T.payoff - 0.4);
  f.cursor.place(chip, { at: T.open + 0.0, offset: { x: 80, y: 70 } });
  f.cursor.show(T.open + 0.05);
  f.cursor.to(chip, { at: T.open + 0.1, dur: 0.45 });
  pointer(f, "hand", T.open + 0.3, T.open + 1.4);
  press(f, w.keys.shift, T.open + 0.35, 1.5);
  f.cursor.click(tShiftClick);
  f.to(surface, { "--sw": `${SIDE}px` }, { at: tSide, dur: 0.5, ease: "outCubic" });
  f.cue("The paper's page", tSide + 0.3);
  f.cursor.hide(T.open + 1.4);
  f.camera.to(sideShot, { at: T.open + 1.15, dur: 1.3, mode: "lerp", ease: "inOutSine", pad: PAD });

  // ------------------------------------------------------------ payoff
  f.beat("payoff", T.payoff, { title: "In your graph", shows: "The note and the paper's page again, where the film began. Clean hold: the poster." });
  f.camera.to(promiseShot, { at: T.payoff - 0.3, dur: 1.3, mode: "lerp", ease: "inOutSine", pad: PAD });
  f.cue("Poster", T.payoff + 1.8);
  say(f, h.payoff, T.payoff + 2.5, T.end - 0.25);

  // ------------------------------------------------------------ end card
  f.beat("end", T.end, { title: "Next", shows: "End card: next episode with a glimpse, the series rail, the tutorial, the call to action." });
  endCardIn(f, w.end, T.end);
  checkHeadlines();
};
