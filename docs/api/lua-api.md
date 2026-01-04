# Lua API Reference

Complete API reference for the whisker-core Lua implementation.

## whisker.parser

Parse WLS source code.

### parse(source)

```lua
local parser = require("whisker.parser")

local source = [[
:: Start
Welcome to my story!
* [Begin] -> Chapter1

:: Chapter1
The adventure begins...
]]

local result = parser.parse(source)

if result.errors and #result.errors > 0 then
    for _, err in ipairs(result.errors) do
        print(string.format("%s: %s at line %d", err.code, err.message, err.line))
    end
else
    print("Passages:", #result.ast.passages)
end
```

### Result Structure

```lua
-- result.ast
{
    passages = {
        {
            id = "start",
            title = "Start",
            content = { ... },  -- Content blocks
            choices = { ... },  -- Choice nodes
            tags = { ... },     -- Tag strings
            metadata = { ... }  -- Key-value metadata
        }
    },
    globals = { ... },  -- Global declarations
    metadata = { ... }  -- Story metadata
}

-- result.errors
{
    {
        code = "WLS-SYN-001",
        message = "Unexpected token",
        line = 5,
        column = 10,
        severity = "error"
    }
}
```

---

## whisker.runtime

Story execution runtime.

### Story.new(ast)

Create a story from parsed AST:

```lua
local Story = require("whisker.runtime.story")
local parser = require("whisker.parser")

local result = parser.parse(source)
local story = Story.new(result.ast)
```

### GameState

```lua
local GameState = require("whisker.runtime.game_state")

local state = GameState.new()

-- Set and get current passage
state:set_current_passage("chapter1")
local current = state:get_current_passage()

-- Variable management
state:set("player_name", "Hero")
state:set("health", 100)

local name = state:get("player_name")  -- "Hero"
local hp = state:get("health")         -- 100

-- Get all variables
local all = state:get_all_variables()
for name, value in pairs(all) do
    print(name, value)
end

-- Visit tracking
state:increment_visit("chapter1")
local visits = state:get_visits("chapter1")  -- 1

-- Serialization
local saved = state:serialize()
-- { current_passage = "chapter1", variables = {...}, visits = {...} }

state:deserialize(saved)
```

### Engine

```lua
local Engine = require("whisker.runtime.engine")
local GameState = require("whisker.runtime.game_state")

local engine = Engine.new(story)
local state = GameState.new()

-- Start the story
engine:start(state)

-- Get current passage
local passage = engine:get_current_passage(state)
print(passage.title)

-- Get available choices
local choices = engine:get_available_choices(state)
for i, choice in ipairs(choices) do
    print(i .. ". " .. choice.text)
end

-- Make a choice
engine:select_choice(state, 1)
```

### EventSystem

```lua
local EventSystem = require("whisker.runtime.event_system")

local events = EventSystem.new()

-- Register handlers
events:on("passage_enter", function(event)
    print("Entered:", event.data.passage_id)
end)

events:on("variable_changed", function(event)
    print(event.data.name, ":", event.data.old_value, "->", event.data.new_value)
end)

-- Emit events
events:emit("passage_enter", { passage_id = "chapter1" })

-- One-time handlers
events:once("story_end", function(event)
    print("Story complete!")
end)

-- Remove handlers
events:off("passage_enter")
```

---

## whisker.validators

Story validation with WLS error codes.

### validate(story)

```lua
local validators = require("whisker.validators")

local result = validators.validate(story)

if result.valid then
    print("Story is valid!")
else
    for _, error in ipairs(result.errors) do
        print(string.format("[%s] %s (line %d)",
            error.code, error.message, error.line or 0))
    end
end
```

### Individual Validators

```lua
local StructureValidator = require("whisker.validators.structure")
local LinkValidator = require("whisker.validators.links")
local VariableValidator = require("whisker.validators.variables")
local QualityValidator = require("whisker.validators.quality")

-- Structure validation
local structure = StructureValidator.new()
local errors = structure:validate(story)

-- Link validation
local links = LinkValidator.new()
local link_errors = links:validate(story)

-- Variable validation
local vars = VariableValidator.new()
local var_errors = vars:validate(story)

-- Quality validation with config
local quality = QualityValidator.new({
    max_passage_length = 500,
    max_choices_per_passage = 6,
    warn_on_dead_ends = true
})
local quality_warnings = quality:validate(story)
```

