# Multi-Repo Init: Pattern Matching Enhancement Proposal

**Date**: 2025-11-20
**Author**: Anton Abyzov
**Status**: Proposed
**Priority**: High (Critical UX gap for brownfield projects)

---

## Problem Statement

### Issue #1: No Pattern Matching for Existing Repos

Users who want to connect SpecWeave to **existing GitHub repositories** must:

1. Manually type each repository name (e.g., 3+ repos = 3+ manual entries)
2. Answer identical questions for each repo
3. No auto-detection of existing repositories
4. No pattern-based selection

### Issue #2: Redundant "Create on GitHub?" Question

The flow asks **"Create this repository on GitHub?"** for EACH repo (line 548 in `repo-structure-manager.ts`), even though:

- If user wants to **connect to existing repos** → Answer is ALWAYS "No" (repo already exists!)
- If user wants to **create new repos** → Answer is ALWAYS "Yes" (that's why they chose "create new"!)

**This question is redundant and confusing.** The decision should be made ONCE at the beginning:

```
❌ CURRENT (Redundant):
1. "How many repos?" → 3
2. For each repo:
   - "Repository name?" → sw-voice-memo-frontend
   - "Create on GitHub?" → No  ← Redundant! Asked 3 times!

✅ CORRECT (One Decision):
1. "Connect to existing or create new?" → Existing  ← Decide ONCE
2. "Pattern?" → sw-voice-memo-*
3. Auto-detect 3 repos
4. Done! (No "Create on GitHub?" questions needed)
```

**Example**:
```
Repository 1 of 3:
? Repository name: sw-voice-memo-frontend
? Description: frontend service
? Create on GitHub? Yes
? Visibility: Public

Repository 2 of 3:
? Repository name: sw-voice-memo-backend
? Description: backend service
? Create on GitHub? Yes
? Visibility: Public

Repository 3 of 3:
? Repository name: sw-voice-memo-mobile
? Description: mobile service
? Create on GitHub? Yes
? Visibility: Public
```

**Time**: 2-3 minutes for 3 repos, 5-10 minutes for 10+ repos.

### Ideal Flow (Streamlined with Pattern Matching)

```
1. "GitHub owner?" → anton-abyzov

2. 🔍 Auto-detect: "Found 12 repositories in anton-abyzov"

3. "Connect to existing repos or create new?"
   → [Connect to existing] / [Create new]

4. IF "Connect to existing":
   "Select connection strategy:"
   → [Use all repos from anton-abyzov]
   → [Pattern matching (e.g., sw-voice-memo-*)]  ← NEW!
   → [Manual selection (checkboxes)]

5. IF "Pattern matching":
   "Repository name pattern?" → sw-voice-memo-*

   🔍 Matching repositories:
     ✓ sw-voice-memo-frontend
     ✓ sw-voice-memo-backend
     ✓ sw-voice-memo-mobile

   "Use these 3 repos?" → Yes

6. "Create parent repo (sw-voice-memo-root)?" → Yes

7. Done! ✅
```

**Time**: 30 seconds.

---

## Why This Matters

### Scenarios

| Scenario | Current Flow (Manual) | Improved Flow (Pattern) | Time Saved |
|----------|----------------------|------------------------|------------|
| **New project** (greenfield) | ✅ Works fine (create 3 repos) | ✅ Works fine (skip detection) | 0s |
| **Existing project** (brownfield, 3 repos) | ❌ Type 3 repo names manually | ✅ Pattern: `sw-voice-memo-*` → auto-detect | 90s |
| **Large project** (10+ repos) | ❌ **Unusable**: Type 10+ names | ✅ **Essential**: Pattern required | 5-10 min |
| **Monorepo migration** | ❌ Create repos first, then connect | ✅ Detect existing, connect immediately | 2-3 min |

### User Experience Impact

- **Greenfield projects**: No impact (existing flow works fine)
- **Brownfield projects**: **Critical** - current flow is painful and error-prone
- **Large projects (10+ repos)**: **Blocker** - current flow is practically unusable

---

## Technical Design

### Code Location

**File**: `src/core/repo-structure/repo-structure-manager.ts`
**Method**: `configureMultiRepo()` (lines 289-649)

**Insertion Point**: **Before line 480** (asking "How many repositories?")

### New Functions Required

1. **`detectExistingRepos(owner: string, token: string): Promise<string[]>`**
   - Fetch all repos from GitHub owner/org
   - Return array of repo names

2. **`matchReposByPattern(repos: string[], pattern: string): string[]`**
   - Apply glob pattern matching (e.g., `sw-voice-memo-*`)
   - Return matching repo names

3. **`promptRepoSelectionStrategy(): Promise<'all' | 'pattern' | 'manual'>`**
   - Ask user which selection method to use

4. **`promptPatternMatching(detectedRepos: string[]): Promise<string[]>`**
   - Ask for pattern
   - Show matching repos
   - Confirm selection

### Implementation Steps

#### Step 1: Detect Existing Repos (NEW)

**Location**: `repo-structure-manager.ts`, line 454 (after parentRepo configured, BEFORE line 480)

```typescript
// After line 454 (parentRepo configured)
// BEFORE line 480 (asking "how many repos?")

// Auto-detect existing repositories
const detectedRepos = this.githubToken
  ? await this.detectExistingRepos(config.parentRepo!.owner, this.githubToken)
  : [];

if (detectedRepos.length > 0) {
  console.log(chalk.green(`\n✓ Detected ${detectedRepos.length} existing repositories in ${config.parentRepo!.owner}`));

  const { connectionMode } = await inquirer.prompt([{
    type: 'list',
    name: 'connectionMode',
    message: 'Connect to existing repos or create new?',
    choices: [
      { name: 'Connect to existing repositories', value: 'existing' },
      { name: 'Create new repositories', value: 'new' }
    ],
    default: 'existing'
  }]);

  if (connectionMode === 'existing') {
    return this.connectToExistingRepos(config, detectedRepos);
  }
  // else: continue to "create new" flow (existing behavior)
}
```

#### Step 1.5: Remove Redundant Question (CRITICAL!)

**Location**: `repo-structure-manager.ts`, lines 546-550

**❌ REMOVE THIS** (redundant per-repo question):

```typescript
{
  type: 'confirm',
  name: 'createOnGitHub',
  message: 'Create this repository on GitHub?',  // ← REMOVE!
  default: true
}
```

**✅ REPLACE WITH** (derived from earlier decision):

```typescript
// Determine createOnGitHub based on connectionMode (decided earlier)
const createOnGitHub = connectionMode === 'new'; // true if "create new", false if "existing"

// Use in repository config:
config.repositories.push({
  id: id,
  name: repoAnswers.name,
  owner: config.parentRepo?.owner || '',
  description: repoAnswers.description,
  path: useParent ? id : id,
  visibility: visibility,
  createOnGitHub: createOnGitHub,  // ← Derived, not asked!
  isNested: useParent
});
```

#### Step 2: Pattern Matching Flow (NEW)

```typescript
private async connectToExistingRepos(
  config: RepoStructureConfig,
  detectedRepos: string[]
): Promise<RepoStructureConfig> {
  const { strategy } = await inquirer.prompt([{
    type: 'list',
    name: 'strategy',
    message: 'Select connection strategy:',
    choices: [
      { name: 'Use all repositories', value: 'all' },
      { name: 'Pattern matching (e.g., sw-voice-memo-*)', value: 'pattern' },
      { name: 'Manual selection (checkboxes)', value: 'manual' }
    ],
    default: 'pattern'
  }]);

  let selectedRepos: string[] = [];

  switch (strategy) {
    case 'all':
      selectedRepos = detectedRepos;
      break;

    case 'pattern':
      const { pattern } = await inquirer.prompt([{
        type: 'input',
        name: 'pattern',
        message: 'Repository name pattern (e.g., sw-voice-memo-*):',
        validate: (input: string) => input.trim() ? true : 'Pattern is required'
      }]);

      selectedRepos = this.matchReposByPattern(detectedRepos, pattern);

      if (selectedRepos.length === 0) {
        console.log(chalk.yellow(`\n⚠️  No repositories match pattern: ${pattern}`));
        console.log(chalk.gray('   Please try a different pattern or use manual selection\n'));
        return this.connectToExistingRepos(config, detectedRepos); // Retry
      }

      console.log(chalk.green(`\n✓ Found ${selectedRepos.length} matching repositories:`));
      selectedRepos.forEach(repo => console.log(chalk.gray(`  • ${repo}`)));

      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Use these ${selectedRepos.length} repositories?`,
        default: true
      }]);

      if (!confirm) {
        return this.connectToExistingRepos(config, detectedRepos); // Retry
      }
      break;

    case 'manual':
      const { repos } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'repos',
        message: 'Select repositories:',
        choices: detectedRepos.map(repo => ({ name: repo, value: repo })),
        validate: (input: string[]) => input.length > 0 ? true : 'Select at least 1 repository'
      }]);
      selectedRepos = repos;
      break;
  }

  // Convert selected repos to config format
  for (const repoName of selectedRepos) {
    const id = this.generateRepoIdSmart(repoName, config.repositories.map(r => r.name));

    config.repositories.push({
      id,
      name: repoName,
      owner: config.parentRepo!.owner,
      description: `${repoName} service`,
      path: id,
      visibility: 'private', // Will be detected from GitHub
      createOnGitHub: false, // Already exists
      isNested: true
    });
  }

  console.log(chalk.green(`\n✅ Connected to ${selectedRepos.length} existing repositories\n`));

  return config;
}
```

#### Step 3: GitHub API Detection

```typescript
private async detectExistingRepos(owner: string, token: string): Promise<string[]> {
  try {
    // Check if org or user
    const isOrg = await this.isGitHubOrganization(owner);
    const endpoint = isOrg
      ? `https://api.github.com/orgs/${owner}/repos?per_page=100`
      : `https://api.github.com/users/${owner}/repos?per_page=100`;

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.status}`);
    }

    const repos = await response.json() as Array<{ name: string }>;
    return repos.map(r => r.name).sort();
  } catch (error: any) {
    console.warn(chalk.yellow(`⚠️  Failed to detect repositories: ${error.message}`));
    return [];
  }
}
```

#### Step 4: Pattern Matching Utility

```typescript
private matchReposByPattern(repos: string[], pattern: string): string[] {
  // Convert glob pattern to regex
  // sw-voice-memo-* → ^sw-voice-memo-.*$
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`, 'i');

  return repos.filter(repo => regex.test(repo));
}
```

---

## Flow Diagram

### Current Flow (No Pattern Matching)

```
┌─────────────────────────────────┐
│ Ask: GitHub owner?              │
│ → anton-abyzov                  │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Ask: Parent repo name?          │
│ → sw-voice-memo-root            │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Ask: Create parent on GitHub?   │
│ → Yes                           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Ask: How many impl repos?       │ ← Assumes CREATION
│ → 3                             │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Loop 3 times:                   │ ← Manual entry for each
│ - Ask repo name                 │
│ - Ask description               │
│ - Ask create on GitHub          │
│ - Ask visibility                │
└─────────────────────────────────┘
```

### Improved Flow (With Pattern Matching)

```
┌─────────────────────────────────┐
│ Ask: GitHub owner?              │
│ → anton-abyzov                  │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 🔍 Auto-detect repos            │ ← NEW!
│ Found 12 repos in anton-abyzov  │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Ask: Connect existing or new?   │ ← NEW!
│ → Connect to existing           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Ask: Selection strategy?        │ ← NEW!
│ → Pattern matching              │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Ask: Pattern?                   │ ← NEW!
│ → sw-voice-memo-*               │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 🔍 Match pattern                │ ← NEW!
│ Found 3 matching repos:         │
│ - sw-voice-memo-frontend        │
│ - sw-voice-memo-backend         │
│ - sw-voice-memo-mobile          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Ask: Use these 3 repos?         │ ← NEW!
│ → Yes                           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ ✅ Connected to 3 repos         │ ← DONE!
│ Time: 30 seconds                │
└─────────────────────────────────┘
```

---

## Pattern Matching Examples

### Example 1: Prefix Pattern

**Pattern**: `sw-voice-memo-*`

**Matches**:
- ✅ `sw-voice-memo-frontend`
- ✅ `sw-voice-memo-backend`
- ✅ `sw-voice-memo-mobile`

**Does NOT match**:
- ❌ `specweave`
- ❌ `other-project-frontend`

### Example 2: Suffix Pattern

**Pattern**: `*-service`

**Matches**:
- ✅ `auth-service`
- ✅ `payment-service`
- ✅ `notification-service`

**Does NOT match**:
- ❌ `frontend-app`
- ❌ `backend-api`

### Example 3: Substring Pattern

**Pattern**: `*-api-*`

**Matches**:
- ✅ `user-api-v1`
- ✅ `product-api-v2`

**Does NOT match**:
- ❌ `user-service`
- ❌ `product-frontend`

---

## Implementation Checklist

### Phase 1: Core Detection (Required for v1.0)

- [ ] Add `detectExistingRepos()` function (GitHub API call)
- [ ] Add prompt: "Connect to existing or create new?"
- [ ] Add `connectToExistingRepos()` flow

### Phase 2: Pattern Matching (Required for v1.0)

- [ ] Add prompt: "Selection strategy?" (all/pattern/manual)
- [ ] Add `matchReposByPattern()` utility
- [ ] Add pattern validation (warn if no matches)
- [ ] Add confirmation step

### Phase 3: Manual Selection (Optional for v1.1)

- [ ] Add checkbox-based manual selection (inquirer `type: 'checkbox'`)
- [ ] Support multi-select

### Phase 4: Testing

- [ ] Unit tests for pattern matching utility
- [ ] Integration tests for detection flow
- [ ] E2E test with real GitHub API (mocked)

---

## Testing Strategy

### Unit Tests

```typescript
describe('matchReposByPattern', () => {
  const repos = [
    'sw-voice-memo-frontend',
    'sw-voice-memo-backend',
    'sw-voice-memo-mobile',
    'specweave',
    'other-project-frontend'
  ];

  it('should match prefix pattern', () => {
    const result = matchReposByPattern(repos, 'sw-voice-memo-*');
    expect(result).toEqual([
      'sw-voice-memo-frontend',
      'sw-voice-memo-backend',
      'sw-voice-memo-mobile'
    ]);
  });

  it('should match suffix pattern', () => {
    const result = matchReposByPattern(repos, '*-frontend');
    expect(result).toEqual([
      'sw-voice-memo-frontend',
      'other-project-frontend'
    ]);
  });

  it('should return empty array if no matches', () => {
    const result = matchReposByPattern(repos, 'nonexistent-*');
    expect(result).toEqual([]);
  });
});
```

### Integration Tests

```typescript
describe('configureMultiRepo - existing repos', () => {
  it('should detect existing repos and prompt connection', async () => {
    const mockRepos = ['frontend', 'backend', 'mobile'];
    vi.spyOn(manager, 'detectExistingRepos').mockResolvedValue(mockRepos);

    // Mock user selecting "existing" → "pattern" → "sw-*"
    mockInquirer([
      { connectionMode: 'existing' },
      { strategy: 'pattern' },
      { pattern: 'sw-*' },
      { confirm: true }
    ]);

    const config = await manager.configureMultiRepo(true, false);

    expect(config.repositories).toHaveLength(3);
    expect(config.repositories[0].createOnGitHub).toBe(false); // Existing repo
  });
});
```

---

## User Documentation

### New Section: `.specweave/docs/public/guides/multi-repo-setup.md`

```markdown
## Connecting to Existing Repositories

