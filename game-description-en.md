## Example code

[planet_war_bot.cpp](/public/games/planet-war/planet_war_bot.cpp)

## Game Rules

In this game, players compete to control planets.
The goal is to capture all planets by gathering troops and moving them smartly.
Initially, a certain number of neutral troops are stationed on each planet.
Players start from a single home planet.

Each turn, players can move some of their available units to other planets.
The dispatched units then travel for several rounds to the destination.
During this time, they cannot be controlled and do not interact with other traveling units.
When they arrive at a planet of their own, the number of units is added to the number of units already there.
If they arrive on an enemy planet, the planet will be controlled by the player with the most units, and the number of units will be reduced by the second largest troop size.

### Example

1. If red is present with 5 units and blue arrives with 3, red keeps the planet with 2 units.
2. If red is present with 5 units and blue arrives with 4 and green with 8 units at the same time, then the three players will fight and green will own the planet with 8-5=3 units.

In case of a draw, the planet becomes uninhabited and neutral.
Planets owned by players create new units each turn.
The production of planets (the number of units created per turn) is known at the beginning of the game,
and this does not change during the game.
Neutral planets do not create new units.
Note that if you send all units from a planet, you lose control of it and it will stop producing.

The game ends when only one player has troops (on a planet or in transit).
Alternatively, the game ends after 300 turns even if there is still more than one player alive.
In this case, the player with the most units wins.

You can control units with a program, which is described below.
The programs will play against each other.
The game is played in rounds (also called ticks).
At the beginning of each round, the program will read the current game state, and then you will have to write out what you want to do.
The time limit per round is 30ms. If the program does not respond within this time, you will be dropped from that round.
Then the server calculates what will happen as a result of the action.

## Steps of a round

1. The bots receive the current game state and they send out new commands
2. The sent troops depart
3. The arriving troops fight if they need to (this may be the end of the game for a player)
4. Planets can produce new units

## Communication protocol

Read from standard input and write to standard output (i.e. cin and cout).
It is important that you always write the output in the correct format, i.e. on a single line separated by spaces where appropriate.
It is also important to always use 'endl' or flush the output.

### Initial message exchange

Input: `"START"`\
Output: `"OK"`

Before the game starts, you will receive a message from the server that you must read and then reply to.
("OK" should be written to the standard output.)

Game data (Input only):

`playerID` : integer, the identifier of the current player\.
`P` : (2 ≤ _P_ ≤ 50) integer, this is the number of planets

For each planet (_P_ lines):\
`production`: (1 ≤ _production_ ≤ 10) integer, production of the planet\
The planets are numbered from _0_ to _P-1_ (later planetID), line _i_ contains the data of the planet _i_.

For each pair of planets (symmetric matrix of size _P\*P_):\
`distance[i][j]` : integer, the number of ticks it takes to travel between planet _i_ and _j_ (same in both directions).
If you send units from planet _i_ to _j_ in tick _t_, they will arrive and potentially fight in tick _t+distance[i][j]_.
The direct route between any 2 planets is the shortest.

### Messages per tick

#### Input

`tick`: integer, the number of the current round - increments one by one

Data of planets (_P_ lines):\
`planetID`, `playerID`, `population`: 3 integers, the planet ID, the player ID of the owning player (_-1_ if the planet is neutral) and the current population

`T` : integer, number of troops in transit.

Troops data (_T_ lines):\
`playerID`, `from`, `to`, `count`, `arrive`\
`playerID`: integer, player ID\
`from`, `to`: _planetID_ - integers, starting point and destination of the troops sent (can only be sent from own planet)\
`count`: integer, number of units sent\
`arrive`: integer, the number of the round (tick) when the units will arrive

#### Output

`T`: integer, number of troops to move

Troops data (_T_ lines)\
`from`, `to`, `count`\
`from`, `to`: _planetID_ - integers, starting location and destination of the units being sent (can only be sent from own planet)\
`count`: positive integer, number of units sent

Note, a pair (_from_, _to_) can only be sent once per tick to the server.
If you break this, you will get an error and you will not be allowed to move in that tick.

### Game over

When the game is over, the bot receives a single `-1` as input.
It shouldn't send any response, and it should terminate.

### Example messages

Server:\
`START`\
Bot:\
`OK`\
Server:

```
1
4
0 0 1
10 10 1
0 10 1
10 0 1
0 14 10 10
14 0 10 10
10 10 0 14
10 10 14 0
```

Server (tick 0)

```
0
0 0 100
1 1 100
2 -1 100
3 -1 100
0
```

## The visualizer

Besides animated replay of matches, it supports debugging in particular.
To do this, select in the Player box which bot communication you want to track.
In the messages box, you can see what game state your bot received at the beginning of the tick and what it sent as a response.
The displayed game state already contains the effect of the events of the current tick.

If you also want to see your bot's strategic decisions, write a log for this to the standard error (in C++, e.g. `cerr << "number of evaluated options: 42"`).
You will see in the display your own log for that tick, but at most 2000 characters per tick.

If you see text with a red background at a tick, it means that your bot sent a wrong command or crashed at that tick.
In the latter case, it will obviously not do anything for the rest of the game and will be crossed off the player list.
