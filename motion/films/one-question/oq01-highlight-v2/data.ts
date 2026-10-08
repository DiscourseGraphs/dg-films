// Episode 1, "Highlight it. It's a node." Sources: Tutorial/Quickstart guide to
// creating nodes and relations (highlight, pick a type) and Tutorial/What is a
// Discourse Graph? (highlight, press `\`). Facts: tutorial-series/PLAN.md.
import { NODES, SRC } from "../shared/data";

export const DAY = "October 6th, 2026";

// The daily note. The finding sits under the paper it came from, so the new
// Evidence title takes that paper as its {Source} (resolveNewDiscourseNodeText).
export const NOTE = {
  reading: "Reading ",
  source: SRC.lindqvist,
  finding: NODES.evd1.content,
  aside: "Naps were 20 min, right after learning",
  texture: ["Lab meeting: pilot timeline", "Order more sleep masks"],
  claim: NODES.clm.content,
};

// Every headline, in order. At most seven words each (PLAN.md, "Headlines").
// Revised after three tests: the headline-only read ("paper" and "node" were
// undefined), then the pictures-only and 650 px reads (the opener contradicted
// its frame, "Highlight" read as formatting, "Pick its type." outlived the pick).
export const HEADLINES = {
  promise: "Turn a line of notes into evidence.",
  before: "Right now it's one line of notes.",
  select: "Select the finding.",
  pick: "Pick its type: Evidence.",
  kept: "Its source paper came along.",
  page: "Now it has its own page.",
  claim: "Add a claim: one short idea.",
  keys: "Same menu, by keyboard: \\ then C.",
  payoff: "Evidence and claim. Ready to connect.",
} as const;

// The template-lab templates a new page starts with (discourse-graph/nodes/Evidence
// -YVlXUsDF and /Claim eXm8WyS02, Template tab). Each section is a block with its
// info callout, then an empty block; Figures also gets the embed the "Discourse Node
// Snippets" SmartBlock writes, and the last Evidence section a slider.
export type Section = { name: string; info: string; tail: "empty" | "embed" | "slider"; button?: string };
export const TEMPLATE: { EVD: Section[]; CLM: Section[] } = {
  EVD: [
    { name: "Evidence Description", info: "the evidence statement - a summary of your observation", tail: "empty" },
    { name: "Figures & additional characterization", info: "screenshots & direct quotes, with page numbers", tail: "embed" },
    { name: "Grounding Context", info: "contextualize the observation (method, model system, etc.)", tail: "empty" },
    { name: "Related Claims", info: "to which Claims does this EVD related?", tail: "empty" },
    {
      name: "How central is this evidence to the claim at hand?",
      info: "an estimate of Evidence strength - how strongly does it support/observe the related Claim? (repeat for each Claim)",
      tail: "slider",
    },
  ],
  CLM: [
    { name: "Source of Claim", info: "key papers/people making this claim", tail: "empty" },
    { name: "Related Evidence", info: "supporting & opposing evidence", tail: "empty" },
    { name: "Notes", info: "notes in Daily Log format", tail: "empty", button: "Add Entry" },
  ],
};
