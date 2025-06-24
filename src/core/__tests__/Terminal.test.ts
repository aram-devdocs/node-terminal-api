import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Terminal } from "../Terminal.js";
import * as readline from "readline";
import type { Application } from "../../types/index.js";

// Mock readline
jest.mock("readline");
const mockReadline = readline as jest.Mocked<typeof readline>;

// Mock process.stdout.write
const mockStdoutWrite = jest.fn();
Object.defineProperty(process.stdout, "write", {
  value: mockStdoutWrite,
  writable: true,
});

describe("Terminal", () => {
  let terminal: Terminal;
  let mockRl: jest.Mocked<
    Pick<readline.Interface, "question" | "prompt" | "on" | "close">
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock readline interface
    mockRl = {
      question: jest.fn(),
      prompt: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<readline.Interface, "question" | "prompt" | "on" | "close">
    >;

    // Mock readline.createInterface to return our mock
    mockReadline.createInterface.mockReturnValue(
      mockRl as unknown as readline.Interface,
    );

    terminal = new Terminal();
  });

  describe("constructor", () => {
    it("should create readline interface with correct config", () => {
      expect(mockReadline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
        prompt: "> ",
      });
    });
  });

  describe("display", () => {
    it("should display plain text with newline by default", () => {
      terminal.display("Hello World");

      expect(mockStdoutWrite).toHaveBeenCalledWith("Hello World\n");
    });

    it("should display text without newline when newLine is false", () => {
      terminal.display("Loading...", { newLine: false });

      expect(mockStdoutWrite).toHaveBeenCalledWith("Loading...");
    });

    it("should apply color formatting", () => {
      terminal.display("Success!", { color: "green" });

      // The colorize function should add ANSI color codes
      expect(mockStdoutWrite).toHaveBeenCalledWith(
        // eslint-disable-next-line no-control-regex
        expect.stringMatching(/\u001b\[32mSuccess!\u001b\[0m\n/),
      );
    });

    it("should apply bold formatting", () => {
      terminal.display("Important!", { bold: true });

      expect(mockStdoutWrite).toHaveBeenCalledWith(
        // eslint-disable-next-line no-control-regex
        expect.stringMatching(/\u001b\[1mImportant!\u001b\[0m\n/),
      );
    });

    it("should apply both color and bold formatting", () => {
      terminal.display("Alert!", { color: "red", bold: true });

      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringMatching(
          // eslint-disable-next-line no-control-regex
          /\u001b\[1m\u001b\[31mAlert!\u001b\[0m\u001b\[0m\n/,
        ),
      );
    });
  });

  describe("clear", () => {
    it("should write clear screen ANSI sequence", () => {
      terminal.clear();

      expect(mockStdoutWrite).toHaveBeenCalledWith("\u001b[2J\u001b[0f");
    });
  });

  describe("prompt", () => {
    it("should prompt user and return trimmed input", async () => {
      const expectedAnswer = "  test input  ";
      const trimmedAnswer = "test input";

      // Mock the question method
      (mockRl.question as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const callback = args[1] as (answer: string) => void;
          callback(expectedAnswer);
        },
      );

      const result = await terminal.prompt("Enter something: ");

      expect(mockRl.question).toHaveBeenCalledWith(
        "Enter something: ",
        expect.any(Function),
      );
      expect(result).toBe(trimmedAnswer);
    });
  });

  describe("showPrompt", () => {
    it("should call readline prompt method", () => {
      terminal.showPrompt();

      expect(mockRl.prompt).toHaveBeenCalled();
    });
  });

  describe("exit", () => {
    it("should set internal running state", () => {
      // We can't directly test the private isRunning property,
      // but we can test that the method exists and runs without error
      expect(() => terminal.exit()).not.toThrow();
    });
  });

  describe("run", () => {
    let mockApp: Application;
    let mockOnStart: jest.MockedFunction<Application["onStart"]>;
    let mockOnInput: jest.MockedFunction<Application["onInput"]>;
    let mockOnExit: jest.MockedFunction<Application["onExit"]>;

    beforeEach(() => {
      // Create mock functions
      mockOnStart = jest.fn() as unknown as jest.MockedFunction<
        Application["onStart"]
      >;
      mockOnInput = jest.fn() as unknown as jest.MockedFunction<
        Application["onInput"]
      >;
      mockOnExit = jest.fn() as unknown as jest.MockedFunction<
        Application["onExit"]
      >;

      // Create a mock app with all required methods
      mockApp = {
        name: "TestApp",
        version: "1.0.0",
        onStart: mockOnStart,
        onInput: mockOnInput,
        onExit: mockOnExit,
      };

      // Set up default return values
      mockOnStart.mockResolvedValue();
      mockOnInput.mockResolvedValue();
      mockOnExit.mockResolvedValue();
    });

    it("should display loading message and app info", async () => {
      // Make the app exit immediately
      mockOnStart.mockImplementation(async (terminal: Terminal) => {
        // Wait for the event loop to process the callback
        await new Promise((resolve) => setTimeout(resolve, 0));
        terminal.exit();
      });

      await terminal.run(mockApp);

      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringMatching(/Loading TestApp v1\.0\.0\.\.\./),
      );
      expect(mockStdoutWrite).toHaveBeenCalledWith("-------------------\n\n");
    });

    it("should call app lifecycle methods in correct order", async () => {
      const callOrder: string[] = [];

      mockOnStart.mockImplementation(async (terminal: Terminal) => {
        // Wait for the event loop to process the callback
        await new Promise((resolve) => setTimeout(resolve, 0));
        callOrder.push("onStart");
        terminal.exit();
      });

      mockOnExit.mockImplementation(async () => {
        // Call the callback to ensure the event loop is processed
        await new Promise((resolve) => setTimeout(resolve, 0));
        callOrder.push("onExit");
      });

      await terminal.run(mockApp);

      expect(callOrder).toEqual(["onStart", "onExit"]);
      expect(mockOnStart).toHaveBeenCalledWith(terminal);
      expect(mockOnExit).toHaveBeenCalledWith(terminal);
    });

    it("should handle errors in onStart gracefully", async () => {
      const error = new Error("Start failed");
      mockOnStart.mockRejectedValue(error);

      await terminal.run(mockApp);

      expect(mockStdoutWrite).toHaveBeenCalledWith(
        expect.stringContaining("Failed to start application: Start failed"),
      );
      expect(mockOnExit).toHaveBeenCalledWith(terminal);
    });

    it("should close readline interface when finished", async () => {
      mockOnStart.mockImplementation(async (terminal: Terminal) => {
        // Wait for the event loop to process the callback
        await new Promise((resolve) => setTimeout(resolve, 0));
        terminal.exit();
      });

      await terminal.run(mockApp);

      expect(mockRl.close).toHaveBeenCalled();
    });
  });
});
