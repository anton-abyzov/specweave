# Plan: Plugin/LSP Activation E2E Tests

## Overview

This increment addresses two critical issues:

1. **Plugin Activation Gap**: 24 plugins with 119 skills exist but rarely activate
2. **LSP Not Implemented**: Documentation claims LSP is enabled but no code exists

## Phase 1: Skill Trigger Index (T-001 to T-004)

### Approach

1. Create `src/core/plugins/skill-trigger-extractor.ts` that:
   - Scans all SKILL.md and AGENT.md files
   - Extracts trigger keywords from "Activates for:" sections in descriptions
   - Parses comma-separated, "or" separated keywords
   - Builds inverted index (keyword → skills[])

2. Generate `.specweave/state/skill-triggers-index.json` containing:
   - Keywords mapped to skill names
   - Skill metadata (plugin, description snippet)
   - Generation timestamp

3. Hook into `refresh-marketplace.sh` to regenerate on plugin install

4. Add unit tests in `tests/unit/core/plugins/skill-trigger-extractor.test.ts`

## Phase 2: Plugin Activation E2E Tests (T-005 to T-010)

### Approach

1. Create test infrastructure in `tests/e2e/plugin-activation/`

2. Test matching logic that simulates Claude's skill activation:
   - Load trigger index
   - Match user prompts against keywords
   - Verify correct skills are matched

3. Domain coverage:
   - Kubernetes (EKS, GitOps, Helm)
   - Mobile (React Native, Expo)
   - Backend (NestJS, Prisma, Express)
   - Frontend (Next.js, React)
   - Security, Infrastructure, ML

## Phase 3: LSP Integration (T-011 to T-016) - DEFERRED

Based on investigation, LSP implementation conflicts with ADR-0140's "Code First" philosophy.

**Recommendation**: Mark US-003 as out-of-scope for this increment. Create follow-up ADR to decide:
- Option A: Implement LSP as MCP tool (violates ADR-0140)
- Option B: Use LLM-powered semantic analysis (aligns with ADR-0145)
- Option C: Remove LSP documentation claims

## Phase 4: Plugin Debugging Tools (T-017 to T-019)

### Approach

1. Create `/sw:skill-match` command to test prompt matching
2. Add activation logging with SPECWEAVE_DEBUG_SKILLS env var
3. Log to `.specweave/logs/skill-activation.log`

## Files to Create

1. `src/core/plugins/skill-trigger-extractor.ts` - Core extractor
2. `src/core/plugins/skill-trigger-index.ts` - Index management
3. `tests/unit/core/plugins/skill-trigger-extractor.test.ts` - Unit tests
4. `tests/e2e/plugin-activation/skill-matching.test.ts` - E2E tests
5. `plugins/specweave/commands/skill-match.md` - Debug command

## Success Criteria

- Trigger index contains all 119+ skills
- E2E tests pass for 5+ domains
- `/sw:skill-match` command works
- Index regenerates on plugin install
