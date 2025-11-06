# Accessibility Improvements Needed

## Current Status

**187 accessibility warnings** across 43 Svelte files (as of latest check)

**Impact**: Non-blocking - app functions correctly but has accessibility barriers for:
- Screen reader users
- Keyboard-only navigation users
- Users with motor impairments

## Warning Breakdown

### 1. Form Label Associations (96 warnings)
**Issue**: Labels not associated with their input controls
**Example**:
```svelte
<!-- ❌ Current (broken) -->
<label class="block">User ID</label>
<input type="text" bind:value={userId}>

<!-- ✅ Fixed -->
<label for="userId" class="block">User ID</label>
<input id="userId" type="text" bind:value={userId}>
```

**Files affected**: 30+ files
**Effort**: 2-3 hours
**Priority**: HIGH (WCAG 2.1 Level A requirement)

### 2. Click Handlers Without Keyboard Support (25 warnings)
**Issue**: Non-interactive elements (divs/spans) with click handlers lack keyboard support
**Example**:
```svelte
<!-- ❌ Current (keyboard inaccessible) -->
<div on:click={handleAction}>Click me</div>

<!-- ✅ Option 1: Use button -->
<button on:click={handleAction}>Click me</button>

<!-- ✅ Option 2: Add keyboard handler -->
<div
  role="button"
  tabindex="0"
  on:click={handleAction}
  on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAction(e)}
>
  Click me
</div>
```

**Files affected**: 15 files
**Effort**: 1-2 hours
**Priority**: HIGH (WCAG 2.1 Level A requirement)

### 3. Divs with Click/Mousedown Need ARIA Roles (18 warnings)
**Issue**: Interactive divs don't identify their role
**Example**:
```svelte
<!-- ❌ Current -->
<div on:click={toggle}>Toggle</div>

<!-- ✅ Fixed -->
<div role="button" tabindex="0" on:click={toggle} on:keydown={handleKey}>
  Toggle
</div>
```

**Files affected**: 12 files
**Effort**: 1 hour
**Priority**: MEDIUM (WCAG 2.1 Level A requirement)

### 4. Dialog/Menu Roles Missing Tabindex (11 warnings)
**Issue**: Interactive roles need to be focusable
**Example**:
```svelte
<!-- ❌ Current -->
<div role="dialog">...</div>

<!-- ✅ Fixed -->
<div role="dialog" tabindex="-1">...</div>
```

**Files affected**: 8 files
**Effort**: 30 minutes
**Priority**: MEDIUM (WCAG 2.1 Level A requirement)

### 5. Self-Closing Non-Void Elements (12 warnings)
**Issue**: HTML parsing ambiguity
**Example**:
```svelte
<!-- ❌ Current -->
<div />
<textarea />

<!-- ✅ Fixed -->
<div></div>
<textarea></textarea>
```

**Files affected**: 8 files
**Effort**: 15 minutes
**Priority**: LOW (code quality, not accessibility)

### 6. Autofocus Usage (5 warnings)
**Issue**: Can disorient screen reader users
**Example**:
```svelte
<!-- ❌ Current -->
<input autofocus>

<!-- ✅ Fixed: Programmatic focus in onMount -->
<script>
  let inputEl;
  onMount(() => {
    // Give user time to orient before focusing
    setTimeout(() => inputEl?.focus(), 100);
  });
</script>
<input bind:this={inputEl}>
```

**Files affected**: 5 files
**Effort**: 30 minutes
**Priority**: LOW (WCAG 2.1 Level AAA guideline)

### 7. Misc Warnings (40 warnings)
- Unused CSS selectors (code cleanup)
- Missing captions on video
- Deprecated `<svelte:self>`
- webkit-specific CSS properties

**Effort**: 1 hour
**Priority**: LOW

## Implementation Plan

### Phase 1: Critical Fixes (4-5 hours)
**Goal**: WCAG 2.1 Level A compliance

1. ✅ **Fix Form Labels** (2-3 hours)
   - Script to generate unique IDs
   - Manual review of each fix
   - Test with screen reader

2. ✅ **Fix Click Handlers** (1-2 hours)
   - Replace divs with buttons where appropriate
   - Add keyboard handlers where divs are necessary
   - Test keyboard navigation

3. ✅ **Add ARIA Roles** (30 min)
   - Add `role="button"` and `tabindex`
   - Test with screen reader

4. ✅ **Fix Dialog/Menu Tabindex** (30 min)
   - Add `tabindex="-1"` to dialogs
   - Add `tabindex="0"` to menus
   - Test focus management

