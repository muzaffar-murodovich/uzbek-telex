/** Popup → content script (top frame): which site is this tab on? */
export interface GetHostMessage {
  type: "get-host";
}
export interface GetHostResponse {
  host: string;
}

/** Background → content script (frame from the context menu): convert the selection. */
export interface ConvertSelectionMessage {
  type: "convert-selection";
  /** Selected text as Chrome saw it, used when the page selection can't be edited. */
  text: string;
}

/** Content script (top frame) → background: update the badge for this tab. */
export interface StateMessage {
  type: "state";
  active: boolean;
}

export type Message = GetHostMessage | ConvertSelectionMessage | StateMessage;
