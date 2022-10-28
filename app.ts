// import {spawn} from 'child_process'
import { ChildProcess, spawn } from 'node:child_process';
import { Queue } from 'queue-typescript';



// TODO(Kristof): implement enum for error codes
const time_inc:number = 1000;

class Bot {
    id: number;

    error_code: number;
    active: boolean;
    process: ChildProcess;
    std_out: Queue<string>;
    std_err: Queue<string>;
    awailable_time: number;

    private static next_bot_id = 0;


    constructor(command:string){
        this.id = Bot.next_bot_id++;
        this.active = true;
        this.error_code = 0;
        this.std_out = new Queue<string>();
        this.std_err = new Queue<string>();
        this.awailable_time = 1000;

        this.process = spawn(command, [], {shell: true});
        this.process.on('error', (err) => {
            this.error_code = 1;
        });

        // works reliable, when there is at least 10ms of delay between logs
        this.process.stdout.on('data', this.processData.bind(this));

        this.process.stderr.on('data', (data) => this.std_err.enqueue(data));

        this.process.on('close', (code) => {
            console.log(`child process close all stdio with code ${code}`);
        });
        
        this.process.on('exit', (code) => {
            console.log(`child process exited with code ${code}`);
        })

    }

    processData(data: any) {
        data
            .toString()
            .split('\n')
            .map((s:string) => s.trim())
            .filter((s:string) => s !== '')
            .forEach((s:string) => this.std_out.enqueue(s))
    }

    send(message:string):Promise<void> {
        return new Promise<void>(
            (resolve, reject) => {
                this.process.stdin.write(message + '\n', (err)=>{
                    if(!!err){
                        reject(err);
                    }else{
                        resolve();
                    }
                });
                this.process.stdin.emit('drain');
            }
        );
    }

    // TODO(Kristof): add TLE
    ask() :Promise<any> {
        return new Promise((resolve, reject) => {
            this.process.stdout.pause();
            if(!this.active || this.error_code !== 0) {
                this.process.stdout.resume();
                resolve([this.id, null]);
            } else if(this.std_out.length > 0){
                this.process.stdout.resume();
                resolve([this.id, this.std_out.dequeue()]);
            } else {
                const self = this;
                this.process.stdout.prependOnceListener('data', (data:any) => {
                    self.processData(data);
                    resolve([self.id, self.std_out.dequeue()]);
                });
                this.process.stdout.resume()
            }
        });
    }

    debug():void {
        console.log(this.std_out.toArray());
    }

}

class BotPool {
    bots: Bot[]

    constructor(file_names:string[]){
        //TODO(kristof): check if filename, and file exists
        this.bots = file_names.map(name =>  new Bot(name)); 
    }

    sendAll(message:string):Promise<void[]>{
        return Promise.all(this.bots.map(b => b.send(message)));
    }

    askAll():Promise<any>{
        // console.log(this.bots);
        return Promise.all(this.bots.map(b => b.ask()));
    }
}

function delay(ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function test(){

    let bp : BotPool = new BotPool(['./a.out', './a.out']);
    bp.sendAll('Nem');
    let k = bp.askAll();
    console.log('answer:', k);
    let a = await bp.askAll();
    console.log('anwser:', a);
} 

try {
test();
    
} catch (error) {
console.log(error)    
}