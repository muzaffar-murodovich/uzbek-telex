import { describe, expect, it } from "vitest";
import { LiveEngine } from "../src/index";

describe("LiveEngine", () => {
  it("returns null for non-trigger input", () => {
    const e = new LiveEngine();
    expect(e.onInsert("", "a")).toBeNull();
    expect(e.onInsert("a", "h")).toBeNull();
  });

  it("replaces the previous char on a trigger pair", () => {
    const e = new LiveEngine();
    expect(e.onInsert("as", "h")).toEqual({ deleteBefore: 1, insert: "ş" });
  });

  it("restores the exact original pair on Backspace right after a conversion", () => {
    const e = new LiveEngine();
    e.onInsert("o", "´");
    expect(e.onBackspace("aö")).toEqual({ deleteBefore: 1, insert: "o´" });
    expect(e.onBackspace("ao´")).toBeNull();
  });

  it("does not undo when the text before the caret no longer ends with the converted char", () => {
    const e = new LiveEngine();
    e.onInsert("s", "h");
    expect(e.onBackspace("x")).toBeNull();
  });

  it("reset() clears undo and escape state", () => {
    const e = new LiveEngine();
    e.onInsert("s", "h");
    e.reset();
    expect(e.onBackspace("ş")).toBeNull();
    e.onInsert("s", "\\");
    e.reset();
    expect(e.onInsert("s\\", "h")).toBeNull();
  });

  it("removes the backslash when it escapes a pair", () => {
    const e = new LiveEngine();
    expect(e.onInsert("o", "\\")).toBeNull();
    expect(e.onInsert("o\\", "ʻ")).toEqual({ deleteBefore: 1, insert: "ʻ" });
  });

  it("ignores escape when disabled", () => {
    const e = new LiveEngine({ backslashEscape: false });
    e.onInsert("o", "\\");
    expect(e.onInsert("o\\", "ʻ")).toBeNull();
  });

  it("can change options at runtime", () => {
    const e = new LiveEngine();
    e.setOptions({ backslashEscape: false });
    e.onInsert("s", "\\");
    expect(e.onInsert("s\\", "h")).toBeNull();
  });

  it("only looks at single characters", () => {
    const e = new LiveEngine();
    expect(e.onInsert("s", "hh")).toBeNull();
  });
});
