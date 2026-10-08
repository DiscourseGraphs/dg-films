# Roam film kit

The screens and helpers every Roam product film rebuilds, written once. A film imports the kit's CSS as text, builds
windows from the kit's parts, and spends its time on the choreography.

```ts
import { addCss, defineFilm } from "../../engine/runtime";
import kitCss from "../../kit/kit.css";
import css from "./film.css";
import { buildRoam, windowShell } from "../../kit";

addCss(kitCss); // tokens + every kit class
addCss(css); // the film's own look, after the kit so it can override a token
```

**New film:** from `discourse-graph/apps/roam`, `npx tsx ../../../dg-films/motion/engine/scaffold.ts <name>`
writes `films/<name>/` from `kit/template/`: a working three-beat film (title, one feature beat, close) that you edit.
The CLI's `new <name>` is the same call (`scaffoldFilm(name)` in `engine/scaffold.ts`).

**Worked example:** `films/_kit-sample`, 87 lines of `film.ts` plus an 11-line `narration.json`, kit parts only, no `film.css`.
**Every part on one canvas, for looking at:** `films/_kit-sample/gallery`
(`npx tsx $M still _kit-sample/gallery --at 0.5,3.5,6.5,9.5,12.5,15.5,18.5,21.5,24.5,29 --sheet`, `$M` as in `motion/README.md`). If a part looks wrong there, it is
wrong in every film.

## What both films rebuilt

`films/proof-kits-launch` (ENG-2176 proof kits, 2:15) and `films/roam-0230-launch` (Roam 0.23.0 release, 2:09) were built
in parallel. Both ended up with the same files under different content.

| Part                                                                     | proof-kits-launch                                 | roam-0230-launch                                                         | Kit file                |
| ------------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------- |
| Design tokens, body, stage background, `.ic`, `code`                     | `film.css` lines 1-56                             | `film.css` lines 1-58                                                    | `kit.css`               |
| Window shell (browser frame, address bar)                                | `ui/window.ts`, `.win*`                           | `ui/window.ts`, `.win*`                                                  | `window.ts`             |
| Role avatar (author, reviewer, QA)                                       | `ui/window.ts` `personaAvatar`                    | not used                                                                 | `window.ts`             |
| Icons (Lucide-style strokes)                                             | `ui/icons.ts` (23)                                | `ui/icons.ts` (50)                                                       | `icons.ts` (merged, 60) |
| Dotted floor the camera travels over                                     | `.floor`                                          | `.floor`                                                                 | `kit.css`, `floor()`    |
| Roam top bar                                                             | `ui/roam.ts` `buildRoam`                          | `ui/roam.ts` `topBar`                                                    | `roam.ts`               |
| Roam page, title, blocks, attributes, nesting, dense mode                | `ui/frames.ts` `blk` `attr`, `.rm-page` `.blk`    | page title only                                                          | `roam.ts`               |
| Roam right sidebar                                                       | `ui/roam.ts`, `.rm-side`                          | none                                                                     | `roam.ts`               |
| `blk > .row` / `.kids` lookups                                           | `scenes/helpers.ts` `rowOf` `kidsOf`              | none                                                                     | `helpers.ts`            |
| Search menu popup                                                        | `ui/frames.ts` `searchMenu`                       | `ui/search.ts` (command palette, search dialog)                          | `popups.ts`, `dg.ts`    |
| Dialog + scrim                                                           | `ui/frames.ts` `settingsDialog`, `.dlg*`          | `ui/search.ts` `.bp-backdrop`, `.adv`                                    | `popups.ts`             |
| Toast, share dialog, switches                                            | `ui/frames.ts` `shareDialog`                      | none                                                                     | `popups.ts`             |
| Pop menu (items, shortcuts, colored dots)                                | none                                              | `ui/tags.ts`                                                             | `popups.ts`             |
| Discourse context row under a title                                      | `ui/frames.ts` `claimPage`                        | none                                                                     | `dg.ts`                 |
| Node settings dialog with the Index tab                                  | `ui/frames.ts` `settingsDialog`                   | none                                                                     | `dg.ts`                 |
| Advanced Node Search dialog                                              | none                                              | `ui/search.ts`                                                           | `dg.ts`                 |
| Canvas: tldraw chrome, node cards, relation arrows                       | none                                              | `ui/roam.ts`                                                             | `canvas.ts`             |
| Node card context panel (Context, Styling tabs)                          | none                                              | `ui/panel.ts`                                                            | `canvas.ts`             |
| Canvas drawer                                                            | none                                              | `ui/drawer.ts`                                                           | `canvas.ts`             |
| GitHub pull request, comment, timeline event                             | `ui/pr.ts`, `ui/report.ts`                        | none                                                                     | `github.ts`             |
| Linear ticket with Done When rings                                       | `ui/ticket.ts`                                    | none                                                                     | `linear.ts`             |
| Terminal + scroll to a line                                              | `ui/terminal.ts`, `scenes/qa.ts`                  | none                                                                     | `terminal.ts`           |
| Video player (mini Roam frames, chapters, `driveTake`)                   | `ui/player.ts`                                    | none                                                                     | `player.ts`             |
| Title lockup, veil, end fade                                             | `ui/lockup.ts`, `.veil` `.endfade`                | `ui/lockup.ts`, `.veil`                                                  | `lockup.ts`             |
| Progress rail with role avatars                                          | `ui/hud.ts`, `hudStage` `hudPerson` `hudEveryone` | `ui/overlay.ts` `rail`, `railStage`                                      | `hud.ts`                |
| `reveal`, `pulse`, `around`, `lift`, `pull`, `spanning`, `sidebarRegion` | `scenes/helpers.ts`                               | `scenes/helpers.ts` (`reveal`, `around`, `charTimes`, `clamp01`, `lerp`) | `helpers.ts`            |
| Beat starts from a `LENGTHS` table                                       | `timeline.ts`                                     | `timeline.ts`                                                            | `timeline.ts`           |

