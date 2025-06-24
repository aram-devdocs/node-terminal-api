import type { Application } from "../types/index.js";
import type { Terminal } from "../core/Terminal.js";

export interface AppRegistration {
  name: string;
  description: string;
  app: Application;
}

export class AppSelector implements Application {
  name = "App Selector";
  version = "1.0.0";
  private isInSubApp = false;
  private subApp: Application | null = null;
  private isWaitingForChoice = false;
  private apps: AppRegistration[];

  constructor(apps: AppRegistration[]) {
    this.apps = apps;
  }

  async onStart(terminal: Terminal): Promise<void> {
    if (this.isInSubApp && this.subApp) {
      return this.subApp.onStart(terminal);
    }

    terminal.clear();
    terminal.display(`Welcome to ${this.name} v${this.version}`, {
      color: "green",
      bold: true,
    });
    terminal.display("\nSelect an application to run:\n");

    this.apps.forEach((app, index) => {
      terminal.display(`${index + 1}. ${app.name} - ${app.description}`, {
        color: "green",
      });
    });
    terminal.display("\nq. Quit", { color: "yellow" });

    terminal.display("\nEnter your choice: ", { newLine: false });
    this.isWaitingForChoice = true;
  }

  async onInput(input: string, terminal: Terminal): Promise<void> {
    if (this.isInSubApp && this.subApp) {
      return this.subApp.onInput(input, terminal);
    }

    if (!this.isWaitingForChoice) {
      return;
    }

    this.isWaitingForChoice = false;
    const choice = input.trim().toLowerCase();

    if (choice === "q") {
      terminal.exit();
      return;
    }

    const choiceNum = parseInt(choice, 10);
    if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= this.apps.length) {
      const selectedApp = this.apps[choiceNum - 1];
      this.subApp = selectedApp.app;
      this.isInSubApp = true;
      await this.subApp.onStart(terminal);
    } else {
      terminal.display("\nInvalid choice. Please try again.\n", {
        color: "red",
      });
      terminal.display("Enter your choice: ", { newLine: false });
      this.isWaitingForChoice = true;
    }
  }

  async onExit(terminal: Terminal): Promise<void> {
    if (this.isInSubApp && this.subApp) {
      await this.subApp.onExit(terminal);
    }
    terminal.display("\nThank you for using App Selector!\n", {
      color: "green",
    });
  }
}
