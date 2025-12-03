# Implementation Plan: Umbrella Module Detection

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Living Docs Builder Flow                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐ │
│  │ Clone Job    │───▶│ Umbrella     │───▶│ Discovery            │ │
│  │ config.json  │    │ Config       │    │ (umbrella-aware)     │ │
│  └──────────────┘    └──────────────┘    └──────────────────────┘ │
│         │                   │                      │               │
│         ▼                   ▼                      ▼               │
│  repos: [{path,name}]  umbrella.childRepos   modules: ModuleInfo[] │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Umbrella Detection Infrastructure

1. **New file**: `src/core/living-docs/umbrella-detector.ts`
   - `detectUmbrellaStructure(projectPath)` - main entry
   - `scanForChildRepos(projectPath)` - find .git directories
   - `loadFromCloneJob(projectPath, jobId)` - read clone job config
   - `loadFromUmbrellaConfig(projectPath)` - read config.json

2. **New types**: Add to existing types or new file
   ```typescript
   interface UmbrellaConfig {
     enabled: boolean;
     childRepos: ChildRepoConfig[];
   }

   interface ChildRepoConfig {
     id: string;
     path: string;
     name: string;
     team?: string;
     areaPath?: string;
   }
   ```

### Phase 2: Discovery Enhancement

3. **Modify**: `src/core/living-docs/discovery.ts`
   - Add `buildModulesFromUmbrella()` function
   - Call umbrella detector before standard module detection
   - If umbrella detected, use child repos as modules

4. **Modify**: `detectTechStack()` function
   - Accept optional `modules: ModuleInfo[]` parameter
   - Run detection per-module when umbrella mode

### Phase 3: Clone Job Integration

5. **Modify**: `src/cli/workers/clone-worker.ts`
   - Persist umbrella config to `config.json` after completion
   - Include team/area path mapping in output

6. **Modify**: `src/cli/workers/living-docs-worker.ts`
   - Check for clone job completion
   - Load repos from clone job config first
   - Fallback to umbrella detection

### Phase 4: Config Schema

7. **Update**: Config schema documentation
   - Add `umbrella` section to config.json schema
   - Document childRepos array format

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/core/living-docs/umbrella-detector.ts` | NEW | Umbrella detection logic |
| `src/core/living-docs/discovery.ts` | MODIFY | Add umbrella-aware module detection |
| `src/cli/workers/clone-worker.ts` | MODIFY | Persist umbrella config |
| `src/cli/workers/living-docs-worker.ts` | MODIFY | Load from clone job |
| `src/core/types/config.ts` | MODIFY | Add UmbrellaConfig type |
| `tests/unit/living-docs/umbrella-detector.test.ts` | NEW | Unit tests |

## Risk Mitigation

1. **Performance**: Use async iteration for large repo counts
2. **Backwards compatibility**: Detect umbrella vs standard automatically
3. **Error handling**: Graceful fallback if clone job missing
