# Motion engine

Scripted product videos made from HTML. A **film** is a page you animate: windows, a camera over them, a cursor, a focus pull, and the sounds that go with them. Nothing runs on its own clock. `window.__motion.seek(t)` puts every element where the timeline says it is at `t` seconds, the renderer steps `t` frame by frame, takes a screenshot of each frame, and ffmpeg encodes them. Same film, same frames, every time. The picture is rendered silent; `voiceover` then speaks the narration, adds the film's sounds and muxes both onto it.

Films here: `films/one-question/` (the silent tutorial series, see the repo README), `films/_kit-sample` (the kit's minimal example) and `films/smoke`, a ten-second self-test of the basics: tweens, typing, cursor, focus and camera.

Free tools only: Playwright's Chromium, esbuild, ffmpeg, Kokoro for the voice, and two OFL fonts vendored in `assets/fonts` (Inter, JetBrains Mono) so a render needs neither the network nor installed fonts.

## Run it

Like the recorder, the engine borrows tsx, playwright and esbuild from discourse-graph, so run it from there:

```bash
cd discourse-graph/apps/roam
M=../../../dg-films/motion/engine/cli.ts

npx tsx $M render  one-question/oq02-supports            # 3840x2160 and 1920x1080, 60 fps, beats embedded as chapters
npx tsx $M preview one-question/oq02-supports            # 1280x720, 30 fps, the whole film in about half a minute
npx tsx $M still   one-question/oq02-supports --at 12,40.5 --sheet   # PNGs at those seconds, tiled into sheet.png
npx tsx $M still   one-question/oq02-supports --beats 2 --cues --sheet   # 2 frames per beat and one per cue, in labelled sheets of 12
npx tsx $M info    one-question/oq02-supports            # the beat sheet, no render
npx tsx $M lint    one-question/oq02-supports            # camera moves: length, peak speed, warnings
npx tsx $M probe   one-question/oq02-supports --at 32.4 --sel '[data-win=author]|[data-ref=run]'
npx tsx $M voiceover one-question/oq02-supports --fit    # where each narration line goes, and how long each beat must be
npx tsx $M voiceover one-question/oq02-supports          # speak the lines, add the film's sounds, mux onto the 1080p render
npx tsx $M sound   one-question/oq02-supports            # the film's sounds alone, with a level report
```

Switches (`--check`, `--fit`, `--write`, `--force`, `--sheet`, `--cues`, `--headless` and every `--no-…`) take no value and can go anywhere; any other flag takes the word after it, so put those after the film name. Output goes to `dg-demo-videos/output/motion/<film>/` (git-ignored): the mp4s, `beats.md`, `beats.json`, `chapters.ffmetadata`, and the folders `stills/`, `voice/`, `sound/` and `narrated/`. `beats.json` is the film's info as the renderer saw it: title, size, fps, length, the beats with their cues, and `sounds`, every sound cue the film asked for or got automatically (`at`, `kind`, `gain`, `pan`, `panTo`, `dur`, `pitch`; renders from before sound existed don't have it).

Options: `--dsf` (device scale factor; default 3, so a 1280x720 film renders 4K; `preview` uses 1 and `still` 2), `--workers` (default 4), `--fps`, `--from/--to` (seconds, output is named `-part`), `--crf` (default 15, lower is better; the 1080p copy gets five less, so 10 by default, because small text in motion needs the bits), `--preset`, `--only 1080p`, `--no-1080`, `--out <dir>` (the output directory, for every command; `voiceover --to <mp4>` names the narrated file). The header of `engine/cli.ts` has them all.

## Making a Roam product film quickly

The screens are HTML drawn from the extension's code (the film never opens Roam), so a film is mostly scenes plus words. The slow parts were retiming the words against the beats by hand and choosing frames to look at by hand; both are commands now. With `M` set as above and `F` the film's folder name:

