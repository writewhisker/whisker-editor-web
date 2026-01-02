# Editor Setup

Configure your code editor for the best Whisker development experience.

## VS Code (Recommended)

### Syntax Highlighting

Install the Whisker Language extension:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Whisker Language"
4. Click Install

### File Associations

Add to your `settings.json`:

```json
{
  "files.associations": {
    "*.ws": "whisker",
    "*.whisker": "whisker"
  }
}
```

### Snippets

Create custom snippets in `.vscode/whisker.code-snippets`:

```json
{
  "New Passage": {
    "prefix": "passage",
    "body": [
      ":: ${1:PassageName}",
      "${2:Content}",
      "",
      "+ [${3:Choice}] -> ${4:Target}"
    ],
    "description": "Create a new passage"
  },
  "Choice": {
    "prefix": "choice",
    "body": "+ [${1:Text}] -> ${2:Target}",
    "description": "Add a choice"
  },
  "Variable Set": {
    "prefix": "set",
    "body": "{do \\$${1:name} = ${2:value}}",
    "description": "Set a variable"
  },
  "Conditional": {
    "prefix": "if",
    "body": [
      "{\\$${1:condition}}",
      "${2:content}",
      "{/}"
    ],
    "description": "Conditional content"
  }
}
```

## Other Editors

### Sublime Text

1. Create `Whisker.sublime-syntax` in your Packages/User folder
2. Use the TextMate grammar from our [GitHub repository](https://github.com/writewhisker/whisker-vscode)

### Vim/Neovim

Add to your config:

```vim
" Whisker file type detection
autocmd BufNewFile,BufRead *.ws set filetype=whisker
autocmd BufNewFile,BufRead *.whisker set filetype=whisker
```

For syntax highlighting, see our [vim-whisker plugin](https://github.com/writewhisker/vim-whisker).

### Emacs

```elisp
(add-to-list 'auto-mode-alist '("\\.ws\\'" . whisker-mode))
(add-to-list 'auto-mode-alist '("\\.whisker\\'" . whisker-mode))
```

## Web Editor Features

The [web editor](https://whisker.dev) includes:

- **Live Preview**: See your story as you write
- **Validation**: Real-time error checking
- **Story Map**: Visual graph of your passages
- **Export**: One-click export to multiple formats
- **Cloud Save**: Auto-save to your account

## Development Environment

For contributing to Whisker itself:

```bash
# Clone the repository
git clone https://github.com/writewhisker/whisker-editor-web.git
cd whisker-editor-web

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test
```

## Next Steps

- [Quick Start](/getting-started/quick-start) - Write your first story
- [Tutorials](/tutorials/) - Learn Whisker step by step
