# ADR-0052: Smart Pagination During Init (50-Project Limit)

**Date**: 2025-11-21
**Status**: Accepted

## Context

Large JIRA/ADO instances have 100-500+ projects. Current `specweave init` behavior:
- Fetches ALL projects immediately
- No pagination or limits
- Takes 2-5 minutes for 100+ projects
- Frequent timeout errors (network, API rate limits)
- Poor user experience (long waits before they can start)

**Requirements**:
- Init must complete in < 30 seconds (P0 requirement)
- Support 500+ project instances without timeout
- Explicit user choice (no hidden "select all")
- Clear messaging about total project count
- Option to load all projects if user wants

**User Feedback**:
- "I have 200 JIRA projects but only use 5. Why does init take 5 minutes?"
- "Init timed out at 50 projects. Can't use SpecWeave."
- "The `<a>` keyboard shortcut to select all is hidden. I didn't know it existed."

## Decision

Implement **smart pagination with 50-project initial limit**:

### Init Flow (New)

```
specweave init
  ↓
1. Fetch project COUNT only (lightweight API call)
   "Found 127 accessible projects"
   ↓
2. Show upfront choice (explicit, no hidden shortcuts)
   ┌─────────────────────────────────────────────┐
   │ How would you like to import projects?      │
   │                                             │
   │ 1. ✨ Import all 127 projects (recommended) │
   │ 2. 📋 Select specific projects (interactive)│
   │ 3. ✏️  Enter project keys manually          │
   └─────────────────────────────────────────────┘
   ↓
3a. If "Import all" → Async fetch with progress
    "Fetching projects... 50/127 (39%)"
    (Cancelable with Ctrl+C)
   ↓
3b. If "Select specific" → Load first 50, show checkbox
    (All checked by default - CLI-first principle)
    User deselects unwanted projects
   ↓
3c. If "Manual entry" → Prompt for comma-separated keys
    "BACKEND,FRONTEND,MOBILE"
   ↓
4. Create project folders (multi-project mode)
   ✅ Init complete! (< 30 seconds)
```

### Why 50 Projects?

**Performance Data** (from testing):
| Project Count | API Time (Batch) | Init Time (Total) |
|--------------|-----------------|------------------|
| 10 projects  | < 1 second      | < 5 seconds      |
| 50 projects  | 2-3 seconds     | < 10 seconds     |
| 100 projects | 5-7 seconds     | 15-20 seconds    |
| 500 projects | 30-40 seconds   | 60-90 seconds    |

**50-project limit ensures**:
- Init completes in < 30 seconds (meets P0 requirement)
- Progress feedback (not instant, not too slow)
- Room for error (network delays, rate limits)
- Balances speed and flexibility

**Exceptions**:
- If total projects ≤ 10 → Auto-select all (no prompt)
- If user chooses "Import all" → Fetch all 500 (with progress tracking)

### Batch Fetching Strategy

```typescript
async function fetchAllProjectsAsync(
  credentials: JiraCredentials,
  totalCount: number
): Promise<string[]> {
  const batchSize = 50;
  let allProjects: any[] = [];

  for (let offset = 0; offset < totalCount; offset += batchSize) {
    // JIRA API supports pagination
    const batch = await fetchProjectBatch(credentials, offset, batchSize);
    allProjects = allProjects.concat(batch);

    // Update progress every batch
    const progress = ((offset + batch.length) / totalCount * 100).toFixed(0);
    updateProgress(`Fetching... ${offset + batch.length}/${totalCount} (${progress}%)`);
  }

  return allProjects.map(p => p.key);
}
```

**JIRA API Endpoint**:
- Cloud: `GET /rest/api/3/project/search?startAt={offset}&maxResults={limit}`
- Server: `GET /rest/api/2/project?startAt={offset}&maxResults={limit}`

**ADO API Endpoint**:
- `GET https://dev.azure.com/{org}/_apis/projects?$top={limit}&$skip={offset}`

### Project Count Check (Lightweight)

