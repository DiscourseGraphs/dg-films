import { startsOf } from "../../kit";

// How long each beat runs, in seconds. A beat starts where the one before it ends,
// so changing one length moves every beat after it, and the narration, which is
// anchored to beats, moves with them. Run `lint` after retiming.
export const LENGTHS = {
  open: 6,
  feature: 14,
  close: 6,
};

export const T = startsOf(LENGTHS);

// Where the windows sit in the world (centers, in design units).
export const POS = {
  roam: { cx: 0, cy: 0 },
};
