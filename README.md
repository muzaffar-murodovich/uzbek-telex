# Yangi alifbo — özbekça yoziş yordamçisi

Özbek lotin alifbosida törtta harf özgardi:

| Eski  | Yangi |
|-------|-------|
| Oʻ oʻ | Ö ö   |
| Gʻ gʻ | Ğ ğ   |
| Sh sh | Ş ş   |
| Ch ch | Ç ç   |

Bu dastur siz odatdagidek, eski usulda yozayotganingizda harflarni avtomatik ravişda
yangi alifboga ögiradi. Yangi klaviatura örganiş şart emas.

## Qanday işlaydi

- `o` + apostrof → `ö`, `g` + apostrof → `ğ`
- `sh` → `ş`, `ch` → `ç`
- Har qanday apostrof işlaydi: `ʻ` `ʼ` `` ` `` `'` `‘` `’` `´`
- Katta-kiçik harf birinçi harfga qarab belgilanadi: `Sh` va `SH` → `Ş`, `sH` → `ş`
- Misol: `Toshkent` → `Toşkent`, `toʻgʻri` → `töğri`, `mashhur` → `maşhur`

## Eski harf kerak bölsa

1. **Backspace.** Harf ögirilişi bilanoq <kbd>Backspace</kbd> bosing — `ş` yana `sh` ga qaytadi
   (siz yozgan apostrof ham aynan saqlanadi). Ikkinçi <kbd>Backspace</kbd> odatdagidek öçiradi.
2. **Teskari çiziq.** Ikki harf orasiga `\` yozing: `s\h` → `sh`, `o\ʻ` → `oʻ`.
   Bu imkoniyatni sozlamalarda öçiriş mumkin.
3. **Tezkor tugma.** <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd> — butunlay yoqiş / öçiriş
   (uzun inglizça yoki eski yozuvdagi matn uçun).
4. **Sayt böyiça.** Kengaytma oynasida „Şu saytda işlasin“ tugmasini öçiring.

Tayyor matnni ham ögiriş mumkin: matnni belgilang → siçqonçaning öng tugmasi →
„Belgilangan matnni yangi alifboga ögiriş“.

## Örnatiş (Chrome)

Hozirça Chrome Web Store'da yöq. Qölda örnatiş:

1. [Node.js](https://nodejs.org) 20+ örnating.
2. Bu papkada: `npm install` va `npm run build`.
3. Chrome'da `chrome://extensions` sahifasini oçing.
4. Öng yuqoridagi **Developer mode** ni yoqing.
5. **Load unpacked** → `extension/dist` papkasini tanlang.

## Maxfiylik

Kengaytma internetga heç narsa yubormaydi, heç qanday statistika yoki maʼlumot yiğmaydi.
Sozlamalar faqat sizning kompyuteringizda saqlanadi. Batafsil: [PRIVACY.md](PRIVACY.md).

## Çeklovlar

- **Google Docs**, Google Sheets, Figma kabi „canvas“ asosidagi muharrirlarda işlamaydi (öng tugma menyusi ham). Hozirça yöli: matnni boşqa maydonda yozib (yoki öng tugma bilan ögirib), Docs'ga nusxalang.
- Kod muharrirlarida (CodeMirror, Monaco, Ace, GitHub/GitLab kod oynalari) ataylab öçirilgan. Vikipediyaning „Syntax“ rejimi bundan mustasno: vikimatn oddiy matn, unda kengaytma işlaydi.
- Parol, email, URL va raqam maydonlarida işlamaydi.
- Chrome içki sahifalarida (`chrome://`) va Chrome Web Store saytida Chrome heç qanday kengaytmaning işlaşiga ruxsat bermaydi.

## Loyiha tuzilmasi

| Papka | Nima bor |
|-------|----------|
| [`core/`](core) | Qoidalar ([`rules.json`](core/rules.json)), umumiy testlar ([`test-vectors.json`](core/test-vectors.json)) va TypeScript'dagi asosiy kod |
| [`extension/`](extension) | Chrome kengaytmasi (Manifest V3) |
| [`desktop/`](desktop) | Windows, macOS, Linux uçun reja (hali yozilmagan) |
| [`docs/`](docs) | Arxitektura, test formati, qölda tekşiriş röyxati |

Dastur oçiq kodli (MIT). Xato topsangiz yoki taklifingiz bölsa — issue oçing.

---

## English

A typing helper for the reformed Uzbek Latin alphabet (oʻ→ö, gʻ→ğ, sh→ş, ch→ç).
It converts old-style letter pairs into the new letters **while you type**, like Vietnamese
Telex input (Unikey/OpenKey). Phase 1 ships a Chrome extension; desktop apps are planned.

- **Rules** live in [`core/rules.json`](core/rules.json); every implementation must pass
  [`core/test-vectors.json`](core/test-vectors.json) (format: [docs/test-vectors.md](docs/test-vectors.md)).
- **Escapes:** Backspace right after a conversion restores the original pair; `\` between the
  letters keeps them literal (can be disabled); <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd> toggles.
- **Privacy:** no network requests, no analytics, settings stored locally only.

```sh
npm install
npm test          # core: all shared test vectors
npm run build     # extension → extension/dist (load unpacked in chrome://extensions)
npm run e2e       # extension end-to-end tests in Chrome for Testing (Puppeteer)
```

How the extension edits text (and why): [docs/architecture.md](docs/architecture.md).
Manual test checklist: [docs/manual-test-checklist.md](docs/manual-test-checklist.md).
Licence: MIT.
