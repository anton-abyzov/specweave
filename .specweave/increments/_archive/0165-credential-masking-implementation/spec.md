---
increment: 0165-credential-masking-implementation
title: "Credential Masking Implementation"
status: completed
created: 2026-01-09
started: 2026-01-09
completed: 2026-01-09
---

# 0165: Credential Masking Implementation

## Overview

Implement comprehensive credential masking across all logging utilities to prevent accidental exposure of sensitive credentials in logs, console output, and session files.

## Problem Statement

When executing bash commands that search for credentials (e.g., `grep -E "(GITHUB_TOKEN|JIRA_|ADO_)" .env`), the actual credential values were displayed in the logs:

```
OUT  GITHUB_TOKEN=ghp_IolaygтpMoR4Wg86SqcziySxNRzEgy0Dm0JZ
```

This creates a critical security vulnerability where:
- Credentials appear in console output
- Logs contain plaintext secrets
- Session logs preserve sensitive data
- Screenshots/shares expose tokens

## User Stories

### US-001: Credential Masking in Logs
**As a** developer using SpecWeave,
**I want** credentials to be automatically masked in all log output,
**So that** I don't accidentally expose sensitive tokens when sharing logs or screenshots.

**Acceptance Criteria**:
- [x] **AC-US1-01**: GITHUB_TOKEN values masked in log output
- [x] **AC-US1-02**: JIRA credentials masked in log output
- [x] **AC-US1-03**: Azure DevOps PAT masked in log output
- [x] **AC-US1-04**: Database URLs with passwords masked
- [x] **AC-US1-05**: AWS credentials masked
- [x] **AC-US1-06**: Generic API keys masked

### US-002: Bash Output Sanitization
**As a** developer running bash commands through SpecWeave,
**I want** command output to be sanitized before display,
**So that** credentials from grep/cat commands aren't exposed.

**Acceptance Criteria**:
- [x] **AC-US2-01**: `grep TOKEN .env` output is masked
- [x] **AC-US2-02**: `cat .env` output is masked
- [x] **AC-US2-03**: Multi-line env file outputs masked
- [x] **AC-US2-04**: Docker command outputs masked
- [x] **AC-US2-05**: Curl command outputs masked

### US-003: Debugging-Friendly Masking
**As a** developer debugging issues,
**I want** to see partial credential info (first/last chars),
**So that** I can identify token types while keeping secrets safe.

**Acceptance Criteria**:
- [x] **AC-US3-01**: First 4 characters visible
- [x] **AC-US3-02**: Last 4 characters visible
- [x] **AC-US3-03**: Middle characters replaced with asterisks
- [x] **AC-US3-04**: Token type identifiable (e.g., ghp_ for GitHub)

## Technical Requirements

### TR-001: Core Credential Masker
- Pattern-based detection of 30+ credential formats
- Context-aware masking (shows first/last 4 chars)
- Zero-config (works automatically)
- Handles JSON, env vars, URLs, Bearer tokens

### TR-002: Logger Integration
- All logger methods automatically mask credentials
- Works for console output and error objects
- Preserves logger interface (no breaking changes)

### TR-003: Prompt Logger Security
- User prompts sanitized before writing to session logs
- Prevents credentials in `.specweave/increments/*/logs/`

### TR-004: Bash Sanitizer
- Specialized for shell command outputs
- Detects sensitive commands (grep, cat .env, printenv)
- Sanitizes stdout/stderr before display

## Supported Credential Patterns

- GitHub tokens (GITHUB_TOKEN, GH_TOKEN)
- JIRA credentials (JIRA_API_TOKEN, JIRA_EMAIL)
- Azure DevOps (AZURE_DEVOPS_PAT, ADO_PAT)
- AWS credentials (AWS_SECRET_ACCESS_KEY, AWS_ACCESS_KEY_ID)
- Database URLs (DATABASE_URL, POSTGRES_URL, MYSQL_URL)
- API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, SUPABASE_KEY)
- Bearer tokens (JWT and generic)
- Generic long tokens (40+ chars)

## Security Impact

**Rating**: HIGH

- Prevents credential leaks in logs
- Protects console output
- Secures session files
- Reduces security risk significantly
