# Repository Selection Guide

**Batch Select 10+ Repositories in Seconds with Smart Pattern Matching**

Strategic Init's repository selection streamlines multi-repo setup by detecting patterns and allowing batch selection instead of manual URL entry - saving 5+ minutes when setting up projects with many repositories.

---

## When Repository Selection Appears

Repository selection is **Phase 6** of Strategic Init and triggers when:

1. You indicate **3+ repositories** in your project
2. OR Strategic Init detects multi-repo architecture from your vision
3. OR You explicitly choose multi-repo setup

**Example**:
```
Question: How many repositories are in this project?
  ○ Single repository (monorepo)
  ○ 2-5 repositories
  ● 10+ repositories              ← Selected

✓ Multi-repo detected → Repository selection enabled
```

---

## Selection Methods

### Method 1: Pattern-Based Selection (RECOMMENDED for 10+ repos)

**Best for**: Repositories with consistent naming (prefix, keyword, owner)

**How it works**:
1. Specify a pattern (prefix, keyword, or owner)
2. SpecWeave fetches matching repositories from GitHub
3. Preview results and exclude unwanted repos
4. Confirm selection

**Time saved**: ~5 minutes vs manual entry

---

### Method 2: All Repositories from Account/Org

**Best for**: Small organizations (<20 repos total)

**How it works**:
1. Provide GitHub username or org name
2. SpecWeave fetches all repositories
3. Preview and exclude unwanted repos
4. Confirm selection

---

### Method 3: Manual Selection

**Best for**: Irregular naming or few repositories (<5 repos)

**How it works**:
1. Enter each repository URL manually
2. SpecWeave validates each URL
3. Confirm selection

---

## Pattern Types

### Pattern 1: Prefix Match

**Use case**: All repositories start with same prefix

**Examples**:
```
Pattern: "myapp-"
Matches:
  ✓ myapp-frontend
  ✓ myapp-backend
  ✓ myapp-api
  ✓ myapp-mobile
  ✗ legacy-app
  ✗ tools-monorepo
```

**Strategic Init flow**:
```
Question: What's the repository naming pattern?
Examples:
  - Prefix: "ec-" (e.g., ec-frontend, ec-backend)
  - Owner: "my-company" (all repos from GitHub org)
  - Keyword: "service" (all repos containing "service")

Your pattern type: prefix
Your prefix: myapp-

Fetching repositories...

✓ Found 12 repositories matching "myapp-*"
```

---

### Pattern 2: Keyword Match

**Use case**: Repositories contain specific keyword

**Examples**:
```
Pattern: "service"
Matches:
  ✓ auth-service
  ✓ payment-service
  ✓ notification-service
  ✓ user-service
  ✗ frontend-web
  ✗ admin-dashboard
```

**Strategic Init flow**:
```
Your pattern type: keyword
Your keyword: service

✓ Found 8 repositories containing "service"
```

---

### Pattern 3: Owner/Org Match

**Use case**: All repositories belong to specific GitHub user/org

**Examples**:
```
Pattern: "my-company"
Matches: ALL repositories in "my-company" GitHub organization
  ✓ my-company/frontend
  ✓ my-company/backend
  ✓ my-company/api
  ✓ my-company/mobile
  ✓ my-company/infrastructure
  ... (all repos in org)
```

**Strategic Init flow**:
```
Your pattern type: owner
Your owner/org name: my-company

✓ Found 47 repositories in "my-company" organization
```

---

### Pattern 4: Combined Filters

**Use case**: Complex selection (prefix + owner, keyword + owner, etc.)

**Examples**:
```
Pattern: Prefix "api-" in owner "my-company"
Matches:
  ✓ my-company/api-gateway
  ✓ my-company/api-auth
  ✓ my-company/api-users
  ✗ my-company/frontend
  ✗ other-org/api-service
```

**Strategic Init flow**:
```
Your pattern type: combined
Your prefix: api-
Your owner: my-company

✓ Found 5 repositories matching combined criteria
```

---

## Exclusion Patterns

After pattern matching, you can exclude repositories by keywords:

**Common exclusions**:
- `deprecated` - Old repositories no longer maintained
- `archived` - Officially archived repositories
- `test` - Test/sandbox repositories
- `legacy` - Legacy code being phased out
- `old` - Outdated versions
- `backup` - Backup repositories

