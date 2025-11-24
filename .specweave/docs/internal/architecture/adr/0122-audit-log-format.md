# ADR-0122: Audit Log Format (JSON Structured Logging)

**Date**: 2025-11-23
**Status**: Accepted
**Deciders**: Architect, Tech Lead
**Priority**: P2

---

## Context

Feature deletions need comprehensive audit trail for:
- Accountability (who deleted what, when, why)
- Debugging (rollback if deletion was accidental)
- Compliance (track destructive operations)
- Analysis (which features are deleted most often)

**Requirements**:
- Machine-parseable (grep, jq, scripts)
- Human-readable (quick inspection)
- Searchable (by feature ID, user, date, mode)
- Rotatable (prevent log file from growing too large)

**Key Question**: JSON structured logs vs plain text logs?

---

## Decision

**Use JSON Structured Logging with NDJSON format**

```typescript
// src/core/feature-deleter/audit-logger.ts
import fs from 'fs/promises';
import path from 'path';

export interface AuditLogEntry {
  timestamp: string;          // ISO 8601
  eventType: 'feature-deletion';
  featureId: string;
  user: string;
  mode: 'safe' | 'force';
  reason?: string;
  summary: {
    fileCount: number;
    trackedFiles: number;
    untrackedFiles: number;
    orphanedIncrements: string[];
    githubIssuesClosed: number;
  };
  git: {
    commitSha?: string;
    branch?: string;
  };
  duration: number;           // milliseconds
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export class AuditLogger {
  private logPath: string;

  constructor(projectRoot: string) {
    this.logPath = path.join(projectRoot, '.specweave/logs/feature-deletions.log');
  }

  async logDeletion(entry: AuditLogEntry): Promise<void> {
    // Ensure log directory exists
    await fs.mkdir(path.dirname(this.logPath), { recursive: true });

    // Append NDJSON entry
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(this.logPath, line, 'utf-8');

    // Rotate if > 10MB
    await this.rotateIfNeeded();
  }

  private async rotateIfNeeded(): Promise<void> {
    const stats = await fs.stat(this.logPath);
    if (stats.size > 10 * 1024 * 1024) { // 10MB
      const archivePath = `${this.logPath}.${Date.now()}`;
      await fs.rename(this.logPath, archivePath);
    }
  }

  async query(filters: AuditQueryFilters): Promise<AuditLogEntry[]> {
    const content = await fs.readFile(this.logPath, 'utf-8');
    const entries = content.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    return entries.filter(entry => {
      if (filters.featureId && entry.featureId !== filters.featureId) return false;
      if (filters.user && entry.user !== filters.user) return false;
      if (filters.mode && entry.mode !== filters.mode) return false;
      if (filters.since && new Date(entry.timestamp) < new Date(filters.since)) return false;
      return true;
    });
  }
}
```

**Example Log Entry**:
```json
{
  "timestamp": "2025-11-23T14:30:00.000Z",
  "eventType": "feature-deletion",
  "featureId": "FS-052",
  "user": "developer@example.com",
  "mode": "safe",
  "reason": "Duplicate feature (FS-051 supersedes)",
  "summary": {
    "fileCount": 47,
    "trackedFiles": 35,
    "untrackedFiles": 12,
    "orphanedIncrements": [],
    "githubIssuesClosed": 3
  },
  "git": {
    "commitSha": "abc123def456",
    "branch": "develop"
  },
  "duration": 8247,
  "status": "success",
  "errors": []
}
```

**Rationale**:
- **NDJSON (Newline Delimited JSON)**: One JSON object per line (easily parseable)
- **Machine-readable**: jq, grep, awk, scripts
- **Structured**: All fields queryable
- **Human-readable**: Pretty-print with `jq .`

---

## Alternatives Considered

### 1. Plain Text Logs

```
[2025-11-23 14:30:00] Feature FS-052 deleted by developer@example.com (safe mode)
  Files: 47 (35 tracked, 12 untracked)
  Git commit: abc123def456
  GitHub issues closed: 3
```

