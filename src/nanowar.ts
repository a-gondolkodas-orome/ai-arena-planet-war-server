import { Bot, BotPool } from "./BotWrapper";
import {
  PlayerID,
  TickVisualizer,
  GameState,
  GameStateVis,
  UserStep,
  gameStateCodec,
} from "./types";
import * as fs from "fs";
import { decodeJson } from "./codec";
import { matchConfigCodec } from "./common";
import { notNull } from "./utils";

let troopIDCounter = 0;
const tickLog: TickVisualizer[] = [];

if (process.argv.length < 3) {
  console.error("Provide the path to a match config file as command line parameter");
  process.exit(1);
}
const matchConfig = decodeJson(
  matchConfigCodec,
  fs.readFileSync(process.argv[2], { encoding: "utf-8" }),
);
const map = decodeJson(gameStateCodec, fs.readFileSync(matchConfig.map, { encoding: "utf-8" }));
const bots = new BotPool(matchConfig.bots);
makeMatch(map, bots).catch((error) => console.error(error));

// TODOS: bot.doStep(state)

async function makeMatch(state: GameState, bots: BotPool) {
  const workingBots = await testingBots(state, bots);
  for (let i = 0; i < workingBots.length; i++) {
    // Todo: workingbots.bots is ugly
    console.log("sending starting pos to bot " + i);
    await workingBots[i].send(startingPosToString(state, i));
  }
  let isThereAliveBot = true;
  tickToVisualizer(bots, state); // Save for visualizer
  while ((isThereAliveBot || state.tick.troops.length !== 0) && state.tick.id < 100) {
    console.log(state.tick.id, state.tick.planets);
    state.tick.id++;
    const userSteps: UserStep[] = [];
    for (let i = 0; i < workingBots.length; i++) {
      //console.log(tickToString(state, i));
      await workingBots[i].send(tickToString(state));

      // TODO: it's game specific
      const firstAnswer = await workingBots[i].ask();
      //console.log("firstAnswer:", firstAnswer);
      if (firstAnswer.data === null) continue;
      const numberOfMove = myParseInt(firstAnswer.data, { min: 0, max: 100 });
      //console.log(firstAnswer.data);
      const answer = await workingBots[i].ask(numberOfMove);
      if (answer.data === null) continue;
      if (numberOfMove !== 0) {
        console.log("send:", answer);
      }
      //console.log(i, answer.data)

      const validatedStep = validateStep(state, i, numberOfMove, answer.data);
      if ("error" in validatedStep) {
        console.log("ERROR!!!", validatedStep.error);
        userSteps.push([]);
      } else {
        userSteps.push(validatedStep);
      }
    }
    state = updateState(state, userSteps);

    const playersAlive = Array.from(
      new Set(
        state.tick.planets.map((planet) => planet.player?.id).filter((id) => id !== undefined),
      ),
    );
    if (playersAlive.length < 2) isThereAliveBot = false;
    tickToVisualizer(bots, state); // Save for visualizer
  }
  console.log(
    state.tick.id,
    state.tick.planets[0],
    state.tick.planets[1],
    state.tick.planets[2],
    state.tick.planets[3],
    state.tick.planets[4],
    state.tick.planets[5],
  );
  console.log("ENDED");
  stateToVisualizer(bots, state);
  await bots.stopAll();
}

async function testingBots(state: GameState, bots: BotPool): Promise<Bot[]> {
  await bots.sendAll("START");
  const botAnswers = await bots.askAll();
  console.log(botAnswers);
  return bots.bots.filter((bot, index) => botAnswers[index].data === "OK");
}

function startingPosToString(state: GameState, player: PlayerID): string {
  // Planets
  const numberOfPlanets = state.planets.length;
  let planets = numberOfPlanets.toString() + "\n";
  for (let i = 0; i < numberOfPlanets; i++) {
    planets += `${state.planets[i].x} ${state.planets[i].y} ${state.planets[i].efficiency}\n`;
  }

  // Planet distances
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

  // First tick
  if (state.tick.planets.length !== numberOfPlanets) {
    throw new Error("Invalid form of tick.planets");
  }
  return player.toString() + "\n" + planets + planetsDistances;
}

