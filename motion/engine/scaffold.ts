// Starts a new film: copies kit/template/ to films/<name>/ with {{name}} and
// {{title}} filled in. The template is a working film (a Roam page, one feature
// beat, a title and an end), so a new film renders from the first minute and is
// edited from there.
//
//   npx tsx motion/engine/scaffold.ts <name>      (from discourse-graph/apps/roam)

import fs from "node:fs/promises";
import path from "node:path";

export const MOTION_ROOT = path.resolve(__dirname, "..");
export const TEMPLATE_DIR = path.join(MOTION_ROOT, "kit", "template");

const NAME = /^[a-z0-9][a-z0-9-]*$/;

// A film's name is its directory under films/, so it stays a plain slug. A leading
// underscore is reserved for the kit's own samples.
export const checkName = (name: string): void => {
  if (!NAME.test(name)) {
    throw new Error(
      `"${name}" is not a film name: use lowercase letters, digits and hyphens, starting with a letter or digit (like roam-0240-launch)`,
    );
  }
};

// "roam-0240-launch" -> "Roam 0240 launch": the title the film starts with.
export const titleOf = (name: string): string => {
  const words = name.split("-").filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const fill = (text: string, vars: { name: string; title: string }): string =>
  text.replaceAll("{{name}}", vars.name).replaceAll("{{title}}", vars.title);

// Every file under a directory, as paths relative to it, in a stable order.
const walk = async (dir: string, base = dir): Promise<string[]> => {
  const found: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full, base)));
    else found.push(path.relative(base, full));
  }
  return found.sort();
};

// Writes films/<name>/ under `root` (the motion directory by default) from the
// template. Refuses if the film exists. Returns the files it made, as absolute paths.
export const scaffoldFilm = async (name: string, root: string = MOTION_ROOT): Promise<string[]> => {
  checkName(name);
  const filmsDir = path.join(root, "films");
  const dest = path.join(filmsDir, name);
  await fs.mkdir(filmsDir, { recursive: true });
  try {
    await fs.mkdir(dest);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new Error(`films/${name} already exists: pick another name, or edit the film that is there`);
    throw error;
  }
  const vars = { name, title: titleOf(name) };
  const made: string[] = [];
  for (const relative of await walk(TEMPLATE_DIR)) {
    const text = fill(await fs.readFile(path.join(TEMPLATE_DIR, relative), "utf8"), vars);
    const file = path.join(dest, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, text, { flag: "wx" });
    made.push(file);
  }
  return made;
};

if (require.main === module) {
  const name = process.argv[2];
  if (!name) {
    console.error("usage: scaffold.ts <film-name>");
    process.exitCode = 1;
  } else {
    scaffoldFilm(name).then(
      (files) =>
        console.log(`[motion] ${files.length} files in films/${name}:\n${files.map((f) => `  ${f}`).join("\n")}`),
      (error: unknown) => {
        console.error(`[motion] ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
      },
    );
  }
}
