# Multilingual Guide - SpecWeave Internationalization

**Version**: 0.6.0
**Feature**: LLM-Native Internationalization
**Last Updated**: 2025-11-02

---

## Overview

SpecWeave supports **9 languages** with **zero-cost LLM-native translation**. This means you can work in your preferred language without paying for external translation APIs!

**Supported Languages**:
- 🇬🇧 English (en) - Default
- 🇪🇸 Spanish (es) - Español
- 🇨🇳 Chinese (zh) - 中文
- 🇩🇪 German (de) - Deutsch
- 🇫🇷 French (fr) - Français
- 🇯🇵 Japanese (ja) - 日本語
- 🇰🇷 Korean (ko) - 한국어
- 🇧🇷 Portuguese (pt) - Português
- 🇷🇺 Russian (ru) - Русский

---

## Quick Start

### 1. Configure Your Language

Edit `.specweave/config.json`:

```json
{
  "projectName": "my-project",
  "version": "0.6.0",
  "language": "ru",
  "translation": {
    "autoTranslateLivingDocs": true,
    "keepFrameworkTerms": true,
    "keepTechnicalTerms": true
  }
}
```

**Configuration Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `language` | string | "en" | Your preferred language (en, ru, es, zh, de, fr, ja, ko, pt) |
| `translation.autoTranslateLivingDocs` | boolean | false | Auto-translate documentation after each task |
| `translation.keepFrameworkTerms` | boolean | true | Keep SpecWeave terms in English (increment, spec.md, plan) |
| `translation.keepTechnicalTerms` | boolean | true | Keep technical terms in English (TypeScript, npm, Docker) |

### 2. Start Using SpecWeave in Your Language

Once configured, SpecWeave automatically adapts:

**CLI Messages** (Russian example):
```bash
specweave init my-project
# Output: 🚀 Инициализация SpecWeave
#         Название проекта: my-project
#         ✨ Инициализация завершена!
```

**Living Docs Auto-Translation**:
After each task completion, changed documentation files are automatically translated while preserving framework terms and code blocks.

**System Prompts**:
All agents and skills receive language-specific instructions, ensuring responses are in your configured language.

---

## How It Works: LLM-Native Translation

### Zero-Cost Translation

Instead of using external translation APIs (Google Translate, DeepL), SpecWeave uses **system prompt injection**:

1. **Configuration Read**: SpecWeave reads your language from config
2. **System Prompt Injection**: Prepends language instruction to all markdown files
3. **LLM Translation**: Your current LLM session translates content on-the-fly
4. **No Extra Cost**: Uses the same LLM you're already paying for!

**Example System Prompt (Russian)**:

```markdown
**LANGUAGE INSTRUCTION**: All responses, generated content, and documentation MUST be in Russian (Русский).

Technical terms (TypeScript, npm, git, Docker, etc.) remain in English.
Framework terms (Increment, spec.md, plan.md, Living Docs, SpecWeave, ADR, RFC) remain in English.
Variable/function names remain in English (programming convention).

---

# Your Actual Content Here

[Rest of skill/agent/command content...]
```

### Smart Preservation

SpecWeave automatically preserves:

✅ **Framework Terms**: increment, spec.md, plan.md, tasks.md, COMPLETION-SUMMARY.md, living docs, PM gate, RFC, ADR, PRD, HLD, LLD

✅ **Technical Terms**: TypeScript, npm, git, Docker, Kubernetes, API, CLI, REST, JSON, HTTP, PostgreSQL, React, Python, etc.

✅ **Code Blocks**: All code remains untranslated
```typescript
// This comment would be translated
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

✅ **Emojis**: 🚀 ✨ 📝 All emojis preserved

✅ **File Paths**: `src/components/Header.tsx`

✅ **URLs**: `https://verified-skill.com`

---

## Translation Methods

### Method 1: Automatic Living Docs Translation

