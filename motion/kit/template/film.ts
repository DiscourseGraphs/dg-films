import { addCss, defineFilm } from "../../engine/runtime";
import kitCss from "../../kit/kit.css";
import css from "./film.css";
import { close } from "./scenes/close";
import { feature } from "./scenes/feature";
import { open } from "./scenes/open";
import { buildWorld } from "./world";

addCss(kitCss); // tokens and every kit class
addCss(css); // this film's own look, after the kit so it can override a token

defineFilm({ title: "{{title}}", width: 1280, height: 720, fps: 60, tail: 0.4 }, (f) => {
  const world = buildWorld(f);
  open(world);
  feature(world);
  close(world);
});
