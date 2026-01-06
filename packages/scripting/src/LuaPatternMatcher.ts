/**
 * LuaPatternMatcher - Implements Lua 5.4 pattern matching
 *
 * Lua patterns are different from regular expressions. This class
 * provides a complete implementation of Lua pattern matching semantics.
 *
 * Character Classes:
 *   .  - any character
 *   %a - letter (A-Za-z)
 *   %c - control character
 *   %d - digit (0-9)
 *   %g - printable character (except space)
 *   %l - lowercase letter (a-z)
 *   %p - punctuation character
 *   %s - whitespace
 *   %u - uppercase letter (A-Z)
 *   %w - alphanumeric (A-Za-z0-9)
 *   %x - hexadecimal digit (0-9A-Fa-f)
 *   %z - null character (\0)
 *   %X - (where X is any non-alphanumeric) represents X itself
 *
 * Quantifiers:
 *   *  - 0 or more (greedy)
 *   +  - 1 or more (greedy)
 *   -  - 0 or more (lazy/non-greedy)
 *   ?  - 0 or 1
 *
 * Anchors:
 *   ^  - start of string (only at pattern start)
 *   $  - end of string (only at pattern end)
 */

export interface PatternMatch {
  /** 1-based start index in the original string */
  start: number;
  /** 1-based end index (inclusive) in the original string */
  end: number;
  /** The matched substring */
  match: string;
  /** Captured groups (from parentheses) */
  captures: (string | number)[];
}

export class LuaPatternMatcher {
  private pattern: string;

  constructor(pattern: string) {
    this.pattern = pattern;
  }

  /**
   * Test if a character matches a Lua character class
   */
  private matchCharClass(classChar: string, char: string): boolean {
    if (!char) return false;

    const code = char.charCodeAt(0);
    const isUpper = classChar === classChar.toUpperCase();
    const lowerClass = classChar.toLowerCase();

    let result: boolean;

    switch (lowerClass) {
      case 'a': // letter
        result = /^[a-zA-Z]$/.test(char);
        break;
      case 'c': // control character
        result = code < 32 || code === 127;
        break;
      case 'd': // digit
        result = /^[0-9]$/.test(char);
        break;
      case 'g': // printable (except space)
        result = code > 32 && code < 127;
        break;
      case 'l': // lowercase
        result = /^[a-z]$/.test(char);
        break;
      case 'p': // punctuation
        result = /^[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]$/.test(char);
        break;
      case 's': // whitespace
        result = /^[\s]$/.test(char);
        break;
      case 'u': // uppercase
        result = /^[A-Z]$/.test(char);
        break;
      case 'w': // alphanumeric
        result = /^[a-zA-Z0-9]$/.test(char);
        break;
      case 'x': // hexadecimal
        result = /^[0-9a-fA-F]$/.test(char);
        break;
      case 'z': // null character
        result = code === 0;
        break;
      default:
        // %X where X is non-alphanumeric means literal X
        result = char === lowerClass;
    }

    // Uppercase class means negation
    return isUpper && /^[A-Z]$/.test(classChar) && lowerClass !== classChar
      ? !result
      : result;
  }

  /**
   * Match a single pattern element against a character
   * Returns true if the character matches the pattern element
   */
  private matchSingle(
    patternPos: number,
    char: string
  ): { matches: boolean; consumed: number } {
    if (patternPos >= this.pattern.length) {
      return { matches: false, consumed: 0 };
    }

    const p = this.pattern[patternPos];

    // Escape sequence
    if (p === '%') {
      if (patternPos + 1 >= this.pattern.length) {
        return { matches: false, consumed: 0 };
      }
      const nextChar = this.pattern[patternPos + 1];
      return {
        matches: this.matchCharClass(nextChar, char),
        consumed: 2,
      };
    }

    // Any character
    if (p === '.') {
      return { matches: char !== undefined && char !== '', consumed: 1 };
    }

    // Literal match
    return { matches: p === char, consumed: 1 };
  }

  /**
   * Get the quantifier following a pattern element, if any
   */
  private getQuantifier(pos: number): string | null {
    if (pos >= this.pattern.length) return null;
    const char = this.pattern[pos];
    if (char === '*' || char === '+' || char === '-' || char === '?') {
      return char;
    }
    return null;
  }

