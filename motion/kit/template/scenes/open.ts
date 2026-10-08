import { lockupIn, lockupOut } from "../../../kit";
import { T } from "../timeline";
import type { World } from "../world";

// Beat 1: the brand over a frosted veil, then it lifts off the page.
export const open = (w: World): void => {
  const { f, roam, lockup } = w;

  f.beat("open", T.open, {
    title: "Open",
    shows: "The brand turns in over a frosted Roam page, then the veil lifts.",
    talk: ["Say what this film is about, in one line."],
  });

  f.camera.start(roam.win, { pad: 0.07 });
  lockupIn(f, lockup, 0.4);
  f.cue("The brand lands", 1.8);
  lockupOut(f, lockup, T.feature - 1.2);
};
