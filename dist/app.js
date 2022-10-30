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
    id;
    data;
}
export class Bot {
    id;
    error_code;
    active;
    process;
    std_out;
    std_err;
    awailable_time;
    static next_bot_id = 0;
    static starting_awailable_time = 1000;
    static plus_time_per_round = 1000;
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
        return new Promise(async (resolve) => {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            while (this.std_out.length === 0 && this.awailable_time > 0 && this.error_code === ErrorCode.Success) {
                this.awailable_time -= 30;
                await delay(30);
            }
            if (this.std_out.length > 0) {
                resolve({ id: this.id, data: this.std_out.dequeue() });
            }
            else {
                this.error_code = ErrorCode.TLE;
                resolve({ id: this.id, data: null });
            }
        });
    }
    debug() {
        console.log(this.std_out.toArray());
    }
}
export class BotPool {
    bots;
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
async function test() {
    let bp = new BotPool(['./a.out', './b.py']);
    let k = await bp.askAll();
    console.log('answer:', k);
    await bp.sendAll("Kristof");
    for (let i = 0; i < 10; i++) {
        let a = await bp.askAll();
        console.log(i, 'anwser:', a);
    }
}
try {
    test();
}
catch (error) {
    console.log(error);
}
//# sourceMappingURL=app.js.map