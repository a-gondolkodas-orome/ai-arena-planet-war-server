var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { initState3 as initState } from "./initStates";
import { bots3 as bots } from "./initStates";
let troopIDCounter = 0;
let tickLog = [];
makeMatch(initState, bots);
function makeMatch(state, bots) {
    return __awaiter(this, void 0, void 0, function* () {
        let workingBots = yield testingBots(state, bots);
        for (let i = 0; i < workingBots.length; i++) {
            console.log("sending starting pos to bot " + i);
            workingBots[i].send(startingPosToString(state, i));
        }
        let isThereAliveBot = true;
        tickToVisualizer(state);
        while ((isThereAliveBot || state.tick.troops.length !== 0) && state.tick.id < 300) {
            console.log(state.tick.id, state.tick.planets);
            state.tick.id++;
            let userSteps = [];
            for (let i = 0; i < workingBots.length; i++) {
                yield workingBots[i].send(tickToString(state, i));
                let firstAnswer = yield workingBots[i].ask();
                let numberOfMove = parseInt(firstAnswer.data);
                let answer = yield workingBots[i].ask(numberOfMove);
                if (numberOfMove !== 0) {
                    console.log("send:", answer);
                }
                let validatedStep = validateStep(state, i, numberOfMove, answer.data);
                if (!validatedStep.hasOwnProperty("error")) {
                    userSteps.push(validatedStep);
                }
                else {
                    let tmp = validatedStep;
                    console.log("ERRORR!!!", tmp.error);
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
                isThereAliveBot = false;
            tickToVisualizer(state);
        }
        console.log(state.tick.id, state.tick.planets[0], state.tick.planets[1], state.tick.planets[2], state.tick.planets[3], state.tick.planets[4], state.tick.planets[5]);
        console.log("ENDED");
        stateToVisualizer(state);
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
        planets += state.planets[i].x.toString() + " " + state.planets[i].y.toString() + " " + state.planets[i].efficiency.toString() + "\n";
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
        tick += troop.player + " " + troop.from.toString() + " " + troop.to.toString() + " " + troop.size.toString() + " " + troop.endTick + "\n";
    }
    return tick;
}
function validateStep(state, playerID, numberOfTroops, input) {
    try {
        if (numberOfTroops === 0)
            return [];
        let lines = input.split("\n");
        let troops = [];
        let fromTo = new Set();
        for (let i = 0; i < numberOfTroops; i++) {
            let [from, to, size] = lines[i].split(" ").map(x => parseInt(x));
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
        console.log(e);
        return { error: "Invalid input" };
    }
}
function updateState(state, steps) {
    for (let step of steps) {
        for (let troop of step) {
            state.tick.planets[troop.from].population -= troop.size;
            state.tick.troops.push({
                id: troopIDCounter++,
                from: troop.from,
                to: troop.to,
                player: troop.playerID,
                size: troop.size,
                endTick: state.tick.id + state.planetsDistances[troop.from][troop.to],
            });
        }
    }
    let planetWaitingList = Array.from(Array(state.planets.length), () => []);
    for (let i = 0; i < state.tick.troops.length; i++) {
        if (state.tick.troops[i].endTick === state.tick.id) {
            let planet = state.tick.troops[i].to;
            let user = { who: state.tick.troops[i].player, size: state.tick.troops[i].size };
            planetWaitingList[planet].push(user);
            console.log("Arrived:", planetWaitingList);
            state.tick.troops.splice(i, 1);
            i--;
        }
    }
    for (let i = 0; i < planetWaitingList.length; i++) {
        let planet = planetWaitingList[i];
        if (planet.length === 0) {
            continue;
        }
        let sizes = new Array(state.players.length + 1).fill(0);
        for (let user of planet) {
            sizes[user.who] += user.size;
        }
        sizes[state.players.length] = state.tick.planets[i].player === null ? state.tick.planets[i].population : 0;
        let planetOwner = state.tick.planets[i].player;
        if (planetOwner !== null) {
            sizes[planetOwner.id] += state.tick.planets[i].population;
        }
        let max = { who: null, size: 0 };
        let max2 = { who: null, size: 0 };
        for (let i = 0; i < state.players.length + 1; i++) {
            if (sizes[i] > max.size) {
                max2 = max;
                max = { who: i, size: sizes[i] };
            }
            else if (sizes[i] > max2.size) {
                max2 = { who: i, size: sizes[i] };
            }
        }
        if (max.size === max2.size) {
            state.tick.planets[i].player = null;
            state.tick.planets[i].population = 0;
        }
        else if (max.who !== null) {
            state.tick.planets[i].player = { id: max.who, startingTick: state.tick.id };
            state.tick.planets[i].population = max.size - max2.size;
        }
        else if (max.who === null) {
            state.tick.planets[i].player = null;
            if (max2.who === null || max2.size === 0) {
                throw new Error("Internal Error! Something went wrong with the fight.");
            }
            state.tick.planets[i].population = max.size - max2.size;
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
function tickToVisualizer(state) {
    tickLog.push({
        planets: state.tick.planets.map(planet => {
            return {
                id: planet.id,
                player: planet.player === null ? null : planet.player.id,
                population: planet.population,
            };
        }),
        troops: state.tick.troops.map(troop => {
            return {
                id: troop.id,
                from: troop.from,
                to: troop.to,
                player: troop.player,
                size: troop.size,
                distance: state.planetsDistances[troop.from][troop.to],
                progress: state.planetsDistances[troop.from][troop.to] - troop.endTick + state.tick.id,
            };
        }),
    });
}
function stateToVisualizer(state) {
    let stateVis = {
        init: {
            board: state.board,
            planets: state.planets.map(planet => {
                return {
                    id: planet.id,
                    x: planet.x,
                    y: planet.y,
                    size: planet.size,
                    player: tickLog[0].planets[planet.id].player,
                };
            }),
            players: state.players.map(player => {
                return {
                    id: player.id,
                    name: player.name,
                };
            }),
        },
        ticks: tickLog,
    };
    let json = JSON.stringify(stateVis);
    console.log(json);
}
//# sourceMappingURL=nanowar.js.map