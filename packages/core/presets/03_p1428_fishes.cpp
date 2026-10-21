#include <bits/stdc++.h>
using namespace std;
int a[105];
int main() {
    int n;
    cin >> n;
    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }
    for (int i = 0; i < n; i++) {
        int cnt = 0;
        for (int j = 0; j < i; j++) {
            if (a[j] < a[i]) cnt++;
        }
        cout << cnt << " ";
    }
    cout << endl;
    return 0;
}
