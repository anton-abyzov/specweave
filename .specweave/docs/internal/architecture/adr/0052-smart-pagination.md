# ADR-0052: Smart Pagination (50-Project Limit)

**Date**: 2025-11-21
**Status**: Accepted

## Context

SpecWeave's current initialization flow for external tools (JIRA, Azure DevOps) fetches all projects at once without pagination, causing:

1. **Timeout errors** for users with 100+ projects (2-5 minute waits)
2. **API rate limit violations** (100+ sequential requests)
3. **Poor UX** (frozen terminal, no feedback, abandoned inits)

**Real User Pain Points**:
- "Init timed out after 3 minutes with 200 JIRA projects"
- "Can't use SpecWeave - init never completes"
- "Why does it fetch ALL projects? I only need 5!"

**Current Behavior**:
```typescript
// ❌ WRONG: Fetch all projects at once (no pagination)
const projects = await jiraClient.getAllProjects();  // 200+ API calls
// Timeout after 2-5 minutes
```

**Requirements**:
- Init completes in < 30 seconds (80% improvement from 2-5 minutes)
- Zero timeout errors (100% success rate)
- Support 500+ project instances
- Minimize API calls (reduce from 100+ to < 12)

## Decision

Implement **smart pagination with 50-project limit during init**:

### Phase-Based Loading

**Phase 1: Count Check (Lightweight)**
```http
GET /rest/api/3/project/search?maxResults=0
Response: { total: 127, values: [] }  # < 1 second
```

**Phase 2: First 50 Projects (Initial Load)**
```http
GET /rest/api/3/project/search?startAt=0&maxResults=50
Response: { values: [50 projects], total: 127 }  # < 5 seconds
```

**Phase 3: Remaining Projects (Async, on user choice)**
- Only if user chooses "Import all" strategy
- Batched fetch with progress tracking
- See ADR-0057 (Async Batch Fetching)

### Tier System

**Tier 1 (Init-time)**: First 50 projects
- Load immediately during init
- Full metadata fetched
- Used for checkbox selection UI
- Target: < 5 seconds

**Tier 2/3 (Post-init)**: Remaining projects
- Loaded only if "Import all" chosen
- Async batch fetching with progress
- Target: < 30 seconds for 100 projects

### Configuration

`.specweave/config.json`:
```json
{
  "importInitialLoadLimit": 50,
  "importBatchSize": 50,
  "importShowProgress": true
}
```

## Alternatives Considered

### Alternative 1: Load All Projects Upfront

**Approach**: Fetch all projects at init (current behavior)

**Pros**:
- Simple implementation
- All data available immediately

**Cons**:
- Timeout errors for 100+ projects
- 2-5 minute wait (poor UX)
- API rate limit violations
- Users abandon during wait

**Why not**: Current pain point. Must paginate.

---

### Alternative 2: Virtual Scrolling (Lazy Loading)

**Approach**: Load projects as user scrolls checkbox list

**Pros**:
- Minimal initial load
- Scales to unlimited projects

**Cons**:
- Complex implementation (virtual scrolling in CLI)
- Requires custom Inquirer.js plugin
- Inconsistent with CLI conventions (git, npm)
- Harder to test

**Why not**: Over-engineered. 50-project initial load is sufficient. "Import all" strategy handles bulk operations better.

---

### Alternative 3: Zero Initial Load (Manual Entry Only)

**Approach**: No project fetching during init, only manual entry

**Pros**:
- Instant init (< 1 second)
- Zero API calls

**Cons**:
- Poor UX (requires typing 50 project keys)
- Discovery problem (how do users know keys?)
- Inconsistent with GitHub/ADO flows

**Why not**: Too extreme. 50-project initial load balances speed and discovery.

## Consequences

**Positive**:
- ✅ 80% faster init (2-5 min → < 30 sec)
- ✅ Zero timeout errors (100% success rate)
- ✅ Better UX (immediate feedback, progress visible)
- ✅ API call reduction (90%+ fewer calls)

**Negative**:
- ❌ Users with > 50 projects see truncated initial list
- ❌ "Import all" requires upfront choice (not automatic)
- ❌ Complexity added (pagination logic, tier system)

**Risks & Mitigations**:

**Risk**: Users don't understand why only 50 projects shown
- **Mitigation**: Clear message ("Found 127 projects, showing first 50. Choose 'Import all' to load remaining.")

**Risk**: "Import all" confusing for users wanting 1-2 projects
- **Mitigation**: Manual entry option (third choice in strategy selector)

**Risk**: 50-project limit arbitrary (some users may need 75)
- **Mitigation**: Configurable via `.specweave/config.json` (`importInitialLoadLimit`)

## Implementation Notes

**API Endpoints**:

**JIRA Cloud (v3)**:
- Count: `GET /rest/api/3/project/search?maxResults=0`
- Batch: `GET /rest/api/3/project/search?startAt={offset}&maxResults={limit}`

**JIRA Server (v2)**:
- Count: `GET /rest/api/2/project?maxResults=0`
- Batch: `GET /rest/api/2/project?startAt={offset}&maxResults={limit}`

**Azure DevOps**:
- Count: `GET /_apis/projects?$top=0`
- Batch: `GET /_apis/projects?$skip={offset}&$top={limit}`

**Files Created**:
- `src/cli/helpers/project-count-fetcher.ts` - Lightweight count check
- `tests/unit/cli/helpers/project-count-fetcher.test.ts` - Unit tests

**Testing**:
- Unit tests: Pagination parameters (127 projects → 50 initial, 77 remaining)
- Integration tests: Mock API responses, verify batching
- E2E tests: Real JIRA instance with 100+ projects

## Related Decisions

- **ADR-0053**: CLI-First Defaults - Defines "Import all" as default strategy
- **ADR-0057**: Async Batch Fetching - Defines batch loading implementation
- **ADR-0058**: Progress Tracking - Defines progress UI for async operations
- **ADR-0059**: Cancelation Strategy - Defines Ctrl+C handling during batch fetch
