import { describe, it, expect } from "@jest/globals";
import { ANSI_COLORS, ANSI_CONTROL, colorize, bold } from "../colors.js";

describe("Color Utilities", () => {
  describe("ANSI_COLORS", () => {
    it("should contain correct ANSI color codes", () => {
      expect(ANSI_COLORS.red).toBe("\x1b[31m");
      expect(ANSI_COLORS.green).toBe("\x1b[32m");
      expect(ANSI_COLORS.blue).toBe("\x1b[34m");
      expect(ANSI_COLORS.yellow).toBe("\x1b[33m");
      expect(ANSI_COLORS.reset).toBe("\x1b[0m");
      expect(ANSI_COLORS.bold).toBe("\x1b[1m");
    });
  });

  describe("colorize", () => {
    it("should apply color codes to text", () => {
      const text = "Hello World";
      expect(colorize(text, "red")).toBe("\x1b[31mHello World\x1b[0m");
      expect(colorize(text, "green")).toBe("\x1b[32mHello World\x1b[0m");
      expect(colorize(text, "blue")).toBe("\x1b[34mHello World\x1b[0m");
      expect(colorize(text, "yellow")).toBe("\x1b[33mHello World\x1b[0m");
    });

    it("should handle reset color", () => {
      const text = "Reset";
      expect(colorize(text, "reset")).toBe("\x1b[0mReset\x1b[0m");
    });
  });

  describe("bold", () => {
    it("should apply bold formatting to text", () => {
      const text = "Bold Text";
      expect(bold(text)).toBe("\x1b[1mBold Text\x1b[0m");
    });

    it("should handle empty strings", () => {
      expect(bold("")).toBe("\x1b[1m\x1b[0m");
    });
  });

  describe("ANSI_CONTROL", () => {
    it("should contain correct control sequences", () => {
      expect(ANSI_CONTROL.clearScreen).toBe("\x1b[2J\x1b[0f");
      expect(ANSI_CONTROL.cursorHome).toBe("\x1b[0f");
      expect(ANSI_CONTROL.hideCursor).toBe("\x1b[?25l");
      expect(ANSI_CONTROL.showCursor).toBe("\x1b[?25h");
    });
  });
});
