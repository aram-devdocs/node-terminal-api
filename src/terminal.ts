import * as readline from "readline";

/**
 * Available colors for terminal output formatting.
 * @typedef {"red" | "green" | "blue" | "yellow" | "reset"} Color
 */
export type Color = "red" | "green" | "blue" | "yellow" | "reset";
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
  color?: Color;

  /** Whether to make the text bold */
  bold?: boolean;

  /** Whether to add a newline after the text (default: true) */
  newLine?: boolean;
}

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
  private currentApp: Application | null = null;
  private isRunning: boolean = false;

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
      const colors: Record<Color, string> = {
        red: "\x1b[31m",
        green: "\x1b[32m",
        blue: "\x1b[34m",
        yellow: "\x1b[33m",
        reset: "\x1b[0m",
      };
      output = `${colors[options.color] || ""}${output}${colors.reset}`;
    }

    if (options.bold === true) {
      output = `\x1b[1m${output}\x1b[0m`;
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
    process.stdout.write("\x1b[2J\x1b[0f");
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
    this.currentApp = app;
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
