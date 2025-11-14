# ADR-0019: Reflection Storage Format

**Date**: 2025-11-10
**Status**: Accepted

## Context

Self-reflection results need to be stored persistently for historical analysis, pattern detection, and lessons learned. The key questions:

1. **Storage format?** (Markdown vs JSON vs Database)
2. **File organization?** (Per-task vs per-increment vs aggregated)
3. **Retention policy?** (Keep forever vs auto-cleanup)
4. **Searchability?** (How to find past reflections)
5. **Structured data extraction?** (How to analyze trends)

### Requirements

- **Human-readable**: Developers can read reflections directly (no tools required)
- **Searchable**: Easy to grep/search for past issues (file-based search)
- **Machine-parsable**: Can extract structured data for trend analysis
- **Portable**: Works across git, doesn't require database
- **Git-friendly**: Diffs are meaningful, merge conflicts rare
- **Compact**: Doesn't bloat repository (file sizes \&lt;50KB)

### Key Constraints

- Must integrate with existing `.specweave/increments/{id}/logs/` structure
- Must support historical analysis (`/reflections summary`)
- Must work offline (no external dependencies)
- Must be incrementally buildable (one reflection at a time)

## Decision

**Storage Format: Structured Markdown**

### File Organization

```
.specweave/increments/{increment-id}/
└── logs/
    └── reflections/
        ├── task-001-reflection.md    # Per-task reflections
        ├── task-002-reflection.md
        ├── task-003-reflection.md
        └── summary.json              # Aggregated metadata (future)
```

**File Naming Convention**:
- **Format**: `task-{task-number}-reflection.md`
- **Example**: `task-005-reflection.md` (for T-005)
- **Rationale**: Clear task association, sequential ordering, grep-friendly

### Markdown Structure

**Template**:

```markdown
# Self-Reflection: Task T-{number} - {Task Title}

**Completed**: {ISO 8601 timestamp}
**Duration**: {minutes} minutes
**Files Modified**: {count} files, {+lines} lines added, {-lines} lines removed
**Reflection Model**: {haiku|sonnet|opus}
**Cost**: ~${cost}

---

## ✅ What Was Accomplished

{Brief summary of what was implemented in this task}

- Bullet points of key changes
- User stories addressed (AC-US1-01, AC-US1-02)
- Components created/modified

---

## 🎯 Quality Assessment

### ✅ Strengths

- ✅ {What was done well}
- ✅ {Good practices followed}
- ✅ {Well-tested areas}

### ⚠️ Issues Identified

**[CATEGORY] ([SEVERITY] Risk)**
- ❌ **Issue**: [What's wrong]
  - **File**: `[path]:[line]`
  - **Impact**: [Why it matters]
  - **Recommendation**: [How to fix]
  - **Code**:
    [code block with problematic code]
  - **Fix**:
    [code block with corrected code]

[Repeat for each issue]

---

## 🔧 Recommended Follow-Up Actions

**Priority 1 (CRITICAL - Fix Immediately)**:
1. {Action item with file reference}
2. {Action item with file reference}

**Priority 2 (HIGH - Fix This Increment)**:
1. {Action item}
2. {Action item}

**Priority 3 (MEDIUM - Consider for Next Increment)**:
1. {Action item}
2. {Action item}

**Priority 4 (LOW - Nice to Have)**:
1. {Action item}
2. {Action item}

---

## 📚 Lessons Learned

**What went well**:
- {Positive observation}
- {Good practice to repeat}

**What could improve**:
- {Area for improvement}
- {Mistake to avoid next time}

**For next time**:
- {Actionable advice for future tasks}
- {Process improvement suggestion}

---

## 📊 Metrics

- **Issues Found**: {count}
  - CRITICAL: {count}
  - HIGH: {count}
  - MEDIUM: {count}
  - LOW: {count}
- **Categories**:
  - Security: {count}
  - Quality: {count}
  - Testing: {count}
  - Performance: {count}
  - Technical Debt: {count}
- **False Positives**: {count} (if any)
- **Reflection Time**: {seconds}s
- **Estimated Cost**: ${cost}

---

## 🔗 Related

- **Task**: T-{number} in tasks.md
- **Acceptance Criteria**: AC-US{story}-{number}
- **Modified Files**: {list}
- **Previous Reflections**: [T-{prev}](./task-{prev}-reflection.md)
- **GitHub Issue**: #{number} (if synced)
```

