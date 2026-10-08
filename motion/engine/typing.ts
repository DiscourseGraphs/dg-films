// Typing that reads as typing: characters don't arrive at an even rate. A curve
// is the cumulative share of the time spent by each character, with spaces
// quick, punctuation lingering and a seeded wobble, so the same string always
// types the same way and a seek can land anywhere.

const next = (state: number): number => (Math.imul(state, 1664525) + 1013904223) >>> 0;

export const typingCurve = (text: string, seed = 7): number[] => {
  let state = seed >>> 0;
  const weights = [...text].map((char) => {
    state = next(state);
    const wobble = 0.75 + (state / 2 ** 32) * 0.5;
    if (char === " ") return wobble * 0.55;
    if (char === "\n") return wobble * 3;
    if (/[.,;:)\]}]/.test(char)) return wobble * 1.8;
    if (/[A-Z({[]/.test(char)) return wobble * 1.15;
    return wobble;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const curve = [0];
  let running = 0;
  for (const weight of weights) {
    running += weight;
    curve.push(running / total);
  }
  curve[curve.length - 1] = 1;
  return curve;
};

// How many characters are showing at progress p of the typing.
export const charsAt = (curve: number[], p: number): number => {
  const count = curve.length - 1;
  if (p >= 1) return count;
  if (p <= 0) return 0;
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (curve[mid] <= p) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};
