# Skill Truncation: Character Budget Limit

## Problem

Claude Code has a **15,000 character default budget** for skill/command descriptions. When you have many plugins installed (like SpecWeave's 24 plugins with ~180 skills), approximately **26% of skills are EXCLUDED** from Claude's context.

**Symptoms:**
- Skills don't auto-activate even when keywords match
- "Multi-domain" requests (e.g., "React + .NET + Stripe") don't trigger relevant skills
- You have to explicitly call skills with `Skill({ skill: "name" })`
- Claude seems unaware of specialized skills that are clearly installed

## Root Cause

Claude Code uses the `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable to limit how many skill descriptions fit in context:

```
Default: 15,000 characters
SpecWeave needs: ~23,000 characters (for 180+ skills)
Result: 46 skills (26%) are EXCLUDED from context!
```

**Evidence** from SpecWeave session analysis:
- Total skills: 179 (82 skills + 97 commands)
- Skills visible in context: ~133
- Skills truncated/excluded: ~46 (26%)

## Solution

### macOS/Linux: Add to Shell Profile

**For zsh (default on modern macOS):**
```bash
# Add to ~/.zshrc
echo 'export SLASH_COMMAND_TOOL_CHAR_BUDGET=30000' >> ~/.zshrc
source ~/.zshrc
```

**For bash:**
```bash
# Add to ~/.bashrc or ~/.bash_profile
echo 'export SLASH_COMMAND_TOOL_CHAR_BUDGET=30000' >> ~/.bashrc
source ~/.bashrc
```

**For fish shell:**
```fish
# Add to ~/.config/fish/config.fish
set -Ux SLASH_COMMAND_TOOL_CHAR_BUDGET 30000
```

### Windows

**PowerShell (User Profile):**
```powershell
# Add to your PowerShell profile
$env:SLASH_COMMAND_TOOL_CHAR_BUDGET = "30000"

# Or add to profile permanently:
Add-Content $PROFILE 'export SLASH_COMMAND_TOOL_CHAR_BUDGET=30000'
```

**Command Prompt (Session):**
```cmd
set SLASH_COMMAND_TOOL_CHAR_BUDGET=30000
```

**Windows Environment Variables (Permanent):**
1. Open "Edit system environment variables"
2. Click "Environment Variables..."
3. Under "User variables", click "New..."
4. Variable name: `SLASH_COMMAND_TOOL_CHAR_BUDGET`
5. Variable value: `30000`
6. Click OK

### Verify the Fix

After setting the environment variable, restart Claude Code and verify:

```bash
# Check if set correctly
echo $SLASH_COMMAND_TOOL_CHAR_BUDGET
# Should output: 30000
```

## Impact on Multi-Domain Requests

### Before Fix (15K budget)

When you say: "Create React dashboard with Stripe checkout and .NET backend"

**What happens:**
- Keyword matching diluted across 3 domains
- Individual skills may not reach activation threshold
- Auto-activation unreliable

**Skills that may NOT activate:**
- `sw-frontend:frontend-architect` (React patterns)
- `sw-payments:stripe-integration` (Stripe patterns)
- `sw-backend:dotnet-backend` (.NET patterns)

### After Fix (30K budget)

**All relevant skills remain in context**, making auto-activation more reliable.

However, even with increased budget, explicit invocation is recommended for multi-domain requests:

```typescript
// Best practice: Explicitly invoke all relevant skills
Skill({ skill: "sw-frontend:frontend-architect" })
Skill({ skill: "sw-payments:stripe-integration" })
Skill({ skill: "sw-backend:dotnet-backend" })
```

## Why Explicit Invocation is Still Better

Even with 30K budget, **explicit skill invocation is more reliable** because:

1. **Keyword dilution**: "React + .NET + Stripe" doesn't cleanly match any single skill
2. **Context compaction**: Skills may still be summarized during long conversations
3. **Deterministic behavior**: Explicit calls guarantee skill activation

**Recommended Pattern:**

```typescript
// For multi-domain requests, ALWAYS invoke explicitly:
Skill({ skill: "sw:increment" })                  // Planning
Skill({ skill: "sw-frontend:frontend-architect" }) // React patterns
Skill({ skill: "sw-backend:dotnet-backend" })     // .NET patterns
Skill({ skill: "sw-payments:stripe-integration" }) // Stripe patterns
// After code generation:
// LSP works AUTOMATICALLY - use "findReferences" and "goToDefinition" for code quality
```

## Recommended Values

| Scenario | Budget | Notes |
|----------|--------|-------|
| Default | 15,000 | Too small for SpecWeave |
| **SpecWeave (recommended)** | **30,000** | All skills fit |
| Heavy plugin usage | 40,000 | Multiple marketplaces |
| Maximum | 60,000 | Use with caution (context cost) |

## Trade-offs

| Budget | Pros | Cons |
|--------|------|------|
| 15K (default) | Lower context usage | Skills truncated |
| 30K (recommended) | All SpecWeave skills | Slightly higher context |
| 60K+ | All plugins fit | High context cost, slower |

## Related Documentation

- [Lazy Plugin Loading](/docs/guides/lazy-plugin-loading) - Future solution for token efficiency
- [Skills Auto-Activation](https://docs.anthropic.com/claude-code/skills) - Claude Code official docs
- [Context Forking](/docs/features/context-forking) - Isolated skill execution

## YouTube Script Mention

When creating content about SpecWeave skill usage, mention:

> "If your SpecWeave skills aren't auto-activating, you may be hitting the default 15,000 character budget for skill descriptions. SpecWeave has over 180 skills, requiring about 23,000 characters. Add `export SLASH_COMMAND_TOOL_CHAR_BUDGET=30000` to your shell profile (like `.zshrc`) to fix this. But remember: for multi-domain requests like 'React + .NET + Stripe', explicit skill invocation is still more reliable than auto-activation."

---

**Last Updated**: 2026-01-27
