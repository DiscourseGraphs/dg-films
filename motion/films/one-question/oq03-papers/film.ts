// One Question, episode 3: "Bring your papers in." ZoteroRoam's Search in library
// and Import metadata give a paper its page; `[[@` cites it in a note.
// tutorial-series/PLAN.md has the series; data.ts has every word on screen.
import { addCss, defineFilm } from "../../../engine/runtime";
import kitCss from "../../../kit/kit.css";
import contextCss from "../shared/parts-context.css";
import zoteroCss from "../shared/parts-zotero.css";
import skinCss from "../shared/skin.css";
import css from "./film.css";
import { play } from "./scenes";
import { END } from "./timeline";
import { buildWorld } from "./world";

addCss(kitCss);
addCss(skinCss);
addCss(contextCss);
addCss(zoteroCss);
addCss(css);

defineFilm({ title: "One Question 3/10: Bring your papers in", width: 1280, height: 720, fps: 60, duration: END }, (f) => {
  play(buildWorld(f));
});