**Example**:
```
Preview: Found 23 repositories matching "myapp-*"
  • myapp-frontend (TypeScript, updated 2 days ago)
  • myapp-backend (Node.js, updated 1 week ago)
  • myapp-api (TypeScript, updated 3 days ago)
  • myapp-deprecated-v1 (JavaScript, updated 2 years ago)    ← Will exclude
  • myapp-archived-old (Python, updated 3 years ago)         ← Will exclude
  ... (18 more)

Exclude any repositories? (optional)
Enter keywords separated by commas: deprecated, archived

✓ Excluded 2 repositories
Final selection: 21 repositories
```

---

## GitHub API Integration

SpecWeave uses GitHub API to fetch repository metadata:

**Fetched metadata**:
- Repository name
- Owner
- Description
- Primary language
- Star count
- Last updated date
- Active branches

**Authentication**:
```bash
# Set GitHub token (optional, increases rate limit)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Or use GitHub CLI authentication
gh auth login
```

**Rate limits**:
- **Without auth**: 60 requests/hour
- **With auth**: 5,000 requests/hour

**Tip**: For large organizations (100+ repos), use GitHub token to avoid rate limiting.

---

## Selection Preview

Strategic Init shows a detailed preview before finalizing:

```
📦 Repository Selection Preview
══════════════════════════════════════════════════════════════════

Pattern: Prefix "myapp-"
Owner: my-company
Exclusions: deprecated, archived

Found: 21 repositories

Top 10 (sorted by last updated):
  1. myapp-frontend
     Language: TypeScript
     Stars: 145
     Last updated: 2 days ago
     Description: React web application

  2. myapp-backend
     Language: Node.js
     Stars: 89
     Last updated: 1 week ago
     Description: Express REST API

  3. myapp-api
     Language: TypeScript
     Stars: 67
     Last updated: 3 days ago
     Description: GraphQL API gateway

  ... (18 more)

══════════════════════════════════════════════════════════════════

Confirm selection? (y/n/modify)
  y - Accept and save selection
  n - Cancel and restart
  modify - Adjust exclusions or pattern
```

---

## Saved Configuration

Selection is saved to `.specweave/config.json` for future reference:

```json
{
  "repositories": {
    "selectionRules": {
      "type": "prefix",
      "pattern": "myapp-",
      "owner": "my-company",
      "excludePatterns": ["deprecated", "archived"]
    },
    "repositories": [
      {
        "name": "myapp-frontend",
        "url": "https://github.com/my-company/myapp-frontend",
        "owner": "my-company",
        "description": "React web application",
        "language": "TypeScript",
        "stars": 145,
        "lastUpdated": "2025-11-15T10:30:00Z"
      },
      {
        "name": "myapp-backend",
        "url": "https://github.com/my-company/myapp-backend",
        "owner": "my-company",
        "description": "Express REST API",
        "language": "Node.js",
        "stars": 89,
        "lastUpdated": "2025-11-08T14:22:00Z"
      }
      // ... (19 more)
    ]
  }
}
```

**Why save rules?** Future increments can reference this data for repository-specific tasks.

---

## Linking Projects to Repositories

After selection, Strategic Init links repositories to projects:

**Automatic linking** (based on repository names):
```
Repositories with "frontend" → frontend project
Repositories with "backend" → backend project
Repositories with "api" → backend project
Repositories with "mobile", "ios", "android" → mobile project
```

**Example**:
```
Projects detected:
  • frontend project
    Repositories:
      - myapp-frontend
      - myapp-web

  • backend project
    Repositories:
      - myapp-backend
      - myapp-api
      - myapp-services

  • mobile project
    Repositories:
      - myapp-mobile
      - myapp-ios
      - myapp-android
```

**Manual override**:
```json
{
  "projects": {
    "backend": {
      "repositories": [
        { "url": "https://github.com/my-company/myapp-backend" },
        { "url": "https://github.com/my-company/myapp-api" }
      ]
    }
  }
}
```

---

## Advanced Patterns

### Pattern: Monorepo with Multiple Services

**Scenario**: Single repository, multiple services in subdirectories

**Solution**: Use single repository with project folders
```
Repository: myapp-monorepo
Projects defined by folders:
  • backend/ → backend project
  • frontend/ → frontend project
  • mobile/ → mobile project
```

**Config**:
```json
{
  "repositories": {
    "type": "monorepo",
    "url": "https://github.com/my-company/myapp-monorepo",
    "projects": {
      "backend": { "path": "backend/" },
      "frontend": { "path": "frontend/" },
      "mobile": { "path": "mobile/" }
    }
  }
}
```

---

### Pattern: Microservices (100+ repositories)

**Scenario**: Large microservices architecture with many repos

**Solution**: Use combined pattern with strict prefix
```
Pattern: Prefix "service-"
Owner: "my-company"
Exclusions: test, sandbox, deprecated

Result: Selects only production services
```

