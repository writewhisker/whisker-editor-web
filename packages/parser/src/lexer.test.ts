import { describe, it, expect } from 'vitest';
import { Lexer, tokenize } from './lexer';
import { TokenType, Token } from './types';

// Helper to get token types from result
function getTypes(source: string): TokenType[] {
  const result = tokenize(source);
  return result.tokens.map(t => t.type);
}

// Helper to get token values from result
function getValues(source: string): string[] {
  const result = tokenize(source);
  return result.tokens.map(t => t.value);
}

// Helper to check for specific token
function hasToken(source: string, type: TokenType, value?: string): boolean {
  const result = tokenize(source);
  return result.tokens.some(t => t.type === type && (value === undefined || t.value === value));
}

describe('Lexer', () => {
  describe('structure markers', () => {
    it('should tokenize passage marker (::)', () => {
      expect(hasToken(':: Start', TokenType.PASSAGE_MARKER, '::')).toBe(true);
    });

    it('should tokenize once-only choice marker (+) at line start', () => {
      expect(hasToken('+ Go left', TokenType.ONCE_CHOICE_MARKER, '+')).toBe(true);
    });

    it('should tokenize sticky choice marker (*) at line start', () => {
      expect(hasToken('* Stay here', TokenType.STICKY_CHOICE_MARKER, '*')).toBe(true);
    });

    it('should tokenize arrow (->)', () => {
      expect(hasToken('-> next', TokenType.ARROW, '->')).toBe(true);
    });

    it('should differentiate + at line start vs in expression', () => {
      const result = tokenize('+ choice\n1 + 2');
      const types = result.tokens.map(t => t.type);
      expect(types).toContain(TokenType.ONCE_CHOICE_MARKER);
      expect(types).toContain(TokenType.PLUS);
    });

    it('should differentiate * at line start vs in expression', () => {
      const result = tokenize('* choice\n2 * 3');
      const types = result.tokens.map(t => t.type);
      expect(types).toContain(TokenType.STICKY_CHOICE_MARKER);
      expect(types).toContain(TokenType.STAR);
    });

    it('should tokenize gather point (-) at line start', () => {
      expect(hasToken('- continue', TokenType.GATHER, '-')).toBe(true);
    });

    it('should differentiate - at line start (gather) vs in expression', () => {
      const result = tokenize('- gather\n5 - 3');
      const types = result.tokens.map(t => t.type);
      expect(types).toContain(TokenType.GATHER);
      expect(types).toContain(TokenType.MINUS);
    });

    it('should tokenize nested gather points', () => {
      const result = tokenize('- - nested');
      const gatherCount = result.tokens.filter(t => t.type === TokenType.GATHER).length;
      expect(gatherCount).toBe(2);
    });

    it('should tokenize tunnel return (<-)', () => {
      expect(hasToken('<-', TokenType.TUNNEL_RETURN, '<-')).toBe(true);
    });

    it('should differentiate <- (tunnel return) from < and -', () => {
      const result = tokenize('<-\n1 < 2');
      const types = result.tokens.map(t => t.type);
      expect(types).toContain(TokenType.TUNNEL_RETURN);
      expect(types).toContain(TokenType.LT);
    });

    it('should tokenize tunnel call pattern (-> Target ->)', () => {
      const result = tokenize('-> Target ->');
      const arrowCount = result.tokens.filter(t => t.type === TokenType.ARROW).length;
      expect(arrowCount).toBe(2);
    });
  });

  describe('delimiters', () => {
    it('should tokenize braces', () => {
      expect(hasToken('{ }', TokenType.LBRACE)).toBe(true);
      expect(hasToken('{ }', TokenType.RBRACE)).toBe(true);
    });

    it('should tokenize brackets', () => {
      expect(hasToken('[text]', TokenType.LBRACKET)).toBe(true);
      expect(hasToken('[text]', TokenType.RBRACKET)).toBe(true);
    });

    it('should tokenize parentheses', () => {
      expect(hasToken('(expr)', TokenType.LPAREN)).toBe(true);
      expect(hasToken('(expr)', TokenType.RPAREN)).toBe(true);
    });

    it('should tokenize conditional end ({/})', () => {
      expect(hasToken('{/}', TokenType.COND_END, '{/}')).toBe(true);
    });

    it('should tokenize expression start (${)', () => {
      expect(hasToken('${expr}', TokenType.EXPR_START, '${')).toBe(true);
    });
  });

  describe('operators', () => {
    describe('arithmetic', () => {
      it('should tokenize plus', () => {
        expect(hasToken('1 + 2', TokenType.PLUS)).toBe(true);
      });

      it('should tokenize minus', () => {
        expect(hasToken('1 - 2', TokenType.MINUS)).toBe(true);
      });

      it('should tokenize multiply', () => {
        expect(hasToken('2 * 3', TokenType.STAR)).toBe(true);
      });

      it('should tokenize divide', () => {
        expect(hasToken('6 / 2', TokenType.SLASH)).toBe(true);
      });

      it('should tokenize modulo', () => {
        expect(hasToken('5 % 2', TokenType.PERCENT)).toBe(true);
      });

      it('should tokenize power', () => {
        expect(hasToken('2 ^ 3', TokenType.CARET)).toBe(true);
      });
    });

    describe('assignment', () => {
      it('should tokenize assign (=)', () => {
        expect(hasToken('x = 1', TokenType.ASSIGN)).toBe(true);
      });

      it('should tokenize plus-assign (+=)', () => {
        expect(hasToken('x += 1', TokenType.PLUS_ASSIGN, '+=')).toBe(true);
      });

      it('should tokenize minus-assign (-=)', () => {
        expect(hasToken('x -= 1', TokenType.MINUS_ASSIGN, '-=')).toBe(true);
      });

      it('should tokenize star-assign (*=)', () => {
        expect(hasToken('x *= 2', TokenType.STAR_ASSIGN, '*=')).toBe(true);
      });

      it('should tokenize slash-assign (/=)', () => {
        expect(hasToken('x /= 2', TokenType.SLASH_ASSIGN, '/=')).toBe(true);
      });
    });

    describe('comparison', () => {
      it('should tokenize equals (==)', () => {
        expect(hasToken('x == 1', TokenType.EQ, '==')).toBe(true);
      });

      it('should tokenize not-equals (~=)', () => {
        expect(hasToken('x ~= 1', TokenType.NEQ, '~=')).toBe(true);
      });

      it('should tokenize less-than (<)', () => {
        expect(hasToken('x < 1', TokenType.LT)).toBe(true);
      });

      it('should tokenize greater-than (>)', () => {
        expect(hasToken('x > 1', TokenType.GT)).toBe(true);
      });

      it('should tokenize less-than-or-equal (<=)', () => {
        expect(hasToken('x <= 1', TokenType.LTE, '<=')).toBe(true);
      });

      it('should tokenize greater-than-or-equal (>=)', () => {
        expect(hasToken('x >= 1', TokenType.GTE, '>=')).toBe(true);
      });
    });

    describe('logical (Lua-style)', () => {
      it('should tokenize and keyword', () => {
        expect(hasToken('x and y', TokenType.AND, 'and')).toBe(true);
      });

      it('should tokenize or keyword', () => {
        expect(hasToken('x or y', TokenType.OR, 'or')).toBe(true);
      });

      it('should tokenize not keyword', () => {
        expect(hasToken('not x', TokenType.NOT, 'not')).toBe(true);
      });
    });

    describe('C-style operators (should error)', () => {
      it('should emit error for && and suggest "and"', () => {
        const result = tokenize('x && y');
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('and');
        expect(hasToken('x && y', TokenType.ERROR, '&&')).toBe(true);
      });

      it('should emit error for || and suggest "or"', () => {
        const result = tokenize('x || y');
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('or');
        expect(hasToken('x || y', TokenType.ERROR, '||')).toBe(true);
      });

      it('should emit error for != and suggest ~=', () => {
        const result = tokenize('x != y');
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('~=');
        expect(hasToken('x != y', TokenType.ERROR, '!=')).toBe(true);
      });

      it('should emit error for ! and suggest "not" in expression context', () => {
        // ! as negation is only an error in expression context
        const result = tokenize('{!x}');
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('not');
        expect(hasToken('{!x}', TokenType.ERROR, '!')).toBe(true);
      });

      it('should allow ! as text outside expression context', () => {
        const result = tokenize('Hello!');
        expect(result.errors.length).toBe(0);
        expect(hasToken('Hello!', TokenType.TEXT, '!')).toBe(true);
      });
    });
  });

  describe('literals', () => {
    describe('numbers', () => {
      it('should tokenize integer', () => {
        expect(hasToken('42', TokenType.NUMBER, '42')).toBe(true);
      });

      it('should tokenize float', () => {
        expect(hasToken('3.14', TokenType.NUMBER, '3.14')).toBe(true);
      });

      it('should tokenize number with exponent', () => {
        expect(hasToken('1e10', TokenType.NUMBER, '1e10')).toBe(true);
      });

      it('should tokenize number with negative exponent', () => {
        expect(hasToken('1e-5', TokenType.NUMBER, '1e-5')).toBe(true);
      });

      it('should tokenize zero', () => {
        expect(hasToken('0', TokenType.NUMBER, '0')).toBe(true);
      });
    });

    describe('strings', () => {
      it('should tokenize double-quoted string', () => {
        expect(hasToken('"hello"', TokenType.STRING, 'hello')).toBe(true);
      });

      it('should tokenize single-quoted string', () => {
        expect(hasToken("'world'", TokenType.STRING, 'world')).toBe(true);
      });

      it('should handle escape sequences in strings', () => {
        expect(hasToken('"hello\\nworld"', TokenType.STRING, 'hello\nworld')).toBe(true);
      });

      it('should handle escaped quotes', () => {
        expect(hasToken('"say \\"hello\\""', TokenType.STRING, 'say "hello"')).toBe(true);
      });

      it('should handle empty string', () => {
        expect(hasToken('""', TokenType.STRING, '')).toBe(true);
      });

      it('should error on unterminated string', () => {
        const result = tokenize('"unclosed');
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('Unterminated');
      });

      it('should error on newline in string', () => {
        const result = tokenize('"line1\nline2"');
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('identifiers', () => {
      it('should tokenize simple identifier', () => {
        expect(hasToken('foo', TokenType.IDENTIFIER, 'foo')).toBe(true);
      });

      it('should tokenize identifier with underscore', () => {
        expect(hasToken('my_var', TokenType.IDENTIFIER, 'my_var')).toBe(true);
      });

      it('should tokenize identifier starting with underscore', () => {
        expect(hasToken('_temp', TokenType.IDENTIFIER, '_temp')).toBe(true);
      });

      it('should tokenize identifier with numbers', () => {
        expect(hasToken('var123', TokenType.IDENTIFIER, 'var123')).toBe(true);
      });

      it('should tokenize CamelCase identifier', () => {
        expect(hasToken('MyVariable', TokenType.IDENTIFIER, 'MyVariable')).toBe(true);
      });
    });
  });

  describe('keywords', () => {
    it('should tokenize true', () => {
      expect(hasToken('true', TokenType.TRUE, 'true')).toBe(true);
    });

    it('should tokenize false', () => {
      expect(hasToken('false', TokenType.FALSE, 'false')).toBe(true);
    });

    it('should tokenize nil', () => {
      expect(hasToken('nil', TokenType.NIL, 'nil')).toBe(true);
    });

    it('should tokenize if', () => {
      expect(hasToken('if x', TokenType.IF, 'if')).toBe(true);
    });

    it('should tokenize else', () => {
      expect(hasToken('else', TokenType.ELSE, 'else')).toBe(true);
    });

    it('should tokenize elif', () => {
      expect(hasToken('elif x', TokenType.ELIF, 'elif')).toBe(true);
    });

    it('should not match keyword as part of identifier', () => {
      expect(hasToken('android', TokenType.IDENTIFIER, 'android')).toBe(true);
      expect(hasToken('android', TokenType.AND)).toBe(false);
    });
  });

  describe('directives', () => {
    it('should tokenize @title directive', () => {
      expect(hasToken('@title', TokenType.DIRECTIVE, '@title')).toBe(true);
    });

    it('should tokenize @author directive', () => {
      expect(hasToken('@author', TokenType.DIRECTIVE, '@author')).toBe(true);
    });

    it('should tokenize @vars directive', () => {
      expect(hasToken('@vars', TokenType.DIRECTIVE, '@vars')).toBe(true);
    });

    it('should tokenize custom directive', () => {
      expect(hasToken('@custom123', TokenType.DIRECTIVE, '@custom123')).toBe(true);
    });
  });

  describe('comments', () => {
    it('should tokenize line comment', () => {
      const result = tokenize('-- this is a comment');
      expect(hasToken('-- this is a comment', TokenType.COMMENT)).toBe(true);
    });

    it('should tokenize block comment', () => {
      expect(hasToken('/* block */', TokenType.COMMENT)).toBe(true);
    });

    it('should handle multiline block comment', () => {
      const result = tokenize('/* line1\nline2 */');
      expect(result.tokens.some(t => t.type === TokenType.COMMENT)).toBe(true);
    });

    it('should error on unterminated block comment', () => {
      const result = tokenize('/* unclosed');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('special characters', () => {
    it('should tokenize dollar sign', () => {
      expect(hasToken('$gold', TokenType.DOLLAR, '$')).toBe(true);
    });

    it('should tokenize underscore for temp var prefix', () => {
      expect(hasToken('_ alone', TokenType.UNDERSCORE, '_')).toBe(true);
    });

    it('should tokenize colon', () => {
      expect(hasToken('label:', TokenType.COLON, ':')).toBe(true);
    });

    it('should tokenize semicolon', () => {
      expect(hasToken('x = 1; y = 2', TokenType.SEMICOLON, ';')).toBe(true);
    });

    it('should tokenize comma', () => {
      expect(hasToken('a, b', TokenType.COMMA, ',')).toBe(true);
    });

    it('should tokenize dot', () => {
      expect(hasToken('obj.prop', TokenType.DOT, '.')).toBe(true);
    });

    it('should tokenize dot-dot (concatenation)', () => {
      expect(hasToken('a .. b', TokenType.DOTDOT, '..')).toBe(true);
    });

    it('should tokenize hash (length)', () => {
      expect(hasToken('#list', TokenType.HASH, '#')).toBe(true);
    });

    it('should tokenize pipe', () => {
      expect(hasToken('a | b', TokenType.PIPE, '|')).toBe(true);
    });

    it('should tokenize ampersand', () => {
      expect(hasToken('{&| a }', TokenType.AMPERSAND, '&')).toBe(true);
    });

    it('should tokenize tilde (not as ~=)', () => {
      expect(hasToken('{~| a }', TokenType.TILDE, '~')).toBe(true);
    });
  });

  describe('source locations', () => {
    it('should track line numbers', () => {
      const result = tokenize('a\nb\nc');
      const bToken = result.tokens.find(t => t.value === 'b');
      expect(bToken?.location.start.line).toBe(2);
    });

    it('should track column numbers', () => {
      const result = tokenize('abc def');
      const defToken = result.tokens.find(t => t.value === 'def');
      expect(defToken?.location.start.column).toBe(5);
    });

    it('should track offset', () => {
      const result = tokenize('ab cd');
      const cdToken = result.tokens.find(t => t.value === 'cd');
      expect(cdToken?.location.start.offset).toBe(3);
    });
  });

  describe('complex expressions', () => {
    it('should tokenize variable assignment', () => {
      const types = getTypes('$gold = 100');
      expect(types).toContain(TokenType.DOLLAR);
      expect(types).toContain(TokenType.IDENTIFIER);
      expect(types).toContain(TokenType.ASSIGN);
      expect(types).toContain(TokenType.NUMBER);
    });

    it('should tokenize conditional expression', () => {
      const types = getTypes('{ $gold >= 50 }');
      expect(types).toContain(TokenType.LBRACE);
      expect(types).toContain(TokenType.DOLLAR);
      expect(types).toContain(TokenType.GTE);
      expect(types).toContain(TokenType.NUMBER);
      expect(types).toContain(TokenType.RBRACE);
    });

    it('should tokenize choice with target', () => {
      const types = getTypes('+ [Go left] -> left_room');
      expect(types).toContain(TokenType.ONCE_CHOICE_MARKER);
      expect(types).toContain(TokenType.LBRACKET);
      expect(types).toContain(TokenType.RBRACKET);
      expect(types).toContain(TokenType.ARROW);
      expect(types).toContain(TokenType.IDENTIFIER);
    });

    it('should tokenize passage header', () => {
      const types = getTypes(':: Start');
      expect(types).toContain(TokenType.PASSAGE_MARKER);
      expect(types).toContain(TokenType.IDENTIFIER);
    });

    it('should tokenize expression interpolation', () => {
      const types = getTypes('You have ${$gold * 2} coins');
      expect(types).toContain(TokenType.EXPR_START);
      expect(types).toContain(TokenType.DOLLAR);
      expect(types).toContain(TokenType.STAR);
      expect(types).toContain(TokenType.RBRACE);
    });
  });

  describe('escape sequences', () => {
    it('should escape dollar sign (\\$)', () => {
      const result = tokenize('The price is \\$50');
      expect(hasToken('The price is \\$50', TokenType.TEXT, '$')).toBe(true);
      // Should NOT have DOLLAR token for the escaped one
      const dollarTokens = result.tokens.filter(t => t.type === TokenType.DOLLAR);
      expect(dollarTokens.length).toBe(0);
    });

    it('should escape left brace (\\{)', () => {
      expect(hasToken('Use \\{ for text', TokenType.TEXT, '{')).toBe(true);
    });

    it('should escape right brace (\\})', () => {
      expect(hasToken('and \\} for closing', TokenType.TEXT, '}')).toBe(true);
    });

    it('should escape backslash (\\\\)', () => {
      expect(hasToken('path\\\\file', TokenType.TEXT, '\\')).toBe(true);
    });

    it('should escape newline (\\n)', () => {
      const result = tokenize('line1\\nline2');
      expect(hasToken('line1\\nline2', TokenType.TEXT, '\n')).toBe(true);
    });

    it('should escape tab (\\t)', () => {
      expect(hasToken('col1\\tcol2', TokenType.TEXT, '\t')).toBe(true);
    });

    it('should handle unknown escape as literal backslash', () => {
      const result = tokenize('\\x');
      expect(hasToken('\\x', TokenType.TEXT, '\\')).toBe(true);
      expect(hasToken('\\x', TokenType.IDENTIFIER, 'x')).toBe(true);
    });

    it('should handle trailing backslash', () => {
      const result = tokenize('text\\');
      expect(hasToken('text\\', TokenType.TEXT, '\\')).toBe(true);
    });

    it('should allow escaped dollar in expression context', () => {
      const result = tokenize('Cost: \\$100 vs $price');
      // \$100 should have TEXT '$', number 100
      // $price should have DOLLAR, IDENTIFIER
      const textTokens = result.tokens.filter(t => t.type === TokenType.TEXT && t.value === '$');
      const dollarTokens = result.tokens.filter(t => t.type === TokenType.DOLLAR);
      expect(textTokens.length).toBe(1); // escaped $
      expect(dollarTokens.length).toBe(1); // $price
    });
  });

  describe('EOF handling', () => {
    it('should always end with EOF token', () => {
      const result = tokenize('test');
      const lastToken = result.tokens[result.tokens.length - 1];
      expect(lastToken.type).toBe(TokenType.EOF);
    });

    it('should have EOF for empty input', () => {
      const result = tokenize('');
      expect(result.tokens.length).toBe(1);
      expect(result.tokens[0].type).toBe(TokenType.EOF);
    });
  });

  describe('error recovery', () => {
    it('should continue after error', () => {
      const result = tokenize('x != y == z');
      // Should have error for !=, but continue to tokenize == and z
      expect(result.errors.length).toBeGreaterThan(0);
      expect(hasToken('x != y == z', TokenType.EQ, '==')).toBe(true);
    });

    it('should collect multiple errors', () => {
      // Inside expression context, both ! and && are errors
      const result = tokenize('{!a && b}');
      expect(result.errors.length).toBe(2); // ! and &&
    });
  });

  describe('unicode support', () => {
    it('should tokenize Chinese characters as TEXT', () => {
      const result = tokenize('Hello 世界');
      expect(result.errors.length).toBe(0);
      const textTokens = result.tokens.filter(t => t.type === TokenType.TEXT);
      expect(textTokens.some(t => t.value === '世')).toBe(true);
      expect(textTokens.some(t => t.value === '界')).toBe(true);
    });

    it('should tokenize Japanese characters', () => {
      const result = tokenize('こんにちは');
      expect(result.errors.length).toBe(0);
      const textTokens = result.tokens.filter(t => t.type === TokenType.TEXT);
      expect(textTokens.length).toBeGreaterThan(0);
    });

    it('should tokenize emoji characters', () => {
      const result = tokenize('Hello 😀');
      expect(result.errors.length).toBe(0);
    });

    it('should tokenize mixed ASCII and Unicode', () => {
      const result = tokenize(':: Start\nHello 世界!');
      expect(result.errors.length).toBe(0);
      expect(hasToken(':: Start\nHello 世界!', TokenType.PASSAGE_MARKER, '::')).toBe(true);
    });
  });
});
