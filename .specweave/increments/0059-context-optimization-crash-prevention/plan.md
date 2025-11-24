# Technical Plan: Context Optimization & Crash Prevention

## Architecture Overview

```
BEFORE (Crash-prone):
┌─────────────────────────────────────────────────────┐
│ Claude Code Start                                   │
│ ↓                                                   │
│ Load ALL: 117 skills + 41 agents + 27 plugins      │
│ ↓                                                   │
│ Every prompt → 2 node processes (hooks)            │
│ ↓                                                   │
│ CRASH (context explosion ~25MB)                    │
└─────────────────────────────────────────────────────┘

AFTER (Optimized):
┌─────────────────────────────────────────────────────┐
│ Claude Code Start                                   │
│ ↓                                                   │
│ Load: AGENTS.md (~400 lines) + skill index only    │
│ ↓                                                   │
│ Prompt → cached check (no node spawn)              │
│ ↓                                                   │
│ Keyword detected → load relevant skill only        │
│ ↓                                                   │
│ STABLE (~2MB initial, grow on-demand)              │
└─────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: AGENTS.md.template Reduction (US-001)

**Approach**: Rewrite template preserving essential content only

**Keep (MUST HAVE for non-Claude tools)**:
- Section index with search patterns
- Critical rules (root pollution, source of truth)
- File organization rules
- Command reference (with manual execution pattern)
- Task completion workflow (sync commands)
- Troubleshooting essentials

**Remove**:
- Marketing language, excessive emojis
- Repeated explanations (consolidate)
- Verbose examples (keep 1 per concept)
- "Why This Matters" sections (keep inline)
- Plugin loading instructions (move to separate doc)

**Target Structure** (~400 lines):
```
1. Quick Start (20 lines)
2. Critical Rules (30 lines)
3. File Organization (30 lines)
4. Commands Reference (100 lines)
5. Task Completion Workflow (50 lines)
6. Skills/Agents Index (50 lines)
7. Troubleshooting (50 lines)
8. Section Index (70 lines)
```

### Phase 2: Hook Optimization (US-003)

**File**: `plugins/specweave/hooks/user-prompt-submit.sh`

**Changes**:
1. Add 30-second cache for discipline checks
2. Skip node spawn if cache valid
3. Use bash-only checks where possible
4. Early exit if no .specweave/ directory

**Cache Strategy**:
```bash
CACHE_FILE=".specweave/state/.discipline-cache"
CACHE_TTL=30  # seconds

# Check cache validity
if [ -f "$CACHE_FILE" ]; then
  CACHE_AGE=$(($(date +%s) - $(stat -f %m "$CACHE_FILE")))
  if [ $CACHE_AGE -lt $CACHE_TTL ]; then
    cat "$CACHE_FILE"  # Use cached result
    exit 0
  fi
fi
```

### Phase 3: Lazy Skill Loading (US-002)

**Approach**: Index-based loading

**SKILLS-INDEX.md** format (keep existing):
```yaml
- name: increment-planner
  triggers: plan, increment, feature, planning
  path: increment-planner/SKILL.md
```

**Loading behavior**:
1. At startup: Load SKILLS-INDEX.md only (~11KB)
2. On prompt: Match keywords against triggers
3. On match: Load full SKILL.md for matched skill only

### Phase 4: Progressive Plugin Disclosure (US-004)

**plugin.json** minimal format:
```json
{
  "name": "specweave-github",
  "description": "GitHub integration",
  "triggers": ["github", "sync", "issue"],
  "entrypoint": "skills/github-sync/SKILL.md"
}
```

**Loading behavior**:
1. At startup: Load plugin.json manifests only
2. On keyword match: Load relevant skill/agent
3. Never load unused plugins fully

## Files to Modify

| File | Change |
|------|--------|
| `src/templates/AGENTS.md.template` | Rewrite (~2402 → ~400 lines) |
| `plugins/specweave/hooks/user-prompt-submit.sh` | Add caching |
| `plugins/specweave/hooks/pre-command-deduplication.sh` | Add caching |
| `plugins/specweave/skills/SKILLS-INDEX.md` | Add trigger keywords |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Missing essential instructions | Review checklist before finalizing |
| Breaking non-Claude workflows | Test with Cursor/Copilot |
| Cache invalidation issues | 30s TTL + manual refresh |

## Testing Strategy

1. Start fresh Claude Code session
2. Time to first crash (target: never)
3. Memory usage monitoring
4. Non-Claude tool testing (Cursor)
