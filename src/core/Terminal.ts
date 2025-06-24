import * as readline from "readline";
import { ANSI_CONTROL, colorize, bold } from "../utils/colors.js";
import type { Application, DisplayOptions } from "../types/index.js";

/**
 * Terminal class that provides a runtime environment for terminal applications.
 * Handles user input/output, application lifecycle, and display formatting.
 *
 * @class Terminal
 * @example
 * ```typescript
 * // Basic usage
 * const terminal = new Terminal();
 * const app = new MyApp();
 * await terminal.run(app);
 *
 * // Using terminal methods within an application
 * class MyApp implements Application {
 *   async onStart(terminal: Terminal): Promise<void> {
 *     terminal.clear();
 *     terminal.display("Welcome!", { color: "green", bold: true });
 *
 *     const name = await terminal.prompt("What's your name? ");
 *     terminal.display(`Hello, ${name}!`);
 *   }
 * }
 * ```
 */
export class Terminal {
  private rl: readline.Interface;
  private isRunning: boolean = false;
  private isRawMode: boolean = false;
  private keypressListeners: Array<(key: KeypressEvent) => void> = [];

  /**
   * Creates a new Terminal instance with readline interface configured.
   */
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "> ",
    });
  }

  /**
   * Displays content to the terminal with optional formatting.
   *
   * @param content - The text content to display
   * @param options - Optional formatting options
   * @param options.color - Text color (red, green, blue, yellow)
   * @param options.bold - Make text bold
   * @param options.newLine - Add newline after text (default: true)
   *
   * @example
   * ```typescript
   * terminal.display("Success!", { color: "green", bold: true });
   * terminal.display("Loading...", { color: "blue", newLine: false });
   * ```
   */
  display(content: string, options: DisplayOptions = {}): void {
    let output = content;

    if (options.color) {
      output = colorize(output, options.color);
    }

    if (options.bold === true) {
      output = bold(output);
    }

    if (options.newLine !== false) {
      process.stdout.write(output + "\n");
    } else {
      process.stdout.write(output);
    }
  }

  /**
   * Clears the terminal screen and moves cursor to top-left.
   * Uses ANSI escape sequences for cross-platform compatibility.
   */
  clear(): void {
    process.stdout.write(ANSI_CONTROL.clearScreen);
  }

  /**
   * Prompts the user with a question and waits for their input.
   * The returned input is automatically trimmed of whitespace.
   *
   * @param question - The question to display to the user
   * @returns Promise that resolves with the user's trimmed input
   *
   * @example
   * ```typescript
   * const name = await terminal.prompt("Enter your name: ");
   * const age = await terminal.prompt("Enter your age: ");
   * ```
   */
  async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Shows the default prompt ("> ") to indicate the terminal is ready for input.
   * This is automatically called after processing user input.
   */
  showPrompt(): void {
    this.rl.prompt();
  }

  /**
   * Signals that the application should exit.
   * This will trigger the application's onExit lifecycle method.
   */
  exit(): void {
    this.isRunning = false;
    if (this.isRawMode) {
      this.disableRawMode();
    }
  }

  /**
   * Enables raw mode for interactive input without pressing enter.
   * In raw mode, keypresses are captured immediately without buffering.
   * Perfect for games and interactive applications.
   *
   * @example
   * ```typescript
   * terminal.enableRawMode();
   * terminal.onKeypress((key) => {
   *   if (key.name === 'up') moveUp();
   *   if (key.name === 'down') moveDown();
   *   if (key.ctrl && key.name === 'c') terminal.exit();
   * });
   * ```
   */
  enableRawMode(): void {
    if (this.isRawMode) return;

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      readline.emitKeypressEvents(process.stdin);
      process.stdin.on("keypress", this.handleKeypress.bind(this));

      this.isRawMode = true;
    }
  }

  /**
   * Disables raw mode and returns to normal line-based input.
   */
  disableRawMode(): void {
    if (!this.isRawMode) return;

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.removeAllListeners("keypress");
      this.isRawMode = false;
    }
  }

  /**
   * Registers a callback for keypress events when in raw mode.
   *
   * @param callback - Function to call on each keypress
   * @returns Function to unregister the listener
   *
   * @example
   * ```typescript
   * const unsubscribe = terminal.onKeypress((key) => {
   *   console.log('Key pressed:', key.sequence);
   *   if (key.name === 'escape') {
   *     unsubscribe();
   *     terminal.exit();
   *   }
   * });
   * ```
   */
  onKeypress(callback: (key: KeypressEvent) => void): () => void {
    this.keypressListeners.push(callback);
    return () => {
      const index = this.keypressListeners.indexOf(callback);
      if (index > -1) {
        this.keypressListeners.splice(index, 1);
      }
    };
  }

  /**
   * Waits for and returns the next keypress event.
   * Only works when raw mode is enabled.
   *
   * @returns Promise that resolves with the keypress event
   *
   * @example
   * ```typescript
   * terminal.enableRawMode();
   * const key = await terminal.readKey();
   * if (key.name === 'y') {
   *   console.log('User pressed Y');
   * }
   * ```
   */
  async readKey(): Promise<KeypressEvent> {
    if (!this.isRawMode) {
      throw new Error("Raw mode must be enabled to read individual keys");
    }

    return new Promise((resolve) => {
      const handler = (key: KeypressEvent): void => {
        const index = this.keypressListeners.indexOf(handler);
        if (index > -1) {
          this.keypressListeners.splice(index, 1);
        }
        resolve(key);
      };
      this.keypressListeners.push(handler);
    });
  }

  private handleKeypress(str: string | undefined, key: readline.Key): void {
    const keypressEvent: KeypressEvent = {
      sequence: str ?? "",
      name: key?.name ?? str ?? "",
      ctrl: key?.ctrl ?? false,
      meta: key?.meta ?? false,
      shift: key?.shift ?? false,
    };

    for (const listener of this.keypressListeners) {
      listener(keypressEvent);
    }
  }

  /**
   * Runs a terminal application, managing its complete lifecycle.
   * This method:
   * 1. Clears the screen and displays loading message
   * 2. Calls the application's onStart method
   * 3. Sets up input handling to route to onInput
   * 4. Waits for the application to exit
   * 5. Calls onExit and cleans up resources
   *
   * @param app - The application instance to run
   * @returns Promise that resolves when the application exits
   *
   * @example
   * ```typescript
   * const terminal = new Terminal();
   * const app = new MyApp();
   *
   * try {
   *   await terminal.run(app);
   * } catch (error) {
   *   console.error("Application failed:", error);
   * }
   * ```
   */
  async run(app: Application): Promise<void> {
    this.isRunning = true;

    this.clear();
    this.display(`Loading ${app.name} v${app.version}...`, {
      color: "green",
      bold: true,
    });
    this.display("-------------------\n");

    try {
      await app.onStart(this);

      if (this.isRunning) {
        this.showPrompt();

        this.rl.on("line", (input) => {
          if (!this.isRunning) return;

          void (async (): Promise<void> => {
            try {
              await app.onInput(input.trim(), this);
              if (this.isRunning) {
                this.showPrompt();
              }
            } catch (error) {
              this.display(
                `Error: ${error instanceof Error ? error.message : String(error)}`,
                { color: "red" },
              );
              this.showPrompt();
            }
          })();
        });
      }

      await new Promise<void>((resolve) => {
        const checkExit = setInterval(() => {
          if (!this.isRunning) {
            clearInterval(checkExit);
            resolve();
          }
        }, 100);
      });
    } catch (error) {
      this.display(
        `Failed to start application: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { color: "red" },
      );
    } finally {
      await app.onExit(this);
      this.rl.close();
    }
  }
}

// Re-export types for backward compatibility
export type { Application, DisplayOptions } from "../types/index.js";
export type { Color } from "../utils/colors.js";

export interface KeypressEvent {
  sequence: string;
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}
