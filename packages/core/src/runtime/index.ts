/**
 * packages/core/src/runtime/index.ts
 * 虚拟机与状态机解释器 (Virtual Machine / State Machine Evaluator)
 *
 * Milestone 3 核心特性:
 * - 宿主 STL 体系 (HostVector, HostString, HostPair) 深度集成
 * - 宿主算法 (sort, reverse, max, min, abs, make_pair)
 * - 范围 for 循环 (for (auto &x : v))
 * - 用户函数调用与引用传参 (&x)
 * - 完备的时间旅行 (step/stepPrev) 与 jyy 状态机图模型
 */

import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  ScopeVariables,
  ScopeValue,
  VMStepSnapshot,
  VMRunResult,
  StateMachineNode,
  StateMachineEdge,
  StateMachineGraph,
  FunctionDeclNode,
} from '../types';
import {
  HostVector,
  HostString,
  HostPair,
  HostQueue,
  HostStack,
  HostPriorityQueue,
  HostAlgorithms,
} from '../stl';

interface RefBinding {
  targetScope: ScopeVariables;
  targetKey: string;
}

export class VirtualMachine {
  private program: ProgramNode;

  // 待执行语句队列
  private executionQueue: StatementNode[] = [];

  // 函数字典
  private functionMap: Map<string, FunctionDeclNode> = new Map();

  // 运行现场环境
  private scope: ScopeVariables = {};

  // 引用变量映射表: 变量名 -> { targetScope, targetKey }
  private refMap: Map<string, RefBinding> = new Map();

  private stdoutBuffer: string = '';
  private stdinTokens: string[] = [];
  private stdinCursor: number = 0;

  private isHalted: boolean = false;
  private exitCode: number = 0;
  private stepCount: number = 0;

  // 快照栈 (用于时间旅行与回溯)
  private history: VMStepSnapshot[] = [];

  // jyy 状态机图记录
  private graphNodes: StateMachineNode[] = [];
  private graphEdges: StateMachineEdge[] = [];
  private lastStateNodeId: string | null = null;

  constructor(program: ProgramNode, stdin: string = '') {
    this.program = program;
    this.initStdin(stdin);
    this.initFunctions();
    this.initGlobals();
    this.initMain();
    this.recordInitialState();
  }

  private initStdin(stdin: string): void {
    const tokens = stdin.trim().split(/\s+/).filter(Boolean);
    this.stdinTokens = tokens;
    this.stdinCursor = 0;
  }

  private initFunctions(): void {
    for (const func of this.program.functions) {
      this.functionMap.set(func.name, func);
    }
  }

  private initGlobals(): void {
    for (const glob of this.program.globals || []) {
      for (const item of glob.declarations) {
        this.declareVariable(glob.varType, item);
      }
    }
  }

  private initMain(): void {
    const mainFunc = this.functionMap.get('main');
    if (!mainFunc) {
      throw new Error('[Runtime 错误] 未找到 main() 入口函数！');
    }
    this.executionQueue = [...mainFunc.body.body];
  }

