import * as readline from "readline";

export type Color = "red" | "green" | "blue" | "yellow" | "reset";
export interface Application {
  name: string;
  version: string;

  onStart(terminal: Terminal): Promise<void>;
  onInput(input: string, terminal: Terminal): Promise<void>;
  onExit(terminal: Terminal): Promise<void>;
}

export interface DisplayOptions {
  color?: Color;
  bold?: boolean;
  newLine?: boolean;
}

export class Terminal {
  private rl: readline.Interface;
  private currentApp: Application | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "> ",
    });
  }

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

  clear(): void {
    process.stdout.write("\x1b[2J\x1b[0f");
  }

  async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  showPrompt(): void {
    this.rl.prompt();
  }

  exit(): void {
    this.isRunning = false;
  }

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
