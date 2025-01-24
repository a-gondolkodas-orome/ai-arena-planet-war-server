## Példa kód

[planet_war_bot.cpp](/public/games/planet-war/planet_war_bot.cpp)

## Játékszabályok

Ebben a játékban bolygók irányításáért versenyeznek a játékosok.
A cél, hogy csapatok gyűjtésével és azok okos mozgatásával minden bolygót elfoglaljunk.
A bolygókon kezdetben bizonyos számú semleges csapat állomásozik.
A játékosok egy-egy anyabolygóról indulnak.

A játékosok minden körben elindíthatják a rendelkezésre álló egységek egy részét a többi bolygó felé.
Az elküldött egységek ezután több körön keresztül utaznak a cél felé.
Ezalatt nem irányíthatók és nem lépnek interakcióba a többi utazó egységgel.
Ha megérkeznek egy saját bolygóra, akkor az egységek száma hozzáadódik a már ott lévőkhöz.
Ha ellenséges bolygóra érnek, akkor a bolygó annak az irányítása alá kerül, akinek a legtöbb egysége van, és az egységek száma a második legnagyobb csapatmérettel csökken.

### Példa

1. Ha piros 5 egységgel van jelen, és kék 3-al érkezik, akkor piros megtartja a bolygót 2 egységgel.
2. Ha piros 5 egységgel van jelen, kék 4, zöld pedig 8 egységgel egyszerre érkeznek meg, akkor 3-an harcolnak és zöld lesz a bolygó tulajdonosa 8-5=3 egységgel.

Döntetlen esetén a bolygó lakatlan lesz és semlegessé válik.
A játékosok által birtokolt bolygók minden körben új egységeket hoznak létre.
A bolygók termelését (a körönként létrehozott egységek számát) a játék elején mindenki megtudja,
és ez a játék során nem változik.
Semleges bolygók nem hoznak létre új egységet.
Figyelem, ha az összes egységet elküldöd egy bolygóról, akkor elveszted felette az irányítást, és az nem termel tovább.

A játéknak akkor van vége, ha már csak egy játékosnak van egysége (bolygón vagy úton).
Illetve 300 kör után akkor is véget ér a játék, ha még több játékos is életben van.
Ilyenkor az nyer, akinek összesen a legtöbb egysége van.

Az egységeket programmal fogjátok tudni irányítani, amit alább részletezünk.
A programok egymás ellen fognak játszani.
A játék körökre osztva zajlik (a köröket tick-nek is hívjuk).
A program minden kör elején beolvassa az aktuális játékállapotot, majd ki kell írnia, mit szeretne lépni.
A körönkénti időlimit 30ms. Ha ezen belül nem válaszol a program, abból a körből kimarad.
Ezután a szerver kiszámolja, mi fog történni az akciók hatására.

## Egy kör lejátszásának lépései

1. A botok megkapják az aktuális játékállást és új parancsokat adnak ki
2. Az elküldött csapatok elindulnak
3. A célbaérő csapatok megérkeznek és harcolnak, ha kell (Itt vége lehet a játéknak egy játékos számára)
4. A bolygók új egységeket hozhatnak létre

## Kommunikációs protokoll

A standard inputról kell olvasni, és standard outputra írni (azaz pl. cin és cout).
Fontos, hogy mindig megfelelő formátumban írjunk ki, azaz egy sorban szóközzel elválasztva, ahol kell.
Az is fontos, hogy használjatok 'endl'-t vagy flush-oljátok mindig az output-ot.

### Kezdeti üzenetváltás

Bemenet: `"START"`\
Kimenet: `"OK"`

A játék megkezdése előtt kaptok egy üzenetet a szervertől, amit ki kell olvasnotok, majd válaszolni rá.
("OK"-ot kell a standard outputra írni.)

Pálya adatok (csak Bemenet):

`playerID` : egész szám, a játékos azonosítója\
`P`: (2 ≤ _P_ ≤ 50) egész szám, ennyi bolygó van

