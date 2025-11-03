# Test Specification: LLM-Native Multilingual Support

**Increment**: 0006-llm-native-i18n
**Created**: 2025-11-02
**Status**: In Progress

---

## Test Overview

| Level | Test Cases | Status | Coverage Target |
|-------|------------|--------|-----------------|
| **Unit Tests** | TC-U-001 to TC-U-020 | ⏳ Pending | 100% for core classes |
| **Integration Tests** | TC-I-001 to TC-I-015 | ⏳ Pending | >90% for workflows |
| **E2E Tests** | TC-E-001 to TC-E-010 | ⏳ Pending | Critical paths |
| **Manual Tests** | TC-M-001 to TC-M-005 | ⏳ Pending | Quality validation |

**Total Test Cases**: 50
**Estimated Test Writing Time**: 6-8 hours
**Estimated Test Execution Time**: 2-3 hours

---

## Unit Tests (LanguageManager)

### TC-U-001: Get Current Language

**Component**: LanguageManager
**Method**: `getLanguage()`
**Priority**: P0

**Test Case**:
```typescript
it('should return configured language', () => {
  const langManager = new LanguageManager({ language: 'ru' });
  expect(langManager.getLanguage()).toBe('ru');
});
```

**Acceptance Criteria**:
- ✅ Returns exact language from config
- ✅ No type errors

---

### TC-U-002: Default Language

**Component**: LanguageManager
**Method**: `getLanguage()`
**Priority**: P0

**Test Case**:
```typescript
it('should default to English when no language specified', () => {
  const langManager = new LanguageManager({} as any);
  expect(langManager.getLanguage()).toBe('en');
});
```

**Acceptance Criteria**:
- ✅ Returns 'en' when language not specified
- ✅ No errors

---

### TC-U-003: Russian System Prompt

**Component**: LanguageManager
**Method**: `getSystemPrompt()`
**Priority**: P0

**Test Case**:
```typescript
it('should generate Russian system prompt', () => {
  const langManager = new LanguageManager({ language: 'ru' });
  const prompt = langManager.getSystemPrompt();

  expect(prompt).toContain('LANGUAGE INSTRUCTION');
  expect(prompt).toContain('Russian (Русский)');
  expect(prompt).toContain('Framework terms');
  expect(prompt).toContain('Technical terms');
  expect(prompt).toContain('Variable/function names remain in English');
});
```

**Acceptance Criteria**:
- ✅ Contains all required sections
- ✅ Language name in both English and native script
- ✅ Clear instructions about term preservation

---

### TC-U-004: Spanish System Prompt

**Component**: LanguageManager
**Method**: `getSystemPrompt()`
**Priority**: P0

**Test Case**:
```typescript
it('should generate Spanish system prompt', () => {
  const langManager = new LanguageManager({ language: 'es' });
  const prompt = langManager.getSystemPrompt();

  expect(prompt).toContain('Spanish (Español)');
});
```

**Acceptance Criteria**:
- ✅ Spanish language name present
- ✅ All instructions same structure as Russian

---

### TC-U-005: Empty Prompt for English

**Component**: LanguageManager
**Method**: `getSystemPrompt()`
**Priority**: P0

**Test Case**:
```typescript
it('should return empty string for English', () => {
  const langManager = new LanguageManager({ language: 'en' });
  const prompt = langManager.getSystemPrompt();

  expect(prompt).toBe('');
});
```

**Acceptance Criteria**:
- ✅ Returns exactly empty string
- ✅ No whitespace

---

### TC-U-006: Load CLI Strings (English)

**Component**: LanguageManager
**Method**: `loadStrings()`
**Priority**: P0

**Test Case**:
```typescript
it('should load English CLI strings', () => {
  const langManager = new LanguageManager({ language: 'en' });
  const strings = langManager.loadStrings('cli');

  expect(strings).toHaveProperty('init');
  expect(strings.init).toHaveProperty('welcome');
  expect(strings.init.welcome).toBe('🚀 SpecWeave Initialization');
});
```

**Acceptance Criteria**:
- ✅ Loads JSON file correctly
- ✅ Nested structure preserved
- ✅ Values match source file

