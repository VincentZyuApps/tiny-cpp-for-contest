const { createVM, runCode, judgeCode } = require('../lib/index.js');

const p1001Cpp = `
#include <iostream>
#include <bits/stdc++.h>
using namespace std;

#define int long long

int main() {
    ios::sync_with_stdio(0); cin.tie(0);
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}
`;

console.log('=== 1. 测试直接运行 runCode ===');
const runRes = runCode(p1001Cpp, '20 22');
console.log('实际输出:', JSON.stringify(runRes.stdout));
console.log('执行步数:', runRes.steps, '步');
console.log('执行状态:', runRes.status);
console.log('返回值:', runRes.exitCode);

console.log('\n=== 2. 测试自动评测 judgeCode (期望 42) ===');
const judgeResAC = judgeCode(p1001Cpp, '20 22', '42\n');
console.log('评测结果 (期望 42):', judgeResAC.status); // 应为 AC

console.log('\n=== 3. 测试自动评测 judgeCode (期望 100 触发 WA) ===');
const judgeResWA = judgeCode(p1001Cpp, '20 22', '100\n');
console.log('评测结果 (期望 100):', judgeResWA.status); // 应为 WA
console.log('WA 差异:', judgeResWA.diff);

console.log('\n=== 4. 测试时间旅行 (Time-Travel) 与 jyy 状态机图模型 ===');
const vm = createVM(p1001Cpp, '20 22');
console.log('初始状态 -> step 1:');
const s1 = vm.step();
console.log('  PC:', s1.line, '行为:', s1.statementDesc, '变量:', s1.scope);

console.log('step 2:');
const s2 = vm.step();
console.log('  PC:', s2.line, '行为:', s2.statementDesc, '变量:', s2.scope);

console.log('step 3:');
const s3 = vm.step();
console.log('  PC:', s3.line, '行为:', s3.statementDesc, '当前输出:', JSON.stringify(s3.stdout));

console.log('⏮ 时间倒流回退上一步 (stepPrev):');
const prev = vm.stepPrev();
console.log('  回退后变量:', prev.scope, '输出还原为:', JSON.stringify(prev.stdout));

console.log('\n📊 jyy 状态机图 (Nodes & Edges):');
const graph = vm.getTraceGraph();
console.log('  节点数量:', graph.nodes.length);
console.log('  边数量:', graph.edges.length);
console.log('  节点详情:');
graph.nodes.forEach((n, idx) => {
  console.log(`    Node[${idx}]: ${n.id} | ${n.statementDesc} | Vars: ${JSON.stringify(n.variables)}`);
});
graph.edges.forEach((e, idx) => {
  console.log(`    Edge[${idx}]: ${e.source} ---> ${e.target} (${e.action})`);
});
