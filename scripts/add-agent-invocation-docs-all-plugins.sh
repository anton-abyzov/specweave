#!/usr/bin/env bash
# Add invocation documentation to ALL agent AGENT.md files across ALL plugins

set -euo pipefail

PLUGINS_BASE="plugins"
UPDATED_COUNT=0
SKIPPED_COUNT=0
ERROR_COUNT=0

echo "🔍 Scanning all plugins for agents missing invocation documentation..."
echo ""

# Loop through all plugin directories
for plugin_dir in "$PLUGINS_BASE"/*; do
  if [ ! -d "$plugin_dir" ]; then
    continue
  fi

  plugin_name=$(basename "$plugin_dir")
  agents_dir="$plugin_dir/agents"

  # Skip if no agents directory
  if [ ! -d "$agents_dir" ]; then
    continue
  fi

  # Loop through all agent directories in this plugin
  for agent_dir in "$agents_dir"/*; do
    if [ ! -d "$agent_dir" ]; then
      continue
    fi

    agent_file="$agent_dir/AGENT.md"
    if [ ! -f "$agent_file" ]; then
      continue
    fi

    # Skip if already has invocation docs
    if grep -q "How to Invoke This Agent" "$agent_file"; then
      echo "✅ Already has docs: $plugin_name/$(basename "$agent_dir")"
      ((SKIPPED_COUNT++))
      continue
    fi

    # Extract agent name from YAML frontmatter or filename
    agent_name=$(grep "^name:" "$agent_file" | head -1 | sed 's/name: *//' | tr -d '"' | tr -d "'")

    # Fallback to directory name if no YAML name found
    if [ -z "$agent_name" ]; then
      agent_name=$(basename "$agent_dir")
      echo "⚠️  No YAML name, using directory name: $agent_name"
    fi

    dir_name=$(basename "$agent_dir")

    echo "📝 Adding invocation docs to: $plugin_name/$dir_name (name: $agent_name)"

    # Determine subagent_type format
    subagent_type="${plugin_name}:${dir_name}:${agent_name}"

    # Create invocation section
    invocation_section=$(cat <<EOF

## 🚀 How to Invoke This Agent

**Subagent Type**: \`${subagent_type}\`

**Usage Example**:

\`\`\`typescript
Task({
  subagent_type: "${subagent_type}",
  prompt: "Your task description here",
  model: "haiku" // optional: haiku, sonnet, opus
});
\`\`\`

**Naming Convention**: \`{plugin}:{directory}:{yaml-name}\`
- **Plugin**: ${plugin_name}
- **Directory**: ${dir_name}
- **YAML Name**: ${agent_name}

**When to Use**:
- [TODO: Describe specific use cases for this agent]
- [TODO: When should this agent be invoked instead of others?]
- [TODO: What problems does this agent solve?]

EOF
)

    # Find the line number where frontmatter ends (second ---)
    end_line=$(grep -n "^---$" "$agent_file" | sed -n '2p' | cut -d: -f1)

    if [ -z "$end_line" ]; then
      # No frontmatter, add at the beginning
      echo "⚠️  No frontmatter found, adding at beginning: $plugin_name/$dir_name"
      {
        echo "$invocation_section"
        cat "$agent_file"
      } > "$agent_file.tmp"
    else
      # Insert after frontmatter
      {
        head -n "$end_line" "$agent_file"
        echo "$invocation_section"
        tail -n +$((end_line + 1)) "$agent_file" | sed '1{/^$/d;}'
      } > "$agent_file.tmp"
    fi

    # Verify tmp file is not empty
    if [ ! -s "$agent_file.tmp" ]; then
      echo "❌ Error: Generated empty file for $plugin_name/$dir_name"
      rm -f "$agent_file.tmp"
      ((ERROR_COUNT++))
      continue
    fi

    mv "$agent_file.tmp" "$agent_file"
    echo "✅ Updated: $plugin_name/$dir_name"
    ((UPDATED_COUNT++))
  done
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Updated: $UPDATED_COUNT agents"
echo "⏭️  Skipped: $SKIPPED_COUNT agents (already have docs)"
echo "❌ Errors: $ERROR_COUNT agents"
echo ""

if [ "$UPDATED_COUNT" -gt 0 ]; then
  echo "🎉 Successfully added invocation documentation!"
  echo ""
  echo "Next steps:"
  echo "1. Review generated documentation in each AGENT.md"
  echo "2. Replace [TODO] placeholders with specific use cases"
  echo "3. Test agents work with the documented subagent_type"
  echo "4. Commit changes: git add plugins/*/agents/*/AGENT.md"
else
  echo "✨ All agents already have invocation documentation!"
fi
