# Architecture

## Overview

```
core/rules.json ──► every implementation (TS now; Rust, Swift, C#, IBus/Fcitx5 later)
core/test-vectors.json ──► every implementation must pass all vectors
core/src (TypeScript reference)
  ├─ convertText(text)            text mode (pasted/selected text)
  └─ LiveEngine                   live mode (keystroke by keystroke)
extension/ (Chrome MV3) bundles core with esbuild
desktop/   planned (see desktop/README.md)
```

## Live engine contract

The engine never touches text itself. The host (browser, OS hook, IME) asks it what to do and
applies the answer:

| Host event | Call | Engine answer |
|---|---|---|
| user types one character | `onInsert(before, ch)` | `null` (let the key through) or `{deleteBefore, insert}` (cancel the key, delete N chars left of the caret, insert text) |
| user presses Backspace | `onBackspace(before)` | `null` (normal delete) or an action that restores the original pair |
| anything else: other keys, caret moves, clicks, focus/selection change, IME composition | `reset()` | — |

`before` is the text left of a collapsed caret (only the last two characters are used). The
engine keeps just two pieces of state — the last conversion (for Backspace undo) and "the last
key was `\`" (for the escape) — and re-checks both against `before`, so stale state can never
edit the wrong text. Conversion fires only when the *second* letter is typed, so text restored
by undo, pasted text or existing text is never converted on its own.

The "type the key again to undo" Telex behaviour is deliberately **not** implemented:
`ş` is legitimately followed by `h` (`mashhur` → `maşhur`).

## How the extension replaces text

1. A content script (all frames, `document_start`) listens to `beforeinput` in the **capture
   phase on `window`**, so it runs before the page's own handlers.
2. Only trusted `insertText` events with a single character and `deleteContentBackward` are
   considered; nothing happens during IME composition (`isComposing` or between
   `compositionstart`/`compositionend`).
3. The target (from `composedPath()[0]`, so shadow DOM works) must be a `textarea`, an
   `input[type=text|search]` or a contenteditable element, and must not be inside a known code
   editor. Password, email, URL, number and tel inputs are never touched.
4. When the engine returns an action, the event is cancelled (`preventDefault`), the characters
   to delete are selected (`setSelectionRange` for fields, `Selection.modify('extend',
   'backward', 'character')` for contenteditable) and the replacement is inserted with
   `document.execCommand('insertText')`.

Reading the text before the caret in contenteditable walks back through text nodes and
**inline** elements only (`<b>`, `<span>`, `<a>` …). It stops at block elements and `<br>`,
so the last letter of one paragraph never pairs with the first letter of the next.

### Trade-offs

| Choice | Why | Cost |
|---|---|---|
| Cancel the trigger key in `beforeinput` | The `h` never appears: no flicker, one edit instead of two. | Pages that insert text without `beforeinput` (custom key handling, canvas editors) are not converted. |
| `execCommand('insertText')` | The only API that (a) puts the edit on the browser's native undo stack, so Ctrl+Z works, (b) fires real `beforeinput`/`input` events so React, ProseMirror, Lexical, Slate, Gmail and Telegram keep their internal state in sync, (c) keeps the caret where the user expects. | Deprecated (but universally supported and still the recommended way to do this). If it ever returns `false`, we fall back to `setRangeText` / Range edits plus a synthetic `input` event, which loses native undo. |
| Fix up after the fact on `input` instead | Rejected: visible flicker, two undo steps, and frameworks may have already processed the wrong text. | — |
| Ctrl+Z vs Backspace undo | Ctrl+Z undoes the conversion natively (`aş` → `as`). Backspace undo is our own feature on top (`ş` → `sh`). | — |

### When the undo/escape state is cleared
Any keydown that doesn't type a character (arrows, Home/End, Enter, Tab, Escape, any
Ctrl/⌘ shortcut), `mousedown`, `focusin`/`focusout`, composition, paste/cut/drop, and
`selectionchange` when the text before the caret differs from what it was after the last edit
(catches caret moves by scripts or touch).

## Settings and messaging

`chrome.storage.local` holds `{ enabled, backslashEscape, disabledSites }`. Every content
script listens to `storage.onChanged`. The top frame's content script reports its
active/inactive state to the service worker, which sets the per-tab badge and icon; the popup
asks the tab's content script for its hostname. This avoids the `tabs` and `activeTab`
permissions entirely — only `storage` and `contextMenus` are requested.

The context-menu command converts the selection in place when it is editable (text fields:
one `insertText`; contenteditable: each text node separately, replacing only the changed span,
so formatting is kept), or shows the result in a small panel with a copy button when the
selection is read-only.

## Known limitations
- Canvas-based editors (Google Docs, Sheets, Slides, Figma) don't work (confirmed for Docs,
  2026-10-24). Docs types into a hidden, always-empty contenteditable inside an iframe, so there is
  no text before the caret to pair with; it also replaces the browser context menu and has no DOM
  selection, so the context-menu command is unavailable too. A Docs-specific adapter (own key
  buffer + synthetic Backspace/insert) is possible but brittle; the desktop version is the real fix.
- Pages that intercept Backspace on `keydown` and delete text themselves bypass Backspace undo.
- Chrome blocks extensions on `chrome://` pages and the Chrome Web Store.
- `Selection.modify` and `execCommand` are not standardised; both work in all Chromium browsers.