---

## whisker.format

Format converters.

### from_twine(content)

```lua
local format = require("whisker.format")

local html = io.open("story.html"):read("*a")
local story = format.from_twine(html)

print("Imported passages:", #story.passages)
```

### from_ink(content)

```lua
local ink_content = io.open("story.ink"):read("*a")
local story = format.from_ink(ink_content)
```

### detect_format(content)

```lua
local format_type = format.detect_format(html)
-- Returns: "harlowe", "sugarcube", "chapbook", or "unknown"
```

---

## whisker.export

Story exporters.

### to_html(story, options)

```lua
local export = require("whisker.export")

local html = export.to_html(story, {
    template = "modern",
    include_styles = true,
    self_contained = true
})

local file = io.open("story.html", "w")
file:write(html)
file:close()
```

### to_text(story)

Export to WLS text format:

```lua
local wls_source = export.to_text(story)

local file = io.open("story.ws", "w")
file:write(wls_source)
file:close()
```

---

## whisker.vcs

Version control support.

### StoryDiff

```lua
local vcs = require("whisker.vcs")

local diff = vcs.diff(old_story, new_story)

for _, change in ipairs(diff.changes) do
    print(change.type, change.passage_id)
    -- type: "added", "removed", "modified"
end
```

### StoryMerge

```lua
local merged, conflicts = vcs.merge(base, ours, theirs)

if #conflicts > 0 then
    for _, conflict in ipairs(conflicts) do
        print("Conflict in:", conflict.passage_id)
        print("  Ours:", conflict.ours)
        print("  Theirs:", conflict.theirs)
    end
else
    print("Merge successful!")
end
```

---

## whisker.wls2

WLS 2.0 advanced features.

### ThreadScheduler

```lua
local ThreadScheduler = require("whisker.wls2.thread_scheduler")

local scheduler = ThreadScheduler.new()

-- Spawn a thread
local thread_id = scheduler:spawn("background_task", function(state)
    -- Thread code here
    state:set("task_complete", true)
end)

-- Update threads
scheduler:update(state, dt)

-- Check thread status
if scheduler:is_running(thread_id) then
    print("Thread still running")
end

-- Wait for thread
scheduler:join(thread_id)
```

### TextEffects

```lua
local TextEffects = require("whisker.wls2.text_effects")

local effects = TextEffects.new()

-- Register effect
effects:register("shake", function(text, params)
    return { type = "shake", text = text, intensity = params.intensity or 1 }
end)

-- Apply effect
local result = effects:apply("shake", "Danger!", { intensity = 2 })
```

### TimedContent

```lua
local TimedContent = require("whisker.wls2.timed_content")

local timed = TimedContent.new()

-- Schedule content
timed:after(2.0, function()
    print("2 seconds later...")
end)

-- Update (call in game loop)
timed:update(dt)
```

---

## Error Codes

All validators use unified WLS error codes:

| Code | Category | Description |
|------|----------|-------------|
| `WLS-STR-001` | Structure | Missing start passage |
| `WLS-STR-002` | Structure | Duplicate passage ID |
| `WLS-STR-003` | Structure | Unreachable passage |
| `WLS-LNK-001` | Links | Dead link (target doesn't exist) |
| `WLS-LNK-002` | Links | Link to self |
| `WLS-VAR-001` | Variables | Undefined variable |
| `WLS-VAR-002` | Variables | Unused variable |
| `WLS-VAR-003` | Variables | Variable shadowing |
| `WLS-EXP-001` | Expressions | Invalid expression syntax |
| `WLS-EXP-002` | Expressions | Type mismatch |
| `WLS-TYP-001` | Types | Invalid operation for type |
| `WLS-FLW-001` | Flow | Infinite loop detected |
| `WLS-FLW-002` | Flow | Dead end passage |
| `WLS-QUA-001` | Quality | Passage too long |
| `WLS-QUA-002` | Quality | Too many choices |
