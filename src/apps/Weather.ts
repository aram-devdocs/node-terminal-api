import { Application, Terminal } from "../terminal";

export class WeatherApp implements Application {
  name = "Weather";
  version = "1.0.0";

  private cleanUp() {
    process.exit(0);
  }

  private async checkWeather(city: string) {
    // Simulate API call, then return mock data
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      city: city,
      temperature: 72,
      description: "Sunny",
    };
  }

  async onStart(terminal: Terminal): Promise<void> {
    const city = await terminal.prompt("Enter city name: ");
    terminal.display(`Checking weather for ${city}...`, { color: "blue" });
    const weather = await this.checkWeather(city);
    terminal.display(
      `${weather.city}: ${weather.temperature}°F, ${weather.description}`,
      {
        color: "green",
        bold: true,
        newLine: true,
      }
    );
    terminal.display("Press Enter to exit...", { color: "yellow" });
  }

  async onInput(input: string, terminal: Terminal): Promise<void> {
    terminal.exit();
  }
  async onExit(terminal: Terminal): Promise<void> {
    terminal.display("Exiting...", { color: "red" });
    this.cleanUp();
  }
}
