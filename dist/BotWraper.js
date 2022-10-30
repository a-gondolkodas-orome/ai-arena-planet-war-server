var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { spawn } from 'node:child_process';
import { Queue } from 'queue-typescript';
export var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["Success"] = 0] = "Success";
    ErrorCode[ErrorCode["NonZeroExitCode"] = 1] = "NonZeroExitCode";
    ErrorCode[ErrorCode["TLE"] = 2] = "TLE";
    ErrorCode[ErrorCode["UnexpectedExitOfCode"] = 3] = "UnexpectedExitOfCode";
})(ErrorCode || (ErrorCode = {}));
export class Data {
}
export class Bot {
    constructor(command) {
        this.id = Bot.next_bot_id++;
        this.active = true;
        this.error_code = ErrorCode.Success;
        this.std_out = new Queue();
        this.std_err = new Queue();
        this.awailable_time = Bot.starting_awailable_time;
        this.process = spawn(command, [], { shell: true });
        this.process.on('error', (err) => {
            this.error_code = ErrorCode.UnexpectedExitOfCode;
        });
        this.process.stdout.on('data', this.processData.bind(this));
        this.process.stderr.on('data', (data) => this.std_err.enqueue(data));
        this.process.on('close', (code) => {
            this.active = false;
        });
        this.process.on('exit', (code) => {
            if (code !== 0) {
                this.error_code = ErrorCode.NonZeroExitCode;
            }
            this.active = false;
        });
    }
    processData(data) {
        data
            .toString()
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s !== '')
            .forEach((s) => this.std_out.enqueue(s));
    }
    send(message) {
        if (!this.active)
            return new Promise(() => { });
        return new Promise((resolve, reject) => {
            this.process.stdin.write(message + '\n', (err) => {
                if (!!err) {
                    console.log("error", err);
                    reject(err);
                }
                else {
                    resolve();
                }
            });
            this.process.stdin.emit('drain');
        });
    }
    ask() {
        this.awailable_time += Bot.plus_time_per_round;
        if (this.error_code !== ErrorCode.Success) {
            return new Promise(resolve => resolve({ id: this.id, data: null }));
        }
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            while (this.std_out.length === 0 && this.awailable_time > 0 && this.error_code === ErrorCode.Success) {
                this.awailable_time -= 30;
                yield delay(30);
            }
            if (this.std_out.length > 0) {
                resolve({ id: this.id, data: this.std_out.dequeue() });
            }
            else {
                this.error_code = ErrorCode.TLE;
                resolve({ id: this.id, data: null });
            }
        }));
    }
    debug() {
        console.log(this.std_out.toArray());
    }
}
Bot.next_bot_id = 0;
Bot.starting_awailable_time = 1000;
Bot.plus_time_per_round = 1000;
export class BotPool {
    constructor(file_names) {
        this.bots = file_names.map(name => new Bot(name));
    }
    sendAll(message) {
        return Promise.all(this.bots.map(b => b.send(message)));
    }
    askAll() {
        return Promise.all(this.bots.map(b => b.ask()));
    }
}
//# sourceMappingURL=BotWraper.js.map