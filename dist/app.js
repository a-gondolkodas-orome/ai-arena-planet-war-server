import { spawn } from 'node:child_process';
import { Queue } from 'queue-typescript';
const time_inc = 1000;
class Bot {
    id;
    error_code;
    active;
    process;
    std_out;
    std_err;
    awailable_time;
    static next_bot_id = 0;
    constructor(command) {
        this.id = Bot.next_bot_id++;
        this.active = true;
        this.error_code = 0;
        this.std_out = new Queue();
        this.std_err = new Queue();
        this.awailable_time = 1000;
        this.process = spawn(command, [], { shell: true });
        this.process.on('error', (err) => {
            this.error_code = 1;
        });
        this.process.stdout.on('data', this.processData.bind(this));
        this.process.stderr.on('data', (data) => this.std_err.enqueue(data));
        this.process.on('close', (code) => {
            console.log(`child process close all stdio with code ${code}`);
        });
        this.process.on('exit', (code) => {
            console.log(`child process exited with code ${code}`);
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
        return new Promise((resolve, reject) => {
            this.process.stdin.write(message + '\n', (err) => {
                if (!!err) {
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
        return new Promise((resolve, reject) => {
            this.process.stdout.pause();
            if (!this.active || this.error_code !== 0) {
                this.process.stdout.resume();
                resolve([this.id, null]);
            }
            else if (this.std_out.length > 0) {
                this.process.stdout.resume();
                resolve([this.id, this.std_out.dequeue()]);
            }
            else {
                const self = this;
                this.process.stdout.prependOnceListener('data', (data) => {
                    self.processData(data);
                    resolve([self.id, self.std_out.dequeue()]);
                });
                this.process.stdout.resume();
            }
        });
    }
    debug() {
        console.log(this.std_out.toArray());
    }
}
class BotPool {
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
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function test() {
    let bp = new BotPool(['./a.out', './a.out']);
    await bp.sendAll('Nem');
    let k = await bp.askAll();
    console.log('answer:', k);
    let a = await bp.askAll();
    console.log('anwser:', a);
}
try {
    test();
}
catch (error) {
    console.log(error);
}
//# sourceMappingURL=app.js.map