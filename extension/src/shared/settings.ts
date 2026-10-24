// Settings live in chrome.storage.local only: nothing is synced or sent anywhere.

export interface Settings {
  /** Global on/off. */
  enabled: boolean;
  /** `\` between two letters keeps them literal (o\ʻ → oʻ). */
  backslashEscape: boolean;
  /** Hostnames where conversion is off. */
  disabledSites: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  backslashEscape: true,
  disabledSites: [],
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored } as Settings;
}

export function updateSettings(patch: Partial<Settings>): Promise<void> {
  return chrome.storage.local.set(patch);
}

export function onSettingsChanged(callback: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "local") void getSettings().then(callback);
  });
}

export function isActiveOn(settings: Settings, host: string): boolean {
  return settings.enabled && !settings.disabledSites.includes(host);
}
