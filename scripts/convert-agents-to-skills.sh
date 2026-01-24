#!/bin/bash
# Convert AGENT.md files to SKILL.md with context: fork
# This makes agents available as skills that run in isolated subagent context

set -e

PLUGINS_DIR="plugins"

# Find all AGENT.md files
find "$PLUGINS_DIR" -path "*/agents/*/AGENT.md" | while read agent_file; do
    # Extract paths
    plugin_dir=$(echo "$agent_file" | cut -d'/' -f1-2)
    agent_name=$(basename $(dirname "$agent_file"))
    skill_dir="$plugin_dir/skills/$agent_name"
    skill_file="$skill_dir/SKILL.md"

    echo "Converting: $agent_file -> $skill_file"

    # Create skill directory
    mkdir -p "$skill_dir"

    # Read the agent file and convert frontmatter
    # Changes:
    # 1. tools: -> allowed-tools:
    # 2. Add context: fork after model line
    # 3. Remove agent-specific fields (model_preference, cost_profile, fallback_behavior, max_response_tokens)
    # 4. Remove "How to Invoke" section at the end

    awk '
    BEGIN { in_frontmatter = 0; frontmatter_end = 0; added_context = 0 }

    /^---$/ && !in_frontmatter { in_frontmatter = 1; print; next }
    /^---$/ && in_frontmatter {
        if (!added_context) {
            print "context: fork"
            added_context = 1
        }
        in_frontmatter = 0
        frontmatter_end = 1
        print
        next
    }

    in_frontmatter {
        # Skip agent-specific fields
        if (/^model_preference:/ || /^cost_profile:/ || /^fallback_behavior:/ || /^max_response_tokens:/) {
            next
        }
        # Convert tools to allowed-tools
        if (/^tools:/) {
            # Check if its a multi-line list or inline
            if (/^tools:\s*$/) {
                print "allowed-tools:"
            } else {
                # Inline tools - convert to comma-separated
                gsub(/^tools:/, "allowed-tools:")
                print
            }
            next
        }
        # Handle tool list items
        if (/^\s+-\s+/) {
            # Keep tool list items as-is
            print
            next
        }
        # Add context: fork after model line
        if (/^model:/ && !added_context) {
            print
            print "context: fork"
            added_context = 1
            next
        }
        print
        next
    }

    # Skip "How to Invoke" section
    /^## How to Invoke This Agent/ { skip_section = 1; next }
    skip_section && /^##/ { skip_section = 0 }
    skip_section { next }

    # Print content after frontmatter
    frontmatter_end { print }
    ' "$agent_file" > "$skill_file"

    echo "  Created: $skill_file"
done

echo ""
echo "Conversion complete!"
echo ""
echo "Next steps:"
echo "1. Review converted skills in plugins/*/skills/*/"
echo "2. Remove old agent directories: find plugins -path '*/agents/*' -type d -exec rm -rf {} +"
echo "3. Update any router/documentation that references agents"
