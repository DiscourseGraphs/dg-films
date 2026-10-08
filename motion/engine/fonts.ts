// The fonts every film can use, embedded into the page as data URLs so a render
// never depends on the network or on what's installed. Inter for interface
// text, JetBrains Mono for code; both variable, both SIL OFL (assets/fonts).

import fs from "node:fs";
import path from "node:path";

const FONT_DIR = path.resolve(__dirname, "../assets/fonts");

const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

const FACES = [
  { family: "Inter", file: "inter-latin.woff2", range: LATIN, weight: "100 900" },
  { family: "Inter", file: "inter-latin-ext.woff2", range: LATIN_EXT, weight: "100 900" },
  { family: "JetBrains Mono", file: "jetbrains-mono-latin.woff2", range: LATIN, weight: "100 800" },
  { family: "JetBrains Mono", file: "jetbrains-mono-latin-ext.woff2", range: LATIN_EXT, weight: "100 800" },
];

export const fontCss = (): string =>
  FACES.map((face) => {
    const data = fs.readFileSync(path.join(FONT_DIR, face.file)).toString("base64");
    return `@font-face { font-family: "${face.family}"; font-style: normal; font-weight: ${face.weight}; font-display: block; src: url(data:font/woff2;base64,${data}) format("woff2"); unicode-range: ${face.range}; }`;
  }).join("\n");
