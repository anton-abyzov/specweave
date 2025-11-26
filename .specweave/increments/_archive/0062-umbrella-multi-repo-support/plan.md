# Implementation Plan: Umbrella Multi-Repo Support

**Increment**: 0062-umbrella-multi-repo-support
**Status**: Planning → Implementation

---

## 1. Technical Implementation Approach

### Core Problem
When user describes "3 repos: Frontend, Backend, Shared":
1. PM agent generates generic `US-001` (not project-scoped)
2. All specs go to single `.specweave/` (not distributed)
3. Single GitHub sync config (not per-repo)

### Solution
1. **Detection Layer**: Detect multi-repo intent from user prompt
2. **Init Flow Enhancement**: Support cloning/initializing multiple repos independently
3. **PM Agent Enhancement**: Generate project-prefixed user stories
4. **Spec Distribution**: Route stories to correct child repo

---

## 2. Component Architecture

### 2.1 Multi-Repo Intent Detector

**File**: `src/utils/multi-repo-detector.ts` (NEW)

```typescript
interface MultiRepoIntent {
  detected: boolean;
  confidence: 'high' | 'medium' | 'low';
  suggestedRepos: Array<{
    name: string;
    type: 'frontend' | 'backend' | 'shared' | 'api' | 'mobile' | 'unknown';
    prefix: string;  // 'FE', 'BE', 'SHARED'
  }>;
  cloneUrls?: string[];  // If user provided GitHub URLs
}

function detectMultiRepoIntent(userPrompt: string): MultiRepoIntent;
```

**Detection Patterns**:
- "3 repos", "multiple repos", "separate repos"
- "Frontend repo", "Backend API repo", "Shared library"
- GitHub URLs (github.com/...-fe, github.com/...-be)
- Monorepo keywords: "monorepo with", "services:", "packages:"

### 2.2 Init Flow Enhancement

**File**: `src/cli/commands/init.ts`

**New Flow** (inserted after architecture detection):

```typescript
// After detecting multi-repo intent from user prompt/description
if (multiRepoIntent.detected) {
  const setupChoice = await select({
    message: 'Multi-repo architecture detected. How to proceed?',
    choices: [
      { value: 'clone', name: 'Clone repos from GitHub (recommended)' },
      { value: 'create', name: 'Create new repos on GitHub' },
      { value: 'local', name: 'Initialize existing local folders' },
      { value: 'skip', name: 'Skip - use single repo mode' }
    ]
  });

  if (setupChoice === 'clone') {
    await initializeFromGitHubRepos(multiRepoIntent.cloneUrls || await promptForUrls());
  }
}
```

**Key Functions**:
- `initializeFromGitHubRepos(urls: string[])`: Clone and init each repo
- `initializeChildRepo(repoPath: string, projectPrefix: string)`: Init single child
- `createUmbrellaConfig(childRepos: ChildRepoConfig[])`: Parent config

### 2.3 PM Agent Enhancement

**File**: `plugins/specweave/agents/pm/AGENT.md`

**New Section** - Multi-Repo Awareness:

```markdown
## Multi-Repo Project Detection

When user prompt contains multi-repo indicators:
- "Frontend repo", "Backend API", "Shared library"
- Multiple tech stacks mentioned (React + Node.js + Shared)
- GitHub URLs for multiple repos

### User Story Prefixing Rules

| Repo Type | Prefix | Keywords to Detect |
|-----------|--------|-------------------|
| Frontend | FE | UI, component, page, form, view, React, Vue |
| Backend | BE | API, endpoint, controller, service, database |
| Shared | SHARED | validator, schema, types, utilities, common |
| Mobile | MOBILE | iOS, Android, React Native, Flutter |
| Infrastructure | INFRA | Terraform, K8s, Docker, CI/CD |

### Example Output

Instead of:
```
US-001: User Registration
US-002: Registration API
US-003: Validation Schema
```

Generate:
```
US-FE-001: User Registration Form
US-BE-001: Registration API Endpoint
US-SHARED-001: Registration Validation Schema
```

### Cross-Cutting User Stories

For stories that touch multiple repos:
```
US-AUTH-001: Authentication Flow
  - Related: US-FE-002 (Login UI), US-BE-002 (JWT Validation)
  - Tags: ["cross-project", "auth"]
```
```

### 2.4 Config Schema Updates

**File**: `src/core/types/config.ts`

```typescript
interface UmbrellaConfig {
  enabled: boolean;
  parentRepo?: string;  // Optional coordination repo
  childRepos: Array<{
    id: string;           // 'fe', 'be', 'shared'
    path: string;         // './sw-qr-menu-fe' or absolute
    prefix: string;       // 'FE', 'BE', 'SHARED'
    githubUrl?: string;   // For sync routing
    techStack?: string[]; // For story routing
  }>;
  storyRouting: {
    enabled: boolean;
    defaultRepo: string;  // Where cross-cutting stories go
  };
}

interface SpecWeaveConfig {
  // ... existing fields
  umbrella?: UmbrellaConfig;
}
```

