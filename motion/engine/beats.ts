// The beat sheet: when each beat of a film starts and ends, what the picture is
// doing, and what the voiceover can say over it. Written beside every full
// render, and embedded in the mp4 as chapters so a player can jump between
// beats.

import { clock, ffmetadata, type Chapter } from "../../recorder/chapters";
import type { Beat, MotionInfo } from "./types";

// A calm voiceover speaks about 2.3 words a second; leave a breath at each end.
const WORDS_PER_SECOND = 2.3;

export const stamp = (seconds: number): string => {
  const whole = Math.floor(seconds);
  const tenths = Math.round((seconds - whole) * 10);
  const carried = tenths === 10 ? 1 : 0;
  return `${clock((whole + carried) * 1000)}.${tenths % 10}`;
};

export const wordBudget = (beat: Pick<Beat, "at" | "end">): number =>
  Math.max(0, Math.floor(((beat.end - beat.at - 1) * WORDS_PER_SECOND) / 5) * 5);

export const chaptersOf = (info: MotionInfo): Chapter[] =>
  info.beats.map((beat, index) => ({
    index: index + 1,
    name: beat.title,
    startMs: Math.round(beat.at * 1000),
    endMs: Math.round(beat.end * 1000),
  }));

export const chapterMetadata = (info: MotionInfo): string => ffmetadata(chaptersOf(info));

export const beatSheetMarkdown = (info: MotionInfo): string => {
  const lines = [
    `# ${info.title}: beat sheet`,
    "",
    `${stamp(info.duration)} · ${info.fps} fps · ${info.width}×${info.height} design frame`,
    "",
    'Times are seconds into the video. "Words" is what fits at a calm pace with a breath at each end, so a rough ceiling, not a target.',
    "",
    "| # | Beat | In | Out | Length | Words |",
    "|---|------|----|-----|--------|-------|",
    ...info.beats.map(
      (beat, index) =>
        `| ${index + 1} | ${beat.title} | ${stamp(beat.at)} | ${stamp(beat.end)} | ${(beat.end - beat.at).toFixed(1)} s | ~${wordBudget(beat)} |`,
    ),
    "",
  ];
  info.beats.forEach((beat, index) => {
    lines.push(
      `## ${index + 1}. ${beat.title}`,
      "",
      `${stamp(beat.at)} to ${stamp(beat.end)} (${(beat.end - beat.at).toFixed(1)} s)`,
      "",
    );
    lines.push(`On screen: ${beat.shows}`, "");
    if (beat.talk.length) lines.push("You can talk about:", ...beat.talk.map((point) => `- ${point}`), "");
    if (beat.cues.length)
      lines.push("Land a word on:", ...beat.cues.map((cue) => `- ${stamp(cue.at)} ${cue.label}`), "");
  });
  return `${lines.join("\n").trimEnd()}\n`;
};
