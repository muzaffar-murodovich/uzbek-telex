// "Belgilangan matnni yangi alifboga ögiriş" (context menu).

import { convertText } from "@uzbek-telex/core";
import { getSelectionFor } from "./caret";
import { eligibleTarget, isTextField } from "./eligibility";

/**
 * Converts the current selection in place when it is editable; otherwise shows
 * the converted text in a small panel with a copy button.
 * `fallbackText` is Chrome's copy of the selection, used for the panel.
 */
export function convertSelection(fallbackText: string, runAsOwnEdit: (fn: () => void) => void): void {
  const active = deepActiveElement();
  const field = active ? eligibleTarget(active) : null;

  if (field && isTextField(field)) {
    const { selectionStart: start, selectionEnd: end } = field;
    if (start !== null && end !== null && start !== end) {
      const converted = convertText(field.value.slice(start, end));
      runAsOwnEdit(() => {
        if (!document.execCommand("insertText", false, converted)) {
          field.setRangeText(converted, start, end, "select");
          field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: converted }));
        }
        field.setSelectionRange(start, start + converted.length);
      });
      return;
    }
  }

  const sel = getSelectionFor(active ?? document.body);
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const range = sel.getRangeAt(0);
    const host = editableHost(range.commonAncestorContainer);
    if (host && eligibleTarget(host)) {
      runAsOwnEdit(() => convertRangeInEditable(sel, range));
      return;
    }
  }

  const text = sel && !sel.isCollapsed ? sel.toString() : fallbackText;
  showResultPanel(convertText(text));
}

/**
 * Converts each text node in the range separately (last to first, so earlier
 * offsets stay valid). This keeps bold/links/etc. and gives one undo step per node.
 */
function convertRangeInEditable(sel: Selection, range: Range): void {
  const parts: { node: Text; start: number; end: number }[] = [];
  const root = range.commonAncestorContainer;
  if (root.nodeType === Node.TEXT_NODE) {
    parts.push({ node: root as Text, start: range.startOffset, end: range.endOffset });
  } else {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!range.intersectsNode(n)) continue;
      const text = n as Text;
      const start = n === range.startContainer ? range.startOffset : 0;
      const end = n === range.endContainer ? range.endOffset : text.length;
      if (end > start) parts.push({ node: text, start, end });
    }
  }

  let editedDirectly = false;
  for (const { node, start, end } of parts.reverse()) {
    const original = node.data.slice(start, end);
    const converted = convertText(original);
    if (converted === original) continue;

    // Replace only the span that changed, so neighbouring text keeps its nodes.
    let prefix = 0;
    while (original[prefix] === converted[prefix]) prefix++;
    let suffix = 0;
    while (
      suffix < original.length - prefix &&
      suffix < converted.length - prefix &&
      original[original.length - 1 - suffix] === converted[converted.length - 1 - suffix]
    ) suffix++;
    const from = start + prefix;
    const to = end - suffix;
    const insert = converted.slice(prefix, converted.length - suffix);

    // insertText at the very start of a text node takes the formatting of the
    // element before it (e.g. <b>), so edit the node directly there.
    if (from === 0 && node.previousSibling) {
      node.replaceData(from, to - from, insert);
      editedDirectly = true;
      continue;
    }
    sel.setBaseAndExtent(node, from, node, to);
    if (!document.execCommand("insertText", false, insert)) {
      node.replaceData(from, to - from, insert);
      editedDirectly = true;
    }
  }
  if (editedDirectly) {
    editableHost(range.commonAncestorContainer)?.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }
}

function editableHost(node: Node): HTMLElement | null {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  return el && el.isContentEditable ? el : null;
}

function deepActiveElement(): Element | null {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el;
}

/** A small panel (in a closed shadow root, so page CSS can't touch it) with the result. */
function showResultPanel(text: string): void {
  document.getElementById("uzbek-telex-panel")?.remove();
  const container = document.createElement("div");
  container.id = "uzbek-telex-panel";
  const shadow = container.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      .box { position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; max-width: min(420px, calc(100vw - 32px));
        background: #fff; color: #1b1f23; border: 1px solid #d0d7de; border-radius: 12px; padding: 12px 14px;
        box-shadow: 0 8px 28px rgba(0,0,0,.18); font: 14px/1.45 system-ui, sans-serif; }
      .title { font-weight: 600; margin-bottom: 6px; }
      .text { max-height: 160px; overflow: auto; white-space: pre-wrap; word-break: break-word;
        background: #f6f8fa; border-radius: 8px; padding: 8px; }
      .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; }
      button { font: inherit; border-radius: 8px; padding: 5px 12px; cursor: pointer; border: 1px solid #d0d7de; background: #fff; color: inherit; }
      button.primary { background: #0e7c86; border-color: #0e7c86; color: #fff; }
      @media (prefers-color-scheme: dark) {
        .box { background: #22272e; color: #e6edf3; border-color: #444c56; }
        .text { background: #2d333b; }
        button { background: #2d333b; border-color: #444c56; }
      }
    </style>
    <div class="box" role="dialog" aria-label="Yangi alifbo">
      <div class="title">Yangi alifboda:</div>
      <div class="text"></div>
      <div class="row"><button class="close">Yopiş</button><button class="primary copy">Nusxa olish</button></div>
    </div>`;
  shadow.querySelector(".text")!.textContent = text;
  const copy = shadow.querySelector<HTMLButtonElement>(".copy")!;
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = "Nusxa olindi ✓";
      setTimeout(() => container.remove(), 900);
    } catch {
      copy.textContent = "Nusxa olinmadi";
    }
  });
  shadow.querySelector(".close")!.addEventListener("click", () => container.remove());
  (document.body ?? document.documentElement).append(container);
}
