# Manual Test Scenarios

This document provides comprehensive manual test scenarios for the Whisker Interactive Fiction Editor. These tests should be performed before each release to ensure quality.

## Template Selection Dialog

### Scenario 1: Opening the Dialog
**Steps:**
1. Launch the application
2. Create a new story or open an existing one
3. Click the "Add Passage" button (or press Ctrl/Cmd+P)

**Expected:**
- Template selection dialog appears
- Dialog is centered on screen
- Backdrop dims the background
- Focus is trapped within the dialog

### Scenario 2: Viewing Templates
**Steps:**
1. Open the template selection dialog
2. Observe all template options

**Expected:**
- 6 template options are visible:
  - 📄 Blank Passage
  - 🔀 Choice Passage
  - 💬 Conversation
  - 🏞️ Description
  - 🏁 Checkpoint
  - 🎬 Ending
- Each template shows:
  - Icon
  - Title
  - Description
  - Content preview

### Scenario 3: Selecting a Template
**Steps:**
1. Open the template selection dialog
2. Click on "Choice Passage" template
3. Observe the new passage

**Expected:**
- Dialog closes
- New passage is created
- Passage title is "Choice Passage"
- Passage content contains:
  ```
  What do you do?

  [[Option 1]]
  [[Option 2]]
  [[Option 3]]
  ```

### Scenario 4: Canceling Template Selection
**Steps:**
1. Open the template selection dialog
2. Click the "Cancel" button

**Expected:**
- Dialog closes
- No new passage is created

### Scenario 5: Keyboard Navigation
**Steps:**
1. Open the template selection dialog
2. Press Tab to navigate between templates
3. Press Escape

**Expected:**
- Tab moves focus between template buttons
- Escape closes the dialog without creating a passage

### Scenario 6: Backdrop Click
**Steps:**
1. Open the template selection dialog
2. Click on the dimmed background (outside the dialog)

**Expected:**
- Dialog closes
- No new passage is created

### Scenario 7: Template Content Verification
**Steps:**
1. Test each template by selecting it
2. Verify the content matches the template

**Expected:**
- **Blank**: Empty content
- **Choice**: "What do you do?" with 3 options
- **Conversation**: NPC dialog with responses
- **Description**: Scene description with Continue link
- **Checkpoint**: Variable setting with chapter marker
- **Ending**: "THE END" with restart link

## Export & Publishing (Phase 9)

### Scenario 8: JSON Export
**Steps:**
1. Create a story with 3-5 passages
2. Open Export Panel
3. Select JSON format
4. Click Export

**Expected:**
- File download prompt appears
- Downloaded file is valid JSON
- File contains all story data (passages, metadata, variables)
- File can be re-imported without data loss

### Scenario 9: HTML Export
**Steps:**
1. Create a story with multiple passages and choices
2. Export as HTML
3. Open the exported HTML file in a browser

**Expected:**
- Story plays correctly in browser
- Player embedded and functional
- Passage navigation works
- Choice links work
- Variables are tracked correctly

### Scenario 10: Markdown Export
**Steps:**
1. Create a story with rich text formatting
2. Export as Markdown
3. Open the exported file in a text editor

**Expected:**
- All passages exported
- Markdown formatting preserved
- Links converted to Markdown syntax
- File is human-readable

### Scenario 11: Import JSON
**Steps:**
1. Export a story as JSON
2. Create a new story
3. Import the JSON file

**Expected:**
- Story loads completely
- All passages present
- Metadata preserved
- Variables restored
- Story graph matches original

## GitHub Integration (Phase 3)

### Scenario 12: GitHub Authentication
**Steps:**
1. Click GitHub sync button
2. Complete OAuth flow
3. Return to editor

**Expected:**
- User is authenticated
- User avatar/name displayed
- Repository picker becomes available

### Scenario 13: Save to GitHub
**Steps:**
1. Authenticate with GitHub
2. Create or modify a story
3. Click "Save to GitHub"
4. Select or create a repository
5. Enter file name and commit message

**Expected:**
- File is saved to GitHub
- Commit appears in repository
- Sync status shows "synced"

### Scenario 14: Load from GitHub
**Steps:**
1. Authenticate with GitHub
2. Click "Load from GitHub"
3. Select a repository and file

**Expected:**
- Story loads correctly
- All data preserved
- Editor updates with story content

### Scenario 15: Sync Conflict Resolution
**Steps:**
1. Load a story from GitHub
2. Modify it locally
3. Modify it on GitHub (different changes)
4. Attempt to sync

**Expected:**
- Conflict detected
- Conflict resolution dialog appears
- Both versions shown side-by-side
- User can choose which to keep

### Scenario 16: Background Sync
**Steps:**
1. Make changes to a GitHub-synced story
2. Wait for auto-sync (or trigger manually)
3. Check GitHub repository

**Expected:**
- Changes automatically synced
- Sync status indicator updates
- Commit created on GitHub

## Graph View & Visual Editing (Phase 5)

### Scenario 17: Visual Connection Editing
**Steps:**
1. Open a story in Graph View
2. Drag from one passage to create a connection
3. Drop on another passage

**Expected:**
- Connection line appears
- Link created in source passage
- Connection reflects passage relationship

### Scenario 18: Tag Management
**Steps:**
1. Select a passage
2. Add tags using the tag manager
3. Filter passages by tag