  /**
   * Main matching function - attempts to match pattern against string
   * starting at the given position.
   *
   * @param str The string to match against
   * @param strPos 0-based position in string to start matching
   * @param patternPos 0-based position in pattern to start matching
   * @param captures Array to collect captures
   * @returns The 0-based end position if matched, or -1 if no match
   */
  private matchCore(
    str: string,
    strPos: number,
    patternPos: number,
    captures: (string | number)[]
  ): number {
    // End of pattern - successful match
    if (patternPos >= this.pattern.length) {
      return strPos;
    }

    const patternChar = this.pattern[patternPos];

    // Handle $ anchor at end of pattern
    if (patternChar === '$' && patternPos === this.pattern.length - 1) {
      return strPos === str.length ? strPos : -1;
    }

    // Handle captures (parentheses)
    if (patternChar === '(') {
      return this.matchCapture(str, strPos, patternPos, captures);
    }

    // Handle balanced patterns %b
    if (
      patternChar === '%' &&
      this.pattern[patternPos + 1] === 'b' &&
      patternPos + 3 < this.pattern.length
    ) {
      return this.matchBalanced(str, strPos, patternPos, captures);
    }

    // Handle frontier patterns %f
    if (patternChar === '%' && this.pattern[patternPos + 1] === 'f') {
      return this.matchFrontier(str, strPos, patternPos, captures);
    }

    // Determine the pattern element length (1 for normal, 2 for %x)
    let elementLen = 1;
    if (patternChar === '%' && patternPos + 1 < this.pattern.length) {
      elementLen = 2;
    }

    // Check for character sets [...]
    if (patternChar === '[') {
      return this.matchCharSet(str, strPos, patternPos, captures);
    }

    // Check for quantifier after the pattern element
    const quantifierPos = patternPos + elementLen;
    const quantifier = this.getQuantifier(quantifierPos);

    if (quantifier) {
      return this.matchQuantified(
        str,
        strPos,
        patternPos,
        elementLen,
        quantifier,
        captures
      );
    }

    // Simple single-character match
    const result = this.matchSingle(patternPos, str[strPos]);
    if (!result.matches) {
      return -1;
    }

    return this.matchCore(
      str,
      strPos + 1,
      patternPos + result.consumed,
      captures
    );
  }

  /**
   * Handle quantified patterns (*, +, -, ?)
   */
  private matchQuantified(
    str: string,
    strPos: number,
    patternPos: number,
    elementLen: number,
    quantifier: string,
    captures: (string | number)[]
  ): number {
    const nextPatternPos = patternPos + elementLen + 1; // Skip element and quantifier

    switch (quantifier) {
      case '*': // 0 or more, greedy
        return this.matchGreedy(str, strPos, patternPos, nextPatternPos, 0, captures);

      case '+': // 1 or more, greedy
        return this.matchGreedy(str, strPos, patternPos, nextPatternPos, 1, captures);

      case '-': // 0 or more, lazy (non-greedy)
        return this.matchLazy(str, strPos, patternPos, nextPatternPos, captures);

      case '?': // 0 or 1
        {
          // Try with the character first
          const result = this.matchSingle(patternPos, str[strPos]);
          if (result.matches) {
            const afterMatch = this.matchCore(str, strPos + 1, nextPatternPos, captures);
            if (afterMatch !== -1) return afterMatch;
          }
          // Try without the character
          return this.matchCore(str, strPos, nextPatternPos, captures);
        }
    }

    return -1;
  }

  /**
   * Greedy matching - match as many as possible, then backtrack
   */
  private matchGreedy(
    str: string,
    strPos: number,
    patternPos: number,
    nextPatternPos: number,
    minCount: number,
    captures: (string | number)[]
  ): number {
    // Count how many characters we can match
    let count = 0;
    let pos = strPos;

    while (pos < str.length) {
      const result = this.matchSingle(patternPos, str[pos]);
      if (!result.matches) break;
      count++;
      pos++;
    }

    // Check minimum count
    if (count < minCount) return -1;

    // Try matching from longest to shortest
    for (let i = count; i >= minCount; i--) {
      const endPos = strPos + i;
      const afterMatch = this.matchCore(str, endPos, nextPatternPos, [...captures]);
      if (afterMatch !== -1) return afterMatch;
    }

    return -1;
  }

