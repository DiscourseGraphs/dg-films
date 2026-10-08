---
name: make-film
description: Make, revise or review a silent Discourse Graphs product film with this repo's motion engine, such as an episode of the One Question tutorial series. Use when asked to script, build, check, preview, render or post a film, to fix a finished one, or to judge whether a film script is good. Covers the order of work, the truth sources, the checks before each render, and the review passes.
---

# Make a film

A film here is code: an episode folder under `motion/films/` that the engine renders frame by frame. `docs/technical.md` has the setup and commands, `AGENTS.md` the hard rules and how to work with the person, `motion/README.md` the engine, and `tutorial-series/PLAN.md` the One Question series and its rules. Read them before the first step. This skill is the order of work.

## 1. Pin the brief

- The topic, the audience, where it will be posted, and the one move the film teaches. For One Question, the episode's row in PLAN.md and its source tutorial.
- The truth sources, best first: the extension's code (`discourse-graph/apps/roam/src`), real screenshots (`tutorial-series/evidence/`), the template graph read through the discourse-graph MCP (needs the Roam desktop app running; pass the graph's name explicitly). Where a tutorial's text and the code disagree, the code wins; note the discrepancy for the tutorial's authors.
- Before drawing any UI you have not drawn before, find a real screenshot of it. Save it to `tutorial-series/evidence/<source>/` and cite it in a comment where the part is drawn. If nothing shows a detail, draw the most likely form, mark it unverified in that comment, and list it in your report.

## 2. Script first, then build

- Write the script before any code: one row per beat with its headline and what the picture shows. For One Question, use the grammar in PLAN.md and show it to the person as a plain table and wait for their OK before building. Keep it with the episode (the PR description or the episode's `data.ts` header).
- Check that it gets through before building: give a fresh agent the headline list alone and ask "What steps does a user take, and what do they get?" It passes when it names the move, most steps in order, and the payoff.
- If someone asks whether a script is the best it can be, run a **blind fresh take** as well as any critique: a pass given only the goal, the audience, the constraints and the product facts, told not to read the existing script, which proposes several concepts and writes one in full. A critique that sees the draft anchors on it. Compare the two and give one recommendation, not a menu.

## 3. Build

- Start from the closest finished episode: copy its folder to a **new** folder and change it. Never edit or delete a finished film's folder or its render; a new version is `name-v2`.
- Reuse `motion/films/<series>/shared/` parts. A new product part goes in `shared/` with its source cited, so the next episode gets it right too.
- Keep every word on screen in `data.ts`.

## 4. Look, then lint

- `tsc` must pass. Then render still sheets (`still <film> --beats 2 --cues --sheet --columns 4`) and **look at every frame yourself**. Check:
  - every label against the truth sources;
  - text cut at a frame edge;
  - two headlines at once (the build fails on that);
  - a shot that frames the wrong thing.
- Readability: anything a headline names must read at a 650 px embed, which is about 1.4x zoom or more on body text. Frame text and cards, not whole blocks. Pass the same `pad` to `shot()` and the camera.
- `lint` must be clean.

## 5. Preview early

Render the 720p `preview` as soon as the film plays end to end and send it to whoever asked, before polishing. It takes seconds and is the one thing they can react to. Tile its frames at 2 fps on one sheet to check pacing (one action every 3 to 4 s, a 1.2 s hold after each result, a clean 1.5 s hold on the payoff).

## 6. Check it gets through (One Question)

Use fresh agents that have not seen the plan, and give them pictures only. PLAN.md's "Is it getting through" has the full protocol. The two cheapest passes catch most problems:
- **Pictures only** (headlines hidden): "What did the person do, what changed, what is this teaching?"
- **650 px legibility:** transcribe every headline and every label a headline points at.

Fix what fails, then re-run only that check.

## 7. Render and post

- `render <film> --crf 8 --preset slow --only 1080p`. 1080p60 is the master.
- If the file is over 20 MB, make a second copy with the two-pass encode in `docs/technical.md`. Keep the master.
- Silent films carry their story in the headlines. Never add a voice to a film made silent unless asked.
- Send the person the mp4 itself, with its length and size, and list every detail you drew without a source to check it against.

## Working habits

- Say in a line what you are doing every few steps. Never go quiet through a long build.
- Before you launch parallel agents for reviews or checks, say roughly what they will cost, and run at most two at a time.
- Verify any agent's report yourself (tsc, a still, a measurement) before you relay it.
- When asked what to do next, give one plan and act on it; ask only about what the requester alone can decide.
- Renders open real, visible browser windows. Never pass `--headless`, and don't touch the windows while a render runs.