function tickToString(state: GameState): string {
  let tick = state.tick.id.toString() + "\n";
  for (const planet of state.tick.planets) {
    // If no player owns the planet, return -1
    let playerID = -1;
    if (planet.player !== null) {
      playerID = planet.player.id;
    }
    tick += planet.id.toString() + " " + playerID + " " + planet.population.toString() + "\n";
  }
  tick += state.tick.troops.length.toString() + "\n";
  for (const troop of state.tick.troops) {
    tick +=
      troop.player +
      " " +
      troop.from.toString() +
      " " +
      troop.to.toString() +
      " " +
      troop.size.toString() +
      " " +
      troop.endTick +
      "\n";
  }
  return tick;
}

function validateStep(
  state: GameState,
  playerID: PlayerID,
  numberOfTroops: number,
  input: string,
): UserStep | { error: string } {
  // TODO: implement better error messages
  try {
    if (numberOfTroops === 0) return [];
    const lines = input.split("\n");
    const troops: UserStep = [];
    const fromTo = new Set<string>();
    for (let i = 0; i < numberOfTroops; i++) {
      let [from, to, size] = [0, 0, 0];
      try {
        [from, to, size] = lines[i].split(" ").map((x) => myParseInt(x, { throwError: true }));
      } catch (e) {
        return {
          error: `Invalid input in line ${
            i + 1
          }! You should send three numbers separated by spaces.`,
        };
      }
      if (
        state.tick.planets.length < from ||
        state.tick.planets.length < to ||
        from < 0 ||
        to < 0
      ) {
        return {
          error: `Invalid planet id in line ${i + 1}! They should be between 0 and ${
            state.tick.planets.length
          }: ${lines[i]}`,
        };
        // TODO: do not punish so strongly. Just ignore one line if it is invalid, not the whole step.
      }
      const planetPlayer = state.tick.planets[from].player;
      if (planetPlayer === null) {
        return { error: "Invalid Planet! Planet is not owned by any player" };
      }
      if (planetPlayer.id !== playerID) {
        return { error: "Invalid planet! Planet is owned by other player." }; // TODO: insert planet number and owner number
      }
      if (state.tick.planets[from].population < size) {
        return { error: "Invalid size! You don't have enough troops." };
      }
      if (fromTo.has(from.toString() + "_" + to.toString())) {
        return {
          error: "Invalid step! You can't send troops from one planet to another more than once.",
        };
      }
      fromTo.add(from.toString() + "_" + to.toString()); // Little bit ugly
      troops.push({ playerID, from, to, size });
    }
    return troops;
  } catch (e) {
    console.log(e);
    return { error: "Invalid input" }; // TODO: better error message
  }
}

