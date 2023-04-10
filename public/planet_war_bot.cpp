#include <bits/stdc++.h>

using namespace std;

int my_player_id;
int P;

struct Planet {
  int x, y;
  int efficiency;
  int player_id;
  int population;
};

vector<Planet> planets;
vector<vector<int>> dist;

int tick;
int T;

struct Troop {
  int player_id;
  int from, to;
  int count;
  int arrive;
};

vector<Troop> troops;

/** read and store initial parameters */
void initialize() {
  cin >> my_player_id >> P;

  planets.resize(P);
  for (int i = 0; i < P; ++i) {
    cin >> planets[i].x >> planets[i].y >> planets[i].efficiency;
  }

  dist.resize(P, vector<int>(P));
  for (int i = 0; i < P; ++i) {
    for (int j = 0; j < P; ++j) {
      cin >> dist[i][j];
    }
  }
}

/** read tick data */
bool read_tick() {
  cin >> tick;
  if (tick == -1) {
    return false;
  }

  int planetID;
  for (int i = 0; i < P; ++i) {
    cin >> planetID;
    cin >> planets[planetID].player_id >> planets[planetID].population;
  }

  cin >> T;

  troops.resize(T);
  for (int i = 0; i < T; ++i) {
    cin >> troops[i].player_id >> troops[i].from >> troops[i].to >>
        troops[i].count >> troops[i].arrive;
  }

  return true;
}

struct SendTroop {
  int from, to;
  int count;
};

vector<SendTroop> send_troops;

int main() {
  string greeting;
  cin >> greeting;
  cout << "OK" << endl;

  initialize();
  while (read_tick()) {
    send_troops.clear();
    for (int p1 = 0; p1 < planets.size(); p1++) {
      if (planets[p1].player_id != my_player_id || planets[p1].population < 30)
        continue;
      int attack_planet = -1;
      for (int p2 = 0; p2 < planets.size(); p2++) {
        if (planets[p2].player_id != my_player_id)
          attack_planet = p2;
      }
      if (attack_planet != -1) {
        int unit_count = 10;
        send_troops.push_back({p1, attack_planet, unit_count});
        planets[p1].population -= unit_count;
      }
    }

    cout << send_troops.size() << endl;
    for (const SendTroop &t : send_troops) {
      cout << t.from << ' ' << t.to << ' ' << t.count << endl;
    }
  }
}