---

### TC-U-007: Load CLI Strings (Russian)

**Component**: LanguageManager
**Method**: `loadStrings()`
**Priority**: P1

**Test Case**:
```typescript
it('should load Russian CLI strings', () => {
  const langManager = new LanguageManager({ language: 'ru' });
  const strings = langManager.loadStrings('cli');

  expect(strings).toHaveProperty('init');
  expect(strings.init.welcome).toContain('Инициализация SpecWeave');
});
```

**Acceptance Criteria**:
- ✅ Loads ru/cli.json
- ✅ Russian text present

---

### TC-U-008: Fallback to English

**Component**: LanguageManager
**Method**: `loadStrings()`
**Priority**: P1

**Test Case**:
```typescript
it('should fallback to English if locale missing', () => {
  const langManager = new LanguageManager({ language: 'zh' }); // Chinese not yet translated
  const strings = langManager.loadStrings('cli');

  // Should load English as fallback
  expect(strings.init.welcome).toBe('🚀 SpecWeave Initialization');
});
```

**Acceptance Criteria**:
- ✅ Falls back to English gracefully
- ✅ No errors thrown
- ✅ Returns valid strings object

---

### TC-U-009: Resolve Nested Key

**Component**: LanguageManager
**Method**: `t()`
**Priority**: P0

**Test Case**:
```typescript
it('should resolve nested key path', () => {
  const langManager = new LanguageManager({ language: 'en' });
  const text = langManager.t('cli.init.welcome');

  expect(text).toBe('🚀 SpecWeave Initialization');
});
```

**Acceptance Criteria**:
- ✅ Dot notation works
- ✅ Correct value returned

---

### TC-U-010: Replace Single Placeholder

**Component**: LanguageManager
**Method**: `t()`
**Priority**: P0

**Test Case**:
```typescript
it('should replace placeholder with value', () => {
  const langManager = new LanguageManager({ language: 'en' });
  const text = langManager.t('errors.fileNotFound', { path: '/foo/bar.txt' });

  expect(text).toBe('❌ File not found: /foo/bar.txt');
});
```

**Acceptance Criteria**:
- ✅ Placeholder replaced
- ✅ No leftover braces

---

### TC-U-011: Replace Multiple Placeholders

**Component**: LanguageManager
**Method**: `t()`
**Priority**: P1

**Test Case**:
```typescript
it('should replace multiple placeholders', () => {
  const langManager = new LanguageManager({ language: 'en' });
  const text = langManager.t('test.multiPlaceholder', {
    name: 'John',
    age: '30'
  });

  expect(text).toContain('John');
  expect(text).toContain('30');
});
```

**Acceptance Criteria**:
- ✅ All placeholders replaced
- ✅ Order doesn't matter

---

### TC-U-012: Return Key if Not Found

**Component**: LanguageManager
**Method**: `t()`
**Priority**: P1

**Test Case**:
```typescript
it('should return key if translation not found', () => {
  const langManager = new LanguageManager({ language: 'en' });
  const text = langManager.t('nonexistent.key.path');

  expect(text).toBe('nonexistent.key.path');
});
```

**Acceptance Criteria**:
- ✅ Returns key as fallback
- ✅ No errors thrown
- ✅ Makes missing translation obvious

---

### TC-U-013: Check Locale Exists

**Component**: LanguageManager
**Method**: `hasLocale()`
**Priority**: P1

**Test Case**:
```typescript
it('should return true if locale files exist', () => {
  const langManager = new LanguageManager({ language: 'en' });
  expect(langManager.hasLocale()).toBe(true);
});

it('should return false if locale files missing', () => {
  const langManager = new LanguageManager({ language: 'zh' });
  expect(langManager.hasLocale()).toBe(false);
});
```

**Acceptance Criteria**:
- ✅ Correctly detects presence
- ✅ No false positives/negatives

---

### TC-U-014: Load Error Strings

**Component**: LanguageManager
**Method**: `loadStrings('errors')`
**Priority**: P1

