const { judgeCode, runCode, PRESET_EXAMPLES } = require('../lib/index.js');

console.log('====================================================');
console.log('🚀 开始验证 Milestone 3: STL 体系与现代语法糖');
console.log('====================================================\n');

// 1. 测试 vector<pair> + make_pair + sort + 范围 for
console.log('--- 1. 测试 STL 容器与排序 (vector<pair> + sort + 范围 for) ---');
const case4 = PRESET_EXAMPLES.find((c) => c.id === 'stl-vector-sort');
const res4 = judgeCode(case4.code, case4.stdin, case4.expected);
console.log('执行步数:', res4.steps, '步 | 耗时:', res4.elapsedMs, 'ms');
console.log('实际输出:', JSON.stringify(res4.stdout));
console.log('判题状态:', res4.status); // 必须是 AC！
if (res4.status !== 'AC') console.log('差异:', res4.diff);

// 2. 测试引用传参与自定义函数
console.log('\n--- 2. 测试引用传参 (void my_swap(int &x, int &y)) ---');
const case5 = PRESET_EXAMPLES.find((c) => c.id === 'func-ref-swap');
const res5 = judgeCode(case5.code, case5.stdin, case5.expected);
console.log('执行步数:', res5.steps, '步 | 耗时:', res5.elapsedMs, 'ms');
console.log('实际输出:', JSON.stringify(res5.stdout));
console.log('判题状态:', res5.status); // 必须是 AC！
if (res5.status !== 'AC') console.log('差异:', res5.diff);

// 3. 测试 string 容器方法
console.log('\n--- 3. 测试 string 容器方法 (size, substr, push_back) ---');
const stringCpp = `
#include <iostream>
#include <string>
using namespace std;
int main() {
    string s;
    cin >> s;
    cout << s.size() << " " << s.substr(0, 5) << endl;
    return 0;
}
`;
const resStr = judgeCode(stringCpp, 'HelloWorld', '10 Hello\n');
console.log('实际输出:', JSON.stringify(resStr.stdout));
console.log('判题状态:', resStr.status); // 必须是 AC！

// 4. 批量跑通全部 5 套预置演示用例
console.log('\n--- 4. 批量自动化验证全部 5 套预置用例 ---');
PRESET_EXAMPLES.forEach((ex, idx) => {
  const r = judgeCode(ex.code, ex.stdin, ex.expected);
  const mark = r.status === 'AC' ? '✅' : '❌';
  console.log(`  [Case ${idx + 1}] ${mark} ${ex.title} -> ${r.status} (${r.steps} 步, ${r.elapsedMs}ms)`);
});
