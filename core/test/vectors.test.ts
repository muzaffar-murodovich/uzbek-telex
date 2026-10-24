import { describe, expect, it } from "vitest";
import vectors from "../test-vectors.json";
import { convertText, simulate } from "../src/index";

const show = (s: string) => JSON.stringify(s);

describe("text vectors", () => {
  for (const v of vectors.text) {
    it(`${show(v.input)} → ${show(v.expected)}`, () => {
      expect(convertText(v.input)).toBe(v.expected);
    });
  }
});

describe("live vectors", () => {
  for (const v of vectors.live) {
    const options = "options" in v ? v.options : undefined;
    const label = `${JSON.stringify(v.keys)}${options ? " " + JSON.stringify(options) : ""} → ${show(v.expected)}`;
    it(label, () => {
      expect(simulate(v.keys, options)).toBe(v.expected);
    });
  }
});
