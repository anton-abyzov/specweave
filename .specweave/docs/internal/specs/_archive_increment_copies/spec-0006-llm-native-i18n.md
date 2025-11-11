# Specification: LLM-Native Multilingual Support

**Increment**: 0006-llm-native-i18n
**Title**: LLM-Native Multilingual Support - Zero-Cost Translation via System Prompts
**Priority**: P1
**Status**: In Progress
**Created**: 2025-11-02
**Author**: AI Development Team

---

## Executive Summary

Enable SpecWeave to support multiple languages (Russian, Spanish, Chinese, German, French, etc.) using **LLM-native multilingual capabilities** instead of traditional translation. This approach reduces translation costs from $1,000/language to **$0.04/language** (25,000x cheaper) while maintaining high quality and eliminating maintenance burden.

**Key Innovation**: Instead of translating 60K words of skills/agents/commands, we inject a simple system prompt ("Respond in Russian") at the top of each file. Claude/GPT-4 natively understands and responds in the target language, making this a **zero-translation-cost** solution for the majority of content.

---

## Problem Statement

### Current Limitations

1. **English-Only Framework**: SpecWeave currently only supports English
2. **Global Market Access**: Cannot serve non-English speaking developers (Russia, Latin America, China, Germany, France, etc.)
3. **User Adoption Barrier**: Non-native English speakers have higher cognitive load
4. **Living Docs Language Mismatch**: Generated documentation doesn't match team's working language

### Market Opportunity

- **Russia**: 3M+ developers, rapidly growing AI adoption
- **Latin America**: 5M+ developers, Spanish-speaking market
- **China**: 7M+ developers, largest developer population
- **Germany/France**: 2M+ developers each, EU market access
- **Total addressable market**: 20M+ non-English speaking developers

### Traditional Approach (Why We're NOT Doing This)

**Human Translation**:
- Cost: $1,000 per language
- Time: 2-3 weeks per language
- Maintenance: Manual updates for every change
- Quality: Depends on translator's technical knowledge

**Problem**: Unsustainable for open-source project with 42 skills, 20 agents, 21 commands

---

## Proposed Solution: LLM-Native Approach

### Core Concept

**LLMs are already multilingual!** Claude Sonnet 4.5 and Haiku 4.5 are trained on multilingual corpora and can respond fluently in Russian, Spanish, Chinese, German, French, Japanese, Korean, Portuguese, and many others.

### Three-Layer Architecture

#### **Layer 1: System Prompt Injection** (Zero Cost)

**What**: Inject language instruction at the top of skills/agents/commands
**Cost**: $0 (just text prepending)
**Example**:

```markdown
<!-- .claude/skills/increment-planner/SKILL.md -->
**LANGUAGE INSTRUCTION**: All responses, generated content, and documentation must be in Russian (Русский).

---
name: increment-planner
description: Creates comprehensive implementation plans...
---

# Increment Planner Skill
...
```

**Result**: When Claude reads this skill, it automatically generates spec.md, plan.md, tasks.md in Russian!

#### **Layer 2: In-Session Translation** (Zero Additional Cost!)

**What**: Use the **current LLM session** (this conversation) to translate static content
**Cost**: $0 additional (part of normal conversation usage)
**How**: Via `specweave-translator` plugin with skills and agents

**Plugin Components**:
- **Skill**: `translator` - Auto-activates when translation needed
- **Agent**: `translator-agent` - Batch translation specialist
- **Command**: `/specweave:translate` - Manual translation trigger

**Content Translated**:
- CLI prompts and error messages (~200 strings)
- Template files (CLAUDE.md, AGENTS.md, etc.)
- Framework documentation (user guides)

**Why This Approach?**
- ✅ **No API key management** - Uses current LLM session
- ✅ **No additional costs** - Part of normal conversation
- ✅ **Universal compatibility** - Works with ANY LLM backend (Claude, GPT-4, Gemini)
- ✅ **Immediate availability** - No setup required
- ✅ **Modular** - Plugin can be enabled/disabled