  private declareVariable(varType: string, item: any): void {
    const typeLower = varType.toLowerCase();

    // 1. vector 容器
    if (typeLower.startsWith('vector')) {
      let initialSize = 0;
      let defaultVal = 0;
      if (item.initArgs && item.initArgs.length > 0) {
        initialSize = Number(this.evaluateExpression(item.initArgs[0]));
        if (item.initArgs.length > 1) {
          defaultVal = this.evaluateExpression(item.initArgs[1]);
        }
      }
      this.setVariableValue(item.name, new HostVector(initialSize, defaultVal));
      return;
    }

    // 2. string 容器
    if (typeLower.startsWith('string')) {
      let strVal = '';
      if (item.init) {
        strVal = String(this.evaluateExpression(item.init));
      } else if (item.initArgs && item.initArgs.length > 0) {
        strVal = String(this.evaluateExpression(item.initArgs[0]));
      }
      this.setVariableValue(item.name, new HostString(strVal));
      return;
    }

    // 3. pair 容器
    if (typeLower.startsWith('pair')) {
      let first = 0;
      let second = 0;
      if (item.initArgs && item.initArgs.length >= 2) {
        first = this.evaluateExpression(item.initArgs[0]);
        second = this.evaluateExpression(item.initArgs[1]);
      } else if (item.init) {
        const p = this.evaluateExpression(item.init);
        if (p instanceof HostPair) {
          first = p.first;
          second = p.second;
        }
      }
      this.setVariableValue(item.name, new HostPair(first, second));
      return;
    }

    // 4. queue 容器
    if (typeLower.startsWith('queue')) {
      this.setVariableValue(item.name, new HostQueue());
      return;
    }

    // 5. stack 容器
    if (typeLower.startsWith('stack')) {
      this.setVariableValue(item.name, new HostStack());
      return;
    }

    // 6. priority_queue 容器
    if (typeLower.startsWith('priority_queue')) {
      this.setVariableValue(item.name, new HostPriorityQueue());
      return;
    }

    // 7. 一维静态数组: int a[105]
    if (item.arraySize !== undefined) {
      this.setVariableValue(item.name, new Array(item.arraySize).fill(0));
      return;
    }

    // 5. 基础标量
    let val: any = 0;
    if (item.init) {
      val = this.evaluateExpression(item.init);
    }
    this.setVariableValue(item.name, val);
  }

  private setVariableValue(name: string, val: any): void {
    if (this.refMap.has(name)) {
      const binding = this.refMap.get(name)!;
      binding.targetScope[binding.targetKey] = val;
    } else {
      this.scope[name] = val;
    }
  }

  private getVariableValue(name: string): any {
    if (this.refMap.has(name)) {
      const binding = this.refMap.get(name)!;
      return binding.targetScope[binding.targetKey];
    }
    return this.scope[name];
  }

  private deepCloneScope(src: ScopeVariables): Record<string, any> {
    const cloned: Record<string, any> = {};
    for (const [k, v] of Object.entries(src)) {
      if (v instanceof HostVector) {
        cloned[k] = v.clone();
      } else if (v instanceof HostString) {
        cloned[k] = v.clone();
      } else if (v instanceof HostPair) {
        cloned[k] = v.clone();
      } else if (v instanceof HostQueue) {
        cloned[k] = v.clone();
      } else if (v instanceof HostStack) {
        cloned[k] = v.clone();
      } else if (v instanceof HostPriorityQueue) {
        cloned[k] = v.clone();
      } else if (Array.isArray(v)) {
        cloned[k] = [...v];
      } else {
        cloned[k] = v;
      }
    }
    return cloned;
  }

  private recordInitialState(): void {
    const initSnapshot: VMStepSnapshot = {
      stepIndex: 0,
      line: this.executionQueue[0]?.loc.line || 1,
      column: this.executionQueue[0]?.loc.column || 1,
      statementDesc: 'Program Start (S0)',
      scope: this.deepCloneScope(this.scope),
      stdout: '',
      stdinCursor: 0,
      done: false,
    };
    this.history.push(initSnapshot);

    const initNodeId = 'S0_start';
    this.lastStateNodeId = initNodeId;
    this.graphNodes.push({
      id: initNodeId,
      stepIndex: 0,
      line: initSnapshot.line,
      column: initSnapshot.column,
      statementDesc: initSnapshot.statementDesc,
      variables: this.deepCloneScope(this.scope),
    });
  }

