#include <bits/stdc++.h>
using namespace std;
void my_swap(int &x, int &y) {
    int t = x;
    x = y;
    y = t;
}
int main() {
    int a, b;
    cin >> a >> b;
    my_swap(a, b);
    cout << a << " " << b << endl;
    return 0;
}
