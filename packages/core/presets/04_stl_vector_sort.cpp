#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<pair<int, int>> v;
    for (int i = 0; i < n; i++) {
        int val;
        cin >> val;
        v.push_back(make_pair(val, i));
    }
    sort(v.begin(), v.end());
    for (auto &p : v) {
        cout << p.first << ":" << p.second << " ";
    }
    cout << endl;
    return 0;
}
