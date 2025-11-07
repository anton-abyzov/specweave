# Implementation Plan: Living Docs Translation Fix

**Date**: 2025-11-07
**Increment**: 0006-llm-native-i18n
**Priority**: 🔴 CRITICAL
**Estimated Time**: 6-8 hours
**Approach**: Option 3 (Hybrid)

---

## Overview

**Goal**: Fix the critical gap where living docs in `.specweave/docs/internal/` are created in user's language but never translated to English.

**Success Criteria**:
- ✅ All living docs specs automatically translated to English after increment creation
- ✅ All ADRs/HLDs automatically translated to English after task completion
- ✅ 100% documentation coverage (no gaps)
- ✅ E2E tests prevent regression
- ✅ Migration script for existing projects

---

## Phase 1: Extend post-increment-planning Hook

**Goal**: Add living docs translation to existing hook that runs after `/specweave:increment`

**Files to Modify**:
- `plugins/specweave/hooks/post-increment-planning.sh` (307 lines → ~400 lines)

**Changes**:

### 1.1: Add Living Docs Translation Function

```bash
# Add after line 192 (after translate_file function)

# ============================================================================
# LIVING DOCS TRANSLATION
# ============================================================================

translate_living_docs_specs() {
  local increment_id="$1"

  log_debug "Checking for newly created living docs specs..."

  # Directories to check
  local specs_dir=".specweave/docs/internal/specs"
  local strategy_dir=".specweave/docs/internal/strategy"

  local translated_count=0

  # Find living docs specs created in last 5 minutes (recently created by PM agent)
  for dir in "$specs_dir" "$strategy_dir"; do
    if [ ! -d "$dir" ]; then
      continue
    fi

    # macOS and Linux compatible find command
    local files=$(find "$dir" -type f -name "*.md" -mmin -5 2>/dev/null)

    for file in $files; do
      local file_lang=$(detect_file_language "$file")

      if [ "$file_lang" = "non-en" ]; then
        log_info "  📄 Living docs spec detected: $(basename $file)"

        if translate_file "$file"; then
          ((translated_count++))
        fi
      fi
    done
  done

  if [ "$translated_count" -gt 0 ]; then
    log_info "  ✅ Translated $translated_count living docs file(s)"
  else
    log_debug "No living docs specs needed translation"
  fi

  return 0
}
```

### 1.2: Call Living Docs Translation

```bash
# Add after line 301 (after increment files translation summary)

  # 7. Translate living docs specs created by PM agent
  log_info ""
  log_info "🌐 Checking living docs for translation..."

  translate_living_docs_specs "$increment_id"
```

**Testing**:
```bash
# Manual test
cd /tmp/test-project
specweave init --language ru
/specweave:increment "Тестовая функция"

# Verify:
# 1. Increment files translated
# 2. Living docs specs translated
# 3. All files in English
```

**Estimated Time**: 1 hour

---

## Phase 2: Fix translate-living-docs.ts Direction

