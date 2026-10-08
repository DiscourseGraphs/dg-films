import { addCss, defineFilm, html } from "../../engine/runtime";
import css from "./film.css";

addCss(css);

defineFilm({ title: "Engine smoke test", width: 1280, height: 720, fps: 60 }, (f) => {
  const a =
    html(`<div class="card" style="left:90px;top:200px;"><h2>Search</h2><div class="field"><span id="typed"></span></div>
    <div class="btn" id="go"><svg viewBox="0 0 24 24"><path id="tick" d="M5 12.5l4.5 4.5L19 7.5"/></svg><span>Run</span></div></div>`);
  const b = html(`<div class="card" style="left:1500px;top:260px;width:460px"><h2>Cases</h2>
    <div class="row"><i class="dot"></i>A format with parentheses matches</div>
    <div class="row"><i class="dot"></i>Node search lists the page</div>
    <div class="row"><i class="dot"></i>Default node types still match</div></div>`);
  f.world.append(a, b);

  const typed = f.q("#typed", a);
  const go = f.q("#go", a);
  const rows = f.qa(".row", b);

  f.camera.start(a, { pad: 0.2 });
  f.beat("enter", 0, { title: "Enter", shows: "A card springs in and gets typed into." });
  f.set(a, { opacity: 0, y: 30, scale: 0.97 });
  f.to(a, { opacity: 1, y: 0, scale: 1 }, { at: 0.2, dur: 1.0, ease: "spring(.3)" });
  f.type(typed, "PK baseline claim", { at: 1.0, dur: 1.2 });

  f.cursor.place({ x: 80, y: 520 }, { at: 0 });
  f.cursor.show(1.4);
  f.cursor.to(go, { at: 1.6, dur: 1.0, anchor: { x: 0.35, y: 0.5 } });
  f.cursor.click(2.75);

  f.beat("press", 2.4, {
    title: "Press",
    shows: "The pointer lands on Run, the button turns green, and a check draws.",
  });
  f.to(go, { backgroundColor: ["#2c62c9", "#15805a"] }, { at: 2.8, dur: 0.35, ease: "outQuad" });
  f.to(f.q("#tick", a), { draw: [0, 1] }, { at: 2.85, dur: 0.4, ease: "outCubic" });
  f.focus.on(go, { at: 3.3, dur: 0.8, pad: { x: 40, y: 24 }, radius: 22 });
  f.focus.off({ at: 4.6, dur: 0.6 });

  f.beat("fly", 5.0, { title: "Fly", shows: "The camera pulls back and lands on the case list." });
  f.camera.to(b, { at: 5.0, dur: 1.8, pad: 0.22 });
  f.set(rows, { opacity: 0, x: -16 });
  f.to(rows, { opacity: 1, x: 0 }, { at: 6.2, dur: 0.6, ease: "outCubic", stagger: 0.18 });
  rows.forEach((row, i) => f.cls(row, "on", { from: 7.0 + i * 0.35 }));
  f.camera.to(rows[1], { at: 8.2, dur: 1.4, pad: { x: 0.12, y: 0.32 } });
});
