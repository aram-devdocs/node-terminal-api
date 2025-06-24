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

    if (options.bold) {
      output = `\x1b[1m${output}\x1b[0m`;
    }

    if (options.newLine !== false) {
      console.log(output);
    } else {
      process.stdout.write(output);
    }
  }

  clear(): void {
    console.clear();
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

        this.rl.on("line", async (input) => {
          if (!this.isRunning) return;

          try {
            await app.onInput(input.trim(), this);
            if (this.isRunning) {
              this.showPrompt();
            }
          } catch (error) {
            this.display(`Error: ${error}`, { color: "red" });
            this.showPrompt();
          }
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
      this.display(`Failed to start application: ${error}`, { color: "red" });
    } finally {
      await app.onExit(this);
      this.rl.close();
    }
  }
}
