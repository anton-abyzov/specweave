#!/bin/bash

# Script to replace old command references with namespaced versions
# Usage: bash scripts/cleanup-old-command-references.sh

echo "🧹 Cleaning up old command references..."

# Function to replace in files
replace_in_files() {
    local pattern="$1"
    local replacement="$2"
    local file_pattern="$3"

    echo "  Replacing '$pattern' with '$replacement'..."

    find . -type f -name "$file_pattern" \
        ! -path "*/node_modules/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/.git/*" \
        -exec sed -i '' "s|$pattern|$replacement|g" {} +
}

# Replace command references in markdown files
echo "📝 Updating command references in .md files..."

# /create-project → /specweave create-project (in command examples)
replace_in_files '`/create-project' '`/specweave create-project' "*.md"
replace_in_files '\`\/create-project' '\`\/specweave create-project' "*.md"

# /inc → /specweave inc (be careful with /inc)
replace_in_files '`/inc "' '`/specweave inc "' "*.md"
replace_in_files '`/inc' '`/specweave inc' "*.md"

# /build → /specweave build (excluding npm/docker build)
replace_in_files '`/build`' '`/specweave build`' "*.md"
replace_in_files '`/build ' '`/specweave build ' "*.md"

# /done → /specweave done
replace_in_files '`/done' '`/specweave done' "*.md"

# /progress → /specweave progress
replace_in_files '`/progress' '`/specweave progress' "*.md"

# /validate → /specweave validate
replace_in_files '`/validate' '`/specweave validate' "*.md"

# /next → /specweave next
replace_in_files '`/next' '`/specweave next' "*.md"

# /review-docs → /specweave review-docs
replace_in_files '`/review-docs' '`/specweave review-docs' "*.md"

# /sync-github → /specweave sync-github
replace_in_files '`/sync-github' '`/specweave sync-github' "*.md"

# /sync-jira → /specweave sync-jira
replace_in_files '`/sync-jira' '`/specweave sync-jira' "*.md"

# /list-increments → /specweave list-increments
replace_in_files '`/list-increments' '`/specweave list-increments' "*.md"

# Also handle cases without backticks (in bash code blocks)
echo "📝 Updating command references in bash code blocks..."

replace_in_files '^/inc ' '/specweave inc ' "*.md"
replace_in_files '^/build$' '/specweave build' "*.md"
replace_in_files '^/done ' '/specweave done ' "*.md"
replace_in_files '^/progress$' '/specweave progress' "*.md"
replace_in_files '^/validate ' '/specweave validate ' "*.md"
replace_in_files '^/next$' '/specweave next' "*.md"

echo "✅ Cleanup complete!"
echo ""
echo "Files updated:"
echo "  - All .md files in the repository"
echo "  - Old command references replaced with /specweave prefix"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit: git add -A && git commit -m 'docs: replace old command references with specweave- prefix'"
echo "  3. Push: git push"
