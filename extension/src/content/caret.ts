// Reading the text left of the caret and applying edits, for text fields and contenteditable.
//
// Edits go through document.execCommand("insertText"). It is deprecated, but it is still the
// only API that puts the edit on the browser's native undo stack (Ctrl+Z works) and fires real
// beforeinput/input events, so frameworks (React, ProseMirror, Lexical, Gmail, Telegram) keep
// their state in sync. Direct DOM/value changes are only a fallback when execCommand refuses.

import { isTextField, type TextField } from "./eligibility";

/** Inline elements we may look through when reading the text before the caret. */
const INLINE_TAGS = new Set([
  "A", "ABBR", "B", "BDI", "BDO", "CITE", "CODE", "DFN", "EM", "FONT", "I", "KBD", "MARK",
  "Q", "S", "SAMP", "SMALL", "SPAN", "STRONG", "SUB", "SUP", "TIME", "U", "VAR",
]);

/**
 * Up to `n` characters immediately left of a collapsed caret, or null if the
 * selection is not a collapsed caret inside `el`.
 */
export function textBeforeCaret(el: TextField | HTMLElement, n = 2): string | null {
  if (isTextField(el)) {
    const { selectionStart: start, selectionEnd: end } = el;
    if (start === null || start !== end) return null;
    return el.value.slice(Math.max(0, start - n), start);
  }
  const sel = getSelectionFor(el);
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed || !sel.focusNode) return null;
  if (!el.contains(sel.focusNode)) return null;
  return textBeforeInEditable(el, sel.focusNode, sel.focusOffset, n);
}

/**
 * Walks backwards from (node, offset) collecting text, crossing only inline
 * element boundaries. Stops at block elements, <br>, images etc., so the last
 * letter of the previous paragraph never pairs with the first of the next.
 */
function textBeforeInEditable(host: HTMLElement, node: Node, offset: number, n: number): string {
  let out = "";
  let cur: Node | null = node;
  let off = offset;
  while (cur && out.length < n) {
    if (cur.nodeType === Node.TEXT_NODE) {
      const data = (cur as Text).data.slice(0, off);
      out = data.slice(-(n - out.length)) + out;
      if (out.length >= n) break;
      cur = previousInline(cur, host);
      off = Infinity;
      continue;
    }
    // Element: the position is between its children; look at the child before it.
    const child: ChildNode | undefined = cur.childNodes[Math.min(off, cur.childNodes.length) - 1];
    if (!child) {
      cur = previousInline(cur, host);
      off = Infinity;
    } else if (child.nodeType === Node.TEXT_NODE || (child instanceof Element && INLINE_TAGS.has(child.tagName))) {
      cur = child;
      off = Infinity;
    } else {
      break; // block, <br>, <img>, comment …
    }
  }
  return out;
}

/** The inline node before `node`, climbing out of inline parents; null at block boundaries. */
function previousInline(node: Node, host: HTMLElement): Node | null {
  let cur: Node = node;
  while (cur !== host) {
    const prev = cur.previousSibling;
    if (prev) {
      if (prev.nodeType === Node.TEXT_NODE) return prev;
      if (prev instanceof Element && INLINE_TAGS.has(prev.tagName)) return prev;
      return null;
    }
    const parent = cur.parentNode;
    if (!parent || parent === host || !(parent instanceof Element) || !INLINE_TAGS.has(parent.tagName)) return null;
    cur = parent;
  }
  return null;
}

/** The selection object that covers `el` (shadow roots have their own in Chrome). */
export function getSelectionFor(el: Node): Selection | null {
  const root = el.getRootNode() as Document | (ShadowRoot & { getSelection?: () => Selection | null });
  if ("getSelection" in root && typeof root.getSelection === "function") return root.getSelection();
  return document.getSelection();
}

/**
 * Replaces the `deleteBefore` characters left of the caret with `insert`.
 * Returns false if nothing could be done (caller should then let the key through).
 */
export function replaceBeforeCaret(el: TextField | HTMLElement, deleteBefore: number, insert: string): boolean {
  if (isTextField(el)) {
    const pos = el.selectionStart ?? 0;
    const from = Math.max(0, pos - deleteBefore);
    el.setSelectionRange(from, pos);
    if (document.execCommand("insertText", false, insert)) return true;
    el.setRangeText(insert, from, pos, "end");
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: insert }));
    return true;
  }

  const sel = getSelectionFor(el);
  if (!sel || sel.rangeCount === 0) return false;
  for (let i = 0; i < deleteBefore; i++) sel.modify("extend", "backward", "character");
  if (document.execCommand("insertText", false, insert)) return true;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const text = document.createTextNode(insert);
  range.insertNode(text);
  sel.collapse(text, text.length);
  el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: insert }));
  return true;
}
