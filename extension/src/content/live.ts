// Connects LiveEngine to the page's input events.
//
// We intercept `beforeinput` (capture phase on window, so we run before page handlers),
// cancel the keystroke when it completes a pair and insert the new letter instead.
// The trigger key never appears, so there is no flicker and the edit is one undo step.

import { LiveEngine } from "@uzbek-telex/core";
import { textBeforeCaret, replaceBeforeCaret } from "./caret";
import { eligibleTarget, type TextField } from "./eligibility";

/** Keys that don't clear the undo/escape state on keydown. */
const NEUTRAL_KEYS = new Set([
  "Backspace", "Shift", "Control", "Alt", "AltGraph", "Meta", "CapsLock", "Fn", "Dead",
  "Process", "Unidentified",
]);

export class LiveTyping {
  private readonly engine = new LiveEngine();
  private active = false;
  private composing = false;
  /** True while we apply our own edit (execCommand re-enters beforeinput). */
  private applying = false;
  /** Field + text before the caret after the last edit we saw; used to detect caret moves. */
  private expected: { el: TextField | HTMLElement; before: string | null } | null = null;

  constructor() {
    const opts = { capture: true };
    window.addEventListener("beforeinput", (e) => this.onBeforeInput(e), opts);
    window.addEventListener("input", (e) => this.onInput(e), opts);
    window.addEventListener("keydown", (e) => this.onKeyDown(e), opts);
    window.addEventListener("compositionstart", () => this.setComposing(true), opts);
    window.addEventListener("compositionend", () => this.setComposing(false), opts);
    for (const type of ["mousedown", "focusin", "focusout", "drop", "cut", "paste"]) {
      window.addEventListener(type, () => this.reset(), opts);
    }
    document.addEventListener("selectionchange", () => this.onSelectionChange());
  }

  setActive(active: boolean): void {
    this.active = active;
    this.reset();
  }

  setBackslashEscape(enabled: boolean): void {
    this.engine.setOptions({ backslashEscape: enabled });
  }

  /** Lets other features (context menu conversion) edit without re-triggering us. */
  runAsOwnEdit<T>(fn: () => T): T {
    this.applying = true;
    try {
      return fn();
    } finally {
      this.applying = false;
      this.reset();
    }
  }

  private reset(): void {
    this.engine.reset();
    this.expected = null;
  }

  private setComposing(composing: boolean): void {
    this.composing = composing;
    this.reset();
  }

  private onBeforeInput(e: InputEvent): void {
    if (this.applying || !this.active) return;
    if (!e.isTrusted || e.isComposing || this.composing) {
      this.reset();
      return;
    }
    const isInsert = e.inputType === "insertText" && e.data !== null && [...e.data].length === 1;
    const isBackspace = e.inputType === "deleteContentBackward";
    if (!isInsert && !isBackspace) {
      this.reset();
      return;
    }
    const el = eligibleTarget(e.composedPath()[0]);
    if (!el) {
      this.reset();
      return;
    }
    const before = textBeforeCaret(el);
    if (before === null) {
      this.reset();
      return;
    }

    const action = isInsert ? this.engine.onInsert(before, e.data!) : this.engine.onBackspace(before);
    if (!action) return;

    e.preventDefault();
    this.applying = true;
    try {
      replaceBeforeCaret(el, action.deleteBefore, action.insert);
    } finally {
      this.applying = false;
    }
    this.remember(el);
  }

  private onInput(e: Event): void {
    if (!this.active || this.applying) return;
    const el = eligibleTarget(e.composedPath()[0]);
    if (el) this.remember(el);
  }

  private remember(el: TextField | HTMLElement): void {
    this.expected = { el, before: textBeforeCaret(el, 4) };
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.isComposing) return;
    const typesChar = [...e.key].length === 1 && !e.ctrlKey && !e.metaKey;
    if (!typesChar && !NEUTRAL_KEYS.has(e.key)) this.reset();
  }

  /** Caret moved by something other than typing (script, touch, IME …) → forget state. */
  private onSelectionChange(): void {
    const expected = this.expected;
    if (!expected) return;
    if (textBeforeCaret(expected.el, 4) !== expected.before) this.reset();
  }
}