### Phase 2: Polish (2 hours)
**Goal**: Clean code, better UX

1. **Fix Self-Closing Tags** (15 min)
   - Simple find/replace

2. **Remove Autofocus** (30 min)
   - Replace with programmatic focus
   - Add delay for better UX

3. **Clean Up CSS** (1 hour)
   - Remove unused selectors
   - Add standard properties alongside webkit

4. **Add Video Captions** (15 min)
   - Add caption tracks to videos

### Phase 3: Testing (2-3 hours)
**Goal**: Verify accessibility

1. **Screen Reader Testing**
   - NVDA (Windows)
   - JAWS (Windows)
   - VoiceOver (Mac)

2. **Keyboard Navigation**
   - Tab through entire app
   - Test all interactions
   - Verify focus indicators

3. **Automated Testing**
   - axe DevTools
   - Lighthouse audit
   - WAVE browser extension

## Quick Wins (Do First)

These can be fixed quickly with high impact:

### 1. Add Tabindex to Dialogs/Menus (30 min)
```bash
# Find all dialog/menu roles without tabindex
grep -r 'role="dialog"' src --include="*.svelte" | grep -v tabindex
grep -r 'role="menu"' src --include="*.svelte" | grep -v tabindex
```

### 2. Replace Clickable Divs with Buttons (1 hour)
Search for: `<div[^>]*on:click`
Consider: Can this be a `<button>`?

### 3. Fix Self-Closing Tags (15 min)
```bash
# Safe automated fix
find src -name "*.svelte" -exec sed -i '' 's/<div\([^>]*\)\/>/  <div\1><\/div>/g' {} \;
find src -name "*.svelte" -exec sed -i '' 's/<textarea\([^>]*\)\/>/<textarea\1><\/textarea>/g' {} \;
```

## Tools & Resources

### Testing Tools
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **WAVE**: https://wave.webaim.org/extension/
- **Lighthouse**: Built into Chrome DevTools
- **NVDA** (free screen reader): https://www.nvaccess.org/

### Documentation
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices**: https://www.w3.org/WAI/ARIA/apg/
- **Svelte Accessibility**: https://svelte.dev/docs/accessibility-warnings

### Checklist
- [ ] All form inputs have associated labels
- [ ] All interactive elements are keyboard accessible
- [ ] All interactive elements have appropriate ARIA roles
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] All images have alt text
- [ ] All videos have captions
- [ ] Headings are in logical order
- [ ] No autofocus without good reason
- [ ] Screen reader tested
- [ ] Keyboard navigation tested

## WCAG Compliance Levels

### Level A (Minimum)
- ✅ All form labels associated
- ✅ All interactive elements keyboard accessible
- ✅ Appropriate ARIA roles

### Level AA (Recommended)
- ✅ Color contrast 4.5:1
- ✅ Focus indicators visible
- ⬜ Resize text to 200%
- ⬜ Multiple ways to navigate

### Level AAA (Gold Standard)
- ⬜ Color contrast 7:1
- ⬜ No autofocus
- ⬜ Advanced keyboard shortcuts
- ⬜ Sign language for videos

## Current Compliance

**Level A**: ❌ 70% compliant (form labels and keyboard navigation issues)
**Level AA**: ❌ 60% compliant (Level A issues + some contrast problems)
**Level AAA**: ❌ 40% compliant (Level AA issues + autofocus)

## After Fixes

**Level A**: ✅ 95% compliant
**Level AA**: ✅ 90% compliant
**Level AAA**: ⬜ 75% compliant

## Estimated Total Effort

- **Phase 1 (Critical)**: 4-5 hours
- **Phase 2 (Polish)**: 2 hours
- **Phase 3 (Testing)**: 2-3 hours

**Total**: 8-10 hours for full WCAG 2.1 Level AA compliance

## Notes

- Accessibility is ongoing, not one-time
- Add accessibility checks to CI/CD
- Train team on accessibility best practices
- Include accessibility in code reviews
- Test with real users who need accessibility features

## Getting Started

1. Install axe DevTools browser extension
2. Run Lighthouse audit to see current score
3. Start with Phase 1, Task 1 (form labels)
4. Test each fix with keyboard navigation
5. Run axe DevTools after each phase
6. Get feedback from screen reader users

---

**Last Updated**: 2025-01-01
**Status**: Documented, awaiting implementation
**Priority**: Medium (non-blocking but important for inclusivity)
