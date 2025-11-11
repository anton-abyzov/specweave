#!/bin/bash
# migrate-flatten-structure.sh
#
# Migrates from nested projects/{id}/ structure to flattened specs/{id}/ structure
#
# OLD: .specweave/docs/internal/projects/{id}/specs/
# NEW: .specweave/docs/internal/specs/{id}/
#
# USAGE: bash scripts/migrate-flatten-structure.sh

set -e  # Exit on error

echo "🔄 Migrating to flattened structure..."
echo ""

# Check if old structure exists
if [ ! -d ".specweave/docs/internal/projects" ]; then
  echo "ℹ️  No old projects/ folder found. Nothing to migrate."
  exit 0
fi

# Count projects
project_count=$(find .specweave/docs/internal/projects -maxdepth 1 -type d | wc -l | tr -d ' ')
project_count=$((project_count - 1))  # Subtract 1 for projects/ itself

if [ "$project_count" -eq 0 ]; then
  echo "ℹ️  No projects found in projects/ folder."
  exit 0
fi

echo "📦 Found $project_count project(s) to migrate"
echo ""

# Migrate each project
for project_dir in .specweave/docs/internal/projects/*/; do
  if [ ! -d "$project_dir" ]; then
    continue
  fi

  project_id=$(basename "$project_dir")
  echo "📁 Migrating project: $project_id"

  # Migrate specs
  if [ -d "$project_dir/specs" ]; then
    mkdir -p ".specweave/docs/internal/specs/$project_id"
    if [ "$(ls -A "$project_dir/specs" 2>/dev/null)" ]; then
      cp -r "$project_dir/specs/"* ".specweave/docs/internal/specs/$project_id/" 2>/dev/null || true
      echo "   ✅ Migrated specs/"
    fi
  fi

  # Migrate modules
  if [ -d "$project_dir/modules" ]; then
    mkdir -p ".specweave/docs/internal/modules/$project_id"
    if [ "$(ls -A "$project_dir/modules" 2>/dev/null)" ]; then
      cp -r "$project_dir/modules/"* ".specweave/docs/internal/modules/$project_id/" 2>/dev/null || true
      echo "   ✅ Migrated modules/"
    fi
  fi

  # Migrate team
  if [ -d "$project_dir/team" ]; then
    mkdir -p ".specweave/docs/internal/team/$project_id"
    if [ "$(ls -A "$project_dir/team" 2>/dev/null)" ]; then
      cp -r "$project_dir/team/"* ".specweave/docs/internal/team/$project_id/" 2>/dev/null || true
      echo "   ✅ Migrated team/"
    fi
  fi

  # Migrate project-specific architecture (rename to project-arch)
  if [ -d "$project_dir/architecture" ]; then
    mkdir -p ".specweave/docs/internal/project-arch/$project_id"
    if [ "$(ls -A "$project_dir/architecture" 2>/dev/null)" ]; then
      cp -r "$project_dir/architecture/"* ".specweave/docs/internal/project-arch/$project_id/" 2>/dev/null || true
      echo "   ✅ Migrated architecture/ → project-arch/"
    fi
  fi

  # Migrate legacy
  if [ -d "$project_dir/legacy" ]; then
    mkdir -p ".specweave/docs/internal/legacy/$project_id"
    if [ "$(ls -A "$project_dir/legacy" 2>/dev/null)" ]; then
      cp -r "$project_dir/legacy/"* ".specweave/docs/internal/legacy/$project_id/" 2>/dev/null || true
      echo "   ✅ Migrated legacy/"
    fi
  fi

  echo ""
done

# Backup old projects/ directory
echo "📦 Creating backup of old structure..."
if [ -d ".specweave/docs/internal/projects.old" ]; then
  rm -rf ".specweave/docs/internal/projects.old"
fi
mv .specweave/docs/internal/projects .specweave/docs/internal/projects.old
echo "✅ Old structure backed up to projects.old/"
echo ""

echo "✅ Migration complete!"
echo ""
echo "📊 Summary:"
echo "   - Migrated $project_count project(s)"
echo "   - Old structure backed up to: .specweave/docs/internal/projects.old/"
echo "   - You can safely delete projects.old/ after verifying migration"
echo ""
echo "🔍 Verify migration:"
echo "   ls -la .specweave/docs/internal/specs/"
echo "   ls -la .specweave/docs/internal/modules/"
echo ""