**Pros**:
- ✅ Simple to read
- ✅ No parsing needed for humans

**Cons**:
- ❌ Hard to parse programmatically
- ❌ No structured querying
- ❌ grep-only searching (limited)

**Why Rejected**: Not machine-readable, hard to analyze at scale.

---

### 2. Binary Logs (SQLite)

**Pros**:
- ✅ Queryable (SQL)
- ✅ Efficient storage
- ✅ Indexing

**Cons**:
- ❌ Requires SQLite library
- ❌ Not human-readable (requires tool)
- ❌ File corruption risk
- ❌ Harder to version control

**Why Rejected**: Overkill for audit logs, not easily grep-able.

---

### 3. CSV Format

```csv
timestamp,featureId,user,mode,fileCount,commitSha
2025-11-23T14:30:00Z,FS-052,dev@example.com,safe,47,abc123
```

**Pros**:
- ✅ Simple
- ✅ Excel-compatible

**Cons**:
- ❌ No nested data (arrays, objects)
- ❌ Quoting issues (commas in strings)
- ❌ Not self-describing

**Why Rejected**: Cannot represent complex data (orphaned increments array).

---

## Consequences

### Positive

- ✅ **Machine-readable**: jq, grep, scripts
- ✅ **Human-readable**: `jq . feature-deletions.log`
- ✅ **Queryable**: Filter by feature ID, user, date
- ✅ **Rotatable**: Auto-rotate at 10MB
- ✅ **Standard format**: NDJSON (industry standard)

### Negative

- ⚠️ **File size**: JSON larger than binary (acceptable trade-off)

---

## Usage Examples

### Query Logs (jq)

```bash
# All deletions for FS-052
jq 'select(.featureId == "FS-052")' .specweave/logs/feature-deletions.log

# Force mode deletions in last 7 days
jq 'select(.mode == "force" and (.timestamp | fromdateiso8601) > (now - 7*86400))' .specweave/logs/feature-deletions.log

# Deletions with orphaned increments
jq 'select(.summary.orphanedIncrements | length > 0)' .specweave/logs/feature-deletions.log

# Failed deletions
jq 'select(.status == "failed")' .specweave/logs/feature-deletions.log
```

### Command: /specweave:audit-deletions

```bash
$ specweave audit-deletions --feature FS-052
┌────────────┬────────┬──────────┬───────┬────────────┬──────────┐
│ Date       │ Feature│ User     │ Mode  │ Files      │ Status   │
├────────────┼────────┼──────────┼───────┼────────────┼──────────┤
│ 2025-11-23 │ FS-052 │ dev@...  │ safe  │ 47         │ success  │
│ 2025-11-20 │ FS-051 │ dev@...  │ force │ 32 (5 orph)│ success  │
└────────────┴────────┴──────────┴───────┴────────────┴──────────┘
```

---

## Log Rotation

**Policy**: Rotate when file size > 10MB

```typescript
private async rotateIfNeeded(): Promise<void> {
  const stats = await fs.stat(this.logPath);
  if (stats.size > 10 * 1024 * 1024) {
    const archivePath = `${this.logPath}.${Date.now()}`;
    await fs.rename(this.logPath, archivePath);

    // Optional: Compress old log
    await exec(`gzip ${archivePath}`);
  }
}
```

**Archived Logs**:
```
.specweave/logs/
├── feature-deletions.log           # Current
├── feature-deletions.log.1732377000  # Archived
└── feature-deletions.log.1732377000.gz  # Compressed
```

---

## References

- **NDJSON Spec**: http://ndjson.org/
- **jq Tutorial**: https://stedolan.github.io/jq/tutorial/
- **Related ADR**: ADR-0121 (Validation Engine)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-23 | NDJSON format | Machine + human readable |
| 2025-11-23 | 10MB rotation threshold | Balance between filesize and auditability |
| 2025-11-23 | Include duration/status | Debugging + performance analysis |
