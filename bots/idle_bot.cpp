#include <iostream>

#include "utility.hpp"
#include "data.hpp"

using namespace std;


void respond()
{
    // Test some invalid moves
    if (tick % 20 == 0) {
        cout << -1 << endl;
    } else if (tick % 20 == 10) {
        cout << 1 << endl;
        cout << "-1 1 1\n";
    } else {
        cout << 0 << endl;
    }
}


int main()
{
    greeting();
    initialize();
    while (readTick())
    {
        respond();
    }
}
