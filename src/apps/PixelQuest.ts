import type { Terminal, Application } from "../core/Terminal.js";

interface Position {
  x: number;
  y: number;
}

interface Player extends Position {
  velocityY: number;
  health: number;
  score: number;
  isJumping: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
}

interface Enemy extends Position {
  velocityX: number;
  health: number;
}

enum GameState {
  Menu = "MENU",
  Playing = "PLAYING",
  GameOver = "GAME_OVER",
  Instructions = "INSTRUCTIONS",
  HighScores = "HIGH_SCORES",
}

export class PixelQuest implements Application {
  name = "Pixel Quest";
  version = "1.0.0";

  private terminal!: Terminal;
  private gameState: GameState = GameState.Menu;
  private selectedMenuItem = 0;
  private menuItems = ["Start Game", "Instructions", "High Scores", "Exit"];

  private player: Player = {
    x: 5,
    y: 10,
    velocityY: 0,
    health: 100,
    score: 0,
    isJumping: false,
  };

  private platforms: Platform[] = [];
  private enemies: Enemy[] = [];
  private gameInterval: NodeJS.Timeout | null = null;
  private level = 1;

  private readonly BOARD_WIDTH = 60;
  private readonly BOARD_HEIGHT = 20;
  private readonly GRAVITY = 0.5;
  private readonly JUMP_FORCE = -3;
  private readonly PLAYER_SPEED = 2;
  private readonly GAME_SPEED = 100;

