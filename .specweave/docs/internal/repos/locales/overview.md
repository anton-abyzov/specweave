# locales

*Analyzed: 2025-12-10 | Confidence: low**

## Purpose

The locales folder provides internationalization (i18n) support for SpecWeave CLI, containing JSON translation files for multiple languages (en, de, es, fr, ja, ko, pt, ru, zh) with strings for CLI prompts, error messages, and templates. It uses an LLM-native translation approach with system prompt injection.

## Key Concepts

- i18n locale string management
- JSON-based translation files
- LLM-native translation (Claude Haiku)
- Language detection via Unicode heuristics
- Code block preservation during translation
- System prompt injection for multilingual support
- Interpolation with {{param}} and {param} syntax

## Patterns

- **JSON-based i18n with nested key structure** (structure)
- **Singleton pattern for locale manager** (architecture)
- **LLM-native translation system using Claude Haiku** (integration)
- **Unicode-based language detection heuristics** (data)
- **Content preservation placeholders** (architecture)
- **Interpolation support with dual syntax** (structure)
- **Fallback locale strategy** (architecture)

## External Dependencies

- Claude Haiku API (for translation at ~$0.0025/file)

## Observations

- Supports 9 languages: en, de, es, fr, ja, ko, pt, ru, zh
- English (en) is the most complete with cli.json, errors.json, templates.json
- Other languages have partial translations (cli.json only with .gitkeep placeholder)
- Uses LLM for translation rather than traditional i18n libraries
- Language detection is zero-cost (<1ms) using Unicode heuristics
- Code blocks, inline code, and links are preserved during translation
- Validates translation output for markdown structure preservation
- Part of increment 0006-llm-native-i18n feature