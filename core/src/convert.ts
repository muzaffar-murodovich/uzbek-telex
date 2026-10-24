import { convertPair } from "./rules";

/** Converts a whole string from the old Uzbek Latin alphabet to the new one. */
export function convertText(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const converted = i + 1 < text.length ? convertPair(text[i], text[i + 1]) : null;
    if (converted) {
      out += converted;
      i += 2;
    } else {
      out += text[i];
      i += 1;
    }
  }
  return out;
}
