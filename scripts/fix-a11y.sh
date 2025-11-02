#!/bin/bash

# Accessibility Fixes Script
# Fixes common accessibility patterns across all Svelte files

set -e

echo "🔧 Fixing accessibility issues..."
echo ""

# Get list of files with warnings
FILES=$(npm run check 2>&1 | grep "\.svelte:" | cut -d: -f1 | sort -u)

if [ -z "$FILES" ]; then
  echo "✅ No accessibility warnings found!"
  exit 0
fi

echo "Found $(echo "$FILES" | wc -l) files with accessibility warnings"
echo ""

# Count fixes
LABEL_FIXES=0
CLICK_FIXES=0
DIALOG_FIXES=0
MENU_FIXES=0
SELFCLOSE_FIXES=0

for file in $FILES; do
  if [ ! -f "$file" ]; then
    continue
  fi

  echo "Processing: $(basename $file)"

  # Create backup
  cp "$file" "$file.bak"

  # Fix 1: Self-closing non-void elements (easy regex fix)
  # <div /> -> <div></div>
  # <textarea /> -> <textarea></textarea>
  if grep -q "<div[^>]*\/>" "$file" || grep -q "<textarea[^>]*\/>" "$file"; then
    sed -i.tmp 's/<div\([^>]*\)\/>/  <div\1><\/div>/g' "$file"
    sed -i.tmp 's/<textarea\([^>]*\)\/>/<textarea\1><\/textarea>/g' "$file"
    rm -f "$file.tmp"
    ((SELFCLOSE_FIXES++))
  fi

  # Fix 2: Add tabindex to dialog roles
  # role="dialog" -> role="dialog" tabindex="-1"
  if grep -q 'role="dialog"' "$file" && ! grep -q 'role="dialog"[^>]*tabindex' "$file"; then
    sed -i.tmp 's/role="dialog"/role="dialog" tabindex="-1"/g' "$file"
    rm -f "$file.tmp"
    ((DIALOG_FIXES++))
  fi

  # Fix 3: Add tabindex to menu roles
  # role="menu" -> role="menu" tabindex="0"
  if grep -q 'role="menu"' "$file" && ! grep -q 'role="menu"[^>]*tabindex' "$file"; then
    sed -i.tmp 's/role="menu"/role="menu" tabindex="0"/g' "$file"
    rm -f "$file.tmp"
    ((MENU_FIXES++))
  fi

  # Restore if no changes were made
  if diff -q "$file" "$file.bak" > /dev/null 2>&1; then
    rm "$file.bak"
  else
    echo "  ✓ Fixed patterns in $(basename $file)"
  fi
done

echo ""
echo "Summary:"
echo "  Self-closing tags fixed: $SELFCLOSE_FIXES files"
echo "  Dialog tabindex added: $DIALOG_FIXES files"
echo "  Menu tabindex added: $MENU_FIXES files"
echo ""
echo "⚠️  Manual fixes still needed:"
echo "  - Label associations (96): Need unique IDs per label/input pair"
echo "  - Click handlers (25): Need keyboard handlers added"
echo "  - Div click roles (10): Need role=\"button\" and keyboard handlers"
echo ""
echo "Run 'npm run check' to see remaining warnings"
