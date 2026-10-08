# dg-films

Short, silent product films for Discourse Graphs. You say what film you want in plain English, and your AI agent makes it.

See what it makes: [the example films](https://github.com/DiscourseGraphs/dg-films/releases/tag/examples-2026-10). The first series is **One Question**, short onboarding films for Slack and the newsletter. Episodes 1 to 3 cover making a node, making a relation, and bringing your papers in from Zotero.

## How it works

You describe the film. Your agent does every step:

1. It reads the extension's code, real screenshots and the template graph, so every label, menu and color matches the product.
2. It writes a script (the headlines and what each moment shows) and asks you to approve it.
3. It builds the film, checks every frame itself, and sends you a quick preview.
4. After your OK, it makes the final video: 1080p, silent, under 20 MB, ready for Slack, Loom or the newsletter.

Nothing is screen-recorded, so you don't need a demo graph or a clean screen. Changing a word later is a quick ask.

## Set up once

You need:
- Claude Code (or another coding agent) on your computer.
- Access to the DiscourseGraphs GitHub organization (the whole team has it).
- The Roam desktop app open, when the film is about the template graph.

Then open your agent in an empty folder and say:

> Set up github.com/DiscourseGraphs/dg-films for me. Follow its docs/technical.md, and show me a test frame when it works.

It installs what it needs and shows you a frame from episode 1. While it makes a film, browser windows will open and close on their own for a minute or so; leave them alone.

## Make a film

Open your agent in the `dg-films` folder and say what you want. For example:

> Make episode 4 of One Question, "Lay out the argument", from the template graph's Tutorial/Using the Canvas.

> Make a 45-second film for new users that shows how to turn a highlighted sentence into a Claim.

> In episode 2, change the headline "Open its context." to "Open the evidence's context." and make a new version.

> Make a copy of episode 3 that's under 20 MB.

What helps the result:
- **Who it's for** and **where it will be posted**.
- **The one thing** a viewer should be able to do afterwards.
- **The source**, if there is one: a tutorial page, a doc, a feature.

[examples/README.md](examples/README.md) has the briefs that made the existing films.

## What you'll be asked

- **The script.** A short table of headlines and what happens. Change anything you like.
- **The preview.** A quick low-resolution cut. Say what feels off: pacing, wording, a step that isn't clear.
- **Anything it couldn't confirm.** If no code or screenshot showed a detail, it says so. You decide, or tell it where to look.

## Good to know

- Films are silent. Headlines on screen carry the story.
- A finished film is never overwritten. A new version is saved next to it, so links to the old one keep working.
- It keeps the films true to the product. Ask it to explain anything it shows.

## More

- [examples/README.md](examples/README.md): the films so far and the prompts behind them.
- [tutorial-series/PLAN.md](tutorial-series/PLAN.md): the One Question plan, episode list and rules.
- [docs/technical.md](docs/technical.md): setup, commands and file layout, for agents and developers.
