# One Question: the template-lab tutorial series

The build plan and every decision so far. A new session can pick up from this file.

## Where this came from

- sid's brief (2026-10-08): "make top 10 most useful videos out of these tutorials … 80/20 value each video is a catnip to a interested user, after watching each video they should be looking for next video, we want them hooked, growth hacking". Production: the motion engine, **no audio**, headlines on screen, very high quality.
- Sources: `digest.md` (all 39 `Tutorial/` pages of the template-lab graph), `draft-top10.md` (Claude v1), `strategy-fable-blind.md` (Fable, max effort, never saw the draft), `critique-fable.md` (Fable, max, critique of the draft), `fidelity-opus.md` (Opus, max: each episode against its tutorials, the extension code and the template-lab graph).
- The decision below takes the blind strategy's frame ("One Question": one research question through one lab graph, one move per episode), the critique's ordering rule (moves that work on the extension alone come first), and the fidelity report's facts. Where the critique and the fidelity report disagreed, the code was read directly (see "Facts").

## Team input (Karola, team meeting, shared by sid 2026-10-08)

- The videos are onboarding for people the team already reaches: posted on Slack and in the newsletter, with a repository everything links back to.
- "The tutorial does not have to be that super fully featured … hit a few core things", and route people to the website for the rest.
- Her top demo topics: "how do you make a node? How do you make a relation? How do you get stuff from your file system into your graph?"
- Workflows come from the template graph's tutorials page and its welcome page (that is how `digest.md` Part A was built).
- The template graph is large; a subset is enough for a minimal demo.

Consequence: episodes 1 to 3 are the core onboarding set and ship first: make a node (1), make a relation (2), get your papers in (3, replacing "The paper that disagrees"; the getting-in flow the template teaches is Zotero → ZoteroRoam, welcome-page item 7). Episodes 4 to 10 are follow-ons.

## The series

Ten silent films, 45 to 60 s each (hard cap 75 s), that follow one question, "Do short naps improve memory?", through one sleep lab's graph, `naps-lab`, a copy of the Lab Graph template. The explainer `dg-explainer-v2` ("One sentence") is episode 0. Series mark: `ONE QUESTION · n/10`.

