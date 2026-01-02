# Lua API

Auto-generated API documentation for whisker-core.

::: tip
This documentation is generated from source code using LDoc.
Run `ldoc .` in the whisker-core directory to regenerate.
:::

## Modules

### whisker.parser

Parse WLS source code.

```lua
local parser = require("whisker.parser")

local story = parser.parse([[
:: Start
Hello world!
]])
```

### whisker.runtime

Story execution runtime.

```lua
local runtime = require("whisker.runtime")

local player = runtime.Player.new(story)
player:start()
player:select_choice(1)
```

### whisker.validators

Validate stories with WLS error codes.

```lua
local validators = require("whisker.validators")

local errors = validators.validate(story)
for _, err in ipairs(errors) do
    print(err.code, err.message)
end
```

### whisker.format

Import from other formats.

```lua
local format = require("whisker.format")

local story = format.import_twine(html_content)
local story = format.import_ink(ink_source)
```

### whisker.export

Export to various formats.

```lua
local export = require("whisker.export")

local html = export.to_html(story, options)
local epub = export.to_epub(story, options)
```

## Error Codes

All validators use unified WLS error codes:

```lua
local error_codes = require("whisker.validators.error_codes")

-- Access error definitions
local err = error_codes.WLS_ERROR_CODES['WLS-STR-001']
print(err.name)     -- "missing_start_passage"
print(err.severity) -- "error"
print(err.message)  -- "No start passage defined"
```

## Full API Reference

See the generated documentation in the whisker-core repository for complete API details.