#### **Layer 3: Living Docs Auto-Translation** (In-Session)

**What**: Automatically translate living docs updates after task completion
**Cost**: $0 additional (uses current session)
**Trigger**: Post-task-completion hook detects language setting
**How**: Invokes translator skill or spawns sub-agent via Task tool

**Example**:

```bash
# After completing task in Russian project
🌐 Translating living docs to ru...
✅ Living docs translated (using current LLM session)
```

---

## User Stories

### US-001: Russian Developer Initializes Project

**As** a Russian-speaking developer
**I want** to initialize SpecWeave in Russian
**So that** all generated content matches my team's working language

**Acceptance Criteria**:
- ✅ `specweave init --language ru` initializes in Russian
- ✅ CLI prompts display in Russian ("Название проекта:")
- ✅ Error messages display in Russian ("❌ Файл не найден")
- ✅ Templates (CLAUDE.md) are in Russian
- ✅ System prompt injection configured automatically

**Test Case**: TC-001-01 in tests.md

---

### US-002: Generate Specification in Russian

**As** a Russian-speaking PM
**I want** to generate spec.md in Russian
**So that** my team can review it in our native language

**Acceptance Criteria**:
- ✅ `/specweave:inc "добавить аутентификацию"` creates spec.md in Russian
- ✅ User stories written in Russian ("Как пользователь...")
- ✅ Acceptance criteria in Russian
- ✅ Technical terms remain in English (Git, Docker, Kubernetes)
- ✅ Framework terms remain in English (Increment, Living Docs, SpecWeave)

**Test Case**: TC-002-01 in tests.md

---

### US-003: Execute Tasks with Russian Context

**As** a Russian-speaking developer
**I want** to execute tasks from Russian spec
**So that** implementation follows Russian documentation

**Acceptance Criteria**:
- ✅ `/specweave:do` reads tasks.md in Russian
- ✅ Generated code has Russian comments
- ✅ Variable/function names remain in English (programming convention)
- ✅ Error messages in code are in Russian
- ✅ Console output in Russian

**Test Case**: TC-003-01 in tests.md

---

### US-004: Living Docs Auto-Translation

**As** a Russian-speaking team
**I want** living docs updates to be automatically translated
**So that** documentation stays current without manual translation

**Acceptance Criteria**:
- ✅ Post-task hook detects language = "ru"
- ✅ Haiku translates markdown updates
- ✅ Translation preserves code blocks, links, formatting
- ✅ Cost displayed in hook output
- ✅ Translation completes in \<3 seconds

**Test Case**: TC-004-01 in tests.md

---

### US-005: Spanish Developer Workflow

**As** a Spanish-speaking developer
**I want** full SpecWeave workflow in Spanish
**So that** my team can work in our native language

**Acceptance Criteria**:
- ✅ `specweave init --language es` initializes in Spanish
- ✅ CLI in Spanish ("Nombre del proyecto:")
- ✅ Spec/plan/tasks generated in Spanish
- ✅ Living docs translated to Spanish
- ✅ All functionality identical to Russian implementation

**Test Case**: TC-005-01 in tests.md

---

### US-006: Mixed Language Input

**As** a multilingual developer
**I want** to type commands in either English or target language
**So that** I have flexibility in how I interact with SpecWeave

**Acceptance Criteria**:
- ✅ Russian project accepts: `/specweave:inc "add authentication"`
- ✅ Russian project accepts: `/specweave:inc "добавить аутентификацию"`
- ✅ Both produce same quality spec.md in Russian
- ✅ LLM understands both natively

**Test Case**: TC-006-01 in tests.md

---

### US-007: Language Configuration

**As** a project maintainer
**I want** to configure language settings
**So that** I can customize translation behavior

**Acceptance Criteria**:
- ✅ `.specweave/config.json` has `language` field
- ✅ Can set `autoTranslateLivingDocs: true/false`
- ✅ Can set `keepFrameworkTerms: true/false`
- ✅ Can set `keepTechnicalTerms: true/false`
- ✅ Can set `translateCodeComments: true/false`
- ✅ Configuration validated against JSON schema

