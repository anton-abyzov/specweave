# Implementation Plan: LLM-Native Multilingual Support

**Increment**: 0006-llm-native-i18n
**Created**: 2025-11-02
**Status**: In Progress

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Component Design](#component-design)
3. [Data Flow](#data-flow)
4. [Implementation Strategy](#implementation-strategy)
5. [Testing Approach](#testing-approach)
6. [Migration Path](#migration-path)
7. [Rollout Plan](#rollout-plan)

---

## High-Level Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SpecWeave i18n System                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: System Prompt Injection                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Skills/Agents/Commands                                  │ │
│  │ + "LANGUAGE INSTRUCTION: Respond in Russian"            │ │
│  │ → Claude reads → Generates in target language           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Layer 2: In-Session Translation (Translator Plugin)        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ┌───────────┐  ┌──────────────┐  ┌─────────────────┐  │ │
│  │ │ Skill:    │  │ Agent:       │  │ Command:        │  │ │
│  │ │ translator│  │ translator   │  │ /specweave.     │  │ │
│  │ │           │  │ -agent       │  │ translate       │  │ │
│  │ └───────────┘  └──────────────┘  └─────────────────┘  │ │
│  │                                                          │ │
│  │ Uses current LLM session (no external API)              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Layer 3: Living Docs Auto-Translation                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Post-task hook → Detect language → Invoke translator   │ │
│  │                                                          │ │
│  │ Hook: post-task-completion.sh                           │ │
│  │ Script: translate-living-docs.ts                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Zero External Cost**: Uses current LLM session, no external API calls
2. **LLM-Native**: Leverages Claude's multilingual training instead of translation
3. **Plugin-Based**: Translator is a modular plugin (can be enabled/disabled)
4. **Universal Compatibility**: Works with ANY LLM backend (Claude, GPT-4, Gemini, etc.)
5. **Progressive Enhancement**: Falls back gracefully if translation unavailable

---

## Component Design

### 1. LanguageManager Class

**Purpose**: Central manager for language detection, prompt injection, and translation requests

**Location**: `src/core/i18n/language-manager.ts`

**Responsibilities**:
- Load language configuration from `.specweave/config.json`
- Generate system prompts for skills/agents/commands
- Detect when translation is needed
- Invoke translator skill/agent for translation
- Manage language fallbacks (unsupported → English)

**Interface**:
```typescript
export class LanguageManager {
  constructor(config: SpecweaveConfig);

  // Get current language
  getLanguage(): SupportedLanguage;

  // Generate system prompt for injection
  getSystemPrompt(): string;

  // Request translation (invokes translator skill)
  translate(text: string, options: TranslateOptions): Promise<string>;

  // Check if locale files exist
  hasLocale(language: SupportedLanguage): boolean;

  // Load translated strings
  loadStrings(type: 'cli' | 'errors' | 'templates'): Record<string, string>;
}

interface TranslateOptions {
  targetLanguage: SupportedLanguage;
  contextType?: 'cli' | 'template' | 'docs' | 'living-docs' | 'code-comments';
  preserveMarkdown?: boolean;
  preserveCodeBlocks?: boolean;
  keepFrameworkTerms?: boolean;
  keepTechnicalTerms?: boolean;
}

type SupportedLanguage = 'en' | 'ru' | 'es' | 'zh' | 'de' | 'fr' | 'ja' | 'ko' | 'pt';
```

**Key Methods**:

```typescript
// Example: Get system prompt
getSystemPrompt(): string {
  if (this.language === 'en') return '';

  const languageNames = {
    ru: 'Russian (Русский)',
    es: 'Spanish (Español)',
    zh: 'Chinese (中文)',
    de: 'German (Deutsch)',
    fr: 'French (Français)',
    ja: 'Japanese (日本語)',
    ko: 'Korean (한국어)',
    pt: 'Portuguese (Português)',
  };

  return `
**LANGUAGE INSTRUCTION**:
- All responses, generated content, and documentation must be in ${languageNames[this.language]}
- Code comments should be in ${languageNames[this.language]}
- Variable/function names remain in English (programming convention)
- Technical terms (Git, Docker, Kubernetes, etc.) remain in English
- Framework terms (Increment, Living Docs, SpecWeave) remain in English
- User-facing text, explanations, and documentation must be in ${languageNames[this.language]}

---

`.trim();
}

// Example: Translate via skill
async translate(text: string, options: TranslateOptions): Promise<string> {
  if (this.language === 'en') return text;

  // Create prompt for translator skill
  const prompt = this.buildTranslationPrompt(text, options);

  // Invoke translator skill (auto-activates in current session)
  // This uses Claude's normal skill invocation - no external API!
  const result = await this.invokeTranslatorSkill(prompt);

  return result;
}
```

---

### 2. Translator Plugin

**Purpose**: Modular plugin that provides translation capabilities via current LLM session

**Location**: `src/plugins/specweave-translator/`

**Structure**:
```
src/plugins/specweave-translator/
├── .claude-plugin/
│   ├── manifest.json          # Plugin metadata
│   └── plugin.json            # Claude Code native manifest
├── skills/
│   └── translator/
│       ├── SKILL.md           # Auto-activating translator skill
│       └── test-cases/
│           ├── test-1-cli.yaml
│           ├── test-2-docs.yaml
│           └── test-3-code.yaml
├── agents/
│   └── translator-agent/
│       └── AGENT.md           # Batch translation specialist
└── commands/
    └── translate.md           # Manual translation command
```

#### 2.1 Translator Skill

**File**: `src/plugins/specweave-translator/skills/translator/SKILL.md`

**YAML Frontmatter**:
```yaml
---
name: translator
description: Translates content to target languages using LLM's native multilingual capabilities. Auto-activates for translation requests, CLI localization, living docs updates. Activates for translate to Russian, translate to Spanish, translate docs, localize CLI, i18n, internationalization, multilingual.
---
```

**Content** (simplified):
```markdown
# Translator Skill

## Purpose

Translates SpecWeave content to target languages using the current LLM's native multilingual capabilities.

## How It Works

Instead of using external translation APIs, this skill leverages the fact that modern LLMs (Claude, GPT-4, Gemini) are natively multilingual. You simply provide:
- Source text
- Target language
- Context type (CLI, docs, code comments, etc.)

The LLM translates in the current session - no external costs!

## Supported Languages

- Russian (ru)
- Spanish (es)
- Chinese (zh)
- German (de)
- French (fr)
- Japanese (ja)
- Korean (ko)
- Portuguese (pt)

## Translation Guidelines

When translating, follow these rules:

### Keep in English
- Variable/function names: `authService` not `сервисАутентификации`
- Technical terms: Git, Docker, Kubernetes, TypeScript, npm, etc.
- Framework terms: Increment, Living Docs, SpecWeave, ADR, RFC
- Code blocks (only translate comments within)

### Translate
- User-facing messages
- Documentation prose
- Comments in code
- Error messages
- CLI prompts

### Preserve
- Markdown formatting
- Links and references
- Code block syntax
- Placeholders like {PROJECT_NAME}

## Examples

### Example 1: CLI Message
Input: "Enter project name:"
Target: Russian
Output: "Введите название проекта:"

### Example 2: Error Message
Input: "File not found: {path}"
Target: Spanish
Output: "Archivo no encontrado: {path}"

### Example 3: Documentation
Input: "SpecWeave uses increments to organize work. Each increment has a spec.md file."
Target: Russian
Output: "SpecWeave использует increments для организации работы. Каждый increment имеет файл spec.md."

(Note: "increments" and "spec.md" remain in English)

## Usage

This skill auto-activates when:
- User runs `specweave init --language ru`
- Living docs need translation
- Developer explicitly requests: "Translate this to Russian"
```

#### 2.2 Translator Agent

**File**: `src/plugins/specweave-translator/agents/translator-agent/AGENT.md`

**Purpose**: Specialized sub-agent for batch translation jobs

**YAML Frontmatter**:
```yaml
---
name: translator-agent
description: Batch translation specialist for large-scale localization. Handles 200+ string batches with context preservation. Use via Task tool for CLI messages, templates, documentation.
---
```

**Content** (simplified):
```markdown
# Translator Agent

## Role

You are a specialized translation agent for SpecWeave's internationalization system.

## Expertise

- Batch translation (200+ strings)
- Context-aware translation (CLI vs docs vs code)
- Technical term preservation
- Markdown structure preservation
- Consistency across translations

## Workflow

### 1. Receive Translation Job
Input format:
```json
{
  "targetLanguage": "ru",
  "contextType": "cli",
  "strings": [
    { "key": "init.welcome", "value": "🚀 SpecWeave Initialization" },
    { "key": "init.projectName", "value": "Project name:" },
    ...
  ]
}
```

### 2. Translate with Context

For each string:
- Apply context-appropriate tone
- Preserve placeholders ({PROJECT_NAME}, etc.)
- Keep technical terms in English
- Maintain consistency with previous translations

### 3. Return Translated JSON

Output format:
```json
{
  "language": "ru",
  "translations": [
    { "key": "init.welcome", "value": "🚀 Инициализация SpecWeave" },
    { "key": "init.projectName", "value": "Название проекта:" },
    ...
  ],
  "metadata": {
    "translatedAt": "2025-11-02T12:00:00Z",
    "stringCount": 45
  }
}
```

## Quality Standards

- **Accuracy**: >95% (native speaker quality)
- **Consistency**: Same terms translated identically across strings
- **Context-appropriate**: CLI uses imperative tone, docs use explanatory tone
- **Technical fidelity**: Zero translation errors on technical terms
```

#### 2.3 Translation Command

**File**: `src/plugins/specweave-translator/commands/translate.md`

**Purpose**: Manual translation trigger for developers

```markdown
---
name: specweave.translate
description: Manually translate SpecWeave content to target language. Usage specweave.translate <file> --lang ru
---

# Translation Command

You are executing the `/specweave:translate` command to manually translate content.

## Usage

```bash
/specweave:translate <file> --lang <language>
/specweave:translate README.md --lang ru
/specweave:translate .specweave/docs/strategy.md --lang es
```

## Workflow

1. **Read Source File**: Load content from specified file
2. **Detect Context**: Determine if CLI, docs, code, etc.
3. **Show Preview**: Display first 200 chars of translation
4. **Confirm with User**: Ask "Apply translation? (Y/n)"
5. **Write Translation**: Save to appropriate locale path or update file

## Example

User: `/specweave:translate README.md --lang ru`

You:
1. Read README.md
2. Translate to Russian (preserving markdown, code blocks)
3. Show preview: "# SpecWeave\n\nSpecWeave - это фреймворк для спецификационной разработки..."
4. Ask: "Apply translation to README.ru.md? (Y/n)"
5. If yes → write to README.ru.md
```

---

### 3. Adapter Updates

**Affected Adapters**: Claude, Cursor, Copilot, Generic

**Changes Required**:
1. Add `installSkills()` method parameter for language
2. Inject system prompt at top of skill/agent/command files
3. Handle translator plugin installation

**Example** (Claude Adapter):

```typescript
// src/adapters/claude/adapter.ts (UPDATED)
export class ClaudeAdapter extends AdapterBase {
  async installSkills(
    skills: Skill[],
    language: SupportedLanguage = 'en'
  ): Promise<void> {
    const langManager = new LanguageManager({ language });
    const systemPrompt = langManager.getSystemPrompt();

    for (const skill of skills) {
      // Read original SKILL.md
      const sourcePath = path.join(this.sourcePath, 'skills', skill.name, 'SKILL.md');
      const originalContent = await fs.readFile(sourcePath, 'utf-8');

      // Inject system prompt if non-English
      const finalContent = language !== 'en'
        ? `${systemPrompt}\n\n${originalContent}`
        : originalContent;

      // Write to .claude/skills/
      const targetPath = path.join(this.targetDir, '.claude/skills', skill.name, 'SKILL.md');
      await fs.ensureDir(path.dirname(targetPath));
      await fs.writeFile(targetPath, finalContent);
    }

    console.log(`✅ Installed ${skills.length} skills (language: ${language})`);
  }

  // Same pattern for installAgents() and installCommands()
}
```

---

### 4. Configuration Updates

**File**: `src/core/schemas/specweave-config.schema.json`

**New Fields**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "language": {
      "type": "string",
      "enum": ["en", "ru", "es", "zh", "de", "fr", "ja", "ko", "pt"],
      "default": "en",
      "description": "Primary language for generated content and CLI"
    },
    "translation": {
      "type": "object",
      "properties": {
        "method": {
          "type": "string",
          "enum": ["in-session"],
          "default": "in-session",
          "description": "Translation method (in-session uses current LLM)"
        },
        "autoTranslateLivingDocs": {
          "type": "boolean",
          "default": false,
          "description": "Auto-translate living docs updates"
        },
        "keepFrameworkTerms": {
          "type": "boolean",
          "default": true,
          "description": "Keep framework terms (Increment, Living Docs) in English"
        },
        "keepTechnicalTerms": {
          "type": "boolean",
          "default": true,
          "description": "Keep technical terms (Git, Docker, K8s) in English"
        },
        "translateCodeComments": {
          "type": "boolean",
          "default": true,
          "description": "Translate comments in generated code"
        },
        "translateVariableNames": {
          "type": "boolean",
          "default": false,
          "description": "Translate variable/function names (not recommended)"
        }
      }
    }
  }
}
```

---

### 5. Locale Files

**Structure**:
```
src/locales/
├── en/
│   ├── cli.json        # English CLI messages (source of truth)
│   ├── errors.json     # English error messages
│   └── templates.json  # English template strings
├── ru/
│   ├── cli.json        # Russian translations
│   ├── errors.json
│   └── templates.json
└── es/
    ├── cli.json        # Spanish translations
    ├── errors.json
    └── templates.json
```

**Example** (`src/locales/en/cli.json`):
```json
{
  "init": {
    "welcome": "🚀 SpecWeave Initialization",
    "projectName": "Project name:",
    "detectingTool": "Detecting AI tool...",
    "foundClaude": "✅ Found Claude Code",
    "foundCursor": "✅ Found Cursor",
    "installingAdapter": "📦 Installing {adapter} adapter...",
    "complete": "✨ Initialization complete!",
    "errors": {
      "invalidName": "Project name must be lowercase letters, numbers, and hyphens only",
      "alreadyExists": ".specweave directory already exists"
    }
  },
  "increment": {
    "planning": "📝 Planning increment...",
    "creatingSpec": "Creating spec.md...",
    "creatingPlan": "Creating plan.md...",
    "creatingTasks": "Creating tasks.md...",
    "creatingTests": "Creating tests.md...",
    "complete": "✅ Increment {number} created!"
  }
}
```

**Translation Process**:
1. Developer runs: `/specweave:translate src/locales/en/cli.json --lang ru`
2. Translator agent reads English JSON
3. Translates all values (preserves keys and placeholders)
4. Writes to `src/locales/ru/cli.json`

---

## Data Flow

### Flow 1: Initialize Project in Russian

```
1. User runs: specweave init --language ru
   ↓
2. init.ts detects language = 'ru'
   ↓
3. Check if src/locales/ru/cli.json exists
   ├─ YES → Load existing translations
   └─ NO → Invoke translator agent
       ↓
       Translator agent translates en/cli.json → ru/cli.json
       (Uses current LLM session, no external API)
       ↓
       Saves to src/locales/ru/cli.json
   ↓
4. Load LanguageManager with language = 'ru'
   ↓
5. Replace console.log() with translated strings:
   console.log(i18n.t('init.welcome'))
   // Outputs: "🚀 Инициализация SpecWeave"
   ↓
6. Install adapter with language injection:
   adapter.installSkills(skills, 'ru')
   → Injects system prompt at top of SKILL.md files
   ↓
7. Complete initialization
```

### Flow 2: Generate Spec in Russian

```
1. User runs: /specweave:inc "добавить аутентификацию"
   ↓
2. PM skill loads with injected system prompt:
   "**LANGUAGE INSTRUCTION**: All responses must be in Russian"
   ↓
3. PM skill reads English skill description + Russian instruction
   ↓
4. Claude generates spec.md NATIVELY in Russian:
   # Спецификация: Аутентификация пользователей

   ## Обзор
   Система аутентификации позволяет...
   ↓
5. Writes to .specweave/increments/0001-auth/spec.md
   (Already in Russian - no translation needed!)
```

### Flow 3: Living Docs Auto-Translation

```
1. User completes task: /specweave:do
   ↓
2. Task completes successfully
   ↓
3. post-task-completion.sh hook fires
   ↓
4. Hook reads .specweave/config.json
   language = 'ru'
   autoTranslateLivingDocs = true
   ↓
5. Hook calls translate-living-docs.ts script
   ↓
6. Script detects changed files in .specweave/docs/
   git diff --name-only .specweave/docs/
   → ['.specweave/docs/internal/delivery/AUTH-NOTES.md']
   ↓
7. For each changed file:
   a. Read content (English)
   b. Invoke translator skill:
      "Translate this living docs update to Russian"
   c. Translator skill translates in current session
   d. Write translated content back to file
   ↓
8. Output:
   🌐 Translating living docs to ru...
   ✅ Living docs translated (1 file)
```

---

## Implementation Strategy

### Phase 1: Core Infrastructure (Tasks T-001 to T-008)

**Goal**: Build foundational i18n system

**Duration**: 2-3 days

**Tasks**:
1. Create type definitions (`SupportedLanguage`, `TranslateOptions`)
2. Implement `LanguageManager` class
3. Update config schema with i18n fields
4. Create locale directory structure
5. Implement locale loading mechanism
6. Write unit tests for LanguageManager

**Deliverable**: Working language detection and system prompt generation

---

### Phase 2: Translator Plugin (Tasks T-009 to T-015)

**Goal**: Build modular translation plugin

**Duration**: 3-4 days

**Tasks**:
1. Create plugin directory structure
2. Write translator skill (SKILL.md)
3. Write translator agent (AGENT.md)
4. Write translation command (translate.md)
5. Create plugin manifests (manifest.json + plugin.json)
6. Test skill auto-activation
7. Test agent batch translation

**Deliverable**: Functioning translator plugin that translates via current session

---

### Phase 3: Adapter Integration (Tasks T-016 to T-022)

**Goal**: Update all adapters for language support

**Duration**: 2 days

**Tasks**:
1. Update ClaudeAdapter.installSkills() for language parameter
2. Update ClaudeAdapter.installAgents() for language parameter
3. Update ClaudeAdapter.installCommands() for language parameter
4. Update CursorAdapter (compiled AGENTS.md with system prompt)
5. Update CopilotAdapter (compiled instructions.md)
6. Update GenericAdapter (manual SPECWEAVE-MANUAL.md)
7. Test each adapter with Russian and Spanish

**Deliverable**: All adapters support language injection

---

### Phase 4: CLI Internationalization (Tasks T-023 to T-028)

**Goal**: Replace hardcoded strings with i18n.t() calls

**Duration**: 2 days

**Tasks**:
1. Extract all CLI strings from init.ts, version.ts, index.ts
2. Create en/cli.json with all strings
3. Use translator agent to create ru/cli.json
4. Use translator agent to create es/cli.json
5. Replace console.log() with i18n.t() calls
6. Test CLI in English, Russian, Spanish

**Deliverable**: Fully internationalized CLI

---

### Phase 5: Living Docs Translation (Tasks T-029 to T-033)

**Goal**: Auto-translate living docs updates

**Duration**: 1-2 days

**Tasks**:
1. Create translate-living-docs.ts script
2. Update post-task-completion.sh hook
3. Implement file change detection (git diff)
4. Invoke translator skill for each changed file
5. Test with Russian and Spanish projects

**Deliverable**: Automatic living docs translation

---

### Phase 6: Testing (Tasks T-034 to T-042)

**Goal**: Comprehensive test coverage

**Duration**: 3 days

**Tasks**:
1. Unit tests for LanguageManager
2. Unit tests for translator skill (test-cases/)
3. Integration test: CLI in Russian
4. Integration test: CLI in Spanish
5. Integration test: Adapter installation with language
6. E2E test: Full Russian workflow (init → inc → do → done)
7. E2E test: Full Spanish workflow
8. E2E test: Living docs auto-translation
9. Validate all tests pass

**Deliverable**: 90%+ test coverage, all green

---

### Phase 7: Documentation (Tasks T-043 to T-045)

**Goal**: Update docs for multilingual support

**Duration**: 1 day

**Tasks**:
1. Update CLAUDE.md with i18n section
2. Update README.md with language support
3. Create user guide: docs/guides/multilingual-support.md

**Deliverable**: Complete documentation

---

## Testing Approach

### 1. Unit Tests

**Location**: `tests/unit/i18n/`

**Tests**:
- `language-manager.test.ts`:
  - ✅ getLanguage() returns correct language
  - ✅ getSystemPrompt() returns correct prompt for Russian
  - ✅ getSystemPrompt() returns empty string for English
  - ✅ loadStrings('cli') loads ru/cli.json
  - ✅ Fallback to English for unsupported language

**Example**:
```typescript
describe('LanguageManager', () => {
  it('should generate Russian system prompt', () => {
    const langManager = new LanguageManager({ language: 'ru' });
    const prompt = langManager.getSystemPrompt();

    expect(prompt).toContain('Russian (Русский)');
    expect(prompt).toContain('LANGUAGE INSTRUCTION');
  });

  it('should return empty prompt for English', () => {
    const langManager = new LanguageManager({ language: 'en' });
    const prompt = langManager.getSystemPrompt();

    expect(prompt).toBe('');
  });
});
```

---

### 2. Integration Tests

**Location**: `tests/integration/i18n/`

**Tests**:
- `cli-russian.test.ts`:
  - ✅ `specweave init --language ru` shows Russian prompts
  - ✅ Error messages display in Russian
  - ✅ Templates generated with Russian placeholders

- `cli-spanish.test.ts`:
  - ✅ `specweave init --language es` shows Spanish prompts
  - ✅ All CLI interactions in Spanish

- `adapter-installation.test.ts`:
  - ✅ ClaudeAdapter injects system prompt for Russian
  - ✅ CursorAdapter compiles AGENTS.md with Russian prompt
  - ✅ Skill files contain correct system prompt

**Example**:
```typescript
describe('CLI Russian Integration', () => {
  it('should display Russian prompts during init', async () => {
    const output = await execCommand('specweave init test-project --language ru');

    expect(output).toContain('🚀 Инициализация SpecWeave');
    expect(output).toContain('Название проекта:');
  });
});
```

---

### 3. E2E Tests (Playwright)

**Location**: `tests/e2e/i18n/`

**Tests**:
- `workflow-russian.spec.ts`:
  - ✅ Full workflow: init → inc → do → validate → done
  - ✅ All output in Russian
  - ✅ Generated spec.md is in Russian
  - ✅ Living docs updated in Russian

- `workflow-spanish.spec.ts`:
  - ✅ Same workflow in Spanish

- `living-docs-translation.spec.ts`:
  - ✅ Complete task with autoTranslateLivingDocs = true
  - ✅ Verify living docs file translated
  - ✅ Markdown structure preserved

**Example**:
```typescript
describe('Russian Workflow E2E', () => {
  it('should complete full increment in Russian', async () => {
    // Init with Russian
    await exec('specweave init test-ru --language ru');

    // Create increment
    await exec('/specweave:inc "добавить аутентификацию"');

    // Verify spec.md is in Russian
    const spec = await readFile('.specweave/increments/0001-auth/spec.md');
    expect(spec).toContain('# Спецификация:');
    expect(spec).toContain('## Обзор');

    // Execute task
    await exec('/specweave:do');

    // Verify living docs translated (if enabled)
    const notes = await readFile('.specweave/docs/internal/delivery/AUTH-NOTES.md');
    expect(notes).toContain('Реализация');
  });
});
```

---

## Migration Path

### For Existing English-Only Projects

**Scenario**: Project already initialized in English, wants to add Russian support

**Steps**:

1. **Update Config**:
   ```bash
   # Edit .specweave/config.json
   {
     "language": "ru",
     "translation": {
       "autoTranslateLivingDocs": true
     }
   }
   ```

2. **Reinstall Adapter** (optional, for new skills):
   ```bash
   specweave init --reconfigure
   ```

3. **Translate Existing Docs** (manual):
   ```bash
   /specweave:translate .specweave/docs/strategy.md --lang ru
   /specweave:translate README.md --lang ru
   ```

4. **Future Increments Auto-Generate in Russian**:
   ```bash
   /specweave:inc "новая функция"
   # Creates spec.md in Russian automatically
   ```

---

## Rollout Plan

### v0.6.0-alpha: Russian Only (Week 1)

- ✅ Core infrastructure
- ✅ Translator plugin
- ✅ Russian locale files
- ✅ Basic tests

**Goal**: Validate approach with one language

---

### v0.6.0-beta: Add Spanish (Week 2)

- ✅ Spanish locale files
- ✅ Comprehensive tests
- ✅ Documentation

**Goal**: Prove multi-language scalability

---

### v0.6.0-rc: Polish & Edge Cases (Week 3)

- ✅ Edge case handling (RTL prep, mixed content)
- ✅ Performance optimization
- ✅ Full E2E test suite

**Goal**: Production readiness

---

### v0.6.0: Public Release (Week 4)

- ✅ Release to NPM
- ✅ Announcement blog post
- ✅ Community feedback loop

**Goal**: Stable multilingual SpecWeave

---

### v0.7.0+: Community Languages (Ongoing)

- Chinese (zh)
- German (de)
- French (fr)
- Japanese (ja)
- Korean (ko)
- Portuguese (pt)

**Goal**: Global coverage

---

## Success Criteria

### Must Have (v0.6.0)

- ✅ System prompt injection works for all skills/agents/commands
- ✅ Translator plugin translates CLI to Russian and Spanish
- ✅ `/specweave:inc` generates spec.md in target language
- ✅ Living docs auto-translation (optional, configurable)
- ✅ 90%+ test coverage
- ✅ Zero external API costs
- ✅ Works with ANY LLM backend (Claude, GPT-4, etc.)

### Should Have (v0.6.0)

- ✅ All adapters support language injection
- ✅ CLI fully internationalized
- ✅ Documentation updated

### Nice to Have (v0.7.0+)

- Translation caching (avoid duplicate work)
- Translation quality metrics
- Community translation contributions
- Support for 8+ languages

---

## Appendix: Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] T-001: Type definitions
- [ ] T-002: LanguageManager class
- [ ] T-003: Config schema updates
- [ ] T-004: Locale directory structure
- [ ] T-005: Locale loading mechanism
- [ ] T-006: Unit tests

### Phase 2: Translator Plugin
- [ ] T-009: Plugin directory
- [ ] T-010: Translator skill
- [ ] T-011: Translator agent
- [ ] T-012: Translation command
- [ ] T-013: Plugin manifests
- [ ] T-014: Test skill activation
- [ ] T-015: Test agent batch translation

### Phase 3: Adapter Integration
- [ ] T-016: ClaudeAdapter updates
- [ ] T-017: CursorAdapter updates
- [ ] T-018: CopilotAdapter updates
- [ ] T-019: GenericAdapter updates
- [ ] T-020: Test all adapters

### Phase 4: CLI Internationalization
- [ ] T-023: Extract CLI strings
- [ ] T-024: Create en/cli.json
- [ ] T-025: Translate to Russian
- [ ] T-026: Translate to Spanish
- [ ] T-027: Replace hardcoded strings
- [ ] T-028: Test CLI in all languages

### Phase 5: Living Docs Translation
- [ ] T-029: translate-living-docs.ts script
- [ ] T-030: Update post-task hook
- [ ] T-031: File change detection
- [ ] T-032: Translator invocation
- [ ] T-033: Test auto-translation

### Phase 6: Testing
- [ ] T-034: Unit tests (LanguageManager)
- [ ] T-035: Skill test cases
- [ ] T-036: Integration test (Russian CLI)
- [ ] T-037: Integration test (Spanish CLI)
- [ ] T-038: Integration test (Adapters)
- [ ] T-039: E2E test (Russian workflow)
- [ ] T-040: E2E test (Spanish workflow)
- [ ] T-041: E2E test (Living docs)
- [ ] T-042: Validate 90%+ coverage

### Phase 7: Documentation
- [ ] T-043: Update CLAUDE.md
- [ ] T-044: Update README.md
- [ ] T-045: Create multilingual guide

---

**Version**: 1.0
**Last Updated**: 2025-11-02
**Status**: Ready for Implementation
