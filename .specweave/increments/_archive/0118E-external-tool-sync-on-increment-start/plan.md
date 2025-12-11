---
increment: 0118E-external-tool-sync-on-increment-start
---

# Technical Plan: External Tool Sync on Increment Start

## Root Cause

The external sync architecture is **COMPLETE and CORRECT**. The bug is simply that `/specweave:increment` does NOT trigger the existing sync flow.

```
CURRENT FLOW (BROKEN):
┌─────────────────────┐
│ /specweave:increment│
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Create spec.md      │
│ Create plan.md      │
│ Create tasks.md     │
│ Create metadata.json│
└──────────┬──────────┘
           ▼
      [STOP HERE] ❌ ← BUG: Missing sync trigger!



CORRECT FLOW (AFTER FIX):
┌─────────────────────┐
│ /specweave:increment│
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Create increment    │
│ files (spec, plan,  │
│ tasks, metadata)    │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ LivingDocsSync      │ ← NEW: Add this trigger!
│ .syncIncrement()    │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Create FS-XXX/      │  Step 1-6
│ FEATURE.md, us-*.md │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ syncToExternalTools │  Step 7 (EXISTING!)
│ → GitHub/JIRA/ADO   │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ GitHub Issues       │  ✅ AUTO-CREATED!
│ Created!            │
└─────────────────────┘
```

## Implementation Strategy

### The Fix is Simple

Add ONE step to `/specweave:increment` command:

```markdown
### Step 10: Trigger Living Docs Sync

After increment files are created:

\`\`\`
🔄 Syncing increment to living docs...
📡 Syncing to external tools (GitHub/JIRA/ADO)...
\`\`\`

Run: /specweave:sync-specs {increment-id}

OR call directly:
\`\`\`typescript
const sync = new LivingDocsSync(projectRoot);
await sync.syncIncrement(incrementId);
\`\`\`
```

This single addition triggers the entire existing cascade:

1. `syncIncrement()` → Creates living docs
2. `syncToExternalTools()` → Detects GitHub from config
3. `syncToGitHub()` → Creates issues via GitHubFeatureSync

## Files to Modify

| File | Change |
|------|--------|
| `plugins/specweave/commands/specweave-increment.md` | Add Step 10 after Step 9 |
| `plugins/specweave/skills/increment-planner/SKILL.md` | Add STEP 8 to workflow |

## What Already Works (NO CHANGES NEEDED)

These files are CORRECT and need NO modification:

| File | Function |
|------|----------|
| `src/core/living-docs/living-docs-sync.ts` | `syncIncrement()` with all steps |
| `syncToExternalTools()` method | Detects GitHub/JIRA/ADO from config |
| `syncToGitHub()` method | Calls GitHubFeatureSync |
| `plugins/specweave-github/lib/github-feature-sync.ts` | Creates issues idempotently |
| `plugins/specweave-github/lib/github-client-v2.ts` | GitHub API wrapper |

## Error Handling

External sync failures are **non-blocking** (already implemented in `syncToExternalTools()`):

```typescript
// From living-docs-sync.ts line 1222-1226
} catch (error) {
  // AC-US5-05: External tool failures are logged but don't break living docs sync
  this.logger.error(`   ⚠️  Failed to sync to ${tool}:`, error);
  this.logger.error(`      Living docs sync will continue...`);
}
```

If sync fails, user can manually retry with:
- `/specweave:sync-specs <increment-id>`
- `/specweave:sync-progress`

## Testing

After implementing the fix:

```bash
# 1. Verify GitHub config exists
cat .specweave/config.json | jq '.sync.github'

# 2. Create test increment
/specweave:increment "test external sync"

# 3. Verify output includes:
#    "📡 Syncing to external tools: github"
#    "✅ Synced to GitHub: X created"

# 4. Verify GitHub issues
gh issue list --label specweave
```

## Summary

**This is a 2-file fix** that adds ONE step to trigger the existing, fully-functional sync cascade. No architectural changes needed.