  /**
   * 单步前进 (Step Next)
   */
  public step(): VMStepSnapshot {
    if (this.isHalted || this.executionQueue.length === 0) {
      this.isHalted = true;
      return {
        stepIndex: this.stepCount,
        line: this.history[this.history.length - 1]?.line || 1,
        column: 1,
        statementDesc: 'Halted',
        scope: this.deepCloneScope(this.scope),
        stdout: this.stdoutBuffer,
        stdinCursor: this.stdinCursor,
        done: true,
        exitCode: this.exitCode,
      };
    }

    const stmt = this.executionQueue.shift()!;
    this.stepCount++;
    const actionDesc = this.executeStatement(stmt);

    if (this.executionQueue.length === 0) {
      this.isHalted = true;
    }

    const snapshot: VMStepSnapshot = {
      stepIndex: this.stepCount,
      line: stmt.loc.line,
      column: stmt.loc.column,
      statementDesc: actionDesc,
      scope: this.deepCloneScope(this.scope),
      stdout: this.stdoutBuffer,
      stdinCursor: this.stdinCursor,
      done: this.isHalted,
      exitCode: this.exitCode,
    };
    this.history.push(snapshot);

    this.recordGraphTransition(snapshot, actionDesc);

    return snapshot;
  }

  /**
   * 时间旅行回退 (Step Prev / Undo)
   */
  public stepPrev(): VMStepSnapshot | null {
    if (this.history.length <= 1) {
      return null;
    }

    this.history.pop();
    const prev = this.history[this.history.length - 1];

    this.scope = this.deepCloneScope(prev.scope);
    this.stdoutBuffer = prev.stdout;
    this.stdinCursor = prev.stdinCursor;
    this.stepCount = prev.stepIndex;
    this.isHalted = prev.done;
    if (prev.exitCode !== undefined) {
      this.exitCode = prev.exitCode;
    }

    return prev;
  }

  /**
   * 运行到底 (Batch Run)
   */
  public run(maxSteps: number = 100_000): VMRunResult {
    const startTime = Date.now();

    while (!this.isHalted && this.executionQueue.length > 0) {
      if (this.stepCount >= maxSteps) {
        return {
          stdout: this.stdoutBuffer,
          exitCode: -1,
          steps: this.stepCount,
          elapsedMs: Date.now() - startTime,
          status: 'TLE',
          graph: this.getTraceGraph(),
        };
      }
      this.step();
    }

    return {
      stdout: this.stdoutBuffer,
      exitCode: this.exitCode,
      steps: this.stepCount,
      elapsedMs: Date.now() - startTime,
      status: 'SUCCESS',
      graph: this.getTraceGraph(),
    };
  }

  /**
   * 评测执行 (Judge)
   */
  public judge(expectedOutput: string, maxSteps: number = 100_000): VMRunResult {
    const result = this.run(maxSteps);
    if (result.status === 'TLE' || result.status === 'RE') return result;

    const actualTrimmed = result.stdout.trim().replace(/\r\n/g, '\n');
    const expectedTrimmed = expectedOutput.trim().replace(/\r\n/g, '\n');

    if (actualTrimmed === expectedTrimmed) {
      result.status = 'AC';
    } else {
      result.status = 'WA';
      result.diff = {
        expected: expectedTrimmed,
        actual: actualTrimmed,
      };
    }

    return result;
  }

  /**
   * 获取 jyy 状态机图模型
   */
  public getTraceGraph(maxNodes: number = 80): StateMachineGraph {
    if (this.graphNodes.length <= maxNodes) {
      return {
        nodes: this.graphNodes,
        edges: this.graphEdges,
      };
    }
    const slicedNodes = this.graphNodes.slice(-maxNodes);
    const validIds = new Set(slicedNodes.map((n) => n.id));
    const slicedEdges = this.graphEdges.filter(
      (e) => validIds.has(e.source) && validIds.has(e.target)
    );

    return {
      nodes: slicedNodes,
      edges: slicedEdges,
    };
  }

  // -------------------------------------------------------------------------
  // 语句执行核心
  // -------------------------------------------------------------------------

