---
id: FS-060
title: "Migrate Inquirer to Modular API"
type: feature
status: completed
priority: critical
created: 2025-11-25
lastUpdated: 2025-11-25
---

# Migrate Inquirer to Modular API

## Overview

The v0.26.14 "fix" for inquirer prompts broke all interactive selection prompts. The fix incorrectly changed `type: 'list'` to `type: 'select'` in the **legacy** `inquirer.prompt()` API, where `'select'` is not a valid type.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0060-migrate-inquirer-to-modular-api](../../../../increments/0060-migrate-inquirer-to-modular-api/spec.md) | ✅ completed | 2025-11-25 |

## User Stories

- [US-001: Fix Interactive Prompts](../../specweave/FS-060/us-001-fix-interactive-prompts.md)
- [US-002: Clean Migration](../../specweave/FS-060/us-002-clean-migration.md)
