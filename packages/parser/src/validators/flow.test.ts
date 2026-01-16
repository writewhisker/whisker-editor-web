import { describe, it, expect } from 'vitest';
import {
  detectDeadEnds,
  detectBottlenecks,
  detectCycles,
  analyzeFlow,
  checkAccessibility,
} from './flow';
import { parse } from '../parser';
import { WLS_ERROR_CODES } from '../ast';

describe('Flow Analysis', () => {
  describe('Dead End Detection (WLS-FLW-001)', () => {
    it('should detect passage with no outgoing links', () => {
      const result = parse(`:: Start
+ [Go to middle] -> Middle

:: Middle
This passage has no choices`);
      expect(result.ast).not.toBeNull();

      const diagnostics = detectDeadEnds(result.ast!);
      const deadEnds = diagnostics.filter(d => d.code === WLS_ERROR_CODES.DEAD_END);
      expect(deadEnds.length).toBe(1);
      expect(deadEnds[0].passageId).toBe('Middle');
    });

    it('should not flag passage with END target', () => {
      const result = parse(`:: Start
+ [Finish] -> END`);
      expect(result.ast).not.toBeNull();

      const diagnostics = detectDeadEnds(result.ast!);
      expect(diagnostics.length).toBe(0);
    });

    it('should not flag passage with valid link', () => {
      const result = parse(`:: Start
+ [Continue] -> Other

:: Other
+ [End] -> END`);
      expect(result.ast).not.toBeNull();

      const diagnostics = detectDeadEnds(result.ast!);
      expect(diagnostics.length).toBe(0);
    });

    it('should not flag passage with BACK target', () => {
      const result = parse(`:: Start
+ [Go] -> Other

:: Other
+ [Go back] -> BACK`);
      expect(result.ast).not.toBeNull();

      const diagnostics = detectDeadEnds(result.ast!);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Cycle Detection (WLS-FLW-003)', () => {
    it('should detect simple cycle', () => {
      const result = parse(`:: Start
+ [Go to A] -> A

:: A
+ [Go to B] -> B

:: B
+ [Back to A] -> A`);
      expect(result.ast).not.toBeNull();

      const cycles = detectCycles(result.ast!);
      expect(cycles.length).toBeGreaterThan(0);
      // Should find cycle A -> B -> A
      const hasABCycle = cycles.some(c =>
        c.includes('A') && c.includes('B')
      );
      expect(hasABCycle).toBe(true);
    });

    it('should detect self-loop cycle', () => {
      const result = parse(`:: Start
+ [Loop] -> Start`);
      expect(result.ast).not.toBeNull();

      const cycles = detectCycles(result.ast!);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should not report cycles for linear story', () => {
      const result = parse(`:: Start
+ [Go] -> Middle

:: Middle
+ [Go] -> End

:: End
+ [Finish] -> END`);
      expect(result.ast).not.toBeNull();

      const cycles = detectCycles(result.ast!);
      expect(cycles.length).toBe(0);
    });
  });

  describe('Flow Metrics', () => {
    it('should count passages correctly', () => {
      const result = parse(`:: Start
+ [A] -> A
+ [B] -> B

:: A
+ [End] -> END

:: B
+ [End] -> END`);
      expect(result.ast).not.toBeNull();

      const analysis = analyzeFlow(result.ast!);
      expect(analysis.metrics.passageCount).toBe(3);
    });

    it('should count choices correctly', () => {
      const result = parse(`:: Start
+ [Option 1] -> A
+ [Option 2] -> B
+ [Option 3] -> C

:: A
+ [End] -> END

:: B
+ [End] -> END

:: C
+ [End] -> END`);
      expect(result.ast).not.toBeNull();

      const analysis = analyzeFlow(result.ast!);
      expect(analysis.metrics.choiceCount).toBe(6);
    });

    it('should calculate average branching', () => {
      const result = parse(`:: Start
+ [A] -> A
+ [B] -> B

:: A
+ [End] -> END

:: B
+ [End] -> END`);
      expect(result.ast).not.toBeNull();

      const analysis = analyzeFlow(result.ast!);
      // 4 choices / 3 passages = 1.33
      expect(analysis.metrics.avgBranching).toBeCloseTo(1.33, 1);
    });

    it('should count terminal targets', () => {
      const result = parse(`:: Start
+ [End 1] -> END
+ [End 2] -> END
+ [Continue] -> Other

:: Other
+ [End 3] -> END`);
      expect(result.ast).not.toBeNull();

      const analysis = analyzeFlow(result.ast!);
      expect(analysis.metrics.terminalCount).toBe(3);
    });

    it('should count loop-back targets', () => {
      const result = parse(`:: Start
+ [Go] -> Other

:: Other
+ [Back] -> BACK
+ [Restart] -> RESTART`);
      expect(result.ast).not.toBeNull();

      const analysis = analyzeFlow(result.ast!);
      expect(analysis.metrics.loopBackCount).toBe(2);
    });

    it('should calculate max depth', () => {
      const result = parse(`:: Start
+ [Go] -> Level1

:: Level1
+ [Go] -> Level2

:: Level2
+ [Go] -> Level3

:: Level3
+ [End] -> END`);
      expect(result.ast).not.toBeNull();

      const analysis = analyzeFlow(result.ast!);
      expect(analysis.metrics.maxDepth).toBe(3);
    });
  });

  describe('Bottleneck Detection (WLS-FLW-002)', () => {
    it('should detect bottleneck passage', () => {
      const result = parse(`:: Start
+ [Go] -> Hub

:: Hub
+ [A] -> A
+ [B] -> B
+ [C] -> C

:: A
+ [End] -> END

:: B
+ [End] -> END

:: C
+ [End] -> END`);
      expect(result.ast).not.toBeNull();

      const diagnostics = detectBottlenecks(result.ast!);
      const bottlenecks = diagnostics.filter(d => d.code === WLS_ERROR_CODES.BOTTLENECK);
      // Hub is a bottleneck - single entry to A, B, C
      expect(bottlenecks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Accessibility Checks', () => {
    it('should flag too many choices', () => {
      const result = parse(`:: Start
+ [1] -> END
+ [2] -> END
+ [3] -> END
+ [4] -> END
+ [5] -> END
+ [6] -> END
+ [7] -> END
+ [8] -> END`);
      expect(result.ast).not.toBeNull();

      const a11y = checkAccessibility(result.ast!);
      const tooManyChoices = a11y.diagnostics.filter(d =>
        d.message.includes('choices')
      );
      expect(tooManyChoices.length).toBe(1);
    });

    it('should not flag 7 or fewer choices', () => {
      const result = parse(`:: Start
+ [1] -> END
+ [2] -> END
+ [3] -> END
+ [4] -> END
+ [5] -> END
+ [6] -> END
+ [7] -> END`);
      expect(result.ast).not.toBeNull();

      const a11y = checkAccessibility(result.ast!);
      const tooManyChoices = a11y.diagnostics.filter(d =>
        d.message.includes('choices')
      );
      expect(tooManyChoices.length).toBe(0);
    });

    it('should return valid when no errors', () => {
      const result = parse(`:: Start
+ [Continue] -> END`);
      expect(result.ast).not.toBeNull();

      const a11y = checkAccessibility(result.ast!);
      expect(a11y.valid).toBe(true);
    });
  });

  describe('analyzeFlow integration', () => {
    it('should return complete analysis result', () => {
      const result = parse(`:: Start
+ [A] -> A
+ [B] -> B

:: A
+ [Back] -> Start

:: B
Content only`);
      expect(result.ast).not.toBeNull();

      const analysis = analyzeFlow(result.ast!);

      // Check metrics exist
      expect(analysis.metrics).toBeDefined();
      expect(analysis.metrics.passageCount).toBe(3);
      expect(analysis.metrics.choiceCount).toBe(3);

      // Check dead ends found
      expect(analysis.deadEnds).toContain('B');

      // Check cycles found (A -> Start -> A)
      expect(analysis.cycles.length).toBeGreaterThan(0);
    });
  });
});