### Category Structure

**Issue Categories** (YAML frontmatter-style):

```yaml
issue:
  category: security | quality | testing | performance | technical_debt
  severity: CRITICAL | HIGH | MEDIUM | LOW
  file: path/to/file.ts
  line: 45
  description: What's wrong
  impact: Why it matters
  recommendation: How to fix
  code_snippet: |
    // Problematic code
  fix_snippet: |
    // Corrected code
```

**Severity Definitions**:

| Severity | Definition | Examples | Action Required |
|----------|------------|----------|-----------------|
| **CRITICAL** | Security vulnerability or data loss | SQL injection, hardcoded secrets, auth bypass | Fix immediately |
| **HIGH** | Significant quality/reliability issue | Missing error handling, untested critical path | Fix this increment |
| **MEDIUM** | Moderate quality concern | Code duplication, high complexity | Consider fixing |
| **LOW** | Minor improvement opportunity | Naming conventions, comments | Nice to have |

### Example Reflection

```markdown
# Self-Reflection: Task T-005 - Implement Authentication Service

**Completed**: 2025-11-10T14:30:00Z
**Duration**: 45 minutes
**Files Modified**: 3 files, +287 lines, -12 lines
**Reflection Model**: haiku
**Cost**: ~$0.008

---

## ✅ What Was Accomplished

Implemented core authentication service with JWT token generation, password hashing using bcrypt, and rate limiting via Redis.

- Created `src/services/auth/AuthService.ts` (main service)
- Added password hashing with bcrypt (cost factor: 10)
- Implemented JWT generation with 24h expiration
- Added rate limiting (5 attempts per 15 minutes)
- Addresses: AC-US1-01, AC-US1-02, AC-US1-03

---

## 🎯 Quality Assessment

### ✅ Strengths

- ✅ Clean separation of concerns (service layer pattern)
- ✅ Type-safe configuration loading (Zod validation)
- ✅ Comprehensive error handling (try-catch + typed errors)
- ✅ Security best practices (bcrypt cost factor, JWT expiration)

### ⚠️ Issues Identified

**SECURITY (MEDIUM Risk)**
- ❌ **Issue**: API key exposed in debug logs
  - **File**: `src/services/auth/AuthService.ts:45`
  - **Impact**: Credential leakage in logs (could expose JWT secret)
  - **Recommendation**: Redact sensitive data before logging
  - **Code**:
    ```typescript
    console.debug('Auth config:', config); // Logs JWT_SECRET
    ```
  - **Fix**:
    ```typescript
    console.debug('Auth config:', { ...config, jwtSecret: '[REDACTED]' });
    ```

**TESTING (LOW Risk)**
- ⚠️ **Issue**: Missing edge case tests for API failures
  - **File**: `tests/integration/auth-flow.test.ts`
  - **Impact**: Unhandled error scenarios (rate limit errors, Redis down)
  - **Recommendation**: Add tests for rate limiting edge cases
  - **Code**:
    ```typescript
    // Only happy path tested
    test('login with valid credentials', async () => { ... });
    ```
  - **Fix**:
    ```typescript
    test('login fails when rate limit exceeded', async () => {
      // Simulate 6 failed attempts
      expect(response.status).toBe(429);
    });

    test('login succeeds when Redis unavailable (fallback)', async () => {
      // Disconnect Redis, verify graceful degradation
    });
    ```

---

## 🔧 Recommended Follow-Up Actions

**Priority 1 (CRITICAL - Fix Immediately)**:
1. Redact JWT secret in debug logging (AuthService.ts:45)

**Priority 2 (HIGH - Fix This Increment)**:
2. Add edge case tests for rate limiting (auth-flow.test.ts)

**Priority 3 (MEDIUM - Consider for Next Increment)**:
3. Consider extracting rate limiting to separate service (reusability)

---

## 📚 Lessons Learned

**What went well**:
- TypeScript types caught configuration errors early
- Clean architecture makes testing easier
- Bcrypt integration was straightforward

**What could improve**:
- Should have reviewed security implications before implementing
- Debug logging needs security review process

**For next time**:
- Add security checklist to task template (review before marking complete)
- Write edge case tests alongside happy path (TDD approach)
- Consider using structured logging (redact secrets automatically)

---

## 📊 Metrics

- **Issues Found**: 2
  - CRITICAL: 0
  - HIGH: 0
  - MEDIUM: 1
  - LOW: 1
- **Categories**:
  - Security: 1
  - Quality: 0
  - Testing: 1
  - Performance: 0
  - Technical Debt: 0
- **False Positives**: 0
- **Reflection Time**: 12s
- **Estimated Cost**: $0.008

---

## 🔗 Related

- **Task**: T-005 in tasks.md
- **Acceptance Criteria**: AC-US1-01, AC-US1-02, AC-US1-03
- **Modified Files**:
  - src/services/auth/AuthService.ts
  - src/services/auth/types.ts
  - tests/integration/auth-flow.test.ts
- **Previous Reflections**: [T-004](./task-004-reflection.md)
- **GitHub Issue**: #130
```

