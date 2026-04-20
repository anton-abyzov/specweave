# 0671 fixtures — skill-refinement end-to-end

Fixtures for `tests/integration/skill-refine-e2e.test.ts`.

- `judge-llm-report.json` — a mock judge-llm closure report rejecting a fictional increment with evidence that references `sw:architect`.
- `skill-architect-SKILL.md` — a trimmed copy of a realistic `sw:architect` SKILL.md body. Used as the input to the Haiku diff proposer and the pattern-match attribution heuristic.
- `increment-meta.json` — minimal increment metadata for the fictional increment `9991-fixture-refine` referenced by the judge report.

The integration test:
1. Writes these fixtures into a temp workspace.
2. Drives `appendRefinementSignal` with data extracted from the mock judge report → `skill-signals.json`.
3. Invokes the skill-refine entrypoint in `--dry-run` mode with Anthropic SDK mocked via `vi.hoisted() + vi.mock()`.
4. Asserts the dry-run diff output references at least one evidence fragment from the judge report.

No real API calls. No CI key.
