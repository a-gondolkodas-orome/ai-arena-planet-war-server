import * as t from "io-ts";
import { botConfigCodec } from "./common";

export type BotConfig = t.TypeOf<typeof botConfigCodec>;

export const playerCodec = t.type({ id: t.number, name: t.string });
export type Player = t.TypeOf<typeof playerCodec>;
export type PlayerID = Player["id"];

export const planetCodec = t.type({
  id: t.number,
  x: t.number,
  y: t.number,
  efficiency: t.number,
  // just for visualizer
  size: t.number,
});
export type Planet = t.TypeOf<typeof planetCodec>;
export type PlanetID = Planet["id"];

export const tickCodec = t.type({
  id: t.number,
  planets: t.array(
    t.type({
      id: t.number,
      player: t.union([t.type({ id: t.number, startingTick: t.number }), t.null]),
      population: t.number, // It can also have population without player
    }),
  ),
  troops: t.array(
    t.type({
      id: t.number,
      from: t.number,
      to: t.number,
      player: t.number,
      size: t.number,
      endTick: t.number,
    }),
  ),
  //    error: [{tick: number, playerID: PlayerID, error: string}]; //TODO: implement on output to frontend
});
export type Tick = t.TypeOf<typeof tickCodec>;

export type TickVisualizer = {
  planets: {
    id: PlanetID;
    player: string | null;
    population: number; // It can also have population without player
  }[];
  troops: {
    id: number;
    from: PlanetID;
    to: PlanetID;
    player: string;
    size: number;
    distance: number;
    progress: number;
  }[];
  messages: {
    [key: string]: {
      received: { message: string; timestamp: number }[];
      sent: { message: string; timestamp: number }[];
    };
  };
  //    error: [{tick: number, playerID: PlayerID, error: string}]; //TODO: implement on output to frontend
};

// hány troop
// from, to, size

export const gameStateCodec = t.type({
  playerCount: t.number,
  board: t.type({ width: t.number, height: t.number }),
  planets: t.array(planetCodec),
  planetsDistances: t.array(t.array(t.number)),
  tick: tickCodec,
});
export type GameState = t.TypeOf<typeof gameStateCodec>;

export type GameStateVis = {
  init: {
    players: string[];
    board: { width: number; height: number };
    planets: {
      id: PlanetID;
      x: number;
      y: number;
      size: number;
      player: string | null;
    }[];
  };
  ticks: TickVisualizer[];
};

export type UserStep = {
  playerID: PlayerID;
  from: PlanetID;
  to: PlanetID;
  size: number;
}[];