**When**: After every task completion
**Trigger**: `post-task-completion` hook
**What**: Changed markdown files in `.specweave/docs/`

**Setup**:
```json
{
  "language": "ru",
  "translation": {
    "autoTranslateLivingDocs": true
  }
}
```

**How It Works**:
1. Task completes → Hook fires
2. Detects changed `.md` files via `git diff`
3. Translates each file using LLM
4. Preserves framework/technical terms
5. Updates files in place

**Log Location**: `.specweave/logs/hooks-debug.log`

```
[2025-11-02 14:30:15] 🌐 Checking if living docs translation is needed for 0006-llm-native-i18n
[2025-11-02 14:30:16] 📝 Auto-translating docs to ru...
[2025-11-02 14:30:17] Found 3 changed file(s)
[2025-11-02 14:30:20] ✓ Translated: .specweave/docs/public/guides/user-guide.md
[2025-11-02 14:30:22] ✓ Translated: .specweave/increments/0006-llm-native-i18n/spec.md
[2025-11-02 14:30:23] ✅ Translation complete (3 files)
```

### Method 2: Manual Translation Command

**When**: You want to translate specific content
**Command**: `/sw:translate`
**What**: Batch translate entire project or specific scopes

**Syntax**:
```bash
/sw:translate <target-language> [--scope <scope>] [--dry-run]
```

**Scopes**:
- `all` - Everything (increments + docs + skills + agents + commands)
- `increments` - All increment folders (spec.md, plan.md, tasks.md, etc.)
- `current` - Current increment only
- `docs` - .specweave/docs/ folder (internal + public)
- `skills` - All skills in .claude/skills/
- `agents` - All agents in .claude/agents/
- `commands` - All slash commands

**Examples**:

```bash
# Translate entire project to Russian
/sw:translate ru --scope all

# Translate only current increment to Spanish
/sw:translate es --scope current

# Translate documentation to German
/sw:translate de --scope docs

# Dry run (preview without writing)
/sw:translate zh --scope increments --dry-run
```

**Workflow**:
1. **Discovery**: Scans project for translatable files
2. **Confirmation**: Shows file count, asks for confirmation
3. **Translation**: Processes files with progress indicators
4. **Validation**: Checks for errors, preserves structure
5. **Report**: Generates translation summary

### Method 3: Translator Skill (On-Demand)

**When**: You need to translate a specific document
**Trigger**: Natural language request to Claude
**What**: Single-file translation with full control

**Usage**:
```
User: Please translate .specweave/docs/public/guides/getting-started.md to Russian

Claude: I'll use the translator skill to translate this guide to Russian while preserving framework terms...

[Activates translator skill automatically]
[Reads file]
[Translates with preservation rules]
[Writes translated version]

✅ Translation complete!
- Framework terms preserved: increment, spec.md, plan.md
- Code blocks preserved: 12 code examples
- Links preserved: 8 URLs
```

### Method 4: Translator Agent (Batch Jobs)

**When**: Large translation projects (20+ files)
**Trigger**: Request batch translation via Task tool
**What**: Coordinates multi-file translation with glossary

**Usage**:
```
User: I need to translate all documentation to Spanish and French

Claude: I'll invoke the translator agent to handle this batch translation...

[Launches translator agent via Task tool]

Translator Agent:
1. Project Analysis: Found 47 translatable files
2. Priority Grouping:
   - Critical (15 files): spec.md, plan.md, user guides
   - Important (20 files): ADRs, RFCs, architecture docs
   - Nice-to-have (12 files): internal notes, drafts
3. Glossary Creation: 45 framework + technical terms
4. Translation Execution:
   - Spanish: 47/47 files ✅
   - French: 47/47 files ✅
5. Quality Validation: All files validated
6. Report: translation-summary.md created

✅ Batch translation complete!
```

---

## Language-Specific Examples

### Russian (Русский)