Measured: `proof-kits-launch` is 4,683 lines (2,705 TypeScript, 1,756 CSS), `roam-0230-launch` is 3,591 (1,986 and 1,559).
My estimate is that roughly half of each was this shared work.

## Decisions

Where the two films differ the kit takes the more general version.

1. **Every kit class starts with `k-`** (the one exception is `.ic`, the icon svg both films already used). The two films
   both define `.row`, `.pill`, `.veil`, `.rail`, `.tl` and `.pop` and mean different things by them. A prefix means a
   film's own CSS can never change a kit part by accident, and a kit part never changes a film. A unit test checks that
   every class the kit's markup uses is defined in `kit.css`, so a typo fails the tests, not a render. State modifiers
   (`on`, `hot`, `dense`, `dark`, `off`, `hover`, `focus`, `closed`, `tagged`) are plain words but only ever styled
   under a `k-` class.
2. **`kit.css` is imported as text and passed to `addCss` before the film's CSS**, the way films already do it. The
   index does not import CSS itself, so the kit's pure functions load in plain Node for tests.
3. **Colors are tokens** (`:root` custom properties). A film re-themes by redefining a token in its own `film.css`. The
   few places the runtime interpolates colors (`f.to(node, { backgroundColor })`) cannot read a variable, so `colors.ts`
   holds the same hex values in `COLORS`, and a test fails if they drift from `kit.css`.
