#!/bin/bash
# skill-chain-enforcement-guard.sh - Enforces skill delegation in /sw:increment
#
# PURPOSE:
# The /sw:increment skill MUST delegate to sub-skills (PM, Architect, Test-Aware-Planner)
# for creating spec.md, plan.md, and tasks.md. Analytics show the LLM writes these files
# inline 97% of the time instead of invoking the specialized skills via Skill() calls.
#
# This guard BLOCKS direct writes to spec.md, plan.md, and tasks.md from the increment
# skill unless the corresponding sub-skill has registered its invocation marker.
#
# WORKFLOW ENFORCED:
# 1. /sw:increment creates folder + metadata.json (ALLOWED)
# 2. /sw:increment MUST invoke Skill("sw:pm") for spec.md
# 3. /sw:increment MUST invoke Skill("sw:architect") for plan.md
# 4. /sw:increment MUST invoke Skill("sw:test-aware-planner") for tasks.md
# 5. Each sub-skill writes a marker to .specweave/state/skill-chain-{increment-id}.json
# 6. This guard checks for that marker before allowing the write
#
# DETECTION LOGIC:
# - ALLOW: metadata.json writes (always)
# - ALLOW: File has skill invocation marker in state file
# - ALLOW: File is a template (has template markers)
# - ALLOW: Config has skillChainEnforcement disabled
# - BLOCK: Direct spec.md/plan.md/tasks.md writes without skill marker
#
# @since 1.0.314

set -e

# Read hook input
INPUT=$(cat)

# Extract file path and tool from input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .toolName // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .toolInput.file_path // ""')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .toolInput.content // ""')

