# Phase 5 Implementation Plan: Visual Connection Editing & Advanced Tagging

This document provides a detailed, step-by-step implementation plan for Phase 5.

## Overview

Phase 5 combines two major feature sets:
1. **Visual Connection Editing** - Drag-and-drop connection creation and editing
2. **Advanced Tagging** - Centralized tag management with colors and autocomplete

**Estimated Duration**: 2-3 weeks
**Dependencies**: Phase 2 (Basic UI), Phase 3 (Graph)
**Test Target**: 90+ tests total (15+ new tests)

---

## Part A: Visual Connection Editing (1-1.5 weeks)

### A1. Connection Creation via Drag & Drop

**Goal**: Enable users to create connections by dragging from source nodes

#### Tasks:
1. **Update PassageNode.svelte** to support connection handles
   - [x] Already has Handle components for top (target) and bottom (source)
   - [ ] Add multiple source handles (one per choice)
   - [ ] Style handles to be more visible and interactive
   - [ ] Add hover states and tooltips

2. **Implement onConnect handler in GraphView.svelte**
   - [ ] Add `on:connect` event handler to SvelteFlow
   - [ ] Create new Choice when connection is made
   - [ ] Update source passage's choices array
   - [ ] Trigger graph re-render
   - [ ] Add to undo/redo history

3. **Add connection validation**
   - [ ] Prevent self-connections (loop to same passage)
   - [ ] Prevent duplicate connections to same target
   - [ ] Show validation errors in UI
   - [ ] Highlight invalid connection attempts

4. **Visual feedback during connection creation**
   - [ ] Show preview line while dragging
   - [ ] Highlight valid target nodes
   - [ ] Dim invalid targets
   - [ ] Snap to valid connection points

**Files to Modify**:
- `src/lib/components/graph/PassageNode.svelte`
- `src/lib/components/GraphView.svelte`
- `src/lib/stores/projectStore.ts` (add connection actions)

**Tests to Add**:
- Connection creation via drag
- Validation of connections
- Undo/redo for connections

---

### A2. Connection Editing & Styling

**Goal**: Allow users to edit connection properties and visually distinguish types

#### Tasks:
1. **Create ConnectionEdge.svelte component**
   - [ ] Custom edge component for Svelte Flow
   - [ ] Display choice text as edge label
   - [ ] Add edit button on hover
   - [ ] Support click to select
   - [ ] Show delete button

2. **Add connection styling based on type**
   - [ ] Conditional connections: dashed line, orange color
   - [ ] Unconditional connections: solid line, blue color
   - [ ] Selected connections: highlighted, thicker
   - [ ] Animated flow for conditional connections

3. **Inline editing of choice text**
   - [ ] Double-click edge label to edit
   - [ ] Inline input field for choice text
   - [ ] Save on Enter, cancel on Escape
   - [ ] Update passage choice immediately

4. **Connection context menu**
   - [ ] Right-click on connection for menu
   - [ ] Edit choice text
   - [ ] Edit condition
   - [ ] Change target passage
   - [ ] Delete connection

**Files to Create**:
- `src/lib/components/graph/ConnectionEdge.svelte`

**Files to Modify**:
- `src/lib/components/GraphView.svelte` (register custom edge)
- `src/lib/components/PropertiesPanel.svelte` (add connection editing)

**Tests to Add**:
- Edge component rendering
- Inline text editing
- Connection styling
- Context menu operations

---

### A3. Connection Validation & Cleanup

**Goal**: Detect and fix connection issues automatically