```bash
npx tsx $M info $F                             # the beats, what is on screen, a word budget per beat
npx tsx $M voiceover $F --fit                  # a table per beat; nothing is written
#   give every beat at least the length it needs (LENGTHS in timeline.ts), then:
npx tsx $M voiceover $F --fit --write          # save the new `at` values
npx tsx $M still $F --beats 2 --cues --sheet   # sheet-01.png, sheet-02.png... in output/motion/$F/stills/
npx tsx $M lint $F                             # camera moves
npx tsx $M preview $F                          # the whole film, small and fast
npx tsx $M render $F                           # 4K and 1080p (waits its turn if another render is running)
npx tsx $M voiceover $F                        # voice and sounds onto the 1080p
```

1. **Write the narration.** `films/$F/narration.json` has one line per thought: `{ "id": "ctx-1", "beat": "context", "at": 0.5, "text": "…" }`. `beat` is an id from `f.beat`; `at` can be anything for now. `info` prints the on-screen text, the talking points and a word budget for each beat (about 2.3 words a second, with a breath at each end).
2. **Fit.** `--fit` speaks the lines, places them, and prints for each beat the lines with their start and end (seconds after the beat starts), what the beat **needs at least** (the last line's end plus 0.6 s), the beat's length now, and the difference. A negative difference is a beat too short for its words, and a line after the tables names them.
3. **Set the beat lengths** in the film's own timeline (`LENGTHS` in `timeline.ts` in the existing films), then run `--fit --write` to put the new `at` values into narration.json. A beat starts where the one before it ends, so the narration moves with every length you change. The last beat has no length of its own: it runs to the end of the film, so give it room with `tail` (or `duration`) in `defineFilm`.
4. **Look.** One browser renders every frame, then ffmpeg tiles them. Look for clipped text, overlaps, a camera framing the wrong thing; `probe $F --at <t> --sel '<css>|<css>'` says where things are at a time that looks wrong. Single stills at a higher scale: `still $F --at 41.5 --dsf 3`.
5. **Lint.** Every camera move gets its length and peak speed, and a warning when it reads as jank.
6. **Preview.** The whole film at 720p and 30 fps, in about half a minute. Skim it for what a still can't show: timing, blur, the pace of the cursor.
7. **Render.** 4K and 1080p. If another render or preview is running, it waits its turn.
8. **Voiceover.** Mixes the voice and the film's sounds onto the 1080p render and prints the loudness of the result.

After a change: new words only need `--fit` again and step 8 (lines already spoken are kept, so only the new one costs time). A different voice, speed or sound level is step 8 alone. A change to the picture or to a beat's length needs a new render, and `voiceover` says when the render beside it is out of date. `--fit` lays lines back to back from the start of each beat and knows nothing about the picture, so a line that has to land on a moment (a click, a result) gets `"pin": true` and the `at` you want, and `--fit` places the others around it; `voiceover $F --check` lists any line that still runs into the next.

## Rules

- **Always headed.** Every render opens real Chromium windows; i3 floats them on workspace 9. `--headless` is refused. Don't focus or resize those windows while a render runs. `--workers 4` opens four.
- **Renders take turns.** `render` and `preview` wait if another one is running (see below).
- The film never opens Roam, Obsidian or any live app. Screens are HTML.
- No captions. The render is silent; narration and the film's sounds are made apart from the picture and laid over it by `voiceover`, so changing either never needs a new render. `beats.md` says when each beat starts and ends, what's on screen, and what can be said over it.

## Anatomy of a film

```
films/<name>/film.ts          defineFilm(...) and the timeline
films/<name>/film.css         the look; imported as text
films/<name>/narration.json   optional: the lines for voiceover
```

```ts
import { addCss, defineFilm, html } from "../../engine/runtime";
import css from "./film.css";
addCss(css);

defineFilm({ title: "…", width: 1280, height: 720, fps: 60, tail: 1.5 }, (f) => {
  const card = html(`<div class="card">…</div>`);
  f.world.append(card);                       // world coordinates: left/top in design units
  f.camera.start(card, { pad: 0.1 });
  f.set(card, { opacity: 0, y: 30 });
  f.to(card, { opacity: 1, y: 0 }, { at: 0.2, dur: 1, ease: "arrive" });
  f.focus.on(f.q(".button", card), { at: 3, dur: 0.8 });
  f.beat("intro", 0, { title: "Intro", shows: "A card arrives.", talk: ["Say hello."] });
});
```

The frame is `width` by `height` design units; the renderer multiplies by `--dsf`. The film lasts until `tail` seconds (default 0.8) after the last thing that moves, or for `duration` if that is given. Everything lives in the **world**; the camera is one transform on it. The focus scrim, the overlay (`f.overlay`, for a heads-up display) and the motion-blur layer are in screen space above or around it.

### Timeline

| Call | What it does |
|------|--------------|
| `f.to(target, props, { at, dur, ease, stagger })` | Tween. `props` maps a property to its end value, a `[from, to]` pair, or `{ from, to, ease, dur, delay }`. Without a from, a property starts where its last tween left it; with one, it holds that value until the tween starts, so an entrance is hidden until it begins. Targets: element, list, or selector. |
| `f.set(target, props, at = 0)` | A step. |
| `f.fn({ at, dur, ease }, (p, t) => …)` | Anything else. Runs every frame with eased progress 0..1 (0 before, 1 after), so it must be a pure function of `p`. |
| `f.type(el, text, { at, dur, seed, caret, sound })` | Typing with a seeded, uneven cadence (spaces quick, punctuation lingers). `caret` is an element that gets a `data-typing` attribute while the typing runs. Each character ticks a key sound unless `sound: false`. |
| `f.text(el, [[at, text], …], html?)` | Swap text or HTML at times. Before its first step an element shows what it held when `text` was first called; repeat calls for one element add steps. |
| `f.cls(target, name, { from, to })` | Toggle a class over a window. |
| `f.beat(id, at, { title, shows, talk })`, `f.cue(label, at)` | The beat sheet. A beat ends where the next starts. A cue is a moment inside a beat worth landing a word on; `still --cues` takes a frame at each. |
| `f.sound(kind, at, { gain, pan, panTo, dur, pitch })` | A sound at a time (see Sound). |
| `f.job(at, run)` | Runs once after the film is built and fonts are in, in time order. For anything that must measure layout as it will be at `at`. |
| `f.q(selector, root?)`, `f.qa(...)` | Find one element or all; they throw when nothing matches, so a typo shows up when the film builds. |
| `f.rectAt(el, t)` | World rect of an element as it is at time `t`. |

Properties: `x y z scale scaleX scaleY rotate rotateX rotateY skewX skewY perspective opacity blur backdropBlur brightness contrast saturate hue grayscale draw clipTop clipRight clipBottom clipLeft clipRadius`, any CSS custom property (`--name`), and any other CSS property by its camelCase name (numbers get `px`; colors and `px`/`%` strings interpolate, colors in OKLab). `draw` is an SVG stroke 0..1.

Eases: `linear`, `in/out/inOut` + `Quad Cubic Quart Quint`, `inOutSine outSine`, `in/out/inOutExpo`, `outBack`, `smooth` (camera default), `glide` (default), `arrive` (quick out, long tail), `pop` (spring), or `bezier(a,b,c,d)`, `spring(bounce)`, `back(s)`.

### Camera, cursor, focus

- `f.camera.start(target)` frames something from the first frame. `f.camera.to(target, { at, dur, ease, pad, fit, zoom, zoomBy, anchor, shift, mode, rho, sound })` moves. `target` is an element or selector (measured as it will be when the move ends), a world rect, a view, `null` (stay put, apply `zoomBy`/`shift`), or a function `(t) => rect`. `mode: "fly"` (default) is the van Wijk and Nuij zoom-and-pan curve: on a long move the camera pulls back, travels and pushes in at an even perceived speed (`rho` is how far it is willing to pull back). `mode: "lerp"` is a plain pan with an exponential zoom. A move starts from where the camera actually is.
- `f.camera.path(at, legs, { sound })` is **one continuous move through several framings**. Each leg is `{ dur, target, pad, fit, zoom, zoomBy, shift, anchor }`: from where the camera is at `at`, it passes the target of each leg `dur` seconds after the one before and ends at rest on the last. It does not stop at the keys in between, which is what makes two moves one; repeat a target to hold there. Pan and zoom are interpolated separately (zoom in logarithms) on a monotone curve, so the camera never overshoots a key it is heading past. That suits moves inside one window; between distant windows `camera.to` with `fly` is the better curve. `camera.to` and `camera.path` return the time the move ends.
- **Motion blur** is automatic: along the camera's own velocity, as a shutter open for half a frame (180°). A pan blurs along the pan, so fast moves read as motion and not as strobing. Only speed beyond what 60 fps already carries smoothly (a third of the frame width per second) blurs, and the blur eases in from nothing along a knee, so it never switches on between two frames and a slow move stays sharp.
- `f.cursor.place|to|click|show|hide`: a pointer that follows a bowed path, presses on a click and leaves a ripple. It scales gently with the camera. Every click makes a click sound.
- `f.focus.on(target, { at, dur, pad, radius, blur, dim })` blurs and dims everything but a rounded window around the target; calling it again racks focus to a new target. `f.focus.off(...)` releases it.

### Conventions that bite

- The engine writes `translate`, `scale` and `rotate` as the individual CSS properties. A static `transform` in your CSS composes with them, so for an animated element use `left/top` for placement and leave `transform` alone (or accept the sum).
- CSS transitions and animations are switched off; time is the engine's.
- Typed text and swapped text change an element's size over time. Measure heights **at build time**, while the markup still holds all its text (the first frame empties typed spans), and give typed rows a `min-height`.
- Don't put a huge element under `backdrop-filter`: a 9000-unit scrim composited to nothing at 3x. The focus scrim is viewport-sized for that reason.
- Elements are painted in DOM order. The cursor has `z-index: 1000` so windows added later don't cover it.
- `lint` flags four things on each camera move: it starts before the previous one ends; it starts less than 0.4 s after the last one ended (the camera stops dead and goes again: make it one move with `camera.path`, or hold for 0.4 s); its peak is above 1.6 frame widths per second; or its speed jumps by more than 0.8 frame widths per second inside a frame. `probe` prints the camera view at a time and the world rect of selectors, which is how to find a shot that frames the wrong thing.

## Sound

A film asks for sounds and the engine makes them from arithmetic (no samples, nothing to download), the same every time. The picture never depends on them, so a sound can change without a new render.

Three kinds come without being asked for:

- **click**, for each `f.cursor.click`, panned to where the pointer is on screen.
- **key**, for each character `f.type` types (not for one-character strings), a little lower and quieter on spaces, panned to the typed element.
- **whoosh**, for each camera move of at least 0.5 s that peaks at 0.45 frame widths per second or more. It sweeps across the stereo field the way the picture slides and is louder the faster the move.

Turn one off for a call with `sound: false` on `f.type`, `f.camera.to` or `f.camera.path` (a click always sounds). Everything else is asked for with `f.sound(kind, at, { gain, pan, panTo, dur, pitch })`: `gain` in dB (0 is the sound's own level), `pan` from -1 (left) to 1, `panTo` to sweep the pan to another value over the sound, `dur` for the two sounds that stretch, `pitch` in semitones.

| Kind | What it is | Length |
|------|------------|--------|
| `click` | a soft tap | 0.1 s |
| `key` | smaller, higher and quieter than a click | 0.05 s |
| `tick` | a very small high tick, for a checklist line settling | 0.07 s |
| `pop` | a soft bubble, a short rise in pitch that decays | 0.2 s |
| `pass` | a clear soft ping; a run of them can climb with `pitch` | 0.8 s |
| `fail` | a low short thud, not an alarm | 0.6 s |
| `chime` | four bell notes, an arpeggio that rings out | 2.4 s |
| `bloom` | the wordmark landing: a low swell with a soft shimmer | 2.6 s |
| `whoosh` | noise through a band that opens and closes | `dur`, 0.8 s by default |
| `swell` | noise that climbs and closes just before it lands | `dur`, 1.6 s by default |

Each kind has its own peak, between -17 and -29 dBFS, set well under a voice at -16 LUFS so a sound is felt more than noticed. The soundtrack lays every cue at its time and in its place in the stereo field, over a quiet room tone (brown noise, a breath of hush, a slow swell about every sixteen seconds; -49 dBFS RMS a side by default) so the pauses between words are never digital silence.

```bash
npx tsx $M sound $F          # output/motion/$F/sound/soundtrack.wav, and what is in it
```

`sound` prints how many cues of each kind there are and the soundtrack's peak, RMS, and quietest and loudest tenth of a second. Its flags are `--room <dB>` (room tone level), `--no-room` and `--sound-level <dB>` (a trim on every cue, default 0); `voiceover` takes the same three.

## Voiceover

```bash
npx tsx $M voiceover $F --fit            # where each line goes and what each beat needs; --write saves it
npx tsx $M voiceover $F --check          # speak the lines, print when each starts and ends, flag clashes; mixes nothing
npx tsx $M voiceover $F                  # voice and sounds onto the 1080p render -> output/motion/$F/narrated/$F.mp4
npx tsx $M voiceover $F --voice am_michael --speed 1.0
npx tsx $M voiceover $F --no-sound       # the voice alone
npx tsx $M voiceover $F --to /tmp/draft.mp4   # name the narrated file (--out is the output directory)
npx tsx $M voiceover $F --room -52 --sound-level -3   # quieter room tone, every sound 3 dB down
```

The script is `films/<name>/narration.json`: a voice, a speed and lines of `{ id, beat, at, text }`, where `at` is seconds after the beat's start, so retiming a beat moves its words with it. Kokoro speaks them (the same model and `recorder/narrate.py` the PR videos use; 54 voices are installed, `af_heart` is the default here).

**The mix.** The voice goes through the recorders' cleanup chain (high-pass, denoise, gate) so there is no hiss under it, then loudness at -16 LUFS. Loudnorm is run twice, measure then apply, because it only holds a static gain when it is given measured values; a dynamic one would lift the hush between words. The film's sound cues over the room tone are added to that, and a limiter at -1.5 dBFS catches any peak where a sound lands on a loud syllable. The result is muxed with `-c:v copy`, so it takes seconds, with the chapters kept, and the loudness of the finished file is printed. A different voice is a re-run. `--video <mp4>` mixes onto another video than the 1080p render.

**Checks.** `--check` reports a line that runs into the next (less than 0.25 s clear), off the film's end, or more than 0.6 s past its own beat. Before it mixes, `voiceover` also builds the film again and compares it with the `beats.json` beside the render: the length and every beat's start must match within 0.05 s, or it says what moved ("The render beside this film is out of date") and stops. `--force` mixes anyway.

**`--fit`.** Retiming by hand is a loop of speaking, reading the end of each line and nudging an `at`. `--fit` does the arithmetic: in each beat the lines go in script order, the first `--lead` seconds after the beat starts (default 0.5) and each next one `--gap` seconds after the last ends (default 0.35). Starts are rounded up to a hundredth, so a gap is never a hair short. For each beat it prints the lines with their start, end and length, the `at` a line has now when it changes, then:

```
needs at least 8.84 s, beat is 6.00 s, difference -2.84 s  TOO SHORT
```

"Needs at least" is the last line's end plus 0.6 s. Without `--write` nothing changes. With `--write`, only the `at` numbers in narration.json are replaced, in place: ids, order, text, line breaks and blank lines stay as they were. `--voice` and `--speed` apply to `--fit` too, and if they differ from the file `--write` says so, because the `at` values then fit that voice.

**Pins.** A line with `"pin": true` keeps its `at`: `--fit` places the other lines around it (the line after a pinned one starts a gap after it ends), warns, naming both, when a line before it would end less than `--gap` before it starts, and `--write` never changes a pinned `at`.

**Clips.** They are kept in `output/motion/<film>/voice/fit-cache` by what they say (voice, speed and words), and `--fit`, `--check` and the mix all use them, so only a line whose words changed is spoken again.

Write numbers and acronyms as they should be said: "Q A", "pull request".

## Reviewing from stills

```bash
npx tsx $M still $F --at 1.5,40,41.5 --sheet     # the times you pick; sheet.png (3 across)
npx tsx $M still $F --beats 2 --cues --sheet     # 2 per beat, plus each cue; sheet-01.png... (4 across, 12 a sheet)
```

`--beats N` (default 2) takes N times spread evenly through every beat: the middle of each of N equal parts, so none lands on a cut. `--cues` adds the time of each beat cue; `--beats 0 --cues` takes the cues alone, and `--at` adds times of your own to either. The film is opened once, in one browser, whatever the count. Frames are named `still-001-t12.40.png` in `output/motion/<film>/stills/`. With `--sheet` they are tiled into `sheet-01.png`, `sheet-02.png`... of 12 frames, 4 across (`--columns` changes that, `--tile <px>` the width of a frame, 640 by default), each frame labelled with its time, its beat and `cue` when it is one. The command prints, for each sheet, which times are on it, row by row. Without `--sheet` it lists the frames. Each run clears the `still-*` files of the last one, and with `--beats` its `sheet-*` files too. `--at` alone works as it always did.

## The render queue

`render` and `preview` open up to four windows and use every core, and two running at once slow each other down and fight over workspace 9. So they take turns, through a lock file, `output/motion/.render.lock`: JSON with the pid, film, command and start time, created so that only one process can create it. If a live process holds it, the second one prints

```
[motion] waiting for roam-0230-launch render started 16:41 (pid 1234567)
```

and looks again every 3 seconds, going as soon as the lock is gone. A lock whose process has died (killed, crashed) is taken over, with a line saying so. The lock is given up when the run ends, fails, or gets SIGINT, SIGTERM or SIGHUP. `still`, `info`, `lint`, `probe`, `sound` and `voiceover` don't wait (the ones that open a browser open one window). If a lock stays on a live process that is not a render, the pid was reused: delete the file. `MOTION_RENDER_LOCK=<file>` uses another lock file.

## How the renderer is fast

Measured on this machine (4K frames, simple UI film):

| Capture | ms per frame |
|---------|-------------|
| Playwright `page.screenshot` | about 200 |
| raw CDP `Page.captureScreenshot` with `optimizeForSpeed` | about 85 |

Two details make the CDP path work. A second CDP session does not inherit Playwright's emulated device scale factor, and without it the capture comes back at the display's own scale (1340x754 here, not 3840x2160), so each worker sends its own `Emulation.setDeviceMetricsOverride`. And Chromium serializes screenshot encoding inside a browser, so extra pages in one browser add nothing, while one browser per worker scales. With four workers the smoke film renders at about 40 fps at 4K, and the launch film previews at 145 fps at 720p. `optimizeForSpeed` only trades PNG size for time; the pixels stay lossless. Encoded frames match the lossless stills to about 47 dB.

Output is H.264 High, yuv420p, BT.709 tagged and converted with the BT.709 matrix, one decode feeding both sizes.

A process that finishes but lingers is a timer left running; `timeout()` in `render.ts` clears its own.

## Tests

```bash
cd discourse-graph/apps/roam
npx tsx --test ../../../dg-films/motion/__tests__/*.test.ts
npx tsc -p ../../../dg-films/motion/tsconfig.json     # strict
```

The tests cover what has no browser in it: easing, color, tracks, camera math (fly, camera paths, motion blur), typing, beat sheet and chapters, camera lint, frame planning, ffmpeg arguments, narration placement, the stale-render check, the sounds and the soundtrack, fit placement (pinned lines too) and the write-back to narration.json, the clip cache, the command-line parser, which times `still --beats` picks and how the sheets are laid out, and the render lock. The browser side is checked by `still`, `lint` and `probe` against the film.
