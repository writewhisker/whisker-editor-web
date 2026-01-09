--[[
  Cross-Platform Test Runner for Lua (whisker-core)

  Runs YAML test cases against the Lua whisker implementation.

  Usage:
    lua runner-lua.lua [test-directory]
--]]

local M = {}

-- Simple YAML parser for test files
-- (Minimal implementation - handles the test format only)
local function parse_yaml(content)
  local result = {}
  local current_key = nil
  local in_multiline = false
  local multiline_content = {}
  local in_assertions = false
  local current_assertion = nil
  local assertions = {}

  for line in content:gmatch("[^\r\n]+") do
    -- Handle multiline strings (|)
    if in_multiline then
      if line:match("^%s+") then
        table.insert(multiline_content, line:match("^%s*(.*)$"))
      else
        result[current_key] = table.concat(multiline_content, "\n")
        in_multiline = false
        multiline_content = {}
      end
    end

    if not in_multiline then
      -- Key: value pairs
      local key, value = line:match("^([%w_]+):%s*(.*)$")
      if key then
        if value == "|" then
          in_multiline = true
          current_key = key
        elseif value == "" then
          -- Start of nested structure
          if key == "assertions" then
            in_assertions = true
          end
        else
          -- Remove quotes
          value = value:gsub('^"(.*)"$', "%1"):gsub("^'(.*)'$", "%1")
          result[key] = value
        end
      end

      -- Handle assertion items
      if in_assertions and line:match("^%s*%-%s*") then
        local assertion_line = line:match("^%s*%-%s*(.*)$")
        if assertion_line then
          local akey, aval = assertion_line:match("([%w_]+):%s*(.*)$")
          if akey then
            current_assertion = { [akey] = aval:gsub('^"(.*)"$', "%1") }
            table.insert(assertions, current_assertion)
          end
        end
      elseif in_assertions and current_assertion and line:match("^%s+[%w_]+:") then
        local akey, aval = line:match("^%s+([%w_]+):%s*(.*)$")
        if akey and aval then
          current_assertion[akey] = tonumber(aval) or aval:gsub('^"(.*)"$', "%1")
        end
      end
    end
  end

  -- Handle trailing multiline
  if in_multiline then
    result[current_key] = table.concat(multiline_content, "\n")
  end

  result.assertions = assertions
  return result
end

-- Find all YAML files in directory
local function find_test_files(dir)
  local files = {}
  local handle = io.popen('find "' .. dir .. '" -name "*.yaml" -o -name "*.yml" 2>/dev/null')
  if handle then
    for file in handle:lines() do
      table.insert(files, file)
    end
    handle:close()
  end
  return files
end

-- Load whisker engine
local function load_engine()
  -- Try to load whisker-core
  local ok, whisker = pcall(require, "whisker")
  if ok then
    return whisker
  end

  -- Try alternate path
  ok, whisker = pcall(require, "whisker.core.engine")
  if ok then
    return whisker
  end

  error("Could not load whisker engine")
end

-- Run a single test
local function run_test(test_case, engine_module)
  local start_time = os.clock()
  local results = {
    name = test_case.name or "unnamed",
    passed = true,
    assertions = {},
    error = nil
  }

  -- Check if skipped for Lua
  if test_case.platforms and test_case.platforms.lua and test_case.platforms.lua.skip then
    results.error = "Skipped: " .. (test_case.platforms.lua.reason or "platform skip")
    results.duration = 0
    return results
  end

  -- Execute the WLS code
  local ok, exec_result = pcall(function()
    local engine = engine_module.new()
    return engine:execute(test_case.wls or "")
  end)

  if not ok then
    results.error = tostring(exec_result)
    results.passed = false
  else
    -- Check assertions
    for _, assertion in ipairs(test_case.assertions or {}) do
      local assertion_result = {
        assertion = assertion,
        passed = true
      }

      -- Variable assertion
      if assertion.variable then
        local expected = assertion.equals
        local actual = exec_result.variables and exec_result.variables[assertion.variable]

        if expected ~= nil then
          if tostring(actual) ~= tostring(expected) then
            assertion_result.passed = false
            assertion_result.expected = expected
            assertion_result.actual = actual
            assertion_result.message = string.format(
              "Variable %s: expected %s, got %s",
              assertion.variable, tostring(expected), tostring(actual)
            )
          end
        end
      end

      -- Output assertion
      if assertion.output then
        local output = exec_result.output or ""
        if type(output) == "table" then
          output = table.concat(output, "\n")
        end

        if assertion.contains then
          if not output:find(assertion.contains, 1, true) then
            assertion_result.passed = false
            assertion_result.message = "Output does not contain: " .. assertion.contains
          end
        end
      end

      -- Error assertion
      if assertion.error then
        local errors = exec_result.errors or {}
        if type(errors) == "table" then
          errors = table.concat(errors, "\n")
        end

        if assertion.contains then
          if not errors:find(assertion.contains, 1, true) then
            assertion_result.passed = false
            assertion_result.message = "Error does not contain: " .. assertion.contains
          end
        end
      end

      table.insert(results.assertions, assertion_result)
      if not assertion_result.passed then
        results.passed = false
      end
    end
  end

  results.duration = (os.clock() - start_time) * 1000
  return results
