# Manual test checklist

Automated coverage: `npm test` (core vectors) and `npm run e2e` (real Chrome, fixture page).
This list covers what automation can't: real sites, the popup, the shortcut and the menu.

## Load the extension
1. `npm install && npm run build`
2. Open `chrome://extensions`, turn on **Developer mode** (top right).
3. **Load unpacked** → select `extension/dist`. The teal **Ş** icon appears (pin it from the puzzle-piece menu).
4. After every rebuild press the ↻ reload button on the extension card, then reload test tabs.

Test page: `python3 -m http.server 8080 -d extension/e2e/fixtures`, then open http://localhost:8080/test.html.
(`file://` pages need "Allow access to file URLs" on the extension card.)

## Checklist
| # | Where | Do | Expect |
|---|---|---|---|
| 1 | textarea | type `Toshkent shahri, toʻgʻri` (use `'` or `ʻ`) | `Toşkent şahri, töğri` |
| 2 | textarea | type `mashhur` | `maşhur` |
| 3 | textarea | type `sh`, then Backspace | `sh`; a second Backspace → `s` |
| 4 | textarea | type `o'`, Backspace | `o'` (same apostrophe) |
| 5 | textarea | type `sh`, ←, →, Backspace | `ş` is deleted (undo cleared) |
| 6 | textarea | type `s\h`, `o\'`, `o\n` | `sh`, `o'`, `o\n` |
| 7 | textarea | type `ash`, Ctrl+Z | `as` |
| 8 | contenteditable | repeat 1, 3, 6 | same results |
| 9 | password field | type `sho'` | unchanged |
| 10 | email field | type `sho'` | unchanged |
| 11 | Gmail | compose → body and subject: type `Salom, Toshkent!` then Backspace-undo test | converts; **discard the draft, do not send** |
| 12 | Telegram Web (web.telegram.org) | type in the message box `choʻl` + Backspace test | `çöl`; **don't send** (clear the box) |
| 13 | GitHub | edit a file (CodeMirror) and type `sh` | unchanged (code editor excluded); a comment box **does** convert |
| 14 | Google Docs | type `sh` | unchanged, context menu unavailable — known limitation (confirmed) |
| 15 | shortcut | press Alt+Shift+U, type `sh` | badge shows OFF, `sh` stays; press again → ON |
| 16 | popup | toggle main switch | badge OFF/ON, label Yoqilgan/Öçirilgan |
| 17 | popup | turn off „Şu saytda işlasin“ | no conversion on this site only; OFF badge on this tab only |
| 18 | popup | turn off backslash switch, type `docs\help` | `docs\help` |
| 19 | context menu | select `Oʻzbekiston, Toshkent` in a textarea → right-click → „Belgilangan matnni yangi alifboga ögiriş“ | `Özbekiston, Toşkent`; Ctrl+Z reverts |
| 20 | context menu | select read-only text on any page → menu item | panel shows converted text; „Nusxa olish“ copies it |
| 21 | IME | with an IME (e.g. Japanese/Chinese) compose text containing `sh` | no interference |
| 22 | DevTools | Network tab of the service worker and of a page while typing | no requests from the extension |