  private executeStatement(stmt: StatementNode): string {
    switch (stmt.type) {
      case 'BlockStatement': {
        this.executionQueue.unshift(...stmt.body);
        return 'Enter Block { ... }';
      }

      case 'VarDeclStatement': {
        const names: string[] = [];
        for (const item of stmt.declarations) {
          this.declareVariable(stmt.varType, item);
          names.push(item.name);
        }
        return `声明变量 ${stmt.varType}: ${names.join(', ')}`;
      }

      case 'CinStatement': {
        const details: string[] = [];
        for (const target of stmt.targets) {
          let tokenStr = '0';
          if (this.stdinCursor < this.stdinTokens.length) {
            tokenStr = this.stdinTokens[this.stdinCursor++];
          }
          const numVal = Number(tokenStr);
          const val = isNaN(numVal) ? tokenStr : numVal;

          if (target.index) {
            const idx = Number(this.evaluateExpression(target.index));
            const obj = this.getVariableValue(target.name);
            if (obj instanceof HostVector || Array.isArray(obj)) {
              if (obj instanceof HostVector) obj.set(idx, val);
              else obj[idx] = val;
              details.push(`${target.name}[${idx}] <- ${val}`);
            } else if (obj instanceof HostString) {
              obj.data = obj.data.substring(0, idx) + String(val) + obj.data.substring(idx + 1);
              details.push(`${target.name}[${idx}] <- ${val}`);
            }
          } else if (target.member) {
            const obj = this.getVariableValue(target.name);
            if (obj instanceof HostPair) {
              if (target.member === 'first') obj.first = val;
              if (target.member === 'second') obj.second = val;
              details.push(`${target.name}.${target.member} <- ${val}`);
            }
          } else {
            const curObj = this.getVariableValue(target.name);
            if (curObj instanceof HostString) {
              curObj.data = tokenStr;
            } else {
              this.setVariableValue(target.name, val);
            }
            details.push(`${target.name} <- ${val}`);
          }
        }
        return `cin >> ${details.join(', ')}`;
      }

      case 'CoutStatement': {
        let text = '';
        for (const elem of stmt.elements) {
          if (elem.type === 'EndlExpr') {
            this.stdoutBuffer += '\n';
            text += '\\n';
          } else {
            const val = this.evaluateExpression(elem);
            let str = '';
            if (val instanceof HostPair) {
              str = `{${val.first}, ${val.second}}`;
            } else if (val instanceof HostString) {
              str = val.data;
            } else {
              str = String(val);
            }
            this.stdoutBuffer += str;
            text += str;
          }
        }
        return `cout << "${text}"`;
      }

      case 'IfStatement': {
        const cond = Boolean(this.evaluateExpression(stmt.test));
        if (cond) {
          this.executionQueue.unshift(stmt.consequent);
          return `if (true) -> 执行 then 分支`;
        } else if (stmt.alternate) {
          this.executionQueue.unshift(stmt.alternate);
          return `if (false) -> 执行 else 分支`;
        } else {
          return `if (false) -> 跳过`;
        }
      }

      case 'WhileStatement': {
        const cond = Boolean(this.evaluateExpression(stmt.test));
        if (cond) {
          this.executionQueue.unshift(stmt.body, stmt);
          return `while (true) -> 展开单轮迭代`;
        } else {
          return `while (false) -> 循环结束退出`;
        }
      }

      case 'ForStatement': {
        if (stmt.init) {
          this.executeStatement(stmt.init);
          const headless: StatementNode = { ...stmt, init: undefined };
          this.executionQueue.unshift(headless);
          return `for init 执行完成`;
        }

        const cond = stmt.test ? Boolean(this.evaluateExpression(stmt.test)) : true;
        if (cond) {
          const nextNodes: StatementNode[] = [stmt.body];
          if (stmt.update) {
            nextNodes.push({
              type: 'ExpressionStatement',
              loc: stmt.update.loc,
              expression: stmt.update,
            });
          }
          nextNodes.push(stmt);
          this.executionQueue.unshift(...nextNodes);
          return `for 条件满足 -> 展开一轮循环迭代`;
        } else {
          return `for 条件不满足 -> 循环结束退出`;
        }
      }

      case 'ForRangeStatement': {
        // 范围 for: for (auto &x : v) body
        const container = this.evaluateExpression(stmt.iterable);
        let elements: any[] = [];
        if (container instanceof HostVector) {
          elements = container.data;
        } else if (container instanceof HostString) {
          elements = container.data.split('');
        } else if (Array.isArray(container)) {
          elements = container;
        }

        const rangeBodyStmts: StatementNode[] = [];
        for (let i = 0; i < elements.length; i++) {
          const iterElem = elements[i];
          // 将每一轮迭代注入赋值语句
          const assignStmt: StatementNode = {
            type: 'ExpressionStatement',
            loc: stmt.loc,
            expression: {
              type: 'AssignmentExpr',
              loc: stmt.loc,
              target: { type: 'IdentifierExpr', loc: stmt.loc, name: stmt.varName },
              op: '=',
              value: { type: 'NumberLiteralExpr', loc: stmt.loc, value: iterElem },
            },
          };
          rangeBodyStmts.push(assignStmt, stmt.body);
        }

        this.executionQueue.unshift(...rangeBodyStmts);
        return `for 范围循环展开 (共 ${elements.length} 个元素)`;
      }

      case 'BreakStatement': {
        return `break -> 跳出当前循环`;
      }

      case 'ContinueStatement': {
        return `continue -> 继续下一轮循环`;
      }

      case 'ExpressionStatement': {
        const val = this.evaluateExpression(stmt.expression);
        return `计算表达式 -> ${val}`;
      }

      case 'ReturnStatement': {
        if (stmt.argument) {
          const val = this.evaluateExpression(stmt.argument);
          this.exitCode = Number(val);
        } else {
          this.exitCode = 0;
        }
        this.isHalted = true;
        this.executionQueue = [];
        return `return ${this.exitCode}`;
      }

      default:
        return 'Execute Statement';
    }
  }

