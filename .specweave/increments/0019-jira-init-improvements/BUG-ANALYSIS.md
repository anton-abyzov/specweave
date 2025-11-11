# CRITICAL BUG: Jira Validation Always Passes

**Date**: 2025-11-10
**Severity**: CRITICAL
**Impact**: Users get false validation success, leading to broken configs

---

## The Problem

When running `specweave init` with **non-existent** Jira projects (FRONTEND, BACKEND, MOBILE), the validation shows:

```
✅ Validated: Project "FRONTEND" exists in Jira
✅ Validated: Project "BACKEND" exists in Jira
✅ Validated: Project "MOBILE" exists in Jira
```

**But these projects DON'T EXIST!**

Users then get 404 errors when trying to access them:
```
https://antonabyzov.atlassian.net/jira/software/c/projects/SCRUM → 404 not found
```

---

## Root Cause

**File**: `src/utils/external-resource-validator.ts:134-150`

### The Bug

```typescript
private async callJiraApi(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `https://${this.domain}/rest/api/3/${endpoint}`;
  const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');

  const curlCommand = `curl -s -X ${method} \    ← BUG IS HERE! `-s` flag
    -H "Authorization: Basic ${auth}" \
    -H "Content-Type: application/json" \
    ${body ? `-d '${JSON.stringify(body)}'` : ''} \
    "${url}"`;

  try {
    const { stdout } = await execAsync(curlCommand);
    return JSON.parse(stdout);  ← Parses error JSON as success!
  } catch (error: any) {
    console.error(chalk.red(`Jira API error: ${error.message}`));
    throw error;
  }
}
```

### What's Wrong

**Problem 1**: The `-s` (silent) flag in curl **doesn't fail on HTTP errors!**

When calling `/rest/api/3/project/FRONTEND` for a non-existent project:
- Jira API returns HTTP 404
- BUT curl with `-s` doesn't exit with error code!
- stdout contains:
  ```json
  {
    "errorMessages": ["No project could be found with key 'FRONTEND'."],
    "errors": {}
  }
  ```

**Problem 2**: The code parses this error JSON and returns it as if it's a valid project!

```typescript
return JSON.parse(stdout);  // Returns { errorMessages: [...], errors: {} }
```

**Problem 3**: `checkProject` returns this error object as truthy:

```typescript
async checkProject(projectKey: string): Promise<JiraProject | null> {
  try {
    const project = await this.callJiraApi(`project/${projectKey}`);
    return {  ← Tries to extract id/key/name from error object!
      id: project.id,       // undefined
      key: project.key,     // undefined
      name: project.name,   // undefined
    };
  } catch (error) {
    return null;  ← This never executes!
  }
}
```

**Result**: Returns `{ id: undefined, key: undefined, name: undefined }` which is TRUTHY!

So the validation check passes:

```typescript
const project = await this.checkProject(projectKey);

if (!project) {  ← This is FALSE because project = { id: undefined, ... }
  // Prompt to create
} else {
  console.log(`✅ Validated: Project "${projectKey}" exists`);  ← ALWAYS RUNS!
}
```

---

## The Fix

### Solution 1: Check for Error Response (Quick Fix)

Add error detection after parsing JSON:

```typescript
private async callJiraApi(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `https://${this.domain}/rest/api/3/${endpoint}`;
  const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');

  const curlCommand = `curl -s -X ${method} \
    -H "Authorization: Basic ${auth}" \
    -H "Content-Type: application/json" \
    ${body ? `-d '${JSON.stringify(body)}'` : ''} \
    "${url}"`;

  try {
    const { stdout } = await execAsync(curlCommand);
    const response = JSON.parse(stdout);

    // ✅ NEW: Check if response is an error
    if (response.errorMessages || response.errors) {
      const errorMsg = response.errorMessages?.join(', ') || JSON.stringify(response.errors);
      throw new Error(errorMsg);
    }

    return response;
  } catch (error: any) {
    console.error(chalk.red(`Jira API error: ${error.message}`));
    throw error;
  }
}
```

### Solution 2: Use HTTP Status Code (Better Fix)

Add `-w` flag to curl to capture HTTP status:

```typescript
private async callJiraApi(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `https://${this.domain}/rest/api/3/${endpoint}`;
  const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');

  const curlCommand = `curl -s -w "\n%{http_code}" -X ${method} \
    -H "Authorization: Basic ${auth}" \
    -H "Content-Type: application/json" \
    ${body ? `-d '${JSON.stringify(body)}'` : ''} \
    "${url}"`;

  try {
    const { stdout } = await execAsync(curlCommand);
    const lines = stdout.trim().split('\n');
    const statusCode = parseInt(lines[lines.length - 1], 10);
    const body = lines.slice(0, -1).join('\n');

    // ✅ Check HTTP status
    if (statusCode >= 400) {
      const errorBody = JSON.parse(body);
      const errorMsg = errorBody.errorMessages?.join(', ') || `HTTP ${statusCode}`;
      throw new Error(errorMsg);
    }

    return JSON.parse(body);
  } catch (error: any) {
    console.error(chalk.red(`Jira API error: ${error.message}`));
    throw error;
  }
}
```

### Solution 3: Use `-f` Flag (Simplest Fix)

Add `-f` (fail on HTTP errors) to curl:

```typescript
const curlCommand = `curl -s -f -X ${method} \  ← Add `-f` flag
  -H "Authorization: Basic ${auth}" \
  -H "Content-Type: application/json" \
  ${body ? `-d '${JSON.stringify(body)}'` : ''} \
  "${url}"`;
