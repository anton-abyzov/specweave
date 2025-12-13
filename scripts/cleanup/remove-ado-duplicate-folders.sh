#!/bin/bash
# Remove ADO duplicate project folders (v0.37.0 fix)
#
# Bug: ADO import created duplicate folders like "Nova CAD" and "nova-cad"
# Root cause: containerId used display name instead of normalized form
# Fix: v0.37.0 normalizes containerId before creating folders
#
# This script consolidates duplicates into the lowercase version

set -e

SPECS_DIR=".specweave/docs/internal/specs"

if [ ! -d "$SPECS_DIR" ]; then
  echo "❌ Error: $SPECS_DIR not found. Run this from project root."
  exit 1
fi

echo "🔍 Scanning for ADO duplicate folders..."
echo ""

# Find all folders with spaces in the name (likely ADO display names)
duplicates_found=0

for folder in "$SPECS_DIR"/*; do
  if [ ! -d "$folder" ]; then
    continue
  fi

  folder_name=$(basename "$folder")

  # Skip if no spaces (already normalized)
  if [[ ! "$folder_name" =~ [[:space:]] ]]; then
    continue
  fi

  # Generate normalized version (lowercase + spaces to hyphens)
  normalized=$(echo "$folder_name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  normalized_path="$SPECS_DIR/$normalized"

  # Check if normalized version exists
  if [ -d "$normalized_path" ]; then
    echo "📦 Found duplicate:"
    echo "   Display name: $folder_name/"
    echo "   Normalized:   $normalized/"
    echo ""

    # Count files in each
    display_count=$(find "$folder" -type f -name "*.md" | wc -l | tr -d ' ')
    normalized_count=$(find "$normalized_path" -type f -name "*.md" | wc -l | tr -d ' ')

    echo "   Files in display name: $display_count"
    echo "   Files in normalized:   $normalized_count"
    echo ""

    # Ask user what to do
    echo "   Options:"
    echo "   1) Merge display name → normalized (keep normalized)"
    echo "   2) Merge normalized → display name (keep display name)"
    echo "   3) Skip this folder"
    read -p "   Choice (1/2/3): " choice
    echo ""

    case $choice in
      1)
        echo "   ✅ Merging '$folder_name' → '$normalized'..."

        # Move all content from display name to normalized
        rsync -av "$folder/" "$normalized_path/"

        # Remove display name folder
        rm -rf "$folder"

        echo "   ✅ Merged and removed '$folder_name'"
        echo ""
        ;;
      2)
        echo "   ✅ Merging '$normalized' → '$folder_name'..."

        # Move all content from normalized to display name
        rsync -av "$normalized_path/" "$folder/"

        # Remove normalized folder
        rm -rf "$normalized_path"

        echo "   ✅ Merged and removed '$normalized'"
        echo ""
        ;;
      3)
        echo "   ⏭️  Skipped"
        echo ""
        ;;
      *)
        echo "   ⚠️  Invalid choice, skipping"
        echo ""
        ;;
    esac

    duplicates_found=$((duplicates_found + 1))
  fi
done

# Check for nested duplicates (e.g., nova-cad/nova-cad)
echo ""
echo "🔍 Scanning for nested duplicate folders..."
echo ""

for project_folder in "$SPECS_DIR"/*; do
  if [ ! -d "$project_folder" ]; then
    continue
  fi

  project_name=$(basename "$project_folder")

  # Check if a subfolder exists with the same name
  nested_folder="$project_folder/$project_name"

  if [ -d "$nested_folder" ]; then
    echo "📦 Found nested duplicate:"
    echo "   Project: $project_name/"
    echo "   Nested:  $project_name/$project_name/"
    echo ""

    # Count files
    nested_count=$(find "$nested_folder" -type f -name "*.md" | wc -l | tr -d ' ')
    echo "   Files in nested: $nested_count"
    echo ""

    if [ "$nested_count" -eq 0 ]; then
      echo "   ✅ Empty nested folder - removing automatically"
      rm -rf "$nested_folder"
      echo ""
    else
      echo "   Options:"
      echo "   1) Move files up to parent and remove nested"
      echo "   2) Keep nested as-is"
      read -p "   Choice (1/2): " choice
      echo ""

      case $choice in
        1)
          echo "   ✅ Moving files from nested to parent..."

          # Move all content from nested to parent
          rsync -av "$nested_folder/" "$project_folder/"

          # Remove nested folder
          rm -rf "$nested_folder"

          echo "   ✅ Moved and removed nested folder"
          echo ""
          ;;
        2)
          echo "   ⏭️  Kept nested folder"
          echo ""
          ;;
        *)
          echo "   ⚠️  Invalid choice, skipping"
          echo ""
          ;;
      esac
    fi

    duplicates_found=$((duplicates_found + 1))
  fi
done

echo ""
if [ "$duplicates_found" -eq 0 ]; then
  echo "✅ No duplicates found!"
else
  echo "✅ Processed $duplicates_found duplicate folder(s)"
  echo ""
  echo "💡 Future imports will use normalized names (lowercase, hyphens)"
  echo "   Example: 'Nova CAD' → 'nova-cad/'"
fi