### 2.5 Umbrella Repo Detector Skill

**File**: `plugins/specweave/skills/umbrella-repo-detector/SKILL.md`

```yaml
---
name: umbrella-repo-detector
description: Detects multi-repo architecture from user prompts. Activates for: multiple repos, frontend repo, backend repo, shared library, monorepo services, 3 repos, separate repos, microservices architecture.
---

# Multi-Repo Architecture Detector

## When This Skill Activates

- User describes multiple repos/services
- User mentions "frontend repo", "backend API repo", "shared library"
- User provides multiple GitHub URLs
- User mentions microservices or multi-repo patterns

## What I Do

1. Detect multi-repo intent from user prompt
2. Suggest repo structure (FE/BE/Shared)
3. Guide user to appropriate init flow
4. Explain project-scoped user story generation

## Example Interaction

**User**: "Build a SaaS with 3 repos: Frontend, Backend, Shared"

**Me**: "I detected a multi-repo architecture:
- Frontend (prefix: FE) - React/Vue UI
- Backend (prefix: BE) - Node.js/Python API
- Shared (prefix: SHARED) - Common types/validators

Would you like me to:
1. Clone existing repos from GitHub
2. Create new repos and initialize each
3. Initialize existing local folders

User stories will be prefixed: US-FE-001, US-BE-001, US-SHARED-001"
```

---

## 3. Implementation Tasks

### Phase 1: Detection & Config (T-001 to T-003)

**T-001: Create multi-repo intent detector**
- New file: `src/utils/multi-repo-detector.ts`
- Pattern matching for repo keywords
- URL parsing for GitHub repos
- Unit tests

**T-002: Update config schema**
- Add `UmbrellaConfig` interface
- Update `SpecWeaveConfig` type
- Backward compatibility validation

**T-003: Create umbrella-repo-detector skill**
- New skill in plugins/specweave/skills/
- Activation triggers
- User guidance flow

### Phase 2: Init Flow Enhancement (T-004 to T-006)

**T-004: Add multi-repo detection to init flow**
- Detect intent early in init
- Present options to user
- Store detection result

**T-005: Implement clone-from-GitHub flow**
- Parse URLs from user input
- Clone each repo to local folder
- Initialize `.specweave/` in each

**T-006: Create umbrella config generation**
- Parent repo config with childRepos[]
- Per-repo config with prefix
- Link repos together

### Phase 3: PM Agent Enhancement (T-007 to T-009)

**T-007: Add multi-repo context to PM agent**
- Read umbrella config
- Detect project type from keywords
- Pass context to story generation

**T-008: Implement project-prefixed user stories**
- US-FE-001, US-BE-001 format
- Keyword-to-repo mapping
- Cross-cutting story handling

**T-009: Add story distribution logic**
- Route stories to correct child repo
- Create spec.md in child's increments/
- Link cross-project dependencies

### Phase 4: Testing & Documentation (T-010 to T-012)

**T-010: Unit tests for multi-repo detector**
- Detection patterns
- URL parsing
- Edge cases

**T-011: Integration tests for umbrella init**
- Clone flow
- Config generation
- Child repo initialization

**T-012: Update documentation**
- New guide: Multi-Repo Setup
- PM agent updates
- Config reference

---

## 4. File Modification Summary

### New Files
- `src/utils/multi-repo-detector.ts` (~150 lines)
- `plugins/specweave/skills/umbrella-repo-detector/SKILL.md` (~100 lines)
- `tests/unit/multi-repo-detector.test.ts` (~200 lines)

### Modified Files
- `src/cli/commands/init.ts` - Add umbrella detection (~50 lines)
- `src/core/types/config.ts` - Add UmbrellaConfig (~30 lines)
- `plugins/specweave/agents/pm/AGENT.md` - Multi-repo section (~100 lines)

### Total Estimated Changes
- ~630 lines new code
- ~80 lines modified

---

## 5. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| PM agent generates wrong prefixes | Explicit keyword mapping, validation |
| Breaking single-repo flows | Feature flag, comprehensive tests |
| User confusion | Clear prompts, progressive disclosure |
| GitHub rate limits | Batch operations, caching |

---

## 6. Success Criteria

1. `specweave init` detects "3 repos: FE, BE, Shared" with 90%+ accuracy
2. Each child repo has independent `.specweave/` and GitHub issues
3. PM agent generates US-FE-001, US-BE-001 prefixes correctly
4. Existing single-repo projects work unchanged
