# Examples

## Films made with this engine

Download them from the repo's [examples release](https://github.com/DiscourseGraphs/dg-films/releases/tag/examples-2026-10). They are silent, 1080p60, each under 20 MB.

| File | What it is | Length |
|---|---|---|
| `ep0-one-sentence-explainer.mp4` | "One sentence": Roam and Discourse Graphs for newcomers, from the problem down. Its source isn't in this repo; it shows a second style the engine does. | 1:35 |
| `ep1-highlight-its-a-node.mp4` | One Question 1: select a finding, make it Evidence; `\` then C makes a Claim. Source: `motion/films/one-question/oq01-highlight-v2`. | 0:44 |
| `ep2-say-what-the-evidence-supports.mp4` | One Question 2: the context button, Add relation, Supports, the claim. Source: `oq02-supports`. | 0:39 |
| `ep3-bring-your-papers-in.mp4` | One Question 3: ZoteroRoam import, then cite with `[[@`. Source: `oq03-papers`. | 0:40 |

## Prompts that made them

These are the prompts sid typed, as typed, with what each led to. They are briefs, not recipes: the `make-film` skill supplies the process, and the prompt supplies the goal, the audience and the taste.

### Start a series

> make top 10 most useful videos out of these tutorials … 80/20 value each video is a catnip to a interested user, after watching each video they should be looking for next video, we want them hooked, growth hacking

> so first lets go and define the top 10 and then go and build out

With the production constraint: no audio, headlines on screen, very high quality. This produced `tutorial-series/PLAN.md`: the episode list, the rules, and the facts checked against the code.

Then the team's input, pasted in as notes from a meeting:

> Karola noted that demo video series are part of the onboarding strategy for people they have contact with, helping to spread information via Slack and the newsletter. … how do you make a node? How do you make a relation? How do you get stuff from your file system into your graph?

That re-ordered the series: the core three (node, relation, papers) shipped first.

### Bring in thinking partners

> use fable-max and opus-max subagents to find how we should be doing this because your session is more about digesting data but how to show … how to create the hook for the users so they are getting to the videos what are we showing is it getting through is it following the tutorials etc etc all this

It gave three passes: a blind strategy that never saw the draft, a critique of the draft, and a fidelity check of every episode against the tutorials and the code. They cost a lot; run at most two at a time.

### A one-off explainer

> hey can you use the video maker that we have and make it for normies and introduce roam and our plugin to them from the high level of what we are solving not the this setting works like this .. https://discoursegraphs.com/

> ok I want you to also ask a fable session to critique given the goal is this the best script and if not it should think quite hard to figure that out and write it out so you can then make a new one based on it

The critique kept the first script's structure; a blind pass that never saw it was clearly better and became v2 ("One sentence"). When the answer came back as a menu:

> what is this about???? what are you asking?? is the new session that you ran better than the 2 you already have???

The lesson is in the skill: run a blind fresh take, then answer with one verdict.

> maybe lets only do the 1080p its high quality enough

### An internal how-to

> so I want to make another product video very high quality … here is the brief: … spin up a video with instructions for our team on how to alpha test (eg what admin settings need to be set, loading up the import dialog, sharing nodes, etc (from Roam side only is fine) directed towards our internal team for alpha testing

When it asked which build testers run: "main build whatever the current main is it has all the code that we need for it."

### Steer while it builds

- "atleast make one so i can see it na": get a preview out early, before polishing everything.
- "remember no audio": a silent film stays silent.
- "can you make [it] a little bit under 20 mb": the two-pass encode in the README.

### Start a new session on an existing series

Long builds outlive one session. End a session by having the agent write a handoff (state, what's next, open questions) and a starter prompt; begin the next one with it. The shape that worked:

> You are continuing a video series for the Discourse Graphs team: <series>, made with the motion engine in this repo. Read these first, in this order: <the handoff>, `tutorial-series/PLAN.md`, `motion/README.md`, and the finished pattern to copy, <an episode folder>.
>
> Your job, in order:
> 1. <the next episode>: write the script in the series grammar first, then build it, look at the stills, lint, preview, and render the final. Send the mp4.
> 2. Stop after <N> and report.
>
> Rules: <anything specific to this run: sources to check, what not to touch, how long to go before handing off>.
