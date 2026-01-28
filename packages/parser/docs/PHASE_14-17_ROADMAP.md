# WLS Compliance Remediation Roadmap

## Overview

Based on Phase 13 compliance testing, the following gaps were identified in the parser implementation. These phases address each category of failures systematically.

**Current Compliance Rate:** ~31% (13/42 tests passing)
**Target Compliance Rate:** 95%+ (Gold certification)

---

## Phase 14: Choice System Completeness (WLS Chapter 6)

**Goal:** Achieve 100% compliance for all choice-related syntax

### Stage 14A: Sticky Choice Recognition
**Issue:** Sticky choices (`*`) not being parsed correctly; only `+` choices work.

**Failing Tests:**
- `test_005_sticky_choice` - Choice count mismatch
- `test_006_mixed_choices` - Only 1 of 2 choices parsed
- `test_005_sticky_vs_once` - Sticky choice not recognized

**Implementation:**
1. Update lexer to recognize `*` at line start as `STICKY_CHOICE_MARKER`
2. Distinguish from italic marker (context-sensitive lexing)
3. Update parser to handle both `+` (once-only) and `*` (sticky) choices
4. Add `sticky: boolean` property to ChoiceNode AST

**Acceptance Criteria:**
- [ ] `* [text] -> target` parses as sticky choice
- [ ] Mixed `+` and `*` choices in same passage work
- [ ] Sticky property correctly set in AST

### Stage 14B: Conditional Choices
**Issue:** `{if condition}` before choice markers not parsed.

**Failing Tests:**
- `test_003_conditional_choice`
- `test_004_hidden_conditional_choice`
- `test_009_fallback_choice`

**Implementation:**
1. Allow `{if expr}` / `{else}` before choice markers
2. Add `condition` property to ChoiceNode
3. Handle `{else}` as special fallback condition
4. Evaluate conditions for `availableChoices` output

**Acceptance Criteria:**
- [ ] `+ {if hasKey}[Use key]` parses with condition
- [ ] `+ {else}[Fallback]` parses as fallback choice
- [ ] Conditions correctly filter available choices

### Stage 14C: Labeled Choices
**Issue:** `(label)` syntax before choice text not recognized.

**Failing Tests:**
- `test_010_labeled_choice`

**Implementation:**
1. Add grammar rule for `(identifier)` before choice text
2. Add `label` property to ChoiceNode
3. Enable label references in diverts (`-> passage.label`)

**Acceptance Criteria:**
- [ ] `+ (door_red) [Red door]` parses with label
- [ ] Labels are unique within passage
- [ ] Labels can be referenced in diverts

### Stage 14D: Choice Consequences
**Issue:** Inline operations after choice text not parsed.

**Failing Tests:**
- `test_006_choice_with_consequence`

**Implementation:**
1. Parse `{operation}` after `[text]` but before `->` or content
2. Add `operations` array to ChoiceNode
3. Execute operations when choice is selected

**Acceptance Criteria:**
- [ ] `+ [Buy]{gold -= 50} -> Shop` parses with operation
- [ ] Multiple operations supported
- [ ] Operations execute on choice selection

---

## Phase 15: Control Flow Statements (WLS Chapter 5)

**Goal:** Implement all conditional and control flow constructs

### Stage 15A: If/Else Blocks
**Issue:** `{if}`, `{else}`, `{/if}` blocks cause parse failures.

**Failing Tests:**
- `test_001_if_true`, `test_002_if_false`
- `test_003_if_else`
- `test_005_nested_if`

**Implementation:**
1. Add `IF_OPEN`, `ELSE`, `ELSEIF`, `IF_CLOSE` tokens
2. Create `ConditionalBlockNode` AST node type
3. Parse nested content within conditional blocks
4. Handle nested if/else structures

**Acceptance Criteria:**
- [ ] `{if condition}content{/if}` parses correctly
- [ ] `{if}{else}{/if}` structure works
- [ ] Nested `{if}` blocks supported

### Stage 15B: Elseif Chains
**Issue:** `{elseif condition}` not recognized.

**Failing Tests:**
- `test_004_if_elseif`

**Implementation:**
1. Add `ELSEIF` token type
2. Update ConditionalBlockNode for elseif chains
3. Evaluate conditions in order

**Acceptance Criteria:**
- [ ] `{if}{elseif}{elseif}{else}{/if}` parses
- [ ] Multiple elseif branches supported
- [ ] First true condition wins

### Stage 15C: Comparison Operators
**Issue:** Operators in conditions not fully supported.

**Failing Tests:**
- `test_006_comparison_operators`

**Implementation:**
1. Ensure `==`, `!=`, `>`, `<`, `>=`, `<=` parse in expressions
2. Add operator precedence rules
3. Support parenthesized expressions

**Acceptance Criteria:**
- [ ] All comparison operators work in `{if}`
- [ ] Operator precedence correct
- [ ] Parentheses override precedence

### Stage 15D: Logical Operators
**Issue:** `&&`, `||`, `!` not working in conditions.

**Failing Tests:**
- `test_007_logical_and`
- `test_008_logical_or`
- `test_009_logical_not`

**Implementation:**
1. Add `AND`, `OR`, `NOT` token handling
2. Implement short-circuit evaluation
3. Handle operator precedence (NOT > AND > OR)

