#include <iostream>
#include <chrono>
#include <thread>

using namespace std;

int main(){
    cout << "heylo" << endl;
    std::this_thread::sleep_for(10ms);
    string name;
    cin >> name;
    cout << "helllo" << name << "!" << "\n I'm bot" << std::endl;
    return 0;
}