```

**With `-f`**:
- curl exits with error code 22 on HTTP 404
- `execAsync` throws an error
- `catch` block executes
- `checkProject` returns `null`
- Validation correctly detects missing project!

---

## Recommended Fix

**Use Solution 1 + Solution 3 combined**:

```typescript
private async callJiraApi(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `https://${this.domain}/rest/api/3/${endpoint}`;
  const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');

  const curlCommand = `curl -s -f -X ${method} \  ← Add -f flag
    -H "Authorization: Basic ${auth}" \
    -H "Content-Type: application/json" \
    ${body ? `-d '${JSON.stringify(body)}'` : ''} \
    "${url}"`;

  try {
    const { stdout } = await execAsync(curlCommand);
    const response = JSON.parse(stdout);

    // ✅ Double-check for error response (defense in depth)
    if (response.errorMessages || response.errors) {
      const errorMsg = response.errorMessages?.join(', ') || JSON.stringify(response.errors);
      throw new Error(errorMsg);
    }

    return response;
  } catch (error: any) {
    // Improve error message for common cases
    if (error.message.includes('curl: (22)')) {
      throw new Error('Resource not found (HTTP 404)');
    }
    throw error;
  }
}
```

---

## Expected Behavior After Fix

**Before (BROKEN)**:
```bash
specweave init my-project
# Enter: FRONTEND,BACKEND,MOBILE (non-existent projects)

✅ Validated: Project "FRONTEND" exists in Jira  ← WRONG!
✅ Validated: Project "BACKEND" exists in Jira   ← WRONG!
✅ Validated: Project "MOBILE" exists in Jira    ← WRONG!

# Config written with non-existent projects
# User gets 404 errors later!
```

**After (FIXED)**:
```bash
specweave init my-project
# Enter: FRONTEND,BACKEND,MOBILE (non-existent projects)

⚠️  Project "FRONTEND" not found

What would you like to do for project "FRONTEND"?
1. Select an existing project (shows: SCRUM)
2. Create a new project          ← User can create!
3. Skip this project
4. Cancel validation

# User creates all 3 projects
# OR selects existing "SCRUM" project
# Config written with REAL project keys!
```

---

## Impact

**Severity**: CRITICAL
**Users Affected**: ALL users setting up Jira integration
**Workaround**: Manually create projects before running `specweave init`

---

## Test Case

```bash
# Test 1: Non-existent project
JIRA_DOMAIN=antonabyzov.atlassian.net
JIRA_EMAIL=anton.abyzov@gmail.com
JIRA_API_TOKEN=...
JIRA_PROJECTS=NONEXISTENT

# Expected: Prompt to create project
# Actual (before fix): ✅ Validated (WRONG!)
# Actual (after fix): ⚠️  Project not found (CORRECT!)

# Test 2: Existing project
JIRA_PROJECTS=SCRUM

# Expected: ✅ Validated
# Actual: ✅ Validated (CORRECT!)
```

---

## Files to Fix

1. `src/utils/external-resource-validator.ts:134-150` - Add `-f` flag + error response check
2. `tests/integration/jira/validation.test.ts` - Add test for non-existent projects

---

## Next Steps

1. ✅ Implement fix (Solution 1 + 3 combined)
2. ✅ Add integration tests
3. ✅ Test manually with non-existent projects
4. ✅ Release v0.13.2
5. ✅ Update user documentation

---

**Status**: Analysis complete, fix ready to implement
