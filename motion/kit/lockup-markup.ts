import { esc } from "./util";

// The title lockup's markup, free of the logo asset so it loads in plain Node.
// lockup.ts draws it into a film.

export type LockupSpec = {
  // "dg": the Discourse Graphs glyph and wordmark. "word": a rounded-square logo and your own word.
  brand?: "dg" | "word";
  // The word for brand "word", typed out letter by letter.
  word?: string;
  // Inner svg markup (48x48 viewBox, stroked white) for the logo square; default a check.
  logo?: string;
  // The line under the brand, such as ["for Roam", "0.23"]: the last part is accented.
  sub?: string[];
};

const CHECK = '<path d="M12 25.5l8.5 8.5L36.5 16"/>';

// The Discourse Graphs glyph and wordmark paths ("dg" brand only; a "word" brand ignores them).
export type LogoPaths = { glyph: string; word: string };

export const lockupHtml = (spec: LockupSpec, paths: LogoPaths): string => {
  const sub = spec.sub?.length
    ? `<div class="k-lock-sub">${spec.sub
        .map(
          (part, i, all) =>
            `<span class="${i === all.length - 1 && all.length > 1 ? "k-lock-ver" : "k-lock-dim"}">${esc(part)}</span>`,
        )
        .join("")}</div>`
    : "";
  if ((spec.brand ?? "dg") === "word") {
    const word = spec.word ?? "";
    return `<div class="k-lock">
      <div class="k-lock-row">
        <div class="k-lock-logo"><svg viewBox="0 0 48 48">${spec.logo ?? CHECK}</svg></div>
        <div class="k-lock-letters">${[...word].map((ch) => (ch === " " ? '<span class="k-sp"></span>' : `<span>${esc(ch)}</span>`)).join("")}</div>
      </div>${sub}
    </div>`;
  }
  return `<div class="k-lock">
    <div class="k-lock-row">
      <svg class="k-lock-glyph" viewBox="0 3 23 25.4"><path fill-rule="evenodd" clip-rule="evenodd" d="${paths.glyph}"/></svg>
      <div class="k-lock-wordwrap"><svg class="k-lock-word" viewBox="31 3 199 22"><path d="${paths.word}"/></svg></div>
    </div>${sub}
  </div>`;
};
