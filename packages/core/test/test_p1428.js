const { judgeCode, runCode, createVM } = require('../lib/index.js');

const p1428Cpp = `
#include <iostream>
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
            if (a[j] < a[i]) {
                cnt++;
            }
        }
        cout << cnt << " ";
    }
    cout << endl;
    return 0;
}
`;

const sampleInput = `6\n4 3 0 5 1 2`;
const sampleExpected = `0 0 0 3 1 2\n`;

console.log('=== 1. 测试洛谷 P1428 (小鱼比可爱) 运行 ===');
const runRes = runCode(p1428Cpp, sampleInput);
console.log('实际输出:', JSON.stringify(runRes.stdout));
console.log('执行步数:', runRes.steps, '步');
console.log('耗时:', runRes.elapsedMs, 'ms');
console.log('状态:', runRes.status);

console.log('\n=== 2. 测试自动评测 judgeCode ===');
const judgeRes = judgeCode(p1428Cpp, sampleInput, sampleExpected);
console.log('评测结果 (期望 0 0 0 3 1 2):', judgeRes.status); // 必须是 AC！
if (judgeRes.status !== 'AC') {
  console.log('差异对比:', judgeRes.diff);
}

console.log('\n=== 3. 测试数组越界检测 (RE) ===');
const reCpp = `
#include <iostream>
using namespace std;
int a[5];
int main() {
    a[10] = 42;
    return 0;
}
`;
const reRes = runCode(reCpp, '');
console.log('越界执行状态:', reRes.status);
console.log('错误信息:', reRes.diff?.actual);