4. **Roam back/forward are arrows** (roam-0230, drawn from the extension's source), not the chevrons proof-kits used.
   `caret` and `dots` stay as aliases of `caretRight` and `dotsH`.
5. **Roam top bar is roam-0230's** (44 units, menu/back/forward on the left, sync dot, search, tool icons on the right)
   with proof-kits' optional graph name. It is the Roam layout, and the proof-kits bar was a subset.
6. **Popups are placed in the Roam surface's coordinates** (the window body), and the popup layer covers the whole
   surface including the top bar and sidebar, as Blueprint overlays do. proof-kits placed them inside the main column.
7. **`around` takes one element or a list** (roam-0230's version covers proof-kits'). **`lift` is a closed form**, not
   three passes of a fit loop, and a test checks the clearance it promises. **`pull` clamps `dim` to 5%** instead of
   leaving it to whoever calls it. **`spanning` unions the x extents** of its two elements (the same result when they
   are aligned, which they were).
8. **The rail is icons or numbers, no labels.** roam-0230 expanded the active chapter into a word; the shared rule is no
   on-screen text, and the voiceover names the stage.
9. **Window URL width is a parameter** (`urlWidth`, default 52%). proof-kits used 52%, roam-0230 42%.
10. **Roles are `author`, `reviewer`, `qa`** with a pencil, an eye and a flask. They are roles, not people.
11. **The lockup has two brands.** `"dg"` is the Discourse Graphs glyph and wordmark (roam-0230; the svg is copied into
    `kit/assets`), `"word"` is a rounded-square logo and a word typed out letter by letter (proof-kits).
12. **Parts are visible when built.** Both films hid popups in CSS (`opacity: 0`). The kit shows what you build, so a
    still or the gallery sees everything; a scene that brings a part in tweens `opacity: [0, 1]` (the engine holds a
    `from` until the tween starts), or builds it with `hidden: true`.

## Conventions that bite

- **Positions.** Windows sit by `at: { cx, cy }`, the window's center in world units. Popups sit by `left`/`top` in the
  Roam surface's units (the window body, below the address bar); `left: "center"` with a `width` centers on that axis,
  with a margin and not a transform, so it composes with the engine's `x`/`y` tweens.
- **Finding parts.** Builders take `ref`s and put them on `data-ref`; `roam.q("menu")` finds one inside that window, so
  two windows can both have a `menu`. Builders that return handles (`Canvas`, `Ticket`, `Terminal`) already hold the
  elements scenes need.
- **Starts hidden by design.** The rail, the lockup, the veil and the end sheet start at opacity 0 (fade `hud.root` in;
  `lockupIn` brings the lockup). Everything else is visible until a scene says otherwise.
- **Measure at build.** `buildTerminal` measures each line's offset while every line still holds its full text, and
  `fitPlayer` scales the player once it is laid out. Typed text changes sizes later; do not measure then.
- **Leave `transform` alone** on animated parts: the engine writes `translate`, `scale` and `rotate`.

## Parts

Each part: what it draws, how to call it, three lines of use. Builders named `build*` add to the film and return handles;
the pure `*Html` or string-returning functions return markup to compose.

### Window shell and icons (`window.ts`, `icons.ts`)

A browser frame: three dots, an address field, an optional role avatar, a body you fill. Dark variant for terminals.

```ts
windowShell({ id, cx, cy, w, h, url, role?, dark?, urlWidth?, body }): HTMLElement   // not added to the world
roleAvatar(role, size = 22, tag = "span"): string      // "author" | "reviewer" | "qa"
floor(f, { x, y, w, h }, margin = 1800): HTMLElement   // the dotted floor under the windows
icon(name, size = 16, stroke = 2): string              // 60 glyphs; iconNames() lists them, a typo throws
```

```ts
const win = windowShell({ id: "notes", cx: 0, cy: 0, w: 780, h: 690, url: "example.com", role: "author", body: "…" });
f.world.append(win);
floor(f, { x: -390, y: -345, w: 780, h: 690 });
```

### Roam shell (`roam.ts`)

Roam's window: the top bar, a main column of stacked pages, an optional right sidebar, and a popup layer over all of it.
A page is a title and blocks: attributes (`source::`), nesting, collapsed blocks (`closed`, the ringed bullet), a `dense`
mode that fits more rows, and 130 units of padding on the right so text stays clear of the sidebar edge (a camera region
that starts at the sidebar never cuts through a word).

```ts
buildRoam(f, { id, at, size?, graph, showGraph?, url?, role?, urlWidth?, pages?, main?, popups?, sidebar? }): Roam
//   Roam = { win, surface, main, side, layer, surfaceSize, mainSize, q(ref) }       size defaults to 1120x660
//   sidebar = { title, body, width? (440) }       main replaces pages (for a canvas)
roamPage({ ref?, title, titleRef?, blocks, before?, dense?, hidden? }): string
blk(ref, rowHtml, kidsHtml = "", { closed? }): string   attr(name)   chip(text)   collapse(ref, inner)   inline(text)
```

```ts
const blocks = blk("b1", inline("Naps help recall"), blk("", `${attr("source")} [[Lab notebook]]`));
const roam = buildRoam(f, {
  id: "roam",
  at: { cx: 0, cy: 0 },
  graph: "naps-lab",
  pages: [roamPage({ title: "Naps", blocks })],
});
f.camera.start(roam.win, { pad: 0.07 });
```

`rowOf(block)` and `kidsOf(block)` (helpers) find a block's row and children. `collapse(ref, inner)` is a wrapper whose
height a scene tweens to fold blocks away.

### Roam popups (`popups.ts`)

The things that open over a Roam page, all as markup for `popups:`.

```ts
searchMenu({ left, top, width = 420, sections: [{ heading, items: [text | { text, hot }] }], ref?, hidden? })
scrim({ ref?, hidden?, heavy? })            // heavy is Blueprint's dark backdrop
dialog({ left, top, width, height?, title, tabs?: { labels, on }, body, ref?, hidden? })      dialogTabs(labels, on, inner?)
toast({ left, top, text })                  button(text, "primary" | "go" | "no" | "off")
shareDialog({ page, groups: [{ name, on? }], action = "Publish", left, top, width = 520, title?, ref? })
commandPalette({ left, top, width = 560, query?, items: [{ text, tag?, on? }], ref? })     // ref + "-q" is the query span
popMenu({ left, top, items: [{ text, key?, dot?, on?, ref? }] })       // Blueprint menu: the tag menu on a card
```

```ts
popups: scrim({ ref: "scrim" }) +
  shareDialog({ ref: "dlg", left: "center", top: 100, page: "Naps", groups: [{ name: "lab" }] });
openDialog(f, roam.q("dlg"), roam.q("scrim"), 12.3); // scrim fades in, dialog rises (helpers)
closeDialog(f, roam.q("dlg"), roam.q("scrim"), 16.0);
```

### Discourse Graph screens (`dg.ts`, `canvas.ts`)

In a page: `dgContext({ ref?, label?, action?, hidden? })` is the row under a title (pass it as `roamPage({ before })`);
`nodeSettingsDialog({ left, top, nodes, node, heading, results, tab?, subTab?, ... })` is the settings dialog open on a
node type's Index tab; `advancedSearch({ left, top, results: [{ badge, title }], previews: [{ meta, title, blocks }] })` is
Advanced Node Search, and `advancedSearchParts(f, root)` returns the parts to animate (`typed`, `spinner`, `split`,
`results`, `previews`).

The canvas (a tldraw whiteboard inside a Roam page): node cards in each type's colors, relation arrows with labels,
tldraw's chrome, the node card's context panel (Context and Styling tabs, a plus or minus per row) and the drawer.

```ts
buildCanvas(f, host, { box, title?, nodes, arrows?, kinds? = DG_KINDS, relations? = DG_RELATIONS, zoom?, block? }): Canvas
//   Canvas = { tl, cv, cards, arrows, toolbar, zoomLabel, drawerToggle, block, place(card), aimAll() }
//   nodes = [{ id, kind, title, at? }]    arrows = [{ id, from, to, relation }]    cv takes x/y/scale tweens to pan and zoom
buildContextPanel(f, canvas.tl, { id, groups: [{ label, rows: [{ id, title, on }] }], styling }): ContextPanel
buildDrawer(f, canvas.tl, shapes: [{ id, title }]): Drawer          // a node on the canvas twice carries a count
```

```ts
const roam = buildRoam(f, {
  id: "canvas",
  at: { cx: 0, cy: 0 },
  size: { w: 1440, h: 860 },
  graph: "naps-lab",
  main: "",
});
const canvas = buildCanvas(f, roam.main, { box: { x: 16, y: 68, w: 1408, h: 696 }, nodes, arrows });
const panel = buildContextPanel(f, canvas.tl, { id: "claim", groups, styling: true });
```

Pure rules, tested: `freeSlot` (where the Context tab puts a related card), `arrowPath`, `contextHeights`,
`groupDrawerEntries`, `drawerMatches`, `pageRef`. A card without `at` stays unplaced until you set `card.x/y`, call
`canvas.place(card)` and `canvas.aimAll()` in an `f.job(0, …)` after `buildCanvas`.

### GitHub pull request (`github.ts`)

A PR page: title and number, Open pill, meta line, tabs, and a conversation you fill with comments and timeline events.

```ts
buildPullRequest(f, { at, repo, number, title, author, base, head, commits, files?, checks?, role?, conversation }): PullRequest
ghComment({ author, role?, when, badge?, body, ref? })    ghEvent({ author, role?, text, shas?, when, ref? })
ghLink(text, ref?)    mdChecklist([{ html, on?, kids?, ref? }])    commentWindow(f, { id, at, url, comment })
```

```ts
const conversation = ghComment({ author: "sid597", role: "author", when: "3 days ago", badge: "Author", body });
const pr = buildPullRequest(f, {
  at: { cx: 0, cy: 0 },
  repo: "owner/repo",
  number: 1508,
  title,
  author,
  base: "main",
  head,
  commits: 3,
  conversation,
});
f.camera.to(pr.win, { at: 4, dur: 1.5 });
```

### Linear ticket (`linear.ts`)

A ticket: breadcrumb, title, property chips, sections of text, and a checklist section (Done When) whose rings you pulse
and fill.

```ts
buildTicket(f, { at, ticketId, slug, title, props?, sections, role?, workspace?, team? }): Ticket
//   sections = [{ heading, text?, style?: "fold" | "muted", items?: string[], ref? }]    Ticket = { win, done, items, rings, halos, ticks, q }
```

```ts
const ticket = buildTicket(f, {
  at: { cx: 0, cy: 0 },
  ticketId: "ENG-1",
  slug: "a-ticket",
  title,
  sections: [{ heading: "Done When", items }],
});
pulse(f, ticket.rings[0], ticket.halos[0], 3.0);
f.to(ticket.ticks[0], { opacity: [0, 1], scale: [0.4, 1] }, { at: 3.4, dur: 0.45, ease: "pop" });
```

### Terminal (`terminal.ts`)

A dark window that prints lines. Colors `p dim hi ok no am bl`, a caret to turn on while typing, a span to type into, and a
scroll that puts any line at the top.

```ts
buildTerminal(f, { at, title, role?, lines: [{ id, html }] }): Terminal      // Terminal = { win, inner, lines, carets, offsetOf }
tprompt(command, caretName)   tspan(color, text)   ttyped(name, color?)   tcaret(name)
scrollTerm(f, term, lineId, at, dur = 0.6)
```

```ts
const term = buildTerminal(f, {
  at: { cx: 0, cy: 0 },
  title: "kitty",
  lines: [{ id: "cmd", html: tprompt("tool run", "c") }],
});
f.type(f.q(".k-t-hi", term.lines.cmd), "tool run", { at: 2, dur: 0.9 });
f.cls(term.carets.c, "on", { from: 2, to: 3 });
scrollTerm(f, term, "next", 6);
```

### Video player (`player.ts`)

A player on a page: a mini Roam screen that changes with chapters, a caption, a play button until it plays, a scrubber with
a tick per chapter. Its screens are made from the same parts as the live windows.

```ts
playerHtml({ id, length, frames: [{ id, html }], chapters?: [{ id, at, title, frame }], ticks?, loom?, graph? }): string
fitPlayer(playerEl)      driveTake(f, playerEl, spec): (seconds) => void      chapterAt(chapters, s)   fillPercent(s, length)
```

```ts
const video = driveTake(f, f.q("[data-ref=take]", pr.win), spec); // after fitPlayer(...) at build time
f.fn({ at: 5, dur: 10, ease: "linear" }, (p) => video(p * spec.length));
```

### Title lockup and end fade (`lockup.ts`)

The brand over a frosted veil (the Discourse Graphs glyph and wordmark, or a logo and your own word), an optional line
under it (`["for Roam", "0.23"]`), and a solid sheet the film fades out through.

```ts
buildLockup(f, { brand?: "dg" | "word", word?, logo?, sub? }): Lockup
lockupIn(f, lock, at, { veil? }): number    lockupHold(f, lock, at, dur)    lockupOut(f, lock, at): number    endFade(f, lock, at, dur = 0.7)
```

```ts
const lock = buildLockup(f, { sub: ["for Roam", "0.23"] });
lockupIn(f, lock, 0.4);
lockupOut(f, lock, 4.2);
endFade(f, lock, 24.6);
```

### Progress rail (`hud.ts`)

A small pill low in a corner that says where in the story the film is and whose point of view the shot is from. Icons or
numbers, no text. Frame shots with `lift()` so its corner stays clear.

```ts
buildHud(f, { stages: [{ key, icon? }], people?: Role[], corner?: "left" | "right" }): Hud
hudStage(f, hud, key | "all", at)     hudPerson(f, hud, role, at)     hudEveryone(f, hud, at)
```

```ts
const hud = buildHud(f, {
  stages: [
    { key: "page", icon: "book" },
    { key: "search", icon: "search" },
  ],
  people: ["author"],
});
f.to(hud.root, { opacity: [0, 1], y: [10, 0] }, { at: 5, dur: 0.6, ease: "arrive" });
hudStage(f, hud, "page", 5);
```

### Scene helpers (`helpers.ts`, `timeline.ts`)

| Helper                                                        | What it does                                                                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rowOf(block)`, `kidsOf(block)`                               | A block's row and its children container (kit `k-` or a film's own `.row`, `.kids`).                                                                               |
| `reveal(f, el, at, dur = .5, rise = 8)`                       | Fade in with a short rise. `fadeOut(f, el, at, dur, rise)` is the other half.                                                                                      |
| `typeBlock(f, block, text, { at, dur })`                      | A block's row arrives and its text types itself in (`txtOf(block)` is the span `f.type` writes into).                                                              |
| `pulse(f, ring, halo, at)`                                    | A ring that blinks to say "this one".                                                                                                                              |
| `pull(f, target, { at, hold, pad?, radius?, blur?, dim? })`   | The focus pull: blur and a dim of at most 5% (`PULL_DIM`) for `hold` seconds, then it lets go. Use about six per film.                                             |
| `lift(f, region, pad = .05)`                                  | A camera region grown downward so 90 units (`SAFE_BOTTOM`) of the frame stay clear under it, for the rail. Hand `camera.to` the same `pad`. Pure form: `liftRect`. |
| `around(f, el \| els, margin?)`                               | A region that follows an element, or the box around several. Pure form: `unionRect`.                                                                               |
| `spanning(f, from, to, { x, top, bottom })`                   | From the top of one element to the bottom of another. Pure form: `spanRect`.                                                                                       |
| `sidebarRegion(f, { side }, { left, top, h })`                | A slice of a sidebar widened to the left so the driven page stays in the shot. Pure form: `sideRect`.                                                              |
| `crossfade(f, out, into, at)`                                 | One page gives way to another in the same window.                                                                                                                  |
| `openDialog / closeDialog(f, dialog, scrim, at)`              | The scrim fades, the dialog rises or leaves.                                                                                                                       |
| `typeInto(f, { typed, placeholder? }, text, { at, dur })`     | `f.type`, and the placeholder goes at the first character. `charTimes(text, at, dur)` gives each key's time.                                                       |
| `clickOn(f, target, { at, dur?, anchor?, offset?, settle? })` | Move the pointer to something and press it; returns when the press lands.                                                                                          |
| `startsOf(LENGTHS)`, `totalOf(LENGTHS)`                       | Beat starts from a table of lengths. A beat starts where the one before ends.                                                                                      |
| `clamp01`, `lerp`                                             | What both films had.                                                                                                                                               |

### Tokens and styles (`kit.css`)

`:root` custom properties for color (`--ink --ui --ui2 --ui3 --mute --faint --line* --blue --green --red --amber
--purple` and soft variants), roles (`--role-author`, ...), the window (`--win-shadow --win-radius --stage-bg`), Roam
(`--roam-* --bp-*`), tldraw (`--tl-*`), GitHub (`--gh-*`), the terminal (`--term-*`), the player and the end sheet. Then
one section per part. A film re-themes by redefining a token in its own CSS, which loads after the kit.

## Starting a film

`scaffoldFilm(name)` copies `kit/template/` to `films/<name>/`, filling `{{name}}` and `{{title}}`. It refuses a name
that exists, or that is not a lowercase slug. The result renders as it stands (`info`, `lint`, `still`):

```
data.ts        what the film says and shows; mark what is real and what is staged
timeline.ts    LENGTHS (beat lengths, and so every beat's start) and POS (where windows sit)
world.ts       builds every window and overlay once, from the kit
scenes/        open (the brand), feature (name it, go to the UI, pull focus, show the result), close (the brand, end fade)
narration.json one line per idea, anchored to a beat
```

A new feature beat is one copy of `scenes/feature.ts` (44 lines) with its targets changed. Sizes: the template is 209
lines and renders a 25 s film; `films/_kit-sample` is 98 lines for 30 s; the two existing films are 4,683 and 3,591.

## Migrating a film to the kit

The kit's classes all start with `k-`, so loading it changes nothing in a film until the film uses a part. Do it in
steps and compare `still --sheet` at the same times before and after each.

1. In `film.ts`, `import kitCss from "../../kit/kit.css"; addCss(kitCss);` before `addCss(css)`. Take a "before" sheet.
2. Swap the scene helpers first (no markup changes): delete the film's `rowOf kidsOf reveal pulse pull lift around
spanning sidebarRegion clamp01 lerp charTimes` and import them from `../../kit`. `rowOf` and `kidsOf` find the film's
   own `.row` and `.kids` too. Differences: `lift` is exact, `pull` clamps `dim` to 5%, `around` takes an element or a list.
3. Swap screens one at a time, deleting the film's file and its CSS block as each goes: window and icons, Roam shell and
   popups, then pull request / ticket / terminal / player, then lockup and rail. The class rule is the old name with
   `k-` in front. Exceptions: `.dlg-scrim` is `.k-scrim`; `.pop .sect .sect-h .item` are `.k-pop .k-pop-sect .k-pop-h
.k-pop-item`; `.pbtn` is `.k-btn`; `.hud` is `.k-rail`; `.lockup` is `.k-lock`; `.proofchip` is `.k-chip`;
   `.dg-additions` is `.k-dg-context`; `.pal` is `.k-palette`; `.pop-menu .bp-menu .bp-mi .mdot .ml` are `.k-menu
.k-menu-it .k-menu-dot .k-menu-key`; `.tl` is `.k-tl`, `.rm-ptitle` is `.k-rm-ptitle`, `.dr-*` is `.k-dr-*`.
4. The rail: `hudStage(f, hud, "key", at)` takes the stage's key as a string where proof-kits passed one of its `STAGES`.
   roam-0230's chapter rail becomes numbered nodes without labels.
5. Keep what is film-specific in the film, built as before: proof-kits' runner panel (`PanelCtl`), its finale's lines and
   badges, its case data; roam-0230's title cards, changelog list, flag chip and result-order card.
6. After each step: `npx tsc -p motion/tsconfig.json`, `lint <film>`, and `still <film> --at <same times> --sheet`.
   Expect differences only where the kit took the more general version (Decisions 4, 5, 6, 8).

## Left out, and gaps

- **Left out on purpose**, as film-specific or against the no-captions rule: roam-0230's feature title cards, changelog
  list, flag chip and "how results are chosen" card; proof-kits' `PanelCtl`, case data, the connecting lines and green
  window badges of its finale (used once) and the take's case-to-frame map.
- **Not drawn by either film, so not here:** a relation dialog (build one from `dialog()` and `dialogTabs()`), Obsidian
  screens, Roam's query builder, export dialog and settings panels other than the node Index tab.
- **Canvas** has cards, arrows, chrome, the context panel, the drawer and the tag menu. Other tldraw tools and overlays
  are not drawn.
- The Discourse Graphs logo is a copy of `apps/website/public/DG-lockup.svg` in `kit/assets`; update the copy if the logo changes
  (a test checks it still holds a glyph path and a wordmark path).

## Checks

```bash
cd discourse-graph/apps/roam
npx tsc -p ../../../dg-films/motion/tsconfig.json
npx tsx --test ../../../dg-films/motion/__tests__/kit.test.ts
```

`__tests__/kit.test.ts` covers what has no browser in it: the lift math and its clearance, regions, the 5% pull, beat
starts, placement, icons, escaping, the rail's states, the colors against `kit.css`, the player's chapters, the canvas
rules, the logo asset, that every class the kit draws is styled, that `kit.css` is whole, that the index exports every
module, the scaffold against a temp directory, and that the template's and the sample's narration name real beats. The
template type-checks in place (the test imports its types), so a broken template fails `tsc`.
