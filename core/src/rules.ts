import rules from "../rules.json";

/** Characters treated as the "ʻ" in oʻ / gʻ. */
export const APOSTROPHES: ReadonlySet<string> = new Set(rules.apostrophes.map((a) => a.char));

export const ESCAPE_CHAR: string = rules.escape.char;

interface Result {
  lower: string;
  upper: string;
}

const apostropheRules = new Map<string, Result>(rules.apostropheRules.map((r) => [r.first, r]));
const digraphRules = new Map<string, Result & { second: string }>(rules.digraphRules.map((r) => [r.first, r]));

/**
 * The new letter for the pair `first` + `second`, or null if the pair is not a trigger.
 * Both arguments must be single characters. Case follows `first` only.
 */
export function convertPair(first: string, second: string): string | null {
  const key = first.toLowerCase();
  let result: Result | undefined;
  if (APOSTROPHES.has(second)) {
    result = apostropheRules.get(key);
  } else {
    const d = digraphRules.get(key);
    if (d && second.toLowerCase() === d.second) result = d;
  }
  if (!result) return null;
  return first === key ? result.lower : result.upper;
}
