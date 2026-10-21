const { judgeCode } = require('../lib/index.js');

console.log('=== 测试 queue, stack, priority_queue 算法容器 ===');

// 1. 测试 queue
const queueCpp = `
#include <iostream>
#include <queue>
using namespace std;
int main() {
    queue<int> q;
    q.push(10);
    q.push(20);
    q.push(30);
    while (!q.empty()) {
        cout << q.front() << " ";
        q.pop();
    }
    cout << endl;
    return 0;
}
`;
const qRes = judgeCode(queueCpp, '', '10 20 30 \n');
console.log('[Queue] 评测状态:', qRes.status, '| 输出:', JSON.stringify(qRes.stdout));

// 2. 测试 stack
const stackCpp = `
#include <iostream>
#include <stack>
using namespace std;
int main() {
    stack<int> s;
    s.push(10);
    s.push(20);
    s.push(30);
    while (!s.empty()) {
        cout << s.top() << " ";
        s.pop();
    }
    cout << endl;
    return 0;
}
`;
const sRes = judgeCode(stackCpp, '', '30 20 10 \n');
console.log('[Stack] 评测状态:', sRes.status, '| 输出:', JSON.stringify(sRes.stdout));

// 3. 测试 priority_queue (大根堆)
const pqCpp = `
#include <iostream>
#include <queue>
using namespace std;
int main() {
    priority_queue<int> pq;
    pq.push(20);
    pq.push(50);
    pq.push(10);
    pq.push(40);
    while (!pq.empty()) {
        cout << pq.top() << " ";
        pq.pop();
    }
    cout << endl;
    return 0;
}
`;
const pqRes = judgeCode(pqCpp, '', '50 40 20 10 \n');
console.log('[PriorityQueue] 评测状态:', pqRes.status, '| 输出:', JSON.stringify(pqRes.stdout));
