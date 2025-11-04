---
sidebar_position: 3
---

# Multilingual Support (i18n)

SpecWeave provides **LLM-native multilingual support** - work in ANY language with zero additional cost!

## Why Multilingual Matters

- 🌍 **Global Teams** - Work in your native language
- 🎯 **Better Requirements** - Express complex ideas naturally
- 💰 **Zero Cost** - Uses current LLM session (no translation APIs)
- 🤖 **AI-Native** - Works with Claude, GPT-4, Gemini, etc.

## Supported Languages

SpecWeave's translator skill supports **9 languages**:

| Language | Code | Example |
|----------|------|---------|
| 🇬🇧 English | `en` | "Create a real estate broker" |
| 🇷🇺 Russian | `ru` | "Создай профессионального риелтора" |
| 🇪🇸 Spanish | `es` | "Crear un corredor de bienes raíces" |
| 🇨🇳 Chinese | `zh` | "创建房地产经纪人" |
| 🇩🇪 German | `de` | "Erstelle einen Immobilienmakler" |
| 🇫🇷 French | `fr` | "Créer un courtier immobilier" |
| 🇯🇵 Japanese | `ja` | "不動産ブローカーを作成" |
| 🇰🇷 Korean | `ko` | "부동산 중개인 만들기" |
| 🇧🇷 Portuguese | `pt` | "Criar um corretor de imóveis" |

## How It Works

### Claude Code Running in Russian

SpecWeave works seamlessly with localized AI interfaces. Here's Claude Code running entirely in Russian:

![Claude Code in Russian](/img/i18n/claude-code-russian-interface.png)

**What you see**:
- Interface in Russian: "Создай профессионального риелтора" (Create a professional realtor)
- Multi-choice options in Russian
- Natural language project description
- Framework terms preserved in English (`spec.md`, `/specweave:do`)

### Translation Workflow

```bash
# 1. Describe your project in ANY language
"Создай профессионального риелтора.
Он помогает клиентам покупать, продавать и арендовать недвижимость."

# 2. SpecWeave creates specs in your language
/specweave:inc "риелтор-ассистент"

# Created:
# ✅ spec.md - Requirements in Russian
# ✅ plan.md - Architecture in Russian
# ✅ tasks.md - Tasks in Russian
# ✅ Framework terms stay in English

# 3. Work naturally in your language
"Реализуй функционал поиска недвижимости"

# 4. Translate docs when needed
/specweave:translate "spec.md" --to="en"
```

## Translation Rules

SpecWeave follows smart translation rules:

### ✅ **Always Translated**:
- User-facing messages
- Documentation prose
- Requirements and specifications
- Instructions and explanations
- Success/error messages

### ⏸️ **Always in English**:
- Framework terms: `increment`, `spec.md`, `plan.md`, `tasks.md`
- SpecWeave commands: `/specweave:inc`, `/specweave:do`
- Technical terms: `TypeScript`, `npm`, `git`, `API`, `CLI`
- File paths: `.specweave/`, `src/`, `CLAUDE.md`
- Code blocks and examples

### 🔧 **Context-Dependent**:
- Variable names (usually English)
- Code comments (translate if requested)
- Technical acronyms (HTTP, JSON, REST - stay English)

## Example: Russian Project

### Input (Russian)
```
Пользователь: "Создай систему для управления недвижимостью"
```

### SpecWeave Creates
```
.specweave/increments/0001-управление-недвижимостью/
├── spec.md              # Спецификация на русском
├── plan.md              # План реализации на русском
├── tasks.md             # Задачи на русском
└── tests.md             # Тесты на русском
```

### spec.md (Example)
```markdown
# Спецификация: Система управления недвижимостью

## Цели
- Упростить процесс управления объектами
- Автоматизировать расчет арендной платы
- Обеспечить удобный интерфейс для клиентов

## Функциональные требования

### FR-001: Добавление объектов
Система должна позволять добавлять новые объекты недвижимости...

## Технический стек
- Backend: Node.js + TypeScript
- Frontend: React
- Database: PostgreSQL
```

**Note**: Technical terms (`Node.js`, `TypeScript`, `React`, `PostgreSQL`) stay in English for clarity.

## Translating Existing Docs

Use the built-in translator skill:

```bash
# Translate a single file
"Translate spec.md to Spanish"

# Translate entire increment
"Translate increment 0001 to German"

# Translate templates
"Translate CLAUDE.md to Chinese"
```

### Example Translation Session

```
User: "Translate this error message to Russian: File not found in increment 0001"

SpecWeave: "Файл не найден в increment 0001"
```

**Note**: "increment" stays in English (framework term), rest translated.

## Best Practices

