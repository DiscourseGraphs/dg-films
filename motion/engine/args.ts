// The command line: words, and --flags. A switch stands alone. Any other flag
// takes the word after it as its value when there is one (--room -52) and is
// just "on" when there is none.

export type Flags = Map<string, string | true>;

// Flags that never take a value, so `voiceover --check my-film` still finds the
// film. Anything starting with no- is one too (--no-sound, --no-room, --no-1080).
const SWITCHES = new Set(["check", "force", "headless", "sheet", "cues", "write", "fit"]);

export const isSwitch = (name: string): boolean => SWITCHES.has(name) || name.startsWith("no-");

export const parseArgs = (argv: readonly string[]): { positional: string[]; flags: Flags } => {
  const positional: string[] = [];
  const flags: Flags = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (!isSwitch(name) && next !== undefined && !next.startsWith("--")) {
      flags.set(name, next);
      i += 1;
    } else {
      flags.set(name, true);
    }
  }
  return { positional, flags };
};
