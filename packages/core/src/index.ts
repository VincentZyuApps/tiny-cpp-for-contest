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
export * from './presets.generated';

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
