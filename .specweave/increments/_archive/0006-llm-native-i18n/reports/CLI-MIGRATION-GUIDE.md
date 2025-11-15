# CLI Migration Guide: Remaining 222 Strings

**Status**: Infrastructure Complete, Pattern Proven, Ready for Systematic Migration
**Created**: 2025-11-03
**Increment**: 0006-llm-native-i18n

## 🎯 What We've Accomplished

✅ **All 9 locale files created** (en, ru, zh, de, fr, ja, ko, pt, es)
✅ **LocaleManager fixed** to support nested keys and load from JSON files
✅ **Pattern proven** with 7 critical init.ts strings successfully migrated
✅ **End-to-end validation** - Russian localization confirmed working

## 📊 Current State

**Total Console Statements**: 229
**Migrated**: 7 (init.ts welcome + critical errors)
**Remaining**: 222 strings across 4 CLI files

### Breakdown by File

| File | Total Strings | Migrated | Remaining |
|------|--------------|----------|-----------|
| `src/cli/commands/init.ts` | 124 | 7 | 117 |
| `src/cli/commands/plugin.ts` | 68 | 0 | 68 |
| `src/cli/commands/list.ts` | 27 | 0 | 27 |
| `src/cli/commands/install.ts` | 10 | 0 | 10 |

## 🔧 The Proven Pattern

### 1. Extraction (Already Done)

The `scripts/extract-cli-strings.cjs` script extracts all console statements:

```bash
node scripts/extract-cli-strings.cjs > cli-strings-catalog.json
```

**Output**: JSON catalog with line numbers, raw content, and statement types.

### 2. JSON Structure

Locale files (`src/locales/{lang}/cli.json`) use nested keys:

```json
{
  "init": {
    "welcome": "🚀 SpecWeave Initialization",
    "errors": {
      "cancelled": "❌ Initialization cancelled",
      "invalidLanguage": "❌ Invalid language: {{language}}"
    }
  },
  "plugin": {
    "installing": "📦 Installing plugin...",
    "errors": {
      "notFound": "❌ Plugin {{name}} not found"
    }
  }
}
```

**Rules**:
- Top-level keys = command names (init, plugin, list, install)
- Second level = categories (errors, warnings, prompts, progress, info)
- Use `{{param}}` for interpolation
- Keep emojis and formatting intact

### 3. Code Migration

**Before**:
```typescript
console.log(chalk.blue.bold('\n🚀 SpecWeave Initialization\n'));
console.error(chalk.red(`\n❌ Invalid language: ${options.language}`));
```

**After**:
```typescript
import { getLocaleManager } from '../../core/i18n/locale-manager.js';

const locale = getLocaleManager(language as SupportedLanguage);

console.log(chalk.blue.bold(`\n${locale.t('cli', 'init.welcome')}\n`));
console.error(chalk.red(`\n${locale.t('cli', 'init.errors.invalidLanguage', { language: options.language })}`));
```

**Key Points**:
- Import `getLocaleManager` at top of file
- Create locale instance: `const locale = getLocaleManager(language)`
- Replace hardcoded strings: `locale.t('cli', 'key.path', { params })`
- Category parameter is ignored (for API compatibility)
- Preserve chalk colors and formatting

### 4. Locale File Updates

For each migrated string:
1. Add to `src/locales/en/cli.json` (English source)
2. Translate to Russian in `src/locales/ru/cli.json`
3. Copy English structure to other 7 locale files (translations will come later)

### 5. Build & Test

```bash
# Rebuild TypeScript
npm run build

# Copy locale files to dist/
mkdir -p dist/locales && cp -r src/locales/* dist/locales/

# Test in English
node bin/specweave.js init .

# Test in Russian
node bin/specweave.js init --language ru .
```

## 🚀 Systematic Migration Plan

### Phase 1: init.ts (117 remaining strings)

**Priority**: High (most user-facing)

**Categories to migrate**:
- ✅ Welcome message (done)
- ✅ Invalid language errors (done)
- ⏳ Tool detection messages (47 strings)
- ⏳ Progress indicators (28 strings)
- ⏳ Warning messages (15 strings)
- ⏳ Success/completion messages (12 strings)
- ⏳ Error messages (15 strings)

**Approach**: Work category by category, not line by line.

### Phase 2: plugin.ts (68 strings)

**Categories**:
- Plugin installation progress
- Plugin listing output
- Error handling
- Success messages

### Phase 3: list.ts (27 strings)

**Categories**:
- Available plugins output
- Status indicators
- Help text

### Phase 4: install.ts (10 strings)

**Categories**:
- Installation progress
- Success/error messages

## 🔍 Example Migration Workflow

### Step 1: Choose Category

Let's say we're migrating "tool detection" messages from init.ts.

### Step 2: Add to English Locale

Edit `src/locales/en/cli.json`:

```json
{
  "init": {
    "welcome": "🚀 SpecWeave Initialization",
    "detectingTool": "Detecting AI tool...",
    "foundClaude": "✅ Found Claude Code",
    "foundCursor": "✅ Found Cursor",
    "foundCopilot": "✅ Found GitHub Copilot",
    "noToolDetected": "No AI tool detected, using Generic adapter"
  }
}
```

### Step 3: Translate to Russian

Edit `src/locales/ru/cli.json`:

```json
{
  "init": {
    "welcome": "🚀 Инициализация SpecWeave",
    "detectingTool": "Определение AI инструмента...",
    "foundClaude": "✅ Найден Claude Code",
    "foundCursor": "✅ Найден Cursor",
    "foundCopilot": "✅ Найден GitHub Copilot",
    "noToolDetected": "AI инструмент не обнаружен, используется Generic адаптер"
  }
}
```