  /**
   * Lazy matching - match as few as possible
   */
  private matchLazy(
    str: string,
    strPos: number,
    patternPos: number,
    nextPatternPos: number,
    captures: (string | number)[]
  ): number {
    let pos = strPos;

    // Try matching 0 characters first, then progressively more
    while (pos <= str.length) {
      const afterMatch = this.matchCore(str, pos, nextPatternPos, [...captures]);
      if (afterMatch !== -1) return afterMatch;

      // Try one more character
      if (pos < str.length) {
        const result = this.matchSingle(patternPos, str[pos]);
        if (!result.matches) break;
      }
      pos++;
    }

    return -1;
  }

  /**
   * Match character set [...]
   */
  private matchCharSet(
    str: string,
    strPos: number,
    patternPos: number,
    captures: (string | number)[]
  ): number {
    const { matches, endPos } = this.matchCharSetSingle(str[strPos], patternPos);

    // Check for quantifier after ]
    const quantifier = this.getQuantifier(endPos);

    if (quantifier) {
      return this.matchCharSetQuantified(
        str,
        strPos,
        patternPos,
        endPos + 1,
        quantifier,
        captures
      );
    }

    if (!matches) return -1;
    return this.matchCore(str, strPos + 1, endPos, captures);
  }

  /**
   * Test if a character matches a character set pattern at patternPos
   */
  private matchCharSetSingle(
    char: string,
    patternPos: number
  ): { matches: boolean; endPos: number } {
    let pos = patternPos + 1; // Skip opening [
    let negate = false;

    // Check for negation
    if (this.pattern[pos] === '^') {
      negate = true;
      pos++;
    }

    let matches = false;
    let prevChar: string | null = null;

    while (pos < this.pattern.length && this.pattern[pos] !== ']') {
      const p = this.pattern[pos];

      // Character class in set
      if (p === '%' && pos + 1 < this.pattern.length) {
        if (char && this.matchCharClass(this.pattern[pos + 1], char)) {
          matches = true;
        }
        pos += 2;
        prevChar = null;
        continue;
      }

      // Range (a-z)
      if (p === '-' && prevChar !== null && pos + 1 < this.pattern.length && this.pattern[pos + 1] !== ']') {
        const rangeEnd = this.pattern[pos + 1];
        if (char && char >= prevChar && char <= rangeEnd) {
          matches = true;
        }
        pos += 2;
        prevChar = null;
        continue;
      }

      // Literal character
      if (char === p) {
        matches = true;
      }
      prevChar = p;
      pos++;
    }

    // Skip closing ]
    if (this.pattern[pos] === ']') {
      pos++;
    }

    return { matches: negate ? !matches : matches, endPos: pos };
  }

  /**
   * Handle quantified character sets
   */
  private matchCharSetQuantified(
    str: string,
    strPos: number,
    patternPos: number,
    nextPatternPos: number,
    quantifier: string,
    captures: (string | number)[]
  ): number {
    switch (quantifier) {
      case '*':
        return this.matchCharSetGreedy(str, strPos, patternPos, nextPatternPos, 0, captures);
      case '+':
        return this.matchCharSetGreedy(str, strPos, patternPos, nextPatternPos, 1, captures);
      case '-':
        return this.matchCharSetLazy(str, strPos, patternPos, nextPatternPos, captures);
      case '?': {
        const { matches } = this.matchCharSetSingle(str[strPos], patternPos);
        if (matches) {
          const after = this.matchCore(str, strPos + 1, nextPatternPos, captures);
          if (after !== -1) return after;
        }
        return this.matchCore(str, strPos, nextPatternPos, captures);
      }
    }
    return -1;
  }

