// Camera lint: what the path of the camera will look like, found from the path
// itself rather than from pixels. Each move gets its peak speed in frame units
// per second (pan plus zoom, measured at the frame's edge), and the lint warns
// about the things that read as jank: a move that starts before the last one
// ended, a move that starts so soon after the last one that the camera stops
// dead and goes again, a move too fast to follow, and a speed that jumps within
// a frame.

import { stamp } from "./beats";
import type { CameraSamples } from "./render";

export type MoveReport = { at: number; end: number; peak: number; startSpeed: number; warnings: string[] };

// Speed of the picture at the edge of the frame, in frame widths per second.
const speeds = (samples: CameraSamples["samples"], width: number): number[] =>
  samples.map((sample, i) => {
    if (i === 0) return 0;
    const [t0, x0, y0, z0] = samples[i - 1];
    const [t1, x1, y1, z1] = sample;
    const dt = t1 - t0;
    const pan = Math.hypot((x1 - x0) * z1, (y1 - y0) * z1);
    const zoom = Math.abs(Math.log(z1 / z0)) * (width / 2);
    return (pan + zoom) / dt / width;
  });

// `hold` is the shortest rest between two moves that reads as a pause: any less
// and it reads as a stutter.
export const lintCamera = (data: CameraSamples, limits = { peak: 1.6, jump: 0.8, hold: 0.4 }): MoveReport[] => {
  const speed = speeds(data.samples, data.width);
  const dt = data.samples.length > 1 ? data.samples[1][0] - data.samples[0][0] : 1 / 60;
  const reports = data.moves.map(([at, end], index): MoveReport => {
    const first = Math.max(1, Math.floor(at / dt));
    const last = Math.min(speed.length - 1, Math.ceil(end / dt) + 1);
    const slice = speed.slice(first, last + 1);
    const peak = slice.length ? Math.max(...slice) : 0;
    const startSpeed = speed[Math.min(speed.length - 1, first + 1)] ?? 0;
    const warnings: string[] = [];
    const previous = data.moves[index - 1];
    if (previous && at < previous[1] - 1e-6)
      warnings.push(`starts ${(previous[1] - at).toFixed(2)} s before the move at ${stamp(previous[0])} ends`);
    else if (previous && at - previous[1] < limits.hold)
      warnings.push(
        `starts ${(at - previous[1]).toFixed(2)} s after the move at ${stamp(previous[0])} ends: the camera stops dead and goes again; make it one move (camera.path) or hold ${limits.hold} s`,
      );
    if (peak > limits.peak)
      warnings.push(`peak speed ${peak.toFixed(2)} frame widths per second is too fast to follow`);
    for (let i = first + 1; i <= last; i += 1) {
      if (Math.abs(speed[i] - speed[i - 1]) > limits.jump) {
        warnings.push(`speed jumps at ${stamp(i * dt)}`);
        break;
      }
    }
    return { at, end, peak, startSpeed, warnings };
  });
  return reports;
};

export const formatLint = (reports: MoveReport[]): string =>
  [
    "camera move        length   peak (frame widths/s)",
    ...reports.map(
      (r) =>
        `${stamp(r.at).padEnd(8)} to ${stamp(r.end).padEnd(8)} ${(r.end - r.at).toFixed(1).padStart(4)} s   ${r.peak.toFixed(2).padStart(5)}${r.warnings.length ? `   ! ${r.warnings.join("; ")}` : ""}`,
    ),
    "",
    `${reports.filter((r) => r.warnings.length).length} of ${reports.length} moves have warnings.`,
  ].join("\n");
