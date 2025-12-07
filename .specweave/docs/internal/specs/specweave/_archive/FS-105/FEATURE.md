---
id: FS-105
title: "LLM JSON Extraction Hardening"
type: feature
status: completed
priority: high
created: 2025-12-04
lastUpdated: 2025-12-04
---

# LLM JSON Extraction Hardening

## Overview

The Living Docs Builder AI-powered module analysis experienced ~50% failure rate due to LLMs returning prose-wrapped JSON ("Based on the analysis...") instead of pure JSON. Initial fix implemented robust extraction, but judge evaluation identified gaps.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0105-llm-json-extraction-hardening](../../../../increments/0105-llm-json-extraction-hardening/spec.md) | ✅ completed | 2025-12-04 |

## User Stories

- [US-001: Schema-Aware Correction Prompts](../../specweave/FS-105/us-001-schema-aware-correction-prompts.md)
- [US-002: Automatic Required Fields Extraction](../../specweave/FS-105/us-002-automatic-required-fields-extraction.md)
- [US-003: Retry Wrapper for Providers](../../specweave/FS-105/us-003-retry-wrapper-for-providers.md)
- [US-004: Input Sanitization](../../specweave/FS-105/us-004-input-sanitization.md)
