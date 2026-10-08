// Episode 3, "Bring your papers in". Source: Tutorial/Import and cite articles
// (Q8piUCWbV): ZoteroRoam's Search in library, Import metadata, then `[[@` to cite.
// Every ZoteroRoam surface is drawn from tutorial-series/evidence/zotero-Q8piUCWbV/.
import { PAPERS } from "../shared/data";
import type { ZrItem } from "../shared/parts-zotero";

export const DAY = "October 9th, 2026";
export const PAPER = PAPERS.moreau;

export const NOTE = {
  reading: "Reading ",
  texture: ["Pilot: 12 sign-ups so far", "Book the sleep room for Friday"],
};

// What is typed: the library search, then the citation (Roam closes the brackets).
export const QUERY = "moreau";
export const CITE = "[[@mor";
// Roam's autocomplete after `[[@mor`: the typed text first, then the page.
export const CITE_ROWS = ["@mor", PAPER.citekey];

// The panel's view of the paper. Two authors read "A & B (year)"; the PDF is named
// by Zotero's default rule, "{firstCreator} - {year} - {title}".
export const ITEM: ZrItem = {
  title: PAPER.title,
  byline: "Moreau & Ito (2023)",
  publication: PAPER.publication,
  url: "https://doi.org/10.5555/smr.2023.0142",
  abstract: PAPER.abstract,
  pdf: `Moreau and Ito - 2023 - ${PAPER.title}.pdf`,
};

// Every headline, in order. At most seven words each (PLAN.md, "Headlines").
export const HEADLINES = {
  promise: "Your Zotero papers, cited in your notes.",
  before: "Right now it's only in Zotero.",
  search: "Search your Zotero library.",
  import: "Import metadata: now it has a page.",
  cite: "Cite it: type [[@",
  open: "Shift-click: its page opens beside.",
  payoff: "Imported once. Cite it anywhere.",
} as const;

// ZoteroRoam is a separate Roam Depot extension, set up once (Tutorial/ZoteroRoam setup).
export const TIP = "Uses the ZoteroRoam extension. Set it up once.";
