var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BotPool } from "./BotWraper";
function test() {
    return __awaiter(this, void 0, void 0, function* () {
        let bp = new BotPool(['./a.out', './a.out']);
        yield bp.sendAll('Expample Name');
        let a = yield bp.askAll(2);
        console.log('anwser:', a);
        a = yield bp.askAll();
        console.log('anwser:', a);
    });
}
try {
    test();
}
catch (error) {
    console.log(error);
}
//# sourceMappingURL=main.js.map