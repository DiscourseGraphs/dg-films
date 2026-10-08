// The Discourse Graphs mark and wordmark live in one svg (assets/dg-lockup.svg, a
// copy of apps/website/public/DG-lockup.svg): the first path is the glyph, the
// second the wordmark. Pure, so a test can check the asset still has that shape.

export const logoPaths = (svg: string): { glyph: string; word: string } => {
  const [glyph, word] = [...svg.matchAll(/<path[^>]*?\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!glyph || !word) throw new Error("dg-lockup.svg has changed shape: expected a glyph path and a wordmark path");
  return { glyph, word };
};
