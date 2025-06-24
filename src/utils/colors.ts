/**
 * ANSI color codes for terminal output
 */
export const ANSI_COLORS = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
} as const;

/**
 * Available color names for terminal output
 */
export type Color = "red" | "green" | "blue" | "yellow" | "reset";

/**
 * Applies ANSI color codes to a string
 * @param text - The text to colorize
 * @param color - The color to apply
 * @returns The colorized string
 */
export function colorize(text: string, color: Color): string {
  return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.reset}`;
}

/**
 * Makes text bold using ANSI codes
 * @param text - The text to make bold
 * @returns The bold string
 */
export function bold(text: string): string {
  return `${ANSI_COLORS.bold}${text}${ANSI_COLORS.reset}`;
}

/**
 * ANSI escape sequences for terminal control
 */
export const ANSI_CONTROL = {
  /** Clear entire screen and move cursor to top-left */
  clearScreen: "\x1b[2J\x1b[0f",
  /** Move cursor to top-left */
  cursorHome: "\x1b[0f",
  /** Hide cursor */
  hideCursor: "\x1b[?25l",
  /** Show cursor */
  showCursor: "\x1b[?25h",
} as const;
