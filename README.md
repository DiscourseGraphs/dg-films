# dg-films

Short, silent product films for Discourse Graphs, made from HTML. Nothing is screen-recorded: each screen is drawn from the extension's code and real screenshots, then a script moves a camera, a cursor and headlines over it, frame by frame. The same film renders the same frames every time, and changing a word is a one-line edit.

The first series is **One Question**: ten tutorial films for onboarding, each one move in about 40 seconds, posted on Slack and in the newsletter. Episodes 1 to 3 are here: make a node, make a relation, bring your papers in from Zotero.

## What's in here

| Path | What it is |
|---|---|
| `motion/engine/` | The renderer and its command line (`cli.ts`): timeline, camera, cursor, stills, lint, preview, render. |
| `motion/kit/` | Reusable screen parts (a browser window, Roam's shell, dialogs, menus, the canvas) and motion helpers. |
| `motion/films/one-question/shared/` | The series layer: its world (graph, node types and colors, the story's nodes), headlines, end card, the template-lab look, and the Discourse Graphs and ZoteroRoam UI parts. |
| `motion/films/one-question/oqNN-*/` | One folder per episode, six files each (below). |
| `motion/films/_kit-sample`, `motion/films/smoke` | A minimal example film and the engine's self-test. |
| `tutorial-series/PLAN.md` | The series plan: the team's input, the episode list, the facts the films depend on, and **the rules every episode follows**. |
| `tutorial-series/evidence/` | Real screenshots the UI is drawn from. Add to it before drawing anything new. |
| `recorder/chapters.ts` | A small helper the engine uses for chapter markers. |

An episode folder:

| File | What it holds |
|---|---|
| `data.ts` | Every word on screen: headlines, note text, labels. |
| `timeline.ts` | How long each beat runs. |
| `world.ts` | Builds the screens from the shared parts. |
| `scenes.ts` | The choreography: clicks, typing, camera moves, when each headline shows. |
| `film.ts`, `film.css` | Entry point and the episode's own styles. |

## Set up (once)

1. Clone this repo **next to** `discourse-graph`, in the same parent folder. The engine borrows `tsx`, `playwright` and `esbuild` from `discourse-graph/apps/roam` by a relative path (or set `MOTION_DEPS_ROOT` to another `apps/roam`).
   ```
   parent/
     discourse-graph/
     dg-films/
   ```
2. In `discourse-graph`, run `pnpm install`.
3. In `discourse-graph/apps/roam`, run `npx playwright install chromium`.
4. Install `ffmpeg` (`brew install ffmpeg` on a Mac).
5. Check it works. From `discourse-graph/apps/roam`:
   ```bash
   M=../../../dg-films/motion/engine/cli.ts
   npx tsc -p ../../../dg-films/motion/tsconfig.json      # must print nothing
   npx tsx $M still one-question/oq01-highlight-v2 --at 1,20 --sheet
   ```
   The sheet lands in `dg-films/output/motion/oq01-highlight-v2/stills/`.

## Commands

Always run them from `discourse-graph/apps/roam`, with `M=../../../dg-films/motion/engine/cli.ts`:

| Command | What it does |
|---|---|
| `npx tsx $M info <film>` | The beat sheet, no render. |
| `npx tsx $M still <film> --beats 2 --cues --sheet --columns 4` | Frames from every beat on contact sheets. Look at them. |
| `npx tsx $M still <film> --at 1,5.5 --sheet` | Frames at the seconds you pick. |
| `npx tsx $M lint <film>` | Checks every camera move; must be clean. |
| `npx tsx $M preview <film>` | The whole film at 720p in seconds. |
| `npx tsx $M render <film> --crf 8 --preset slow --only 1080p` | The final 1080p60 mp4. |

`<film>` is a folder under `motion/films`, such as `one-question/oq03-papers`. Output goes to `output/motion/<film>/` (not committed). Renders open real, visible Chromium windows; leave them alone until the run ends. `--headless` is refused on purpose: headed rendering matches what people see. Films are silent; the engine's narration commands need tools that aren't in this repo.

To post a film where uploads stop at 20 MB, make a smaller copy with a two-pass encode. Lower the bitrate if it still lands over:
```bash
ffmpeg -i in.mp4 -map 0:v -c:v libx264 -preset slow -b:v 3400k -pass 1 -an -f mp4 /dev/null
ffmpeg -i in.mp4 -map 0:v -map_chapters 0 -c:v libx264 -preset slow -b:v 3400k -pass 2 -pix_fmt yuv420p -movflags +faststart -an out-under20mb.mp4
```

## Making an episode

The fastest way is with a coding agent (Claude Code or similar) started in this repo. It reads `AGENTS.md` first. A good first message:

> Make episode N of One Question, "<title>", from the template graph's Tutorial/<page>. Read tutorial-series/PLAN.md (its "Rules for every episode") and motion/README.md, then follow the pattern of motion/films/one-question/oq03-papers. Write the script first: the headlines and what each beat shows. Then build it, look at the stills, lint, preview, and render the final.

What the agent has to get right, and you should check on the stills:

- **Truth.** Every label, menu, order, color and default matches the real product. Sources, best first: the extension's code (`discourse-graph/apps/roam/src`), real screenshots in `tutorial-series/evidence/`, the template graph (read through the discourse-graph MCP, which needs the Roam desktop app running). Where a tutorial's text and the code disagree, the code wins.
- **The grammar** (PLAN.md has the full rules):
  - Frame 0 is the end state with a promise headline.
  - A rewind cue, then "Right now …".
  - Three or four steps, each shown as trigger, response, result.
  - The end state again with a clean 1.5 s hold.
  - A 5.4 s end card that glimpses the next episode's payoff.
- **Headlines.** At most 7 words, plain words, one at a time; each names only what's on screen.
- **Readable at 650 px wide.** Frame text and cards close, about 1.4x zoom or more on body text.
- **Never overwrite a finished film.** A new version goes in a new folder (`oq02-supports-v2`), so links to the old one keep working.

## Keeping this guide true

This README is the user's guide. When a change alters how something works (a command, a setup step, a rule, a folder), update this file in the same commit.