  // -------------------------------------------------------------------------
  // 表达式评估核心 (支持函数调用、STL 方法、排序与引用)
  // -------------------------------------------------------------------------

  private evaluateExpression(expr: ExpressionNode): any {
    switch (expr.type) {
      case 'NumberLiteralExpr':
        return expr.value;

      case 'StringLiteralExpr':
        return expr.value;

      case 'IdentifierExpr': {
        // 特殊标记: 如 v.begin() 中的 begin 或内置算法名
        if (expr.name in HostAlgorithms) {
          return (HostAlgorithms as any)[expr.name];
        }
        return this.getVariableValue(expr.name);
      }

      case 'ArrayAccessExpr': {
        const target = this.evaluateExpression(expr.target);
        const idx = Number(this.evaluateExpression(expr.index));
        if (target instanceof HostVector) {
          return target.get(idx);
        }
        if (target instanceof HostString) {
          return target.get(idx);
        }
        if (Array.isArray(target)) {
          if (idx < 0 || idx >= target.length) {
            throw new Error(`[RE 数组越界] 下标 [${idx}] 超出数组长度 ${target.length}`);
          }
          return target[idx];
        }
        throw new Error(`[RE 错误] 目标不支持下标访问`);
      }

      case 'MemberExpr': {
        const obj = this.evaluateExpression(expr.object);
        if (obj instanceof HostPair) {
          if (expr.property === 'first') return obj.first;
          if (expr.property === 'second') return obj.second;
        }
        if (obj instanceof HostVector) {
          if (expr.property === 'size') return () => obj.size();
          if (expr.property === 'empty') return () => obj.empty();
          if (expr.property === 'clear') return () => obj.clear();
          if (expr.property === 'push_back') return (v: any) => obj.push_back(v);
          if (expr.property === 'pop_back') return () => obj.pop_back();
          if (expr.property === 'begin') return () => ({ container: obj, pos: 0 });
          if (expr.property === 'end') return () => ({ container: obj, pos: obj.size() });
        }
        if (obj instanceof HostString) {
          if (expr.property === 'size' || expr.property === 'length') return () => obj.size();
          if (expr.property === 'empty') return () => obj.empty();
          if (expr.property === 'substr') return (pos: number, len?: number) => obj.substr(pos, len);
          if (expr.property === 'push_back') return (ch: string) => obj.push_back(ch);
        }
        return (obj as any)?.[expr.property];
      }

      case 'CallExpr': {
        // 1. 成员方法调用: v.push_back(10), v.size()
        if (expr.callee.type === 'MemberExpr') {
          const obj = this.evaluateExpression(expr.callee.object);
          const method = expr.callee.property;
          const evaluatedArgs = expr.args.map((a) => this.evaluateExpression(a));

          if (obj instanceof HostVector) {
            if (method === 'push_back') return obj.push_back(evaluatedArgs[0]);
            if (method === 'pop_back') return obj.pop_back();
            if (method === 'size') return obj.size();
            if (method === 'empty') return obj.empty();
            if (method === 'clear') return obj.clear();
            if (method === 'begin') return { container: obj, pos: 0 };
            if (method === 'end') return { container: obj, pos: obj.size() };
          }
          if (obj instanceof HostString) {
            if (method === 'size' || method === 'length') return obj.size();
            if (method === 'empty') return obj.empty();
            if (method === 'substr') return obj.substr(Number(evaluatedArgs[0]), evaluatedArgs[1] !== undefined ? Number(evaluatedArgs[1]) : undefined);
            if (method === 'push_back') return obj.push_back(String(evaluatedArgs[0]));
          }
          if (obj instanceof HostQueue) {
            if (method === 'push') return obj.push(evaluatedArgs[0]);
            if (method === 'pop') return obj.pop();
            if (method === 'front') return obj.front();
            if (method === 'back') return obj.back();
            if (method === 'size') return obj.size();
            if (method === 'empty') return obj.empty();
          }
          if (obj instanceof HostStack) {
            if (method === 'push') return obj.push(evaluatedArgs[0]);
            if (method === 'pop') return obj.pop();
            if (method === 'top') return obj.top();
            if (method === 'size') return obj.size();
            if (method === 'empty') return obj.empty();
          }
          if (obj instanceof HostPriorityQueue) {
            if (method === 'push') return obj.push(evaluatedArgs[0]);
            if (method === 'pop') return obj.pop();
            if (method === 'top') return obj.top();
            if (method === 'size') return obj.size();
            if (method === 'empty') return obj.empty();
          }
        }

        // 2. 内置算法调用: sort(v.begin(), v.end(), cmp), make_pair, max, min, abs
        if (expr.callee.type === 'IdentifierExpr') {
          const fnName = expr.callee.name;

          // std::sort
          if (fnName === 'sort') {
            const firstArg = this.evaluateExpression(expr.args[0]);
            let container: any[] = [];
            if (firstArg?.container) {
              container = firstArg.container.data;
            } else if (Array.isArray(firstArg)) {
              container = firstArg;
            }

            // 自定义比较器处理 (支持用户函数或默认升序)
            if (expr.args.length >= 3 && expr.args[2].type === 'IdentifierExpr') {
              const cmpFnName = expr.args[2].name;
              const cmpFunc = this.functionMap.get(cmpFnName);
              if (cmpFunc) {
                container.sort((a, b) => {
                  return this.callUserFunction(cmpFunc, [a, b]) ? -1 : 1;
                });
                return 0;
              }
            }

            // 默认升序比较器 (支持数字与 HostPair 排序)
            container.sort((a, b) => {
              if (a instanceof HostPair && b instanceof HostPair) {
                if (a.first !== b.first) return a.first - b.first;
                return a.second - b.second;
              }
              return a - b;
            });
            return 0;
          }

          // std::reverse
          if (fnName === 'reverse') {
            const firstArg = this.evaluateExpression(expr.args[0]);
            if (firstArg?.container) {
              HostAlgorithms.reverse(firstArg.container);
            } else {
              HostAlgorithms.reverse(firstArg);
            }
            return 0;
          }

          // std::max, std::min, std::abs
          if (fnName === 'max') {
            return HostAlgorithms.max(
              Number(this.evaluateExpression(expr.args[0])),
              Number(this.evaluateExpression(expr.args[1]))
            );
          }
          if (fnName === 'min') {
            return HostAlgorithms.min(
              Number(this.evaluateExpression(expr.args[0])),
              Number(this.evaluateExpression(expr.args[1]))
            );
          }
          if (fnName === 'abs') {
            return HostAlgorithms.abs(Number(this.evaluateExpression(expr.args[0])));
          }

          // make_pair
          if (fnName === 'make_pair') {
            return HostAlgorithms.make_pair(
              this.evaluateExpression(expr.args[0]),
              this.evaluateExpression(expr.args[1])
            );
          }

          // 用户自定义函数调用: dfs(u, cnt)
          const userFunc = this.functionMap.get(fnName);
          if (userFunc) {
            return this.invokeUserFunction(userFunc, expr.args);
          }
        }

        return 0;
      }

      case 'AssignmentExpr': {
        const rightVal = this.evaluateExpression(expr.value);

        if (expr.target.type === 'IdentifierExpr') {
          const curVal = this.getVariableValue(expr.target.name);
          let finalVal = rightVal;
          if (expr.op === '+=') finalVal = curVal + rightVal;
          else if (expr.op === '-=') finalVal = curVal - rightVal;
          else if (expr.op === '*=') finalVal = curVal * rightVal;
          else if (expr.op === '/=') finalVal = Math.trunc(curVal / rightVal);

          this.setVariableValue(expr.target.name, finalVal);
          return finalVal;
        }

        if (expr.target.type === 'ArrayAccessExpr') {
          const target = this.evaluateExpression(expr.target.target);
          const idx = Number(this.evaluateExpression(expr.target.index));

          if (target instanceof HostVector) {
            target.set(idx, rightVal);
            return rightVal;
          }
          if (target instanceof HostString) {
            target.data =
              target.data.substring(0, idx) + String(rightVal) + target.data.substring(idx + 1);
            return rightVal;
          }
          if (Array.isArray(target)) {
            if (idx < 0 || idx >= target.length) {
              throw new Error(`[RE 数组越界] 下标 [${idx}] 超出长度 ${target.length}`);
            }
            target[idx] = rightVal;
            return rightVal;
          }
        }

        if (expr.target.type === 'MemberExpr') {
          const obj = this.evaluateExpression(expr.target.object);
          if (obj instanceof HostPair) {
            if (expr.target.property === 'first') obj.first = rightVal;
            if (expr.target.property === 'second') obj.second = rightVal;
            return rightVal;
          }
        }

        throw new Error('[Runtime 错误] 无效的赋值目标');
      }

      case 'UpdateExpr': {
        const delta = expr.op === '++' ? 1 : -1;
        if (expr.argument.type === 'IdentifierExpr') {
          const cur = Number(this.getVariableValue(expr.argument.name) || 0);
          this.setVariableValue(expr.argument.name, cur + delta);
          return expr.prefix ? cur + delta : cur;
        }
        if (expr.argument.type === 'ArrayAccessExpr') {
          const target = this.evaluateExpression(expr.argument.target);
          const idx = Number(this.evaluateExpression(expr.argument.index));
          if (target instanceof HostVector) {
            const cur = Number(target.get(idx) || 0);
            target.set(idx, cur + delta);
            return expr.prefix ? cur + delta : cur;
          }
          if (Array.isArray(target)) {
            const cur = Number(target[idx] || 0);
            target[idx] = cur + delta;
            return expr.prefix ? cur + delta : cur;
          }
        }
        throw new Error('[Runtime 错误] 无效的自增/自减目标');
      }

      case 'UnaryExpr': {
        const arg = this.evaluateExpression(expr.argument);
        if (expr.op === '!') return !arg;
        if (expr.op === '-') return -Number(arg);
        if (expr.op === '+') return +Number(arg);
        return 0;
      }

      case 'BinaryExpr': {
        const left = this.evaluateExpression(expr.left);
        const right = this.evaluateExpression(expr.right);

        switch (expr.op) {
          case '+':
            if (typeof left === 'string' || typeof right === 'string') {
              return String(left) + String(right);
            }
            return Number(left) + Number(right);
          case '-':
            return Number(left) - Number(right);
          case '*':
            return Number(left) * Number(right);
          case '/':
            return Math.trunc(Number(left) / Number(right));
          case '%':
            return Number(left) % Number(right);
          case '<':
            return left < right;
          case '<=':
            return left <= right;
          case '>':
            return left > right;
          case '>=':
            return left >= right;
          case '==':
            return left == right;
          case '!=':
            return left != right;
          case '&&':
            return Boolean(left) && Boolean(right);
          case '||':
            return Boolean(left) || Boolean(right);
        }
      }

      default:
        return 0;
    }
  }

