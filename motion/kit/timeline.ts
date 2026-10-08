// Beat starts from a table of lengths. A beat starts where the one before it ends,
// so changing one length moves every beat after it, and the narration, which is
// anchored to beats, moves with them.
//
//   const LENGTHS = { open: 6, feature: 14, close: 5 };
//   export const T = startsOf(LENGTHS);       // { open: 0, feature: 6, close: 20 }

export const startsOf = <K extends string>(lengths: Record<K, number>): Record<K, number> => {
  const starts = {} as Record<K, number>;
  let at = 0;
  for (const key of Object.keys(lengths) as K[]) {
    starts[key] = Math.round(at * 100) / 100;
    at += lengths[key];
  }
  return starts;
};

// The sum of all lengths, which is where the last beat ends if it has length 0.
export const totalOf = (lengths: Record<string, number>): number =>
  Math.round(Object.values(lengths).reduce((sum, n) => sum + n, 0) * 100) / 100;
