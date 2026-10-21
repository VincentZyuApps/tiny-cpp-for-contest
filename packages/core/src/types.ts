/**
 * packages/core/src/types.ts
 * 核心类型定义：Token、AST 节点、虚拟机状态机与 jyy 状态机图接口
 */

import { HostVector, HostString, HostPair, HostQueue, HostStack, HostPriorityQueue } from './stl';

// ---------------------------------------------------------------------------
// 1. 词法分析 (Lexer) 相关定义
// ---------------------------------------------------------------------------

export enum TokenType {
  // 基础类型与关键字
  KeywordInt = 'KEYWORD_INT',
  KeywordLong = 'KEYWORD_LONG',
  KeywordVoid = 'KEYWORD_VOID',
  KeywordAuto = 'KEYWORD_AUTO',
  KeywordReturn = 'KEYWORD_RETURN',
  KeywordUsing = 'KEYWORD_USING',
  KeywordNamespace = 'KEYWORD_NAMESPACE',
  KeywordCin = 'KEYWORD_CIN',
  KeywordCout = 'KEYWORD_COUT',
  KeywordEndl = 'KEYWORD_ENDL',

  // STL 容器关键字 (Milestone 3 & 5)
  KeywordVector = 'KEYWORD_VECTOR',
  KeywordString = 'KEYWORD_STRING',
  KeywordPair = 'KEYWORD_PAIR',
  KeywordQueue = 'KEYWORD_QUEUE',
  KeywordStack = 'KEYWORD_STACK',
  KeywordPriorityQueue = 'KEYWORD_PRIORITY_QUEUE',

  // 控制流关键字 (Milestone 2)
  KeywordIf = 'KEYWORD_IF',
  KeywordElse = 'KEYWORD_ELSE',
  KeywordWhile = 'KEYWORD_WHILE',
  KeywordFor = 'KEYWORD_FOR',
  KeywordBreak = 'KEYWORD_BREAK',
  KeywordContinue = 'KEYWORD_CONTINUE',

  // 标识符与字面量
  Identifier = 'IDENTIFIER',
  NumberLiteral = 'NUMBER_LITERAL',
  StringLiteral = 'STRING_LITERAL',

  // 自增与复合赋值
  Increment = '++',
  Decrement = '--',
  PlusAssign = '+=',
  MinusAssign = '-=',
  MultiplyAssign = '*=',
  DivideAssign = '/=',

  // 逻辑与比较操作符
  Equal = '==',
  NotEqual = '!=',
  LessEqual = '<=',
  GreaterEqual = '>=',
  ShiftRight = '>>',      // cin >>
  ShiftLeft = '<<',       // cout <<
  LessThan = '<',
  GreaterThan = '>',
  LogicalAnd = '&&',
  LogicalOr = '||',
  LogicalNot = '!',

  // 基础算术操作符
  Plus = '+',
  Minus = '-',
  Multiply = '*',
  Divide = '/',
  Modulo = '%',
  Assign = '=',

  // 标点、引用与成员访问 (Milestone 3)
  Dot = '.',
  Colon = ':',
  Ampersand = '&',
  Semicolon = ';',
  Comma = ',',
  OpenParen = '(',
  CloseParen = ')',
  OpenBrace = '{',
  CloseBrace = '}',
  OpenBracket = '[',
  CloseBracket = ']',

  // 终结符
  EOF = 'EOF',
}

export interface SourceLocation {
  line: number;
  column: number;
}

export interface Token {
  type: TokenType;
  value: string;
  loc: SourceLocation;
}

// ---------------------------------------------------------------------------
// 2. 语法树 (AST) 相关定义
// ---------------------------------------------------------------------------

export type ASTNodeType =
  | 'Program'
  | 'FunctionDecl'
  | 'BlockStatement'
  | 'VarDeclStatement'
  | 'CinStatement'
  | 'CoutStatement'
  | 'ReturnStatement'
  | 'IfStatement'
  | 'WhileStatement'
  | 'ForStatement'
  | 'ForRangeStatement'
  | 'BreakStatement'
  | 'ContinueStatement'
  | 'ExpressionStatement'
  | 'BinaryExpr'
  | 'UnaryExpr'
  | 'UpdateExpr'
  | 'AssignmentExpr'
  | 'ArrayAccessExpr'
  | 'MemberExpr'
  | 'CallExpr'
  | 'IdentifierExpr'
  | 'NumberLiteralExpr'
  | 'StringLiteralExpr'
  | 'EndlExpr';

export interface BaseASTNode {
  type: ASTNodeType;
  loc: SourceLocation;
}

export interface NumberLiteralNode extends BaseASTNode {
  type: 'NumberLiteralExpr';
  value: number;
}

export interface StringLiteralNode extends BaseASTNode {
  type: 'StringLiteralExpr';
  value: string;
}

export interface IdentifierNode extends BaseASTNode {
  type: 'IdentifierExpr';
  name: string;
}

export interface EndlNode extends BaseASTNode {
  type: 'EndlExpr';
}

export interface ArrayAccessNode extends BaseASTNode {
  type: 'ArrayAccessExpr';
  target: ExpressionNode;
  index: ExpressionNode;
}

export interface MemberExprNode extends BaseASTNode {
  type: 'MemberExpr';
  object: ExpressionNode;
  property: string;
}

export interface CallExprNode extends BaseASTNode {
  type: 'CallExpr';
  callee: ExpressionNode;
  args: ExpressionNode[];
}

export interface UnaryExprNode extends BaseASTNode {
  type: 'UnaryExpr';
  op: '-' | '!' | '+';
  argument: ExpressionNode;
}

