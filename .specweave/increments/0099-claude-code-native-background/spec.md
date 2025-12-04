---
increment: 0099-claude-code-native-background
status: completed
---

# Claude Code Native Background Processing for Living Docs

## Overview

Enable AI-powered deep analysis in the Living Docs Builder by leveraging the Claude Code CLI (`claude --print`) from background processes. This uses the user's existing MAX subscription - NO API KEY NEEDED.

## Problem Statement

Living Docs Builder needs AI analysis for deep documentation mode, but:
1. API keys require additional cost beyond MAX subscription
2. Users already pay for Claude MAX and shouldn't pay twice
3. Background workers need isolated LLM access

## Solution

Use `claude --print` CLI command which:
- Works from detached/background processes
- Uses cached MAX subscription credentials from `~/.claude/`
- Supports model selection (opus, sonnet, haiku)
- Returns structured JSON with usage stats

## User Stories

### US-001: Deep Analysis with MAX Subscription

**As a** Claude MAX subscriber running SpecWeave init
**I want to** use my existing MAX subscription for deep living docs analysis
**So that** I don't pay extra API costs for AI-powered features

**Acceptance Criteria:**
- [x] **AC-US1-01**: Claude Code provider exists and spawns `claude --print` subprocesses
- [x] **AC-US1-02**: Default model is Opus 4.5 (not Sonnet)
- [x] **AC-US1-03**: Living docs worker uses ClaudeCodeProvider when depth === 'deep-native'
- [x] **AC-US1-04**: Background worker correctly processes analysis requests
- [x] **AC-US1-05**: Provider returns structured JSON with token usage

## Technical Details

### Files Created (Previous Session)
- `src/core/llm/types.ts` - LLM types, AnalysisDepth, pricing
- `src/core/llm/provider-factory.ts` - Provider factory with claude-code support
- `src/core/llm/providers/claude-code-provider.ts` - The key provider
- `scripts/poc-claude-code-background.sh` - Proof of concept (all tests passed)

### Files to Modify
- `src/cli/workers/brownfield-worker.ts` - Wire up ClaudeCodeProvider

## References

- CLI Reference: https://code.claude.com/docs/en/cli-reference
- ADR-0145: AI-Powered Living Docs Analysis Architecture
