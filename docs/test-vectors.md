# Test vector format (for porters)

`core/test-vectors.json` is shared by every implementation. A port is correct only when it
passes **all** vectors. Do not copy vectors into other files — load this one.

```json
{
  "version": 1,
  "text": [ { "input": "Oʻzbekiston", "expected": "Özbekiston" } ],
  "live": [ { "keys": ["s", "h", "Backspace"], "expected": "sh", "options": { "backslashEscape": true } } ]
}
```

## `text`
Call your whole-string conversion on `input`; the result must equal `expected` exactly.

## `live`
Simulate a text editor:

1. Start with an empty buffer, caret at position 0, a fresh engine.
   `options` (optional) configures the engine; `backslashEscape` defaults to `true`.
2. For each entry in `keys`:
   - **a single character** (one Unicode code point): ask the engine with the text before the
     caret. If it returns an action, delete `deleteBefore` characters left of the caret and insert
     `insert`; otherwise insert the character at the caret.
   - **`"Backspace"`**: ask the engine; apply its action, or else delete one character left of
     the caret (if any).
   - **`"ArrowLeft"` / `"ArrowRight"`**: reset the engine, move the caret by one (clamped).
3. The final buffer must equal `expected`.

`core/src/simulate.ts` is the reference implementation of this procedure. JSON escaping note:
`"\\"` is a single backslash character.

## Adding vectors
Add the case to the JSON, run `npm test`, and mention the reason in your commit message.
Vectors are never removed without discussion — other ports depend on them.
