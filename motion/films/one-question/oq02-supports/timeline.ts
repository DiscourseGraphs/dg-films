import { startsOf } from "../../../kit";

// How long each beat runs, in seconds. A beat starts where the one before it
// ends. Run `lint` after retiming.
export const LENGTHS = {
  promise: 4.0,
  before: 3.9,
  open: 3.8,
  add: 5.2,
  target: 5.8,
  other: 5.0,
  payoff: 5.6,
  end: 5.4,
};

export const T = startsOf(LENGTHS);
export const END = T.end + LENGTHS.end;

// One Roam window: the Evidence page and the Claim page share its main column.
export const ROAM_WIN = { w: 1440, h: 900 };
export const POS = { roam: { cx: 0, cy: 0 } };
