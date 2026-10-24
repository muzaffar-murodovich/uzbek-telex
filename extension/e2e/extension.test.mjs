// End-to-end tests: load the built extension (extension/dist) into Chrome for
// Testing and type real keystrokes into fixtures/test.html served over http.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const dist = fileURLToPath(new URL("../dist", import.meta.url));
const html = readFileSync(new URL("fixtures/test.html", import.meta.url));

let server, browser, page, worker, url;

before(async () => {
  server = createServer((_req, res) => res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(html));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${server.address().port}/`;
  browser = await puppeteer.launch({
    headless: true,
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
  });
  const swTarget = await browser.waitForTarget((t) => t.type() === "service_worker");
  worker = await swTarget.worker();
  page = await browser.newPage();
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function fresh() {
  await page.goto(url);
  // Wait until the content script has loaded settings.
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((r) => setTimeout(r, 150));
}

const NAMED = new Set(["Backspace", "ArrowLeft", "ArrowRight"]);
async function type(selector, keys) {
  await page.focus(selector);
  for (const key of keys) {
    if (NAMED.has(key)) await page.keyboard.press(key);
    else if (/^[\x20-\x7e]$/.test(key)) await page.keyboard.type(key);
    else await page.keyboard.sendCharacter(key); // ʻ ’ etc. are not on the US layout
  }
}

const valueOf = (selector) =>
  page.$eval(selector, (el) => ("value" in el ? el.value : el.innerText.replace(/\n$/, "")));

async function setSettings(patch) {
  await worker.evaluate((p) => chrome.storage.local.set(p), patch);
  await new Promise((r) => setTimeout(r, 150));
}

describe("live typing", () => {
  before(fresh);

  const cases = [
    [["s", "h"], "ş"],
    [["S", "h"], "Ş"],
    [["C", "H"], "Ç"],
    [["o", "ʻ"], "ö"],
    [["O", "'"], "Ö"],
    [["g", "`"], "ğ"],
    [["t", "o", "'", "g", "'", "r", "i"], "töğri"],
    [["m", "a", "s", "h", "h", "u", "r"], "maşhur"],
    [["s", "h", "Backspace"], "sh"],
    [["s", "h", "Backspace", "Backspace"], "s"],
    [["o", "’", "Backspace"], "o’"],
    [["s", "h", "ArrowLeft", "ArrowRight", "Backspace"], ""],
    [["o", "\\", "ʻ"], "oʻ"],
    [["S", "\\", "h"], "Sh"],
    [["o", "\\", "n"], "o\\n"],
  ];

  for (const selector of ["#text", "#search", "#ta", "#ce"]) {
    for (const [keys, expected] of cases) {
      test(`${selector} ${JSON.stringify(keys)} → ${JSON.stringify(expected)}`, async () => {
        await page.$eval(selector, (el) => ("value" in el ? (el.value = "") : (el.textContent = "")));
        await type(selector, keys);
        assert.equal(await valueOf(selector), expected);
      });
    }
  }
});

describe("contenteditable structure", () => {
  before(fresh);

  test("pairs across inline elements: <b>s</b> + h", async () => {
    await page.$eval("#ce-rich", (el) => {
      el.focus();
      const sel = getSelection();
      sel.collapse(el, el.childNodes.length); // caret after </b>
    });
    await page.keyboard.type("h");
    assert.equal(await valueOf("#ce-rich"), "ş");
  });

  test("never pairs across block boundaries", async () => {
    await page.$eval("#ce-blocks", (el) => {
      el.focus();
      getSelection().collapse(el.children[1], 0); // start of the empty 2nd paragraph
    });
    await page.keyboard.type("h");
    assert.equal(await valueOf("#ce-blocks"), "s\nh");
  });
});

describe("fields we must not touch", () => {
  before(fresh);

  for (const selector of ["#pw", "#email", "#code"]) {
    test(`${selector} stays unchanged`, async () => {
      await type(selector, ["s", "h", "o", "'"]);
      assert.equal(await valueOf(selector), "sho'");
    });
  }
});

