import { BotPool } from "./BotWraper";

async function test() {

    let bp: BotPool = new BotPool(['./a.out', './a.out']);
    await bp.sendAll('Ne\n m');
    let a = await bp.askAll();
    console.log('anwser:', a);
    a = await bp.askAll();
    console.log('anwser:', a);
    a = await bp.askAll();
    console.log('anwser:', a);
}


try {
    test();

} catch (error) {
    console.log(error)
}