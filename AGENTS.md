# Instructions for coding agents

For any film work, follow the `make-film` skill (`.agents/skills/make-film/SKILL.md`; Claude Code lists it as `/make-film`). Read `README.md` first: it is the user's guide to this repo, and the setup and commands there are the ones to use. Then read `motion/README.md` (how the engine works: skim "Run it", "Anatomy of a film" and "Conventions that bite") and, for One Question episodes, `tutorial-series/PLAN.md`.

## Rules

- **Truth over invention.** Every label, menu item, order, color and default on screen must match the real product. Check `discourse-graph/apps/roam/src` and the screenshots in `tutorial-series/evidence/` before drawing a part. If no source shows a detail, draw the most likely form, mark it unverified in a comment there, and list it in your report; ask first when the guess would change what the film teaches. Save any new reference screenshot to `tutorial-series/evidence/` and cite it in a comment where the part is drawn.
- **Never delete or overwrite a finished film's folder or its render.** A new version gets a new folder (`name-v2`).
- **Always render headed.** Never pass `--headless`; don't touch the Chromium windows a render opens.
- **Before calling an episode done:** `tsc` passes, you have looked at the still sheets yourself, `lint` is clean, and you have watched the preview. Headlines follow PLAN.md (at most 7 words, never two at once; `checkHeadlines()` fails the build if two overlap).
- **Keep the guide current.** If you change how anything works (a command, a setup step, a rule, the folder layout, a shared part's behavior), update `README.md` (and `motion/README.md` for engine changes) in the same commit.

## Engine gotchas

- A tween with an explicit `from` holds that value from t = 0 if it is the property's first segment. Pin frame-0 values with `f.set(el, {...}, 0)` first.
- Two `f.cls` windows on the same element and class fight; use different class names.
- The camera fits a target with padding 0.08 by default. When you pass `pad` to `shot()`, pass the same `pad` to `f.camera.to` / `f.camera.start`.
- Frame text and cards (`.k-txt`, inline spans), never whole blocks: a block spans the page and drags the zoom down.
- Measure positions at the time they apply (`f.rectAt(el, t)` inside `f.job(0, …)`) when layout changes over the film.