  async onStart(terminal: Terminal): Promise<void> {
    this.terminal = terminal;
    terminal.clear();
    terminal.enableRawMode();

    terminal.onKeypress((key) => {
      switch (this.gameState) {
        case GameState.Menu:
          this.handleMenuInput(key);
          break;
        case GameState.Playing:
          this.handleGameInput(key);
          break;
        case GameState.Instructions:
        case GameState.HighScores:
        case GameState.GameOver:
          if (key.name === "escape" || key.name === "q") {
            this.gameState = GameState.Menu;
            this.showMenu();
          }
          break;
      }

      if (key.name === "q" || (key.ctrl && key.name === "c")) {
        this.stopGame();
        terminal.exit();
      }
    });

    this.showMenu();

    // Add a small delay to ensure async operation
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  async onInput(_input: string, _terminal: Terminal): Promise<void> {
    // Not used in raw mode
  }

  async onExit(terminal: Terminal): Promise<void> {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    terminal.clear();

    // Add a small delay to ensure async operation
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  private handleMenuInput(key: { name?: string }): void {
    switch (key.name) {
      case "up":
        this.selectedMenuItem =
          (this.selectedMenuItem - 1 + this.menuItems.length) %
          this.menuItems.length;
        this.showMenu();
        break;
      case "down":
        this.selectedMenuItem =
          (this.selectedMenuItem + 1) % this.menuItems.length;
        this.showMenu();
        break;
      case "return":
      case "space":
        this.selectMenuItem();
        break;
    }
  }

  private handleGameInput(key: { name?: string }): void {
    switch (key.name) {
      case "left":
        if (this.player.x > 0) {
          this.player.x -= this.PLAYER_SPEED;
        }
        break;
      case "right":
        if (this.player.x < this.BOARD_WIDTH - 1) {
          this.player.x += this.PLAYER_SPEED;
        }
        break;
      case "space":
      case "up":
        if (!this.player.isJumping) {
          this.player.velocityY = this.JUMP_FORCE;
          this.player.isJumping = true;
        }
        break;
      case "escape":
        this.stopGame();
        this.gameState = GameState.Menu;
        this.showMenu();
        break;
    }
  }

  private showMenu(): void {
    this.terminal.clear();

    // Title
    this.terminal.display("", { newLine: false });
    this.terminal.display("          ╔════════════════════════════════╗");
    this.terminal.display("          ║        PIXEL QUEST             ║");
    this.terminal.display("          ╚════════════════════════════════╝");
    this.terminal.display("");

    // Menu items
    this.menuItems.forEach((item, index) => {
      const isSelected = index === this.selectedMenuItem;
      const prefix = isSelected ? "               ► " : "                 ";
      const itemText = prefix + item;

      if (isSelected) {
        this.terminal.display(itemText, { color: "green", bold: true });
      } else {
        this.terminal.display(itemText);
      }
      if (index < this.menuItems.length - 1) {
        this.terminal.display("");
      }
    });

    this.terminal.display("");
    this.terminal.display("");
    this.terminal.display("        Use ↑↓ to navigate, Enter to select", {
      color: "blue",
    });
  }

  private selectMenuItem(): void {
    switch (this.selectedMenuItem) {
      case 0: // Start Game
        this.startGame();
        break;
      case 1: // Instructions
        this.showInstructions();
        break;
      case 2: // High Scores
        this.showHighScores();
        break;
      case 3: // Exit
        this.terminal.exit();
        break;
    }
  }

  private showInstructions(): void {
    this.gameState = GameState.Instructions;
    this.terminal.clear();

    this.terminal.display("PIXEL QUEST - INSTRUCTIONS", {
      color: "yellow",
      bold: true,
    });
    this.terminal.display("");
    this.terminal.display("Controls:");
    this.terminal.display("  ← → - Move left/right");
    this.terminal.display("  SPACE or ↑ - Jump");
    this.terminal.display("  ESC - Return to menu");
    this.terminal.display("  Q - Quit game");
    this.terminal.display("");
    this.terminal.display("Objective:");
    this.terminal.display("  - Avoid enemies (👾)");
    this.terminal.display("  - Stay on platforms");
    this.terminal.display("  - Reach the end of each level");
    this.terminal.display("  - Collect points to increase score");
    this.terminal.display("");
    this.terminal.display("Press ESC or Q to return to menu", {
      color: "blue",
    });
  }

  private showHighScores(): void {
    this.gameState = GameState.HighScores;
    this.terminal.clear();

    this.terminal.display("HIGH SCORES", { color: "yellow", bold: true });
    this.terminal.display("");

    const scores = [
      { name: "AAA", score: 10000 },
      { name: "BBB", score: 8000 },
      { name: "CCC", score: 6000 },
      { name: "DDD", score: 4000 },
      { name: "EEE", score: 2000 },
    ];

    scores.forEach((entry, index) => {
      const line = `${index + 1}. ${entry.name} .......... ${entry.score}`;
      if (index === 0) {
        this.terminal.display(line, { color: "yellow" });
      } else {
        this.terminal.display(line);
      }
    });

    this.terminal.display("");
    this.terminal.display("Press ESC or Q to return to menu", {
      color: "blue",
    });
  }

  private startGame(): void {
    this.gameState = GameState.Playing;
    this.level = 1;
    this.initializeLevel();
    this.startGameLoop();
  }

  private initializeLevel(): void {
    // Reset player
    this.player = {
      x: 5,
      y: 10,
      velocityY: 0,
      health: 100,
      score: this.player?.score || 0,
      isJumping: false,
    };

    // Create platforms
    this.platforms = [
      { x: 0, y: 18, width: 20 }, // Starting platform
      { x: 25, y: 15, width: 10 },
      { x: 40, y: 12, width: 8 },
      { x: 52, y: 18, width: 8 }, // End platform
    ];

    // Create enemies
    this.enemies = [
      { x: 30, y: 14, velocityX: 0.5, health: 50 },
      { x: 45, y: 11, velocityX: -0.3, health: 30 },
    ];
  }

  private startGameLoop(): void {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }

    this.gameInterval = setInterval(() => {
      this.updateGame();
      this.renderGame();
    }, this.GAME_SPEED);
  }

  private updateGame(): void {
    // Apply gravity
    this.player.velocityY += this.GRAVITY;
    this.player.y += this.player.velocityY;

    // Check platform collisions
    for (const platform of this.platforms) {
      if (
        this.player.x >= platform.x &&
        this.player.x < platform.x + platform.width &&
        this.player.y >= platform.y - 1 &&
        this.player.y <= platform.y + 1 &&
        this.player.velocityY >= 0
      ) {
        this.player.y = platform.y - 1;
        this.player.velocityY = 0;
        this.player.isJumping = false;
        break;
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.x += enemy.velocityX;

      // Reverse direction at boundaries
      if (enemy.x <= 0 || enemy.x >= this.BOARD_WIDTH - 1) {
        enemy.velocityX *= -1;
      }

      // Check collision with player
      if (
        Math.abs(this.player.x - enemy.x) < 2 &&
        Math.abs(this.player.y - enemy.y) < 2
      ) {
        this.player.health -= 10;
        enemy.x += enemy.velocityX * 5; // Push enemy away
      }
    }

    // Check win condition (reached end platform)
    if (this.player.x >= 52 && this.player.x < 60 && !this.player.isJumping) {
      this.level++;
      this.player.score += 1000;
      this.initializeLevel();
    }

    // Check game over conditions
    if (this.player.y > this.BOARD_HEIGHT || this.player.health <= 0) {
      this.gameOver();
    }
  }

  private renderGame(): void {
    this.terminal.clear();

    // Create game board
    const board: string[][] = [];
    for (let y = 0; y < this.BOARD_HEIGHT; y++) {
      board[y] = new Array<string>(this.BOARD_WIDTH).fill(" ");
    }

    // Draw platforms
    for (const platform of this.platforms) {
      if (platform.y >= 0 && platform.y < this.BOARD_HEIGHT) {
        for (let i = 0; i < platform.width; i++) {
          const x = platform.x + i;
          if (x >= 0 && x < this.BOARD_WIDTH) {
            board[platform.y][x] = "═";
          }
        }
      }
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      const x = Math.round(enemy.x);
      const y = Math.round(enemy.y);
      if (x >= 0 && x < this.BOARD_WIDTH && y >= 0 && y < this.BOARD_HEIGHT) {
        board[y][x] = "👾";
      }
    }

    // Draw player
    const px = Math.round(this.player.x);
    const py = Math.round(this.player.y);
    if (px >= 0 && px < this.BOARD_WIDTH && py >= 0 && py < this.BOARD_HEIGHT) {
      board[py][px] = "🟢";
    }

    // Draw HUD
    this.terminal.display(
      `Level: ${this.level}  Health: ${this.player.health}  Score: ${this.player.score}`,
      { color: "yellow", bold: true },
    );
    this.terminal.display("");

    // Draw board
    for (const row of board) {
      this.terminal.display(row.join(""));
    }

    // Draw instructions
    this.terminal.display("");
    this.terminal.display("←→ Move  SPACE Jump  ESC Menu", { color: "blue" });
  }

  private gameOver(): void {
    this.stopGame();
    this.gameState = GameState.GameOver;
    this.terminal.clear();

    this.terminal.display("");
    this.terminal.display("");
    this.terminal.display("                    GAME OVER", {
      color: "red",
      bold: true,
    });
    this.terminal.display("");
    this.terminal.display(`                Final Score: ${this.player.score}`, {
      color: "yellow",
    });
    this.terminal.display("");
    this.terminal.display("");
    this.terminal.display("         Press ESC or Q to return to menu", {
      color: "blue",
    });
  }

  private stopGame(): void {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
  }
}
