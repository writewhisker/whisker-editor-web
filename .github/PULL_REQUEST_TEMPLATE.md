## Description
**Please include a summary of the changes and the related issue.**

Fixes # (issue number)

## Type of Change
**Please delete options that are not relevant.**

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] UI/UX improvement
- [ ] Performance improvement
- [ ] Code refactoring
- [ ] Documentation update
- [ ] Build/CI changes
- [ ] Tests

## Phase
**Which editor development phase does this PR relate to?**

- [ ] Phase 1 (Core data models)
- [ ] Phase 2 (Basic UI components)
- [ ] Phase 3 (Visual node graph)
- [ ] Phase 4 (Search & filtering)
- [ ] Phase 5 (Advanced tagging)
- [ ] Phase 6 (Variable management)
- [ ] Phase 7 (Testing & validation)
- [ ] Phase 8 (Export)
- [ ] Phase 9 (Theming)
- [ ] Phase 10 (Polish)
- [ ] Infrastructure/General

## Component
**Which component(s) does this PR affect?**

- [ ] Data Models (Passage, Story, Choice, etc.)
- [ ] Stores (State management)
- [ ] Graph View (Node visualization)
- [ ] List View (Passage list)
- [ ] Passage Editor
- [ ] UI Components (shared)
- [ ] Utilities
- [ ] Styling (Tailwind/CSS)
- [ ] Build Configuration
- [ ] Tests
- [ ] Documentation

## Changes Made
**List the main changes:**

1.
2.
3.

## Testing
**Describe the tests you ran and provide instructions to reproduce.**

### Test Configuration
- Node Version: [e.g., 20.10.0]
- Browser(s): [e.g., Chrome 120, Firefox 121]
- OS: [e.g., macOS 14, Ubuntu 22.04]

### Test Cases
- [ ] Unit tests pass (`npm run test:run`)
- [ ] Type checking passes (`npm run check`)
- [ ] Build succeeds (`npm run build`)
- [ ] Dev server works (`npm run dev`)
- [ ] Manual UI testing completed
- [ ] Cross-browser testing (if UI changes)
- [ ] Accessibility testing (if UI changes)

### How to Test
```bash
# Install dependencies
npm install

# Run tests
npm run test:run

# Type check
npm run check

# Build
npm run build

# Start dev server
npm run dev
```

### Manual Testing Steps
1. Open http://localhost:5173
2. [Specific steps to test the feature]
3. Verify [expected outcome]

## Screenshots/Video
**For UI changes, please provide before/after screenshots or a short video:**

### Before
[Screenshot or description]

### After
[Screenshot or description]

## Breaking Changes
**Does this PR introduce any breaking changes?**

- [ ] No breaking changes
- [ ] Yes, breaking changes (describe below)

**If yes, describe the breaking changes:**

**Data migration needed:**
- [ ] No data migration needed
- [ ] Yes, story files need migration (describe below)

## Performance Impact
**Does this change affect performance?**

- [ ] No performance impact
- [ ] Performance improvement (measurements below)
- [ ] Minor performance regression (justified below)
- [ ] Significant performance regression (requires discussion)

**Performance measurements (if applicable):**
```
Before: [load time, render time, memory usage]
After:  [load time, render time, memory usage]
```

## Accessibility
**For UI changes, have you considered accessibility?**

- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] ARIA labels added where needed
- [ ] No accessibility impact (non-UI change)

## Browser Compatibility
**For UI/feature changes, tested in:**

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (if applicable)

## Documentation
**Have you updated the documentation?**

- [ ] Documentation updated (in this PR)
- [ ] Documentation not needed
- [ ] Documentation will be added in separate PR (link: )

**Updated documentation:**
- [ ] README.md
- [ ] Inline code comments
- [ ] User guide (if applicable)
- [ ] API documentation
- [ ] CHANGELOG.md

## Checklist
**Before submitting, ensure you have:**

- [ ] Read the CONTRIBUTING.md guidelines
- [ ] Self-reviewed my own code
- [ ] Commented code, particularly in hard-to-understand areas
- [ ] Made corresponding changes to documentation
- [ ] Added tests that prove my fix is effective or that my feature works
- [ ] New and existing tests pass locally (`npm run test:run`)
- [ ] Type checking passes (`npm run check`)
- [ ] Build succeeds (`npm run build`)
- [ ] Any dependent changes have been merged and published
- [ ] Checked that changes don't break backward compatibility
- [ ] Tested in multiple browsers (for UI changes)
- [ ] Updated CHANGELOG.md (if applicable)

## Additional Notes
**Any additional information for reviewers:**

## Related PRs/Issues
**Link to related pull requests or issues:**

- Related to #
- Depends on #
- Blocks #

## Deployment Notes
**Any special deployment considerations?**

- [ ] No special deployment needs
- [ ] Requires environment variable changes
- [ ] Requires build configuration changes
- [ ] May affect GitHub Pages deployment

## License Acknowledgment
By submitting this pull request, I confirm that my contribution is made under the terms of the AGPLv3 License and complies with Section 13 (network use disclosure requirements).

---

## For Maintainers
**Reviewer checklist:**
- [ ] Code quality is acceptable
- [ ] Tests are comprehensive
- [ ] UI/UX is polished (if applicable)
- [ ] Accessibility considerations addressed
- [ ] Documentation is adequate
- [ ] Breaking changes are justified and documented
- [ ] Performance impact is acceptable
- [ ] Browser compatibility verified
- [ ] Security implications considered
