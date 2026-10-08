// Inline SVG icons (Lucide-style strokes), so every icon is vector at any zoom.
// Blueprint's own glyphs are filled; these are drawn to the same sizes. This is
// both films' sets merged: where they differ (back/forward) the arrows win,
// because they are drawn from the extension's source.

const PATHS = {
  // marks
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  dot: '<circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/>',
  alert: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.8M12 17.5h.01"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/>',
  // arrows and carets
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  forward: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  caretDown: '<path d="M6 9l6 6 6-6"/>',
  caretUp: '<path d="M18 15l-6-6-6 6"/>',
  caretRight: '<path d="M9 6l6 6-6 6"/>',
  arrowUpRight: '<path d="M7 17L17 7M7 7h10v10"/>',
  // chrome
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  dotsH:
    '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  dotsV:
    '<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>',
  filter: '<path d="M21 4H3l7.5 8.6V19l3 1.7v-8.1z"/>',
  filterRemove: '<path d="M20 4H3l7.5 8.6V19l3 1.7v-6"/><path d="M16 14l5 5M21 14l-5 5"/>',
  sort: '<path d="M4 6h10M4 12h7M4 18h4M17 5v14M14 16l3 3 3-3"/>',
  sidebar: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M15 4.5v15"/>',
  panelStats: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15M13 9h4.5M13 12.5h4.5"/>',
  addColumnLeft: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M12 4.5v15M7.5 9.5v5M5 12h5"/>',
  layers: '<path d="m12 2.5 9.5 4.8L12 12 2.5 7.3z"/><path d="m2.5 12 9.5 4.7 9.5-4.7M2.5 16.7 12 21.5l9.5-4.8"/>',
  frame: '<path d="M22 6H2M22 18H2M6 2v20M18 2v20"/>',
  locate:
    '<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19"/>',
  command:
    '<path d="M7 7h10v10H7zM7 7V5.5A2.5 2.5 0 1 0 4.5 8H7M17 7V5.5A2.5 2.5 0 1 1 19.5 8H17M7 17v1.5A2.5 2.5 0 1 1 4.5 16H7M17 17v1.5a2.5 2.5 0 1 0 2.5-2.5H17"/>',
  keyboard:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9.5h.01M10 9.5h.01M14 9.5h.01M18 9.5h.01M7 14.5h10"/>',
  keyEnter: '<path d="M20 5v6a4 4 0 0 1-4 4H5M9 10.5L4.5 15 9 19.5"/>',
  keyShift: '<path d="M12 4.5L4.5 13H9v6h6v-6h4.5z"/>',
  keyEscape: '<circle cx="12" cy="12" r="8.5"/><path d="M15 9l-6 6M9 10v5h5"/>',
  // tools
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  pointer: '<path d="M5 3.5l13 6.3-5.6 1.8-1.8 5.6z" fill="currentColor"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15"/>',
  eraser:
    '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  textT: '<path d="M5 7V4.5h14V7M12 4.5v15M9 19.5h6"/>',
  note: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  // media and process
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  pr: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/>',
  ticket:
    '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  kit: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  run: '<circle cx="12" cy="12" r="9.5"/><path d="M10 8.2v7.6l6-3.8z" fill="currentColor" stroke="none"/>',
  proof:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  // roles
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  flask:
    '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
} as const;

// Names the two films used for the same glyph.
const ALIASES = { caret: "caretRight", dots: "dotsH" } as const;

export type IconName = keyof typeof PATHS | keyof typeof ALIASES;

const resolve = (name: string): string | undefined => {
  const alias = (ALIASES as Record<string, keyof typeof PATHS>)[name];
  return (PATHS as Record<string, string>)[alias ?? name];
};

export const iconNames = (): string[] => [...Object.keys(PATHS), ...Object.keys(ALIASES)];

export const hasIcon = (name: string): boolean => resolve(name) !== undefined;

export const icon = (name: IconName, size = 16, stroke = 2): string => {
  const body = resolve(name);
  if (!body) throw new Error(`No icon "${name}". Known: ${iconNames().join(", ")}`);
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
};