**Test Case**:
```typescript
it('should load error strings', () => {
  const langManager = new LanguageManager({ language: 'en' });
  const strings = langManager.loadStrings('errors');

  expect(strings).toHaveProperty('fileNotFound');
  expect(strings).toHaveProperty('invalidConfig');
});
```

**Acceptance Criteria**:
- ✅ Loads errors.json
- ✅ All error keys present

---

### TC-U-015: Load Template Strings

**Component**: LanguageManager
**Method**: `loadStrings('templates')`
**Priority**: P1

**Test Case**:
```typescript
it('should load template strings', () => {
  const langManager = new LanguageManager({ language: 'en' });
  const strings = langManager.loadStrings('templates');

  expect(strings).toHaveProperty('projectName');
});
```

**Acceptance Criteria**:
- ✅ Loads templates.json

---

### TC-U-016: Cache Locale Strings

**Component**: LanguageManager
**Method**: `loadStrings()`
**Priority**: P2

**Test Case**:
```typescript
it('should cache loaded strings', () => {
  const langManager = new LanguageManager({ language: 'en' });

  const start = Date.now();
  langManager.loadStrings('cli'); // First call - loads from file
  const firstCallTime = Date.now() - start;

  const start2 = Date.now();
  langManager.loadStrings('cli'); // Second call - loads from cache
  const secondCallTime = Date.now() - start2;

  expect(secondCallTime).toBeLessThan(firstCallTime);
});
```

**Acceptance Criteria**:
- ✅ Second call faster
- ✅ Returns same object

---

### TC-U-017: All Supported Languages Have Names

**Component**: LanguageManager
**Method**: `getSystemPrompt()`
**Priority**: P1

**Test Case**:
```typescript
const languages: SupportedLanguage[] = ['ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'];

languages.forEach(lang => {
  it(`should have name for ${lang}`, () => {
    const langManager = new LanguageManager({ language: lang });
    const prompt = langManager.getSystemPrompt();

    expect(prompt).toBeTruthy();
    expect(prompt).toContain('LANGUAGE INSTRUCTION');
  });
});
```

**Acceptance Criteria**:
- ✅ All 8 languages have prompts
- ✅ All include native name

---

### TC-U-018: System Prompt Structure

**Component**: LanguageManager
**Method**: `getSystemPrompt()`
**Priority**: P1

**Test Case**:
```typescript
it('should have consistent structure across languages', () => {
  const languages: SupportedLanguage[] = ['ru', 'es'];

  languages.forEach(lang => {
    const langManager = new LanguageManager({ language: lang });
    const prompt = langManager.getSystemPrompt();

    expect(prompt).toMatch(/LANGUAGE INSTRUCTION/);
    expect(prompt).toMatch(/Variable\/function names remain in English/);
    expect(prompt).toMatch(/Technical terms .* remain in English/);
    expect(prompt).toMatch(/Framework terms .* remain in English/);
  });
});
```

**Acceptance Criteria**:
- ✅ All prompts have same sections
- ✅ Consistent formatting

---

### TC-U-019: Invalid Language Type

**Component**: LanguageManager
**Priority**: P2

**Test Case**:
```typescript
it('should handle invalid language gracefully', () => {
  const langManager = new LanguageManager({ language: 'invalid' as any });

  // Should not crash
  expect(() => langManager.getSystemPrompt()).not.toThrow();
});
```

**Acceptance Criteria**:
- ✅ No errors thrown
- ✅ Fallback behavior

---

### TC-U-020: Empty Config Object

**Component**: LanguageManager
**Priority**: P1

**Test Case**:
```typescript
it('should handle empty config', () => {
  const langManager = new LanguageManager({} as any);

  expect(langManager.getLanguage()).toBe('en');
  expect(langManager.getSystemPrompt()).toBe('');
});
```

**Acceptance Criteria**:
- ✅ Defaults to English
- ✅ No errors

---

## Integration Tests (CLI)

### TC-I-001: Init with Russian

**Component**: CLI init command
**Priority**: P0

**Test Case**:
```typescript
it('should initialize project with Russian language', async () => {
  const output = await execCommand('specweave init test-ru --language ru');

  expect(output).toContain('🚀 Инициализация SpecWeave');
  expect(output).toContain('✨ Инициализация завершена!');
});
```