**Acceptance Criteria:**
- [ ] `{if a && b}` works
- [ ] `{if a || b}` works
- [ ] `{if !a}` works
- [ ] Complex expressions like `{if a && (b || c)}` work

### Stage 15E: Switch Statements
**Issue:** `{switch}`, `{case}`, `{default}` not implemented.

**Failing Tests:**
- `test_010_switch_statement`

**Implementation:**
1. Add `SWITCH`, `CASE`, `DEFAULT` tokens
2. Create `SwitchBlockNode` AST node
3. Match expression against case values
4. Support default fallback

**Acceptance Criteria:**
- [ ] `{switch expr}{case val}...{default}...{/switch}` parses
- [ ] String and number case values supported
- [ ] Default case works

---

## Phase 16: Variable Operations (WLS Chapter 4)

**Goal:** Complete variable operation support

### Stage 16A: Decrement Operator
**Issue:** `{var--}` not parsing correctly.

**Failing Tests:**
- `test_005_decrement`

**Implementation:**
1. Ensure `--` tokenized as `DECREMENT`
2. Handle postfix decrement in expressions
3. Update variable value correctly

**Acceptance Criteria:**
- [ ] `{count--}` decrements count
- [ ] Works in expressions and standalone

### Stage 16B: Temporary Variables
**Issue:** `{temp varName = value}` not recognized.

**Failing Tests:**
- `test_010_temporary_variable`

**Implementation:**
1. Add `TEMP` keyword token
2. Mark variable scope as 'temp' in AST
3. Temporary variables scoped to passage

**Acceptance Criteria:**
- [ ] `{temp _local = 42}` creates temporary variable
- [ ] Temporary variables not persisted
- [ ] Underscore prefix convention supported

---

## Phase 17: Advanced Features (WLS Chapters 7, 12)

**Goal:** Implement remaining advanced language features

### Stage 17A: External Function Calls
**Issue:** `{EXTERNAL func()}` syntax not parsed.

**Failing Tests:**
- `test_004_external_function`

**Implementation:**
1. Add `EXTERNAL` keyword token
2. Parse external function call syntax
3. Create `ExternalCallNode` AST node
4. Integrate with runtime external function registry

**Acceptance Criteria:**
- [ ] `{EXTERNAL playSound("click")}` parses
- [ ] Arguments passed correctly
- [ ] Return values captured

### Stage 17B: Function Definitions
**Issue:** `=== function name(params)` syntax not recognized.

**Failing Tests:**
- `test_005_function_definition`

**Implementation:**
1. Add `FUNCTION_DEF` token for `===`
2. Parse parameter list
3. Parse function body with `{return}`
4. Add `FunctionDefinitionNode` to AST

**Acceptance Criteria:**
- [ ] `=== function double(x) {return x * 2}` parses
- [ ] Multiple parameters supported
- [ ] Functions callable from expressions

### Stage 17C: Sequences and Cycles
**Issue:** `{sequence}`, `{cycle}`, `{shuffle}` blocks not implemented.

**Related Tests (need to be added):**
- Sequence iteration
- Cycle looping
- Shuffle randomization

**Implementation:**
1. Add `SEQUENCE`, `CYCLE`, `SHUFFLE` tokens
2. Create `SequenceBlockNode` AST node
3. Track iteration state per sequence
4. Implement each behavior:
   - Sequence: iterate once through items
   - Cycle: loop through items repeatedly
   - Shuffle: random order through items

**Acceptance Criteria:**
- [ ] `{sequence}A|B|C{/sequence}` shows A, then B, then C
- [ ] `{cycle}A|B{/cycle}` loops A, B, A, B...
- [ ] `{shuffle}A|B|C{/shuffle}` randomizes order

---

## Implementation Priority

| Phase | Priority | Estimated Complexity | Impact on Compliance |
|-------|----------|---------------------|---------------------|
| 14A: Sticky Choices | HIGH | Low | +3 tests |
| 14B: Conditional Choices | HIGH | Medium | +3 tests |
| 15A: If/Else Blocks | HIGH | Medium | +3 tests |
| 15D: Logical Operators | HIGH | Low | +3 tests |
| 16A: Decrement | MEDIUM | Low | +1 test |
| 14C: Labeled Choices | MEDIUM | Low | +1 test |
| 14D: Choice Consequences | MEDIUM | Medium | +1 test |
| 15B: Elseif Chains | MEDIUM | Low | +1 test |
| 15C: Comparison Operators | MEDIUM | Low | +1 test |
| 15E: Switch Statements | MEDIUM | Medium | +1 test |
| 16B: Temporary Variables | LOW | Low | +1 test |
| 17A: External Functions | LOW | Medium | +1 test |
| 17B: Function Definitions | LOW | High | +1 test |
| 17C: Sequences/Cycles | LOW | Medium | +0 tests (new) |

---

## Success Metrics

After completing all phases:

| Metric | Current | Target |
|--------|---------|--------|
| Total Tests | 42 | 50+ |
| Passing Tests | 13 | 47+ |
| Pass Rate | 31% | 95%+ |
| Certification Level | None | Gold |

---

## References

- WLS Chapter 5: Control Flow
- WLS Chapter 6: Choices and Branching
- WLS Chapter 4: Variables and State
- WLS Chapter 7: Runtime API
- WLS Chapter 12: Modules and Organization
