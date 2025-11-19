# Critical Bugs Prevention Guide

**Last Updated**: 2025-11-19
**Version**: 1.0.0

## Purpose

This document prevents recurrence of **critical regression bugs** that broke core functionality in production. All future code changes MUST follow these rules.

---

## 🚨 CRITICAL RULE #1: Never Remove Architecture Options Without Testing

### What Happened (2025-11-19)

**Commit**: `e221b57` - "simplify GitHub-only architecture to 2 options"

**Intent**: Simplify user experience by reducing architecture options from 5 to 2.

**Actual Impact**: **BROKE PARENT REPOSITORY CREATION ON GITHUB** 🔥

### The Bug

```typescript
// BEFORE (5 options)
export type ArchitectureChoice = 'single' | 'multi-with-parent' | 'local-parent' | ...

// AFTER (2 options) - ❌ REMOVED 'github-parent'!
export type ArchitectureChoice = 'single' | 'local-parent';

// Result: GitHub parent creation HARDCODED to false
case 'parent':
  return this.configureMultiRepo(true, true); // ❌ Second 'true' = local-only!
```

**Impact**:
- Users selecting "multi-repo with parent" got **local-only parent** (not synced to GitHub)
- Parent repo creation API call **never executed**
- Setup summary **lied** (showed parent repo as created when it wasn't)
- Issue discovered in production by user Anton

### Prevention Rules

✅ **BEFORE removing ANY architecture option**:
1. Search codebase for ALL references: `git grep -i "option-name"`
2. Check `mapArchitectureChoice()` logic for hardcoded defaults
3. Verify `configureMultiRepo()` call sites don't hardcode parameters
4. Run ALL integration tests: `npm run test:integration`
5. Test the EXACT user flow being removed (manual E2E)

✅ **REQUIRED validation before commit**:
```bash
# Test parent repo creation
cd /tmp
specweave init test-github-parent
# Select: "Parent repo + nested repos (GitHub)"
# Verify: Parent repo created on GitHub (check GitHub web UI)
```

✅ **Code review checklist**:
- [ ] Did commit remove an architecture option?
- [ ] Are there hardcoded boolean flags in routing logic?
- [ ] Does setupSummary show truth or config expectations?
- [ ] Are integration tests updated to match new options?

---

## 🚨 CRITICAL RULE #2: Plugin Metadata MUST Be Fully Validated

### What Happened (2025-11-19)

**Symptom**: 95% of plugins failed to install with "not found in any configured marketplace"

**Root Cause**: Premature cache validation - marked "ready" before plugin metadata loaded.

### The Bug

```typescript
// ❌ WRONG: Only checked file exists + count
if (cacheData.plugins && cacheData.plugins.length >= 25) {
  cacheReady = true; // ❌ Metadata might be incomplete!
}
```

**Timeline**:
1. `marketplace.json` file created ✅
2. Plugins array populated (25 items) ✅
3. **Cache marked "ready in 0s"** ✅ ❌ (PREMATURE!)
4. Plugin metadata fetched (name, version, description) ← **MISSING**
5. Install attempts fail: "plugin not found"

### Prevention Rules

✅ **ALWAYS validate data completeness, not just presence**:
```typescript
// ✅ CORRECT: Verify EVERY plugin has required metadata
const hasMetadata = cacheData.plugins.every((p: any) =>
  p.name && p.version && p.description
);

if (hasMetadata) {
  cacheReady = true; // ✅ Metadata complete!
}
```

✅ **Test with fresh cache**:
```bash
# Delete cache and verify rebuild
rm -rf ~/.claude/plugins/marketplaces/specweave/marketplace.json
specweave init test-project
# Verify: ALL plugins install successfully (25/25)
```

✅ **Monitor cache timing**:
- If "Cache ready in 0s" → 🚨 **RED FLAG** - data incomplete!
- Expect 1-3s minimum for metadata fetch
- Add debug logging for plugin metadata state

---

## 🚨 CRITICAL RULE #3: Test Summary Output vs Reality

### What Happened

**Setup summary** showed:
```
📦 Created Repositories (3 total):
   1. Parent: https://github.com/user/parent ✅
   2. Frontend: ... ✅
   3. Backend: ... ✅
```

**Reality** (GitHub API):
```
Created: frontend, backend
NOT created: parent ❌
```

**Root Cause**: Summary generated from **CONFIG** (what SHOULD happen), not from **actual results** (what DID happen).

### Prevention Rules

✅ **Summary MUST show actual results**:
```typescript
// ❌ WRONG
showSummary(config); // Shows intended state

// ✅ CORRECT
showSummary(config, actualCreated, actualFailed); // Shows reality
```

✅ **Track operation results**:
```typescript
const created: string[] = [];
const failed: string[] = [];

for (const repo of config.repositories) {
  try {
    await createRepo(repo);
    created.push(repo.name); // ✅ Track success
  } catch (error) {
    failed.push(`${repo.name}: ${error.message}`); // ✅ Track failure
  }
}

// ✅ Display ACTUAL results
console.log(`Created: ${created.join(', ')}`);
if (failed.length > 0) {
  console.error(`Failed: ${failed.join(', ')}`);
}
```

✅ **Validation checklist**:
- [ ] Does summary show `created` array or `config` array?
- [ ] Are failures logged and displayed to user?
- [ ] Can user tell what actually happened vs what was planned?

---

## 🚨 CRITICAL RULE #4: Architecture Simplification Process

### When Simplifying User Choices

✅ **REQUIRED steps** (all mandatory, no exceptions):

1. **Document Why** (write ADR in `.specweave/docs/internal/architecture/adr/`)
   - What problem does simplification solve?
   - What user pain does it address?
   - What are the risks?

2. **Map Migration Path** (for existing users)
   - How do brownfield projects migrate?
   - Are old options still supported?
   - Deprecation timeline?

3. **Update ALL Tests** (before merging):
   - Unit tests expect new option count
   - Integration tests cover new flow
   - E2E tests validate user journey

4. **Manual Testing** (cannot skip):
   - Test EVERY removed option's alternative
   - Verify error messages for deprecated choices
   - Check GitHub/JIRA/ADO integrations still work

5. **Staged Rollout**:
   - Release as minor version (0.23.0, not 0.22.11)
   - Beta test with 3+ real projects
   - Monitor GitHub issues for 1 week before marking stable

---

## 🚨 CRITICAL RULE #5: Pre-Commit Validation

### Add to `.git/hooks/pre-commit`

```bash
#!/bin/bash

# Check for architecture changes
if git diff --cached | grep -q "ArchitectureChoice\|configureMultiRepo"; then
  echo "⚠️  Architecture change detected!"
  echo "   REQUIRED checks:"
  echo "   1. Run integration tests: npm run test:integration"
  echo "   2. Manual test: specweave init /tmp/test-arch"
  echo "   3. Verify parent repo creation on GitHub"
  echo ""
  read -p "   All checks passed? (yes/no): " response
  if [ "$response" != "yes" ]; then
    echo "❌ Commit blocked - complete architecture validation first"
    exit 1
  fi
fi

# Check for cache/marketplace changes
if git diff --cached | grep -q "marketplace.json\|cacheReady\|pluginMetadata"; then
  echo "⚠️  Plugin cache change detected!"
  echo "   REQUIRED checks:"
  echo "   1. Delete cache: rm -rf ~/.claude/plugins/marketplaces/specweave/marketplace.json"
  echo "   2. Run: specweave init /tmp/test-cache"
  echo "   3. Verify: ALL 25 plugins install successfully"
  echo ""
  read -p "   All plugins installed? (yes/no): " response
  if [ "$response" != "yes" ]; then
    echo "❌ Commit blocked - verify plugin installation first"
    exit 1
  fi
fi
```

---

## 🚨 CRITICAL RULE #6: Release Checklist

### Before ANY npm publish

✅ **Validation steps** (no exceptions):

```bash
# 1. Build succeeds
npm run rebuild

# 2. All tests pass
npm run test:all

# 3. Fresh init works
rm -rf ~/.claude/plugins/marketplaces/specweave/marketplace.json
cd /tmp && specweave init test-release-$(date +%s)
# Verify: 25/25 plugins install

# 4. GitHub multi-repo works
cd /tmp/test-release-*
# Select: "Parent repo + nested repos (GitHub)"
# Verify: Parent repo created on GitHub

# 5. Smoke test critical workflows
/specweave:increment "test feature"
/specweave:do
/specweave:done

# 6. Version bump
npm version patch -m "chore(release): ..."

# 7. Push
git push origin develop --follow-tags

# 8. Publish
npm publish --access public
```

---

## Summary: Never Again Checklist

When changing **ANY** of these areas, follow corresponding rules:

| Change Area | Rules to Follow | Tests Required |
|-------------|----------------|----------------|
| Architecture options | #1, #3, #4, #5 | Integration + Manual E2E |
| Plugin installation | #2, #3, #5 | Fresh cache test |
| Setup summary | #3 | Verify actual vs config |
| Cache validation | #2, #5 | Delete cache + reinstall |
| Release | #6 | All tests + fresh init |

**Remember**: Production bugs are 100x more expensive than test time. **NEVER skip validation**.

---

## Incident Reference

- **Date**: 2025-11-19
- **Reporter**: Anton Abyzov (user)
- **Issue**: Parent repository not created on GitHub
- **Fix**: Commits `e06be27` (restore option) + `232d86d` (cache fix)
- **Release**: v0.22.11
- **Status**: ✅ Fixed and published
