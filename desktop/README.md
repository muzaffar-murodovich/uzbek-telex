# Desktop (planned — not implemented yet)

Phase 1 is the Chrome extension. Desktop versions will reuse the same rules and **must pass
`core/test-vectors.json`**. The live engine contract (`onInsert` / `onBackspace` / `reset`
returning `{deleteBefore, insert}`) is documented in `docs/architecture.md` and maps directly
onto keyboard hooks and input-method engines.

## Windows + macOS: tray app with a global keyboard hook

- **Stack:** Rust core (a port of `core/`, tested against the shared vectors) + Tauri tray app
  for settings (on/off, per-app disable, backslash escape, shortcut).
- **Windows:** low-level keyboard hook (`SetWindowsHookEx(WH_KEYBOARD_LL)`); apply actions by
  sending `deleteBefore` Backspaces then the text with `SendInput` (`KEYEVENTF_UNICODE`).
  Ignore our own injected events (`LLKHF_INJECTED`). Detect IME composition via TSF/IMM and
  pause. Skip password fields where detectable (UI Automation `IsPassword`).
- **macOS:** `CGEventTap` for key events; inject with `CGEventKeyboardSetUnicodeString`.
  Requires the **Accessibility** (and on newer versions **Input Monitoring**) permission —
  the app must explain this clearly on first run. Secure input fields (passwords) disable event
  taps automatically, which is what we want. A native Input Method (InputMethodKit) is an
  alternative that avoids the permission prompt but is harder for users to enable.
- **Context tracking:** a global hook doesn't know the text left of the caret, so the desktop
  host keeps its own short buffer of the last typed characters and resets it on mouse clicks,
  focus/app changes and navigation keys — exactly the `reset()` events of the engine.
- **Code signing:** required to avoid SmartScreen (Windows, EV or standard certificate with
  reputation) and Gatekeeper (macOS Developer ID + notarization).
- **Antivirus false positives:** keyboard hooks look like keyloggers to heuristics. Mitigate
  with signing, reproducible builds from the public repo, submitting builds to vendors
  (Microsoft Defender, etc.) for whitelisting, and no network access at all.

## Linux: IBus and Fcitx5 engines

Global keyboard hooks don't work on Wayland (by design), so on Linux the tool will be an
**input method engine**: an IBus engine and an Fcitx5 addon. Input methods receive keys and
the surrounding text from the toolkit, commit text natively, and handle preedit/composition
correctly on both X11 and Wayland. The engine logic is a direct port of `LiveEngine`
(likely Rust with C bindings, or C++ for Fcitx5), validated against the shared vectors.

## Other ports
Swift (macOS InputMethodKit) and C# (Windows TSF text service) are possible later; same rule:
load `core/rules.json`, pass `core/test-vectors.json`.