**Expected:**
- Tags added to passage
- Tagged passages highlighted in graph
- Filter shows only tagged passages

### Scenario 19: Variable Manager
**Steps:**
1. Open Variable Manager
2. Add a new variable
3. Use the variable in a passage

**Expected:**
- Variable appears in list
- Variable available for passage content
- Variable tracked during playback

## Validation (Phase 4)

### Scenario 20: Dead Link Detection
**Steps:**
1. Create a passage with a link to non-existent passage
2. Run validation

**Expected:**
- Dead link error reported
- Problem highlighted in list
- Quick-fix option available

### Scenario 21: Unreachable Passages
**Steps:**
1. Create passages not connected to start
2. Run validation

**Expected:**
- Unreachable passages identified
- List shows orphaned passages
- Suggestions provided

### Scenario 22: Variable Validation
**Steps:**
1. Use an undefined variable in a passage
2. Run validation

**Expected:**
- Undefined variable warning
- Variable name highlighted
- Suggestion to define variable

## Story Playback (Phase 6)

### Scenario 23: Basic Story Playback
**Steps:**
1. Create a simple linear story
2. Click Preview
3. Navigate through the story

**Expected:**
- Preview panel opens
- Story starts at beginning
- Passage text displayed correctly
- Links work as expected

### Scenario 24: Choice Handling
**Steps:**
1. Create story with branching choices
2. Preview and select different choices
3. Verify different paths

**Expected:**
- All choices clickable
- Correct passages displayed based on choice
- Story branches correctly

### Scenario 25: Variable Testing
**Steps:**
1. Create story with variables
2. Use variables in conditionals
3. Preview and test different paths

**Expected:**
- Variables set correctly
- Conditionals evaluated properly
- Story responds to variable values

## Auto-Save & Recovery (Phase 2)

### Scenario 26: Auto-Save
**Steps:**
1. Create/edit a story
2. Make changes
3. Wait for auto-save indicator

**Expected:**
- Auto-save indicator shows "saving..."
- Then shows "saved"
- Changes persist after page reload

### Scenario 27: Recovery After Crash
**Steps:**
1. Make changes to a story
2. Force-close the browser/tab
3. Reopen the editor

**Expected:**
- Recovery prompt appears
- Unsaved changes shown
- Option to restore or discard

## Accessibility

### Scenario 28: Keyboard Navigation
**Steps:**
1. Use only keyboard to:
   - Create a new story
   - Add passages
   - Edit content
   - Save the story

**Expected:**
- All features accessible via keyboard
- Tab order is logical
- Focus indicators visible
- Shortcuts work as documented

### Scenario 29: Screen Reader
**Steps:**
1. Enable screen reader
2. Navigate through the interface
3. Create and edit a passage

**Expected:**
- All elements properly labeled
- Actions announced clearly
- Forms accessible
- Dialog roles correct

## Mobile Responsiveness

### Scenario 30: Mobile Layout
**Steps:**
1. Open editor on mobile device or resize to mobile viewport
2. Navigate interface
3. Try to create/edit a passage

**Expected:**
- Layout adapts to mobile
- Touch targets are adequate size
- All features accessible (or gracefully disabled)
- No horizontal scrolling required

## Performance

### Scenario 31: Large Story Handling
**Steps:**
1. Create or load a story with 100+ passages
2. Navigate graph view
3. Edit passages
4. Run validation

**Expected:**
- Interface remains responsive
- Graph renders without lag
- Editing is smooth
- Validation completes in reasonable time

### Scenario 32: File Operations
**Steps:**
1. Export a large story
2. Import a large story
3. Save to GitHub

**Expected:**
- Operations complete without timeout
- Progress indicators shown
- No data loss
- Error handling for large files

## Cross-Browser Testing

### Scenario 33: Browser Compatibility
**Browsers to test:** Chrome, Firefox, Safari, Edge

**Steps:**
1. Open editor in each browser
2. Test core features:
   - Create story
   - Add passages
   - Graph view
   - Export
   - Import

**Expected:**
- Consistent behavior across browsers
- No layout issues
- All features functional

## Regression Tests

### Scenario 34: Previously Fixed Bugs
**Steps:**
1. Review GitHub issues marked as "fixed"
2. Test each fix to ensure it still works

**Expected:**
- All fixes remain intact
- No regressions introduced

## Notes

- **Test Environment:** Always test in a clean browser profile or incognito mode
- **Data Backup:** Backup test stories before testing destructive operations
- **Bug Reporting:** Document any issues with screenshots and steps to reproduce
- **Version:** Update this document when new features are added

## Test Checklist Summary

Before each release, verify:

- [ ] Template Selection Dialog (Scenarios 1-7)
- [ ] Export & Publishing (Scenarios 8-11)
- [ ] GitHub Integration (Scenarios 12-16)
- [ ] Graph View & Visual Editing (Scenarios 17-19)
- [ ] Validation (Scenarios 20-22)
- [ ] Story Playback (Scenarios 23-25)
- [ ] Auto-Save & Recovery (Scenarios 26-27)
- [ ] Accessibility (Scenarios 28-29)
- [ ] Mobile Responsiveness (Scenario 30)
- [ ] Performance (Scenarios 31-32)
- [ ] Cross-Browser Testing (Scenario 33)
- [ ] Regression Tests (Scenario 34)

---

**Last Updated:** 2025-01-30
**Version:** 1.0
**Maintained By:** Claude Code
