// Episode 2, "Say what the evidence supports". Sources: Tutorial/Draw relations
// between discourse nodes (Add relation from the discourse context) and the relations
// half of Tutorial/Quickstart guide to creating nodes and relations.
// Facts: tutorial-series/PLAN.md; the parts' code citations are in ../shared/parts-context.ts.
import { NODES } from "../shared/data";

export const EVD = NODES.evd1;
export const CLM = NODES.clm;

// What the claim's search finds in the dialog: its raw page title.
export const CLAIM_TITLE = `[[CLM]] - ${CLM.content}`;
export const QUERY = "Short naps";

// Every headline, in order. At most seven words each (PLAN.md, "Headlines").
export const HEADLINES = {
  promise: "Every claim shows what supports it.",
  before: "Right now nothing says what it supports.",
  open: "Open its context.",
  add: "Add relation: pick Supports.",
  target: "Then the claim it supports.",
  other: "The claim knows it too.",
  payoff: "Not just linked. Supported.",
} as const;

// Template-lab copies start with stored relations off, and "Add relation" only
// renders with them on (utils/storedRelations.ts:9, CreateRelationDialog.tsx:395).
export const TIP = "No Add relation? Turn on stored relations.";