### Rationale for Markdown Over JSON

**Why Markdown?**

1. **Human-readable** (primary use case):
   - Developers read reflections frequently (review past issues)
   - JSON is harder to read (requires jq or tools)
   - Markdown displays natively on GitHub, VS Code, terminals

2. **Git-friendly**:
   - Diffs are meaningful (added issues, removed warnings)
   - Merge conflicts rare (sequential file creation)
   - Blame history useful (track when issue was identified)

3. **Searchable**:
   - `grep "SQL injection" .specweave/increments/*/logs/reflections/*.md` works
   - `ag "CRITICAL"` finds all critical issues instantly
   - No database required (filesystem search is fast)

4. **Machine-parsable** (when needed):
   - Extract structured data with regex or markdown parser
   - Aggregate metrics to `summary.json` (future)
   - Build dashboards from markdown (future)

**Why Not JSON?**

- ❌ Not human-readable (requires tools)
- ❌ Verbose for large reports (code snippets as strings)
- ❌ No syntax highlighting for code snippets
- ❌ Hard to diff (one-line changes span entire file)

**Why Not Database?**

- ❌ Requires setup (SQLite, PostgreSQL)
- ❌ Not portable (can't grep, doesn't sync via git)
- ❌ Overkill for simple storage (1-10K reflections)

### Aggregated Metadata (Future Enhancement)

**File**: `.specweave/increments/{id}/logs/reflections/summary.json`

**Purpose**: Machine-readable summary for trend analysis

```json
{
  "incrementId": "0016-self-reflection-system",
  "totalReflections": 12,
  "totalIssues": 34,
  "issuesBySeverity": {
    "CRITICAL": 2,
    "HIGH": 8,
    "MEDIUM": 15,
    "LOW": 9
  },
  "issuesByCategory": {
    "security": 5,
    "quality": 12,
    "testing": 10,
    "performance": 4,
    "technicalDebt": 3
  },
  "avgReflectionTime": 14.2,
  "totalCost": 0.12,
  "modelUsage": {
    "haiku": 10,
    "sonnet": 2,
    "opus": 0
  },
  "topIssues": [
    {
      "count": 5,
      "description": "Missing edge case tests"
    },
    {
      "count": 3,
      "description": "Code duplication"
    }
  ]
}
```

**Note**: This is auto-generated from markdown files (not source of truth).

## Alternatives Considered

### Alternative 1: JSON Format

**Description**: Store reflections as JSON files

**Structure**:
```json
{
  "taskId": "T-005",
  "timestamp": "2025-11-10T14:30:00Z",
  "issues": [
    {
      "category": "security",
      "severity": "MEDIUM",
      "file": "AuthService.ts",
      "line": 45,
      "description": "API key in logs"
    }
  ]
}
```

