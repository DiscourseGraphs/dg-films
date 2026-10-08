import { endFade, lockupIn } from "../../../kit";
import { T } from "../timeline";
import type { World } from "../world";

// The last beat: the brand again over a frosted veil, then the film fades out
// through a solid sheet.
export const close = (w: World): void => {
  const { f, hud, lockup } = w;
  const t0 = T.close;

  f.beat("close", t0, {
    title: "Close",
    shows: "The brand returns over a frosted veil and the film fades out.",
    talk: ["Say the name once more."],
  });

  f.to(hud.root, { opacity: 0, y: 8 }, { at: t0 - 0.2, dur: 0.4, ease: "outQuad" });
  lockupIn(f, lockup, t0 + 0.2);
  endFade(f, lockup, t0 + 4.4, 0.7);
};
