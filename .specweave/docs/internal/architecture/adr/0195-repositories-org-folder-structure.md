# ADR-0195: Repositories/{org}/{repo} Folder Structure

**Status**: Accepted
**Date**: 2025-12-15
**Deciders**: System Architect
**Technical Story**: Init flow multi-repo cloning improvement

## Context

Previous implementation cloned implementation repositories directly at root level:

```
my-project/
├── .specweave/           ← Parent repo with specs/docs
├── frontend/             ← Cloned repo (was at root)
├── backend/              ← Cloned repo (was at root)
└── shared/               ← Cloned repo (was at root)
```

**Problems**:
1. **Namespace collision**: Repos from different orgs could have the same name
2. **No organization context**: Unclear which org a repo belongs to
3. **Provider ambiguity**: Repos from GitHub, Bitbucket, ADO all mixed at root
4. **Difficult cleanup**: Hard to remove all cloned repos without affecting project files

## Decision

Clone ALL repositories into a `repositories/{org}/` subfolder:

### New Structure

**GitHub** (`repositories/{org}/{repo}`):
```
my-project/
├── .specweave/
│   ├── increments/
│   ├── docs/
│   └── config.json
├── repositories/
│   └── anton-abyzov/        ← GitHub org/username
│       ├── ec-web-ui/       ← Cloned repo
│       ├── ec-api/          ← Cloned repo
│       └── ec-mobile/       ← Cloned repo
└── README.md
```

**Bitbucket** (`repositories/{workspace}/{repo}`):
```
my-project/
├── .specweave/
├── repositories/
│   └── my-workspace/        ← Bitbucket workspace
│       ├── frontend/
│       └── backend/
```

**Azure DevOps** (`repositories/{organization}/{repo}`):
```
my-project/
├── .specweave/
├── repositories/
│   └── my-ado-org/          ← ADO organization
│       ├── product-fe/
│       └── product-be/
```

### Implementation

**File**: `src/cli/helpers/init/github-repo-cloning.ts`
```typescript
// v1.0.21: Clone into repositories/{org}/{repo}
const reposWithUrls = filteredRepos.map(r => ({
  owner: r.owner.login,
  name: r.name,
  path: `repositories/${r.owner.login}/${r.name}`,
  cloneUrl: buildGitHubCloneUrl(r.owner.login, r.name, pat, gitUrlFormat)
}));
```

**File**: `src/cli/helpers/init/bitbucket-repo-cloning.ts`
```typescript
// v1.0.21: Clone into repositories/{workspace}/{repo}
const reposWithUrls = filteredRepos.map(r => ({
  owner: workspace,
  name: r.slug,
  path: `repositories/${workspace}/${r.slug}`,
  cloneUrl: buildBitbucketCloneUrl(workspace, r.slug, username, appPassword)
}));
```

**File**: `src/cli/helpers/init/ado-repo-cloning.ts`
```typescript
// v1.0.21: Clone into repositories/{org}/{repo}
const reposWithUrls = filteredRepos.map(r => ({
  owner: `${org}/${r.project}`,
  name: r.name,
  path: `repositories/${org}/${r.name}`,
  cloneUrl: buildAdoCloneUrl(org, r.project, r.name, pat)
}));
```

### .gitignore Pattern

```gitignore
# SpecWeave: Ignore cloned repositories
repositories/

# But track SpecWeave files
!.specweave/
!README.md
```

## Consequences

### Positive
- **Clear namespace**: Org/workspace clearly identifies repo ownership
- **No collisions**: Same repo name from different orgs won't conflict
- **Easy cleanup**: `rm -rf repositories/` removes all cloned repos
- **Consistent structure**: Same pattern across GitHub, Bitbucket, ADO
- **Living docs aware**: Umbrella detector uses `config.umbrella.childRepos` which has correct paths

### Negative
- **Deeper nesting**: One more level of directory depth
- **Migration required**: Existing projects need manual move (or re-clone)

### Neutral
- **No migration tool**: Users with existing clones must move repos manually
- **Umbrella config**: `childRepos[].path` values now include `repositories/` prefix

## Migration

For existing projects:
```bash
# 1. Move existing repos
mkdir -p repositories/{org}
mv frontend backend shared repositories/{org}/

# 2. Re-run init to update config
specweave init . --force
```

Or simply re-clone:
```bash
rm -rf frontend backend shared
specweave init .
```

## Related ADRs

- **ADR-0157**: Root-Level Repository Structure (superseded by this ADR)
- **ADR-0160**: Root-Level vs services/ Folder Structure (superseded by this ADR)
