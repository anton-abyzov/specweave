# Plan: Universal External Sync Fix

## Approach

Fix 5 cascading root causes in TDD order. Each phase: RED tests -> GREEN implementation -> verify.

## Phases

1. Fix ProjectService.getProjectForIncrement() fallback chain
2. Create universal auto-create dispatcher for all providers
3. Add explicit closure on increment completion
4. Fix session-end batch sync event handling
5. Comprehensive integration tests

## Key Files

- `src/core/project/project-service.ts` - Fallback chain + increment.sync case
- `src/core/ac-progress-sync.ts` - closeIncrementIssues()
- `src/core/universal-auto-create.ts` - NEW multi-provider creation
- `plugins/specweave/hooks/v2/dispatchers/post-tool-use.sh` - Wire universal dispatcher + closure
- `plugins/specweave/hooks/v2/handlers/universal-auto-create-dispatcher.sh` - NEW
- `plugins/specweave/hooks/stop-sync.sh` - Preserve event type
