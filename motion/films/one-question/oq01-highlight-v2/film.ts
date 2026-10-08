// One Question, episode 1: "Highlight it. It's a node." A finding under a paper
// becomes Evidence that keeps its paper; a short claim becomes a Claim by keyboard.
// tutorial-series/PLAN.md has the series; data.ts has every word on screen.
import { addCss, defineFilm } from "../../../engine/runtime";
import kitCss from "../../../kit/kit.css";
import skinCss from "../shared/skin.css";
import css from "./film.css";
import { play } from "./scenes";
import { END } from "./timeline";
import { buildWorld } from "./world";

addCss(kitCss);
addCss(skinCss);
addCss(css);

defineFilm({ title: "One Question 1/10 (v2): Highlight it. It's a node.", width: 1280, height: 720, fps: 60, duration: END }, (f) => {
  play(buildWorld(f));
});
