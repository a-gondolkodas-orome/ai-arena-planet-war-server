import { ChildProcess, spawn } from "node:child_process";
import { Queue } from "queue-typescript";
import { BotConfig } from "./types";

export enum ErrorCode {
  Success,
  NonZeroExitCode,
  TLE,
  UnexpectedExitOfCode,
}

export class Data {
  id: string;
  data?: string;
}

export class Bot {
  error_code: ErrorCode;
  active: boolean;
  process: ChildProcess;
  std_out: Queue<string>;
  std_err: Queue<string>;
  available_time: number;

  private static readonly starting_available_time: number = 1000; // in ms
  private static readonly plus_time_per_round: number = 1000; // in ms

  public constructor(public id: string, command: string) {
    this.active = true;
    this.error_code = ErrorCode.Success;
    this.std_out = new Queue<string>();
    this.std_err = new Queue<string>();
    this.available_time = Bot.starting_available_time;

    this.process = spawn(`${command}`, []);
    this.process.on("error", (error) => {
      console.error(error);
      this.error_code = ErrorCode.UnexpectedExitOfCode;
    });

    this.process.stdout.on("data", this.processData.bind(this));
    this.process.stderr.on("data", (data) => this.std_err.enqueue(data));

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
      .forEach((s: string) => this.std_out.enqueue(s));
  }

  public send(message: string): Promise<void> {
    if (!this.active) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      this.process.stdin.write(message + "\n", (err) => {
        if (err) {
          console.log("error writing", err);
          reject(err);
        } else {
          resolve();
        }
      });
      this.process.stdin.emit("drain");
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
      const data: string = Array.from({ length: number_of_lines }, () =>
        this.std_out.dequeue(),
      ).join("\n");
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
    this.process.stdin.end();
    this.kill();
  }

  public debug(): void {
    console.log(this.std_out.toArray());
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