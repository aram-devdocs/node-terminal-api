import type { Terminal, Application, KeypressEvent } from "../core/Terminal.js";

interface Position {
  x: number;
  y: number;
}

interface Entity extends Position {
  health: number;
  maxHealth: number;
}

interface Enemy extends Entity {
  type: "demon" | "imp";
  speed: number;
  damage: number;
  symbol: string;
}

interface Bullet extends Position {
  direction: "up" | "down" | "left" | "right";
  symbol: string;
}

interface PowerUp extends Position {
  type: "health" | "ammo";
  symbol: string;
}

enum GameState {
  Menu = "MENU",
  Playing = "PLAYING",
  GameOver = "GAMEOVER",
  Paused = "PAUSED",
}

export class DoomArena implements Application {
  name = "Doom Arena";
  version = "1.0.0";

  private terminal!: Terminal;
  private gameState: GameState = GameState.Menu;
  private gameInterval: NodeJS.Timeout | null = null;

  private readonly ARENA_WIDTH = 40;
  private readonly ARENA_HEIGHT = 20;
  private readonly GAME_SPEED = 1000 / 30; // 30 FPS

  private player: Entity = {
    x: 20,
    y: 10,
    health: 100,
    maxHealth: 100,
  };

  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private powerUps: PowerUp[] = [];
  private walls: Position[] = [];

  private score = 0;
  private wave = 1;
  private enemiesKilled = 0;
  private ammo = 50;
  private maxAmmo = 50;

  private lastShootTime = 0;
  private shootCooldown = 200; // milliseconds

  async onStart(terminal: Terminal): Promise<void> {
    this.terminal = terminal;
    terminal.clear();
    terminal.enableRawMode();

    terminal.onKeypress((key) => {
      if (key.name === "q" || (key.ctrl && key.name === "c")) {
        this.stopGame();
        setTimeout(() => {
          terminal.exit();
        }, 50);
        return;
      }

      switch (this.gameState) {
        case GameState.Menu:
          if (key.name === "space") {
            this.startNewGame();
          }
          break;

        case GameState.Playing:
          this.handleGameInput(key);
          break;

        case GameState.GameOver:
          if (key.name === "r") {
            this.startNewGame();
          }
          break;

        case GameState.Paused:
          if (key.name === "p") {
            this.gameState = GameState.Playing;
          }
          break;
      }
    });

    this.showMenu();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  private showMenu(): void {
    this.terminal.clear();
    this.terminal.display("", { color: "red" });
    this.terminal.display("  ╔══════════════════════════════╗", {
      color: "red",
    });
    this.terminal.display("  ║       DOOM ARENA            ║", {
      color: "red",
      bold: true,
    });
    this.terminal.display("  ╚══════════════════════════════╝", {
      color: "red",
    });
    this.terminal.display("");
    this.terminal.display("  Survive waves of demons!", { color: "yellow" });
    this.terminal.display("");
    this.terminal.display("  Controls:", { color: "green" });
    this.terminal.display("  WASD - Move");
    this.terminal.display("  Arrow Keys - Shoot");
    this.terminal.display("  P - Pause");
    this.terminal.display("  Q - Quit");
    this.terminal.display("");
    this.terminal.display("  Press SPACE to start", {
      color: "yellow",
      bold: true,
    });
  }

  private startNewGame(): void {
    this.initializeGame();
    this.gameState = GameState.Playing;
    this.startGameLoop();
  }

  private initializeGame(): void {
    this.player = {
      x: Math.floor(this.ARENA_WIDTH / 2),
      y: Math.floor(this.ARENA_HEIGHT / 2),
      health: 100,
      maxHealth: 100,
    };

    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];
    this.walls = this.generateWalls();

    this.score = 0;
    this.wave = 1;
    this.enemiesKilled = 0;
    this.ammo = 50;

    this.spawnWave();
  }

