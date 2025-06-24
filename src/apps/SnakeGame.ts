import type { Terminal, Application } from "../core/Terminal.js";

interface Position {
  x: number;
  y: number;
}

enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

export class SnakeGame implements Application {
  name = "Snake Game";
  version = "1.0.0";

  private terminal!: Terminal;
  private snake: Position[] = [];
  private food: Position = { x: 0, y: 0 };
  private direction: Direction = Direction.Right;
  private nextDirection: Direction = Direction.Right;
  private score = 0;
  private gameOver = false;
  private isPaused = false;
  private gameInterval: NodeJS.Timeout | null = null;

  private readonly BOARD_WIDTH = 30;
  private readonly BOARD_HEIGHT = 15;
  private readonly GAME_SPEED = 150; // milliseconds

  async onStart(terminal: Terminal): Promise<void> {
    this.terminal = terminal;
    this.initializeGame();

    terminal.clear();
    terminal.enableRawMode();

    terminal.onKeypress((key) => {
      if (key.name === "q" || (key.ctrl && key.name === "c")) {
        this.stopGame();
        // Set gameOver to true to prevent further updates
        this.gameOver = true;
        // Small delay to ensure cleanup completes
        setTimeout(() => {
          terminal.exit();
        }, 50);
        return;
      }

      if (this.gameOver) {
        if (key.name === "r") {
          this.stopGame(); // Clear existing interval before restarting
          this.initializeGame();
          this.startGame();
        }
        return;
      }

      if (key.name === "p" || key.name === "space") {
        this.togglePause();
        return;
      }

      if (!this.isPaused && !this.gameOver) {
        this.handleDirectionChange(key.name);
      }
    });

    this.startGame();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  private initializeGame(): void {
    // Initialize snake in the middle of the board
    this.snake = [
      {
        x: Math.floor(this.BOARD_WIDTH / 2),
        y: Math.floor(this.BOARD_HEIGHT / 2),
      },
      {
        x: Math.floor(this.BOARD_WIDTH / 2) - 1,
        y: Math.floor(this.BOARD_HEIGHT / 2),
      },
      {
        x: Math.floor(this.BOARD_WIDTH / 2) - 2,
        y: Math.floor(this.BOARD_HEIGHT / 2),
      },
    ];

    this.direction = Direction.Right;
    this.nextDirection = Direction.Right;
    this.score = 0;
    this.gameOver = false;
    this.isPaused = false;

    this.generateFood();
  }

  private startGame(): void {
    // Clear any existing interval to prevent multiple game loops
    this.stopGame();

    this.gameInterval = setInterval(() => {
      if (!this.isPaused && !this.gameOver) {
        this.updateGame();
        this.render();
      }
    }, this.GAME_SPEED);
  }

  private stopGame(): void {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.render();
  }

  private handleDirectionChange(keyName: string): void {
    const newDirection = this.getDirectionFromKey(keyName);
    if (newDirection !== null && this.isValidDirectionChange(newDirection)) {
      this.nextDirection = newDirection;
    }
  }

  private getDirectionFromKey(keyName: string): Direction | null {
    switch (keyName) {
      case "up":
        return Direction.Up;
      case "down":
        return Direction.Down;
      case "left":
        return Direction.Left;
      case "right":
        return Direction.Right;
      default:
        return null;
    }
  }

  private isValidDirectionChange(newDirection: Direction): boolean {
    if (this.snake.length === 1) return true;

    const opposites: Record<Direction, Direction> = {
      [Direction.Up]: Direction.Down,
      [Direction.Down]: Direction.Up,
      [Direction.Left]: Direction.Right,
      [Direction.Right]: Direction.Left,
    };

    return opposites[this.direction] !== newDirection;
  }

  private updateGame(): void {
    this.direction = this.nextDirection;

    const head = { ...this.snake[0] };

    switch (this.direction) {
      case Direction.Up:
        head.y--;
        break;
      case Direction.Down:
        head.y++;
        break;
      case Direction.Left:
        head.x--;
        break;
      case Direction.Right:
        head.x++;
        break;
    }

    // Check wall collision
    if (
      head.x < 0 ||
      head.x >= this.BOARD_WIDTH ||
      head.y < 0 ||
      head.y >= this.BOARD_HEIGHT
    ) {
      this.gameOver = true;
      return;
    }

    // Check self collision
    if (
      this.snake.some((segment) => segment.x === head.x && segment.y === head.y)
    ) {
      this.gameOver = true;
      return;
    }

    this.snake.unshift(head);

    // Check food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.generateFood();
    } else {
      this.snake.pop();
    }
  }

  private generateFood(): void {
    do {
      this.food = {
        x: Math.floor(Math.random() * this.BOARD_WIDTH),
        y: Math.floor(Math.random() * this.BOARD_HEIGHT),
      };
    } while (
      this.snake.some(
        (segment) => segment.x === this.food.x && segment.y === this.food.y,
      )
    );
  }

  private render(): void {
    this.terminal.clear();

    // Title and score
    this.terminal.display("🐍 SNAKE GAME 🐍", { color: "green", bold: true });
    this.terminal.display(`Score: ${this.score}`, { color: "yellow" });
    this.terminal.display("");

    // Controls
    this.terminal.display(
      "Controls: Arrow keys to move, P to pause, Q to quit",
      { color: "blue" },
    );

    if (this.isPaused) {
      this.terminal.display("PAUSED - Press P to resume", {
        color: "yellow",
        bold: true,
      });
    }

    this.terminal.display("");

    // Top border
    let topBorder = "╔";
    for (let i = 0; i < this.BOARD_WIDTH; i++) {
      topBorder += "═";
    }
    topBorder += "╗";
    this.terminal.display(topBorder, { color: "blue" });

    // Game board
    for (let y = 0; y < this.BOARD_HEIGHT; y++) {
      let row = "║";
      for (let x = 0; x < this.BOARD_WIDTH; x++) {
        if (this.isSnakeHead(x, y)) {
          row += "█";
        } else if (this.isSnakeBody(x, y)) {
          row += "▓";
        } else if (this.isFood(x, y)) {
          row += "●";
        } else {
          row += " ";
        }
      }
      row += "║";
      this.terminal.display(row, { color: "blue" });
    }

    // Bottom border
    let bottomBorder = "╚";
    for (let i = 0; i < this.BOARD_WIDTH; i++) {
      bottomBorder += "═";
    }
    bottomBorder += "╝";
    this.terminal.display(bottomBorder, { color: "blue" });

    // Game over message
    if (this.gameOver) {
      this.terminal.display("");
      this.terminal.display("GAME OVER!", { color: "red", bold: true });
      this.terminal.display(`Final Score: ${this.score}`, { color: "yellow" });
      this.terminal.display("Press R to restart or Q to quit", {
        color: "green",
      });
    }
  }

  private isSnakeHead(x: number, y: number): boolean {
    return this.snake[0].x === x && this.snake[0].y === y;
  }

  private isSnakeBody(x: number, y: number): boolean {
    return this.snake
      .slice(1)
      .some((segment) => segment.x === x && segment.y === y);
  }

  private isFood(x: number, y: number): boolean {
    return this.food.x === x && this.food.y === y;
  }

  async onInput(_input: string): Promise<void> {
    // Not used in raw mode
  }

  async onExit(terminal: Terminal): Promise<void> {
    this.stopGame();
    terminal.disableRawMode();
    terminal.display("\nThanks for playing Snake!", { color: "green" });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
