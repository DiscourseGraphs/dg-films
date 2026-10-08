import { startsOf } from "../../../kit";

// How long each beat runs, in seconds. A beat starts where the one before it
// ends. Run `lint` after retiming.
export const LENGTHS = {
  open: 4.0,
  before: 3.9,
  select: 3.8,
  pick: 3.4,
  kept: 3.6,
  page: 5.0,
  claim: 4.9,
  keys: 4.6,
  payoff: 5.6,
  end: 5.4,
};

export const T = startsOf(LENGTHS);
export const END = T.end + LENGTHS.end;

// One Roam window holds the daily note and the right sidebar.
export const ROAM_WIN = { w: 1440, h: 900 };
export const POS = { roam: { cx: 0, cy: 0 } };
