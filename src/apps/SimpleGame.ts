import { Terminal, Application } from "../core/Terminal.js";

export class SimpleGame implements Application {
  name = "Simple Game";
  version = "1.0.0";

  private x = 0;
  private y = 0;
  private terminal!: Terminal;

  async onStart(terminal: Terminal): Promise<void> {
    this.terminal = terminal;
    terminal.clear();
    terminal.display("Welcome to Simple Game!", { color: "green", bold: true });
    terminal.display("Use arrow keys to move, 'q' to quit\n");

    terminal.enableRawMode();

    terminal.onKeypress((key) => {
      if (key.name === "q" || (key.ctrl && key.name === "c")) {
        terminal.exit();
        return;
      }

      terminal.clear();

      if (key.name === "up" && this.y > 0) this.y--;
      if (key.name === "down" && this.y < 10) this.y++;
      if (key.name === "left" && this.x > 0) this.x--;
      if (key.name === "right" && this.x < 20) this.x++;

      this.render();
    });

    this.render();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  private render(): void {
    this.terminal.display("Use arrow keys to move, 'q' to quit");
    this.terminal.display(`Position: (${this.x}, ${this.y})\n`);

    for (let row = 0; row <= 10; row++) {
      let line = "";
      for (let col = 0; col <= 20; col++) {
        if (row === this.y && col === this.x) {
          line += "O";
        } else {
          line += ".";
        }
      }
      this.terminal.display(line);
    }
  }

  async onInput(_input: string): Promise<void> {
    // Not used in raw mode
  }

  async onExit(terminal: Terminal): Promise<void> {
    terminal.disableRawMode();
    terminal.display("\nThanks for playing!", { color: "yellow" });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
