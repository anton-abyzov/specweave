# ADR-0138: Init Command Modular Architecture

**Status**: Accepted
**Date**: 2024-11-24
**Decision Makers**: Development Team
**Related Increment**: 0060-migrate-inquirer-to-modular-api

## Context

The `src/cli/commands/init.ts` file had grown to **2,389 lines**, violating the coding standard of "Functions < 100 lines". The main `initCommand()` function alone was ~1,400 lines, making it:

- Difficult to understand and maintain
- Impossible to unit test individual steps
- Prone to bugs due to duplicate code patterns
- A source of context overflow issues for AI assistants

### Problems Identified

1. **Duplicate Smart Re-init Logic**: The same prompt flow for handling existing `.specweave/` directories appeared twice (lines 312-464 and 497-561)
2. **Monolithic Function**: Single function handled 15+ distinct responsibilities
3. **Detection Functions Mixed In**: GitHub/JIRA/ADO detection functions embedded inline
4. **No Separation of Concerns**: UI prompts, business logic, and file operations interleaved

## Decision

**Extract init command logic into modular helper files** following single-responsibility principle.

### New File Structure

```
src/cli/commands/init.ts          (~595 lines - orchestrator only)

src/cli/helpers/init/
├── index.ts                       - Barrel export (73 lines)
├── types.ts                       - Shared interfaces (105 lines)
├── path-utils.ts                  - findPackageRoot, findSourceDir, detectNestedSpecweave (161 lines)
├── config-detection.ts            - detectGitHubRemote, detectJiraConfig, detectADOConfig (145 lines)
├── smart-reinit.ts                - Smart re-initialization prompts (173 lines)
├── plugin-installer.ts            - Claude Code plugin installation (301 lines)
├── repository-setup.ts            - Git provider selection (104 lines)
├── testing-config.ts              - Testing mode prompts (156 lines)
├── external-import.ts             - GitHub/JIRA/ADO import (295 lines)
├── directory-structure.ts         - .specweave/ creation, templates (223 lines)
└── next-steps.ts                  - Post-init instructions (86 lines)
# NOTE: initial-increment-generator.ts deprecated (v1.0.27) - auto increment creation removed
```

### Key Design Decisions

1. **Barrel Export Pattern**: `index.ts` re-exports all public APIs for clean imports
2. **Shared Types**: `types.ts` defines interfaces used across modules
3. **Pure Functions Where Possible**: Detection functions are pure (no side effects)
4. **Prompt Isolation**: Each prompt workflow in its own file
5. **Orchestrator Pattern**: Main `init.ts` coordinates modules, contains no business logic

## Consequences

### Positive

- **75% reduction** in main file size (2,389 → 595 lines)
- **80% reduction** in largest function size (~1,400 → ~280 lines)
- **Eliminated duplicate code** - Smart re-init logic now single source
- **Testable units** - Each module can be unit tested independently
- **Clear responsibilities** - File name indicates purpose
- **Reduced context usage** - AI assistants load only needed modules

### Negative

- **More files to navigate** - 12 files instead of 1
- **Import complexity** - Must use barrel export correctly
- **Coordination overhead** - Changes may span multiple files

### Neutral

- **No behavior change** - Refactoring only, same functionality
- **Backward compatible** - External API (`initCommand`) unchanged

## Implementation Notes

### Import Pattern (from main init.ts)

```typescript
import {
  type InitOptions,
  type RepositoryHosting,
  findSourceDir,
  findPackageRoot,
  detectNestedSpecweave,
  detectGitHubRemote,
  promptSmartReinit,
  installAllPlugins,
  setupRepositoryHosting,
  promptTestingConfig,
  updateConfigWithTesting,
  promptAndRunExternalImport,
  createDirectoryStructure,
  copyTemplates,
  createConfigFile,
  showNextSteps,
  // generateInitialIncrement removed in v1.0.27 - requires per-US **Project**: field
} from '../helpers/init/index.js';
```

### Module Boundaries

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| `types.ts` | Type definitions | None |
| `path-utils.ts` | Path resolution | fs-native |
| `config-detection.ts` | Config detection | fs-native, env-file |
| `smart-reinit.ts` | Re-init prompts | @inquirer/prompts, path-utils |
| `plugin-installer.ts` | Plugin install | claude-cli-detector, path-utils |
| `repository-setup.ts` | Repo selection | @inquirer/prompts |
| `testing-config.ts` | Test config | @inquirer/prompts, fs-native |
| `external-import.ts` | External import | import-coordinator, config-detection |
| `directory-structure.ts` | Dir creation | fs-native, adapters |
| `next-steps.ts` | UI output | chalk, i18n |

## Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Main file lines | 2,389 | 595 | -75% |
| Largest function | ~1,400 | ~280 | -80% |
| Duplicate code blocks | 2 | 0 | -100% |
| Testable units | 1 | 12 | +1100% |
| Average file size | 2,389 | 178 | -93% |

## References

- Coding Standards: "Functions < 100 lines"
- CLAUDE.md: Context management rules
- Increment 0060: Inquirer migration (related work)