| # | Title | Source tutorials | The one move | Payoff (also the poster) | Needs |
|---|---|---|---|---|---|
| 1 | Highlight it. It's a node. | Quickstart guide to creating nodes and relations; What is a Discourse Graph? | Select a finding under `Reading [[@lindqvist2024naps]]`, selection button, Evidence. Then `\` then C for a short claim | Two node links in the note; the Evidence title ends in its paper; its page opens beside | extension |
| 2 | Say what it supports | Draw relations between discourse nodes; Quickstart (relations half) | The Evidence page's context button, Add relation, Supports, find the claim, Create | The claim page: "(1) Supported By" with the paper named | extension, stored relations on |
| 3 | The paper that disagrees | Add notes for an article; Import and cite articles; Create evidence pages | On the paper's page tag a note `#evd-candidate`, hover, Create Evidence (the paper fills in), then Opposes | The claim: "(1) Supported By", "(1) Opposed By" | extension; the paper page is the template's |
| 4 | Lay out the argument | Using the Canvas | Canvas, place the claim, its context brings in what supports and opposes it, drag one new arrow | The claim held up by green, pulled by red; one question with nothing under it | extension |
| 5 | Give the experiment a home | Create and track experiments; Create and track projects | Create an Experiment, the form, the page | An experiment page aimed at the hypothesis, its Results waiting | Lab Graph template |
| 6 | Tag it now. Decide later. | Experimental daily log; Formalize candidate nodes | A log line tagged `#res-candidate` (a maybe); two weeks later hover, Create Result, the experiment fills in; drop the plot on its page | The Result card on the canvas showing the plot | template + extension |
| 7 | Park the idea. Someone claims it. | Create an Issue to save an experiment for later; Claim an Issue | Select an idea, `\` then I; Priya clicks Claim This Issue | The Issue page renamed into her experiment; its history kept | template |
| 8 | Every update, under its question | 1:1 Meetings | A 1:1 entry, Add Update for Question or Hypothesis, `@` picks the question | The question page lists every update from every meeting | template + extension |
| 9 | Show it. Find the gap. | Sharing your research; Draft a manuscript | Walk the canvas, frame the hypothesis and its results as Figure 1, Export as PNG | The figure, and the hypothesis that one result does not support | extension |
| 10 | Your lab, your words | Define a new node type; Define a new relation; Personalize your discourse graph | Settings, Grammar, Nodes, Add node "Method"; Relations, "Uses" | A Method card and a Uses arrow on the canvas | extension |

The serial pull: episode 4's map leaves "does it last 24 hours?" open; 5 builds the experiment, 6 gets the 1-hour result, 7 hands the 24-hour question to Priya, 8 files her update under the question, 9 shows the hypothesis only half supported. Every episode still stands alone (rules below).

Left out, and where they go: Start Here and ZoteroRoam setup (setup, docs), Roam quickstart (the explainer covers Roam), The Discourse Graph workflow (the series itself is that order), Group Meetings (template-lab has no "Create Today's Meeting" button), Journal Club (Zotero plus a group), Left Sidebar, Customize a Template, Enabling Beta Features, Query Builder, the stubs and empty pages. First alternates: the discourse context overlay, Query Builder, Left Sidebar, Journal Club (a lab bonus pack).

## Facts that shape the films

Read in `apps/roam/src` on 2026-10-08 (main `065cab5e`, release 0.23.0) and in the template-lab graph. Full evidence: `fidelity-opus.md`.

| Fact | Consequence |
|---|---|
| `\` opens the node menu by default (global trigger `\`); the text-selection popup is on by default | Episode 1 shows both. The explainer's "trigger defaults to empty" was the personal override only |
| With a selection the menu makes a node; with nothing selected it lists candidate tags. Letters match case-insensitively | Never show the tutorial's "capital I makes an Issue, lowercase i a candidate" |
| Stored relations default **off** for graphs whose DG config page predates 2026-03-01 (`utils/storedRelations.ts:9`), which includes template-lab; **Add relation** renders only when they are on (`CreateRelationDialog.tsx:395`) | The world has them on. Episode 2 carries a one-line chip: "No Add relation? Turn on stored relations." This is also Draw relations' own first step. Flag to the team |
| The discourse context is the counts button beside a node page's title (relations, references), which opens a card: vertical tabs "(n) Label", Group By Target, **Add relation** (`DiscourseContextOverlay.tsx:289`) | Draw that. `dg-explainer-v2/parts.ts` draws the pre-February-2026 "Discourse context" fold-out header |
| The overlay on links inside blocks defaults off | No episode depends on it |
| Hovering a candidate tag shows **Create <Type>**; the dialog has Content, Node Type, and the format's referenced node (Source, or the experiment), filled in and locked from the page or a parent block's reference | Episodes 3 and 6 |
| Confirm turns the tagged block into the node link and nests its old text under it; **children and images do not move** (`ModifyNodeDialog.tsx:429`). Exception: template-lab's Evidence template embeds the note's children through a SmartBlock | Episode 3 may show the note's children on the new Evidence page; episode 6 must not, and shows the plot dropped onto the Result page |
| The canvas key image is the first image on the node's own page; template-lab has it on for Result, Hypothesis, Claim and Request, off for Evidence | Plots on cards only for those types |
| Query blocks do not update live; they have Refresh Results | Show the refresh |
| Template-lab labels: Create an Experiment, Claim This Issue, Create Issue, Add node, Destination, Create Today's Entry, Add Update for Question or Hypothesis | Use these, not the tutorials' older words |
| Claim This Issue renames the Issue page into the experiment (`@type/title`); references follow | Episode 7's hero beat |
| Template-lab `roam/css` hides `[[ ]]` and gives node links an emoji and color (🌲 CLM, 🌱 EVD, 🔎 QUE, 🧱 RES, 💭 HYP, 🎙 ISS, 🧩 EXP) | The series is drawn in the template-lab skin |
| Template-lab shortcut letters C E H I Q R S, plus p and b for the built-ins; duplicates are refused | Episode 10's new type is "Method" (M), not "Protocol" (P clashes with Page) |

Still open, needs a screenshot from a real template-lab copy (never a guess): the node menu's order, how `roam/css` restyles the create-node, create-relation and SmartBlocks dialogs, whether a restored copy keeps the 2025 config-page date, the block order after Claim This Issue.

## Rules for every episode

**Shape.** Cold open on a problem state, real screen, one headline, no logo (0 to 3 s). One imperative headline naming the move. At most four steps, each shown as trigger, response, result, all in frame. A payoff frame that visibly differs from the cold open, held clean for 1.5 s (the poster). A 5 s end card: "Next: <title>" over the next cold open, the ten-dot rail, "Tutorial/<name>", the call to action (extension episodes: "Free and open source · Roam Depot › Discourse Graphs"; template episodes: "Get the Lab Graph · <short link>").

**Standing alone.** The cold open never refers back. The series mark sits small top left throughout. A one-headline gloss the first time a word of the dialect appears ("A candidate. A maybe."). The same home frame (the claim and its cards) appears in every episode. A template-only button gets a "Lab Graph template" chip the first time it shows.

**Headlines.** At most 7 words (9 is a hard cap), at most 10 per film, one idea, plain words for the first ten seconds. A headline lands 0.4 s before the action it names and holds until 1.2 s after its result, and at least 2.4 s plus 0.3 s per word beyond five. Never two at once, never during a fast camera move, never one that describes what is already visible. One band, one size, readable at a 650 px embed (the explainer's captions: about 42/30 px in the 1280 frame).

**Pacing.** One action every 3 to 4 s. Cursor travel under 1 s. A 1.2 s hold after every click's result. Camera moves under 1.5 s and at least 0.4 s apart (`lint`). At most about 40 characters typed on screen.

**Truth.** Every label, menu item, default and flow matches the current extension and the template-lab graph. Where a tutorial and the code disagree, the code wins and the discrepancy goes on the fix list for the tutorial authors. Nothing deprecated or in flux (overlay-dependent flows, migration dialogs, cloud canvas, advanced node search). Invented content is plausible and unreal: no author name is a real paper.

## The world

`naps-lab`, a copy of the Lab Graph template, stored relations on. You (the author's cursor, "Sam") and Priya (teal cursor, from episode 7). Dates in October and November 2026.

| Node | First seen | Text |
|---|---|---|
| Source | 1 | `@lindqvist2024naps` |
| Evidence 1 | 1 | `EVD - Nappers recalled 18% more word pairs than rest - @lindqvist2024naps` |
| Claim | 1 | `CLM - Short naps improve memory` |
| Source 2 | 3 | `@moreau2023recall` |
| Evidence 2 | 3 | `EVD - No recall gain after a 10-minute nap - @moreau2023recall` (Opposes the claim) |
| Question | 4 | `QUE - Do short naps improve memory?` |
| Hypothesis | 5 | `HYP - A 20-minute nap improves 24-hour recall` |
| Experiment 1 | 5 | `@sleep study/20-min nap vs quiet rest` (Model organism: Homo sapiens; the lab's type list includes "sleep study") |
| Result 1 | 6 | `RES - 20-min nappers recalled 23% more word pairs at 1 h - @sleep study/20-min nap vs quiet rest` |
| Issue | 7 | `ISS - Does the recall gain survive 24 hours?`, claimed by Priya into `@sleep study/24-h recall after a 20-min nap` |
| Result 2 | 8 | `RES - The 1 h gain shrank to 4% at 24 h - …` (Priya's update) |
| Canvas | 4 | `Canvas/Short naps` |
| New type and relation | 10 | `MET - 20-min nap, dim room, 2 pm`; Experiment Uses Method / Method Used By Experiment |

## Is it getting through (run per episode, episode 1 first)

Fresh agents only, never the builder; images and lists only, no plan. Fix, then re-run only what failed.

1. **Script check (before building).** A Fable agent gets the headline list alone: "Write the steps a user takes and what they get." Pass: names the move, most steps in order, the payoff.
2. **Sheets.** `still --beats 2 --cues --sheet`, plus the same sheet with headlines hidden, plus every must-read still downscaled to 650 px.
3. **Pictures only** (headlines hidden): "What did the person do, what changed, what is this teaching?" Pass: 2 of 3 agents name the move and the change.
4. **With headlines**: the same, plus "Which frame would you screenshot?" and "What should the next video be about?" Pass: all name the move; the screenshot pick matches the poster; the guess matches the tease.
5. **Three seconds**: the cold open at 650 px and as a thumbnail: "What problem, what app, would you keep watching?"
6. **Legibility**: transcribe every headline and every label a headline points at, from the 650 px stills. Pass: 100% of headlines.
7. **Truth pass** (Opus): every UI element on the sheets against `apps/roam/src` and the template-lab graph.
8. **Motion**: `lint` clean; the 720p preview, frames at 2 fps on one sheet, the pictures-only question again. Then the preview goes to sid.

## Build

- Folder: `motion/films/one-question/` with `shared/` (the template-lab skin, parts, captions, end card, world data) and one folder per episode (`01-highlight/` …), each a film (`npx tsx $M still one-question/01-highlight`).
- `shared/` starts from copies of `dg-explainer-v2/parts.ts` and `scenes/helpers.ts`, never imports from that film (it may be refactored by the engine-upgrade work). It never edits `engine/` or `kit/`.
- Order: shared skin and episode 1, the full test protocol, a preview to sid; then 2, 3, 4 (extension); then 5, 6, 7 (template parts: SmartBlock button and form, properties box, query tables); then 8, 9, 10.
- Render: `render one-question/<ep> --crf 8 --preset slow --only 1080p` (sid's call for the explainer: "1080p, it's high quality enough"), plus a share copy.

## Distribution (proposal, sid decides)

A YouTube playlist as the binge surface (16:9, end screens need the 5 s end card), Loom links for Slack and email, an embed at the top of each matching docs guide, and an embed on each matching `Tutorial/` page in the template graph. A 15 to 20 s teaser cut from the ten poster frames for social. Title string: `Discourse Graphs · n/10 · <title>`.

## For the team (found while checking)

- Template-lab copies start with stored relations off, so "Add relation" is missing until each user turns it on.
- Outdated tutorial wording: "+" (now Add relation), "make Issue" (Create Issue), "New Experiment" (Create an Experiment), "Claim Issue" (Claim This Issue), "Add Node" (Add node), relation "target" (Destination), the discourse context "at the bottom of the page" (now beside the title), "Snippets" (now Figures & additional characterization), the 1:1 dropdown and the Meetings section on home pages (neither exists), "Create Today's Meeting" (no such button), and Formalize's "child blocks will be included" (true only for Evidence).
- `dg-explainer-v2` draws the pre-February-2026 discourse context header and bracketed links. It was not changed.
