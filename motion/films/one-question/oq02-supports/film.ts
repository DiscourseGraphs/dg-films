// One Question, episode 2: "Say what the evidence supports." On the Evidence page,
// the context button, Add relation, Supports, the claim: the claim then lists it.
// tutorial-series/PLAN.md has the series; data.ts has every word on screen.
import { addCss, defineFilm } from "../../../engine/runtime";
import kitCss from "../../../kit/kit.css";
import contextCss from "../shared/parts-context.css";
import skinCss from "../shared/skin.css";
import css from "./film.css";
import { play } from "./scenes";
import { END } from "./timeline";
import { buildWorld } from "./world";

addCss(kitCss);
addCss(skinCss);
addCss(contextCss);
addCss(css);

defineFilm({ title: "One Question 2/10: Say what the evidence supports", width: 1280, height: 720, fps: 60, duration: END }, (f) => {
  play(buildWorld(f));
});
