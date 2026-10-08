// Every kit part on one canvas, one window per beat, for looking at stills:
//   npx tsx $M still _kit-sample/gallery --at 0.5,3.5,6.5,9.5,12.5,15.5,18.5,21.5,24.5,29 --sheet
// Not a film to render. If a part looks wrong here, it is wrong in every film.
import { addCss, defineFilm } from "../../../engine/runtime";
import {
  DG_KINDS,
  advancedSearch,
  advancedSearchParts,
  attr,
  blk,
  buildCanvas,
  buildContextPanel,
  buildDrawer,
  buildHud,
  buildLockup,
  buildPullRequest,
  buildRoam,
  buildTerminal,
  buildTicket,
  button,
  chip,
  commandPalette,
  commentWindow,
  dgContext,
  dialog,
  driveTake,
  ghComment,
  ghEvent,
  ghLink,
  inline,
  mdChecklist,
  nodeSettingsDialog,
  playerHtml,
  fitPlayer,
  popMenu,
  roamPage,
  scrim,
  searchMenu,
  shareDialog,
  startsOf,
  tcaret,
  tprompt,
  tspan,
  ttyped,
  toast,
  hudEveryone,
  hudStage,
  hudPerson,
  lockupIn,
  scrollTerm,
  typeInto,
  type CanvasNode,
  type PlayerSpec,
} from "../../../kit";
import kitCss from "../../../kit/kit.css";

addCss(kitCss);

const SLOT = { w: 1600, h: 1000 };
const spot = (i: number): { cx: number; cy: number } => ({ cx: (i % 3) * SLOT.w, cy: Math.floor(i / 3) * SLOT.h });
const T = startsOf({
  page: 3,
  dialog: 3,
  palette: 3,
  search: 3,
  canvas: 3,
  pr: 3,
  ticket: 3,
  term: 3,
  note: 3,
  brand: 3,
});