**Test Case**: TC-007-01 in tests.md

---

### US-008: Cost Transparency

**As** a SpecWeave user
**I want** to see translation costs
**So that** I can monitor API usage

**Acceptance Criteria**:
- ✅ Haiku translation shows estimated cost before execution
- ✅ Post-translation shows actual cost
- ✅ Living docs hook shows cost per update
- ✅ Cumulative costs tracked in logs

**Test Case**: TC-008-01 in tests.md

---

## Technical Requirements

### TR-001: Core Infrastructure

**Requirement**: Implement `LanguageManager` class for language handling

**Components**:
- Language detection (from config)
- System prompt generation
- Translation method (delegates to Haiku)
- Fallback to English for unsupported languages

**Files**:
- `src/core/i18n/language-manager.ts`
- `src/core/i18n/types.ts`

---

### TR-002: Translation Plugin

**Requirement**: Implement `specweave-translator` plugin for in-session translation

**Plugin Components**:

1. **Translator Skill** (`translator`)
   - Auto-activates when translation is needed
   - Receives: source text, target language, context type
   - Returns: translated text
   - Triggers: "translate to Russian", "translate docs", etc.

2. **Translator Agent** (`translator-agent`)
   - Specialized sub-agent for batch translation
   - Spawned via Task tool for large translation jobs
   - Handles 200+ string batches (CLI messages, templates)
   - Context-aware (understands CLI vs docs vs code comments)

3. **Translation Command** (`/specweave:translate`)
   - Manual translation trigger
   - Usage: `/specweave:translate <file> --lang ru`
   - Shows translation preview before applying

**How It Works**:
```
User: specweave init --language ru
  ↓
LanguageManager detects need for Russian locale
  ↓
Invokes translator skill: "Translate CLI messages to Russian"
  ↓
Translator skill/agent translates in current session
  ↓
Writes to src/locales/ru/cli.json
```

**Files**:
- `src/plugins/specweave-translator/skills/translator/SKILL.md`
- `src/plugins/specweave-translator/agents/translator-agent/AGENT.md`
- `src/plugins/specweave-translator/commands/translate.md`
- `src/plugins/specweave-translator/.claude-plugin/manifest.json`

---

### TR-003: Configuration Schema

**Requirement**: Extend SpecWeave config schema for i18n settings

**Schema**:
```json
{
  "language": "ru" | "es" | "zh" | "de" | "fr" | "ja" | "ko" | "pt" | "en",
  "translation": {
    "method": "in-session",
    "autoTranslateLivingDocs": true,
    "keepFrameworkTerms": true,
    "keepTechnicalTerms": true,
    "translateCodeComments": true,
    "translateVariableNames": false
  }
}
```

**Notes**:
- ✅ No API key required (uses current LLM session)
- ✅ `method: "in-session"` means translation happens in conversation
- ✅ All translation settings are optional (sensible defaults)

**Files**:
- `src/core/schemas/specweave-config.schema.json`
- `src/core/types/config.ts`

---

### TR-004: Adapter Integration

**Requirement**: Update all adapters to support language injection

**Adapters**:
1. **ClaudeAdapter**: Inject system prompt at top of SKILL.md/AGENT.md/command.md
2. **CursorAdapter**: Inject system prompt in compiled AGENTS.md
3. **CopilotAdapter**: Inject system prompt in instructions.md
4. **GenericAdapter**: Inject system prompt in SPECWEAVE-MANUAL.md

**Files**:
- `src/adapters/claude/adapter.ts`
- `src/adapters/cursor/adapter.ts`
- `src/adapters/copilot/adapter.ts`
- `src/adapters/generic/adapter.ts`

---

### TR-005: Locale Files

**Requirement**: Create locale JSON files for supported languages

**Languages (Initial)**:
- Russian (ru)
- Spanish (es)

**Languages (Future)**:
- Chinese (zh)
- German (de)
- French (fr)
- Japanese (ja)
- Korean (ko)
- Portuguese (pt)

