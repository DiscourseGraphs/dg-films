// Where each scene starts and ends in the finished video, so a report can
// point at the second a case begins and players can jump between cases. Both
// recorders log this as one "Chapters:" line and embed it in the mp4.

export type Chapter = {
  // 1-based, as the "Scene x/y" log lines count.
  index: number;
  name: string;
  startMs: number;
  endMs: number;
};

export const sceneChapters = ({
  marks,
  names,
  offsetMs,
  endMs,
}: {
  // When each scene started, in wall-clock ms.
  marks: number[];
  names: string[];
  // Wall-clock ms of the finished video's first frame.
  offsetMs: number;
  // Wall-clock ms the last scene ended.
  endMs: number;
}): Chapter[] =>
  marks
    .map((atMs, i) => ({
      index: i + 1,
      name: names[i] ?? `Scene ${i + 1}`,
      startMs: Math.max(0, Math.round(atMs - offsetMs)),
      endMs: Math.max(0, Math.round((marks[i + 1] ?? endMs) - offsetMs)),
    }))
    .filter((chapter) => chapter.endMs > chapter.startMs);

export const CHAPTERS_PREFIX = "Chapters: ";

export const chaptersLogLine = (chapters: Chapter[]): string =>
  `${CHAPTERS_PREFIX}${JSON.stringify(chapters)}`;

// ffmpeg's metadata format escapes =, ;, #, \ and newlines with a backslash.
const metaEscape = (text: string): string => text.replace(/[=;#\\\n]/g, (char) => `\\${char}`);

export const ffmetadata = (chapters: Chapter[]): string =>
  [
    ";FFMETADATA1",
    ...chapters.map(
      (chapter) =>
        `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${chapter.startMs}\nEND=${chapter.endMs}\ntitle=${metaEscape(chapter.name)}`,
    ),
    "",
  ].join("\n");

// m:ss, or h:mm:ss past an hour.
export const clock = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};
