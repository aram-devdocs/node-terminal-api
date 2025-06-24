import { AppSelector, type AppRegistration } from "./src/apps/AppSelector.js";
import { Terminal } from "./src/core/Terminal.js";
import { WeatherApp } from "./src/apps/Weather.js";
import { SimpleGame } from "./src/apps/SimpleGame.js";
import { SnakeGame } from "./src/apps/SnakeGame.js";
import { FlappyBird } from "./src/apps/FlappyBird.js";
import { DoomArena } from "./src/apps/DoomArena.js";

const apps: AppRegistration[] = [
  {
    name: "Weather App",
    description: "Check weather for any city (Mock API)",
    app: new WeatherApp(),
  },
  {
    name: "Simple Game",
    description: "Move a character on a grid",
    app: new SimpleGame(),
  },
  {
    name: "Snake Game",
    description: "Classic snake game - eat food and grow!",
    app: new SnakeGame(),
  },
  {
    name: "Flappy Bird",
    description: "Navigate through pipes - press space to flap!",
    app: new FlappyBird(),
  },
  {
    name: "Doom Arena",
    description: "Fight waves of demons in an ASCII arena shooter!",
    app: new DoomArena(),
  },
];

const app = new AppSelector(apps);
const terminal = new Terminal();

void terminal.run(app);
