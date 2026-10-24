import type { ConvertSelectionMessage, Message } from "../shared/messages";
import { getSettings, onSettingsChanged, updateSettings } from "../shared/settings";

const MENU_ID = "convert-selection";

const iconPaths = (on: boolean) => {
  const name = on ? "icon" : "icon-off";
  return { 16: `icons/${name}-16.png`, 32: `icons/${name}-32.png` };
};

/** Badge/icon for one tab (when its content script reports) or the default for all tabs. */
function showState(on: boolean, tabId?: number): void {
  void chrome.action.setIcon({ path: iconPaths(on), tabId });
  void chrome.action.setBadgeText({ text: on ? "" : "OFF", tabId });
  void chrome.action.setBadgeBackgroundColor({ color: "#6E7781", tabId });
  void chrome.action.setTitle({ title: on ? "Yangi alifbo — yoqilgan" : "Yangi alifbo — öçirilgan", tabId });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Belgilangan matnni yangi alifboga ögiriş",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || tab?.id === undefined) return;
  const msg: ConvertSelectionMessage = { type: "convert-selection", text: info.selectionText ?? "" };
  chrome.tabs.sendMessage(tab.id, msg, { frameId: info.frameId ?? 0 }).catch(() => {
    // No content script there (e.g. Chrome Web Store or a PDF): nothing we can do.
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-enabled") return;
  const { enabled } = await getSettings();
  await updateSettings({ enabled: !enabled });
});

// The content script of each tab's top frame reports whether it is active
// (global switch + per-site setting), so we never need the "tabs" permission.
chrome.runtime.onMessage.addListener((msg: Message, sender) => {
  if (msg.type === "state" && sender.tab?.id !== undefined && sender.frameId === 0) {
    showState(msg.active, sender.tab.id);
  }
});

const showGlobal = async () => showState((await getSettings()).enabled);
chrome.runtime.onStartup.addListener(showGlobal);
chrome.runtime.onInstalled.addListener(showGlobal);
onSettingsChanged((s) => showState(s.enabled));
