import { closeDialog, crossfade, openDialog, typeInto } from "../../../kit";
import { checkHeadlines, endCardIn, pointer, rewindCue, say, shot } from "../shared/helpers";
import { QUERY } from "./data";
import { END, T } from "./timeline";
import type { World } from "./world";

// The whole episode. Frame 0 is the payoff (the claim with what supports it), then
// the evidence page before anything happened, then the three moves that get there:
// open the context, pick Supports, find the claim.
export const play = (w: World): void => {
  const { f, q, h } = w;
  const pevd = q("pevd");
  const pclm = q("pclm");
  const evdCtx = q("pevd-ctx");
  const clmCtx = q("pclm-ctx");
  const evdWrap = q("pevd-cardwrap");
  const clmWrap = q("pclm-cardwrap");
  const card0 = q("pevd-card0");
  const card1 = q("pevd-card1");
  const addBtn = q("ec0-add");
  const scrim = q("scrim");
  const dlg = q("rd");
  const picker = q("rd-picker");
  const pickText = f.q(".cx-btn-t", picker);
  const pickMenu = q("rd-pickmenu");
  const informs = q("rd-pickmenu-0");
  const supports = q("rd-pickmenu-1");
  const search = q("rd-search");
  const searchQ = q("rd-search-q");
  const searchPh = q("rd-search-ph");
  const searchCaret = q("rd-search-caret");
  const options = q("rd-options");
  const create = q("rd-create");
  const toast = q("toast");
  const clmRow = f.q(".cx-a-t", q("ec1-row-0"));

  // ------------------------------------------------------------ times
  const tOpen = T.open + 0.6;
  const tAdd = T.add + 0.5;
  const tPicker = T.add + 2.0;
  const tHover = T.add + 2.7;
  const tPick = T.add + 3.0;
  const tSearch = T.target + 0.5;
  const tType = T.target + 0.8;
  const tEnable = T.target + 1.5;
  const tCreate = T.target + 2.3;
  const tRow = T.other + 0.6;
  const tClmCtx = T.other + 1.8;

  // ------------------------------------------------------------ states
  // Frame 0 shows the end state; the film then plays from the start. A tween with
  // an explicit `from` holds that value from t = 0 when it is a property's first
  // segment, so everything frame 0 shows differently is pinned with a set at 0.
  f.set(pevd, { opacity: 0 }, 0);
  f.set(pclm, { opacity: 1 }, 0);
  f.set(clmWrap, { "--open": 1 }, 0);
  f.set(pevd, { opacity: 1 }, T.before);
  f.set(pclm, { opacity: 0 }, T.before);
  f.set(clmWrap, { "--open": 0 }, T.before);
  // The evidence card has two states in one place: empty, then with the relation.
  f.cls(card1, "gone", { from: 0, to: tCreate + 0.3 });
  f.cls(card0, "gone", { from: tCreate + 0.3 });
  f.text(q("pevd-ctx-score"), [[tCreate + 0.3, "1"]]);
  // The picker opens on Informs, the first item; the hover moves it to Supports.
  f.cls(informs, "on", { from: 0, to: tHover });
  f.cls(supports, "on", { from: tHover });
  f.cls(create, "off", { from: 0, to: tEnable });
  f.set([pickMenu, options], { opacity: 0 }, 0);

  // ------------------------------------------------------------ shots
  // Framed on text and cards, never on whole blocks. The claim page's title and
  // card are the promise and the payoff: the same framing.
  const claimShot = shot(f, [q("pclm-title"), q("cc1")], { l: 24, r: 24, t: 10, b: 16 });
  const openShot = shot(f, [q("pevd-title"), q("ec0")], { l: 24, r: 24, t: 10, b: 24 });
  const dialogShot = shot(f, [dlg], { l: 14, r: 14, t: 0, b: 0 }, 0.02);
  // The "Created relation" toast sits at the top centre of the window, far from the
  // card, so the result shot leaves it out and frames the card that changed.
  const resultShot = shot(f, [evdCtx, q("ec1")], { l: 24, r: 24, t: 10, b: 16 });

  // ------------------------------------------------------------ promise
  f.beat("promise", T.promise, {
    title: "The promise",
    shows: "The claim page with its context card open: (1) Supported By, and the evidence row.",
  });
  f.camera.start(claimShot);
  say(f, h.promise, T.promise + 0.15, T.before - 0.35);

  // ------------------------------------------------------------ before
  f.beat("before", T.before, { title: "Before", shows: "The evidence page: its context says 0 relations." });
  rewindCue(f, T.before - 0.3);
  f.to(w.roam.win, { blur: [0, 5], brightness: [1, 1.08] }, { at: T.before - 0.18, dur: 0.18, ease: "inQuad" });
  f.to(w.roam.win, { blur: [5, 0], brightness: [1.08, 1] }, { at: T.before, dur: 0.3, ease: "outQuad" });
  say(f, h.before, T.before + 0.3, T.open - 0.25);

  // ------------------------------------------------------------ open
  f.beat("open", T.open, { title: "Open the context", shows: "Click the counts button beside the title: an empty card with Add relation." });
  f.camera.to(openShot, { at: T.open - 0.3, dur: 1.0, mode: "lerp", ease: "inOutSine" });
  say(f, h.open, T.open + 0.3, T.add - 0.5);
  f.cursor.place(evdCtx, { at: T.open - 0.05, anchor: { x: 0.5, y: 0.5 }, offset: { x: 320, y: 150 } });
  f.cursor.show(T.open + 0.0);
  f.cursor.to(evdCtx, { at: T.open + 0.1, dur: 0.5 });
  pointer(f, "hand", T.open + 0.3, T.add + 0.1);
  f.cls(evdCtx, "hot", { from: T.open + 0.55, to: T.add });
  f.cursor.click(tOpen);
  f.to(evdWrap, { "--open": [0, 1] }, { at: tOpen + 0.05, dur: 0.5, ease: "outCubic" });
  f.cue("The context opens", tOpen + 0.1);
  // Template-lab copies start with stored relations off, and Add relation only
  // renders with them on.
  f.to(w.tip, { opacity: [0, 1] }, { at: T.open + 1.3, dur: 0.4, ease: "outQuad" });
  f.to(w.tip, { opacity: 0 }, { at: T.add + 0.1, dur: 0.3, ease: "inQuad" });

  // ------------------------------------------------------------ add
  f.beat("add", T.add, { title: "Add relation", shows: "Add relation opens the dialog; the picker lists Informs, Supports, Opposes; Supports." });
  say(f, h.add, T.add, T.target - 0.5);
  f.cursor.to(addBtn, { at: T.add + 0.0, dur: 0.45 });
  f.cls(addBtn, "hot", { from: T.add + 0.4, to: tAdd + 0.1 });
  f.cursor.click(tAdd);
  openDialog(f, dlg, scrim, tAdd + 0.1);
  f.cue("The dialog", tAdd + 0.3);
  f.camera.to(dialogShot, { at: tAdd + 0.15, dur: 1.3, mode: "lerp", ease: "inOutSine" });
  f.cursor.to(picker, { at: T.add + 0.9, dur: 0.9, anchor: { x: 0.6, y: 0.5 } });
  pointer(f, "hand", T.add + 1.7, tPick + 0.4);
  f.cursor.click(tPicker);
  f.to(pickMenu, { opacity: [0, 1], y: [-4, 0] }, { at: tPicker + 0.05, dur: 0.2, ease: "outQuad" });
  f.cue("The picker", tPicker + 0.2);
  f.cursor.to(supports, { at: tPicker + 0.35, dur: 0.35, anchor: { x: 0.3, y: 0.5 } });
  f.cursor.click(tPick);
  f.text(pickText, [[tPick + 0.05, "Supports"]]);
  f.to(pickMenu, { opacity: 0 }, { at: tPick + 0.05, dur: 0.15, ease: "outQuad" });
  f.cue("Supports picked", tPick + 0.1);

  // ------------------------------------------------------------ target
  f.beat("target", T.target, { title: "Find the claim", shows: "Search finds the claim; Create. The card now reads (1) Supports and the count is 1." });
  say(f, h.target, T.target, T.other - 0.5);
  f.cursor.to(search, { at: T.target - 0.05, dur: 0.5, anchor: { x: 0.25, y: 0.5 } });
  pointer(f, "ibeam", T.target + 0.2, T.target + 1.7);
  f.cursor.click(tSearch);
  f.cls(search, "focus", { from: tSearch, to: tCreate });
  f.cls(searchCaret, "on", { from: tSearch, to: tCreate });
  typeInto(f, { typed: searchQ, placeholder: searchPh }, QUERY, { at: tType, dur: 1.0 });
  f.to(options, { opacity: [0, 1], y: [-4, 0] }, { at: tType + 0.35, dur: 0.2, ease: "outQuad" });
  f.cue("The claim is found", tType + 1.0);
  f.cursor.to(create, { at: T.target + 1.7, dur: 0.5 });
  pointer(f, "hand", T.target + 1.7, tCreate + 0.5);
  f.cursor.click(tCreate);
  closeDialog(f, dlg, scrim, tCreate + 0.1);
  f.to(toast, { opacity: [0, 1], y: [-40, 0] }, { at: tCreate + 0.15, dur: 0.3, ease: "outCubic" });
  f.to(toast, { opacity: 0 }, { at: tCreate + 3.0, dur: 0.4, ease: "inQuad" });
  f.cue("Relation created", tCreate + 0.3);
  f.cursor.hide(tCreate + 0.7);
  f.camera.to(resultShot, { at: tCreate + 0.2, dur: 1.3, mode: "lerp", ease: "inOutSine" });

  // ------------------------------------------------------------ other
  f.beat("other", T.other, { title: "The claim knows it too", shows: "Click the claim in the card; its page opens with (1) Supported By." });
  say(f, h.other, T.other, T.payoff - 0.3);
  f.cursor.place(clmRow, { at: T.other + 0.0, anchor: { x: 0.5, y: 0.5 }, offset: { x: 220, y: 90 } });
  f.cursor.show(T.other + 0.05);
  f.cursor.to(clmRow, { at: T.other + 0.1, dur: 0.45 });
  pointer(f, "hand", T.other + 0.3, T.other + 1.0);
  f.cursor.click(tRow);
  crossfade(f, pevd, pclm, tRow + 0.15, 0.3);
  f.camera.to(claimShot, { at: tRow + 0.2, dur: 1.0, mode: "lerp", ease: "inOutSine" });
  f.cursor.to(clmCtx, { at: T.other + 1.1, dur: 0.6 });
  pointer(f, "hand", T.other + 1.4, T.other + 2.5);
  f.cls(clmCtx, "hot", { from: T.other + 1.7, to: T.other + 2.5 });
  f.cursor.click(tClmCtx);
  f.to(clmWrap, { "--open": 1 }, { at: tClmCtx + 0.05, dur: 0.5, ease: "outCubic" });
  f.cue("The claim's own context", tClmCtx + 0.1);
  f.cursor.hide(tClmCtx + 0.7);

  // ------------------------------------------------------------ payoff
  f.beat("payoff", T.payoff, { title: "Supported", shows: "The claim page again, where the film began. Clean hold: the poster." });
  f.cue("Poster", T.payoff + 1.4);
  say(f, h.payoff, T.payoff + 2.1, T.end - 0.25);

  // ------------------------------------------------------------ end card
  f.beat("end", T.end, { title: "Next", shows: "End card: next episode with a glimpse, the series rail, the tutorial, the call to action." });
  endCardIn(f, w.end, T.end);
  checkHeadlines();
};