**Pros**:
- Machine-parsable (no regex needed)
- Type-safe (JSON schema validation)
- Easy to aggregate (jq, JSON tools)

**Cons**:
- ❌ Not human-readable (requires jq)
- ❌ No syntax highlighting for code snippets
- ❌ Hard to diff (entire file changes)
- ❌ Verbose for large reports

**Why Not Chosen**: Human-readability is more important than machine-parseability (developers read reflections frequently).

---

### Alternative 2: SQLite Database

**Description**: Store reflections in local SQLite database

**Schema**:
```sql
CREATE TABLE reflections (
  id INTEGER PRIMARY KEY,
  task_id TEXT,
  timestamp TEXT,
  issues TEXT -- JSON blob
);
```

**Pros**:
- Queryable (SQL joins, filters)
- Efficient aggregation (GROUP BY)
- Structured schema (no parsing)

**Cons**:
- ❌ Requires database setup (complexity)
- ❌ Not git-friendly (binary file, merge conflicts)
- ❌ Not portable (can't grep, doesn't sync)
- ❌ Overkill for simple storage

**Why Not Chosen**: Git-friendly and grep-able storage is more valuable than SQL queryability.

---

### Alternative 3: Single Aggregated File Per Increment

**Description**: Store all reflections in one file: `reflections.md`

**Structure**:
```markdown
# Reflections for Increment 0016

## Task T-001
{reflection content}

## Task T-002
{reflection content}
```

**Pros**:
- Simpler (one file to manage)
- Easier to read all reflections at once

**Cons**:
- ❌ Large files (10K+ lines for 20 tasks)
- ❌ Merge conflicts likely (multiple tasks)
- ❌ Hard to link to specific reflection (no anchors)
- ❌ Slow to search (grep entire file)

**Why Not Chosen**: Separate files scale better and avoid merge conflicts.

---

### Alternative 4: YAML Format

**Description**: Store reflections as YAML files

**Pros**:
- Human-readable (better than JSON)
- Machine-parsable (YAML libraries)
- Concise (less verbose than JSON)

**Cons**:
- ❌ Whitespace-sensitive (error-prone)
- ❌ No syntax highlighting for code snippets
- ❌ Less familiar than Markdown

**Why Not Chosen**: Markdown is more familiar and better for documentation.

## Consequences

### Positive

- ✅ **Human-readable**: Developers can read reflections directly (no tools)
- ✅ **Git-friendly**: Diffs are meaningful, merge conflicts rare
- ✅ **Searchable**: Grep/ag works instantly (no database needed)
- ✅ **Portable**: Works offline, syncs via git
- ✅ **Syntax highlighting**: Code snippets display nicely
- ✅ **GitHub-friendly**: Renders beautifully on GitHub
- ✅ **Machine-parsable**: Can extract data when needed (summary.json)

### Negative

- ❌ **Parsing complexity**: Need regex/markdown parser for structured data
- ❌ **No schema validation**: Markdown structure can diverge
- ❌ **Aggregation overhead**: Must parse multiple files for trends
- ❌ **Storage overhead**: Markdown is less compact than JSON

### Neutral

- 🔄 **File proliferation**: 20 tasks = 20 reflection files (manageable)
- 🔄 **Maintenance**: Must keep template consistent across reflections
- 🔄 **Future migration**: May need to migrate to database later (if >10K reflections)

### Risks

#### Risk 1: Markdown Template Drift

**Likelihood**: Medium
**Impact**: Medium (inconsistent reflections, harder to parse)

