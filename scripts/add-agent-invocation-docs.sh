#!/usr/bin/env bash
# Add invocation documentation to all agent AGENT.md files

set -euo pipefail

AGENTS_DIR="plugins/specweave/agents"

for agent_dir in "$AGENTS_DIR"/*; do
  if [ ! -d "$agent_dir" ]; then
    continue
  fi

  agent_file="$agent_dir/AGENT.md"
  if [ ! -f "$agent_file" ]; then
    continue
  fi

  # Skip if already has invocation docs
  if grep -q "How to Invoke This Agent" "$agent_file"; then
    echo "✅ Already has docs: $(basename "$agent_dir")"
    continue
  fi

  # Extract agent name from YAML frontmatter
  agent_name=$(grep "^name:" "$agent_file" | head -1 | sed 's/name: *//')
  if [ -z "$agent_name" ]; then
    echo "❌ No name in YAML: $(basename "$agent_dir")"
    continue
  fi

  dir_name=$(basename "$agent_dir")

  echo "📝 Adding invocation docs to: $dir_name (name: $agent_name)"

  # Create invocation section (using heredoc with variable substitution)
  invocation_section=$(cat <<EOF

# ${agent_name} Agent

## 🚀 How to Invoke This Agent

\`\`\`typescript
// CORRECT invocation
Task({
  subagent_type: "specweave:${dir_name}:${agent_name}",
  prompt: "Your task description here"
});

// Naming pattern: {plugin}:{directory}:{name-from-yaml}
// - plugin: specweave
// - directory: ${dir_name} (folder name)
// - name: ${agent_name} (from YAML frontmatter above)
\`\`\`
EOF
)

  # Find the line number where frontmatter ends (second ---)
  end_line=$(grep -n "^---$" "$agent_file" | sed -n '2p' | cut -d: -f1)

  if [ -z "$end_line" ]; then
    echo "❌ Could not find frontmatter end in: $dir_name"
    continue
  fi

  # Create temp file with invocation docs inserted
  {
    head -n "$end_line" "$agent_file"
    echo "$invocation_section"
    tail -n +$((end_line + 1)) "$agent_file" | sed '1{/^$/d;}'
  } > "$agent_file.tmp"

  mv "$agent_file.tmp" "$agent_file"
  echo "✅ Updated: $dir_name"
done

echo ""
echo "🎉 Done! All agents have invocation documentation."
