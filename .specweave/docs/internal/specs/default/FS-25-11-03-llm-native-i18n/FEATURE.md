---
id: FS-25-11-03-llm-native-i18n
title: "Specification: LLM-Native Multilingual Support"
type: epic
status: complete
created: 2025-11-14
last_updated: 2025-11-14
external_tools:
  github:
    type: issue
    id: 390
    url: https://github.com/anton-abyzov/specweave/issues/390
---

# FS-25-11-03-llm-native-i18n: Specification: LLM-Native Multilingual Support

Enable SpecWeave to support multiple languages (Russian, Spanish, Chinese, German, French, etc.) using **LLM-native multilingual capabilities** instead of traditional translation. This approach reduces translation costs from $1,000/language to **$0.04/language** (25,000x cheaper) while maintaining high quality and eliminating maintenance burden.

**Key Innovation**: Instead of translating 60K words of skills/agents/commands, we inject a simple system prompt ("Respond in Russian") at the top of each file. Claude/GPT-4 natively understands and responds in the target language, making this a **

---

## Implementation History

| Increment | User Stories | Status | Completion Date |
|-----------|--------------|--------|----------------|
| [0006-llm-native-i18n](../../../../increments/0006-llm-native-i18n/tasks.md) | US-001 through US-008 (all) | ✅ Complete | 2025-11-14 |

**Overall Progress**: 8/8 user stories complete (100%)

---

## User Stories

- [US-001: Russian Developer Initializes Project](us-001-russian-developer-initializes-project.md) - ✅ Complete
- [US-002: Generate Specification in Russian](us-002-generate-specification-in-russian.md) - ✅ Complete
- [US-003: Execute Tasks with Russian Context](us-003-execute-tasks-with-russian-context.md) - ✅ Complete
- [US-004: Living Docs Auto-Translation](us-004-living-docs-auto-translation.md) - ✅ Complete
- [US-005: Spanish Developer Workflow](us-005-spanish-developer-workflow.md) - ✅ Complete
- [US-006: Mixed Language Input](us-006-mixed-language-input.md) - ✅ Complete
- [US-007: Language Configuration](us-007-language-configuration.md) - ✅ Complete
- [US-008: Cost Transparency](us-008-cost-transparency.md) - ✅ Complete

---

## External Tool Integration

**GitHub Issue**: [#337 - [FS-25-11-03]](https://github.com/anton-abyzov/specweave/issues/337)
**JIRA Epic**: [SCRUM-27](https://jira.atlassian.com/browse/SCRUM-27)