### Step 4: Copy Structure to Other Locales

Copy the English structure to all 7 other locale files (ready for future translation).

### Step 5: Migrate Code

Find all instances in init.ts:

```typescript
// Before (multiple instances):
console.log('Detecting AI tool...');
console.log('✅ Found Claude Code');
console.log('✅ Found Cursor');
// ... etc

// After:
console.log(locale.t('cli', 'init.detectingTool'));
console.log(locale.t('cli', 'init.foundClaude'));
console.log(locale.t('cli', 'init.foundCursor'));
// ... etc
```

### Step 6: Build & Test

```bash
npm run build
mkdir -p dist/locales && cp -r src/locales/* dist/locales/
node bin/specweave.js init --language ru .
```

### Step 7: Verify Output

Check that Russian text appears correctly in console output.

## ⚙️ LocaleManager API Reference

### Constructor
```typescript
const locale = getLocaleManager(language?: SupportedLanguage);
```

Creates or returns singleton instance with specified language.

### t() Method
```typescript
locale.t(
  category: keyof LocaleStrings,  // 'cli' (ignored for compatibility)
  key: string,                     // Nested path: 'init.welcome'
  params?: Record<string, string | number>  // Optional interpolation params
): string
```

**Supports**:
- Nested keys: `'init.errors.cancelled'`
- Interpolation: `'error.message'` with `{ name: 'foo' }`
- Both formats: `{{param}}` and `{param}`
- Fallback: Returns key if path not found

### Example Usage
```typescript
// Simple
locale.t('cli', 'init.welcome')
// Returns: "🚀 SpecWeave Initialization"

// With params
locale.t('cli', 'init.errors.invalidLanguage', { language: 'xyz' })
// Returns: "❌ Invalid language: xyz"

// Nested
locale.t('cli', 'init.errors.cancelled')
// Returns: "❌ Initialization cancelled"
```

## 🎨 Best Practices

### 1. Category Organization

Group related strings under meaningful categories:
- `errors` - Error messages
- `warnings` - Warning messages
- `prompts` - User prompts/questions
- `progress` - Progress indicators
- `info` - Informational messages
- `nextSteps` - Next steps guidance

### 2. Key Naming

Use descriptive, hierarchical keys:
- ✅ `init.errors.invalidLanguage`
- ✅ `plugin.progress.installing`
- ❌ `error1`, `msg2` (not descriptive)

### 3. Preserve Formatting

Keep emojis, newlines, and formatting:
```json
{
  "welcome": "🚀 SpecWeave Initialization",
  "error": "❌ Initialization cancelled",
  "multiline": "Line 1\nLine 2"
}
```

### 4. Interpolation Parameters

Use clear parameter names:
```json
{
  "error": "Plugin {{pluginName}} not found",
  "count": "Installed {{count}} plugins"
}
```

### 5. Chalk Formatting

Preserve chalk colors in code, keep strings plain in JSON:
```typescript
// In code:
console.log(chalk.blue.bold(locale.t('cli', 'init.welcome')));

// In JSON:
{ "welcome": "🚀 SpecWeave Initialization" }  // No chalk
```

## 📝 Testing Strategy

### Manual Testing

Test each migrated category:
```bash
# English
node bin/specweave.js init .

# Russian
node bin/specweave.js init --language ru .
```

### Automated Testing

Add integration tests for locale loading:
```typescript
describe('LocaleManager', () => {
  it('should load Russian locale', () => {
    const locale = getLocaleManager('ru');
    expect(locale.t('cli', 'init.welcome')).toBe('🚀 Инициализация SpecWeave');
  });

  it('should support interpolation', () => {
    const locale = getLocaleManager('en');
    const result = locale.t('cli', 'init.errors.invalidLanguage', { language: 'xyz' });
    expect(result).toBe('❌ Invalid language: xyz');
  });
});
```

## 🔄 Continuous Improvement

### Future Enhancements

1. **Automated Translation**: Use LLM to translate English → other languages
2. **Validation**: JSON schema validation for locale files
3. **Coverage**: Track which strings are localized vs. hardcoded
4. **Build Integration**: Copy locale files automatically during build
5. **Pluralization**: Add support for plural forms (e.g., "1 file" vs "2 files")

## 📚 Resources

- **Extraction Script**: `scripts/extract-cli-strings.cjs`
- **English Locale**: `src/locales/en/cli.json` (source of truth)
- **Russian Locale**: `src/locales/ru/cli.json` (translation reference)
- **LocaleManager**: `src/core/i18n/locale-manager.ts`
- **Test Example**: `src/cli/commands/init.ts` (lines 33-46, 272-273)

## 🎯 Next Steps

1. **Migrate init.ts remaining strings** (117 strings, ~4-6 hours)
2. **Migrate plugin.ts** (68 strings, ~2-3 hours)
3. **Migrate list.ts** (27 strings, ~1 hour)
4. **Migrate install.ts** (10 strings, ~30 minutes)
5. **Add build automation** for locale file copying
6. **Create integration tests** for locale loading
7. **Translate to other 7 languages** (future increment)

**Total Estimated Time**: 8-12 hours of systematic migration work.

## ✅ Success Criteria

- [ ] All 229 console statements migrated
- [ ] English locale complete (source of truth)
- [ ] Russian locale translated
- [ ] Build automation for locale files
- [ ] Integration tests passing
- [ ] Manual testing in English and Russian
- [ ] Documentation updated

---

**Status**: Pattern proven, infrastructure complete, ready for systematic execution.