**Mitigation**:
- Use template generator (don't write manually)
- Validate structure on creation (check required sections)
- Versioned templates (v1, v2) for backward compatibility

#### Risk 2: Large File Sizes

**Likelihood**: Low
**Impact**: Low (Git bloat, slower searches)

**Mitigation**:
- Limit code snippets to 20 lines (not entire files)
- Compress old reflections (gzip older increments)
- Auto-cleanup after 6 months (configurable retention policy)

#### Risk 3: Parsing Brittleness

**Likelihood**: Medium
**Impact**: Medium (aggregation breaks if format changes)

**Mitigation**:
- Use robust markdown parser (Remark, Marked.js)
- Graceful degradation (skip unparseable reflections)
- Versioned templates (detect version, parse accordingly)

## Related Decisions

- [ADR-0017](0017-self-reflection-architecture.md): Self-reflection system architecture
- [ADR-0018](0018-reflection-model-selection.md): Model selection strategy
- [ADR-0001](0001-spec-driven-development.md): Living docs storage format (if exists)

## Implementation Notes

### Template Generator

```typescript
// src/hooks/lib/reflection-template.ts

export interface ReflectionData {
  taskId: string;
  taskTitle: string;
  timestamp: string;
  duration: number;
  filesModified: { count: number; added: number; removed: number };
  model: ReflectionModel;
  cost: number;
  accomplishments: string[];
  strengths: string[];
  issues: Issue[];
  followUpActions: FollowUpAction[];
  lessonsLearned: LessonsLearned;
  metrics: ReflectionMetrics;
}

export function generateReflectionMarkdown(data: ReflectionData): string {
  return `# Self-Reflection: Task ${data.taskId} - ${data.taskTitle}

**Completed**: ${data.timestamp}
**Duration**: ${data.duration} minutes
**Files Modified**: ${data.filesModified.count} files, +${data.filesModified.added} lines, -${data.filesModified.removed} lines
**Reflection Model**: ${data.model}
**Cost**: ~$${data.cost.toFixed(3)}

---

## ✅ What Was Accomplished

${data.accomplishments.map(a => `- ${a}`).join('\n')}

---

## 🎯 Quality Assessment

### ✅ Strengths

${data.strengths.map(s => `- ✅ ${s}`).join('\n')}

### ⚠️ Issues Identified

${data.issues.map(formatIssue).join('\n\n')}

---

${formatFollowUpActions(data.followUpActions)}

---

${formatLessonsLearned(data.lessonsLearned)}

---

${formatMetrics(data.metrics)}

---

## 🔗 Related

- **Task**: ${data.taskId} in tasks.md
- **Modified Files**:
${data.filesModified.files.map(f => `  - ${f}`).join('\n')}
`;
}
```

### Storage API

```typescript
// src/hooks/lib/reflection-storage.ts

export class ReflectionStorage {
  private incrementId: string;
  private reflectionsDir: string;

  constructor(incrementId: string) {
    this.incrementId = incrementId;
    this.reflectionsDir = `.specweave/increments/${incrementId}/logs/reflections`;
  }

  async save(taskId: string, reflection: ReflectionData): Promise<string> {
    await fs.mkdir(this.reflectionsDir, { recursive: true });

    const filename = this.getFilename(taskId);
    const markdown = generateReflectionMarkdown(reflection);

    await fs.writeFile(filename, markdown, 'utf-8');

    return filename;
  }

  async load(taskId: string): Promise<ReflectionData | null> {
    const filename = this.getFilename(taskId);

    if (!fs.existsSync(filename)) {
      return null;
    }

    const markdown = await fs.readFile(filename, 'utf-8');
    return parseReflectionMarkdown(markdown);
  }

  async list(): Promise<string[]> {
    if (!fs.existsSync(this.reflectionsDir)) {
      return [];
    }

    const files = await fs.readdir(this.reflectionsDir);
    return files
      .filter(f => f.endsWith('-reflection.md'))
      .sort();
  }

  private getFilename(taskId: string): string {
    // T-005 → task-005-reflection.md
    const taskNumber = taskId.replace(/^T-/, '').padStart(3, '0');
    return path.join(this.reflectionsDir, `task-${taskNumber}-reflection.md`);
  }
}
```

### Retention Policy (Future)

```json
{
  "reflection": {
    "retention": {
      "enabled": true,
      "maxAge": 180,        // Days (6 months)
      "autoCompress": true, // Gzip old reflections
      "compressAfter": 90   // Days (3 months)
    }
  }
}
```

## Review Notes

**Approved By**: [To be filled during review]
**Review Date**: [To be filled during review]
**Concerns Raised**: [To be filled during review]

## Change History

- **2025-11-10**: Initial version (ADR-0019 created)
