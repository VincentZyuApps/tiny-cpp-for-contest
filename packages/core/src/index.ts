/**
 * packages/core/src/index.ts
 * 核心引擎统一导出 (包含预处理、AST、状态机虚拟机与 STL 系统)
 */

import { preprocessCode } from './preprocessor/index';
import { Lexer } from './lexer/index';
import { Parser } from './parser/index';
import { VirtualMachine } from './runtime/index';
import { ProgramNode, VMRunResult } from './types';

export * from './types';
export * from './stl/index';
export * from './preprocessor/index';
export * from './lexer/index';
export * from './parser/index';
export * from './runtime/index';

/**
 * 预置 5 套教学与演示案例集 (供 WebUI 与 Koishi 插件共享)
 */
export const PRESET_EXAMPLES = [
  {
    id: 'p1001-ab',
    title: '1. 洛谷 P1001 A+B Problem (极速验证)',
    code: `#include <iostream>
using namespace std;
#define int long long
int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`,
    stdin: '20 22',
    expected: '42\n',
  },
  {
    id: 'gcd-statemachine',
    title: '2. 欧几里得算法 GCD (📊 jyy 状态机图专用)',
    code: `#include <iostream>
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
}`,
    stdin: '48 18',
    expected: '6\n',
  },
  {
    id: 'p1428-fishes',
    title: '3. 洛谷 P1428 小鱼比可爱 (分支循环与数组)',
    code: `#include <iostream>
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
}`,
    stdin: '6\n4 3 0 5 1 2',
    expected: '0 0 0 3 1 2 \n',
  },
  {
    id: 'stl-vector-sort',
    title: '4. STL 容器与排序 (vector<pair> + sort + 范围 for)',
    code: `#include <iostream>
#include <vector>
#include <algorithm>
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
}`,
    stdin: '4\n30 10 40 20',
    expected: '10:1 20:3 30:0 40:2 \n',
  },
  {
    id: 'func-ref-swap',
    title: '5. 引用传参与自定义函数 (void swap(int &a, int &b))',
    code: `#include <iostream>
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
}`,
    stdin: '123 456',
    expected: '456 123\n',
  },
];

/**
 * 将 C++ 源码编译解析为 AST
 */
export function compile(rawCode: string): ProgramNode {
  const preprocessed = preprocessCode(rawCode);
  const lexer = new Lexer(preprocessed);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * 创建 C++ 状态机虚拟机实例
 */
export function createVM(rawCode: string, stdin: string = ''): VirtualMachine {
  const ast = compile(rawCode);
  return new VirtualMachine(ast, stdin);
}

/**
 * 直接运行 C++ 源码
 */
export function runCode(
  rawCode: string,
  stdin: string = '',
  maxSteps: number = 100_000
): VMRunResult {
  try {
    const vm = createVM(rawCode, stdin);
    return vm.run(maxSteps);
  } catch (err: any) {
    const msg = String(err?.message || err);
    const isRE = msg.includes('[RE');
    return {
      stdout: '',
      exitCode: -1,
      steps: 0,
      elapsedMs: 0,
      status: isRE ? 'RE' : 'CE',
      diff: {
        expected: '',
        actual: msg,
      },
    };
  }
}

/**
 * 评测 C++ 源码
 */
export function judgeCode(
  rawCode: string,
  stdin: string,
  expectedOutput: string,
  maxSteps: number = 100_000
): VMRunResult {
  try {
    const vm = createVM(rawCode, stdin);
    return vm.judge(expectedOutput, maxSteps);
  } catch (err: any) {
    const msg = String(err?.message || err);
    const isRE = msg.includes('[RE');
    return {
      stdout: '',
      exitCode: -1,
      steps: 0,
      elapsedMs: 0,
      status: isRE ? 'RE' : 'CE',
      diff: {
        expected: expectedOutput,
        actual: msg,
      },
    };
  }
}
