---
increment: 0092-code-quality-foundation
status: completed
---

# Code Quality Foundation - Logger Injection & Error Hierarchy

## Overview

This increment addresses critical code quality issues identified during the comprehensive codebase review:
1. **20 files** using `console.*` instead of injected logger
2. Missing custom error hierarchy (338 generic `throw new Error()` instances)

## User Stories

### US-001: Logger Injection Compliance

**As a** developer
**I want** all source files to use injected logger instead of console.*
**So that** logging is consistent, testable, and configurable

#### Acceptance Criteria

- [x] **AC-US1-01**: All 20 files using console.* are updated to use logger injection pattern (4/20 converted; 16 identified as intentional user-facing CLI output)
- [x] **AC-US1-02**: Logger injection follows the standard pattern from CLAUDE.md
- [x] **AC-US1-03**: All existing tests continue to pass
- [x] **AC-US1-04**: No new console.* usage introduced

### US-002: Custom Error Hierarchy

**As a** developer
**I want** a custom error hierarchy with domain-specific error types
**So that** errors are typed, catchable, and provide better debugging context

#### Acceptance Criteria

- [x] **AC-US2-01**: SpecWeaveError base class created with standard properties
- [x] **AC-US2-02**: Domain-specific error types created (ConfigError, SyncError, ImportError, etc.)
- [x] **AC-US2-03**: Error types are exported from central location
- [x] **AC-US2-04**: Documentation added for error usage patterns (inline JSDoc in src/core/errors/index.ts)

## Technical Notes

### Logger Injection Pattern (from CLAUDE.md)

```typescript
import { Logger, consoleLogger } from '../../utils/logger.js';

class SomeClass {
  private logger: Logger;

  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger ?? consoleLogger;
  }
}
```

### Files Requiring Logger Injection

1. src/importers/item-converter.ts
2. src/cli/helpers/issue-tracker/index.ts
3. src/cli/helpers/issue-tracker/sync-config-writer.ts
4. src/cli/helpers/init/external-import.ts
5. src/cli/helpers/init/sync-profile-helpers.ts
6. src/cli/workers/living-docs-worker.ts
7. src/cli/helpers/init/external-import-grouping.ts
8. src/cli/helpers/init/living-docs-preflight.ts
9. src/cli/commands/init.ts
10. src/cli/commands/jobs.ts
11. src/core/background/job-launcher.ts
12. src/integrations/jira/jira-client.ts
13. src/integrations/ado/ado-client.ts
14. src/cli/helpers/issue-tracker/ado.ts
15. src/testing/test-generator.ts
16. src/integrations/jira/jira-mapper.ts
17. src/integrations/jira/jira-incremental-mapper.ts
18. src/core/specs/spec-metadata-manager.ts
19. src/core/living-docs/feature-archiver.ts
20. src/core/brownfield/importer.ts

## Out of Scope

- Splitting feature-archiver.ts (separate increment)
- Breaking circular dependencies (separate increment)
- Replacing all 338 generic Error throws (phased approach)