**Tip**: Create GitHub topics/tags and filter by topic
```
Pattern: Topic "production-service"
Matches: Only repositories tagged "production-service"
```

---

### Pattern: Multi-Organization

**Scenario**: Repositories across multiple GitHub orgs

**Solution**: Run repository selection multiple times
```bash
# First organization
specweave init
# Select repositories from "company-frontend-org"

# Add second organization
specweave init --add-repos
# Select repositories from "company-backend-org"
```

**Config**:
```json
{
  "repositories": [
    { "owner": "company-frontend-org", "pattern": "web-*" },
    { "owner": "company-backend-org", "pattern": "api-*" }
  ]
}
```

---

## Use Cases & Examples

### Use Case 1: Bootstrapped Startup (5 repos)

**Scenario**: Small team, 5 repositories, simple names

**Selection method**: Manual selection (fastest for <5 repos)
```
Repositories:
1. https://github.com/myorg/frontend
2. https://github.com/myorg/backend
3. https://github.com/myorg/mobile
4. https://github.com/myorg/infrastructure
5. https://github.com/myorg/shared-utils
```

**Time**: 2 minutes

---

### Use Case 2: E-Commerce Platform (23 repos)

**Scenario**: Medium company, consistent naming "ec-*"

**Selection method**: Prefix pattern
```
Pattern: "ec-"
Exclusions: deprecated

Found: 23 repositories
  • ec-frontend
  • ec-backend
  • ec-api-gateway
  • ec-auth-service
  • ec-payment-service
  ... (18 more)
```

**Time**: 30 seconds (vs 10 minutes manual)

---

### Use Case 3: Enterprise Microservices (150 repos)

**Scenario**: Large company, 150+ repositories in org

**Selection method**: Owner + exclusions
```
Owner: "enterprise-corp"
Exclusions: test, sandbox, archived, deprecated, backup

Found: 87 production repositories
  (excluded 63 non-production repos)
```

**Time**: 1 minute (vs 45 minutes manual!)

---

## Troubleshooting

### "No repositories found"

**Causes**:
1. Pattern doesn't match any repositories
2. GitHub API authentication failed
3. Repository is private and token lacks access

**Fixes**:
```bash
# Check GitHub authentication
gh auth status

# Try different pattern
Pattern: myapp-   → Try: my-app- or app-

# Verify organization name
Owner: mycompany  → Try: my-company (with hyphen)

# Check token permissions
GITHUB_TOKEN must have "repo" scope for private repos
```

---

### "Rate limit exceeded"

**Cause**: GitHub API rate limit hit (60 requests/hour without auth)

**Fix**:
```bash
# Authenticate with GitHub
gh auth login

# Or set token
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Retry
specweave init
```

---

### "Excluded too many repos"

**Cause**: Exclusion pattern is too broad

**Example**:
```
Pattern: "service"
Exclusions: "old"

Result: Excludes "user-service-old" but also "user-service-v2-old-api"
```

**Fix**: Be more specific with exclusions
```
Exclusions: "-old", "-deprecated-old"
```

---

## Best Practices

### 1. Use Consistent Naming

**Good naming patterns**:
```
✅ myapp-frontend, myapp-backend, myapp-api
✅ service-auth, service-payment, service-notification
✅ web-portal, web-admin, web-api
```

**Bad naming patterns**:
```
❌ frontend, backend-service, the-api, mobile2
❌ proj1, proj2, new-project, project-final
```

### 2. Tag Repositories with Topics

GitHub topics enable advanced filtering:
```
Topics: production, microservice, nodejs, typescript

Pattern: Topic "production" + Topic "microservice"
Result: Only production microservices
```

### 3. Maintain .specweave/config.json

Keep repository list updated:
```bash
# Refresh repository list
specweave update-repos

# Add new repository
specweave add-repo https://github.com/org/new-service

# Remove archived repository
specweave remove-repo old-service
```

### 4. Document Selection Rules

Add comments to config.json:
```json
{
  "repositories": {
    "selectionRules": {
      "type": "prefix",
      "pattern": "service-",
      "rationale": "All microservices follow 'service-*' naming convention",
      "excludePatterns": ["test", "deprecated"],
      "lastUpdated": "2025-11-17"
    }
  }
}
```

---

## Learn More

- [Strategic Init Guide](./strategic-init.md) - Full Strategic Init flow
- [Multi-Project Setup](./multi-project-setup.md) - Link repositories to projects
- [GitHub Integration](../internal/integrations/github.md) - Sync with GitHub Issues

---

**Ready to select your repositories?** Run `specweave init` and answer the multi-repo questions!
