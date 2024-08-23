#include <bits/stdc++.h>

using namespace std;

struct Planet {
  int id;
  int production;
  int player_id;
  int population;
};

struct Troop {
  int player_id;
  int from, to;
  int count;
  int arrive;
};

struct SendTroop {
  int from, to;
  int count;
};

int my_player_id;
int P; // planet count
int tick;
int T; // tick count
vector<Planet> planets;
vector<vector<int>> dist;
vector<Troop> troops;
vector<SendTroop> send_troops;

void initialize();
bool read_tick();

int main() {
  string greeting;
  cin >> greeting;
  cout << "OK" << endl;

  initialize();
  while (read_tick()) {
    send_troops.clear();
    int p1, p2;
    for (p1 = 0; p1 < planets.size(); p1++) {
      if (planets[p1].player_id == my_player_id && planets[p1].population >= 30)
        break;
    }
    for (p2 = 0; p2 < planets.size(); p2++) {
      if (planets[p2].player_id != my_player_id)
        break;
    }
    if (p1 < planets.size() && p2 < planets.size()) {
      int unit_count = 10;
      send_troops.push_back({planets[p1].id, planets[p2].id, unit_count});
      cerr << "Attacking " << planets[p2].id << " from " << planets[p1].id << " with " << unit_count << " units\n";
    }

    cout << send_troops.size() << endl;
    for (const SendTroop &t : send_troops) {
      cout << t.from << ' ' << t.to << ' ' << t.count << endl;
    }
  }
}

// ====================== GAME SERVER COMMUNICATION -- MODIFY AT YOUR OWN RISK ======================

/** read and store initial parameters */
void initialize() {
  cin >> my_player_id >> P;

  planets.resize(P);
  for (int i = 0; i < P; ++i) {
    planets[i].id = i;
    cin >> planets[i].production;
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