If you already have GitHub repositories, SpecWeave can detect and connect to them automatically:

### Pattern Matching (Recommended)

1. Run `specweave init .`
2. Enter GitHub owner (e.g., `anton-abyzov`)
3. Select "Connect to existing repositories"
4. Choose "Pattern matching"
5. Enter pattern (e.g., `my-project-*`)
6. SpecWeave auto-detects matching repos
7. Confirm and done!

**Example patterns**:
- `my-project-*` → Matches all repos starting with "my-project-"
- `*-service` → Matches all repos ending with "-service"
- `*-api-*` → Matches all repos containing "-api-"

### Manual Selection

1. Choose "Manual selection" instead of pattern matching
2. Use checkboxes to select repos
3. Confirm selection

### Use All Repositories

1. Choose "Use all repositories"
2. SpecWeave connects to ALL repos in your organization
3. Useful for small organizations (5-10 repos)
```

---

## Migration Strategy

### Backward Compatibility

✅ **No breaking changes** - existing flow remains intact for greenfield projects.

### Feature Flag (Optional)

```typescript
const enablePatternMatching = process.env.SPECWEAVE_ENABLE_PATTERN_MATCHING !== 'false';

if (enablePatternMatching && detectedRepos.length > 0) {
  // New flow
} else {
  // Old flow (current behavior)
}
```

---

## Success Criteria

### Metrics

- **Time to connect 3 existing repos**: < 1 minute (currently 2-3 minutes)
- **Time to connect 10 existing repos**: < 2 minutes (currently 5-10 minutes)
- **User errors**: < 5% (typos in repo names, wrong selections)

### User Feedback

- ✅ "This saved me 5 minutes!"
- ✅ "Pattern matching is a game-changer for large projects"
- ✅ "Finally! I can connect my existing repos easily"

---

## References

- **GitHub API Docs**: https://docs.github.com/en/rest/repos/repos
- **Inquirer.js Patterns**: https://github.com/SBoudrias/Inquirer.js
- **Glob Pattern Matching**: https://en.wikipedia.org/wiki/Glob_(programming)

---

## Next Steps

1. **Review this proposal** with team/stakeholders
2. **Prioritize** Phase 1 (detection) vs Phase 2 (pattern matching)
3. **Create increment** for implementation
4. **Write tests** first (TDD)
5. **Implement** feature
6. **Document** in user guides
7. **Release** with changelog

---

## Appendix: Real-World Use Cases

### Case 1: Microservices Migration

**Scenario**: Company migrating 15 microservices to SpecWeave.

**Current flow**: Type 15 repo names manually (10-15 minutes, error-prone)

**With pattern matching**: `my-company-*-service` → Auto-detect all 15 repos (1 minute)

### Case 2: Monorepo Breakup

**Scenario**: Breaking monorepo into 8 separate repos.

**Current flow**: Create 8 repos manually, then type each name in SpecWeave (5-10 minutes)

**With pattern matching**: Create 8 repos on GitHub first, then `new-arch-*` → Instant connection (2 minutes)

### Case 3: Team Onboarding

**Scenario**: New team member setting up local SpecWeave environment.

**Current flow**: Ask senior dev for repo names, type manually (5 minutes + context switching)

**With pattern matching**: Given pattern by senior dev (`team-project-*`), instant setup (30 seconds)

---

**Conclusion**: This enhancement is **critical for brownfield adoption** and **essential for large projects**. It transforms a painful manual process into a streamlined, error-free experience.
