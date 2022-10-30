import { BotPool } from "./BotWraper";

async function test() {

    let bp: BotPool = new BotPool(['./a.out', './a.out']);
    await bp.sendAll('Expample Name');
    let a = await bp.askAll(2);
    console.log('anwser:', a);
    a = await bp.askAll();
    console.log('anwser:', a);
}


try {
    test();

} catch (error) {
    console.log(error)
}