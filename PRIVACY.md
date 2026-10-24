# Privacy Policy — Yangi alifbo (Uzbek New Alphabet Typing Helper)

_Last updated: 24 October 2026_

**Short version: the extension collects nothing and sends nothing.**

## What the extension does
It watches the keys you type in text fields on web pages and, when you type an old-alphabet
letter pair (for example `sh` or `oʻ`), replaces it with the new Uzbek letter (`ş`, `ö`).
All of this happens locally, inside your browser, as you type.

## Data collection
- We do **not** collect, store, transmit, sell or share any personal data or typed text.
- The extension makes **no network requests** of any kind: no servers, no analytics,
  no telemetry, no crash reporting, no remote code.
- Typed text is only looked at one or two characters at a time, in memory, to decide whether
  to replace a letter. It is never saved.

## Stored settings
The extension stores only its own settings in `chrome.storage.local` on your device:
whether it is on, whether the backslash escape is on, and the list of websites where you
turned it off. These are never synced or sent anywhere. Uninstalling the extension removes them.

## Permissions and why they are needed
| Permission | Why |
|---|---|
| Access to all websites (content script) | To convert letters in text fields on any site you type on. The script runs only locally and never reads page content beyond the characters next to your cursor. It never runs in password fields. |
| `storage` | To remember your settings on this device. |
| `contextMenus` | For the right-click item that converts selected text. |

## Open source
The full source code is public under the MIT licence, so anyone can verify these statements.

## Contact
Questions: open an issue in the project's public repository.
