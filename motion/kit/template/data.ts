// Everything this film says and shows, in one place. Scenes read from here and
// never hold their own text, so what is real and what is staged is one list.
//
// Real: (the facts taken from the product or the ticket: labels, names, counts)
// Staged: (everything invented for the picture: sample pages, results, timings)

export const GRAPH = { name: "{{name}}-graph" };

// The brand line under the lockup, such as ["for Roam", "0.23"].
export const BRAND = { sub: ["for Roam", "0.00"] };

export const PAGE = {
  title: "Naps and memory",
  blocks: [
    { text: "Participants who napped recalled more of the word list.", source: "[[Lab notebook]]" },
    { text: "One 10-minute nap showed no gain.", source: "[[Pilot survey]]" },
  ],
  // The block the feature adds.
  result: "What is the best nap length?",
};

export const SEARCH = {
  sections: [
    { heading: "Question", items: [{ text: "[[QUE]] - Best nap length?", hot: true }] },
    { heading: "Claim", items: ["[[CLM]] - Naps boost recall"] },
  ],
};
