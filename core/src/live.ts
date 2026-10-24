import { ESCAPE_CHAR, convertPair } from "./rules";

/**
 * An edit for the host to apply at the caret: delete `deleteBefore` characters
 * to the left of the caret, then insert `insert`. When an action is returned the
 * host must NOT also apply the user's keystroke.
 */
export interface Action {
  deleteBefore: number;
  insert: string;
}

export interface LiveOptions {
  /** `\` between the two letters of a pair keeps them literal (default true). */
  backslashEscape: boolean;
}

const DEFAULT_OPTIONS: LiveOptions = { backslashEscape: true };

/**
 * Live typing state machine. The host calls:
 * - `onInsert(before, ch)` when the user types a single character,
 * - `onBackspace(before)` when the user presses Backspace,
 * - `reset()` on anything else (other keys, caret movement, clicks, focus or
 *   selection change, IME composition).
 * `before` is the text left of the (collapsed) caret; only its last two
 * characters are used. Everything is re-checked against `before`, so stale
 * state never edits the wrong text.
 */
export class LiveEngine {
  private options: LiveOptions;
  /** Set right after a conversion: what we inserted and what the user typed. */
  private undo: { inserted: string; original: string } | null = null;
  /** Set right after the escape char was typed. */
  private escapePending = false;

  constructor(options: Partial<LiveOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  setOptions(options: Partial<LiveOptions>): void {
    this.options = { ...this.options, ...options };
    this.reset();
  }

  reset(): void {
    this.undo = null;
    this.escapePending = false;
  }

  onInsert(before: string, ch: string): Action | null {
    const escaped = this.escapePending;
    this.reset();
    if (ch.length !== 1) return null;

    if (this.options.backslashEscape) {
      if (escaped && before.endsWith(ESCAPE_CHAR) && before.length >= 2) {
        const first = before[before.length - 2];
        if (convertPair(first, ch) !== null) return { deleteBefore: 1, insert: ch };
      }
      if (ch === ESCAPE_CHAR) {
        this.escapePending = true;
        return null;
      }
    }

    const prev = before[before.length - 1];
    if (prev === undefined) return null;
    const converted = convertPair(prev, ch);
    if (converted === null) return null;
    this.undo = { inserted: converted, original: prev + ch };
    return { deleteBefore: 1, insert: converted };
  }

  onBackspace(before: string): Action | null {
    const undo = this.undo;
    this.reset();
    if (undo && before.endsWith(undo.inserted)) {
      return { deleteBefore: undo.inserted.length, insert: undo.original };
    }
    return null;
  }
}