Minden bolygóra (_P_ sor):\
`production`: (1 ≤ _production_ ≤ 10) egész szám, a bolygó ennyi egységet termel körönként\
A bolygókat _0_-tól _P-1_-ig számozzuk (később planetID), az _i_. sor az _i_ sorszámú bolygó adatait tartalmazza.

Minden bolygó-párra (_P\*P_-s szimmetrikus mátrix):\
`distance[i][j]` : egész szám, az _i_. és _j_. bolygó között ennyi körig tart az utazás (mindkét irányban ugyanannyi).
Ha a _t_. tickben küldtök egységeket az _i_. bolygóról a _j_.-re, akkor azok a _t+distance[i][j]_. tickben fognak megérkezni, és potenciálisan harcolni.
Bármely 2 bolygó között a közvetlen út a legrövidebb.

### Körönkénti üzenetek

#### Bemenet

`tick`: egész, az adott kör sorszáma - egyesével nő

Bolygók adatai (_P_ sor):\
`planetID`, `playerID`, `population`: 3 egész szám, a bolygó azonosítója, a birtokló játékos azonosítója (_-1_, ha semleges a bolygó) és a jelenlegi populáció

`T` : egész szám, az úton lévő egységek száma.

Egységek adatai (_T_ sor):\
`playerID`, `from`, `to`, `count`, `arrive`\
`playerID`: egész, a játékos azonosítója\
`from`, `to`: _planetID_ - egész számok, a küldött egységek kiindulási helye és célja (csak saját bolygóról lehet küldeni)\
`count`: egész, a küldött egységek száma\
`arrive`: egész, a kör (tick) azonosító száma, amikor az egységek meg fognak érkezni

#### Kimenet

`T`: egész, a mozgatott csapatok száma

A csapatok adatai (_T_ sor)\
`from`, `to`, `count`\
`from`, `to`: _planetID_ - egész számok, a küldött egységek kiindulási helye és célja (csak saját bolygóról lehet küldeni)\
`count`: pozitív egész, a küldött egységek száma

Figyelem, egy (_from_, _to_) párost csak egyszer küldhettek el egy körön (ticken) belül a szervernek.
Ha ezt megszegitek, hibát kaptok és abban a körben nem léphettek.

### Játék vége

Ha a játéknak vége, a bot egyetlen `-1`-et kap a bemeneten.
Erre ne válaszoljon, és érjen véget a program.

### Példa üzenetek

Szerver:\
`START`\
Bot:\
`OK`\
Szerver:

```
1
4
1
1
2
2
0 14 10 10
14 0 10 10
10 10 0 14
10 10 14 0
```

Szerver (tick 0)

```
0
0 0 100
1 1 100
2 -1 100
3 -1 100
0
```

Bot (tick 0)

```
1
0 2 50
```

## A megjelenítő

A meccsek animált visszajátszása mellett első sorban a hibakeresést támogatja.
Ehhez a Player dobozban válaszd ki, hogy melyik bot kommunikációját szeretnéd követni.
Az üzenetek mezőben látod, hogy milyen játék állapotot kaptt a botod a tick elején, és erre mit válaszolt.
A megjelenített játék állapot az adott tick eseményeinek hatását már tartalmazza.

Ha a botod stratégiai döntéseit is szeretnéd látni, írj ki erre vonatkozó logot a standard errorra (c++-ban pl. `cerr << "megvizsgált lehetőségek száma: 42"`).
A megjelenítőben látni fogod az adott tickhez kiírt saját logodat, de tickenként max 2000 karaktert.

Ha egy ticknél piros hátterű szöveget látsz, az azt jelenti, hogy a botod abban a tickben hibás parancso(ka)t küldött, vagy crashelt.
Az utóbbi esetben a játék hátralévő részében nyilván nem csinál semmit, a játékos listában is ki lesz húzva.
