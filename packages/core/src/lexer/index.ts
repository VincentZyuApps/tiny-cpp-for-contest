/**
 * packages/core/src/lexer/index.ts
 * 词法分析器 (Lexer): 生成带源码位置信息的 Token 流 (支持控制流、比较与数组操作符)
 */

import { Token, TokenType } from '../types';

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(source: string) {
    this.source = source;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isAtEnd()) break;

      const loc = { line: this.line, column: this.column };
      const ch = this.peek();
      const next = this.peekNext();

      // 1. 双字符操作符
      if (ch === '>' && next === '>') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.ShiftRight, value: '>>', loc });
        continue;
      }
      if (ch === '<' && next === '<') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.ShiftLeft, value: '<<', loc });
        continue;
      }
      if (ch === '+' && next === '+') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.Increment, value: '++', loc });
        continue;
      }
      if (ch === '-' && next === '-') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.Decrement, value: '--', loc });
        continue;
      }
      if (ch === '+' && next === '=') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.PlusAssign, value: '+=', loc });
        continue;
      }
      if (ch === '-' && next === '=') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.MinusAssign, value: '-=', loc });
        continue;
      }
      if (ch === '*' && next === '=') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.MultiplyAssign, value: '*=', loc });
        continue;
      }
      if (ch === '/' && next === '=') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.DivideAssign, value: '/=', loc });
        continue;
      }
      if (ch === '=' && next === '=') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.Equal, value: '==', loc });
        continue;
      }
      if (ch === '!' && next === '=') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.NotEqual, value: '!=', loc });
        continue;
      }
      if (ch === '<' && next === '=') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.LessEqual, value: '<=', loc });
        continue;
      }
      if (ch === '>' && next === '=') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.GreaterEqual, value: '>=', loc });
        continue;
      }
      if (ch === '&' && next === '&') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.LogicalAnd, value: '&&', loc });
        continue;
      }
      if (ch === '|' && next === '|') {
        this.advance(); this.advance();
        tokens.push({ type: TokenType.LogicalOr, value: '||', loc });
        continue;
      }

      // 2. 单字符操作符与标点
      switch (ch) {
        case '+':
          this.advance();
          tokens.push({ type: TokenType.Plus, value: '+', loc });
          continue;
        case '-':
          this.advance();
          tokens.push({ type: TokenType.Minus, value: '-', loc });
          continue;
        case '*':
          this.advance();
          tokens.push({ type: TokenType.Multiply, value: '*', loc });
          continue;
        case '/':
          this.advance();
          tokens.push({ type: TokenType.Divide, value: '/', loc });
          continue;
        case '%':
          this.advance();
          tokens.push({ type: TokenType.Modulo, value: '%', loc });
          continue;
        case '=':
          this.advance();
          tokens.push({ type: TokenType.Assign, value: '=', loc });
          continue;
        case '<':
          this.advance();
          tokens.push({ type: TokenType.LessThan, value: '<', loc });
          continue;
        case '>':
          this.advance();
          tokens.push({ type: TokenType.GreaterThan, value: '>', loc });
          continue;
        case '!':
          this.advance();
          tokens.push({ type: TokenType.LogicalNot, value: '!', loc });
          continue;
        case '.':
          this.advance();
          tokens.push({ type: TokenType.Dot, value: '.', loc });
          continue;
        case ':':
          this.advance();
          tokens.push({ type: TokenType.Colon, value: ':', loc });
          continue;
        case '&':
          this.advance();
          tokens.push({ type: TokenType.Ampersand, value: '&', loc });
          continue;
        case ';':
          this.advance();
          tokens.push({ type: TokenType.Semicolon, value: ';', loc });
          continue;
        case ',':
          this.advance();
          tokens.push({ type: TokenType.Comma, value: ',', loc });
          continue;
        case '(':
          this.advance();
          tokens.push({ type: TokenType.OpenParen, value: '(', loc });
          continue;
        case ')':
          this.advance();
          tokens.push({ type: TokenType.CloseParen, value: ')', loc });
          continue;
        case '{':
          this.advance();
          tokens.push({ type: TokenType.OpenBrace, value: '{', loc });
          continue;
        case '}':
          this.advance();
          tokens.push({ type: TokenType.CloseBrace, value: '}', loc });
          continue;
        case '[':
          this.advance();
          tokens.push({ type: TokenType.OpenBracket, value: '[', loc });
          continue;
        case ']':
          this.advance();
          tokens.push({ type: TokenType.CloseBracket, value: ']', loc });
          continue;
        case '"':
          tokens.push(this.readString());
          continue;
      }

      // 3. 数字字面量
      if (this.isDigit(ch)) {
        tokens.push(this.readNumber());
        continue;
      }

      // 4. 标识符或关键字
      if (this.isAlphaOrUnderscore(ch)) {
        tokens.push(this.readIdentifierOrKeyword());
        continue;
      }

      // 未知字符
      this.advance();
    }

    tokens.push({
      type: TokenType.EOF,
      value: '',
      loc: { line: this.line, column: this.column },
    });

    return tokens;
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private peek(): string {
    return this.source[this.pos] || '\0';
  }

  private peekNext(): string {
    return this.source[this.pos + 1] || '\0';
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.advance();
      } else if (ch === '/' && this.peekNext() === '/') {
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance();
        }
      } else if (ch === '/' && this.peekNext() === '*') {
        this.advance();
        this.advance();
        while (!this.isAtEnd()) {
          if (this.peek() === '*' && this.peekNext() === '/') {
            this.advance();
            this.advance();
            break;
          }
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlphaOrUnderscore(ch: string): boolean {
    return (
      (ch >= 'a' && ch <= 'z') ||
      (ch >= 'A' && ch <= 'Z') ||
      ch === '_'
    );
  }

  private readNumber(): Token {
    const loc = { line: this.line, column: this.column };
    let text = '';
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      text += this.advance();
    }
    if (this.peek() === 'L' || this.peek() === 'l') {
      while (!this.isAtEnd() && (this.peek() === 'L' || this.peek() === 'l')) {
        this.advance();
      }
    }
    return {
      type: TokenType.NumberLiteral,
      value: text,
      loc,
    };
  }

  private readString(): Token {
    const loc = { line: this.line, column: this.column };
    this.advance(); // 跳过起始双引号
    let text = '';
    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        if (escaped === 'n') text += '\n';
        else if (escaped === 't') text += '\t';
        else if (escaped === 'r') text += '\r';
        else if (escaped === '\\') text += '\\';
        else if (escaped === '"') text += '"';
        else text += escaped;
      } else {
        text += this.advance();
      }
    }
    if (!this.isAtEnd() && this.peek() === '"') {
      this.advance();
    }
    return {
      type: TokenType.StringLiteral,
      value: text,
      loc,
    };
  }

  private readIdentifierOrKeyword(): Token {
    const loc = { line: this.line, column: this.column };
    let text = '';
    while (
      !this.isAtEnd() &&
      (this.isAlphaOrUnderscore(this.peek()) || this.isDigit(this.peek()))
    ) {
      text += this.advance();
    }

    let type = TokenType.Identifier;
    switch (text) {
      case 'int':
        type = TokenType.KeywordInt;
        break;
      case 'long':
        type = TokenType.KeywordLong;
        break;
      case 'return':
        type = TokenType.KeywordReturn;
        break;
      case 'cin':
        type = TokenType.KeywordCin;
        break;
      case 'cout':
        type = TokenType.KeywordCout;
        break;
      case 'endl':
        type = TokenType.KeywordEndl;
        break;
      case 'if':
        type = TokenType.KeywordIf;
        break;
      case 'else':
        type = TokenType.KeywordElse;
        break;
      case 'while':
        type = TokenType.KeywordWhile;
        break;
      case 'for':
        type = TokenType.KeywordFor;
        break;
      case 'break':
        type = TokenType.KeywordBreak;
        break;
      case 'continue':
        type = TokenType.KeywordContinue;
        break;
      case 'void':
        type = TokenType.KeywordVoid;
        break;
      case 'auto':
        type = TokenType.KeywordAuto;
        break;
      case 'vector':
        type = TokenType.KeywordVector;
        break;
      case 'string':
        type = TokenType.KeywordString;
        break;
      case 'pair':
        type = TokenType.KeywordPair;
        break;
      case 'queue':
        type = TokenType.KeywordQueue;
        break;
      case 'stack':
        type = TokenType.KeywordStack;
        break;
      case 'priority_queue':
        type = TokenType.KeywordPriorityQueue;
        break;
    }

    return { type, value: text, loc };
  }
}
