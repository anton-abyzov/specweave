# External Sync Shared Templates

Shared utilities and templates for external PM tool integration (GitHub, JIRA, Azure DevOps).

## Overview

This directory contains extracted boilerplate code that is 80-100% identical across all external sync plugins. Using these shared templates reduces code duplication and ensures consistent behavior.

## Contents

### TypeScript Utilities

| File | Purpose | Used By |
|------|---------|---------|
| `permission-gate.ts` | Check read/write permissions | All sync commands |
| `duplicate-detector-base.ts` | 3-phase duplicate protection | GitHub, JIRA, ADO |

### Shell Utilities

| File | Purpose | Used By |
|------|---------|---------|
| `hooks-common.sh` | Shared bash functions | All post-task-completion hooks |

## Usage

### Permission Gate

```typescript
import { checkSyncPermissions } from '../specweave/lib/external-sync/permission-gate.js';

const permissions = checkSyncPermissions(projectRoot, 'GitHub');
if (!permissions.canWrite) {
  console.log(permissions.message);
  return;
}
```

### Duplicate Detector

```typescript
import { DuplicateDetectorBase } from '../specweave/lib/external-sync/duplicate-detector-base.js';

class GitHubDuplicateDetector extends DuplicateDetectorBase<GitHubIssue> {
  protected async searchExisting(query: SearchQuery): Promise<GitHubIssue[]> {
    // GitHub-specific implementation
  }

  protected async closeItem(itemId: string, reason: string): Promise<void> {
    // GitHub-specific implementation
  }

  protected getItemId(item: GitHubIssue): string {
    return item.number.toString();
  }

  protected getItemTitle(item: GitHubIssue): string {
    return item.title;
  }
}
```

### Shell Hooks

```bash
#!/bin/bash
# Source shared utilities
SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/../../specweave/lib/external-sync/hooks-common.sh"

# Use shared functions
PROJECT_ROOT=$(find_project_root)
if ! can_update_external "$PROJECT_ROOT"; then
  log_warn "External updates disabled"
  exit 0
fi

# Initialize circuit breaker
CIRCUIT_FILE=$(init_circuit_breaker "github")
if [ "$(is_circuit_open "$CIRCUIT_FILE")" = "true" ]; then
  log_warn "Circuit breaker open, skipping external sync"
  exit 0
fi
```

## What's Shared vs Tool-Specific

### Shared (in this directory)

- Permission checking logic (100% identical)
- Circuit breaker pattern (100% identical)
- File locking mechanism (100% identical)
- Logging utilities (100% identical)
- Duplicate detection algorithm (100% identical)
- Project root detection (100% identical)

### Tool-Specific (remains in each plugin)

- API clients (different REST/GraphQL endpoints)
- Work item hierarchy mapping (Epic→Story→Task varies by tool)
- Status mapping (different state machines)
- Field mapping (custom fields differ)
- Import handlers (different data structures)

## Adding New External Tools

When adding support for a new PM tool (e.g., Linear, Notion):

1. Create plugin: `plugins/specweave-{tool}/`
2. Extend `DuplicateDetectorBase` for the tool
3. Source `hooks-common.sh` in your hooks
4. Use `checkSyncPermissions()` in commands
5. Implement tool-specific API client

## Related

- `plugins/specweave-github/` - GitHub Issues/Projects integration
- `plugins/specweave-jira/` - JIRA & Confluence integration
- `plugins/specweave-ado/` - Azure DevOps integration
