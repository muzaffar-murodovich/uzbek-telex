import type { GetHostMessage, GetHostResponse } from "../shared/messages";
import { getSettings, onSettingsChanged, updateSettings, type Settings } from "../shared/settings";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const enabled = $<HTMLInputElement>("enabled");
const site = $<HTMLInputElement>("site");
const escape = $<HTMLInputElement>("escape");

let host: string | null = null;

function render(s: Settings): void {
  enabled.checked = s.enabled;
  $("enabled-label").textContent = s.enabled ? "Yoqilgan" : "Öçirilgan";
  escape.checked = s.backslashEscape;
  if (host) {
    site.checked = !s.disabledSites.includes(host);
    site.disabled = !s.enabled;
  }
}

/** Asks the tab's content script for its hostname (no "tabs" permission needed). */
async function currentHost(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return null;
  try {
    const msg: GetHostMessage = { type: "get-host" };
    const res: GetHostResponse | undefined = await chrome.tabs.sendMessage(tab.id, msg, { frameId: 0 });
    return res?.host || null;
  } catch {
    return null;
  }
}

async function init(): Promise<void> {
  host = await currentHost();
  if (host) {
    $("site-host").textContent = host;
  } else {
    $("site-row").hidden = true;
    $("site-unavailable").hidden = false;
  }

  const [command] = await chrome.commands.getAll().then((all) => all.filter((c) => c.name === "toggle-enabled"));
  $("shortcut").textContent = command?.shortcut || "Tezkor tugma yöq";

  render(await getSettings());
  onSettingsChanged(render);

  enabled.addEventListener("change", () => updateSettings({ enabled: enabled.checked }));
  escape.addEventListener("change", () => updateSettings({ backslashEscape: escape.checked }));
  site.addEventListener("change", async () => {
    if (!host) return;
    const { disabledSites } = await getSettings();
    const others = disabledSites.filter((h) => h !== host);
    await updateSettings({ disabledSites: site.checked ? others : [...others, host] });
  });
}

void init();
