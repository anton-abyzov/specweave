# ADR-0192: Use Jira Agile API for Board Operations

**Status**: Accepted
**Date**: 2025-12-08
**Context**: Jira init board validation failures

---

## Problem

During `specweave init` with Jira integration, **ALL board validations failed** with "Not found" errors:

```
Project: AAC (2 boards)
  ⚠️  Board 365: Not found
  ⚠️  Board 338: Not found
Project: DMC (2 boards)
  ⚠️  Board 397: Not found
  ⚠️  Board 334: Not found
...
```

**BUT** board discovery worked correctly:
```
✔ Found 2 boards for AAC
✔ Found 2 boards for DMC
```

This indicated a **disconnect between board discovery and board validation APIs**.

---

## Root Cause

**API Endpoint Mismatch in `jira-validator.ts`**:

```typescript
// ❌ WRONG (line 300 in jira-validator.ts)
async checkBoard(boardId: number): Promise<JiraBoard | null> {
  const board = await this.callJiraApi(`board/${boardId}`);
  // → Uses /rest/api/3/board/{boardId} (DOES NOT EXIST!)
```

The `callJiraApi()` method hardcoded `/rest/api/3/` which works for:
- ✅ Projects: `/rest/api/3/project`
- ✅ Filters: `/rest/api/3/filter`
- ✅ Current user: `/rest/api/3/myself`

**BUT** boards require the **Agile API** (`/rest/agile/1.0/`):
- ❌ `/rest/api/3/board/{boardId}` → HTTP 404 (endpoint doesn't exist)
- ✅ `/rest/agile/1.0/board/{boardId}` → Returns board details

---

## Evidence

**Jira Cloud API documentation:**
- **REST API v3**: `/rest/api/3/` - For projects, issues, filters, users
- **Agile API**: `/rest/agile/1.0/` - For boards, sprints, backlog

**Working code in `jira-client.ts:622`**:
```typescript
// ✅ CORRECT (jira-client.ts)
public async getBoards(projectKey: string): Promise<any> {
  const url = `${this.baseUrl}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`;
  // → Uses Agile API for board discovery (works!)
```

**Failed code in `jira-validator.ts:300`**:
```typescript
// ❌ WRONG (jira-validator.ts)
async checkBoard(boardId: number): Promise<JiraBoard | null> {
  const board = await this.callJiraApi(`board/${boardId}`);
  // → callJiraApi() uses /rest/api/3/ (fails!)
```

---

## Solution

**1. Updated `callJiraApi()` signature to accept API type:**

```typescript
private async callJiraApi(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  apiType: 'rest' | 'agile' = 'rest'  // NEW parameter
): Promise<any> {
  const basePath = apiType === 'agile' ? '/rest/agile/1.0' : '/rest/api/3';
  const url = `https://${this.domain}${basePath}/${endpoint}`;
  // ...
}
```

**2. Updated all board-related methods to use `apiType: 'agile'`:**

```typescript
// Board validation (checkBoard)
const board = await this.callJiraApi(`board/${boardId}`, 'GET', undefined, 'agile');

// Board configuration (checkBoard)
const config = await this.callJiraApi(`board/${boardId}/configuration`, 'GET', undefined, 'agile');

// Board discovery (fetchBoards)
const response = await this.callJiraApi(`board?projectKeyOrId=${projectKey}`, 'GET', undefined, 'agile');

// Board creation (createBoard)
const board = await this.callJiraApi('board', 'POST', body, 'agile');
```

**3. Project/filter operations continue using REST API v3** (default):

```typescript
// Projects (existing, unchanged)
const project = await this.callJiraApi(`project/${projectKey}`);  // Uses /rest/api/3/

// Filters (existing, unchanged)
const filter = await this.callJiraApi('filter', 'POST', body);  // Uses /rest/api/3/
```

---

## Impact

### Before Fix
- ✅ Project validation: **10/10 succeeded**
- ❌ Board validation: **0/19 succeeded** (all failed with "Not found")

### After Fix
- ✅ Project validation: **10/10 succeeded**
- ✅ Board validation: **Expected to succeed** (uses correct Agile API)

---

## Files Changed

- **`src/utils/validators/jira-validator.ts`**:
  - Updated `callJiraApi()` to accept `apiType` parameter
  - Updated `fetchBoards()` to use `apiType: 'agile'`
  - Updated `checkBoard()` to use `apiType: 'agile'`
  - Updated `createBoard()` to use `apiType: 'agile'`

---

## Related Issues

- **Original bug report**: Jira init board validation failures (2025-12-08)
- **Related ADRs**:
  - ADR-0050: Config/secrets split (config.json vs .env)
  - ADR-0190: Spec project/board requirement

---

## API Reference

**Jira Cloud REST API v3** (`/rest/api/3/`):
- Projects: `GET /rest/api/3/project`
- Filters: `POST /rest/api/3/filter`
- Current user: `GET /rest/api/3/myself`

**Jira Agile API** (`/rest/agile/1.0/`):
- Boards: `GET /rest/agile/1.0/board`
- Board details: `GET /rest/agile/1.0/board/{boardId}`
- Board config: `GET /rest/agile/1.0/board/{boardId}/configuration`
- Sprints: `GET /rest/agile/1.0/board/{boardId}/sprint`

---

## Testing

**Manual verification with curl**:
```bash
# ❌ REST API v3 (fails)
curl -H "Authorization: Basic ..." \
  https://example.atlassian.net/rest/api/3/board/365
→ HTTP 404

# ✅ Agile API (succeeds)
curl -H "Authorization: Basic ..." \
  https://example.atlassian.net/rest/agile/1.0/board/365
→ HTTP 200 + board details
```

**Integration test**:
```bash
# Re-run init validation
specweave init
# Expected: All 19 boards validate successfully
```

---

## Future Considerations

1. **Consistent API client abstraction**: Consider unifying `jira-client.ts` and `jira-validator.ts` to prevent future endpoint mismatches
2. **Integration tests**: Add tests for board validation to catch API endpoint regressions
3. **API type safety**: Use TypeScript discriminated unions for REST vs Agile API endpoints

---

**Decision**: Use Jira Agile API (`/rest/agile/1.0/`) for all board operations, and REST API v3 (`/rest/api/3/`) for project/filter operations.
