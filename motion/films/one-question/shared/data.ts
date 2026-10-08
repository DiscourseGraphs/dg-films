// The world every episode of "One Question" shares. tutorial-series/PLAN.md has
// the why; the facts behind each value are in tutorial-series/fidelity-opus.md.

export const GRAPH = "naps-lab";
export const SERIES = { name: "One Question", total: 10 };

export type Needs = "extension" | "template" | "zotero";
export type Episode = { n: number; title: string; tutorial: string; needs: Needs };

// Viewing order. `tutorial` is the main source page, named on the end card.
export const EPISODES: Episode[] = [
  { n: 1, title: "Highlight it. It's a node.", tutorial: "Quickstart guide to creating nodes and relations", needs: "extension" },
  { n: 2, title: "Say what the evidence supports", tutorial: "Draw relations between discourse nodes", needs: "extension" },
  { n: 3, title: "Bring your papers in", tutorial: "Import and cite articles", needs: "zotero" },
  { n: 4, title: "Lay out the argument", tutorial: "Using the Canvas", needs: "extension" },
  { n: 5, title: "Give the experiment a home", tutorial: "Create and track experiments", needs: "template" },
  { n: 6, title: "Tag it now. Decide later.", tutorial: "Formalize candidate nodes", needs: "template" },
  { n: 7, title: "Park the idea. Someone claims it.", tutorial: "Claim an Issue", needs: "template" },
  { n: 8, title: "Every update, under its question", tutorial: "1:1 Meetings", needs: "template" },
  { n: 9, title: "Show it. Find the gap.", tutorial: "Sharing your research", needs: "extension" },
  { n: 10, title: "Your lab, your words", tutorial: "Define a new node type", needs: "extension" },
];

export const CTA: Record<Needs, string> = {
  extension: "Free and open source · Roam Depot › Discourse Graph",
  template: "Buttons from the Lab Graph template · discoursegraphs.com",
  zotero: "With Zotero and the ZoteroRoam extension · discoursegraphs.com",
};

export const PEOPLE = { you: "Sam", peer: { name: "Priya", color: "#0f9d8f" } };

// Template-lab's node types. `color` is the link color its roam/css gives the
// type's references (page X8V4gy32s); `dot` is the type's canvas color, which the
// node menu, tag pills and canvas cards use (discourse-graph/nodes/*). `icon` is
// the roam/css ::before content. The node menu's order is MENU_ORDER below.
export type Kind = "EXP" | "EVD" | "CVT" | "RES" | "QUE" | "REQ" | "ISS" | "SRC" | "HYP" | "CLM";
export const KINDS: Record<
  Kind,
  { name: string; color: string; dot: string; icon: string; shortcut: string; tag: string }
> = {
  EXP: { name: "Experiment", color: "#15625D", dot: "#dcdbdb", icon: "🧩EXP - ", shortcut: "", tag: "" },
  EVD: { name: "Evidence", color: "#DB134A", dot: "#fb1313", icon: "🌱 ", shortcut: "E", tag: "evd-candidate" },
  CVT: { name: "Caveat", color: "#9d78d9", dot: "#9d78d9", icon: "", shortcut: "", tag: "cvt-candidate" },
  RES: { name: "Result", color: "#ab3428", dot: "#d10000", icon: "🧱 ", shortcut: "R", tag: "res-candidate" },
  QUE: { name: "Question", color: "#99890e", dot: "#e9cd16", icon: "🔎 ", shortcut: "Q", tag: "que-candidate" },
  REQ: { name: "Request", color: "#2b00ff", dot: "#2b00ff", icon: "", shortcut: "", tag: "" },
  ISS: { name: "Issue", color: "#0254a0", dot: "#2b00ff", icon: "🎙 ", shortcut: "I", tag: "iss-candidate" },
  SRC: { name: "Source", color: "#242424", dot: "#7a7a7a", icon: "", shortcut: "S", tag: "" },
  HYP: { name: "Hypothesis", color: "#3F51B5", dot: "#00eb1b", icon: "💭 ", shortcut: "H", tag: "hyp-candidate" },
  CLM: { name: "Claim", color: "#7DA13E", dot: "#48df34", icon: "🌲 ", shortcut: "C", tag: "clm-candidate" },
};
// Real captures of the template-lab node menu (tutorial-series/evidence/menu-open-g060.png,
// docs candidate-node-creation-menu.png) read Question, Result, Evidence, Hypothesis,
// Source, Issue, Claim: the creation order of the discourse-graph/nodes/* pages, which
// the unsorted query returns. Caveat, Request and Experiment were created later and
// are placed after by the same rule (not yet seen in a capture).
export const MENU_ORDER: Kind[] = ["QUE", "RES", "EVD", "HYP", "SRC", "ISS", "CLM", "CVT", "REQ", "EXP"];

// The nodes of the running story, in the order episodes add them. Titles are the
// template-lab formats: `[[EVD]] - {content} - {Source}`, `[[CLM]] - {content}`.
export const SRC = { lindqvist: "@lindqvist2024naps", moreau: "@moreau2023recall" };
export const NODES = {
  evd1: { kind: "EVD" as const, content: "Nappers recalled 18% more word pairs than rest", source: SRC.lindqvist },
  clm: { kind: "CLM" as const, content: "Short naps improve memory" },
  evd2: { kind: "EVD" as const, content: "No recall gain after a 10-minute nap", source: SRC.moreau },
  que: { kind: "QUE" as const, content: "Do short naps improve memory?" },
  hyp: { kind: "HYP" as const, content: "A 20-minute nap improves 24-hour recall" },
};

// The papers in the lab's Zotero library. An import writes the template-lab
// SmartBlock "zoteroRoam Roam Depot Source" ([[Templates]] block ihCASk3Y8): a
// `metadata::` block whose children are Title, Year, Author(s), Abstract, Type,
// Publication, URL, Date Added, Zotero Links, ...; the page is titled `@citekey`.
// Invented, plausible and unreal.
export const PAPERS = {
  moreau: {
    citekey: SRC.moreau,
    title: "Brief naps and word-pair recall in young adults",
    year: "2023",
    authors: "Clara Moreau, Kenji Ito",
    publication: "Sleep and Memory Reports",
    abstract:
      "We tested whether a 10-minute nap improves word-pair recall one hour after learning. Forty adults learned 60 word pairs, then napped or rested quietly. Recall did not differ between the groups.",
  },
};

export const titleOf =(n: { kind: Kind; content: string; source?: string }): string =>
  `[[${n.kind}]] - ${n.content}${n.source ? ` - [[${n.source}]]` : ""}`;