function updateState(state: GameState, steps: UserStep[]): GameState {
  // Add troops that are leaving their planets
  for (const step of steps) {
    for (const troop of step) {
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

  // Process troops that are arriving to their planets, preparing for fight
  const planetWaitingList: { who: PlayerID; size: number }[][] = Array.from(
    Array(state.planets.length),
    () => [],
  ); // TODO: use dictionary instead of array
  for (let i = 0; i < state.tick.troops.length; i++) {
    if (state.tick.troops[i].endTick === state.tick.id) {
      const planet = state.tick.troops[i].to;
      const user = { who: state.tick.troops[i].player, size: state.tick.troops[i].size };
      // Add planets to
      planetWaitingList[planet].push(user);
      console.log("Arrived:", planetWaitingList);
      state.tick.troops.splice(i, 1); // Removing troop from list
      i--;
    }
  }
  // FIGHT!
  for (let i = 0; i < planetWaitingList.length; i++) {
    // i = planetID
    // No one is coming to this planet
    const planet = planetWaitingList[i];
    if (planet.length === 0) {
      continue;
    }
    // Preparing some variables
    const sizes = new Array(state.playerCount + 1).fill(0); // TODO: use dictionary instead of array
    for (const user of planet) {
      sizes[user.who] += user.size;
    }
    // Add neutral planet population to the fight
    sizes[state.playerCount] =
      state.tick.planets[i].player === null ? state.tick.planets[i].population : 0;
    // Planet owner is coming to this planet
    const planetOwner = state.tick.planets[i].player;
    if (planetOwner !== null) {
      // TODO: state.tick.planets[i].player === null
      sizes[planetOwner.id] += state.tick.planets[i].population;
    }
    //console.log("Planet:", state.tick.planets[i]);
    //console.log("Sizes:", sizes);
    // Get the two biggest sizes
    let max: { who: number | null; size: number } = { who: null, size: 0 };
    let max2: { who: number | null; size: number } = { who: null, size: 0 };
    for (let i = 0; i < state.playerCount + 1; i++) {
      if (sizes[i] > max.size) {
        max2 = max;
        max = { who: i, size: sizes[i] };
      } else if (sizes[i] > max2.size) {
        max2 = { who: i, size: sizes[i] };
      }
    }
    //console.log("Maxok:", max, max2)
    // Determine the winner, update the planet
    if (max.size === max2.size) {
      state.tick.planets[i].player = null;
      state.tick.planets[i].population = 0;
    } else if (max.who !== null) {
      if (state.tick.planets[i].player === null || max.who !== state.tick.planets[i].player?.id) {
        // Update player of the planet if it is changes
        state.tick.planets[i].player = { id: max.who, startingTick: state.tick.id };
      }
      state.tick.planets[i].population = max.size - max2.size;
    } else {
      state.tick.planets[i].player = null;
      if (max2.who === null || max2.size === 0) {
        throw new Error("Internal Error! Something went wrong with the fight.");
      }
      state.tick.planets[i].population = max.size - max2.size;
    }
  }
  //console.log("Population:", state.tick.planets[1].population)

  // Add new troops depends on the efficiency and startingTick of the planets
  for (let i = 0; i < state.tick.planets.length; i++) {
    const planet = state.tick.planets[i];
    if (planet.player !== null) {
      const startingTick = planet.player.startingTick;
      const currentTick = state.tick.id;
      const efficiency = state.planets[i].efficiency;
      if (currentTick - startingTick > 0 && (currentTick - startingTick) % efficiency === 0) {
        state.tick.planets[i].population++;
      }
    }
  }

  return state;
}

function tickToVisualizer(botPool: BotPool, state: GameState): void {
  tickLog.push({
    planets: state.tick.planets.map((planet) => {
      return {
        id: planet.id,
        player: planet.player === null ? null : botPool.bots[planet.player.id].id,
        population: planet.population,
      };
    }),
    troops: state.tick.troops.map((troop) => {
      return {
        id: troop.id,
        from: troop.from,
        to: troop.to,
        player: botPool.bots[troop.player].id,
        size: troop.size,
        distance: state.planetsDistances[troop.from][troop.to],
        progress: state.planetsDistances[troop.from][troop.to] - troop.endTick + state.tick.id,
      };
    }),
  });
}

function stateToVisualizer(botPool: BotPool, state: GameState): void {
  const stateVis: GameStateVis = {
    init: {
      board: state.board,
      planets: state.planets.map((planet) => {
        return {
          id: planet.id,
          x: planet.x,
          y: planet.y,
          size: planet.size,
          player: tickLog[0].planets[planet.id].player,
        };
      }),
      players: botPool.bots.map((bot) => bot.id),
    },
    ticks: tickLog,
  };
  fs.writeFileSync("match.log", JSON.stringify(stateVis, undefined, 2), "utf8");
  const score = new Map<string, number>();
  for (const player of stateVis.init.players) score.set(player, 0);
  const lastTick = stateVis.ticks[stateVis.ticks.length - 1];
  for (const planet of lastTick.planets)
    if (planet.player) {
      score.set(planet.player, notNull(score.get(planet.player)) + planet.population);
    }
  for (const troop of lastTick.troops)
    score.set(troop.player, notNull(score.get(troop.player)) + troop.size);
  fs.writeFileSync(
    "score.json",
    JSON.stringify(Object.fromEntries(score.entries()), undefined, 2),
    "utf8",
  );
}

// Note: It accepts "4.0" or "4.", but does not accept "4.2"
function myParseInt(
  value: string,
  { min = -Infinity, max = Infinity, defaultValue = 0, throwError = false },
): number {
  const parsed = Number(value);
  if (Number.isSafeInteger(parsed) && parsed >= min && parsed <= max) {
    return parsed;
  }
  if (throwError) {
    throw new Error(`Invalid number: ${value}`);
  }
  return defaultValue;
}
