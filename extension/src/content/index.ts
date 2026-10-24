import type { GetHostResponse, Message, StateMessage } from "../shared/messages";
import { getSettings, isActiveOn, onSettingsChanged, type Settings } from "../shared/settings";
import { LiveTyping } from "./live";
import { convertSelection } from "./selection";

const host = location.hostname;
const isTopFrame = window === window.top;
const live = new LiveTyping();

function apply(settings: Settings): void {
  const active = isActiveOn(settings, host);
  live.setActive(active);
  live.setBackslashEscape(settings.backslashEscape);
  if (isTopFrame) {
    const msg: StateMessage = { type: "state", active };
    try {
      chrome.runtime.sendMessage(msg).catch(() => {});
    } catch {
      // Extension was reloaded; this old content script is orphaned.
    }
  }
}

void getSettings().then(apply);
onSettingsChanged(apply);

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (msg.type === "get-host" && isTopFrame) {
    const response: GetHostResponse = { host };
    sendResponse(response);
  } else if (msg.type === "convert-selection") {
    convertSelection(msg.text, (fn) => live.runAsOwnEdit(fn));
  }
});
