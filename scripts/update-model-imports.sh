#!/bin/bash

# Script to update model imports from local paths to @whisker/core-ts package

echo "Updating model imports to @whisker/core-ts..."

# Find all TypeScript and Svelte files in src/ (excluding core-ts package)
find src -type f \( -name "*.ts" -o -name "*.svelte" \) ! -path "*/node_modules/*" | while read file; do
  # Update imports for individual model classes
  sed -i '' "s|from ['\"]../models/Story['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]../../models/Story['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]\$lib/models/Story['\"]|from '@whisker/core-ts'|g" "$file"

  sed -i '' "s|from ['\"]../models/Passage['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]../../models/Passage['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]\$lib/models/Passage['\"]|from '@whisker/core-ts'|g" "$file"

  sed -i '' "s|from ['\"]../models/Choice['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]../../models/Choice['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]\$lib/models/Choice['\"]|from '@whisker/core-ts'|g" "$file"

  sed -i '' "s|from ['\"]../models/Variable['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]../../models/Variable['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]\$lib/models/Variable['\"]|from '@whisker/core-ts'|g" "$file"

  sed -i '' "s|from ['\"]../models/LuaFunction['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]../../models/LuaFunction['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]\$lib/models/LuaFunction['\"]|from '@whisker/core-ts'|g" "$file"

  sed -i '' "s|from ['\"]../models/ScriptBlock['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]../../models/ScriptBlock['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]\$lib/models/ScriptBlock['\"]|from '@whisker/core-ts'|g" "$file"

  sed -i '' "s|from ['\"]../models/Playthrough['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]../../models/Playthrough['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]\$lib/models/Playthrough['\"]|from '@whisker/core-ts'|g" "$file"

  sed -i '' "s|from ['\"]../models/ChangeLog['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]../../models/ChangeLog['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]\$lib/models/ChangeLog['\"]|from '@whisker/core-ts'|g" "$file"

  sed -i '' "s|from ['\"]../models/Comment['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]../../models/Comment['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]\$lib/models/Comment['\"]|from '@whisker/core-ts'|g" "$file"

  sed -i '' "s|from ['\"]../models/Collaborator['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]../../models/Collaborator['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]\$lib/models/Collaborator['\"]|from '@whisker/core-ts'|g" "$file"

  # Update type imports
  sed -i '' "s|from ['\"]../models/types['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]../../models/types['\"]|from '@whisker/core-ts'|g" "$file"
  sed -i '' "s|from ['\"]\$lib/models/types['\"]|from '@whisker/core-ts'|g" "$file"
done

echo "Import update complete!"
