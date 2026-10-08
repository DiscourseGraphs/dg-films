// The template-lab node templates a new page starts with (discourse-graph/nodes/Evidence
// -YVlXUsDF and /Claim eXm8WyS02, Template tab), and the block markup that draws them.
// Each section is a block with its info callout, then an empty block; Figures also
// gets the embed the "Discourse Node Snippets" SmartBlock writes, and the last
// Evidence section a slider. Episode 1 v2 holds its own copy of this.
import { esc } from "../../../engine/runtime";
import { blk, icon, inline } from "../../../kit";
import { callout, embedBlock, slider } from "./parts";

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

// One template section: its name (and a SmartBlock button where the template has
// one), then the info callout, an empty block, and what the section ends with.
export const section = (ref: string, s: Section): string => {
  const name = s.button
    ? `${inline(s.name)} <span class="tl-sbbtn">${icon("plus", 12, 2.2)}${esc(s.button)}</span>`
    : inline(s.name);
  const tail =
    s.tail === "embed" ? blk("", "") + blk("", embedBlock()) : s.tail === "slider" ? blk("", slider()) : blk("", "");
  return blk(ref, name, blk("", callout(s.info)) + tail);
};

export const templateBlocks = (kind: "EVD" | "CLM", ref: string): string =>
  TEMPLATE[kind].map((s, i) => section(`${ref}-t${i}`, s)).join("");
