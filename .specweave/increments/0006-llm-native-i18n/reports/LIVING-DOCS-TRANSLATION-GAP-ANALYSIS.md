# Living Docs Translation Gap - Root Cause Analysis

**Date**: 2025-11-07
**Severity**: 🔴 CRITICAL
**Increment**: 0006-llm-native-i18n
**Reporter**: User feedback (real-world project)

---

## Executive Summary

**THE PROBLEM**: When users create increments in non-English languages (e.g., Russian), **living docs specs in `.specweave/docs/internal/specs/` are created in the user's language but NEVER translated to English**. This breaks the fundamental architecture principle that "all documentation must be in English for maintainability."

**THE IMPACT**:
- ❌ Living docs (permanent source of truth) accumulate in non-English languages
- ❌ Framework becomes unmaintainable for international contributors
- ❌ Violates core principle: "User works in native language, docs stored in English"
- ❌ Inconsistency: Increment files get translated, living docs don't

**THE ROOT CAUSE**: Translation architecture has a **critical gap** - it only translates increment files, not living docs.

---

## Real-World Example

User created a project with Russian language:

```bash
# 1. User creates increment in Russian
/specweave:increment "AI-генератор мемов"

# 2. PM agent creates:
.specweave/increments/0001-ai-meme-generator/
├── spec.md                          ✅ Translated to English
├── plan.md                          ✅ Translated to English
└── tasks.md                         ✅ Translated to English

.specweave/docs/internal/specs/
└── spec-0001-ai-meme-generator.md   ❌ STAYS IN RUSSIAN!
```

**Terminal output shows Russian**:
```
✅ Инкремент 0001-ai-meme-generator успешно создан!
📋 Созданные файлы
...
Living Docs (Постоянные, источник истины)
...
```

**Result**: Living docs permanently in Russian, breaking maintainability.

---

## Architecture Analysis

### Current Translation Architecture (v0.8.x)

**Two Translation Mechanisms**:

#### 1. post-increment-planning Hook
**Location**: `plugins/specweave/hooks/post-increment-planning.sh`

**What it translates**:
```bash
.specweave/increments/####-name/
├── spec.md     ✅ User language → English
├── plan.md     ✅ User language → English
└── tasks.md    ✅ User language → English
```

**What it DOESN'T translate**:
```bash
.specweave/docs/internal/specs/
└── spec-####-*.md   ❌ NEVER TRANSLATED!
```

**Code Evidence** (post-increment-planning.sh:243-246):
```bash
# 3. Check if files need translation
local spec_file="$increment_dir/spec.md"       # Only increment files
local plan_file="$increment_dir/plan.md"       # Only increment files
local tasks_file="$increment_dir/tasks.md"     # Only increment files
```

**Gap**: Living docs specs are NOT in this list!

#### 2. post-task-completion Hook + translate-living-docs.ts
**Location**: `src/hooks/lib/translate-living-docs.ts`

**What it's SUPPOSED to do**: Translate living docs after task completion

**What it ACTUALLY does**: ❌ WRONG DIRECTION!

**Code Evidence** (translate-living-docs.ts:38-46):
```typescript
if (!config.language || config.language === 'en') {
  // English or no language set - skip translation
  return;
}

if (!config.translation?.autoTranslateLivingDocs) {
  // Auto-translation disabled (DEFAULT!)
  return;
}

console.log(`[translate-living-docs] Auto-translating docs to ${config.language}...`);
//                                                          ^^^^^^^^^^^^^^^^^^^^
//                                                          WRONG! Should be "to English"
```

**Two Bugs**:
1. **Disabled by default**: `"default": false` in schema (line 177)
2. **Wrong direction**: Translates TO user's language instead of TO English

---

## Gap Matrix

| File Location | Created In | Translated To | Status |
|--------------|------------|---------------|--------|
| **Increment Files** | | | |
| `.specweave/increments/####/spec.md` | User language | English | ✅ WORKS |
| `.specweave/increments/####/plan.md` | User language | English | ✅ WORKS |
| `.specweave/increments/####/tasks.md` | User language | English | ✅ WORKS |
| **Living Docs** | | | |
| `.specweave/docs/internal/specs/spec-####-*.md` | User language | ❌ NEVER | 🔴 BROKEN |
| `.specweave/docs/internal/strategy/**/*.md` | User language | ❌ NEVER | 🔴 BROKEN |
| `.specweave/docs/internal/architecture/adr/*.md` | User language | ❌ NEVER | 🔴 BROKEN |