**Acceptance Criteria**:
- ✅ CLI outputs Russian
- ✅ Config saved with language: 'ru'
- ✅ Project structure created

---

### TC-I-002: Init with Spanish

**Component**: CLI init command
**Priority**: P0

**Test Case**:
```typescript
it('should initialize project with Spanish language', async () => {
  const output = await execCommand('specweave init test-es --language es');

  expect(output).toContain('Inicialización de SpecWeave');
  expect(output).toContain('Inicialización completa!');
});
```

**Acceptance Criteria**:
- ✅ CLI outputs Spanish
- ✅ Config saved

---

### TC-I-003: Init Defaults to English

**Component**: CLI init command
**Priority**: P0

**Test Case**:
```typescript
it('should default to English when no language specified', async () => {
  const output = await execCommand('specweave init test-default');

  expect(output).toContain('🚀 SpecWeave Initialization');
  expect(output).not.toContain('Инициализация');
});
```

**Acceptance Criteria**:
- ✅ English output
- ✅ Config has language: 'en'

---

### TC-I-004: Invalid Language Shows Error

**Component**: CLI init command
**Priority**: P1

**Test Case**:
```typescript
it('should show error for invalid language', async () => {
  const output = await execCommand('specweave init test-invalid --language invalid', {
    expectError: true
  });

  expect(output).toContain('Invalid language');
  expect(output).toContain('Supported languages:');
});
```

**Acceptance Criteria**:
- ✅ Error message clear
- ✅ Lists supported languages
- ✅ Exit code non-zero

---

### TC-I-005: Config File Contains Language

**Component**: CLI init command
**Priority**: P0

**Test Case**:
```typescript
it('should save language to config file', async () => {
  await execCommand('specweave init test-config --language ru');

  const config = JSON.parse(
    fs.readFileSync('test-config/.specweave/config.json', 'utf-8')
  );

  expect(config.language).toBe('ru');
});
```

**Acceptance Criteria**:
- ✅ Config file created
- ✅ Language field present
- ✅ Valid JSON

---

### TC-I-006: ClaudeAdapter Injects Russian Prompt

**Component**: ClaudeAdapter
**Priority**: P0

**Test Case**:
```typescript
it('should inject Russian system prompt in skill files', async () => {
  await execCommand('specweave init test-claude-ru --adapter claude --language ru');

  const skillPath = 'test-claude-ru/.claude/skills/increment-planner/SKILL.md';
  const content = fs.readFileSync(skillPath, 'utf-8');

  expect(content).toContain('**LANGUAGE INSTRUCTION**');
  expect(content).toContain('Russian (Русский)');
  expect(content).toContain('---\nname: increment-planner');
});
```

**Acceptance Criteria**:
- ✅ System prompt at top of file
- ✅ Followed by separator (---)
- ✅ Original SKILL.md content below

---

### TC-I-007: ClaudeAdapter Injects in Agents

**Component**: ClaudeAdapter
**Priority**: P0

**Test Case**:
```typescript
it('should inject system prompt in agent files', async () => {
  await execCommand('specweave init test-agents-ru --adapter claude --language ru');

  const agentPath = 'test-agents-ru/.claude/agents/pm/AGENT.md';
  const content = fs.readFileSync(agentPath, 'utf-8');

  expect(content).toContain('LANGUAGE INSTRUCTION');
  expect(content).toContain('Russian');
});
```

**Acceptance Criteria**:
- ✅ Agents get prompt too
- ✅ Same format as skills

---

### TC-I-008: ClaudeAdapter No Prompt for English

**Component**: ClaudeAdapter
**Priority**: P1

**Test Case**:
```typescript
it('should not inject prompt for English', async () => {
  await execCommand('specweave init test-en --adapter claude --language en');

  const skillPath = 'test-en/.claude/skills/increment-planner/SKILL.md';
  const content = fs.readFileSync(skillPath, 'utf-8');

  expect(content).not.toContain('LANGUAGE INSTRUCTION');
  expect(content).toMatch(/^---\nname: increment-planner/);
});
```