**Structure**:
```
src/locales/
├── en/
│   ├── cli.json        # CLI prompts, messages
│   ├── errors.json     # Error messages
│   └── templates.json  # Template placeholders
├── ru/
│   ├── cli.json
│   ├── errors.json
│   └── templates.json
└── es/
    ├── cli.json
    ├── errors.json
    └── templates.json
```

**Files**:
- `src/locales/en/cli.json`
- `src/locales/en/errors.json`
- `src/locales/en/templates.json`
- `src/locales/ru/*.json`
- `src/locales/es/*.json`

---

### TR-006: CLI Internationalization

**Requirement**: Replace hardcoded strings with `i18n.t()` calls

**Files to Update**:
- `src/cli/commands/init.ts` (~30 strings)
- `src/cli/commands/version.ts` (~5 strings)
- `src/cli/index.ts` (~10 strings)

**Pattern**:
```typescript
// Before
console.log('🚀 SpecWeave Initialization\n');

// After
console.log(i18n.t('init.welcome'));
```

---

### TR-007: Living Docs Hook

**Requirement**: Update post-task-completion hook for auto-translation

**Logic**:
1. Detect language from `.specweave/config.json`
2. If language !== 'en' and `autoTranslateLivingDocs === true`:
   - Get changed files in `.specweave/docs/`
   - Call `TranslationPipeline.translateLivingDocsUpdate()`
   - Write translated content back
   - Display cost

**Files**:
- `src/hooks/post-task-completion.sh`
- `src/hooks/translate-living-docs.ts` (new Node.js script)

---

### TR-008: Testing Infrastructure

**Requirement**: Comprehensive test coverage for i18n

**Test Types**:
1. **Unit Tests**:
   - LanguageManager.getSystemPrompt()
   - TranslationPipeline.translate()
   - Configuration validation

2. **Integration Tests**:
   - CLI in Russian
   - CLI in Spanish
   - Adapter installation with language

3. **E2E Tests**:
   - Full workflow in Russian (init → inc → do → done)
   - Full workflow in Spanish
   - Living docs auto-translation

**Files**:
- `tests/unit/i18n/language-manager.test.ts`
- `tests/unit/i18n/translation-pipeline.test.ts`
- `tests/integration/i18n-cli-ru.test.ts`
- `tests/integration/i18n-cli-es.test.ts`
- `tests/e2e/i18n-workflow-ru.spec.ts`
- `tests/e2e/i18n-workflow-es.spec.ts`

---

## Dependencies

### External Dependencies

**ZERO new dependencies!**
- ✅ Translation uses current LLM session (no external API)
- ✅ No API key management needed
- ✅ Works with any LLM backend

### Internal Dependencies

1. **Increment 0004** (Plugin Architecture)
   - Plugin system for `specweave-translator`
   - Adapters must support plugin language injection
   - Config schema must be extensible

2. **Existing Adapter System**
   - All adapters (Claude, Cursor, Copilot, Generic) must be updated

3. **Claude Code Task Tool** (for translation sub-agents)
   - Used to spawn translator agent for batch translation
   - Falls back to skill-based translation if Task tool unavailable

---

## Non-Functional Requirements

### NFR-001: Performance

- **System Prompt Injection**: \<1ms (just text prepending)
- **Haiku Translation (batch)**: \<5 seconds for 20K words
- **Haiku Translation (living docs)**: \<3 seconds for 500 words
- **CLI Startup**: No noticeable delay with locale loading

### NFR-002: Cost

- **One-time setup**: $0 additional (uses current session)
- **Per living docs update**: $0 additional (part of normal usage)
- **Monthly cost (active project)**: $0 additional (no external API calls)

### NFR-003: Quality

- **Translation accuracy**: >95% (Haiku multilingual capability)
- **Technical term preservation**: 100% (Git, Docker, etc. stay English)
- **Markdown structure**: 100% preserved (no broken links/formatting)

### NFR-004: Maintainability

