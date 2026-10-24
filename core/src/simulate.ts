import { LiveEngine, type Action, type LiveOptions } from "./live";

/**
 * Reference host for live test vectors: a plain text buffer with a caret.
 * Keys are single characters or the named keys Backspace, ArrowLeft, ArrowRight.
 * Returns the final buffer.
 */
export function simulate(keys: readonly string[], options?: Partial<LiveOptions>): string {
  const engine = new LiveEngine(options);
  let text = "";
  let caret = 0;

  const apply = (a: Action) => {
    text = text.slice(0, caret - a.deleteBefore) + a.insert + text.slice(caret);
    caret += a.insert.length - a.deleteBefore;
  };

  for (const key of keys) {
    const before = text.slice(0, caret);
    switch (key) {
      case "Backspace": {
        const action = engine.onBackspace(before);
        if (action) apply(action);
        else if (caret > 0) apply({ deleteBefore: 1, insert: "" });
        break;
      }
      case "ArrowLeft":
        engine.reset();
        caret = Math.max(0, caret - 1);
        break;
      case "ArrowRight":
        engine.reset();
        caret = Math.min(text.length, caret + 1);
        break;
      default: {
        if ([...key].length !== 1) throw new Error(`Unknown key in test vector: ${key}`);
        apply(engine.onInsert(before, key) ?? { deleteBefore: 0, insert: key });
      }
    }
  }
  return text;
}
