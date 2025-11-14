---
id: translation
title: Translation Workflow (Multilingual Support)
sidebar_label: Translation Workflow
---

# Translation Workflow (Multilingual Support)

:::tip LLM-Native i18n
Work in your native language, system auto-translates to English for maintainability
:::

SpecWeave supports multilingual development via two-phase post-generation translation (Increment 0006).

---

## Key Concept

Users work in their **native language** (great UX), system **auto-translates to English** (maintainable docs).

---

## Two-Phase Translation Architecture

| Phase | Hook | What Gets Translated | When | Coverage |
|-------|------|---------------------|------|----------|
| **Phase 1** | post-increment-planning | Increment files + Living docs specs | After `/specweave:increment` | 80% of docs |
| **Phase 2** | post-task-completion | ADRs, HLDs, diagrams | After each task completion | 20% of docs |

---

## Workflow Example

### Phase 1: Increment Planning (Automatic)

```bash
# 1. User creates increment in Russian
/specweave:increment "Добавить пользовательскую аутентификацию"

# 2. PM agent generates spec.md, plan.md, tasks.md in Russian (natural, user-friendly)

# 3. post-increment-planning hook fires automatically (PHASE 1)
#    Phase A: Translates increment files (spec.md, plan.md, tasks.md) to English
#    Phase B: Translates living docs specs to English
#             - .specweave/docs/internal/specs/spec-*.md
#             - .specweave/docs/internal/strategy/**/*.md
#    Cost: ~$0.02 total

# User sees:
# ✅ Increment created
# 🌐 Detected Russian content. Translating increment files to English...
#   📄 spec.md... ✅
#   📄 plan.md... ✅
#   📄 tasks.md... ✅
# 🌐 Checking living docs for translation...
#   📄 Living docs detected: spec-0001-user-auth.md
#   ✅ Translated 1 living docs file(s) to English
# ✅ Translation complete!
#    Increment files: 3/3
#    Living docs: 1 file(s)
#    Estimated cost: ~$0.01-0.02 (using Haiku)
```

### Phase 2: Task Completion (Automatic)

```bash
# 4. During implementation, architect creates ADRs in Russian

# 5. post-task-completion hook fires after each task (PHASE 2)
#    - Translates newly created ADRs to English
#    - Translates HLDs/diagrams to English
#    Cost: ~$0.01 per file

# Result: ALL documentation in English (100% coverage)
```

---

## Configuration

In `.specweave/config.json`:

```json
{
  "language": "ru",
  "translation": {
    "enabled": true,
    "autoTranslateInternalDocs": true,
    "autoTranslateLivingDocs": true,
    "keepFrameworkTerms": true,
    "keepTechnicalTerms": true,
    "translationModel": "haiku"
  }
}
```

### Key Settings

- `language`: Primary language (en, ru, es, zh, de, fr, ja, ko, pt)
- `autoTranslateInternalDocs`: Auto-translate increment files + living docs specs to English (default: true)
- `autoTranslateLivingDocs`: Auto-translate ADRs/HLDs after task completion (default: true)
- `translationModel`: Model to use (haiku/sonnet/opus, default: haiku)

---

## Supported Languages

- English (en)
- Russian (ru)
- Spanish (es)
- Chinese (zh)
- German (de)
- French (fr)
- Japanese (ja)
- Korean (ko)
- Portuguese (pt)

---

## Cost & Coverage

**Cost**: ~$0.02 per increment (5-7 files, Haiku model)

**Coverage**: 100% (no gaps! All living docs translated)

---

## Implementation Details

### Language Detection

- Heuristic-based (&lt;1ms, zero cost)
- Detects language from text content
- No API calls for detection

### Code Preservation

- Never translates code blocks
- Preserves inline code
- Keeps links intact
- Maintains YAML frontmatter structure

### Validation

- Checks heading count (before/after)
- Validates code block count
- Verifies link count
- Ensures YAML structure integrity

---

## Testing

```bash
# Run translation unit tests
npm test -- tests/unit/i18n/translation.test.ts

# Test result: 67/67 passing (100%)
```

---

## Files

### Core

- `src/utils/translation.ts` (673 lines, 11 languages)
- `src/hooks/lib/translate-file.ts` (398 lines)

### Hooks

- Phase 1: `plugins/specweave/hooks/post-increment-planning.sh` (~420 lines)
- Phase 2: `src/hooks/lib/translate-living-docs.ts` (217 lines)

### Tests

- Unit: `tests/unit/i18n/translation.test.ts` (705 lines, 67 tests)
- E2E: `tests/e2e/i18n/living-docs-translation.spec.ts` (6 test cases)

### Configuration

- Schema: `src/core/schemas/specweave-config.schema.json`

---

## Migrating Existing Non-English Living Docs

For projects with existing non-English living docs, use the one-time migration script:

```bash
# One-time migration (translates all living docs to English)
bash scripts/migrate-living-docs-to-english.sh

# What it does:
# - Scans .specweave/docs/internal/ for non-English files
# - Translates each file to English (preserves code blocks, links, framework terms)
# - Skips files already in English
# - Non-blocking (continues even if some files fail)

# Estimated time: 1-2 minutes per 100 files
# Estimated cost: ~$0.01 per file (using Haiku)
```

### After Migration

```bash
# Review translated files
git diff .specweave/docs/internal/

# Commit changes
git add . && git commit -m "docs: translate living docs to English"

# Future increments will auto-translate
/specweave:increment "Добавить новую функцию"  # Auto-translates!
```

---

## Benefits

### For Users

- ✅ Work in native language
- ✅ Natural, fluent documentation
- ✅ Zero manual translation work
- ✅ 100% documentation coverage

### For Teams

- ✅ English docs for maintainability
- ✅ Consistent terminology
- ✅ Framework terms preserved
- ✅ Technical terms preserved

### For Contributors

- ✅ Low cost (~$0.02 per increment)
- ✅ Automatic (zero manual intervention)
- ✅ Fast (&lt;1ms detection, &lt;50ms translation)
- ✅ High quality (preserves structure)

---

## FAQ

### Does translation affect code?

No. Code blocks, inline code, and links are never translated. Only markdown text is translated.

### What about technical terms?

Technical terms are preserved (e.g., "API", "REST", "JWT", "OAuth"). SpecWeave has a built-in glossary of technical terms.

### What about framework terms?

Framework-specific terms are preserved (e.g., "SpecWeave", "increment", "living docs", "PM agent"). Configured via `keepFrameworkTerms: true`.

### Can I disable translation?

Yes. Set `translation.enabled: false` in config.json.

### What if translation fails?

Translation is non-blocking. If it fails, the original file remains and you see a warning. You can retry manually with `/specweave:translate`.

---

## Related

- [Hooks System](./hooks.md)
- [Configuration Reference](../reference/configuration.md)
- [Increment Lifecycle](../workflows/increment-lifecycle.md)
