import { around } from "../../../kit";
import { checkHeadlines, endCardIn, gone, offsetIn, pointer, pop, press, rewindCue, say, shot } from "../shared/helpers";
import { NOTE } from "./data";
import { END, T } from "./timeline";
import type { World } from "./world";

// The whole episode. Frame 0 is the payoff (the promise), then the same note
// before anything happened, then the two moves that get there.
export const play = (w: World): void => {
  const { f, q, h } = w;
  const find = q("find");
  const claim = q("claim");
  const sel = q("sel");
  const csel = q("csel");
  const btn = q("selbtn");
  const btn2 = q("selbtn2");
  const menu1 = q("menu1");
  const menu2 = q("menu2");
  const clmBlock = q("b-claim");
  const clmWrap = q("clmwrap");
  const evdTitle = q("wevd-title");
  const clmTitle = q("wclm-title");
  const evdLink = q("evdlink");
  const clmLink = q("clmlink");

  // Popups sit in the Roam surface's units. The selection button goes 50 right of
  // and 40 above the caret at the selection's START (renderTextSelectionPopup.tsx
  // :57-65), which puts it over the line above; the menu drops below it, left-
  // aligned (DiscourseNodeMenu.tsx: Position.BOTTOM_LEFT). The `\` menu opens
  // under the start of the selection (evidence: set-issue-status-type.gif).
  f.job(0, () => {
    const s = offsetIn(sel, w.roam.surface);
    btn.style.left = `${s.x + 50}px`;
    btn.style.top = `${s.y - 40}px`;
    menu1.style.left = `${s.x + 50}px`;
    menu1.style.top = `${s.y - 8}px`;
    const typed = q("ctyped");
    const keep = typed.textContent;
    typed.textContent = NOTE.claim;
    const c = offsetIn(csel, w.roam.surface);
    typed.textContent = keep;
    btn2.style.left = `${c.x + 50}px`;
    btn2.style.top = `${c.y - 40}px`;
    menu2.style.left = `${c.x}px`;
    menu2.style.top = `${c.y + c.h + 4}px`;
  });
  f.set([btn, btn2, menu1, menu2], { opacity: 0 });

  // ------------------------------------------------------------ states
  // Frame 0 shows the end state; the film then plays from the start. A tween
  // with an explicit `from` holds that value from t = 0 when it is a property's
  // first segment, so every property that frame 0 shows differently is pinned
  // with a set at 0 first. Two windows of one class would fight (each toggle
  // sets the class on or off), so the end state uses "done" and the made state "made".
  const tEvd = T.pick + 1.55;
  const tClm = T.keys + 2.9;
  f.cls(find, "done", { from: 0, to: T.before });
  f.cls(find, "made", { from: tEvd, to: END + 1 });
  f.cls(claim, "done", { from: 0, to: T.before });
  f.cls(claim, "made", { from: tClm, to: END + 1 });
  f.set(clmBlock, { opacity: 1 }, 0);
  f.set(clmBlock, { opacity: 0 }, T.before);
  f.set(w.side, { opacity: 1, x: 0 }, 0);
  f.set(w.side, { opacity: 0, x: 60 }, T.before);
  f.set(clmWrap, { "--open": 1 }, 0);
  f.set(clmWrap, { "--open": 0 }, T.before);
  f.set([evdLink, clmLink], { "--flash": 0 }, 0);
  f.cls(evdTitle, "editing", { from: tEvd, to: tEvd + 1.2 });
  f.cls(clmTitle, "editing", { from: tClm, to: END + 1 });

  // ------------------------------------------------------------ shots
  // Framed on the text (`.k-txt` is as wide as its words), never on whole blocks,
  // which span the page.
  const txt = (id: string): HTMLElement => f.q(".k-txt", f.q(".k-row", q(id)));
  const lineShot = shot(f, [txt("b-read"), evdLink, txt("b-aside")], { l: 50, r: 60, t: 40, b: 50 });
  // The menu is ten rows tall; the pick shot keeps its top four (Evidence is the
  // third row) and lets the rest run off the bottom of the frame.
  const pickShot = shot(f, [txt("b-read"), sel, q("menu1-HYP")], { l: 50, r: 250, t: 24, b: 0 });
  const keptShot = shot(f, [evdLink], { l: 60, r: 60, t: 60, b: 70 });
  const pageShot = shot(f, [evdTitle, q("wevd-t0"), q("wevd-t1")], { l: 30, r: 30, t: 50, b: 30 });
  const claimShot = shot(f, [txt("b-tex0"), txt("b-claim")], { l: 50, r: 420, t: 50, b: 70 });
  // The whole menu, so the Claim row and its C are on screen when C is pressed.
  const keysShot = shot(f, [txt("b-claim"), menu2], { l: 50, r: 60, t: 10, b: 6 });
  // The payoff ends where the film began: the note, now holding two nodes.
  const payoffShot = shot(f, [txt("b-read"), evdLink, txt("b-claim")], { l: 50, r: 60, t: 40, b: 60 });

  // ------------------------------------------------------------ open: the promise
  f.beat("open", T.open, {
    title: "The promise",
    shows: "The daily note with two node links and both pages open in the sidebar: where this episode ends.",
  });
  f.camera.start(lineShot);
  say(f, h.promise, T.open + 0.15, T.before - 0.35);

  // ------------------------------------------------------------ before
  f.beat("before", T.before, { title: "Before", shows: "The same note: the finding is one plain line under the paper." });
  rewindCue(f, T.before - 0.3);
  f.to(w.roam.win, { blur: [0, 5], brightness: [1, 1.08] }, { at: T.before - 0.18, dur: 0.18, ease: "inQuad" });
  f.to(w.roam.win, { blur: [5, 0], brightness: [1.08, 1] }, { at: T.before, dur: 0.3, ease: "outQuad" });
  say(f, h.before, T.before + 0.3, T.select - 0.25);

  // ------------------------------------------------------------ select
  f.beat("select", T.select, { title: "Select", shows: "Drag across the finding; the Discourse Graphs button appears." });
  f.camera.to(null, { at: T.select, dur: 1.0, zoomBy: 1.06, mode: "lerp" });
  say(f, h.select, T.select + 0.3, T.pick - 0.6);
  const s0 = T.select + 0.7;
  f.cursor.place(sel, { at: s0 - 0.35, anchor: { x: 0, y: 0.5 }, offset: { x: -40, y: 34 } });
  f.cursor.show(s0 - 0.3);
  f.cursor.to(sel, { at: s0 - 0.25, dur: 0.3, anchor: { x: 0, y: 0.58 } });
  f.cursor.to(sel, { at: s0 + 0.1, dur: 0.8, anchor: { x: 1, y: 0.58 }, bend: 0, ease: "inOutSine" });
  f.to(sel, { "--sel": [0, 1] }, { at: s0 + 0.1, dur: 0.8, ease: "inOutSine" });
  pointer(f, "ibeam", s0 - 0.35, s0 + 1.0);
  f.to(sel, { "--sel": [1, 0] }, { at: tEvd - 0.1, dur: 0.05 });
  pop(f, btn, s0 + 1.05);
  f.cue("The button appears", s0 + 1.05);

  // ------------------------------------------------------------ pick
  f.beat("pick", T.pick, { title: "Pick a type", shows: "The button opens the node menu; Evidence; the line becomes a node link." });
  f.camera.to(pickShot, { at: T.pick - 0.35, dur: 0.9, mode: "lerp" });
  say(f, h.pick, T.pick - 0.2, tEvd + 0.6);
  f.cursor.to(btn, { at: T.pick - 0.1, dur: 0.4 });
  f.cursor.click(T.pick + 0.4);
  f.to(menu1, { opacity: [0, 1], y: [-4, 0] }, { at: T.pick + 0.5, dur: 0.2, ease: "outQuad" });
  // A menu opens with its first row active (DiscourseNodeMenu.tsx: activeIndex 0)
  // and the hover moves it, row by row as the pointer passes.
  f.cls(q("menu1-QUE"), "on", { from: T.pick + 0.5, to: T.pick + 0.95 });
  f.cls(q("menu1-RES"), "on", { from: T.pick + 0.95, to: T.pick + 1.08 });
  const evRow = q("menu1-EVD");
  f.cursor.to(evRow, { at: T.pick + 0.8, dur: 0.4, anchor: { x: 0.3, y: 0.5 } });
  f.cls(evRow, "on", { from: T.pick + 1.08, to: tEvd });
  pointer(f, "hand", T.pick + 0.25, tEvd + 0.6);
  f.cursor.click(T.pick + 1.35);
  gone(f, [menu1, btn], tEvd - 0.1, 0.15);
  f.to(evdLink, { "--flash": [1, 0] }, { at: tEvd, dur: 1.3, ease: "outQuad" });
  f.cue("The line becomes a node", tEvd);
  // The new page opens in the right sidebar, its title still being edited.
  f.to(w.side, { opacity: 1, x: 0 }, { at: tEvd + 0.15, dur: 0.45, ease: "outCubic" });
  f.cursor.hide(tEvd + 0.5);

  // ------------------------------------------------------------ kept: the source came along
  f.beat("kept", T.kept, { title: "It kept its paper", shows: "Close on the new link: its title ends in the paper it was read in." });
  f.camera.to(keptShot, { at: T.kept - 0.4, dur: 1.0, mode: "lerp" });
  say(f, h.kept, T.kept, T.page - 0.3);
  // Both chips in focus: the paper the line was read under, and the same paper
  // now ending the Evidence title.
  const chip = evdLink.querySelector(".tl-src");
  const parentChip = q("b-read").querySelector(".tl-src");
  if (!chip || !parentChip) throw new Error("a source chip is missing");
  f.focus.on(around(f, [parentChip, chip]), { at: T.kept + 0.5, dur: 0.5, pad: { x: 12, y: 8 }, radius: 6, blur: 3, dim: 0.05 });
  f.focus.off({ at: T.page - 0.4, dur: 0.4 });

  // ------------------------------------------------------------ page
  f.beat("page", T.page, { title: "Its own page", shows: "The Evidence page beside the note: title, its context button, the template." });
  f.camera.to(pageShot, { at: T.page - 0.15, dur: 2.1, mode: "lerp", ease: "inOutSine" });
  say(f, h.page, T.page + 2.0, T.claim - 0.3);
  f.cue("The new page", T.page + 2.0);

  // ------------------------------------------------------------ claim
  f.beat("claim", T.claim, { title: "A claim", shows: "A new block at the end of the note: the claim, typed short." });
  f.camera.to(claimShot, { at: T.claim - 0.15, dur: 2.1, mode: "lerp", ease: "inOutSine" });
  const typed = q("ctyped");
  const caret = q("ccaret");
  f.cursor.place(clmBlock, { at: T.claim + 1.4, anchor: { x: 0.2, y: 0.5 }, offset: { x: 30, y: 60 } });
  f.cursor.show(T.claim + 1.45);
  f.cursor.to(clmBlock, { at: T.claim + 1.5, dur: 0.35, anchor: { x: 0, y: 0.5 }, offset: { x: 60, y: 0 } });
  f.cursor.click(T.claim + 1.9);
  pointer(f, "ibeam", T.claim + 1.4, T.claim + 2.2);
  f.to(clmBlock, { opacity: 1 }, { at: T.claim + 1.95, dur: 0.2 });
  f.cls(caret, "on", { from: T.claim + 1.95, to: T.keys + 0.2 });
  f.cursor.hide(T.claim + 2.1);
  f.type(typed, NOTE.claim, { at: T.claim + 2.25, dur: 1.5, caret });
  say(f, h.claim, T.claim + 2.1, T.keys - 0.2);

  // ------------------------------------------------------------ keys
  f.beat("keys", T.keys, { title: "The keyboard way", shows: "Select the claim, press \\, then C: a Claim node." });
  f.camera.to(keysShot, { at: T.keys - 0.3, dur: 0.9, mode: "lerp" });
  f.cursor.place(csel, { at: T.keys + 0.05, anchor: { x: 0, y: 0.5 }, offset: { x: -30, y: 30 } });
  f.cursor.show(T.keys + 0.1);
  f.cursor.to(csel, { at: T.keys + 0.15, dur: 0.25, anchor: { x: 0, y: 0.58 } });
  f.cursor.to(csel, { at: T.keys + 0.45, dur: 0.6, anchor: { x: 1, y: 0.58 }, bend: 0, ease: "inOutSine" });
  f.to(csel, { "--sel": [0, 1] }, { at: T.keys + 0.45, dur: 0.6, ease: "inOutSine" });
  pointer(f, "ibeam", T.keys + 0.05, T.keys + 1.25);
  // The selection shows the button after its 150 ms debounce; `\` removes it
  // (utils/initializeObserversAndListeners.ts:331, 426-459).
  pop(f, btn2, T.keys + 1.2);
  gone(f, btn2, T.keys + 1.35, 0.05);
  f.to(csel, { "--sel": [1, 0] }, { at: tClm - 0.1, dur: 0.05 });
  f.cursor.hide(T.keys + 1.2);
  say(f, h.keys, T.keys + 0.95, T.payoff - 0.3);
  press(f, w.keys.slash, T.keys + 1.35, 1.6);
  f.to(menu2, { opacity: [0, 1], y: [-4, 0] }, { at: T.keys + 1.7, dur: 0.2, ease: "outQuad" });
  press(f, w.keys.c, T.keys + 2.2, 1.2);
  f.cls(q("menu2-QUE"), "on", { from: T.keys + 1.7, to: T.keys + 2.45 });
  f.cls(q("menu2-CLM"), "on", { from: T.keys + 2.45, to: tClm });
  gone(f, menu2, tClm - 0.1, 0.15);
  f.to(clmLink, { "--flash": [1, 0] }, { at: tClm, dur: 1.3, ease: "outQuad" });
  f.cue("The claim becomes a node", tClm);
  f.to(clmWrap, { "--open": 1 }, { at: tClm + 0.15, dur: 0.5, ease: "outCubic" });

  // ------------------------------------------------------------ payoff
  f.beat("payoff", T.payoff, { title: "Two nodes", shows: "The note with both links; both pages open beside it. Clean hold: the poster." });
  f.camera.to(payoffShot, { at: T.payoff - 0.4, dur: 1.3, mode: "lerp" });
  f.cue("Poster", T.payoff + 1.4);
  say(f, h.payoff, T.payoff + 2.1, T.end - 0.25);

  // ------------------------------------------------------------ end card
  f.beat("end", T.end, { title: "Next", shows: "End card: next episode with a glimpse, the series rail, the tutorial, the call to action." });
  endCardIn(f, w.end, T.end);
  checkHeadlines();
};