**Result**: 66% of documentation is NOT translated (living docs are majority)!

---

## Why This is Critical

### 1. Living Docs are the Permanent Source of Truth

From CLAUDE.md:
> **Living Docs Specs = Permanent, Feature-Level Knowledge Base**
> - Location: `.specweave/docs/internal/specs/spec-NNN-feature-area.md`
> - Purpose: COMPLETE, PERMANENT source of truth for entire feature area
> - Lifecycle: Created once, updated over time, NEVER deleted

If living docs accumulate in non-English languages, the ENTIRE knowledge base becomes unmaintainable.

### 2. Violates Core Architecture Principle

From increment 0006 spec:
> **Post-Generation Translation**:
> - User works in native language (great UX)
> - Framework translates to English automatically (maintainable docs)

**Current reality**: Only 33% of docs get translated (increment files only).

### 3. Incremental files are TEMPORARY, living docs are PERMANENT

From CLAUDE.md:
> **Increment Specs = Temporary, Focused Implementation Snapshot**
> - Can be deleted after completion
>
> **Living Docs Specs = Permanent, Feature-Level Knowledge Base**
> - NEVER deleted

**Irony**: We translate temporary files but NOT permanent files!

### 4. Real-World Impact

For the user's Russian project:
- ✅ Increment specs: Translated to English (can be deleted after)
- ❌ Living docs specs: Stay in Russian FOREVER
- ❌ ADRs: Stay in Russian FOREVER
- ❌ Strategy docs: Stay in Russian FOREVER

**Future**: New developer joins → "Why are all docs in Russian?" → Cannot contribute.

---

## Root Causes

### RC-1: Narrow Scope of post-increment-planning Hook

**Code**: `plugins/specweave/hooks/post-increment-planning.sh:243-246`

```bash
# Only checks increment files, not living docs
local spec_file="$increment_dir/spec.md"
local plan_file="$increment_dir/plan.md"
local tasks_file="$increment_dir/tasks.md"
```

**Should be**:
```bash
# Check both increment files AND living docs
local increment_files=("$increment_dir/spec.md" "$increment_dir/plan.md" "$increment_dir/tasks.md")
local living_docs_files=(.specweave/docs/internal/specs/spec-*.md)
```

### RC-2: Wrong Direction in translate-living-docs.ts

**Code**: `src/hooks/lib/translate-living-docs.ts:48`

```typescript
console.log(`[translate-living-docs] Auto-translating docs to ${config.language}...`);
//                                                          TO USER'S LANGUAGE ❌
```

**Should be**:
```typescript
console.log(`[translate-living-docs] Auto-translating docs to English...`);
//                                                          TO ENGLISH ✅
```

### RC-3: Disabled by Default

**Code**: `src/core/schemas/specweave-config.schema.json:177`

```json
"autoTranslateLivingDocs": {
  "type": "boolean",
  "description": "Automatically translate living docs updates after task completion",
  "default": false  // ❌ DISABLED BY DEFAULT
}
```

**Should be**:
```json
"default": true  // ✅ ENABLED BY DEFAULT
```

### RC-4: Timing Issue

**When does translation happen?**

- **post-increment-planning**: Fires ONCE after `/specweave:increment` completes
- **post-task-completion**: Fires AFTER EVERY TASK (including during `/specweave:do`)

**Problem**: Living docs specs are created by PM agent during `/specweave:increment`, but:
- post-increment-planning doesn't translate them
- post-task-completion fires too late (after implementation)

**Timing gap**: Living docs created → sit in Russian for hours/days → never translated

---

## Proposed Solutions

### Option 1: Extend post-increment-planning Hook (✅ RECOMMENDED)

**Approach**: Add living docs translation to existing hook

**Changes**:
1. After translating increment files, also translate living docs specs
2. Detect newly created files in `.specweave/docs/internal/specs/`
3. Translate them User language → English
4. Keep all translation in one place (post-increment-planning)

**Implementation**:

```bash
# plugins/specweave/hooks/post-increment-planning.sh

# After line 274 (increment files translation), add:

# 5. Translate newly created living docs specs
log_info ""
log_info "🌐 Checking living docs for translation..."

living_docs_dir=".specweave/docs/internal/specs"
if [ -d "$living_docs_dir" ]; then
  # Find specs created in last 5 minutes (recently created)
  newly_created_specs=$(find "$living_docs_dir" -name "spec-*.md" -mmin -5 2>/dev/null)

  for spec_file in $newly_created_specs; do
    # Detect language
    spec_lang=$(detect_file_language "$spec_file")

    if [ "$spec_lang" = "non-en" ]; then
      log_info "  📄 Translating living docs spec: $(basename $spec_file)..."
      translate_file "$spec_file"
    fi
  done
fi
```

**Benefits**:
- ✅ All translation happens at increment creation time
- ✅ Single place to maintain translation logic
- ✅ No changes needed to translate-living-docs.ts
- ✅ Works for all living docs created by PM agent

**Limitations**:
- Doesn't handle ADRs/HLDs created during implementation (but those can be handled by post-task-completion)

---

### Option 2: Fix translate-living-docs.ts (⚠️ PARTIAL SOLUTION)

**Approach**: Fix the direction and enable by default

**Changes**:

1. **Fix direction** (`src/hooks/lib/translate-living-docs.ts:38-48`):
```typescript
// OLD (WRONG):
if (!config.language || config.language === 'en') {
  return;  // Skip translation if English
}
console.log(`Auto-translating docs to ${config.language}...`);

// NEW (CORRECT):
if (config.language === 'en') {
  return;  // Skip translation if already English
}
console.log(`Auto-translating docs from ${config.language} to English...`);
```

2. **Enable by default** (`src/core/schemas/specweave-config.schema.json:177`):
```json
"autoTranslateLivingDocs": {
  "type": "boolean",
  "description": "Automatically translate living docs to English after updates",
  "default": true  // Changed from false
}
```

3. **Fix translation call** (`src/hooks/lib/translate-living-docs.ts:63`):
```typescript
// OLD (WRONG):
await translateFile(file, config.language, config.translation);

// NEW (CORRECT):
await translateFile(file, 'en', config.translation);  // Always translate TO English
```

