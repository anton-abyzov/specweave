# Plan: 0209 Jobs Visibility + Clone Tests

## Approach

1. Create skill definition for `/sw:jobs` following `progress/SKILL.md` pattern
2. Write tests for existing untested clone infrastructure (TDD GREEN — code already exists)
3. No source modifications needed — all tests exercise existing code

## Sequencing

- T-001: Skill file (standalone, no deps)
- T-002–T-005: Unit tests (parallel, independent)
- T-006: Integration test (after skill file exists)

## Key Files

- Template: `plugins/specweave/skills/progress/SKILL.md`
- Source: `src/core/background/job-dependency.ts`, `src/cli/workers/clone-worker.ts`, `src/cli/helpers/init/github-repo-cloning.ts`, `src/cli/helpers/init/ado-repo-cloning.ts`
- Test patterns: `tests/unit/jobs.test.ts`, `tests/integration/hooks/skill-invocation-e2e.test.ts`
