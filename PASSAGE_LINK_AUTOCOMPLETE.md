# Passage Link Autocomplete Feature

## Overview

The passage link autocomplete feature provides intelligent suggestions when typing `[[` in the passage editor, helping users quickly create links to other passages in their story.

## How It Works

### User Experience

1. **Trigger**: Type `[[` in the passage content textarea
2. **Dropdown Appears**: A dropdown menu shows all available passages
3. **Filter**: Continue typing to filter passages by name
4. **Navigate**: Use Arrow Up/Down keys to navigate suggestions
5. **Select**: Press Enter, Tab, or click to insert the passage link
6. **Cancel**: Press Escape to close the dropdown

### Features

- **Smart Filtering**: Passages are filtered as you type, with exact matches prioritized
- **Visual Feedback**:
  - Matching text is highlighted in yellow
  - Selected item is highlighted in blue
  - Shows passage metadata (tags, character count)
- **Keyboard Navigation**: Full keyboard support for accessibility
- **Position Awareness**: Dropdown appears near the cursor position
- **Limit Results**: Shows up to 10 passages to keep the UI manageable

## Implementation Details

### Components

#### PassageLinkAutocomplete.svelte
Location: `/src/lib/components/PassageLinkAutocomplete.svelte`

A reusable Svelte component that displays the autocomplete dropdown.

**Props:**
- `passages`: Array of Passage objects to show
- `query`: Current search query (text after `[[`)
- `position`: { top, left } coordinates for dropdown placement
- `visible`: Boolean to show/hide dropdown

**Events:**
- `select`: Fired when a passage is selected (includes `{ title: string }`)
- `close`: Fired when the dropdown should close

#### PropertiesPanel.svelte Integration
Location: `/src/lib/components/PropertiesPanel.svelte`

The autocomplete is integrated into the passage content textarea with:
- Detection of `[[` typing pattern
- Cursor position tracking
- Content replacement on selection
- Event handling for keyboard navigation

### Key Functions

```typescript
// Detects [[ pattern and shows autocomplete
function checkForAutocomplete(event: Event)

// Handles passage selection and inserts link
function handleAutocompleteSelect(event: CustomEvent<{ title: string }>)

// Handles closing the autocomplete
function handleAutocompleteClose()
```

### Link Syntax Support

The autocomplete supports the standard Twine-style link syntax:
- `[[Passage Title]]` - Simple link
- `[[Display Text->Passage Title]]` - Link with custom text (future enhancement)

## Testing

Tests are located in `/src/lib/components/PassageLinkAutocomplete.test.ts`

Run tests with:
```bash
npm run test:run -- src/lib/components/PassageLinkAutocomplete.test.ts
```

### Test Coverage
- Rendering and visibility
- Filtering and search
- Result limiting
- Metadata display
- Sorting by relevance
- Keyboard navigation (manual verification)

## Future Enhancements

Potential improvements:
1. Support for `[[text->target]]` syntax autocomplete
2. Preview of passage content on hover
3. Fuzzy search for better matching
4. Recent/frequently used passages prioritization
5. Integration with CodeMirror for richer text editing
6. Autocomplete for other syntax elements (variables, macros)

## Files Modified

- `/src/lib/components/PassageLinkAutocomplete.svelte` (new)
- `/src/lib/components/PassageLinkAutocomplete.test.ts` (new)
- `/src/lib/components/PropertiesPanel.svelte` (modified)

## Usage Example

The feature is automatically available when editing passage content in the Properties Panel. Simply:

1. Open any passage for editing
2. Click in the Content textarea
3. Type `[[`
4. Start typing a passage name
5. Select from the dropdown with Enter/Tab or click