- **Zero ongoing translation work**: System prompts handle skills/agents
- **Automatic updates**: Living docs auto-translate
- **Add new language**: \<1 hour (run Haiku batch script)

---

## Risks and Mitigations

### Risk 1: Haiku Translation Quality

**Risk**: Haiku translations may have lower quality than human translation

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- Use context-aware prompts for better accuracy
- Implement human review for initial locale files
- Cache translations to avoid re-translating
- Provide escape hatch to use Sonnet for critical translations

---

### Risk 2: Session Context Overhead

**Risk**: Translation requests in current session may add token overhead

**Likelihood**: Low
**Impact**: Low

**Mitigation**:
- Translation is part of normal conversation usage (no additional cost)
- Skills auto-activate only when needed
- Caching mechanism for already-translated content
- Users can disable `autoTranslateLivingDocs` if desired

---

### Risk 3: Mixed Language Confusion

**Risk**: Users may get confused with English framework terms in non-English context

**Likelihood**: Medium
**Impact**: Low

**Mitigation**:
- Clear documentation explaining framework term preservation
- Glossary of English terms with native language explanations
- Configuration option to translate framework terms (advanced)

---

### Risk 4: LLM Language Support Limitations

**Risk**: Some languages may have lower LLM proficiency

**Likelihood**: Low
**Impact**: Medium

**Mitigation**:
- Start with well-supported languages (Russian, Spanish, Chinese)
- Test each language before official support
- Provide fallback to English for unsupported languages
- Community feedback for language quality

---

## Success Metrics

### Metric 1: Translation Cost

**Target**: $0 additional cost per language
**Current**: $0 achieved via in-session translation

### Metric 2: User Adoption

**Target**: 20% of new users choose non-English language within 3 months
**Measure**: Analytics on `language` config field

### Metric 3: Translation Quality

**Target**: \<5% user-reported translation issues
**Measure**: GitHub issues tagged with `i18n` or `translation`

### Metric 4: Performance

**Target**: \<3 seconds for living docs translation
**Measure**: Hook execution time logs

---

## Out of Scope (Future Work)

1. **Right-to-Left (RTL) Languages** (Arabic, Hebrew)
   - Complex layout issues
   - Future increment: 0007-rtl-support

2. **Plugin Translation**
   - 42 skills in plugins (separate effort)
   - Community-driven translation
   - Future increment: 0008-plugin-i18n

3. **Documentation Site Translation**
   - Docusaurus i18n (already supported)
   - Separate content translation effort
   - Future increment: 0009-docs-site-i18n

4. **Voice/Audio Support**
   - Text-to-speech in native languages
   - Far future scope

---

## Glossary

| Term | English | Russian | Spanish |
|------|---------|---------|---------|
| **Framework Terms (Kept in English)** |
| Increment | Increment | Increment | Increment |
| Living Docs | Living Docs | Living Docs | Living Docs |
| SpecWeave | SpecWeave | SpecWeave | SpecWeave |
| ADR | ADR | ADR | ADR |
| RFC | RFC | RFC | RFC |
| **Technical Terms (Kept in English)** |
| Git | Git | Git | Git |
| Docker | Docker | Docker | Docker |
| Kubernetes | Kubernetes | Kubernetes | Kubernetes |
| TypeScript | TypeScript | TypeScript | TypeScript |
| **User-Facing Terms (Translated)** |
| Project | Project | Проект | Proyecto |
| Task | Task | Задача | Tarea |
| Specification | Specification | Спецификация | Especificación |
| Plan | Plan | План | Plan |
| Test | Test | Тест | Prueba |

---

## Approval

**Status**: Ready for Implementation
**Approved By**: AI Development Team
**Date**: 2025-11-02

**Next Steps**:
1. Create plan.md (technical architecture)
2. Create tasks.md (implementation breakdown)
3. Create tests.md (test cases)
4. Execute implementation autonomously
5. Test Russian and Spanish workflows
6. Update documentation

---

**Version**: 1.0
**Last Updated**: 2025-11-02