  /**
   * 调用用户自定义函数 (处理引用传参与局部作用域栈)
   */
  private invokeUserFunction(func: FunctionDeclNode, callArgs: ExpressionNode[]): any {
    const parentScope = this.scope;
    const parentRefMap = new Map(this.refMap);

    const localScope: ScopeVariables = { ...parentScope };
    const localRefMap = new Map(this.refMap);

    for (let i = 0; i < func.params.length; i++) {
      const param = func.params[i];
      const argExpr = callArgs[i];

      if (param.isRef && argExpr.type === 'IdentifierExpr') {
        // 引用传参: 绑定至父作用域
        localRefMap.set(param.name, {
          targetScope: parentScope,
          targetKey: argExpr.name,
        });
      } else {
        localScope[param.name] = this.evaluateExpression(argExpr);
      }
    }

    // 切换环境执行函数
    this.scope = localScope;
    this.refMap = localRefMap;

    let retVal = 0;
    for (const stmt of func.body.body) {
      if (stmt.type === 'ReturnStatement') {
        if (stmt.argument) {
          retVal = this.evaluateExpression(stmt.argument);
        }
        break;
      }
      this.executeStatement(stmt);
    }

    // 恢复父环境
    this.scope = parentScope;
    this.refMap = parentRefMap;

    return retVal;
  }