**Config**:
```json
{
  "language": "ru",
  "translation": {
    "autoTranslateLivingDocs": true,
    "keepFrameworkTerms": true,
    "keepTechnicalTerms": true
  }
}
```

**CLI Output**:
```bash
specweave init my-app
# 🚀 Инициализация SpecWeave
# Название проекта: my-app
# Обнаружена Claude Code
# ✨ Инициализация завершена!

/sw:increment "authentication"
# 📝 Создание increment: authentication
# ✅ Increment 0001 успешно создан!
```

**Translated Content** (spec):
```markdown
# Spec: Аутентификация пользователей

## Обзор
Этот increment добавляет систему аутентификации...

## Пользовательские истории
- US-001: Как пользователь, я хочу войти через email...

## Технические термины
- TypeScript для типобезопасности
- JWT для токенов
- PostgreSQL для базы данных

## Framework термины
- spec.md - спецификация функции
- plan.md - план реализации
- tasks.md - задачи для выполнения
```

### Spanish (Español)

**Config**:
```json
{
  "language": "es",
  "translation": {
    "autoTranslateLivingDocs": true,
    "keepFrameworkTerms": true,
    "keepTechnicalTerms": true
  }
}
```

**CLI Output**:
```bash
/sw:increment "búsqueda de productos"
# 📝 Creando increment: búsqueda de productos
# ✅ ¡Increment 0002 creado exitosamente!
```

**Translated Content** (plan):
```markdown
# Plan: Búsqueda de Productos

## Arquitectura
Este increment implementa búsqueda full-text usando Elasticsearch...

## Componentes
1. **SearchService** - Servicio de búsqueda con TypeScript
2. **ElasticsearchClient** - Cliente para Elasticsearch
3. **SearchUI** - Interfaz React para búsqueda

## Framework convenciones
- spec.md define los requisitos
- plan.md describe la arquitectura
- tasks.md lista las tareas de implementación
```

### Chinese (中文)

**Config**:
```json
{
  "language": "zh",
  "translation": {
    "autoTranslateLivingDocs": true,
    "keepFrameworkTerms": true,
    "keepTechnicalTerms": true
  }
}
```

**Translated Content** (tasks):
```markdown
# Tasks: 支付集成

## 待办任务

### T-001: 创建 Stripe API 客户端
- 安装 TypeScript SDK
- 配置 API keys
- 创建 PaymentService 类

### T-002: 实现结账流程
- 创建 checkout session
- 处理 webhook 事件
- 更新 PostgreSQL 订单状态

## Framework 文件结构
- spec.md - 功能规范
- plan.md - 实施计划
- tasks.md - 任务清单（本文件）
```

---

## Best Practices

### 1. Choose Your Translation Strategy

**For Personal Projects**:
- ✅ Use auto-translation (convenient, hands-off)
- ✅ Keep framework terms in English (easier to get help)
- ✅ Translate CLI output only (specs can stay English)

**For Team Projects**:
- ✅ Manual translation (control quality)
- ✅ Create translation glossary (consistency)
- ✅ Review translations before committing (team agreement)

**For Open Source**:
- ✅ Keep everything in English (global audience)
- ✅ Provide translations in separate branch (optional)
- ✅ Use `/sw:translate` for release docs (user-facing only)

### 2. Framework Term Preservation

**Always keep these in English**:
- ✅ increment (not "инкремент" or "incremento")
- ✅ spec.md, plan.md, tasks.md (filenames stay English)
- ✅ Living docs, PM gate, RFC, ADR (framework concepts)
- ✅ SpecWeave (product name)

**Why?**
- Community resources use English terms
- GitHub issues/discussions use English
- Easier to search for help
- Claude Code documentation uses English

### 3. Technical Term Preservation

**Always keep these in English**:
- ✅ Programming languages: TypeScript, Python, Go
- ✅ Tools: npm, git, Docker, Kubernetes
- ✅ Concepts: API, REST, JSON, HTTP, CLI
- ✅ Databases: PostgreSQL, MongoDB, Redis
- ✅ Frameworks: React, Next.js, Express