  private matchCharSetGreedy(
    str: string,
    strPos: number,
    patternPos: number,
    nextPatternPos: number,
    minCount: number,
    captures: (string | number)[]
  ): number {
    let count = 0;
    let pos = strPos;

    while (pos < str.length) {
      const { matches } = this.matchCharSetSingle(str[pos], patternPos);
      if (!matches) break;
      count++;
      pos++;
    }

    if (count < minCount) return -1;

    for (let i = count; i >= minCount; i--) {
      const after = this.matchCore(str, strPos + i, nextPatternPos, [...captures]);
      if (after !== -1) return after;
    }

    return -1;
  }

  private matchCharSetLazy(
    str: string,
    strPos: number,
    patternPos: number,
    nextPatternPos: number,
    captures: (string | number)[]
  ): number {
    let pos = strPos;

    while (pos <= str.length) {
      const after = this.matchCore(str, pos, nextPatternPos, [...captures]);
      if (after !== -1) return after;

      if (pos < str.length) {
        const { matches } = this.matchCharSetSingle(str[pos], patternPos);
        if (!matches) break;
      }
      pos++;
    }

    return -1;
  }

  /**
   * Match balanced patterns %bxy
   */
  private matchBalanced(
    str: string,
    strPos: number,
    patternPos: number,
    captures: (string | number)[]
  ): number {
    const open = this.pattern[patternPos + 2];
    const close = this.pattern[patternPos + 3];

    if (str[strPos] !== open) return -1;

    let depth = 1;
    let pos = strPos + 1;

    while (pos < str.length && depth > 0) {
      if (str[pos] === close) depth--;
      else if (str[pos] === open) depth++;
      pos++;
    }

    if (depth !== 0) return -1;

    // Continue matching after %bxy
    return this.matchCore(str, pos, patternPos + 4, captures);
  }

  /**
   * Match frontier patterns %f[set]
   */
  private matchFrontier(
    str: string,
    strPos: number,
    patternPos: number,
    captures: (string | number)[]
  ): number {
    // %f[set] - position where previous char is NOT in set and current IS in set
    if (this.pattern[patternPos + 2] !== '[') {
      return -1; // Invalid frontier pattern
    }

    const prevChar = strPos > 0 ? str[strPos - 1] : '\0';
    const currChar = str[strPos] || '\0';

    // Find the character set
    const setStart = patternPos + 2;
    const { matches: prevMatches, endPos } = this.matchCharSetSingle(prevChar, setStart);
    const { matches: currMatches } = this.matchCharSetSingle(currChar, setStart);

    // Frontier matches if prev NOT in set AND curr IS in set
    if (prevMatches || !currMatches) {
      return -1;
    }

    return this.matchCore(str, strPos, endPos, captures);
  }

  /**
   * Match captures (...)
   */
  private matchCapture(
    str: string,
    strPos: number,
    patternPos: number,
    captures: (string | number)[]
  ): number {
    // Empty capture () returns position
    if (this.pattern[patternPos + 1] === ')') {
      captures.push(strPos + 1); // 1-based position
      return this.matchCore(str, strPos, patternPos + 2, captures);
    }

    // Find matching )
    let depth = 1;
    let closePos = patternPos + 1;
    while (closePos < this.pattern.length && depth > 0) {
      if (this.pattern[closePos] === '(') depth++;
      else if (this.pattern[closePos] === ')') depth--;
      closePos++;
    }

    if (depth !== 0) return -1;

    // Match the inner pattern
    const innerPattern = this.pattern.substring(patternPos + 1, closePos - 1);
    const innerMatcher = new LuaPatternMatcher(innerPattern);
    const innerCaptures: (string | number)[] = [];

    const result = innerMatcher.matchAt(str, strPos, innerCaptures);
    if (!result) return -1;

    // Add the captured text
    const capturedText = str.substring(strPos, result.end);
    captures.push(capturedText);

    // Add any nested captures
    for (const c of innerCaptures) {
      captures.push(c);
    }

    // Continue after the capture group
    return this.matchCore(str, result.end, closePos, captures);
  }