  private generateWalls(): Position[] {
    const walls: Position[] = [];

    // Border walls
    for (let x = 0; x < this.ARENA_WIDTH; x++) {
      walls.push({ x, y: 0 });
      walls.push({ x, y: this.ARENA_HEIGHT - 1 });
    }
    for (let y = 1; y < this.ARENA_HEIGHT - 1; y++) {
      walls.push({ x: 0, y });
      walls.push({ x: this.ARENA_WIDTH - 1, y });
    }

    // Some obstacles
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * (this.ARENA_WIDTH - 10)) + 5;
      const y = Math.floor(Math.random() * (this.ARENA_HEIGHT - 10)) + 5;
      for (let dx = 0; dx < 3; dx++) {
        for (let dy = 0; dy < 2; dy++) {
          if (!this.isPlayerSpawn(x + dx, y + dy)) {
            walls.push({ x: x + dx, y: y + dy });
          }
        }
      }
    }

    return walls;
  }

  private isPlayerSpawn(x: number, y: number): boolean {
    const centerX = Math.floor(this.ARENA_WIDTH / 2);
    const centerY = Math.floor(this.ARENA_HEIGHT / 2);
    return Math.abs(x - centerX) < 3 && Math.abs(y - centerY) < 3;
  }

  private spawnWave(): void {
    const enemyCount = 3 + this.wave * 2;

    for (let i = 0; i < enemyCount; i++) {
      this.spawnEnemy();
    }
  }

  private spawnEnemy(): void {
    let x, y;
    do {
      x = Math.floor(Math.random() * (this.ARENA_WIDTH - 2)) + 1;
      y = Math.floor(Math.random() * (this.ARENA_HEIGHT - 2)) + 1;
    } while (
      this.isWall(x, y) ||
      (Math.abs(x - this.player.x) < 5 && Math.abs(y - this.player.y) < 5)
    );

    const isImp = Math.random() > 0.7;
    const enemy: Enemy = {
      x,
      y,
      type: isImp ? "imp" : "demon",
      health: isImp ? 30 : 50,
      maxHealth: isImp ? 30 : 50,
      speed: isImp ? 0.8 : 0.5,
      damage: isImp ? 10 : 20,
      symbol: isImp ? "d" : "D",
    };

    this.enemies.push(enemy);
  }

  private startGameLoop(): void {
    this.stopGame();

    let lastTime = Date.now();
    let enemyMoveAccumulator = 0;

    this.gameInterval = setInterval(() => {
      if (this.gameState === GameState.Playing) {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        this.updateBullets();

        enemyMoveAccumulator += deltaTime;
        if (enemyMoveAccumulator > 500) {
          // Move enemies every 500ms
          this.updateEnemies();
          enemyMoveAccumulator = 0;
        }

        this.checkCollisions();
        this.checkWaveComplete();
        this.render();

        if (this.player.health <= 0) {
          this.gameState = GameState.GameOver;
        }
      }
    }, this.GAME_SPEED);
  }

  private stopGame(): void {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
  }

  private handleGameInput(key: KeypressEvent): void {
    if (key.name === "p") {
      this.gameState = GameState.Paused;
      return;
    }

    // Movement

    if (key.name === "w" && this.player.y > 1) {
      if (!this.isWall(this.player.x, this.player.y - 1)) {
        this.player.y--;
      }
    }
    if (key.name === "s" && this.player.y < this.ARENA_HEIGHT - 2) {
      if (!this.isWall(this.player.x, this.player.y + 1)) {
        this.player.y++;
      }
    }
    if (key.name === "a" && this.player.x > 1) {
      if (!this.isWall(this.player.x - 1, this.player.y)) {
        this.player.x--;
      }
    }
    if (key.name === "d" && this.player.x < this.ARENA_WIDTH - 2) {
      if (!this.isWall(this.player.x + 1, this.player.y)) {
        this.player.x++;
      }
    }

    // Shooting
    const currentTime = Date.now();
    if (
      currentTime - this.lastShootTime > this.shootCooldown &&
      this.ammo > 0
    ) {
      let direction: "up" | "down" | "left" | "right" | null = null;
      let symbol = "*";

      if (key.name === "up") {
        direction = "up";
        symbol = "|";
      } else if (key.name === "down") {
        direction = "down";
        symbol = "|";
      } else if (key.name === "left") {
        direction = "left";
        symbol = "-";
      } else if (key.name === "right") {
        direction = "right";
        symbol = "-";
      }

      if (direction) {
        this.bullets.push({
          x: this.player.x,
          y: this.player.y,
          direction,
          symbol,
        });
        this.ammo--;
        this.lastShootTime = currentTime;
      }
    }

    // Check for power-up pickup
    this.powerUps = this.powerUps.filter((powerUp) => {
      if (powerUp.x === this.player.x && powerUp.y === this.player.y) {
        if (powerUp.type === "health") {
          this.player.health = Math.min(
            this.player.health + 25,
            this.player.maxHealth,
          );
        } else if (powerUp.type === "ammo") {
          this.ammo = Math.min(this.ammo + 20, this.maxAmmo);
        }
        return false;
      }
      return true;
    });
  }

  private updateBullets(): void {
    this.bullets = this.bullets.filter((bullet) => {
      switch (bullet.direction) {
        case "up":
          bullet.y--;
          break;
        case "down":
          bullet.y++;
          break;
        case "left":
          bullet.x--;
          break;
        case "right":
          bullet.x++;
          break;
      }

      if (this.isWall(bullet.x, bullet.y)) {
        return false;
      }

      return (
        bullet.x > 0 &&
        bullet.x < this.ARENA_WIDTH - 1 &&
        bullet.y > 0 &&
        bullet.y < this.ARENA_HEIGHT - 1
      );
    });
  }

  private updateEnemies(): void {
    this.enemies.forEach((enemy) => {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const moveX = Math.sign(dx);
        const moveY = Math.sign(dy);

        // Simple pathfinding - try to move towards player
        if (Math.random() > 0.5) {
          if (
            moveX !== 0 &&
            !this.isWall(enemy.x + moveX, enemy.y) &&
            !this.isEnemyAt(enemy.x + moveX, enemy.y, enemy)
          ) {
            enemy.x += moveX;
          }
        } else {
          if (
            moveY !== 0 &&
            !this.isWall(enemy.x, enemy.y + moveY) &&
            !this.isEnemyAt(enemy.x, enemy.y + moveY, enemy)
          ) {
            enemy.y += moveY;
          }
        }
      }
    });
  }

  private isEnemyAt(x: number, y: number, excludeEnemy: Enemy): boolean {
    return this.enemies.some(
      (enemy) => enemy !== excludeEnemy && enemy.x === x && enemy.y === y,
    );
  }

  private checkCollisions(): void {
    // Bullet-enemy collisions
    this.bullets = this.bullets.filter((bullet) => {
      let hit = false;
      this.enemies = this.enemies.filter((enemy) => {
        if (bullet.x === enemy.x && bullet.y === enemy.y) {
          enemy.health -= 25;
          hit = true;
          if (enemy.health <= 0) {
            this.score += enemy.type === "imp" ? 50 : 100;
            this.enemiesKilled++;

            // Chance to drop power-up
            if (Math.random() < 0.3) {
              this.powerUps.push({
                x: enemy.x,
                y: enemy.y,
                type: Math.random() < 0.5 ? "health" : "ammo",
                symbol: Math.random() < 0.5 ? "+" : "A",
              });
            }

            return false;
          }
        }
        return true;
      });
      return !hit;
    });

    // Enemy-player collisions
    this.enemies.forEach((enemy) => {
      if (enemy.x === this.player.x && enemy.y === this.player.y) {
        this.player.health -= enemy.damage;
        // Push enemy back
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        if (dx !== 0) enemy.x += Math.sign(dx);
        if (dy !== 0) enemy.y += Math.sign(dy);
      }
    });
  }

  private checkWaveComplete(): void {
    if (this.enemies.length === 0) {
      this.wave++;
      this.spawnWave();

      // Bonus health and ammo at wave completion
      this.player.health = Math.min(
        this.player.health + 20,
        this.player.maxHealth,
      );
      this.ammo = Math.min(this.ammo + 30, this.maxAmmo);
    }
  }

  private isWall(x: number, y: number): boolean {
    return this.walls.some((wall) => wall.x === x && wall.y === y);
  }

  private render(): void {
    this.terminal.clear();

    if (this.gameState === GameState.Paused) {
      this.terminal.display("PAUSED", { color: "yellow", bold: true });
      this.terminal.display("Press P to resume");
      return;
    }

    // HUD
    this.terminal.display(
      `DOOM ARENA - Wave ${this.wave} | Score: ${this.score}`,
      { color: "red", bold: true },
    );
    this.terminal.display(
      `Health: ${"█".repeat(Math.floor(this.player.health / 10))}${" ".repeat(
        10 - Math.floor(this.player.health / 10),
      )} ${this.player.health}/${this.player.maxHealth}`,
      { color: this.player.health > 30 ? "green" : "red" },
    );
    this.terminal.display(
      `Ammo: ${this.ammo}/${this.maxAmmo} | Enemies: ${this.enemies.length}`,
      { color: "yellow" },
    );
    this.terminal.display("");

    // Arena
    for (let y = 0; y < this.ARENA_HEIGHT; y++) {
      let row = "";
      for (let x = 0; x < this.ARENA_WIDTH; x++) {
        if (x === this.player.x && y === this.player.y) {
          row += "@";
        } else if (this.isWall(x, y)) {
          row += "#";
        } else {
          let entity = " ";

          // Check for enemies
          const enemy = this.enemies.find((e) => e.x === x && e.y === y);
          if (enemy) {
            entity = enemy.symbol;
          }

          // Check for bullets
          const bullet = this.bullets.find((b) => b.x === x && b.y === y);
          if (bullet) {
            entity = bullet.symbol;
          }

          // Check for power-ups
          const powerUp = this.powerUps.find((p) => p.x === x && p.y === y);
          if (powerUp) {
            entity = powerUp.symbol;
          }

          row += entity;
        }
      }
      this.terminal.display(row);
    }

    if (this.gameState === GameState.GameOver) {
      this.terminal.display("");
      this.terminal.display("GAME OVER", { color: "red", bold: true });
      this.terminal.display(`Final Score: ${this.score}`, { color: "yellow" });
      this.terminal.display(`Waves Survived: ${this.wave - 1}`, {
        color: "yellow",
      });
      this.terminal.display(`Demons Slain: ${this.enemiesKilled}`, {
        color: "yellow",
      });
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
    terminal.display("\nRip and tear... until it is done!", { color: "red" });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
