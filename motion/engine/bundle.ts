// Turns a film directory into one self-contained HTML file: the film's
// film.ts bundled with esbuild (its runtime import included), the fonts inlined
// as data URLs. The file is what the renderer opens, and it is the same file
// whether it is opened for stills, a preview or the final render.

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { loadEsbuild } from "./deps";
import { fontCss } from "./fonts";

export type BuiltFilm = { htmlPath: string; name: string };

export const buildFilm = async (filmDir: string, cacheDir: string): Promise<BuiltFilm> => {
  const esbuild = loadEsbuild();
  const entry = path.join(filmDir, "film.ts");
  let script: string;
  try {
    const result = await esbuild.build({
      entryPoints: [entry],
      absWorkingDir: filmDir,
      bundle: true,
      format: "iife",
      platform: "browser",
      target: "es2022",
      write: false,
      outdir: "bundled",
      loader: { ".css": "text", ".svg": "text" },
      logLevel: "silent",
    });
    script = result.outputFiles[0].text;
  } catch (error) {
    const failure = error as {
      errors?: Array<{ text: string; location?: { file: string; line: number; column: number } | null }>;
    };
    if (failure.errors?.length) {
      throw new Error(
        `Bundling ${entry} failed:\n${failure.errors
          .map(
            (item) =>
              `  ${item.location ? `${item.location.file}:${item.location.line}:${item.location.column} ` : ""}${item.text}`,
          )
          .join("\n")}`,
      );
    }
    throw error;
  }
  const name = path.basename(filmDir);
  const page = [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8">',
    `<title>${name}</title>`,
    `<style>${fontCss()}</style>`,
    "</head><body>",
    `<script>${script.replace(/<\/script/gi, "<\\/script")}</script>`,
    "</body></html>",
  ].join("\n");
  const hash = createHash("sha1").update(page).digest("hex").slice(0, 10);
  await fs.mkdir(cacheDir, { recursive: true });
  const htmlPath = path.join(cacheDir, `${name}-${hash}.html`);
  await fs.writeFile(htmlPath, page);
  return { htmlPath, name };
};