end

-- Run all tests in directory
local function run_test_suite(test_dir)
  local start_time = os.clock()
  local test_files = find_test_files(test_dir)
  local results = {}
  local passed = 0
  local failed = 0
  local skipped = 0

  print(string.format("\nRunning %d test files from %s\n", #test_files, test_dir))

  -- Load engine once
  local ok, engine = pcall(load_engine)
  if not ok then
    print("Warning: Could not load whisker engine: " .. tostring(engine))
    print("Tests will be marked as failed.\n")
    engine = nil
  end

  for _, file in ipairs(test_files) do
    local handle = io.open(file, "r")
    if handle then
      local content = handle:read("*a")
      handle:close()

      local ok, test_case = pcall(parse_yaml, content)
      if ok and test_case then
        local result
        if engine then
          result = run_test(test_case, engine)
        else
          result = {
            name = test_case.name or file,
            passed = false,
            error = "Engine not available",
            assertions = {},
            duration = 0
          }
        end

        table.insert(results, result)

        if result.error and result.error:match("^Skipped") then
          skipped = skipped + 1
          print("  SKIP " .. result.name)
        elseif result.passed then
          passed = passed + 1
          print("  PASS " .. result.name)
        else
          failed = failed + 1
          print("  FAIL " .. result.name)
          if result.error then
            print("       Error: " .. result.error)
          end
          for _, ar in ipairs(result.assertions) do
            if not ar.passed and ar.message then
              print("       - " .. ar.message)
            end
          end
        end
      else
        failed = failed + 1
        print("  FAIL " .. file .. ": Parse error")
      end
    end
  end

  local duration = (os.clock() - start_time) * 1000

  print(string.rep("=", 50))
  print(string.format("Results: %d passed, %d failed, %d skipped", passed, failed, skipped))
  print(string.format("Duration: %.0fms", duration))
  print(string.rep("=", 50) .. "\n")

  return {
    total = #test_files,
    passed = passed,
    failed = failed,
    skipped = skipped,
    duration = duration,
    results = results
  }
end

-- Write results to JSON
local function write_results(results, output_path)
  local handle = io.open(output_path, "w")
  if handle then
    -- Simple JSON serialization
    local function to_json(val, indent)
      indent = indent or 0
      local spaces = string.rep("  ", indent)

      if type(val) == "nil" then
        return "null"
      elseif type(val) == "boolean" then
        return val and "true" or "false"
      elseif type(val) == "number" then
        return tostring(val)
      elseif type(val) == "string" then
        return '"' .. val:gsub('\\', '\\\\'):gsub('"', '\\"'):gsub('\n', '\\n') .. '"'
      elseif type(val) == "table" then
        local is_array = #val > 0
        local items = {}

        if is_array then
          for _, v in ipairs(val) do
            table.insert(items, spaces .. "  " .. to_json(v, indent + 1))
          end
          return "[\n" .. table.concat(items, ",\n") .. "\n" .. spaces .. "]"
        else
          for k, v in pairs(val) do
            table.insert(items, spaces .. '  "' .. k .. '": ' .. to_json(v, indent + 1))
          end
          return "{\n" .. table.concat(items, ",\n") .. "\n" .. spaces .. "}"
        end
      end
      return "null"
    end

    handle:write(to_json(results))
    handle:close()
    print("Results written to " .. output_path)
  end
end

-- Main entry point
local function main()
  local test_dir = arg[1] or "."
  local results = run_test_suite(test_dir)

  -- Write results
  local script_dir = arg[0]:match("(.*/)")  or "./"
  write_results(results, script_dir .. "results-lua.json")

  -- Exit with error code if any failed
  os.exit(results.failed > 0 and 1 or 0)
end

-- Export for programmatic use
M.run_test_suite = run_test_suite
M.run_test = run_test
M.parse_yaml = parse_yaml

-- Run if called directly
if arg and arg[0] then
  main()
end

return M
