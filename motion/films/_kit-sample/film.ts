// A whole film from kit parts only: title lockup, a Roam page with blocks, a search
// menu, a dialog over a scrim, and the outro with the end fade. No film.css.
import { addCss, defineFilm, type Film } from "../../engine/runtime";
import { around, clickOn, closeDialog, fadeOut, lift, openDialog, pull, reveal, rowOf } from "../../kit"; // scene moves
import { attr, blk, buildRoam, inline, roamPage, scrim, searchMenu, shareDialog } from "../../kit"; // screens
import { buildHud, buildLockup, endFade, hudStage, lockupIn, lockupOut, startsOf } from "../../kit"; // overlays
import kitCss from "../../kit/kit.css";

addCss(kitCss);

const T = startsOf({ title: 5.2, page: 7, search: 6, share: 6.5, outro: 6 });
const PAD = 0.05;
const beat = (f: Film, id: keyof typeof T, shows: string): void => f.beat(id, T[id], { title: id, shows });
const note = (n: number, text: string, source: string): string =>
  blk(`b${n}`, inline(text), blk("", `${attr("source")} ${inline(source)}`));

defineFilm({ title: "kit sample", width: 1280, height: 720, fps: 60, tail: 0.4 }, (f) => {
  const results = [
    { heading: "Question", items: [{ text: "[[QUE]] - Best nap length?", hot: true }] },
    { heading: "Claim", items: ["[[CLM]] - Naps boost recall"] },
  ];
  const page = roamPage({
    ref: "page",
    title: "Naps and memory",
    dense: true,
    blocks:
      note(1, "Participants who napped recalled more of the word list.", "[[Lab notebook]]") +
      note(2, "One 10-minute nap showed no gain.", "[[Pilot survey]]") +
      blk("b3", inline("What is the best nap length?"), "", { closed: true }),
  });
  const share = shareDialog({
    ref: "dlg",
    left: "center",
    top: 110,
    page: "Naps and memory",
    groups: [{ name: "lab-team", on: true }, { name: "public" }],
  });
  const roam = buildRoam(f, {
    id: "roam",
    at: { cx: 0, cy: 0 },
    graph: "naps-lab",
    showGraph: true,
    pages: [page],
    popups: searchMenu({ ref: "menu", left: 96, top: 238, sections: results }) + scrim({ ref: "scrim" }) + share,
  });
  const hud = buildHud(f, { stages: [{ key: "page" }, { key: "search" }, { key: "share" }] });
  const lock = buildLockup(f, { sub: ["for Roam", "0.23"] });
  const q = roam.q;
  const frame = (...els: HTMLElement[]) => lift(f, around(f, els, { l: 80, r: 300, t: 80, b: 40 }), PAD);

  beat(f, "title", "The mark turns in over a frosted page, then the veil lifts.");
  f.camera.start(roam.win, { pad: 0.07 });
  lockupIn(f, lock, 0.4);
  lockupOut(f, lock, T.page - 1.2);

  beat(f, "page", "The camera settles on the blocks, which arrive one by one; one gets a focus pull.");
  f.to(hud.root, { opacity: [0, 1], y: [10, 0] }, { at: T.page, dur: 0.6, ease: "arrive" });
  hudStage(f, hud, "page", T.page);
  f.camera.to(frame(q("b1"), q("b3")), { at: T.page - 0.4, dur: 1.8, pad: PAD });
  ["b1", "b2", "b3"].forEach((id, i) => reveal(f, rowOf(q(id)), T.page + 0.5 + i * 0.5));
  pull(f, rowOf(q("b1")), { at: T.page + 3.2, hold: 1.2 });

  beat(f, "search", "A search menu opens under the last block; the pointer takes the first result.");
  hudStage(f, hud, "search", T.search);
  f.camera.to(frame(q("b1"), q("menu")), { at: T.search, dur: 1.2, pad: PAD });
  reveal(f, q("menu"), T.search + 0.6, 0.45, 10);
  f.cursor.place(q("b3"), { at: T.search + 0.8, offset: { x: 260, y: 90 } });
  f.cursor.show(T.search + 0.9);
  const pick = clickOn(f, f.q(".k-pop-item.hot", q("menu")), { at: T.search + 1.6, anchor: { x: 0.3, y: 0.5 } });
  fadeOut(f, q("menu"), pick + 0.3);
  f.cursor.hide(pick + 0.5);

  beat(f, "share", "A share dialog opens over a dimmed page; Publish raises a toast.");
  hudStage(f, hud, "share", T.share);
  f.camera.to(lift(f, around(f, roam.win), PAD), { at: T.share - 0.3, dur: 1.6, pad: PAD });
  openDialog(f, q("dlg"), q("scrim"), T.share + 0.3);
  f.cursor.show(T.share + 1.4);
  const publish = clickOn(f, f.q(".k-btn.primary", q("dlg")), { at: T.share + 1.5 });
  closeDialog(f, q("dlg"), q("scrim"), publish + 0.3);
  hudStage(f, hud, "all", publish + 1.2);
  f.cursor.hide(publish + 0.8);

  beat(f, "outro", "The mark returns over a frosted veil and the film fades out.");
  f.to(hud.root, { opacity: 0, y: 8 }, { at: T.outro - 0.2, dur: 0.4, ease: "outQuad" });
  lockupIn(f, lock, T.outro + 0.2);
  endFade(f, lock, T.outro + 4.6, 0.7);
});
