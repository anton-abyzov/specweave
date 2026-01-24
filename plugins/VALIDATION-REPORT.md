# LLM-as-Judge Validation Report

> Validation date: 2026-01-24
> Validated against: Official Claude Code documentation (https://code.claude.com/docs/en/skills)

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| Total Skills | 100+ | Audited |
| `allowed-tools:` (correct) | 51 | ✅ PASS |
| `tools:` (incorrect) | 6 | ❌ FAIL - needs fix |
| `context: fork` (for isolation) | 44 | ✅ PASS |
| No agents folders remaining | 0 | ✅ PASS |

## Critical Issues Found

### Issue 1: Incorrect `tools:` Frontmatter (6 files)

Per official Claude Code documentation, the correct field is `allowed-tools:`, NOT `tools:`.

**Affected files:**
1. `plugins/specweave-diagrams/skills/diagrams-architect/SKILL.md`
2. `plugins/specweave-backend/skills/python-backend/SKILL.md`
3. `plugins/specweave-backend/skills/nodejs-backend/SKILL.md`
4. `plugins/specweave-backend/skills/dotnet-backend/SKILL.md`
5. `plugins/specweave-ado/skills/ado-mapper/SKILL.md`
6. `plugins/specweave-jira/skills/jira-mapper/SKILL.md`

**Fix required:**
```yaml
# BEFORE (incorrect)
tools: Read, Write, Edit, Bash

# AFTER (correct)
allowed-tools: Read, Write, Edit, Bash
```

**Impact:** These skills may not have proper tool permissions when activated.

## Validation Checklist

### Frontmatter Fields (Per Official Docs)

| Field | Usage | Validated |
|-------|-------|-----------|
| `name` | Display name | ✅ Present in all skills |
| `description` | Keywords for auto-activation | ✅ Present in all skills |
| `allowed-tools` | Tool permissions | ⚠️ 6 files use wrong format |
| `model` | Model override | ✅ Where applicable |
| `context` | `fork` for isolation | ✅ 44 skills have it |
| `disable-model-invocation` | Prevent auto-trigger | N/A (commands) |
| `user-invocable` | Hide from menu | N/A (background skills) |

### Agent-to-Skill Conversion Quality

| Aspect | Status | Notes |
|--------|--------|-------|
| All agents deleted | ✅ PASS | No `agents/` folders remain |
| Correct frontmatter format | ⚠️ 94% | 6 files need `tools:` → `allowed-tools:` |
| `context: fork` for domain experts | ✅ PASS | All converted agents have it |
| Keyword-rich descriptions | ✅ PASS | Good auto-activation coverage |
| Model specified | ✅ PASS | Most use `model: opus` |

### Skill Organization

| Pattern | Count | Recommendation |
|---------|-------|----------------|
| Task skills (context: fork) | 44 | ✅ Correct |
| Reference skills (no fork) | ~60 | ✅ Correct (knowledge-based) |
| Commands (disable-model-invocation) | 168 | ⚠️ Consider adding flag to critical ones |

## Recommendations

### HIGH PRIORITY

1. **Fix 6 skills with `tools:` → `allowed-tools:`**
   - Immediate fix required
   - Script provided below

### MEDIUM PRIORITY

2. **Add `disable-model-invocation: true` to critical commands**
   - `/sw:do`, `/sw:done`, `/sw:auto`
   - `/sw:save`, `/sw:npm`
   - `/sw-github:sync`, `/sw-github:push`
   - `/sw-jira:sync`, `/sw-ado:sync`

### LOW PRIORITY

3. **Consider migrating some commands to skills** (optional)
   - Status/info commands could benefit from auto-activation
   - Not required - commands work fine

## Fix Script

```bash
#!/bin/bash
# Fix tools: → allowed-tools: in SKILL.md files

files=(
  "plugins/specweave-diagrams/skills/diagrams-architect/SKILL.md"
  "plugins/specweave-backend/skills/python-backend/SKILL.md"
  "plugins/specweave-backend/skills/nodejs-backend/SKILL.md"
  "plugins/specweave-backend/skills/dotnet-backend/SKILL.md"
  "plugins/specweave-ado/skills/ado-mapper/SKILL.md"
  "plugins/specweave-jira/skills/jira-mapper/SKILL.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    sed -i '' 's/^tools:/allowed-tools:/' "$file"
    echo "Fixed: $file"
  fi
done
```

## Conclusion

The agent-to-skill conversion was **94% successful**. Only 6 files need a minor frontmatter fix (`tools:` → `allowed-tools:`).

**Overall Grade: A-** (Excellent with minor fixes needed)

The conversion follows official Claude Code best practices:
- ✅ Skills with `context: fork` for domain experts
- ✅ Reference skills without fork for knowledge
- ✅ Keyword-rich descriptions for auto-activation
- ✅ Proper tool permissions (after fix)
- ✅ No agents folders remaining

## References

- Official Skills Docs: https://code.claude.com/docs/en/skills
- Official Subagents Docs: https://code.claude.com/docs/en/sub-agents
