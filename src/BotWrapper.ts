import { ChildProcess, spawn } from "child_process";
import { BotConfig } from "./types";
import { Writable } from "stream";

export enum ErrorCode {
  Success,
  NonZeroExitCode,
  TLE,
  UnexpectedExitOfCode,
}

export class Data {
  id: string;
  data: string | null;
}

export class Bot {
  error_code: ErrorCode;
  active: boolean;
  process: ChildProcess;
  std_out: string[] = [];
  std_err: string[] = [];
  available_time: number;
  stdin: Writable;

  private static readonly starting_available_time: number = 1000; // in ms
  private static readonly plus_time_per_round: number = 1000; // in ms

  public constructor(public id: string, command: string) {
    this.active = true;
    this.error_code = ErrorCode.Success;
    this.available_time = Bot.starting_available_time;

    this.process = spawn(`${command}`, []);
    this.process.on("error", (error) => {
      console.error(error);
      this.error_code = ErrorCode.UnexpectedExitOfCode;
    });

    if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
      throw new Error("process IO not not piped");
    }
    this.stdin = process.stdin;
    this.process.stdout.on("data", this.processData.bind(this));
    this.process.stderr.on("data", (data) => this.std_err.push(data));

    this.process.on("close", () => {
      this.active = false;
    });

    this.process.on("exit", (code) => {
      if (code !== 0) {
        this.error_code = ErrorCode.NonZeroExitCode;
      }
      this.active = false;
    });
  }

  private processData(data: Buffer) {
    data
      .toString()
      .split("\n")
      .map((s: string) => s.trim())
      .filter((s: string) => s !== "")
      .forEach((s: string) => this.std_out.push(s));
  }

  public send(message: string): Promise<void> {
    if (!this.active) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      this.stdin.write(message + "\n", (err) => {
        if (err) {
          console.log("error writing", err);
          reject(err);
        } else {
          resolve();
        }
      });
      this.stdin.emit("drain");
    });
  }

  public async ask(number_of_lines = 1) {
    this.available_time += Bot.plus_time_per_round;
    if (this.error_code !== ErrorCode.Success) {
      return { id: this.id, data: null };
    }

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    while (
      this.std_out.length < number_of_lines &&
      this.available_time > 0 &&
      this.error_code === ErrorCode.Success
    ) {
      this.available_time -= 30;
      await delay(30);
    }

    if (this.std_out.length >= number_of_lines) {
      const data: string = this.std_out.join("\n");
      return { id: this.id, data };
    } else {
      // TLE
      this.error_code = ErrorCode.TLE;
      return { id: this.id, data: null };
    }
  }

  public kill(signal?: NodeJS.Signals | number) {
    return this.process.kill(signal);
  }

  public stop() {
    this.stdin.end();
    this.kill();
  }

  public debug(): void {
    console.log(this.std_out);
  }
}

export class BotPool {
  public bots: Bot[];

  public constructor(bot_configs: BotConfig[]) {
    this.bots = bot_configs.map(({ id, runCommand }) => new Bot(id, runCommand));
  }

  public sendAll(message: string): Promise<void[]> {
    return Promise.all(this.bots.map((b) => b.send(message)));
  }

  public askAll(number_of_lines = 1): Promise<Data[]> {
    return Promise.all(this.bots.map((b) => b.ask(number_of_lines)));
  }

  public killAll(signal?: NodeJS.Signals | number) {
    for (const bot of this.bots) bot.kill(signal);
  }

  public stopAll() {
    for (const bot of this.bots) bot.stop();
  }
}