**Benefits**:
- ✅ Fixes direction (to English, not to user's language)
- ✅ Enables automatic translation

**Limitations**:
- ⚠️ Runs after EVERY task (overhead)
- ⚠️ May miss files created during increment planning (timing issue)
- ⚠️ Uses git diff (may not detect all files)

---

### Option 3: Hybrid Approach (🎯 BEST SOLUTION)

**Approach**: Combine both fixes for comprehensive coverage

**Phase 1**: post-increment-planning (for specs created by PM agent)
- Translate increment files (spec.md, plan.md, tasks.md) ✅ Already works
- Translate living docs specs (spec-####-*.md) ✅ NEW
- Translate strategy docs (overview.md, etc.) ✅ NEW

**Phase 2**: post-task-completion (for docs created during implementation)
- Translate ADRs created by Architect agent
- Translate HLDs/diagrams created by Tech Lead
- Translate any other living docs modified during work

**Implementation**:

**File 1**: `plugins/specweave/hooks/post-increment-planning.sh` (extend existing)
```bash
# Add after increment files translation:

# 5. Translate living docs created by PM agent
translate_living_docs_specs() {
  local increment_id="$1"

  # Find all living docs specs created in last 5 minutes
  local specs_dir=".specweave/docs/internal/specs"
  local strategy_dir=".specweave/docs/internal/strategy"

  for dir in "$specs_dir" "$strategy_dir"; do
    if [ -d "$dir" ]; then
      find "$dir" -type f -name "*.md" -mmin -5 | while read -r file; do
        local lang=$(detect_file_language "$file")
        if [ "$lang" = "non-en" ]; then
          translate_file "$file"
        fi
      done
    fi
  done
}

# Call it after increment files translation
translate_living_docs_specs "$increment_id"
```

**File 2**: `src/hooks/lib/translate-living-docs.ts` (fix direction)
```typescript
// Change line 38-48:
if (config.language === 'en') {
  return;  // Already English, skip
}

console.log(`[translate-living-docs] Auto-translating docs to English...`);
//                                                          ^^^ Fixed!

// Change line 63:
await translateFile(file, 'en', config.translation);  // Always to English
```

**File 3**: `src/core/schemas/specweave-config.schema.json` (enable by default)
```json
"autoTranslateLivingDocs": {
  "type": "boolean",
  "description": "Automatically translate living docs to English after task completion",
  "default": true  // Enabled by default
}
```

**Benefits**:
- ✅ Comprehensive coverage (all living docs translated)
- ✅ Correct timing (increment planning + task completion)
- ✅ Handles all scenarios (PM agent + Architect agent + manual edits)
- ✅ No gaps in translation

---

## Migration Path

### For Existing Projects with Non-English Living Docs

**Problem**: Projects already have living docs in non-English languages

**Solution**: One-time migration script

```bash
# .specweave/scripts/translate-all-living-docs.sh

#!/bin/bash

# Translate all existing living docs to English
find .specweave/docs/internal -type f -name "*.md" | while read -r file; do
  # Detect language
  lang=$(detect_language "$file")

  if [ "$lang" != "en" ]; then
    echo "Translating: $file"
    node dist/hooks/lib/translate-file.js "$file" --target-lang en --verbose
  fi
done

echo "✅ Migration complete!"
```

**Usage**:
```bash
# One-time migration for existing projects
bash .specweave/scripts/translate-all-living-docs.sh
```

---

## Testing Plan

### Test Case 1: New Project (Russian → English)

```bash
# 1. Initialize project in Russian
specweave init --language ru

# 2. Create increment in Russian
/specweave:increment "Добавить чат-бот"

# 3. Verify translation
cat .specweave/increments/0001-*/spec.md  # Should be English ✅
cat .specweave/docs/internal/specs/spec-0001-*.md  # Should be English ✅ (FIXED!)
```

**Expected**: All files in English, no Russian content

### Test Case 2: Mixed Languages (Chinese → English)

```bash
# 1. Project in Chinese
specweave init --language zh

# 2. Create increment
/specweave:increment "添加支付功能"

# 3. Verify translation
# All living docs should be in English, not Chinese
```

### Test Case 3: ADRs Created During Implementation

```bash
# 1. Start increment
/specweave:do 0001

# 2. Architect agent creates ADR in Russian
# (manually or via agent)

# 3. After task completion, verify ADR translated to English
cat .specweave/docs/internal/architecture/adr/0001-*.md  # Should be English ✅
```

---

## Recommendations

### Immediate Actions (Critical)

1. **Implement Option 3 (Hybrid Approach)** - Comprehensive solution
2. **Add E2E test for living docs translation** - Prevent regression
3. **Update CLAUDE.md** - Document correct translation flow
4. **Create migration script** - Help existing projects

### Medium-Term Actions

1. **Add validation to `/specweave:done`** - Check all docs are in English before closing increment
2. **Add linting rule** - Detect non-English content in living docs
3. **Add CI check** - Block PRs with non-English living docs

### Long-Term Actions

1. **Improve language detection** - Use better heuristics or LLM
2. **Add translation preview** - Show before/after before applying
3. **Add translation undo** - Roll back if translation fails

---

## Success Metrics

### Before Fix
- ❌ 66% of documentation not translated (living docs)
- ❌ Users see Russian/Chinese in living docs permanently
- ❌ Framework unmaintainable for international contributors

### After Fix
- ✅ 100% of documentation translated to English
- ✅ Users work in native language, docs stay in English
- ✅ Framework maintainable for all contributors

---

## Conclusion

**The translation architecture has a critical gap** that breaks the core principle of "user works in native language, docs stored in English."

**Root causes**:
1. post-increment-planning hook only translates increment files, not living docs
2. translate-living-docs.ts translates in wrong direction (to user's language)
3. Living docs translation disabled by default
4. Timing issues (living docs created but not translated)

**Recommended fix**: **Option 3 (Hybrid Approach)**
- Extend post-increment-planning to translate living docs specs
- Fix translate-living-docs.ts direction and enable by default
- Comprehensive coverage for all scenarios

**Impact**: Restore the architectural principle that ALL documentation is in English for maintainability.

---

**Next Steps**:
1. Review this analysis with maintainer
2. Implement Option 3 (estimated 2-4 hours)
3. Add E2E tests for living docs translation
4. Update documentation (CLAUDE.md, user guides)
5. Create migration script for existing projects

**Priority**: 🔴 CRITICAL - Affects framework maintainability and core architecture principles