### 1. **Choose Your Primary Language**
```bash
# Initialize in your language
specweave init .

# Then describe projects naturally
"Créer une application de commerce électronique"
```

### 2. **Keep Framework Terms Consistent**
✅ **Good**: "Создай increment для аутентификации пользователей"
❌ **Bad**: "Создай инкремент для аутентификации пользователей"

**Rationale**: Framework terms (`increment`, `spec.md`) stay English for:
- Consistency across languages
- Easy cross-team collaboration
- Clear technical documentation

### 3. **Translate for Your Audience**
```bash
# Internal team (Russian speakers)
"Напиши spec.md на русском"

# External docs (English)
"Translate public docs to English"
```

### 4. **Use LLM-Native Translation**
```bash
# No API keys needed!
"Translate this requirement to German"

# SpecWeave uses current LLM session
# Zero additional cost beyond conversation
```

## Advanced: Multi-Language Teams

### Scenario: Global Distributed Team
- **PM in Spain** - Writes specs in Spanish
- **Developers in Russia** - Implement in Russian
- **QA in Germany** - Tests in German
- **Docs Team in USA** - Publishes in English

### Workflow
```bash
# 1. PM creates increment (Spanish)
/specweave:inc "autenticación-usuarios"
# spec.md created in Spanish

# 2. Translate for developers (Russian)
/specweave:translate "spec.md" --to="ru"
# Creates spec.ru.md

# 3. QA translates tests (German)
/specweave:translate "tests.md" --to="de"
# Creates tests.de.md

# 4. Final docs (English)
/specweave:translate "increment 0001" --to="en" --output="public/"
# Creates English versions in public/
```

## Comparison: SpecWeave vs Others

| Feature | SpecWeave | Google Translate API | DeepL | Manual |
|---------|-----------|---------------------|-------|--------|
| **Cost** | ✅ Free (LLM-native) | ❌ Paid per character | ❌ Paid per character | ✅ Free |
| **Context-Aware** | ✅ Understands code/docs | ❌ Generic | 🟡 Limited | ✅ Yes |
| **Framework Terms** | ✅ Auto-preserved | ❌ Translates everything | ❌ Translates everything | 🟡 Manual |
| **Quality** | ✅ High (LLM-powered) | 🟡 Medium | ✅ High | ✅ High |
| **Speed** | ✅ Instant | ✅ Fast | ✅ Fast | ❌ Slow |
| **Setup** | ✅ Zero config | ❌ API keys | ❌ API keys | ✅ Zero |

## Technical Details

### How LLM-Native Translation Works

```
User Request → SpecWeave Translator Skill → Current LLM Session
                                                      ↓
                                              Translation Output
                                                      ↓
                                    Formatted & Structure-Preserved
```

**Benefits**:
- ✅ No external APIs (no latency, no cost)
- ✅ Context-aware (understands SpecWeave structure)
- ✅ Consistent (same LLM for generation & translation)
- ✅ Smart (preserves code, links, formatting)

### Supported LLMs

Works with **ANY** LLM backend:
- ✅ Claude (Sonnet, Opus, Haiku)
- ✅ GPT-4 / GPT-3.5
- ✅ Google Gemini
- ✅ Open-source models (LLaMA, Mistral, etc.)

**No special configuration needed** - just use your preferred LLM!

## Screenshots Gallery

### SpecWeave in Different Languages

#### Russian Interface
![Russian interface showing increment planning](/img/i18n/claude-code-russian-interface.png)
*SpecWeave increment planning in Russian - note framework terms stay in English*

#### Coming Soon
- Spanish interface example
- Chinese documentation example
- German project setup
- Multi-language team workflow

## FAQ

**Q: Do I need to configure language settings?**
A: No! Just start using your preferred language naturally. SpecWeave auto-detects.

**Q: Can I mix languages in one project?**
A: Yes! SpecWeave handles multi-language specs, tasks, and docs.

**Q: Are slash commands translated?**
A: No, commands stay in English (`/specweave:inc`, `/specweave:do`) for consistency across all languages.

**Q: What about code comments?**
A: Code stays in English by default. You can request comment translation explicitly.

**Q: Is translation automatic?**
A: You control when translation happens. Use the translator skill or `/specweave:translate` command.

## Resources

- **Translator Skill**: Auto-activates for translation requests
- **Command**: `/specweave:translate <file> --to=<language>`
- **Supported Languages**: 9 languages (see table above)
- **Documentation**: This guide + translator skill docs

---

**Ready to work in your language?**

```bash
# Just start describing in your preferred language!
"Создай приложение для управления задачами"
"Créer une application de commerce électronique"
"创建任务管理应用程序"
```

**SpecWeave understands and works beautifully in ANY language!** 🌍
