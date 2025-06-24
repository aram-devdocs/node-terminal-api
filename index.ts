import { AppSelector, type AppRegistration } from "./src/apps/AppSelector.js";
import { Terminal } from "./src/core/Terminal.js";
import { WeatherApp } from "./src/apps/Weather.js";
import { SimpleGame } from "./src/apps/SimpleGame.js";

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
];

const app = new AppSelector(apps);
const terminal = new Terminal();

void terminal.run(app);
