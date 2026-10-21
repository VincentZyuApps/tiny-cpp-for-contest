const { judgeCode, runCode, createVM } = require('../lib/index.js');

const gcdCpp = `
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    while (b) {
        int t = b;
        b = a % b;
        a = t;
    }
    cout << a << endl;
    return 0;
}
`;

console.log('=== 1. 测试 GCD 辗转相除法运行 (输入: 48 18, 期望 gcd = 6) ===');
const runRes = runCode(gcdCpp, '48 18');
console.log('实际输出:', JSON.stringify(runRes.stdout));
console.log('执行步数:', runRes.steps, '步');
console.log('状态:', runRes.status);

const judgeRes = judgeCode(gcdCpp, '48 18', '6\n');
console.log('判题结果 (期望 6):', judgeRes.status); // 必须是 AC！

console.log('\n=== 2. 测试 GCD 单步调试与 jyy 状态机图模型 ===');
const vm = createVM(gcdCpp, '48 18');
let stepCount = 0;
while (!vm.step().done && stepCount < 25) {
  stepCount++;
}

const graph = vm.getTraceGraph();
console.log(`生成状态节点数: ${graph.nodes.length}, 边数: ${graph.edges.length}`);
console.log('状态机转移路径追踪 (前 10 步):');
graph.edges.slice(0, 10).forEach((e, idx) => {
  console.log(`  [Edge ${idx + 1}] ${e.source} ---> ${e.target} (${e.action})`);
});