export interface UpdateExprNode extends BaseASTNode {
  type: 'UpdateExpr';
  op: '++' | '--';
  argument: IdentifierNode | ArrayAccessNode | MemberExprNode;
  prefix: boolean;
}

export interface AssignmentExprNode extends BaseASTNode {
  type: 'AssignmentExpr';
  target: IdentifierNode | ArrayAccessNode | MemberExprNode;
  op: '=' | '+=' | '-=' | '*=' | '/=';
  value: ExpressionNode;
}

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '<'
  | '<='
  | '>'
  | '>='
  | '=='
  | '!='
  | '&&'
  | '||';

export interface BinaryExprNode extends BaseASTNode {
  type: 'BinaryExpr';
  op: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

export type ExpressionNode =
  | NumberLiteralNode
  | StringLiteralNode
  | IdentifierNode
  | EndlNode
  | ArrayAccessNode
  | MemberExprNode
  | CallExprNode
  | UnaryExprNode
  | UpdateExprNode
  | AssignmentExprNode
  | BinaryExprNode;

export interface VarDeclItem {
  name: string;
  init?: ExpressionNode;
  initArgs?: ExpressionNode[]; // 构造函数实参，如 vector<int> v(n)
  arraySize?: number;          // 静态一维数组大小，如 int a[105]
}

export interface VarDeclStatementNode extends BaseASTNode {
  type: 'VarDeclStatement';
  varType: string;
  declarations: VarDeclItem[];
}

export interface CinTarget {
  name: string;
  index?: ExpressionNode;
  member?: string; // cin >> p.first
}

export interface CinStatementNode extends BaseASTNode {
  type: 'CinStatement';
  targets: CinTarget[];
}

export interface CoutStatementNode extends BaseASTNode {
  type: 'CoutStatement';
  elements: ExpressionNode[];
}

export interface ReturnStatementNode extends BaseASTNode {
  type: 'ReturnStatement';
  argument?: ExpressionNode;
}

export interface IfStatementNode extends BaseASTNode {
  type: 'IfStatement';
  test: ExpressionNode;
  consequent: StatementNode;
  alternate?: StatementNode;
}

export interface WhileStatementNode extends BaseASTNode {
  type: 'WhileStatement';
  test: ExpressionNode;
  body: StatementNode;
}

export interface ForStatementNode extends BaseASTNode {
  type: 'ForStatement';
  init?: VarDeclStatementNode | ExpressionStatementNode;
  test?: ExpressionNode;
  update?: ExpressionNode;
  body: StatementNode;
}

export interface ForRangeStatementNode extends BaseASTNode {
  type: 'ForRangeStatement';
  varName: string;
  isRef: boolean;
  iterable: ExpressionNode;
  body: StatementNode;
}

export interface BreakStatementNode extends BaseASTNode {
  type: 'BreakStatement';
}

export interface ContinueStatementNode extends BaseASTNode {
  type: 'ContinueStatement';
}

export interface ExpressionStatementNode extends BaseASTNode {
  type: 'ExpressionStatement';
  expression: ExpressionNode;
}

export type StatementNode =
  | VarDeclStatementNode
  | CinStatementNode
  | CoutStatementNode
  | ReturnStatementNode
  | IfStatementNode
  | WhileStatementNode
  | ForStatementNode
  | ForRangeStatementNode
  | BreakStatementNode
  | ContinueStatementNode
  | ExpressionStatementNode
  | BlockStatementNode;

export interface BlockStatementNode extends BaseASTNode {
  type: 'BlockStatement';
  body: StatementNode[];
}

export interface FunctionParam {
  type: string;
  name: string;
  isRef: boolean; // 是否是引用传参，例如 int &x
}

export interface FunctionDeclNode extends BaseASTNode {
  type: 'FunctionDecl';
  returnType: string;
  name: string;
  params: FunctionParam[];
  body: BlockStatementNode;
}

export interface ProgramNode extends BaseASTNode {
  type: 'Program';
  globals: VarDeclStatementNode[];
  functions: FunctionDeclNode[];
}

// ---------------------------------------------------------------------------
// 3. 状态机 (VirtualMachine) 与 jyy 状态机图模型
// ---------------------------------------------------------------------------

export type PrimitiveValue = number | string | boolean;
export type ScopeValue =
  | PrimitiveValue
  | PrimitiveValue[]
  | HostVector
  | HostString
  | HostPair
  | HostQueue
  | HostStack
  | HostPriorityQueue;

export type ScopeVariables = Record<string, ScopeValue>;

/**
 * jyy 状态机图中的状态节点 (State Node)
 */
export interface StateMachineNode {
  id: string;
  stepIndex: number;
  line: number;
  column: number;
  statementDesc: string;
  variables: Record<string, any>;
}

/**
 * 状态机图中的转移边 (Transition Edge)
 */
export interface StateMachineEdge {
  id: string;
  source: string;
  target: string;
  action: string;
  line?: number;
}

export interface StateMachineGraph {
  nodes: StateMachineNode[];
  edges: StateMachineEdge[];
}

/**
 * 单步快照 (用于时间旅行回溯与调试)
 */
export interface VMStepSnapshot {
  stepIndex: number;
  line: number;
  column: number;
  statementDesc: string;
  scope: Record<string, any>;
  stdout: string;
  stdinCursor: number;
  done: boolean;
  exitCode?: number;
}

/**
 * 虚拟机完整执行结果
 */
export interface VMRunResult {
  stdout: string;
  exitCode: number;
  steps: number;
  elapsedMs: number;
  status: 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | 'SUCCESS';
  diff?: {
    expected: string;
    actual: string;
    firstDiffLine?: number;
  };
  graph?: StateMachineGraph;
}