# Only check Write and Edit operations
if [[ "$TOOL_NAME" != "Write" ]] && [[ "$TOOL_NAME" != "Edit" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Check if this targets an increment folder
if [[ ! "$FILE_PATH" =~ \.specweave/increments/[0-9]{4}-[^/]+/ ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Extract the filename
FILENAME=$(basename "$FILE_PATH")

# Only guard spec.md, plan.md, and tasks.md
case "$FILENAME" in
  spec.md|plan.md|tasks.md) ;;
  *)
    echo '{"decision":"allow"}'
    exit 0
    ;;
esac

# Extract increment ID from path
INCREMENT_ID=$(echo "$FILE_PATH" | grep -oE '[0-9]{4}-[^/]+' | head -1)

# Find project root (where .specweave/ is)
PROJECT_ROOT=$(echo "$FILE_PATH" | sed 's|/.specweave/.*|/|')
CONFIG_PATH="${PROJECT_ROOT}.specweave/config.json"

# Check if skill chain enforcement is enabled (default: strict)
ENFORCEMENT="strict"
if [[ -f "$CONFIG_PATH" ]]; then
  ENFORCEMENT=$(jq -r '.planning.skillChainEnforcement // "strict"' "$CONFIG_PATH" 2>/dev/null)
  if [[ "$ENFORCEMENT" == "off" ]] || [[ "$ENFORCEMENT" == "disabled" ]]; then
    echo '{"decision":"allow"}'
    exit 0
  fi
fi

# Template markers — allow template creation through
TEMPLATE_MARKERS=(
  "[Story Title]"
  "[user type]"
  "[goal]"
  "[benefit]"
  "[Specific, testable criterion]"
  "{{RESOLVED_PROJECT}}"
  "TEMPLATE FILE"
)

# Check if content has template markers (template creation is ALLOWED)
for marker in "${TEMPLATE_MARKERS[@]}"; do
  if [[ "$CONTENT" == *"$marker"* ]]; then
    echo '{"decision":"allow"}'
    exit 0
  fi
done

# For Edit operations, allow small edits (status updates, checkbox toggles)
# These are operational updates, not full file creation
if [[ "$TOOL_NAME" == "Edit" ]]; then
  OLD_STRING=$(echo "$INPUT" | jq -r '.tool_input.old_string // .toolInput.old_string // ""')
  NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // .toolInput.new_string // ""')
  OLD_LEN=${#OLD_STRING}
  NEW_LEN=${#NEW_STRING}

  # Allow small edits (status toggles, checkbox changes, minor corrections)
  # Threshold: edits where both old and new are under 500 chars are likely operational
  if [[ $OLD_LEN -lt 500 ]] && [[ $NEW_LEN -lt 500 ]]; then
    echo '{"decision":"allow"}'
    exit 0
  fi
fi

# Determine which skill should have been invoked
case "$FILENAME" in
  spec.md)
    REQUIRED_SKILL="sw:pm"
    SKILL_LABEL="PM (Product Manager)"
    STATE_KEY="pm_invoked"
    ;;
  plan.md)
    REQUIRED_SKILL="sw:architect"
    SKILL_LABEL="Architect"
    STATE_KEY="architect_invoked"
    ;;
  tasks.md)
    REQUIRED_SKILL="sw:test-aware-planner"
    SKILL_LABEL="Test-Aware Planner"
    STATE_KEY="planner_invoked"
    ;;
esac

# Check for skill invocation marker
STATE_DIR="${PROJECT_ROOT}.specweave/state"
STATE_FILE="${STATE_DIR}/skill-chain-${INCREMENT_ID}.json"

if [[ -f "$STATE_FILE" ]]; then
  INVOKED=$(jq -r ".${STATE_KEY} // false" "$STATE_FILE" 2>/dev/null)
  if [[ "$INVOKED" == "true" ]]; then
    echo '{"decision":"allow"}'
    exit 0
  fi
fi

# Check if the file already exists with content (this is an update, not creation)
# Allow updates to existing files that already have substantive content
if [[ -f "$FILE_PATH" ]]; then
  EXISTING_SIZE=$(wc -c < "$FILE_PATH" 2>/dev/null || echo "0")
  # If existing file has real content (>200 bytes, not just a template), allow edits
  if [[ "$EXISTING_SIZE" -gt 200 ]]; then
    # But check if this is the first substantive write to a template file
    EXISTING_CONTENT=$(head -5 "$FILE_PATH" 2>/dev/null || echo "")
    HAS_TEMPLATE=false
    for marker in "${TEMPLATE_MARKERS[@]}"; do
      if [[ "$EXISTING_CONTENT" == *"$marker"* ]]; then
        HAS_TEMPLATE=true
        break
      fi
    done
    # If existing file is NOT a template, allow updates (sub-skill already wrote it)
    if [[ "$HAS_TEMPLATE" == "false" ]]; then
      echo '{"decision":"allow"}'
      exit 0
    fi
  fi
fi

# BLOCK: No skill invocation marker found
if [[ "$ENFORCEMENT" == "warn" ]]; then
  # Warn mode: allow but show warning
  REASON="**SKILL CHAIN WARNING**: You are writing ${FILENAME} directly without invoking the ${SKILL_LABEL} skill.

Best practice: Use \`Skill({ skill: \"${REQUIRED_SKILL}\", args: \"... for increment ${INCREMENT_ID}\" })\`

To suppress: Set \`planning.skillChainEnforcement: \"off\"\` in config.json"

  REASON_ESCAPED=$(echo "$REASON" | jq -Rs .)
  echo "{\"decision\":\"allow\",\"reason\":${REASON_ESCAPED}}"
  exit 0
fi

# Strict mode: BLOCK
REASON="SKILL CHAIN ENFORCEMENT: Delegation Required

You are attempting to write ${FILENAME} directly. The /sw:increment skill MUST delegate
to specialized sub-skills instead of writing increment files inline.

REQUIRED ACTION for ${FILENAME}:
  Invoke: Skill({ skill: \"${REQUIRED_SKILL}\", args: \"... for increment ${INCREMENT_ID}\" })

The ${SKILL_LABEL} skill will:
  1. Register its invocation marker (this unblocks the guard)
  2. Apply specialized expertise (research, architecture, test planning)
  3. Write ${FILENAME} with proper structure and coverage

SKILL CHAIN (all 3 MUST be invoked):
  spec.md  --> Skill({ skill: \"sw:pm\", args: \"...\" })
  plan.md  --> Skill({ skill: \"sw:architect\", args: \"...\" })
  tasks.md --> Skill({ skill: \"sw:test-aware-planner\", args: \"...\" })

Each skill writes its marker to:
  ${STATE_DIR}/skill-chain-${INCREMENT_ID}.json

WHY THIS MATTERS:
  Analytics show 82 increment invocations but only 6 PM, 1 Architect, 1 TAP calls.
  Inlining bypasses specialized expertise and produces lower-quality specs.

TO DISABLE (not recommended):
  Set planning.skillChainEnforcement: \"off\" in .specweave/config.json"

REASON_ESCAPED=$(echo "$REASON" | jq -Rs .)
echo "{\"decision\":\"block\",\"reason\":${REASON_ESCAPED}}"
exit 0