describe("browser integration", () => {
  before(fresh);

  test("Ctrl+Z undoes a conversion as one native step", async () => {
    await type("#ta", ["a", "s", "h"]);
    assert.equal(await valueOf("#ta"), "aş");
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");
    assert.equal(await valueOf("#ta"), "as");
  });

  test("caret position is kept mid-text", async () => {
    await page.$eval("#text", (el) => {
      el.value = "a b";
      el.focus();
      el.setSelectionRange(1, 1);
    });
    await type("#text", ["s", "h"]);
    assert.equal(await valueOf("#text"), "aş b");
    assert.equal(await page.$eval("#text", (el) => el.selectionStart), 2);
  });

  test("no conversion during IME composition", async () => {
    const cdp = await page.createCDPSession();
    await page.$eval("#text", (el) => (el.value = ""));
    await type("#text", ["s"]);
    await cdp.send("Input.imeSetComposition", { text: "h", selectionStart: 1, selectionEnd: 1 });
    await cdp.send("Input.insertText", { text: "h" });
    assert.equal(await valueOf("#text"), "sh");
    await cdp.detach();
  });

  test("mouse click clears the undo state", async () => {
    await page.$eval("#ta", (el) => (el.value = ""));
    await type("#ta", ["s", "h"]);
    await page.click("#ta");
    await page.$eval("#ta", (el) => el.setSelectionRange(el.value.length, el.value.length));
    await page.keyboard.press("Backspace");
    assert.equal(await valueOf("#ta"), "");
  });
});

describe("settings", () => {
  before(fresh);
  after(() => setSettings({ enabled: true, backslashEscape: true, disabledSites: [] }));

  test("global switch off", async () => {
    await setSettings({ enabled: false });
    await type("#ta", ["s", "h"]);
    assert.equal(await valueOf("#ta"), "sh");
    await setSettings({ enabled: true });
  });

  test("per-site disable", async () => {
    await page.$eval("#ta", (el) => (el.value = ""));
    await setSettings({ disabledSites: ["127.0.0.1"] });
    await type("#ta", ["c", "h"]);
    assert.equal(await valueOf("#ta"), "ch");
    await setSettings({ disabledSites: [] });
  });

  test("backslash escape off", async () => {
    await page.$eval("#ta", (el) => (el.value = ""));
    await setSettings({ backslashEscape: false });
    await type("#ta", ["d", "o", "c", "s", "\\", "h", "e", "l", "p"]);
    assert.equal(await valueOf("#ta"), "docs\\help");
  });
});

describe("selection conversion (context menu message)", () => {
  before(fresh);

  async function sendConvert(text = "") {
    const tabId = await worker.evaluate(async () => (await chrome.tabs.query({ active: true }))[0].id);
    await worker.evaluate(
      (id, t) => chrome.tabs.sendMessage(id, { type: "convert-selection", text: t }, { frameId: 0 }),
      tabId,
      text,
    );
    await new Promise((r) => setTimeout(r, 100));
  }

  test("converts a selection inside a textarea in place", async () => {
    await page.$eval("#ta", (el) => {
      el.value = "Salom, Oʻzbekiston! Toshkent";
      el.focus();
      el.setSelectionRange(7, 28);
    });
    await sendConvert();
    assert.equal(await valueOf("#ta"), "Salom, Özbekiston! Toşkent");
  });

  test("converts a contenteditable selection and keeps formatting", async () => {
    await page.$eval("#ce", (el) => {
      el.innerHTML = "<b>Shahar</b> va choʻl";
      el.focus();
      getSelection().selectAllChildren(el);
    });
    await sendConvert();
    assert.equal(await page.$eval("#ce", (el) => el.innerHTML), "<b>Şahar</b> va çöl");
  });

  test("read-only text opens a panel with the converted text", async () => {
    await page.$eval("#static", (el) => getSelection().selectAllChildren(el));
    await sendConvert("Oʻzbekiston poytaxti — Toshkent shahri.");
    const exists = await page.$eval("#uzbek-telex-panel", (el) => !!el);
    assert.ok(exists);
  });
});