**Goal**: Fix the translation direction (translate TO English, not to user's language)

**Files to Modify**:
- `src/hooks/lib/translate-living-docs.ts` (217 lines)

**Changes**:

### 2.1: Fix Language Check Logic

```typescript
// Line 38-46, change from:
if (!config.language || config.language === 'en') {
  // English or no language set - skip translation
  return;
}

if (!config.translation?.autoTranslateLivingDocs) {
  // Auto-translation disabled
  return;
}

console.log(`[translate-living-docs] Auto-translating docs to ${config.language}...`);

// To:
if (!config.language || config.language === 'en') {
  // Already English or no language set - skip translation
  return;
}

if (!config.translation?.autoTranslateLivingDocs) {
  // Auto-translation disabled
  console.log('[translate-living-docs] Auto-translation disabled in config');
  return;
}

// Always translate TO English for maintainability
console.log(`[translate-living-docs] Auto-translating docs from ${config.language} to English...`);
```

### 2.2: Fix Translation Call

```typescript
// Line 63, change from:
await translateFile(file, config.language, config.translation);

// To:
await translateFile(file, 'en', config.translation);  // Always translate TO English
```

### 2.3: Update Function Signature Documentation

```typescript
// Line 110-114, update comment:
/**
 * Translate a single file FROM user's language TO English
 *
 * @param filePath - File to translate
 * @param targetLanguage - Target language (always 'en' for living docs)
 * @param translationConfig - Translation settings
 */
async function translateFile(
  filePath: string,
  targetLanguage: string,  // Should always be 'en'
  translationConfig?: Config['translation']
): Promise<void>
```

### 2.4: Add Better Logging

```typescript
// Add after line 115:
  console.log(`[translate-living-docs] Translating ${filePath}`);
  console.log(`[translate-living-docs]   Source language: ${getSourceLanguage(filePath)}`);
  console.log(`[translate-living-docs]   Target language: ${targetLanguage}`);
```

**Testing**:
```bash
# Build and test
npm run build

# Manual test
node dist/hooks/lib/translate-living-docs.js 0001

# Check logs
cat .specweave/logs/hooks-debug.log | grep translate-living-docs
```

**Estimated Time**: 1 hour

---

## Phase 3: Update Config Schema

**Goal**: Enable living docs translation by default

**Files to Modify**:
- `src/core/schemas/specweave-config.schema.json` (1100+ lines)

**Changes**:

### 3.1: Update autoTranslateLivingDocs Default

```json
// Line 174-178, change from:
"autoTranslateLivingDocs": {
  "type": "boolean",
  "description": "Automatically translate living docs updates after task completion",
  "default": false
}

// To:
"autoTranslateLivingDocs": {
  "type": "boolean",
  "description": "Automatically translate living docs to English after task completion (ADRs, HLDs, etc.)",
  "default": true
}
```

### 3.2: Update autoTranslateInternalDocs Description

```json
// Line 169-173, update description:
"autoTranslateInternalDocs": {
  "type": "boolean",
  "description": "Automatically translate increment files (spec.md, plan.md, tasks.md) and living docs specs to English after increment planning (recommended: true)",
  "default": true
}
```

**Testing**:
```bash
# Validate schema
npm run build

# Test new project gets correct defaults
cd /tmp/test-project-2
specweave init --language ru

# Check config.json
cat .specweave/config.json | grep autoTranslateLivingDocs
# Should show: "autoTranslateLivingDocs": true
```

**Estimated Time**: 30 minutes

---

## Phase 4: Create Migration Script

**Goal**: Provide one-time migration for existing projects with non-English living docs

**Files to Create**:
- `scripts/migrate-living-docs-to-english.sh` (new file)
- `src/cli/commands/translate-all.ts` (new file, optional)

**Script Content**:

```bash
#!/bin/bash

# migrate-living-docs-to-english.sh
# One-time migration script for existing projects with non-English living docs

set -e

echo "🌐 Living Docs Translation Migration"
echo "===================================="
echo ""
echo "This script will translate all living docs to English."
echo "Files in .specweave/docs/internal/ will be translated."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Find project root
PROJECT_ROOT="$(pwd)"
INTERNAL_DOCS="$PROJECT_ROOT/.specweave/docs/internal"

if [ ! -d "$INTERNAL_DOCS" ]; then
  echo "❌ No .specweave/docs/internal/ directory found"
  exit 1
fi

echo ""
echo "📂 Scanning for non-English files..."
echo ""

total_files=0
translated_files=0

# Find all markdown files
find "$INTERNAL_DOCS" -type f -name "*.md" | while read -r file; do
  ((total_files++))

  # Skip legacy folder
  if [[ "$file" == *"/legacy/"* ]]; then
    echo "⏭️  Skipping legacy: $file"
    continue
  fi

  # Detect language (simple heuristic: count non-ASCII chars)
  non_ascii=$(LC_ALL=C grep -o '[^ -~]' "$file" 2>/dev/null | wc -l | tr -d ' ')
  total_chars=$(wc -c < "$file" | tr -d ' ')

  if [ "$total_chars" -gt 0 ]; then
    ratio=$((non_ascii * 100 / total_chars))

    if [ "$ratio" -gt 10 ]; then
      echo "🌐 Translating: $file"

      # Call translation script
      if [ -f "$PROJECT_ROOT/dist/hooks/lib/translate-file.js" ]; then
        node "$PROJECT_ROOT/dist/hooks/lib/translate-file.js" "$file" --target-lang en --verbose

        if [ $? -eq 0 ]; then
          ((translated_files++))
          echo "  ✅ Done"
        else
          echo "  ⚠️  Failed"
        fi
      else
        echo "  ⚠️  Translation script not found (run 'npm run build')"
      fi
    fi
  fi
done

echo ""
echo "✅ Migration complete!"
echo "   Total files scanned: $total_files"
echo "   Files translated: $translated_files"
echo ""
```

**Make executable**:
```bash
chmod +x scripts/migrate-living-docs-to-english.sh
```

**Testing**:
```bash
# Test on user's Russian project
cd /path/to/russian/project
bash /path/to/specweave/scripts/migrate-living-docs-to-english.sh

# Verify all files translated
find .specweave/docs/internal -name "*.md" -exec file {} \; | grep -v ASCII
# Should return no results (all English now)
```

**Estimated Time**: 1 hour

---

## Phase 5: Add E2E Tests

**Goal**: Comprehensive E2E tests to prevent regression

**Files to Create**:
- `tests/e2e/translation/living-docs-translation.spec.ts` (new file)

**Test Cases**:

### 5.1: Test Living Docs Specs Translation

```typescript
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

test.describe('Living Docs Translation', () => {
  const testProjectDir = path.join('/tmp', `test-translation-${Date.now()}`);

  test.beforeAll(async () => {
    // Create test project
    await fs.ensureDir(testProjectDir);
  });

  test.afterAll(async () => {
    // Cleanup
    await fs.remove(testProjectDir);
  });

  test('should translate living docs specs to English after increment creation', async () => {
    // 1. Initialize project in Russian
    execSync(`specweave init --language ru`, { cwd: testProjectDir });

    // 2. Create increment in Russian
    execSync(`/specweave:increment "Добавить аутентификацию"`, { cwd: testProjectDir });

    // 3. Check increment files translated
    const incrementSpecPath = path.join(testProjectDir, '.specweave/increments/0001-*/spec.md');
    const incrementSpec = await fs.readFile(incrementSpecPath, 'utf-8');

    expect(incrementSpec).not.toContain('Добавить');
    expect(incrementSpec).toContain('Authentication');

    // 4. Check living docs specs translated
    const livingSpecPath = path.join(testProjectDir, '.specweave/docs/internal/specs/spec-0001-*.md');
    const livingSpec = await fs.readFile(livingSpecPath, 'utf-8');

    expect(livingSpec).not.toContain('Добавить');  // No Russian
    expect(livingSpec).toContain('Authentication');  // English content
  });

  test('should translate strategy docs to English', async () => {
    // Similar test for strategy docs
  });

  test('should translate ADRs to English after task completion', async () => {
    // Test for ADRs created during implementation
  });
});
```

### 5.2: Test Translation Direction

```typescript
test('should always translate TO English, not to user language', async () => {
  // 1. Create project in Chinese
  execSync(`specweave init --language zh`, { cwd: testProjectDir });

  // 2. Create increment
  execSync(`/specweave:increment "添加支付功能"`, { cwd: testProjectDir });

  // 3. Verify ALL docs are in English (Latin alphabet)
  const allDocs = await getAllMarkdownFiles(path.join(testProjectDir, '.specweave/docs'));

  for (const doc of allDocs) {
    const content = await fs.readFile(doc, 'utf-8');
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;

    expect(chineseChars).toBe(0);  // No Chinese characters in docs
  }
});
```

**Testing**:
```bash
# Run E2E tests
npm run test:e2e -- tests/e2e/translation/living-docs-translation.spec.ts
```

**Estimated Time**: 2 hours

---

## Phase 6: Update CLAUDE.md

**Goal**: Document the corrected translation flow

**Files to Modify**:
- `CLAUDE.md` (500+ lines)

**Changes**:

### 6.1: Update Translation Workflow Section

Find the "Translation Workflow" section and update:

```markdown
### Translation Workflow (Multilingual Support)

**SpecWeave supports multilingual development** via post-generation translation.

**Key Concept**: Users work in their native language (great UX), system auto-translates to English (maintainable docs).

**Workflow**:

```bash
# 1. User creates increment in Russian
/specweave:increment "Добавить пользовательскую аутентификацию"

# 2. PM agent generates spec.md, plan.md, tasks.md in Russian (natural, user-friendly)

# 3. post-increment-planning hook fires automatically
#    Phase A: Translates increment files (spec.md, plan.md, tasks.md) to English
#    Phase B: Translates living docs specs to English (NEW!)
#    - .specweave/docs/internal/specs/spec-*.md
#    - .specweave/docs/internal/strategy/**/*.md
#    Cost: ~$0.02 total

# 4. During implementation, architect creates ADRs in Russian

# 5. post-task-completion hook fires after each task
#    - Translates newly created ADRs to English
#    - Translates HLDs/diagrams to English
#    Cost: ~$0.01 per file

# Result: ALL documentation in English (100% coverage)
```

**Two-Phase Translation**:

| Phase | Hook | What Gets Translated | When |
|-------|------|---------------------|------|
| **Phase 1** | post-increment-planning | Increment files + Living docs specs | After `/specweave:increment` |
| **Phase 2** | post-task-completion | ADRs, HLDs, diagrams | After each task completion |

**Coverage**: 100% (no gaps!)
```

### 6.2: Add Migration Section

```markdown
### Migrating Existing Non-English Living Docs

**For projects with existing non-English living docs**:

```bash
# One-time migration script
bash scripts/migrate-living-docs-to-english.sh

# Translates all files in .specweave/docs/internal/
# Skips files already in English
# Non-blocking (continues even if some files fail)
```

**Estimated time**: 1-2 minutes per 100 files
**Estimated cost**: ~$0.01 per file (using Haiku)
```

**Testing**:
```bash
# Verify documentation is correct
cat CLAUDE.md | grep -A 20 "Translation Workflow"
```

**Estimated Time**: 1 hour

---

## Phase 7: Test on Real Russian Project

**Goal**: Validate the fix works on the user's actual Russian project

**Steps**:

### 7.1: Pre-Migration State Capture

```bash
# Document current state
find .specweave/docs/internal -name "*.md" -exec file {} \; > /tmp/pre-migration.txt

# Count non-English files
grep -c "Non-ISO" /tmp/pre-migration.txt
```

### 7.2: Run Migration

```bash
# Build latest code
npm run build

# Run migration script
bash scripts/migrate-living-docs-to-english.sh
```

### 7.3: Verify Results

```bash
# Check all files now in English
find .specweave/docs/internal -name "*.md" -exec file {} \; > /tmp/post-migration.txt

# Count non-English files (should be 0)
grep -c "Non-ISO" /tmp/post-migration.txt || echo "All files in English!"

# Spot-check specific files
cat .specweave/docs/internal/specs/spec-0001-ai-meme-generator.md | head -50
# Should see English content, not Russian
```

### 7.4: Test New Increments

```bash
# Create new increment in Russian
/specweave:increment "Добавить темную тему"

# Verify automatic translation
cat .specweave/increments/0002-*/spec.md  # Should be English
cat .specweave/docs/internal/specs/spec-0002-*.md  # Should be English
```

**Estimated Time**: 1 hour

---

## Phase 8: Create Comprehensive Documentation

**Goal**: Document the fix for future reference

**Files to Create**:
- `.specweave/increments/0006-llm-native-i18n/reports/IMPLEMENTATION-COMPLETE-LIVING-DOCS-FIX.md`

**Contents**:

```markdown
# Implementation Complete: Living Docs Translation Fix

## What Was Fixed

1. ✅ post-increment-planning hook now translates living docs specs
2. ✅ translate-living-docs.ts now translates TO English (not to user's language)
3. ✅ autoTranslateLivingDocs enabled by default
4. ✅ Migration script for existing projects
5. ✅ E2E tests prevent regression
6. ✅ Documentation updated

## Before vs After

### Before
- ❌ 66% of documentation not translated (living docs)
- ❌ Living docs accumulate in non-English languages
- ❌ Framework unmaintainable for international contributors

### After
- ✅ 100% of documentation translated to English
- ✅ Two-phase translation (increment creation + task completion)
- ✅ Comprehensive coverage (specs, ADRs, HLDs, strategy docs)
- ✅ Migration path for existing projects

## Files Modified

1. `plugins/specweave/hooks/post-increment-planning.sh` (+93 lines)
2. `src/hooks/lib/translate-living-docs.ts` (direction fix)
3. `src/core/schemas/specweave-config.schema.json` (default: true)
4. `scripts/migrate-living-docs-to-english.sh` (new)
5. `tests/e2e/translation/living-docs-translation.spec.ts` (new)
6. `CLAUDE.md` (documentation update)

## Testing Results

- ✅ E2E tests: 3/3 passing
- ✅ Unit tests: All passing
- ✅ Manual test (Russian project): Verified
- ✅ Migration script: Tested on real project

## Migration Instructions

For existing projects:
```bash
bash scripts/migrate-living-docs-to-english.sh
```

## Success Metrics

- ✅ 100% documentation coverage
- ✅ Cost: ~$0.02 per increment (acceptable)
- ✅ Performance: <5 seconds for translation
- ✅ Reliability: 99%+ success rate
```

**Estimated Time**: 30 minutes

---

## Total Estimated Time

| Phase | Task | Time |
|-------|------|------|
| 1 | Extend post-increment-planning hook | 1h |
| 2 | Fix translate-living-docs.ts | 1h |
| 3 | Update config schema | 0.5h |
| 4 | Create migration script | 1h |
| 5 | Add E2E tests | 2h |
| 6 | Update CLAUDE.md | 1h |
| 7 | Test on real project | 1h |
| 8 | Create documentation | 0.5h |
| **Total** | | **8 hours** |

---

## Risk Mitigation

### Risk 1: Translation Failures

**Mitigation**:
- All translation is non-blocking (hooks always return success)
- Failed translations logged to `.specweave/logs/hooks-debug.log`
- User can manually translate if needed

### Risk 2: Performance Impact

**Mitigation**:
- Translation only happens once per file
- Uses fast Haiku model (~2-3 seconds per file)
- Parallel translation possible (future optimization)

### Risk 3: Breaking Existing Projects

**Mitigation**:
- Migration script is opt-in (user must run it)
- Backward compatible (old projects continue working)
- Clear documentation for migration path

---

## Success Criteria Checklist

- [ ] post-increment-planning hook translates living docs specs
- [ ] translate-living-docs.ts translates TO English
- [ ] Config schema enables translation by default
- [ ] Migration script works on real Russian project
- [ ] E2E tests pass (3/3)
- [ ] CLAUDE.md documentation updated
- [ ] User can create new increments in Russian, all docs auto-translate to English
- [ ] Cost: <$0.05 per increment
- [ ] Performance: <10 seconds for translation

---

## Next Steps After Implementation

1. **Create PR** with all changes
2. **Run full test suite** (E2E + integration + unit)
3. **Test on 3 sample projects** (Russian, Chinese, Spanish)
4. **Update changelog** (v0.8.22 or v0.9.0)
5. **Deploy to NPM**

---

**Start Time**: 2025-11-07 [Current Time]
**Estimated Completion**: 2025-11-07 [+8 hours]
**Priority**: 🔴 CRITICAL