**Why?**
- Official documentation uses English
- Code editor autocomplete expects English
- Stack Overflow uses English terms
- Professional consistency

### 4. Translation Quality

**Do**:
- ✅ Review auto-translations before committing
- ✅ Use native speakers for quality check
- ✅ Maintain consistent terminology (create glossary)
- ✅ Preserve markdown formatting
- ✅ Test links and code blocks

**Don't**:
- ❌ Translate code comments (breaks git history)
- ❌ Translate variable names (breaks code)
- ❌ Translate file paths (breaks references)
- ❌ Translate emojis (they're universal!)
- ❌ Translate URLs (breaks links)

### 5. Version Control

**Git Practices**:
```bash
# Commit source files first
git add .specweave/increments/0006-feature/spec.md
git commit -m "feat: add feature spec"

# Then commit translations separately
git add .specweave/increments/0006-feature/spec.ru.md
git commit -m "i18n: add Russian translation for 0006"

# Or use branch strategy
git checkout -b translations/russian
# ... translate files ...
git commit -m "i18n: translate all docs to Russian"
git checkout main
```

**Benefits**:
- ✅ Clear separation of source vs. translation changes
- ✅ Easy to review translation PRs
- ✅ Can revert translations without affecting source
- ✅ Blame history shows who wrote vs. who translated

---

## Troubleshooting

### Translation Not Working

**Problem**: Auto-translation hook doesn't run

**Solution**:
1. Check config: `cat .specweave/config.json`
2. Verify language is not "en"
3. Ensure `autoTranslateLivingDocs: true`
4. Check hook logs: `cat .specweave/logs/hooks-debug.log`
5. Verify node is available: `which node`

### Framework Terms Translated

**Problem**: "increment" appears as "инкремент" in Russian

**Solution**:
1. Check config: `"keepFrameworkTerms": true`
2. Update system prompt in language-registry.ts
3. Re-run translation with correct config

### Poor Translation Quality

**Problem**: Translations are awkward or incorrect

**Solution**:
1. **Use Manual Translation**: More control than auto-translation
2. **Create Glossary**: Define correct translations for domain terms
3. **Review with Native Speaker**: Quality check before committing
4. **Use Translator Agent**: Better quality for large batches
5. **Provide Context**: Give LLM more context about domain

### Mixed Languages in Output

**Problem**: Some parts English, some parts Russian

**Solution**:
1. Check all files have system prompt injection
2. Verify adapter is applying language config
3. Restart Claude Code to reload config
4. Check for hardcoded English strings in code

---

## Advanced Usage

### Custom Translation Rules

You can customize translation behavior by editing system prompts in `src/core/i18n/language-registry.ts`:

```typescript
export const SYSTEM_PROMPTS: Record<SupportedLanguage, string> = {
  ru: `**LANGUAGE INSTRUCTION**: All responses in Russian (Русский).

Technical terms remain in English: TypeScript, npm, git, Docker.
Framework terms remain in English: increment, spec.md, plan.md, Living Docs.

**CUSTOM RULES** (add your project-specific rules):
- Product name "MyApp" remains English
- Team roles (PM, Tech Lead) remain English
- Metric names (DAU, MAU, conversion rate) remain English
`,
  // ...
};
```

### Translation Glossary

Create `.specweave/translation-glossary.md` for consistency:

```markdown
# Translation Glossary

## Framework Terms (Keep in English)
- increment
- spec.md, plan.md, tasks.md
- Living docs
- PM gate
- RFC, ADR, PRD, HLD, LLD

## Technical Terms (Keep in English)
- TypeScript, npm, git, Docker, Kubernetes
- API, REST, JSON, HTTP, CLI
- PostgreSQL, MongoDB, Redis

## Domain Terms (Translate)
| English | Russian | Spanish | Chinese |
|---------|---------|---------|---------|
| User    | Пользователь | Usuario | 用户 |
| Dashboard | Панель управления | Tablero | 仪表板 |
| Settings | Настройки | Configuración | 设置 |
```

### Multi-Language Projects

Support multiple languages simultaneously:

```
.specweave/increments/0006-feature/
├── spec.md              # English (source)
├── spec.ru.md           # Russian translation
├── spec.es.md           # Spanish translation
├── spec.zh.md           # Chinese translation
├── plan.md              # English (source)
├── plan.ru.md           # Russian translation
└── ...
```

**Command**:
```bash
# Translate to multiple languages
/sw:translate ru --scope current
/sw:translate es --scope current
/sw:translate zh --scope current
```

---

## Migration Guide

### From English to Another Language

**Step 1: Update Config**
```bash
vim .specweave/config.json
# Change language from "en" to "ru"
# Enable autoTranslateLivingDocs
```

**Step 2: Translate Existing Content**
```bash
/sw:translate ru --scope all --dry-run  # Preview
/sw:translate ru --scope all             # Execute
```

**Step 3: Verify Translations**
```bash
# Check a few files manually
cat .specweave/increments/0001-auth/spec.md
cat .specweave/docs/public/guides/user-guide.md
```

**Step 4: Commit**
```bash
git add .specweave/config.json
git commit -m "i18n: switch project to Russian"

git add .specweave/
git commit -m "i18n: translate all content to Russian"
```

### From Another Language Back to English

**Step 1: Update Config**
```bash
vim .specweave/config.json
# Change language to "en"
# Disable autoTranslateLivingDocs (optional)
```

**Step 2: No Translation Needed**
English is the default, so no system prompts are injected.

**Step 3: Optional - Restore English Versions**
If you have English originals () alongside translations (.ru), you can remove translations:

```bash
find .specweave/ -name "*.ru.md" -delete
find .specweave/ -name "*.es.md" -delete
```

---

## FAQ

### Q: Does translation cost extra?

**A**: No! LLM-native translation uses your current LLM session (Claude, GPT, etc.), so there are no additional API costs. It's the same LLM you're already using for development.

### Q: Can I mix languages?

**A**: Not recommended. Choose one primary language for your project. You can have translations in separate files (.spec.ru.md, .spec.es) if needed for multilingual teams.

### Q: What if my language isn't supported?

**A**: Currently supported: en, ru, es, zh, de, fr, ja, ko, pt. To add a new language, you'd need to contribute to the SpecWeave codebase by:
1. Adding language to `src/core/i18n/types.ts`
2. Creating system prompt in `src/core/i18n/language-registry.ts`
3. Adding locale files in `src/locales/<lang>/`

### Q: Do I need to translate code comments?

**A**: No! Code comments should stay in English for:
- Consistency with git history
- Easier code reviews
- Better integration with tools (linters, IDEs)
- Professional standard

### Q: How does this work with Git?

**A**: Translations are just file changes. Commit them like any other change:
```bash
git add .specweave/
git commit -m "i18n: translate docs to Russian"
```

For better organization, use separate commits for source changes vs. translations.

### Q: Can I disable auto-translation temporarily?

**A**: Yes! Set `autoTranslateLivingDocs: false` in config. You can still use `/sw:translate` manually when needed.

---

## Support

**Documentation**:
- [SpecWeave Website](https://verified-skill.com)
- [CLAUDE.md](../../CLAUDE) (contributor guide)
- [README.md](../../../../README) (project overview)

**Community**:
- [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)
- [Discussions](https://github.com/anton-abyzov/specweave/discussions)

**Language-Specific Help**:
- 🇷🇺 Russian: Create issue with tag `lang:ru`
- 🇪🇸 Spanish: Create issue with tag `lang:es`
- 🇨🇳 Chinese: Create issue with tag `lang:zh`

---

**Happy coding in your language!** 🌍
