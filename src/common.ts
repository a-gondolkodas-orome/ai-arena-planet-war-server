import * as t from "io-ts";

export const botConfigCodec = t.type({ id: t.string, runCommand: t.string });
export const matchConfigCodec = t.type({
  map: t.string,
  bots: t.array(botConfigCodec),
});
