import { WeatherApp } from "./src/apps/Weather.js";
import { Terminal } from "./src/terminal.js";

const app = new WeatherApp();
const terminal = new Terminal();



terminal.run(app)