**Acceptance Criteria**:
- ✅ No system prompt
- ✅ Original file unchanged

---

### TC-I-009: CursorAdapter Injects Prompt

**Component**: CursorAdapter
**Priority**: P1

**Test Case**:
```typescript
it('should inject prompt in AGENTS.md for Cursor', async () => {
  await execCommand('specweave init test-cursor-ru --adapter cursor --language ru');

  const agentsPath = 'test-cursor-ru/AGENTS.md';
  const content = fs.readFileSync(agentsPath, 'utf-8');

  expect(content).toContain('LANGUAGE INSTRUCTION');
  expect(content).toContain('Russian');
});
```

**Acceptance Criteria**:
- ✅ Prompt at top of compiled file
- ✅ Separator before content

---

### TC-I-010: Translator Plugin Installed

**Component**: Plugin installation
**Priority**: P1

**Test Case**:
```typescript
it('should install translator plugin with Russian project', async () => {
  await execCommand('specweave init test-plugin --language ru');

  const pluginPath = 'test-plugin/.claude/skills/translator/SKILL.md';
  expect(fs.existsSync(pluginPath)).toBe(true);
});
```

**Acceptance Criteria**:
- ✅ Translator skill installed
- ✅ Available for use

---

### TC-I-011: All Locale Files Created

**Component**: Project structure
**Priority**: P1

**Test Case**:
```typescript
it('should have locale files in dist after build', async () => {
  await execCommand('npm run build');

  expect(fs.existsSync('dist/locales/en/cli.json')).toBe(true);
  expect(fs.existsSync('dist/locales/ru/cli.json')).toBe(true);
  expect(fs.existsSync('dist/locales/es/cli.json')).toBe(true);
});
```

**Acceptance Criteria**:
- ✅ All locale files in dist/
- ✅ Accessible at runtime

---

### TC-I-012: CLI Shows Russian Error Messages

**Component**: CLI error handling
**Priority**: P1

**Test Case**:
```typescript
it('should show Russian error messages', async () => {
  await execCommand('specweave init test-ru --language ru');

  const output = await execCommand('specweave init test-ru --language ru', {
    expectError: true
  });

  expect(output).toContain('уже существует'); // "already exists" in Russian
});
```

**Acceptance Criteria**:
- ✅ Errors in target language
- ✅ User-friendly

---

### TC-I-013: Version Command in Russian

**Component**: CLI version command
**Priority**: P2

**Test Case**:
```typescript
it('should show version in Russian format', async () => {
  await execCommand('specweave init test-ver-ru --language ru');
  const output = await execCommand('specweave version', { cwd: 'test-ver-ru' });

  expect(output).toContain('Версия SpecWeave:');
});
```

**Acceptance Criteria**:
- ✅ Version output localized

---

### TC-I-014: Help Text in Russian

**Component**: CLI help
**Priority**: P2

**Test Case**:
```typescript
it('should show help in Russian', async () => {
  const output = await execCommand('specweave --help --language ru');

  expect(output).toContain('Использование:'); // "Usage:"
});
```

**Acceptance Criteria**:
- ✅ Help text localized

---

### TC-I-015: Locale JSON Schema Valid

**Component**: Locale files
**Priority**: P1

**Test Case**:
```typescript
it('should have valid JSON in all locale files', () => {
  const locales = ['en', 'ru', 'es'];
  const types = ['cli', 'errors', 'templates'];

  locales.forEach(locale => {
    types.forEach(type => {
      const filePath = `src/locales/${locale}/${type}.json`;
      if (fs.existsSync(filePath)) {
        expect(() => JSON.parse(fs.readFileSync(filePath, 'utf-8'))).not.toThrow();
      }
    });
  });
});
```

**Acceptance Criteria**:
- ✅ All JSON files valid
- ✅ No syntax errors

---

## E2E Tests (Playwright)

### TC-E-001: Full Russian Workflow

**Component**: End-to-end workflow
**Priority**: P0

