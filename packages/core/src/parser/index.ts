/**
 * packages/core/src/parser/index.ts
 * 语法分析器 (Parser): 递归下降构建 AST (支持 STL 模板类型、成员调用、范围 for、函数参数与引用)
 */

import {
  Token,
  TokenType,
  ProgramNode,
  FunctionDeclNode,
  FunctionParam,
  BlockStatementNode,
  StatementNode,
  VarDeclStatementNode,
  CinStatementNode,
  CinTarget,
  CoutStatementNode,
  ReturnStatementNode,
  IfStatementNode,
  WhileStatementNode,
  ForStatementNode,
  ForRangeStatementNode,
  BreakStatementNode,
  ContinueStatementNode,
  ExpressionStatementNode,
  ExpressionNode,
  BinaryExprNode,
  BinaryOperator,
  IdentifierNode,
  NumberLiteralNode,
  StringLiteralNode,
  ArrayAccessNode,
  MemberExprNode,
  CallExprNode,
  UnaryExprNode,
  UpdateExprNode,
  AssignmentExprNode,
  EndlNode,
} from '../types';

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): ProgramNode {
    const loc = this.peek().loc;
    const globals: VarDeclStatementNode[] = [];
    const functions: FunctionDeclNode[] = [];

    while (!this.isAtEnd()) {
      if (this.isTypeSpecifierAhead()) {
        if (this.isFunctionDeclAhead()) {
          functions.push(this.parseFunctionDecl());
        } else {
          globals.push(this.parseVarDeclStatement());
        }
      } else {
        this.advance();
      }
    }

    return {
      type: 'Program',
      loc,
      globals,
      functions,
    };
  }

  private isTypeSpecifierAhead(): boolean {
    const t = this.peek().type;
    return (
      t === TokenType.KeywordInt ||
      t === TokenType.KeywordLong ||
      t === TokenType.KeywordVoid ||
      t === TokenType.KeywordAuto ||
      t === TokenType.KeywordVector ||
      t === TokenType.KeywordString ||
      t === TokenType.KeywordPair ||
      t === TokenType.KeywordQueue ||
      t === TokenType.KeywordStack ||
      t === TokenType.KeywordPriorityQueue ||
      (t === TokenType.Identifier && this.peek().value === 'signed')
    );
  }

  private isFunctionDeclAhead(): boolean {
    let lookahead = this.current;
    // 跳过类型部分 (可能包含 vector<...> 或 long long)
    lookahead = this.skipTypeAhead(lookahead);

    // 接下来应该是标识符 (函数名)
    if (lookahead < this.tokens.length && this.tokens[lookahead].type === TokenType.Identifier) {
      lookahead++;
      // 再接下来如果是 '('，则是函数声明
      if (lookahead < this.tokens.length && this.tokens[lookahead].type === TokenType.OpenParen) {
        return true;
      }
    }

    return false;
  }

  private skipTypeAhead(start: number): number {
    let pos = start;
    while (pos < this.tokens.length) {
      const t = this.tokens[pos].type;
      if (
        t === TokenType.KeywordInt ||
        t === TokenType.KeywordLong ||
        t === TokenType.KeywordVoid ||
        t === TokenType.KeywordAuto ||
        t === TokenType.KeywordString ||
        (t === TokenType.Identifier && this.tokens[pos].value === 'signed')
      ) {
        pos++;
      } else if (
        t === TokenType.KeywordVector ||
        t === TokenType.KeywordPair ||
        t === TokenType.KeywordQueue ||
        t === TokenType.KeywordStack ||
        t === TokenType.KeywordPriorityQueue
      ) {
        pos++;
        if (pos < this.tokens.length && this.tokens[pos].type === TokenType.LessThan) {
          pos = this.skipTemplateAngleBrackets(pos);
        }
      } else {
        break;
      }
    }
    return pos;
  }

  private skipTemplateAngleBrackets(pos: number): number {
    let depth = 0;
    while (pos < this.tokens.length) {
      if (this.tokens[pos].type === TokenType.LessThan) depth++;
      else if (this.tokens[pos].type === TokenType.GreaterThan) {
        depth--;
        if (depth === 0) return pos + 1;
      } else if (this.tokens[pos].type === TokenType.ShiftRight) {
        // >> 当作两个闭合尖括号
        depth -= 2;
        if (depth <= 0) return pos + 1;
      }
      pos++;
    }
    return pos;
  }

  private parseType(): string {
    let typeName = this.advance().value;

    // 模板参数: vector<int>, pair<int, int>
    if (this.match(TokenType.LessThan)) {
      typeName += '<';
      let depth = 1;
      while (!this.isAtEnd() && depth > 0) {
        if (this.check(TokenType.LessThan)) depth++;
        else if (this.check(TokenType.GreaterThan)) {
          depth--;
          if (depth === 0) {
            typeName += this.advance().value;
            break;
          }
        } else if (this.check(TokenType.ShiftRight)) {
          depth -= 2;
          this.advance();
          typeName += '>>';
          if (depth <= 0) break;
          continue;
        }
        typeName += this.advance().value;
      }
    }

    // 复合修饰词: long long
    while (
      this.check(TokenType.KeywordLong) ||
      this.check(TokenType.KeywordInt) ||
      (this.peek().type === TokenType.Identifier && this.peek().value === 'signed')
    ) {
      typeName += ' ' + this.advance().value;
    }

    return typeName;
  }

  private parseFunctionDecl(): FunctionDeclNode {
    const loc = this.peek().loc;
    const returnType = this.parseType();

    const nameToken = this.consume(TokenType.Identifier, '预期函数名称');
    const name = nameToken.value;

    this.consume(TokenType.OpenParen, "预期 '('");
    const params: FunctionParam[] = [];

    while (!this.check(TokenType.CloseParen) && !this.isAtEnd()) {
      const pType = this.parseType();
      let isRef = false;
      if (this.match(TokenType.Ampersand)) {
        isRef = true;
      }
      const pName = this.consume(TokenType.Identifier, '预期参数名称').value;
      params.push({ type: pType, name: pName, isRef });

      if (!this.check(TokenType.CloseParen)) {
        this.consume(TokenType.Comma, "参数之间预期 ','");
      }
    }
    this.consume(TokenType.CloseParen, "预期 ')'");

    const body = this.parseBlockStatement();

    return {
      type: 'FunctionDecl',
      loc,
      returnType,
      name,
      params,
      body,
    };
  }

  private parseBlockStatement(): BlockStatementNode {
    const openBrace = this.consume(TokenType.OpenBrace, "预期 '{'");
    const statements: StatementNode[] = [];

    while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    this.consume(TokenType.CloseBrace, "预期 '}'");

    return {
      type: 'BlockStatement',
      loc: openBrace.loc,
      body: statements,
    };
  }

  private parseStatement(): StatementNode | null {
    if (this.check(TokenType.OpenBrace)) {
      return this.parseBlockStatement();
    }

    if (this.isTypeSpecifierAhead()) {
      return this.parseVarDeclStatement();
    }

    if (this.check(TokenType.KeywordCin)) {
      return this.parseCinStatement();
    }

    if (this.check(TokenType.KeywordCout)) {
      return this.parseCoutStatement();
    }

    if (this.check(TokenType.KeywordIf)) {
      return this.parseIfStatement();
    }

    if (this.check(TokenType.KeywordWhile)) {
      return this.parseWhileStatement();
    }

    if (this.check(TokenType.KeywordFor)) {
      return this.parseForOrForRangeStatement();
    }

    if (this.match(TokenType.KeywordBreak)) {
      const loc = this.previous().loc;
      this.consume(TokenType.Semicolon, "break 后预期 ';'");
      return { type: 'BreakStatement', loc };
    }

    if (this.match(TokenType.KeywordContinue)) {
      const loc = this.previous().loc;
      this.consume(TokenType.Semicolon, "continue 后预期 ';'");
      return { type: 'ContinueStatement', loc };
    }

    if (this.check(TokenType.KeywordReturn)) {
      return this.parseReturnStatement();
    }

    return this.parseExpressionStatement();
  }

  private parseIfStatement(): IfStatementNode {
    const ifToken = this.consume(TokenType.KeywordIf, "预期 'if'");
    this.consume(TokenType.OpenParen, "if 后预期 '('");
    const test = this.parseExpression();
    this.consume(TokenType.CloseParen, "if 条件末尾预期 ')'");

    const consequent = this.parseStatement()!;
    let alternate: StatementNode | undefined;

    if (this.match(TokenType.KeywordElse)) {
      alternate = this.parseStatement()!;
    }

    return {
      type: 'IfStatement',
      loc: ifToken.loc,
      test,
      consequent,
      alternate,
    };
  }

  private parseWhileStatement(): WhileStatementNode {
    const whileToken = this.consume(TokenType.KeywordWhile, "预期 'while'");
    this.consume(TokenType.OpenParen, "while 后预期 '('");
    const test = this.parseExpression();
    this.consume(TokenType.CloseParen, "while 条件末尾预期 ')'");

    const body = this.parseStatement()!;

    return {
      type: 'WhileStatement',
      loc: whileToken.loc,
      test,
      body,
    };
  }

  /**
   * 解析普通 for 循环或 C++11 范围 for 循环:
   * for (int i = 0; i < n; i++) vs for (auto &x : v)
   */
  private parseForOrForRangeStatement(): ForStatementNode | ForRangeStatementNode {
    const forToken = this.consume(TokenType.KeywordFor, "预期 'for'");
    this.consume(TokenType.OpenParen, "for 后预期 '('");

    // 检测是否为范围 for: for (auto &x : v) 或 for (int x : v)
    if (this.isTypeSpecifierAhead()) {
      let look = this.current;
      look = this.skipTypeAhead(look);
      let isRef = false;
      if (look < this.tokens.length && this.tokens[look].type === TokenType.Ampersand) {
        isRef = true;
        look++;
      }
      if (
        look + 1 < this.tokens.length &&
        this.tokens[look].type === TokenType.Identifier &&
        this.tokens[look + 1].type === TokenType.Colon
      ) {
        // 确认是范围 for
        this.parseType(); // 消费类型
        if (isRef) this.consume(TokenType.Ampersand, "预期 '&'");
        const varName = this.consume(TokenType.Identifier, '预期迭代变量名').value;
        this.consume(TokenType.Colon, "预期 ':'");
        const iterable = this.parseExpression();
        this.consume(TokenType.CloseParen, "预期 ')'");
        const body = this.parseStatement()!;

        return {
          type: 'ForRangeStatement',
          loc: forToken.loc,
          varName,
          isRef,
          iterable,
          body,
        };
      }
    }

    // 普通 for 循环
    let init: VarDeclStatementNode | ExpressionStatementNode | undefined;
    if (this.match(TokenType.Semicolon)) {
      init = undefined;
    } else if (this.isTypeSpecifierAhead()) {
      init = this.parseVarDeclStatement();
    } else {
      init = this.parseExpressionStatement();
    }

    let test: ExpressionNode | undefined;
    if (!this.check(TokenType.Semicolon)) {
      test = this.parseExpression();
    }
    this.consume(TokenType.Semicolon, "for 条件末尾预期 ';'");

    let update: ExpressionNode | undefined;
    if (!this.check(TokenType.CloseParen)) {
      update = this.parseExpression();
    }
    this.consume(TokenType.CloseParen, "for 头部末尾预期 ')'");

    const body = this.parseStatement()!;

    return {
      type: 'ForStatement',
      loc: forToken.loc,
      init,
      test,
      update,
      body,
    };
  }

  private parseExpressionStatement(): ExpressionStatementNode {
    const expr = this.parseExpression();
    this.consume(TokenType.Semicolon, "表达式语句末尾预期 ';'");
    return {
      type: 'ExpressionStatement',
      loc: expr.loc,
      expression: expr,
    };
  }

  private parseVarDeclStatement(): VarDeclStatementNode {
    const loc = this.peek().loc;
    const typeName = this.parseType();

    const declarations: {
      name: string;
      init?: ExpressionNode;
      initArgs?: ExpressionNode[];
      arraySize?: number;
    }[] = [];

    do {
      const idToken = this.consume(TokenType.Identifier, '预期变量名');
      let arraySize: number | undefined;
      let init: ExpressionNode | undefined;
      let initArgs: ExpressionNode[] | undefined;

      // 静态一维数组: int a[105];
      if (this.match(TokenType.OpenBracket)) {
        const sizeToken = this.consume(TokenType.NumberLiteral, '数组大小预期为整数常量');
        arraySize = Number(sizeToken.value);
        this.consume(TokenType.CloseBracket, "预期 ']'");
      }
      // 构造实参: vector<int> v(n); 或 pair<int, int> p(1, 2);
      else if (this.match(TokenType.OpenParen)) {
        initArgs = [];
        while (!this.check(TokenType.CloseParen) && !this.isAtEnd()) {
          initArgs.push(this.parseExpression());
          if (!this.check(TokenType.CloseParen)) {
            this.consume(TokenType.Comma, "预期 ','");
          }
        }
        this.consume(TokenType.CloseParen, "预期 ')'");
      }
      // 赋值初始化: int a = 10;
      else if (this.match(TokenType.Assign)) {
        init = this.parseExpression();
      }

      declarations.push({ name: idToken.value, init, initArgs, arraySize });
    } while (this.match(TokenType.Comma));

    this.consume(TokenType.Semicolon, "变量声明末尾预期 ';'");

    return {
      type: 'VarDeclStatement',
      loc,
      varType: typeName,
      declarations,
    };
  }

  private parseCinStatement(): CinStatementNode {
    const cinToken = this.consume(TokenType.KeywordCin, "预期 'cin'");
    const targets: CinTarget[] = [];

    while (this.match(TokenType.ShiftRight)) {
      const idToken = this.consume(TokenType.Identifier, "cin >> 后预期变量名");
      let index: ExpressionNode | undefined;
      let member: string | undefined;

      if (this.match(TokenType.OpenBracket)) {
        index = this.parseExpression();
        this.consume(TokenType.CloseBracket, "预期 ']'");
      } else if (this.match(TokenType.Dot)) {
        member = this.consume(TokenType.Identifier, "'.' 后预期成员名").value;
      }

      targets.push({ name: idToken.value, index, member });
    }

    this.consume(TokenType.Semicolon, "cin 语句末尾预期 ';'");

    return {
      type: 'CinStatement',
      loc: cinToken.loc,
      targets,
    };
  }

  private parseCoutStatement(): CoutStatementNode {
    const coutToken = this.consume(TokenType.KeywordCout, "预期 'cout'");
    const elements: ExpressionNode[] = [];

    while (this.match(TokenType.ShiftLeft)) {
      if (this.match(TokenType.KeywordEndl)) {
        elements.push({
          type: 'EndlExpr',
          loc: this.previous().loc,
        });
      } else {
        elements.push(this.parseExpression());
      }
    }

    this.consume(TokenType.Semicolon, "cout 语句末尾预期 ';'");

    return {
      type: 'CoutStatement',
      loc: coutToken.loc,
      elements,
    };
  }

  private parseReturnStatement(): ReturnStatementNode {
    const retToken = this.consume(TokenType.KeywordReturn, "预期 'return'");
    let argument: ExpressionNode | undefined;
    if (!this.check(TokenType.Semicolon)) {
      argument = this.parseExpression();
    }
    this.consume(TokenType.Semicolon, "return 语句末尾预期 ';'");

    return {
      type: 'ReturnStatement',
      loc: retToken.loc,
      argument,
    };
  }

  // -------------------------------------------------------------------------
  // 表达式解析 (优先级从低到高)
  // -------------------------------------------------------------------------

  public parseExpression(): ExpressionNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ExpressionNode {
    const expr = this.parseLogicalOr();

    if (
      this.match(TokenType.Assign) ||
      this.match(TokenType.PlusAssign) ||
      this.match(TokenType.MinusAssign) ||
      this.match(TokenType.MultiplyAssign) ||
      this.match(TokenType.DivideAssign)
    ) {
      const opToken = this.previous();
      const right = this.parseAssignment();

      if (
        expr.type === 'IdentifierExpr' ||
        expr.type === 'ArrayAccessExpr' ||
        expr.type === 'MemberExpr'
      ) {
        return {
          type: 'AssignmentExpr',
          loc: opToken.loc,
          target: expr,
          op: opToken.value as '=' | '+=' | '-=' | '*=' | '/=',
          value: right,
        };
      }

      throw new Error(`[Parser 语法错误] 行 ${opToken.loc.line}: 无效的赋值左值目标`);
    }

    return expr;
  }

  private parseLogicalOr(): ExpressionNode {
    let expr = this.parseLogicalAnd();
    while (this.match(TokenType.LogicalOr)) {
      const opToken = this.previous();
      const right = this.parseLogicalAnd();
      expr = {
        type: 'BinaryExpr',
        loc: opToken.loc,
        op: '||',
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parseLogicalAnd(): ExpressionNode {
    let expr = this.parseEquality();
    while (this.match(TokenType.LogicalAnd)) {
      const opToken = this.previous();
      const right = this.parseEquality();
      expr = {
        type: 'BinaryExpr',
        loc: opToken.loc,
        op: '&&',
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parseEquality(): ExpressionNode {
    let expr = this.parseComparison();
    while (this.match(TokenType.Equal) || this.match(TokenType.NotEqual)) {
      const opToken = this.previous();
      const right = this.parseComparison();
      expr = {
        type: 'BinaryExpr',
        loc: opToken.loc,
        op: opToken.value as '==' | '!=',
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parseComparison(): ExpressionNode {
    let expr = this.parseAddition();
    while (
      this.match(TokenType.LessThan) ||
      this.match(TokenType.LessEqual) ||
      this.match(TokenType.GreaterThan) ||
      this.match(TokenType.GreaterEqual)
    ) {
      const opToken = this.previous();
      const right = this.parseAddition();
      expr = {
        type: 'BinaryExpr',
        loc: opToken.loc,
        op: opToken.value as BinaryOperator,
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parseAddition(): ExpressionNode {
    let expr = this.parseMultiplication();
    while (this.check(TokenType.Plus) || this.check(TokenType.Minus)) {
      const opToken = this.advance();
      const right = this.parseMultiplication();
      expr = {
        type: 'BinaryExpr',
        loc: opToken.loc,
        op: opToken.value as '+' | '-',
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parseMultiplication(): ExpressionNode {
    let expr = this.parseUnary();
    while (
      this.check(TokenType.Multiply) ||
      this.check(TokenType.Divide) ||
      this.check(TokenType.Modulo)
    ) {
      const opToken = this.advance();
      const right = this.parseUnary();
      expr = {
        type: 'BinaryExpr',
        loc: opToken.loc,
        op: opToken.value as '*' | '/' | '%',
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parseUnary(): ExpressionNode {
    // 前缀 ++ / --
    if (this.match(TokenType.Increment) || this.match(TokenType.Decrement)) {
      const opToken = this.previous();
      const arg = this.parsePostfix();
      if (
        arg.type === 'IdentifierExpr' ||
        arg.type === 'ArrayAccessExpr' ||
        arg.type === 'MemberExpr'
      ) {
        return {
          type: 'UpdateExpr',
          loc: opToken.loc,
          op: opToken.value as '++' | '--',
          argument: arg,
          prefix: true,
        };
      }
      throw new Error(`[Parser 错误] 行 ${opToken.loc.line}: 前缀 ++/-- 的操作数必须是可修改左值`);
    }

    // 一元 - / ! / +
    if (this.match(TokenType.Minus) || this.match(TokenType.LogicalNot) || this.match(TokenType.Plus)) {
      const opToken = this.previous();
      const right = this.parseUnary();
      return {
        type: 'UnaryExpr',
        loc: opToken.loc,
        op: opToken.value as '-' | '!' | '+',
        argument: right,
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): ExpressionNode {
    let expr = this.parsePrimary();

    while (true) {
      // 数组下标访问: a[i]
      if (this.match(TokenType.OpenBracket)) {
        const index = this.parseExpression();
        this.consume(TokenType.CloseBracket, "预期 ']'");
        expr = {
          type: 'ArrayAccessExpr',
          loc: expr.loc,
          target: expr,
          index,
        };
        continue;
      }

      // 成员属性访问: p.first 或 v.size
      if (this.match(TokenType.Dot)) {
        const prop = this.consume(TokenType.Identifier, "'.' 后预期成员名称").value;
        expr = {
          type: 'MemberExpr',
          loc: expr.loc,
          object: expr,
          property: prop,
        };
        continue;
      }

      // 函数调用或方法调用: func(...) 或 v.push_back(...)
      if (this.match(TokenType.OpenParen)) {
        const args: ExpressionNode[] = [];
        while (!this.check(TokenType.CloseParen) && !this.isAtEnd()) {
          args.push(this.parseExpression());
          if (!this.check(TokenType.CloseParen)) {
            this.consume(TokenType.Comma, "预期 ','");
          }
        }
        this.consume(TokenType.CloseParen, "预期 ')'");
        expr = {
          type: 'CallExpr',
          loc: expr.loc,
          callee: expr,
          args,
        };
        continue;
      }

      // 后缀 ++ / --
      if (this.match(TokenType.Increment) || this.match(TokenType.Decrement)) {
        const opToken = this.previous();
        if (
          expr.type === 'IdentifierExpr' ||
          expr.type === 'ArrayAccessExpr' ||
          expr.type === 'MemberExpr'
        ) {
          expr = {
            type: 'UpdateExpr',
            loc: opToken.loc,
            op: opToken.value as '++' | '--',
            argument: expr,
            prefix: false,
          };
          continue;
        }
        throw new Error(`[Parser 错误] 行 ${opToken.loc.line}: 后缀 ++/-- 的操作数必须是可修改左值`);
      }

      break;
    }

    return expr;
  }

  private parsePrimary(): ExpressionNode {
    if (this.match(TokenType.NumberLiteral)) {
      return {
        type: 'NumberLiteralExpr',
        loc: this.previous().loc,
        value: Number(this.previous().value),
      };
    }

    if (this.match(TokenType.StringLiteral)) {
      return {
        type: 'StringLiteralExpr',
        loc: this.previous().loc,
        value: this.previous().value,
      };
    }

    if (this.match(TokenType.Identifier)) {
      return {
        type: 'IdentifierExpr',
        loc: this.previous().loc,
        name: this.previous().value,
      };
    }

    if (this.match(TokenType.OpenParen)) {
      const expr = this.parseExpression();
      this.consume(TokenType.CloseParen, "预期 ')'");
      return expr;
    }

    throw new Error(
      `[Parser 语法错误] 行 ${this.peek().loc.line}, 列 ${this.peek().loc.column}: 无法解析的表达式词元 '${this.peek().value}'`
    );
  }

  // 辅助方法
  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, errorMessage: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new Error(
      `[Parser 语法错误] 行 ${token.loc.line}, 列 ${token.loc.column}: ${errorMessage} (当前是 '${token.value}')`
    );
  }
}
