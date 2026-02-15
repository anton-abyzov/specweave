# Implementation Plan: Skill Consolidation & Cleanup

## Overview

Pure deletion + skill merge. No new code, no new features. Delete 4 skill directories, rewrite 1 SKILL.md, update references in hook and source files.

## Approach

### Phase 1: Delete 3 Orphans
Straight deletion of `increment-work-router/`, `tdd-orchestrator/`, `pm-closure-validation/` directories. All confirmed to have zero callers.

### Phase 2: Merge increment-planner INTO increment
Take `increment-planner` SKILL.md as base (it has the real logic). Add `increment`'s unique pre-flights (discipline check, tech stack detection, post-creation sync). Remove `disable-model-invocation: true`. Keep `context: fork` and `model: opus`.

### Phase 3: Reference Updates
Update `user-prompt-submit.sh` hook (10+ occurrences of `sw:increment-planner`). Update comments in TypeScript source files.

### Phase 4: Verify
Rebuild plugin cache. Grep for any remaining stale references.

## Technical Decisions

- **ADR**: Keep `test-aware-planner` separate — 3 callers (skill, skill, CLI) make merging risky for minimal gain (95 lines, 1 skill description saved)
- **ADR**: Don't merge TDD phase skills — 1221 lines combined would create a monster skill
- **ADR**: Don't merge validate + pm-closure-validation — the latter is orphaned (just delete)