**Test Case**:
```typescript
test('should complete full increment in Russian', async () => {
  // 1. Init
  await exec('specweave init test-ru-e2e --language ru');

  // 2. Create increment
  await exec('/specweave:inc "добавить аутентификацию"');

  // 3. Verify spec.md
  const spec = await readFile('.specweave/increments/0001-auth/spec.md');
  expect(spec).toContain('# Спецификация:');
  expect(spec).toContain('## Пользовательские истории');

  // 4. Execute task
  await exec('/specweave:do');

  // 5. Validate
  await exec('/specweave:validate 0001');

  // 6. Close
  await exec('/specweave:done 0001');
});
```

**Acceptance Criteria**:
- ✅ All commands succeed
- ✅ All output in Russian
- ✅ Spec/plan/tasks in Russian
- ✅ Framework terms preserved

---

### TC-E-002: Full Spanish Workflow

**Component**: End-to-end workflow
**Priority**: P0

**Test Case**:
```typescript
test('should complete full increment in Spanish', async () => {
  await exec('specweave init test-es-e2e --language es');
  await exec('/specweave:inc "agregar autenticación"');

  const spec = await readFile('.specweave/increments/0001-auth/spec.md');
  expect(spec).toContain('Especificación:');

  await exec('/specweave:do');
  await exec('/specweave:done 0001');
});
```

**Acceptance Criteria**:
- ✅ Full workflow in Spanish
- ✅ All checks pass

---

### TC-E-003: Mixed Language Input

**Component**: LLM native multilingual
**Priority**: P1

**Test Case**:
```typescript
test('should handle mixed language input', async () => {
  await exec('specweave init test-mixed --language ru');

  // Russian input
  await exec('/specweave:inc "добавить аутентификацию"');
  const spec1 = await readFile('.specweave/increments/0001-auth/spec.md');

  // English input (should still generate Russian output)
  await exec('/specweave:inc "add payment processing"');
  const spec2 = await readFile('.specweave/increments/0002-payment/spec.md');

  expect(spec1).toContain('Спецификация');
  expect(spec2).toContain('Спецификация'); // Also in Russian!
});
```

**Acceptance Criteria**:
- ✅ Both inputs work
- ✅ Output consistent (Russian)

---

### TC-E-004: Living Docs Auto-Translation

**Component**: Living docs hook
**Priority**: P1

**Test Case**:
```typescript
test('should auto-translate living docs', async () => {
  await exec('specweave init test-living --language ru');
  await updateConfig({ translation: { autoTranslateLivingDocs: true } });

  await exec('/specweave:inc "test feature"');
  await exec('/specweave:do');

  const notes = await readFile('.specweave/docs/internal/delivery/TEST-NOTES.md');
  expect(notes).toContain('Реализация');
  expect(notes).not.toContain('Implementation');
});
```

**Acceptance Criteria**:
- ✅ Hook fires
- ✅ Translation happens
- ✅ Markdown preserved

---

### TC-E-005: No Translation When Disabled

**Component**: Living docs hook
**Priority**: P1

**Test Case**:
```typescript
test('should not translate when autoTranslateLivingDocs false', async () => {
  await exec('specweave init test-no-translate --language ru');
  await updateConfig({ translation: { autoTranslateLivingDocs: false } });

  await exec('/specweave:inc "test feature"');
  await exec('/specweave:do');

  const notes = await readFile('.specweave/docs/internal/delivery/TEST-NOTES.md');
  // Should remain in English (or whatever language Claude naturally generated)
  // No forced translation
});
```

**Acceptance Criteria**:
- ✅ Hook doesn't translate
- ✅ Files left as-is

---

### TC-E-006: Framework Terms Preserved

**Component**: System prompt enforcement
**Priority**: P0

**Test Case**:
```typescript
test('should preserve framework terms in Russian output', async () => {
  await exec('specweave init test-terms --language ru');
  await exec('/specweave:inc "test feature"');

  const spec = await readFile('.specweave/increments/0001-test/spec.md');

  // These should remain in English:
  expect(spec).toContain('SpecWeave');
  expect(spec).toContain('Increment');
  expect(spec).toContain('Living Docs');
  expect(spec).toMatch(/ADR/);
  expect(spec).toMatch(/RFC/);

  // But explanatory text should be Russian:
  expect(spec).toMatch(/[а-яА-Я]{10,}/); // Contains Russian words
});
```

