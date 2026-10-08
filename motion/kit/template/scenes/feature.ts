import { around, clickOn, fadeOut, hudStage, lift, pull, reveal, typeBlock } from "../../../kit";
import { PAGE } from "../data";
import { T } from "../timeline";
import type { World } from "../world";

const PAD = 0.05;

// A feature beat, in four moves: name it, go to the UI, pull focus to the one
// thing that matters, show the result. Copy this file for the next feature and
// change the targets; keep the order.
export const feature = (w: World): void => {
  const { f, roam, hud } = w;
  const q = roam.q;
  const t0 = T.feature;
  const at = (s: number): number => t0 + s;

  f.beat("feature", t0, {
    title: "The feature",
    shows: "What the picture does, in a sentence, for whoever writes the voiceover.",
    talk: ["What the voice can say over this beat."],
  });

  // 1. Name it. No text on screen: the rail lights this stage and the voice says the name.
  f.to(hud.root, { opacity: [0, 1], y: [10, 0] }, { at: at(0.2), dur: 0.6, ease: "arrive" });
  hudStage(f, hud, "feature", at(0.2));

  // 2. Zoom to the UI. lift() keeps the rail's corner clear; hand camera.to the same pad.
  const view = lift(f, around(f, [q("b1"), q("menu")], { l: 80, r: 300, t: 80, b: 30 }), PAD);
  f.camera.to(view, { at: at(0.4), dur: 1.6, pad: PAD });
  reveal(f, q("menu"), at(2.4), 0.45, 10);

  // 3. Focus pull on the one thing to look at: a breath of blur and a 5% dim, then it lets go.
  pull(f, q("menu"), { at: at(3.6), hold: 1.4 });
  f.cue("Focus on the menu", at(3.6));

  // 4. The result. The pointer takes the hot item, the menu goes, the new block types itself in.
  f.cursor.place(q("b2"), { at: at(6.0), offset: { x: 260, y: 90 } });
  f.cursor.show(at(6.1));
  const click = clickOn(f, f.q(".k-pop-item.hot", q("menu")), { at: at(6.6), anchor: { x: 0.3, y: 0.5 } });
  fadeOut(f, q("menu"), click + 0.3);
  const typed = typeBlock(f, q("result"), PAGE.result, { at: click + 0.7, dur: 1.4 });
  f.sound("pass", typed, { gain: -4 });
  f.cue("The result lands", click + 0.7);
  f.cursor.hide(click + 0.6);
};
