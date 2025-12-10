# ADR-0194: Enforce Config JSON Separation

**Status**: Accepted
**Date**: 2025-12-10
**Decision Makers**: Architecture Team
**Related**: ADR-0050 (Secrets vs Configuration)

## Context

A regression audit (2025-12-10) identified 15 architectural violations where non-secret configuration data was being read from `process.env` instead of `.specweave/config.json` via ConfigManager.

**Violations found:**
- `JIRA_DOMAIN` (12 occurrences across 6 files)
- `AZURE_DEVOPS_ORG` (4 occurrences across 3 files)
- `AZURE_DEVOPS_PROJECT` (2 occurrences across 2 files)

These violations prevented the advertised "config.json-only operation" and forced users to maintain redundant configuration in both `.env` and `config.json`.

## Decision

**Enforce strict separation of secrets and configuration:**

### Secrets (remain in .env)
```bash
# Sensitive - MUST be in .env (gitignored)
AZURE_DEVOPS_PAT=xxx
JIRA_API_TOKEN=xxx
JIRA_EMAIL=xxx
GH_TOKEN=xxx
```

### Configuration (MUST be in config.json)
```json
{
  "issueTracker": {
    "provider": "jira",
    "domain": "company.atlassian.net",
    "organization_ado": "my-organization",
    "project": "my-project"
  }
}
```

### Code Pattern

**BEFORE (violation):**
```typescript
this.domain = process.env.JIRA_DOMAIN || '';
const org = process.env.AZURE_DEVOPS_ORG;
```

**AFTER (correct):**
```typescript
const config = await this.configManager.read();
this.domain = config.issueTracker?.domain || '';
const org = config.issueTracker?.organization_ado || '';
```

## Implementation

### Phase 1: Foundation (Completed)
1. **CredentialsManager** - Added deprecation warnings for config vars in .env
2. **JiraReconciler** - Migrated to ConfigManager for domain
3. **AdoReconciler** - Migrated to ConfigManager for organization

### Phase 2: JIRA Integration (Pending)
4. **JiraMapper** - Add config injection via constructor
5. **JiraIncrementalMapper** - Add config injection via constructor

### Phase 3: Quality Gates (Pending)
6. **ESLint rule** - Block process.env reads for config variables
7. **Pre-tool-use hook** - Prevent new violations during development
8. **CI workflow** - Validate on every PR

## Migration Path

For users with existing `.env` files:

1. **Copy config values to config.json:**
   ```bash
   specweave config set issueTracker.domain "your-domain.atlassian.net"
   specweave config set issueTracker.organization_ado "your-org"
   ```

2. **Remove deprecated vars from .env:**
   ```bash
   # Remove these lines from .env (keep PAT, API_TOKEN, EMAIL):
   # JIRA_DOMAIN=...
   # AZURE_DEVOPS_ORG=...
   # AZURE_DEVOPS_PROJECT=...
   ```

3. **Verify operation:**
   ```bash
   specweave validate
   ```

## Backward Compatibility

- **v0.34.0**: Deprecation warnings for config-in-env
- **v1.0.0**: Remove backward compatibility (hard errors)

During transition period, code falls back to process.env if ConfigManager returns empty.

## Consequences

### Positive
- Single source of truth for configuration
- Configuration can be version-controlled via git
- Team members share identical configuration
- Clearer separation of concerns (secrets vs config)

### Negative
- Breaking change for users with .env-only setup
- Requires migration effort for existing projects
- Deprecation warnings may be noisy during transition

### Neutral
- ESLint rule enforces pattern in new code
- CI catches regressions automatically

## Quality Gates

### ESLint Rule
```javascript
"no-restricted-syntax": [
  "error",
  {
    "selector": "MemberExpression[object.name='process'][property.name='env']",
    "message": "Use ConfigManager for config values, process.env only for secrets"
  }
]
```

### Pre-Tool-Use Hook
`plugins/specweave/hooks/config-env-separator.sh` blocks writes containing:
- `process.env.JIRA_DOMAIN`
- `process.env.AZURE_DEVOPS_ORG`
- `process.env.AZURE_DEVOPS_PROJECT`

## References

- Regression Audit: `.specweave/increments/_archive/REGRESSION-AUDIT-secrets-vs-config-2025-12-10.md`
- Original Architecture: ADR-0050
- Increment: 0107-enforce-config-json-separation
