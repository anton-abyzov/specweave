# Plan - 0196 Auto Mode v5 Stop Hook Simplification

## Approach

Implement ADR-0225: Simplify stop-auto.sh from 1320 lines to ~175 lines. Remove broken features (test running, LLM eval, auto-close, retry counter). Fix dedup race condition. Write real integration tests. Align SKILL.md with reality.

## Architecture

Hook responsibility: **gate only** (is auto active? is there pending work?)
Quality gates: move to `/sw:done` (tests, build, coverage, LLM eval)
Model responsibility: run quality checks before executing `/sw:done`

## Key Files

| File | Action |
|------|--------|
| `plugins/specweave/hooks/stop-auto-v5.sh` | CREATE (~175 lines) |
| `tests/integration/hooks/stop-auto-v5.test.ts` | CREATE (14 test scenarios) |
| `tests/unit/hooks/stop-auto-v5-helpers.test.ts` | CREATE |
| `plugins/specweave/hooks/hooks.json` | EDIT (point to v5) |
| `plugins/specweave/hooks/stop-auto.sh` | RENAME to stop-auto-legacy.sh |
| `plugins/specweave/skills/auto/SKILL.md` | EDIT (align with reality) |
| `tests/integration/auto/stop-hook.test.ts` | DELETE (937 skipped lines) |
| `.specweave/docs/internal/architecture/adr/0225-auto-mode-simplification.md` | EDIT (mark accepted) |

## Risk Mitigation

Legacy hook kept as rollback. New hook created alongside, not replacing.
