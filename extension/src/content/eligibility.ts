// Decides which elements we are allowed to touch.

/**
 * Code editors: backslash escape and digraph conversion would corrupt code
 * (`docs\help`, `chmod`, `shift`), so we never run inside them.
 */
const CODE_EDITOR_SELECTOR = [
  ".CodeMirror", // CodeMirror 5
  ".cm-editor", // CodeMirror 6 (GitHub file editor, many others)
  ".monaco-editor", // Monaco / VS Code web (GitLab Web IDE, github.dev)
  ".ace_editor", // Ace
  ".react-code-view", // GitHub code view
  ".js-code-editor", // GitHub legacy editor
  ".file-editor-textarea", // GitHub legacy editor textarea
  ".blob-editor-container", // GitLab single-file editor
  ".gl-source-editor", // GitLab Source Editor
  "[data-telex-ignore]", // explicit opt-out for site authors
].join(",");

/** Input types where conversion makes sense. Never password, email, url, number, tel… */
const TEXT_INPUT_TYPES = new Set(["text", "search"]);

export type TextField = HTMLInputElement | HTMLTextAreaElement;

export function isTextField(el: Element): el is TextField {
  if (el.tagName === "TEXTAREA") return true;
  return el.tagName === "INPUT" && TEXT_INPUT_TYPES.has((el as HTMLInputElement).type);
}

/**
 * The element the user is typing into if we may convert there, else null.
 * `target` should be `event.composedPath()[0]` so shadow DOM fields work.
 */
export function eligibleTarget(target: EventTarget | null | undefined): TextField | HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (target.closest(CODE_EDITOR_SELECTOR)) return null;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
    const field = target as TextField;
    if (!isTextField(field) || field.readOnly || field.disabled) return null;
    return field;
  }
  const el = target as HTMLElement;
  return el.isContentEditable ? el : null;
}
