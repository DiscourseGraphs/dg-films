import { startsOf } from "../../../kit";

// How long each beat runs, in seconds. A beat starts where the one before it
// ends. Run `lint` after retiming.
export const LENGTHS = {
  promise: 4.0,
  before: 3.9,
  search: 6.4,
  import: 4.4,
  cite: 6.0,
  open: 4.6,
  payoff: 5.6,
  end: 5.4,
};

export const T = startsOf(LENGTHS);
export const END = T.end + LENGTHS.end;

// One Roam window: the daily note in the main column, the paper's page in the
// right sidebar (SIDE wide) once it opens.
export const ROAM_WIN = { w: 940, h: 900 };
export const SIDE = 420;
export const POS = { roam: { cx: 0, cy: 0 } };
