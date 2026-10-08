# Technical guide

For agents and developers. Team members don't need this page: their agent reads it and does these steps. The README is the people's guide.

## What's in the repo

| Path | What it is |
|---|---|
| `motion/engine/` | The renderer and its command line (`cli.ts`): timeline, camera, cursor, stills, lint, preview, render. `motion/README.md` explains how it works. |
| `motion/kit/` | Reusable screen parts (a browser window, Roam's shell, dialogs, menus, the canvas) and motion helpers. |
| `motion/films/one-question/shared/` | The One Question series layer: its world (graph, node types and colors, the story's nodes), headlines, end card, the template-lab look, and the Discourse Graphs and ZoteroRoam UI parts. |
| `motion/films/one-question/oqNN-*/` | One folder per episode, six files each (below). |
| `motion/films/_kit-sample`, `motion/films/smoke` | A minimal example film and the engine's self-test. |
| `tutorial-series/PLAN.md` | The series plan: the team's input, the episode list, the facts the films depend on, and the rules every episode follows. |
| `tutorial-series/evidence/` | Real screenshots the UI is drawn from. |
| `examples/` | The films made so far (in the examples release) and the prompts behind them. |
| `.agents/skills/make-film/` | The order of work for every film (linked from `.claude/skills/`). |
| `recorder/chapters.ts` | A small helper the engine uses for chapter markers. |

An episode folder:

| File | What it holds |
|---|---|
| `data.ts` | Every word on screen: headlines, note text, labels. |
| `timeline.ts` | How long each beat runs. |
| `world.ts` | Builds the screens from the shared parts. |
| `scenes.ts` | The choreography: clicks, typing, camera moves, when each headline shows. |
| `film.ts`, `film.css` | Entry point and the episode's own styles. |

## Setup

1. Clone this repo **next to** `discourse-graph` (`DiscourseGraphs/discourse-graph`), in the same parent folder. The engine borrows `tsx`, `playwright` and `esbuild` from `discourse-graph/apps/roam` by a relative path, or from `MOTION_DEPS_ROOT` if set.
   ```
   parent/
     discourse-graph/
     dg-films/
   ```
2. In `discourse-graph`: `pnpm install`.
3. In `discourse-graph/apps/roam`: `npx playwright install chromium`.
4. Install `ffmpeg` (`brew install ffmpeg` on a Mac).
5. Check: from `discourse-graph/apps/roam`,
   ```bash
   M=../../../dg-films/motion/engine/cli.ts
   npx tsc -p ../../../dg-films/motion/tsconfig.json      # prints nothing
   npx tsx $M still one-question/oq01-highlight-v2 --at 1,20 --sheet
   ```
   The sheet lands in `dg-films/output/motion/oq01-highlight-v2/stills/`. Show it to the person as proof the setup works.

Reading the template graph needs the discourse-graph MCP server and the Roam desktop app running. Pass the graph's name explicitly.

## Commands

Run from `discourse-graph/apps/roam`, with `M=../../../dg-films/motion/engine/cli.ts`:

| Command | What it does |
|---|---|
| `npx tsx $M info <film>` | The beat sheet, no render. |
| `npx tsx $M still <film> --beats 2 --cues --sheet --columns 4` | Frames from every beat on contact sheets. |
| `npx tsx $M still <film> --at 1,5.5 --sheet` | Frames at the seconds you pick. |
| `npx tsx $M lint <film>` | Checks every camera move; must be clean. |
| `npx tsx $M preview <film>` | The whole film at 720p in seconds. |
| `npx tsx $M render <film> --crf 8 --preset slow --only 1080p` | The final 1080p60 mp4. |

`<film>` is a folder under `motion/films`, such as `one-question/oq03-papers`. Output goes to `output/motion/<film>/` (not committed). Renders open real, visible Chromium windows for a minute or so; tell the person to leave them alone. `--headless` is refused on purpose. Films are silent; the engine's narration commands need tools that aren't in this repo.

## A copy under 20 MB

Slack and some other places stop at 20 MB. Make a second copy with a two-pass encode, and lower the bitrate if it still lands over:
```bash
ffmpeg -i in.mp4 -map 0:v -c:v libx264 -preset slow -b:v 3400k -pass 1 -an -f mp4 /dev/null
ffmpeg -i in.mp4 -map 0:v -map_chapters 0 -c:v libx264 -preset slow -b:v 3400k -pass 2 -pix_fmt yuv420p -movflags +faststart -an out-under20mb.mp4
```