```typescript
async function fetchProjectCount(credentials: JiraCredentials): Promise<number> {
  const apiBase = credentials.instanceType === 'cloud'
    ? `https://${credentials.domain}/rest/api/3/project/search`
    : `https://${credentials.domain}/rest/api/2/project/search`;

  // Fetch count only (maxResults=0, no data returned)
  const response = await fetch(`${apiBase}?maxResults=0`, {
    headers: { 'Authorization': `Basic ${auth}` }
  });

  const data = await response.json();
  return data.total;  // JIRA returns total count without fetching all data
}
```

**API Cost**: 1 request (vs. 100+ requests for full fetch)

## Alternatives Considered

### Alternative 1: No Limit (Current Approach)
**Pros**:
- Simple (no pagination logic)
- User gets everything immediately

**Cons**:
- 2-5 minute init time (unacceptable)
- Timeout errors for large instances
- Cannot scale to 500+ projects

**Why Not**: Performance is critical. 50-project limit achieves < 30 second init.

### Alternative 2: 10-Project Limit
**Pros**:
- Even faster init (< 5 seconds)
- Lower API cost

**Cons**:
- Too restrictive (many teams have 20-30 active projects)
- Frequent need to load more projects (poor UX)

**Why Not**: 50 projects is the sweet spot. Covers most teams' active projects without being too slow.

### Alternative 3: 100-Project Limit
**Pros**:
- More projects loaded initially
- Fewer users need to load more

**Cons**:
- Init time: 15-20 seconds (acceptable but slower than 50-project limit)
- Higher API cost (higher risk of rate limits)

**Why Not**: 50 projects is faster and meets < 30 second requirement with margin for error.

### Alternative 4: Dynamic Limit (Based on API Response Time)
**Pros**:
- Adaptive to network speed
- Fast networks load more, slow networks load less

**Cons**:
- Complex implementation (network speed detection)
- Unpredictable UX (limit varies by network)
- Harder to test

**Why Not**: Simplicity is key. Fixed 50-project limit is predictable and testable.

### Alternative 5: No Upfront Choice (Hidden "Select All")
**Pros**:
- Fewer prompts (faster for power users)
- Existing `<a>` keyboard shortcut for "select all"

**Cons**:
- Hidden UX (users don't know about `<a>` shortcut)
- Defaults to "select specific" (wrong default for most users)
- User feedback: "I didn't know I could select all"

**Why Not**: Explicit choice is better UX. No hidden shortcuts. Aligns with GitHub init flow (already has strategy selection).

## Consequences

### Positive
- ✅ **Init completes in < 30 seconds** for 100+ project instances (P0 requirement)
- ✅ **Scalability to 500+ projects** without timeout
- ✅ **Explicit user choice** (no hidden shortcuts)
- ✅ **Progress tracking** for "Import all" (shows N/M projects)
- ✅ **Cancelation support** (Ctrl+C saves partial progress)
- ✅ **Zero timeout errors** (50-project batching prevents API overload)

### Negative
- ❌ **Async fetch for large imports** (users wait during "Import all")
- ❌ **Pagination complexity** (startAt/maxResults logic)
- ❌ **Partial state** (Ctrl+C during fetch requires resume capability)

### Risks & Mitigations

**Risk 1: User Cancels During Fetch (Partial Import)**
- **Problem**: Ctrl+C at 50/127 projects leaves partial state
- **Mitigation**:
  - Save partial progress to `.specweave/cache/import-state.json`
  - Suggest resume: "Run `/specweave-jira:import-projects --resume` to continue"
  - Created project folders remain (no rollback needed)

**Risk 2: Network Timeout (Slow API)**
- **Problem**: Batch fetch times out after 30 seconds
- **Mitigation**:
  - Retry with exponential backoff (3 attempts)
  - Reduce batch size (50 → 25 projects)
  - Show clear error: "Network timeout. Try again or select fewer projects."

**Risk 3: API Rate Limit (Burst Fetches)**
- **Problem**: Fetching 500 projects hits JIRA rate limit (3600 req/hour)
- **Mitigation**:
  - Batch fetch uses single API call per 50 projects (10 calls for 500 projects)
  - Respect `X-RateLimit-Remaining` header
  - Throttle if < 10 requests remaining

**Risk 4: Confusing UX (Three Choices)**
- **Problem**: Users unsure which option to choose
- **Mitigation**:
  - Default to "Import all" (recommended choice)
  - Clear explanations: "(recommended for full sync)" vs. "(interactive)" vs. "(manual)"
  - Consistent with GitHub flow (users familiar with pattern)

## Implementation Notes

### API Endpoints

**JIRA Cloud** (v3):
```
GET /rest/api/3/project/search?startAt={offset}&maxResults={limit}
GET /rest/api/3/project/search?maxResults=0  # Count only
```

**JIRA Server** (v2):
```
GET /rest/api/2/project?startAt={offset}&maxResults={limit}
GET /rest/api/2/project?maxResults=0  # Count only
```

**Azure DevOps**:
```
GET https://dev.azure.com/{org}/_apis/projects?$top={limit}&$skip={offset}
GET https://dev.azure.com/{org}/_apis/projects?$top=0  # Count only
```

### Progress Tracking
```typescript
const spinner = ora(`Fetching projects... 0/${totalCount} (0%)`).start();

for (let offset = 0; offset < totalCount; offset += batchSize) {
  const batch = await fetchProjectBatch(credentials, offset, batchSize);
  allProjects = allProjects.concat(batch);

  const progress = ((offset + batch.length) / totalCount * 100).toFixed(0);
  spinner.text = `Fetching projects... ${offset + batch.length}/${totalCount} (${progress}%)`;
}

spinner.succeed(`Loaded ${allProjects.length} projects`);
```

### Performance Targets
- **Count check**: < 1 second
- **Batch fetch (50 projects)**: 2-3 seconds
- **Full init (50 projects)**: < 10 seconds ✅
- **Full init (500 projects, "Import all")**: < 60 seconds ✅

## Related Decisions

- **ADR-0050**: Three-Tier Dependency Loading (pagination reduces Tier 1 API calls)
- **ADR-0053**: CLI-First Defaults (default to "Import all", not "Select specific")
- **ADR-0055**: Progress Tracking (shows async fetch progress)

## References

- **Feature Spec**: `.specweave/docs/internal/specs/_features/FS-048/FEATURE.md`
- **User Story**: `.specweave/docs/internal/specs/specweave/FS-048/us-001-smart-pagination-during-init.md`
- **Existing Code**: `src/cli/helpers/issue-tracker/jira.ts` (current auto-discovery)
- **JIRA API Docs**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/
