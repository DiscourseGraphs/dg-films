// dg-demo-videos has no node_modules of its own. Like the recorder, the motion
// engine borrows tsx, playwright and esbuild from discourse-graph/apps/roam, so
// run it from there (the README says how) or point MOTION_DEPS_ROOT elsewhere.

import { createRequire } from "node:module";
import path from "node:path";

const DEFAULT_ROOT = path.resolve(__dirname, "../../../discourse-graph/apps/roam");

const requireFromDeps = (): NodeRequire =>
  createRequire(path.join(process.env.MOTION_DEPS_ROOT ?? DEFAULT_ROOT, "package.json"));

export const loadPlaywright = (): typeof import("playwright") => requireFromDeps()("playwright");

export const loadEsbuild = (): typeof import("esbuild") => requireFromDeps()("esbuild");
