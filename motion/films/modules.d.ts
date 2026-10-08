// esbuild bundles these imports as text (see engine/bundle.ts).
declare module "*.css" {
  const css: string;
  export default css;
}
declare module "*.svg" {
  const svg: string;
  export default svg;
}