**Acceptance Criteria**:
- ✅ Framework terms stay English
- ✅ Prose is Russian

---

### TC-E-007: Technical Terms Preserved

**Component**: System prompt enforcement
**Priority**: P0

**Test Case**:
```typescript
test('should preserve technical terms', async () => {
  await exec('specweave init test-tech --language ru');
  await exec('/specweave:inc "настроить Git и Docker"');

  const spec = await readFile('.specweave/increments/0001-setup/spec.md');

  expect(spec).toContain('Git');
  expect(spec).toContain('Docker');
  expect(spec).toMatch(/TypeScript|JavaScript/);
  expect(spec).toMatch(/npm|yarn/);
});
```

**Acceptance Criteria**:
- ✅ Technical terms unchanged
- ✅ No translations like "Гит" or "Докер"

---

### TC-E-008: Code Blocks Not Translated

**Component**: Markdown preservation
**Priority**: P1

**Test Case**:
```typescript
test('should not translate code blocks', async () => {
  await exec('specweave init test-code --language ru');
  await exec('/specweave:inc "add user service"');

  const spec = await readFile('.specweave/increments/0001-user/spec.md');

  // Find code block
  const codeBlockMatch = spec.match(/```typescript([\s\S]*?)```/);
  expect(codeBlockMatch).toBeTruthy();

  const codeBlock = codeBlockMatch![1];

  // Code should be in English
  expect(codeBlock).toMatch(/class|function|const|interface/);
  expect(codeBlock).not.toMatch(/[а-яА-Я]+/); // No Cyrillic
});
```

**Acceptance Criteria**:
- ✅ Code blocks unchanged
- ✅ Only comments translated (if any)

---

### TC-E-009: Markdown Structure Preserved

**Component**: Markdown preservation
**Priority**: P1

**Test Case**:
```typescript
test('should preserve markdown structure', async () => {
  await exec('specweave init test-markdown --language ru');
  await exec('/specweave:inc "test feature"');

  const spec = await readFile('.specweave/increments/0001-test/spec.md');

  // Headers
  expect(spec).toMatch(/^# /m);
  expect(spec).toMatch(/^## /m);
  expect(spec).toMatch(/^### /m);

  // Lists
  expect(spec).toMatch(/^- /m);
  expect(spec).toMatch(/^\d\. /m);

  // Links
  expect(spec).toMatch(/\[.*\]\(.*\)/);

  // Tables (if any)
  if (spec.includes('|')) {
    expect(spec).toMatch(/\| .* \| .* \|/);
  }
});
```

**Acceptance Criteria**:
- ✅ All markdown elements preserved
- ✅ Structure intact

---

### TC-E-010: Multiple Increments in Same Language

**Component**: Consistency
**Priority**: P1

**Test Case**:
```typescript
test('should maintain language across multiple increments', async () => {
  await exec('specweave init test-multi --language ru');

  await exec('/specweave:inc "first feature"');
  await exec('/specweave:done 0001');

  await exec('/specweave:inc "second feature"');
  await exec('/specweave:done 0002');

  await exec('/specweave:inc "third feature"');

  const spec1 = await readFile('.specweave/increments/0001-first/spec.md');
  const spec2 = await readFile('.specweave/increments/0002-second/spec.md');
  const spec3 = await readFile('.specweave/increments/0003-third/spec.md');

  // All should be in Russian
  expect(spec1).toContain('Спецификация');
  expect(spec2).toContain('Спецификация');
  expect(spec3).toContain('Спецификация');
});
```

**Acceptance Criteria**:
- ✅ All increments consistent
- ✅ Language doesn't change

---

## Manual Tests

### TC-M-001: Translation Quality (Russian)

**Component**: Translator skill
**Priority**: P0