  private callUserFunction(func: FunctionDeclNode, argValues: any[]): any {
    const parentScope = this.scope;
    const localScope: ScopeVariables = { ...parentScope };

    for (let i = 0; i < func.params.length; i++) {
      localScope[func.params[i].name] = argValues[i];
    }

    this.scope = localScope;
    let retVal = 0;
    for (const stmt of func.body.body) {
      if (stmt.type === 'ReturnStatement' && stmt.argument) {
        retVal = this.evaluateExpression(stmt.argument);
        break;
      }
      this.executeStatement(stmt);
    }
    this.scope = parentScope;
    return retVal;
  }

  private recordGraphTransition(snapshot: VMStepSnapshot, action: string): void {
    const varsDigest = Object.entries(snapshot.scope)
      .map(([k, v]) => {
        if (v instanceof HostVector) return `${k}:Vec(${v.size()})`;
        if (v instanceof HostPair) return `${k}:Pair(${v.first},${v.second})`;
        if (v instanceof HostString) return `${k}:Str(${v.size()})`;
        if (v instanceof HostQueue) return `${k}:Q(${v.size()})`;
        if (v instanceof HostStack) return `${k}:Stk(${v.size()})`;
        if (v instanceof HostPriorityQueue) return `${k}:PQ(${v.size()})`;
        if (Array.isArray(v)) return `${k}:Arr(${v.length})`;
        return `${k}:${v}`;
      })
      .join(',');

    const newNodeId = `S${snapshot.stepIndex}_L${snapshot.line}_[${varsDigest}]`;

    const newNode: StateMachineNode = {
      id: newNodeId,
      stepIndex: snapshot.stepIndex,
      line: snapshot.line,
      column: snapshot.column,
      statementDesc: action,
      variables: this.deepCloneScope(snapshot.scope),
    };
    this.graphNodes.push(newNode);

    if (this.lastStateNodeId) {
      const edgeId = `E_${this.lastStateNodeId}->${newNodeId}`;
      this.graphEdges.push({
        id: edgeId,
        source: this.lastStateNodeId,
        target: newNodeId,
        action,
      });
    }

    this.lastStateNodeId = newNodeId;
  }
}
