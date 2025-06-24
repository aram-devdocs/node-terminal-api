import type { Terminal } from "../core/Terminal.js";

/**
 * Interface that all terminal applications must implement.
 *
 * @interface Application
 * @example
 * ```typescript
 * class MyApp implements Application {
 *   name = "MyApp";
 *   version = "1.0.0";
 *
 *   async onStart(terminal: Terminal): Promise<void> {
 *     terminal.display("Welcome to MyApp!", { color: "green" });
 *   }
 *
 *   async onInput(input: string, terminal: Terminal): Promise<void> {
 *     if (input === "exit") {
 *       terminal.exit();
 *     } else {
 *       terminal.display(`You typed: ${input}`);
 *     }
 *   }
 *
 *   async onExit(terminal: Terminal): Promise<void> {
 *     terminal.display("Goodbye!", { color: "yellow" });
 *   }
 * }
 * ```
 */
export interface Application {
  /** The display name of the application */
  name: string;

  /** The version string of the application */
  version: string;

  /**
   * Called when the application starts.
   * Use this for initialization, displaying welcome messages, or initial prompts.
   *
   * @param terminal - The terminal instance for I/O operations
   * @returns Promise that resolves when startup is complete
   */
  onStart(terminal: Terminal): Promise<void>;

  /**
   * Called whenever the user provides input.
   * This is the main event handler for user interactions.
   *
   * @param input - The user's input string (already trimmed)
   * @param terminal - The terminal instance for I/O operations
   * @returns Promise that resolves when input processing is complete
   */
  onInput(input: string, terminal: Terminal): Promise<void>;

  /**
   * Called when the application is exiting.
   * Use this for cleanup operations, saving state, or farewell messages.
   *
   * @param terminal - The terminal instance for I/O operations
   * @returns Promise that resolves when cleanup is complete
   */
  onExit(terminal: Terminal): Promise<void>;
}

/**
 * Options for customizing text display in the terminal.
 *
 * @interface DisplayOptions
 */
export interface DisplayOptions {
  /** Text color to apply */
  color?: import("../utils/colors.js").Color;

  /** Whether to make the text bold */
  bold?: boolean;

  /** Whether to add a newline after the text (default: true) */
  newLine?: boolean;
}