defineFilm({ title: "kit gallery", width: 1280, height: 720, fps: 30, tail: 0.2 }, (f) => {
  const page = roamPage({
    title: "Naps and memory",
    titleRef: "pg-title",
    before: dgContext(),
    blocks:
      blk(
        "",
        `${chip("claim")}${inline("Naps boost recall")}`,
        blk("", `${attr("source")} [[Lab notebook]]`) + blk("", `${attr("n")} 24`),
      ) +
      blk("", inline("A collapsed block with children"), blk("", inline("hidden")), { closed: true }) +
      blk("", inline("Use `code` inline")),
  });
  buildRoam(f, {
    id: "page",
    at: spot(0),
    graph: "naps-lab",
    showGraph: true,
    pages: [page],
    sidebar: { title: "Reading list", body: blk("", inline("Walker, Why We Sleep"), blk("", inline("chapter 6"))) },
    popups: searchMenu({
      left: 110,
      top: 270,
      sections: [
        {
          heading: "Claim",
          items: [{ text: "[[CLM]] - Naps boost recall", hot: true }, "[[CLM]] - Sleep protects memory"],
        },
        { heading: "Source", items: ["@Lab notebook"] },
      ],
    }),
  });
  const nodesList = ["Claim", "Evidence", "Question", "Source"];
  buildRoam(f, {
    id: "dialog",
    at: spot(1),
    graph: "naps-lab",
    pages: [page.replace("k-rm-page", "k-rm-page dense")],
    popups:
      scrim() +
      nodeSettingsDialog({
        left: 160,
        top: 60,
        nodes: nodesList,
        node: "Claim",
        heading: "Results of the Claim query",
        results: ["[[CLM]] - Naps boost recall", "[[CLM]] - Sleep protects memory"],
      }),
  });
  buildRoam(f, {
    id: "palette",
    at: spot(2),
    graph: "naps-lab",
    pages: [page],
    popups:
      scrim({ heavy: true }) +
      commandPalette({
        left: "center",
        top: 120,
        query: "node search",
        items: [
          { text: "DG: Open Node Search", tag: "DG", on: true },
          { text: "DG: Export Discourse Graph", tag: "DG" },
        ],
      }) +
      dialog({
        left: 80,
        top: 320,
        width: 300,
        title: "A dialog",
        body: `<div class="k-dlg-pad">${button("Cancel")} ${button("Save", "primary")}</div>`,
      }) +
      popMenu({
        left: 450,
        top: 330,
        items: [
          { text: "#clm-candidate", key: "C", dot: DG_KINDS.claim.dot, on: true },
          { text: "#evd-candidate", key: "E", dot: DG_KINDS.evidence.dot },
        ],
      }) +
      shareDialog({
        left: 600,
        top: 330,
        width: 330,
        page: "Naps and memory",
        groups: [{ name: "lab-team", on: true }, { name: "public" }],
      }) +
      toast({ left: 120, top: 520, text: "Published to lab-team" }),
  });
  const badge = (kind: keyof typeof DG_KINDS) => ({
    text: DG_KINDS[kind].code,
    bg: DG_KINDS[kind].bg,
    fg: DG_KINDS[kind].fg,
    border: DG_KINDS[kind].border,
  });
  const searchWin = buildRoam(f, {
    id: "search",
    at: spot(3),
    graph: "naps-lab",
    pages: [page],
    popups:
      scrim({ heavy: true }) +
      advancedSearch({
        ref: "adv",
        left: "center",
        top: "center",
        results: [
          { badge: badge("claim"), title: "[[CLM]] - Naps boost recall" },
          { badge: badge("evidence"), title: "[[EVD]] - Nap group recalled more" },
          { badge: badge("question"), title: "[[QUE]] - Do naps help memory?" },
        ],
        previews: [
          {
            meta: "Created: Sep 9, 2026 · Last modified: Sep 28, 2026 · Author: Demo user",
            title: "[[CLM]] - Naps boost recall",
            blocks: ["Short naps improved recall.", "One 10-minute nap showed no gain."],
          },
        ],
      }),
  });
  typeInto(f, advancedSearchParts(f, searchWin.q("adv")), "afternoon dozing improves", {
    at: T.search + 0.1,
    dur: 0.8,
  });
  const nodes: CanvasNode[] = [
    { id: "q1", kind: "question", title: "[[QUE]] - Do naps help memory?", at: { x: 40, y: 40 } },
    { id: "c1", kind: "claim", title: "[[CLM]] - Naps boost recall", at: { x: 40, y: 220 } },
    { id: "e1", kind: "evidence", title: "[[EVD]] - Nap group recalled more", at: { x: 520, y: 120 } },
    { id: "e2", kind: "evidence", title: "[[EVD]] - 10-minute nap, no gain", at: { x: 520, y: 330 } },
    { id: "b1", kind: "block", title: "Participants who napped recalled more of the word list", at: { x: 40, y: 480 } },
  ];
  const E = buildRoam(f, { id: "canvas", at: spot(4), size: { w: 1440, h: 860 }, graph: "naps-lab", main: "" });
  const canvas = buildCanvas(f, E.main, {
    box: { x: 16, y: 68, w: 1408, h: 696 },
    title: "Canvas/Naps and memory",
    nodes,
    arrows: [
      { id: "a1", from: "e1", to: "c1", relation: "supports" },
      { id: "a2", from: "e2", to: "c1", relation: "opposes" },
    ],
    block: { convert: "Convert to Evidence", tag: { text: "#evd-candidate", kind: "evidence" } },
  });
  canvas.cards.c1.sel.style.opacity = "1";
  const groups = [
    {
      label: "Supported By",
      rows: [
        { id: "e1", title: "[[EVD]] - Nap group recalled more", on: true },
        { id: "e3", title: "[[EVD]] - Gain held for a week", on: false },
      ],
    },
    { label: "Opposed By", rows: [{ id: "e2", title: "[[EVD]] - 10-minute nap, no gain", on: true }] },
  ];
  buildContextPanel(f, canvas.tl, { id: "ctx", groups, styling: true });
  buildDrawer(
    f,
    canvas.tl,
    [...nodes, { id: "e1", title: nodes[2].title }].map((n) => ({ id: n.id, title: n.title })),
  );
  canvas.cv.insertAdjacentHTML(
    "beforeend",
    popMenu({
      left: 70,
      top: 540,
      items: [
        { text: "#clm-candidate", key: "C", dot: DG_KINDS.claim.dot },
        { text: "#evd-candidate", key: "E", dot: DG_KINDS.evidence.dot, on: true },
      ],
    }),
  );

  const take: PlayerSpec = {
    id: "take",
    length: 242,
    ticks: true,
    frames: [
      { id: "p", html: page },
      {
        id: "s",
        html:
          page +
          searchMenu({
            left: 110,
            top: 270,
            sections: [{ heading: "Claim", items: [{ text: "[[CLM]] - Naps boost recall", hot: true }] }],
          }),
      },
    ],
    chapters: [
      { id: "c1", at: 8, title: "A claim matches its title", frame: "p" },
      { id: "c2", at: 60, title: "Search lists the page", frame: "s" },
    ],
  };
  const player = playerHtml(take);
  const PR = buildPullRequest(f, {
    at: spot(5),
    repo: "DiscourseGraphs/discourse-graph",
    number: 1508,
    title: "ENG-0000 A pull request",
    author: "sid597",
    base: "main",
    head: "eng-0000-a-branch",
    commits: 3,
    files: 12,
    checks: 14,
    role: "reviewer",
    conversation:
      ghComment({
        author: "sid597",
        role: "author",
        when: "3 days ago",
        badge: "Author",
        body: `<h2>Reviewer brief</h2><p>${inline("The change is in `getFormat`.")}</p><p class="k-meta">build ac11d04 · ${ghLink("Proof kit", "lnk")}</p>${mdChecklist([{ html: "First bullet", on: true, kids: [{ html: "a case · video 0:08", on: true }] }, { html: "Second bullet" }])}<div style="width:70%;margin-top:12px">${player}</div>`,
      }) +
      ghEvent({
        author: "sid597",
        role: "author",
        text: "added 3 commits",
        shas: ["9e41b7a", "c27d0f3", "ac11d04"],
        when: "just now",
      }),
  });
  fitPlayer(PR.q("take"));
  const video = driveTake(f, PR.q("take"), take);
  f.fn({ at: T.pr, dur: 3, ease: "linear" }, (p) => video(p * take.length));
  buildTicket(f, {
    at: spot(6),
    ticketId: "ENG-0000",
    slug: "a-ticket",
    title: "A ticket with `code` in its title",
    role: "author",
    props: [
      { kind: "status", text: "In Progress" },
      { kind: "assignee", text: "A person", role: "author" },
      { kind: "label", text: "Label" },
      { kind: "plain", text: "A project" },
    ],
    sections: [
      {
        heading: "Problem",
        text: "Two lines of problem text that fold after the second line, however long the sentence runs on and on and on.",
        style: "fold",
      },
      {
        heading: "Done When",
        items: [
          "The first bullet is done.",
          "The second bullet is done, and it is long enough to wrap onto a second line of the card.",
        ],
        ref: "dw",
      },
      { heading: "Out of Scope", text: "Not this.", style: "muted" },
    ],
  });
  const term = buildTerminal(f, {
    at: spot(7),
    title: "kitty - project",
    role: "qa",
    lines: [
      { id: "c", html: tprompt("tool propose --kit demo", "c") },
      { id: "o", html: tspan("dim", "[tool] Asking about the branch: 30 files changed.") },
      { id: "h", html: `\n${tspan("hi", "Areas next to the change:")}` },
      { id: "a", html: `  ${tspan("bl", "area-one")}  A first area` },
      { id: "q", html: `  [a]pprove, [r]eject: ${ttyped("a1", "ok")}` },
      {
        id: "r",
        html: `${tspan("ok", "Approved (3)")}   ${tspan("no", "Rejected (1)")}   ${tspan("am", "amber")}${tcaret("end")}`,
      },
    ],
  });
  scrollTerm(f, term, "h", T.term + 0.2, 0.4);
  commentWindow(f, {
    id: "note",
    at: spot(8),
    url: "github.com/owner/repo/pull/1#issuecomment-1",
    role: "reviewer",
    size: { w: 760, h: 520 },
    comment: { author: "bot", when: "just now", badge: "Bot", body: "<h3>A report comment</h3>" },
  });
  const hud = buildHud(f, {
    stages: [
      { key: "a", icon: "ticket" },
      { key: "b", icon: "kit" },
      { key: "c", icon: "flask" },
      { key: "d", icon: "pr" },
    ],
    people: ["author", "qa", "reviewer"],
  });
  const lock = buildLockup(f, { brand: "word", word: "a word mark", sub: ["for Roam", "0.23"] });
  f.set(hud.root, { opacity: 1 });
  hudStage(f, hud, "c", 0.1);
  hudPerson(f, hud, "qa", 0.1);
  lockupIn(f, lock, T.brand + 0.3);
  hudEveryone(f, hud, T.brand + 0.2);

  const wins = ["page", "dialog", "palette", "search", "canvas", "pr", "ticket", "term", "note"].map((id) =>
    f.q(`[data-win=${id}]`),
  );
  f.camera.start(wins[0], { pad: 0.04 });
  Object.values(T).forEach((at, i) => {
    f.beat(`g${i}`, at, {
      title: `Gallery ${i + 1}`,
      shows: ["page", "dialog", "palette", "search", "canvas", "pr", "ticket", "terminal", "comment", "brand"][i] ?? "",
      talk: [],
    });
    if (i > 0 && wins[i]) f.camera.to(wins[i], { at: at - 0.5, dur: 0.4, mode: "lerp", pad: 0.03, sound: false });
  });
});
