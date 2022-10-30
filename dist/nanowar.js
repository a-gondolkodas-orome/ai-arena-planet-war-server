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
let mapSize = [100, 100];
let initState = {
    players: [{ id: 1, name: "1" }, { id: 2, name: "2" }],
    planets: [
        { id: 0, position: [0, 0], efficiency: 1 },
        { id: 1, position: [10, 10], efficiency: 1 },
        { id: 2, position: [0, 10], efficiency: 1 },
        { id: 3, position: [10, 0], efficiency: 1 },
    ],
    planetsDistances: [[0, 14, 10, 10], [14, 0, 10, 10], [10, 10, 0, 14], [10, 10, 14, 0]],
    tick: {
        id: 0,
        planets: [
            { id: 0, player: { id: 0, startingTick: 0 }, population: 100 },
            { id: 1, player: { id: 1, startingTick: 0 }, population: 100 },
            { id: 2, player: null, population: 100 },
            { id: 3, player: null, population: 100 },
        ],
        troops: [],
    }
};
let bots = new BotPool(['./bots/idle_bot.out', "./bots/win_bot.out"]);
makeMatch(initState, bots);
function makeMatch(state, bots) {
    return __awaiter(this, void 0, void 0, function* () {
        let workingBots = yield testingBots(state, bots);
        for (let i = 0; i < workingBots.length; i++) {
            console.log("sending starting pos to bot " + i);
            workingBots[i].send(startingPosToString(state, i));
        }
        let isThereActiveBot = true;
        while (isThereActiveBot && state.tick.id < 1000) {
            let userSteps = [];
            for (let i = 0; i < workingBots.length; i++) {
                yield workingBots[i].send(tickToString(state, i));
                let answer = yield workingBots[i].ask();
                let validatedStep = validateStep(state, i, answer.data);
                if (!validatedStep.hasOwnProperty("error")) {
                    userSteps.push(validatedStep);
                }
                else {
                    userSteps.push([]);
                }
            }
            state = updateState(state, userSteps);
            let lastPlayer = -1;
            let atLeastTwoPlayer = false;
            for (let planet of state.tick.planets) {
                if (planet.player !== null) {
                    if (lastPlayer === -1) {
                        lastPlayer = planet.player.id;
                    }
                    else if (lastPlayer !== planet.player.id) {
                        atLeastTwoPlayer = true;
                    }
                }
            }
            if (!atLeastTwoPlayer)
                isThereActiveBot = false;
        }
    });
}
function testingBots(state, bots) {
    return __awaiter(this, void 0, void 0, function* () {
        yield bots.sendAll("START");
        let botAnswers = yield bots.askAll();
        console.log(botAnswers);
        let workingBots = bots.bots.filter((bot, index) => botAnswers[index].data === "OK");
        return workingBots;
    });
}
function startingPosToString(state, player) {
    let numberOfPlanets = state.planets.length;
    let planets = numberOfPlanets.toString() + "\n";
    for (let i = 0; i < numberOfPlanets; i++) {
        planets += state.planets[i].position[0].toString() + " " + state.planets[i].position[1].toString() + " " + state.planets[i].efficiency.toString() + "\n";
    }
    if (state.planetsDistances.length !== numberOfPlanets) {
        throw new Error("Invalid form of planetsDistances");
    }
    let planetsDistances = "";
    for (let i = 0; i < numberOfPlanets; i++) {
        for (let j = 0; j < numberOfPlanets; j++) {
            planetsDistances += state.planetsDistances[i][j].toString() + " ";
        }
        planetsDistances += "\n";
    }
    if (state.tick.planets.length !== numberOfPlanets) {
        throw new Error("Invalid form of tick.planets");
    }
    return player.toString() + "\n" + planets + planetsDistances;
}
function tickToString(state, player) {
    let tick = state.tick.id.toString() + "\n";
    for (let planet of state.tick.planets) {
        let playerID = -1;
        if (planet.player !== null) {
            playerID = planet.player.id;
        }
        tick += planet.id.toString() + " " + playerID + " " + planet.population.toString() + "\n";
    }
    tick += state.tick.troops.length.toString() + "\n";
    for (let troop of state.tick.troops) {
        tick += troop.who + " " + troop.from.toString() + " " + troop.to.toString() + " " + troop.size.toString() + troop.endTick + "\n";
    }
    return tick;
}
function validateStep(state, playerID, input) {
    try {
        let lines = input.concat("\n");
        let numberOfTroops = parseInt(lines[0]);
        let troops = [];
        let fromTo = new Set();
        for (let i = 0; i < numberOfTroops; i++) {
            let [from, to, size] = lines[1].split(" ").map(x => parseInt(x));
            if (state.tick.planets.length < from || state.tick.planets.length < to) {
                return { error: "Invalid planet id" };
            }
            let planetPlayer = state.tick.planets[from].player;
            if (planetPlayer === null) {
                return { error: "Invalid Planet! Planet is not owned by any player" };
            }
            if (planetPlayer.id !== playerID) {
                return { error: "Invalid planet! Planet is owned by other player." };
            }
            if (state.tick.planets[from].population < size) {
                return { error: "Invalid size! You don't have enough troops." };
            }
            if (fromTo.has(from.toString() + "_" + to.toString())) {
                return { error: "Invalid step! You can't send troops from one planet to another more than once." };
            }
            fromTo.add(from.toString() + "_" + to.toString());
            troops.push({ playerID, from, to, size });
        }
        return troops;
    }
    catch (e) {
        return { error: "Invalid input" };
    }
}
function updateState(state, steps) {
    for (let step of steps) {
        for (let troop of step) {
            state.tick.planets[troop.from].population -= troop.size;
            state.tick.troops.push({
                from: troop.from,
                to: troop.to,
                who: troop.playerID,
                size: troop.size,
                endTick: state.tick.id + state.planetsDistances[troop.from][troop.to],
            });
        }
    }
    let planetWaitingList = [];
    for (let i = 0; i < state.tick.troops.length; i++) {
        if (state.tick.troops[i].endTick === state.tick.id) {
            let planet = state.tick.troops[i].to;
            let user = { who: state.tick.troops[i].who, size: state.tick.troops[i].size };
            if (planetWaitingList[planet] === undefined) {
                planetWaitingList[planet] = [user];
            }
            else {
                planetWaitingList[planet].push(user);
            }
            state.tick.troops.splice(i, 1);
            i--;
        }
    }
    for (let i = 0; i < planetWaitingList.length; i++) {
        let planet = planetWaitingList[i];
        if (planet.length === 0) {
            continue;
        }
        let sizes = new Array(state.players.length).fill(0);
        for (let user of planet) {
            sizes[user.who] += user.size;
        }
        let planetOwner = state.tick.planets[i].player;
        if (planetOwner !== null) {
            sizes[planetOwner.id] += state.tick.planets[i].population;
        }
        let max = { who: null, size: 0 };
        let max2 = { who: null, size: 0 };
        for (let i = 0; i < state.players.length; i++) {
            if (sizes[i].size > max.size) {
                max2 = max;
                max = { who: i, size: sizes[i] };
            }
            else if (sizes[i].size > max2.size) {
                max2 = { who: i, size: sizes[i] };
            }
        }
        if (max.size === max2.size) {
            state.tick.planets[i].player = null;
        }
        else if (max.who !== null) {
            state.tick.planets[i].player = { id: max.who, startingTick: state.tick.id };
            state.tick.planets[i].population = max.size - max2.size;
        }
        else {
            throw new Error("Internal Error! Something went wrong with the fight.");
        }
    }
    for (let i = 0; i < state.tick.planets.length; i++) {
        let planet = state.tick.planets[i];
        if (planet.player !== null) {
            let startingTick = planet.player.startingTick;
            let currentTick = state.tick.id;
            let efficiency = state.planets[i].efficiency;
            if (currentTick - startingTick > 0 && (currentTick - startingTick) % efficiency === 0) {
                state.tick.planets[i].population++;
            }
        }
    }
    return state;
}
//# sourceMappingURL=nanowar.js.map