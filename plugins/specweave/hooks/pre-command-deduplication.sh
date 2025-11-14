#!/bin/bash

# SpecWeave Pre-Command Deduplication Hook
# Fires BEFORE any command executes (UserPromptSubmit hook)
# Purpose: Prevent duplicate command invocations within configurable time window

set -euo pipefail

# Read input JSON from stdin
INPUT=$(cat)

# Extract prompt from JSON
PROMPT=$(echo "$INPUT" | node -e "
  const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
  console.log(input.prompt || '');
")

# ==============================================================================
# DEDUPLICATION CHECK: Block duplicate commands within 1 second
# ==============================================================================

# Extract command name from prompt (if slash command)
COMMAND=$(echo "$PROMPT" | grep -oE "^/[a-z0-9:-]+" | head -1 || echo "")

if [[ -n "$COMMAND" ]]; then
  # Check deduplication using TypeScript module
  if command -v node >/dev/null 2>&1 && [[ -f "dist/src/core/deduplication/command-deduplicator.js" ]]; then
    # Run deduplication check
    DEDUP_RESULT=$(node -e "
      (async () => {
        try {
          const { CommandDeduplicator } = require('./dist/src/core/deduplication/command-deduplicator.js');
          const dedup = new CommandDeduplicator({ debug: false });

          // Parse command and args
          const fullCommand = '${COMMAND}';
          const args = '${PROMPT}'.replace(fullCommand, '').trim().split(/\\s+/).filter(Boolean);

          // Check for duplicate
          const isDuplicate = await dedup.checkDuplicate(fullCommand, args);

          if (isDuplicate) {
            const stats = dedup.getStats();
            console.log('DUPLICATE');
            console.log(JSON.stringify(stats));
          } else {
            // Record invocation
            await dedup.recordInvocation(fullCommand, args);
            console.log('OK');
          }
        } catch (e) {
          console.error('Error in deduplication:', e.message);
          console.log('OK'); // Fail-open (don't block on errors)
        }
      })();
    " 2>/dev/null || echo "OK")

    # Parse result
    STATUS=$(echo "$DEDUP_RESULT" | head -1)

    if [[ "$STATUS" == "DUPLICATE" ]]; then
      # Get stats
      STATS=$(echo "$DEDUP_RESULT" | tail -1)

      cat <<EOF
{
  "decision": "block",
  "reason": "🚫 DUPLICATE COMMAND DETECTED\\n\\nCommand: \`$COMMAND\`\\nTime window: 1 second\\n\\nThis command was just executed! To prevent unintended duplicates, this invocation has been blocked.\\n\\n💡 If you meant to run this command again:\\n  1. Wait 1 second\\n  2. Run the command again\\n\\n📊 Deduplication Stats:\\n$STATS\\n\\n🔧 To adjust the time window, edit \`.specweave/config.json\`:\\n\`\`\`json\\n{\\n  \\\"deduplication\\\": {\\n    \\\"windowMs\\\": 2000  // Increase to 2 seconds\\n  }\\n}\\n\`\`\`"
}
EOF
      exit 0
    fi
  fi
fi

# ==============================================================================
# PASS THROUGH: No duplicate detected, proceed with command
# ==============================================================================

cat <<EOF
{
  "decision": "approve"
}
EOF

exit 0
