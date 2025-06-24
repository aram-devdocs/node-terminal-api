import type { Terminal, Application } from "../core/Terminal.js";

interface Bird {
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  gapY: number;
  gapHeight: number;
}

export class FlappyBird implements Application {
  name = "Flappy Bird";
  version = "1.0.0";

  private terminal!: Terminal;
  private bird: Bird = { y: 0, velocity: 0 };
  private pipes: Pipe[] = [];
  private score = 0;
  private gameOver = false;
  private isPaused = false;
  private gameInterval: NodeJS.Timeout | null = null;
  private pipeSpawnTimer: NodeJS.Timeout | null = null;

  private readonly BOARD_WIDTH = 40;
  private readonly BOARD_HEIGHT = 20;
  private readonly GRAVITY = 0.5;
  private readonly JUMP_VELOCITY = -2;
  private readonly PIPE_WIDTH = 3;
  private readonly PIPE_GAP = 6;
  private readonly PIPE_SPEED = 1;
  private readonly GAME_SPEED = 100; // milliseconds

  async onStart(terminal: Terminal): Promise<void> {
    this.terminal = terminal;
    this.initializeGame();

    terminal.clear();
    terminal.enableRawMode();

    terminal.onKeypress((key) => {
      if (key.name === "q" || (key.ctrl && key.name === "c")) {
        this.stopGame();
        this.gameOver = true;
        setTimeout(() => {
          terminal.exit();
        }, 50);
        return;
      }

      if (this.gameOver) {
        if (key.name === "r") {
          this.stopGame();
          this.initializeGame();
          this.startGame();
        }
        return;
      }

      if (key.name === "p") {
        this.togglePause();
        return;
      }

      if (!this.isPaused && !this.gameOver && key.name === "space") {
        this.flap();
      }
    });

    this.startGame();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  private initializeGame(): void {
    this.bird = {
      y: Math.floor(this.BOARD_HEIGHT / 2),
      velocity: 0,
    };
    this.pipes = [];
    this.score = 0;
    this.gameOver = false;
    this.isPaused = false;
  }

  private startGame(): void {
    this.stopGame();

    // Game update loop
    this.gameInterval = setInterval(() => {
      if (!this.isPaused && !this.gameOver) {
        this.updateGame();
        this.render();
      }
    }, this.GAME_SPEED);

    // Pipe spawning
    this.spawnPipe(); // Spawn first pipe immediately
    this.pipeSpawnTimer = setInterval(() => {
      if (!this.isPaused && !this.gameOver) {
        this.spawnPipe();
      }
    }, 3000); // Spawn pipe every 3 seconds
  }

  private stopGame(): void {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    if (this.pipeSpawnTimer) {
      clearInterval(this.pipeSpawnTimer);
      this.pipeSpawnTimer = null;
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.render();
  }

  private flap(): void {
    this.bird.velocity = this.JUMP_VELOCITY;
  }

  private updateGame(): void {
    // Update bird physics
    this.bird.velocity += this.GRAVITY;
    this.bird.y += this.bird.velocity;

    // Check ground collision
    if (this.bird.y >= this.BOARD_HEIGHT - 1) {
      this.gameOver = true;
      return;
    }

    // Check ceiling collision
    if (this.bird.y < 0) {
      this.bird.y = 0;
      this.bird.velocity = 0;
    }

    // Update pipes
    this.pipes = this.pipes.filter((pipe) => {
      pipe.x -= this.PIPE_SPEED;

      // Check if bird passed the pipe
      if (pipe.x + this.PIPE_WIDTH === 5) {
        this.score++;
      }

      // Check pipe collision
      if (
        pipe.x <= 6 && // Bird x position is at 6
        pipe.x + this.PIPE_WIDTH > 6
      ) {
        const birdY = Math.round(this.bird.y);
        if (birdY < pipe.gapY || birdY >= pipe.gapY + pipe.gapHeight) {
          this.gameOver = true;
        }
      }

      // Remove pipes that have gone off screen
      return pipe.x + this.PIPE_WIDTH > 0;
    });
  }

  private spawnPipe(): void {
    const minGapY = 2;
    const maxGapY = this.BOARD_HEIGHT - this.PIPE_GAP - 2;
    const gapY = Math.floor(Math.random() * (maxGapY - minGapY + 1)) + minGapY;

    this.pipes.push({
      x: this.BOARD_WIDTH,
      gapY: gapY,
      gapHeight: this.PIPE_GAP,
    });
  }

  private render(): void {
    this.terminal.clear();

    // Title and score
    this.terminal.display("🐦 FLAPPY BIRD 🐦", { color: "yellow", bold: true });
    this.terminal.display(`Score: ${this.score}`, { color: "green" });
    this.terminal.display("");

    // Controls
    this.terminal.display("Controls: SPACE to flap, P to pause, Q to quit", {
      color: "blue",
    });

    if (this.isPaused) {
      this.terminal.display("PAUSED - Press P to resume", {
        color: "yellow",
        bold: true,
      });
    }

    this.terminal.display("");

    // Game board
    for (let y = 0; y < this.BOARD_HEIGHT; y++) {
      let row = "";
      for (let x = 0; x < this.BOARD_WIDTH; x++) {
        // Check if position is bird
        if (x === 6 && Math.round(this.bird.y) === y) {
          row += "🐦";
          x++; // Skip next position because emoji takes 2 spaces
          continue;
        }

        // Check if position is pipe
        let isPipe = false;
        for (const pipe of this.pipes) {
          if (
            x >= pipe.x &&
            x < pipe.x + this.PIPE_WIDTH &&
            (y < pipe.gapY || y >= pipe.gapY + pipe.gapHeight)
          ) {
            row += "█";
            isPipe = true;
            break;
          }
        }

        if (!isPipe) {
          // Ground
          if (y === this.BOARD_HEIGHT - 1) {
            row += "═";
          } else {
            row += " ";
          }
        }
      }
      this.terminal.display(row, {
        color: y === this.BOARD_HEIGHT - 1 ? "green" : undefined,
      });
    }

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

  async onInput(_input: string): Promise<void> {
    // Not used in raw mode
  }

  async onExit(terminal: Terminal): Promise<void> {
    this.stopGame();
    terminal.disableRawMode();
    terminal.display("\nThanks for playing Flappy Bird!", { color: "yellow" });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
