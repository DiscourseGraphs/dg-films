// What the runtime reports about a film, shared by the browser runtime and the
// node side that renders it and writes the beat sheet.

export type Cue = { at: number; label: string };

// The sounds a film asks for. The browser side only says what and when; the
// node side (sfx.ts, soundtrack.ts) makes them, so a film's picture never
// depends on audio and a render never has to be redone to change a sound.
export type SoundKind = "click" | "key" | "tick" | "pop" | "pass" | "fail" | "chime" | "whoosh" | "swell" | "bloom";

export type SoundCue = {
  at: number;
  kind: SoundKind;
  // Decibels relative to the sound's own level.
  gain: number;
  // -1 is the left speaker, 1 the right. `panTo` sweeps from `pan` to it over the sound.
  pan: number;
  panTo?: number;
  // How long a stretching sound (a whoosh, a swell) lasts, in seconds.
  dur?: number;
  // Semitones up or down.
  pitch: number;
};

export type Beat = {
  id: string;
  // A few words: what the beat is.
  title: string;
  at: number;
  end: number;
  // What the picture does, in a sentence, for the voiceover writer.
  shows: string;
  // Points the voiceover can make over this beat.
  talk: string[];
  // Moments inside the beat worth landing a word on.
  cues: Cue[];
};

export type MotionInfo = {
  title: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  beats: Beat[];
  // Left out by renders from before sound existed.
  sounds?: SoundCue[];
};

export type MotionApi = {
  ready: Promise<MotionInfo>;
  seek: (t: number) => void;
  // For the probe command: where the camera is and where an element sits.
  debug: {
    view: (t: number) => { cx: number; cy: number; zoom: number };
    rect: (selector: string, t: number) => { x: number; y: number; w: number; h: number };
    camera: (dt: number) => { samples: Array<[number, number, number, number]>; moves: Array<[number, number]> };
  };
};