**Manual Steps**:
1. Init project with Russian
2. Create increment: `/specweave:inc "implement user authentication with JWT tokens"`
3. Read generated spec.md
4. Verify:
   - Russian text is natural and fluent
   - Technical terms preserved (JWT, tokens, authentication)
   - Framework terms preserved (SpecWeave, Increment)
   - Grammar correct
   - Terminology consistent

**Acceptance Criteria**:
- ✅ Translation quality >95% (native speaker review)
- ✅ No awkward phrasing
- ✅ Technical accuracy maintained

---

### TC-M-002: Translation Quality (Spanish)

**Component**: Translator skill
**Priority**: P0

**Manual Steps**:
Same as TC-M-001 but with Spanish.

**Acceptance Criteria**:
- ✅ Spanish quality >95%

---

### TC-M-003: CLI User Experience (Russian)

**Component**: CLI
**Priority**: P1

**Manual Steps**:
1. Run `specweave init my-app --language ru`
2. Observe all prompts and messages
3. Verify:
   - All text in Russian
   - Prompts clear
   - Error messages helpful
   - Emojis preserved
   - Overall UX smooth

**Acceptance Criteria**:
- ✅ UX matches English version
- ✅ No confusing messages

---

### TC-M-004: Documentation Completeness

**Component**: Documentation
**Priority**: P1

**Manual Steps**:
1. Read CLAUDE.md i18n section
2. Read README.md multilingual section
3. Read multilingual-support.md guide
4. Verify:
   - All features documented
   - Examples clear
   - Configuration explained
   - Troubleshooting section helpful

**Acceptance Criteria**:
- ✅ Docs complete
- ✅ Easy to follow

---

### TC-M-005: Performance (No Noticeable Delay)

**Component**: Overall system
**Priority**: P2

**Manual Steps**:
1. Init project with Russian
2. Create 5 increments
3. Measure time for each operation
4. Compare to English version

**Acceptance Criteria**:
- ✅ Russian init time ≈ English init time (within 10%)
- ✅ No noticeable slowdown

---

## Test Coverage Summary

### By Component

| Component | Unit Tests | Integration Tests | E2E Tests | Total |
|-----------|------------|-------------------|-----------|-------|
| LanguageManager | 20 | 0 | 0 | 20 |
| CLI | 0 | 15 | 0 | 15 |
| Workflow | 0 | 0 | 10 | 10 |
| Manual | 0 | 0 | 5 | 5 |
| **Total** | **20** | **15** | **10** | **50** |

### By Priority

| Priority | Count | Percentage |
|----------|-------|------------|
| P0 | 20 | 40% |
| P1 | 27 | 54% |
| P2 | 3 | 6% |

### Coverage Targets

- **LanguageManager**: 100% (all public methods)
- **Adapters**: >90% (critical paths)
- **CLI**: >90% (all user-facing commands)
- **E2E**: Critical workflows covered
- **Overall**: >90%

---

## Test Execution Plan

### Phase 1: Unit Tests (Day 1)
Run: `npm run test:unit`
- Execute TC-U-001 through TC-U-020
- Fix any failures
- Verify 100% coverage for LanguageManager

### Phase 2: Integration Tests (Day 2)
Run: `npm run test:integration`
- Execute TC-I-001 through TC-I-015
- Test all adapters
- Verify CLI works in all languages

### Phase 3: E2E Tests (Day 3)
Run: `npm run test:e2e`
- Execute TC-E-001 through TC-E-010
- Full workflow validation
- Performance checks

### Phase 4: Manual Tests (Day 3)
- Execute TC-M-001 through TC-M-005
- Quality review
- Documentation review

### Phase 5: Regression (Day 3)
- Run full test suite
- Verify no breaks in existing functionality
- Check test coverage report

---

## Success Criteria

**All tests must pass before release:**
- ✅ 20/20 unit tests passing
- ✅ 15/15 integration tests passing
- ✅ 10/10 E2E tests passing
- ✅ 5/5 manual tests verified
- ✅ >90% overall coverage
- ✅ Zero P0 bugs
- ✅ All P1 bugs fixed

---

**Version**: 1.0
**Last Updated**: 2025-11-02
**Status**: Ready for Implementation