#### Tasks:
1. **Create connection validator utility**
   - [ ] Function to detect orphaned connections (target doesn't exist)
   - [ ] Function to find dead-end passages (no outgoing connections)
   - [ ] Function to detect unreachable passages (no incoming connections)
   - [ ] Function to validate circular references

2. **Add visual indicators for connection issues**
   - [ ] Mark broken connections in red
   - [ ] Show warning icon on problematic passages
   - [ ] Display tooltip explaining the issue
   - [ ] Add notification bar for connection errors

3. **Auto-cleanup on passage deletion**
   - [ ] Remove all connections to deleted passage
   - [ ] Update source passages' choices
   - [ ] Show summary of cleaned connections
   - [ ] Add to undo history

**Files to Create**:
- `src/lib/utils/connectionValidator.ts`

**Files to Modify**:
- `src/lib/stores/projectStore.ts` (auto-cleanup on delete)
- `src/lib/components/GraphView.svelte` (show validation warnings)

**Tests to Add**:
- Connection validation functions
- Auto-cleanup on delete
- Visual warning indicators

---

## Part B: Advanced Tagging (1-1.5 weeks)

### B1. Tag Data Model & Store

**Goal**: Create centralized tag management system

#### Tasks:
1. **Create tagStore.ts**
   - [ ] Define Tag interface (name, color, description, usageCount)
   - [ ] Create tag registry (derived from all passage tags)
   - [ ] Add tag CRUD actions
   - [ ] Track tag usage across passages

2. **Define tag color palette**
   - [ ] Create 10-12 predefined colors
   - [ ] Map each tag to a color (hash-based or manual)
   - [ ] Ensure good contrast and accessibility
   - [ ] Support custom colors (optional)

3. **Add tag utilities**
   - [ ] Function to get all unique tags
   - [ ] Function to count tag usage
   - [ ] Function to rename tag globally
   - [ ] Function to merge tags
   - [ ] Function to delete tag globally

**Files to Create**:
- `src/lib/stores/tagStore.ts`
- `src/lib/utils/tagUtils.ts`
- `src/lib/stores/tagStore.test.ts`

**Tests to Add**:
- Tag registry creation
- Tag CRUD operations
- Tag usage counting
- Global rename/merge/delete

---

### B2. Tag Manager Component

**Goal**: Create centralized UI for managing tags

#### Tasks:
1. **Create TagManager.svelte component**
   - [ ] List all tags with usage counts
   - [ ] Show tag color indicators
   - [ ] Add search/filter for tags
   - [ ] Sort by name, usage, color
   - [ ] Inline rename functionality

2. **Tag editing features**
   - [ ] Click to rename tag
   - [ ] Color picker for tag colors
   - [ ] Delete tag with confirmation
   - [ ] Merge tags dialog
   - [ ] Bulk operations (select multiple)

3. **Usage tracking**
   - [ ] Show passages using each tag
   - [ ] Click tag to filter passages
   - [ ] Show tag statistics
   - [ ] Export tag report

**Files to Create**:
- `src/lib/components/TagManager.svelte`

**Files to Modify**:
- `src/App.svelte` (add tag manager panel option)

**Tests to Add**:
- Tag manager rendering
- Tag rename functionality
- Tag deletion with confirmation
- Tag merging

---

### B3. Improved Tag Input with Autocomplete

**Goal**: Better UX for adding tags to passages

#### Tasks:
1. **Create TagInput.svelte component**
   - [ ] Text input with autocomplete dropdown
   - [ ] Show existing tags as suggestions
   - [ ] Filter tags as user types
   - [ ] Highlight matching characters
   - [ ] Keyboard navigation (arrow keys, enter)

2. **Tag selection UI**
   - [ ] Dropdown shows all available tags
   - [ ] Display tag colors in dropdown
   - [ ] Show usage count next to each tag
   - [ ] "Create new tag" option
   - [ ] Quick add common tags

3. **Update PropertiesPanel.svelte**
   - [ ] Replace prompt() with TagInput component
   - [ ] Show tags with their assigned colors
   - [ ] Inline tag chips with color coding
   - [ ] Quick remove tags (click X)

**Files to Create**:
- `src/lib/components/TagInput.svelte`

**Files to Modify**:
- `src/lib/components/PropertiesPanel.svelte`
- `src/lib/components/PassageList.svelte` (show colored tags)
- `src/lib/components/graph/PassageNode.svelte` (show colored tags)

**Tests to Add**:
- TagInput autocomplete
- Tag suggestions filtering
- Keyboard navigation
- Color-coded tag display

---

### B4. Visual Tag Integration

**Goal**: Show tags with colors throughout the UI

#### Tasks:
1. **Update PassageList.svelte**
   - [ ] Show tag chips with colors
   - [ ] Limit visible tags (show +N more)
   - [ ] Add tag filter integration
   - [ ] Hover to see all tags

2. **Update PassageNode.svelte**
   - [ ] Display colored tag chips
   - [ ] Show max 3 tags with +N indicator
   - [ ] Make tags clickable to filter
   - [ ] Add tag colors to node styling (optional border color)

3. **Update SearchBar.svelte**
   - [ ] Show tag colors in filter dropdown
   - [ ] Display active tag filters with colors
   - [ ] Color-coded filter chips

**Files to Modify**:
- `src/lib/components/PassageList.svelte`
- `src/lib/components/graph/PassageNode.svelte`
- `src/lib/components/SearchBar.svelte`

**Tests to Add**:
- Colored tag rendering
- Tag visibility limits
- Tag filter integration

---

## Implementation Order

### Week 1: Connection Editing
```
Day 1-2:  A1 - Connection Creation via Drag & Drop
Day 3:    A2 - Connection Editing & Styling (Part 1: Component)
Day 4:    A2 - Connection Editing & Styling (Part 2: Menu & Inline Edit)
Day 5:    A3 - Connection Validation & Cleanup
```

### Week 2: Advanced Tagging
```
Day 1:    B1 - Tag Data Model & Store
Day 2:    B2 - Tag Manager Component (Part 1: Basic UI)
Day 3:    B2 - Tag Manager Component (Part 2: Advanced Features)
Day 4:    B3 - Tag Input with Autocomplete
Day 5:    B4 - Visual Tag Integration
```

### Week 3: Testing & Polish
```
Day 1:    Write comprehensive tests for Part A
Day 2:    Write comprehensive tests for Part B
Day 3:    Integration testing and bug fixes
Day 4:    Performance optimization
Day 5:    Documentation and PR preparation
```

---

## Success Criteria (from PHASE_RECONCILIATION.md)

- [ ] Can create connections by dragging from node ports
- [ ] Can edit choice text directly on connections
- [ ] Conditional connections are visually distinct
- [ ] Tag library shows all tags with usage counts
- [ ] Can rename tags globally
- [ ] Tag colors are applied consistently
- [ ] Tag autocomplete works when adding tags
- [ ] No orphaned connections after deletion

---

## Technical Decisions

### Connection Handling
- **Library**: Svelte Flow (already in use)
- **Connection Type**: Custom edge component
- **State**: Store connections in Passage.choices (existing model)
- **Validation**: Real-time during drag operation

### Tag System
- **Storage**: Tags remain as string[] on passages
- **Registry**: Derived store computing all unique tags
- **Colors**: Predefined palette with hash-based assignment
- **Persistence**: No additional storage needed (tags in passages)

### UI Framework
- **Components**: Svelte 5 with runes
- **Styling**: Tailwind CSS (existing)
- **Icons**: Unicode emojis + symbols (existing pattern)

---

## Testing Strategy

### Unit Tests (15+ new tests)
- Tag store operations (5 tests)
- Connection validation utilities (4 tests)
- Tag autocomplete logic (3 tests)
- Connection creation/editing (3 tests)

### Integration Tests
- End-to-end connection creation
- Tag management workflow
- Connection deletion cleanup
- Tag color application

### Manual Testing Checklist
- [ ] Drag connection from node to node
- [ ] Edit connection text inline
- [ ] Delete connection via context menu
- [ ] Create and rename tags
- [ ] Apply tag colors
- [ ] Use tag autocomplete
- [ ] Filter by tags
- [ ] Delete passage with connections

---

## Potential Challenges

### Challenge 1: Svelte Flow Connection Events
**Issue**: Need to intercept connection creation to create Choice objects
**Solution**: Use `onConnect` callback, create Choice, update state

### Challenge 2: Inline Edge Editing
**Issue**: Svelte Flow edges may not support inline editing easily
**Solution**: Custom edge component with contenteditable or modal

### Challenge 3: Tag Color Consistency
**Issue**: Need deterministic color assignment
**Solution**: Hash tag name to color index, allow manual override

### Challenge 4: Connection Validation Performance
**Issue**: Validating all connections may be slow for large graphs
**Solution**: Lazy validation, cache results, debounce checks

---

## Dependencies & Imports

No new dependencies required! All features can be built with:
- ✅ Svelte 5 (installed)
- ✅ Svelte Flow (installed)
- ✅ Tailwind CSS (installed)
- ✅ nanoid (installed)

---

## Next Steps After Phase 5

Once Phase 5 is complete, Phase 6 (Enhanced View Modes) becomes much more valuable because:
- Better connection editing → more need for view customization
- Tag management → need for tag-focused views
- Visual features → need for focus mode

The foundation laid in Phase 5 enables:
- Tag-based view filtering
- Connection-focused navigation
- Color-coded passage organization