  /**
   * Try to match the pattern starting at a specific position
   */
  matchAt(
    str: string,
    startPos: number,
    captures: (string | number)[] = []
  ): PatternMatch | null {
    const endPos = this.matchCore(str, startPos, 0, captures);
    if (endPos === -1) return null;

    return {
      start: startPos + 1, // Convert to 1-based
      end: endPos, // Already 1-based for end
      match: str.substring(startPos, endPos),
      captures,
    };
  }

  /**
   * Find the first match of the pattern in the string
   *
   * @param str The string to search
   * @param init 1-based starting position (default: 1)
   * @returns Match result or null if no match
   */
  find(str: string, init = 1): PatternMatch | null {
    const startIdx = Math.max(0, init - 1);

    // Check for ^ anchor at start
    if (this.pattern.startsWith('^')) {
      if (startIdx !== 0) return null;
      const matcher = new LuaPatternMatcher(this.pattern.substring(1));
      const captures: (string | number)[] = [];
      const result = matcher.matchAt(str, 0, captures);
      if (result) {
        return { ...result, start: 1, captures };
      }
      return null;
    }

    // Try matching at each position
    for (let i = startIdx; i <= str.length; i++) {
      const captures: (string | number)[] = [];
      const result = this.matchAt(str, i, captures);
      if (result) {
        return result;
      }
    }

    return null;
  }

  /**
   * Match the pattern (like string.match)
   * Returns null if no match, or the match/captures
   */
  match(str: string, init = 1): PatternMatch | null {
    return this.find(str, init);
  }

  /**
   * Global substitution (like string.gsub)
   *
   * @param str The string to modify
   * @param repl Replacement string, function, or table
   * @param n Maximum number of replacements (optional)
   * @returns [result string, number of replacements]
   */
  gsub(
    str: string,
    repl: string | ((match: string, ...captures: (string | number)[]) => string) | Record<string, string>,
    n?: number
  ): [string, number] {
    let result = '';
    let count = 0;
    let pos = 0;

    // Handle anchored pattern
    const isAnchored = this.pattern.startsWith('^');
    const matcher = isAnchored
      ? new LuaPatternMatcher(this.pattern.substring(1))
      : this;

    while (pos <= str.length) {
      if (n !== undefined && count >= n) {
        result += str.substring(pos);
        break;
      }

      // Try to find a match starting from current position
      const findResult = isAnchored && pos > 0
        ? null
        : matcher.find(str, pos + 1); // find uses 1-based init

      if (findResult) {
        // Add text before match
        result += str.substring(pos, findResult.start - 1);

        // Calculate replacement
        let replacement: string;

        if (typeof repl === 'string') {
          // String replacement with capture references
          replacement = repl.replace(/%(\d)/g, (_, digit) => {
            const idx = parseInt(digit);
            if (idx === 0) return findResult.match;
            const cap = findResult.captures[idx - 1];
            return cap !== undefined ? String(cap) : '';
          });
          replacement = replacement.replace(/%%/g, '%');
        } else if (typeof repl === 'function') {
          // Function replacement
          if (findResult.captures.length > 0) {
            replacement = repl(findResult.match, ...findResult.captures) ?? findResult.match;
          } else {
            replacement = repl(findResult.match) ?? findResult.match;
          }
        } else {
          // Table replacement
          const key = findResult.captures.length > 0 ? String(findResult.captures[0]) : findResult.match;
          replacement = repl[key] ?? findResult.match;
        }

        result += replacement;
        count++;

        // Advance position to after the match
        pos = findResult.end;

        // Handle empty matches to prevent infinite loop
        if (findResult.start - 1 === findResult.end) {
          if (pos < str.length) {
            result += str[pos];
          }
          pos++;
        }
      } else {
        // No more matches - add remaining string and break
        result += str.substring(pos);
        break;
      }
    }

    return [result, count];
  }

  /**
   * Iterator for global match (like string.gmatch)
   */
  *gmatch(str: string): IterableIterator<PatternMatch> {
    let pos = 0;

    while (pos <= str.length) {
      const captures: (string | number)[] = [];
      const result = this.matchAt(str, pos, captures);

      if (result) {
        yield result;

        // Advance position
        pos = result.end;

        // Handle empty matches
        if (result.start - 1 === result.end) {
          pos++;
        }
      } else {
        pos++;
      }
    }
  }
}
