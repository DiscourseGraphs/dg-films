// The few colors the runtime has to interpolate (f.to on backgroundColor and the
// like), which cannot read a CSS variable. They are the same hex values as the
// tokens in kit.css; __tests__/kit.test.ts fails if the two drift apart.

export const COLORS = {
  blue: "#2c62c9",
  green: "#15805a",
  purple: "#7c4dcc",
  red: "#d9412e",
  // A rail node or ring that has not been reached.
  idleFill: "#ffffff",
  idleBorder: "#cfd6e1",
  idleInk: "#9aa4b5",
  // A Done When ring before it fills.
  ringBorder: "#a9b2c1",
  // The color of a connecting line before it turns green.
  link: "#aab3c2",
} as const;

// Token name in kit.css for each color above that has one.
export const TOKENS: Partial<Record<keyof typeof COLORS, string>> = {
  blue: "--blue",
  green: "--green",
  purple: "--purple",
  red: "--red",
};
