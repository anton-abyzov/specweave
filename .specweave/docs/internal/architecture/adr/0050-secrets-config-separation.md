# ADR-0050: Secrets vs Configuration Separation

**Status**: Accepted
**Date**: 2025-11-20
**Deciders**: SpecWeave Core Team
**Priority**: P0 (Security - Critical)

---

## Context

Currently, SpecWeave stores both secrets AND configuration in `.env` file:

**Current .env (Mixed Secrets + Config):**
```bash
# Secrets (SHOULD be here)
JIRA_API_TOKEN=abc123...
JIRA_EMAIL=user@company.com
GITHUB_TOKEN=ghp_xyz...

# Configuration (SHOULD NOT be here!)
JIRA_DOMAIN=company.atlassian.net
JIRA_STRATEGY=project-per-team
JIRA_PROJECTS=FRONTEND,BACKEND,MOBILE
JIRA_PROJECT_IDS=10001,10002,10003
```

### Problems

1. **Security Risk**: Non-sensitive config mixed with secrets
2. **Not Commitable**: `.env` is gitignored, so config is lost when cloning
3. **No Team Sharing**: Each developer must re-configure manually
4. **No Versioning**: Config changes aren't tracked in git
5. **Confusing**: Unclear what should be in `.env` vs config files

---

## Decision

We will **strictly separate** secrets from configuration:

### 1. Secrets → `.env` (Gitignored)

**ONLY sensitive credentials:**
```bash
# .env (GITIGNORED - NEVER COMMIT!)

# Jira Credentials
JIRA_API_TOKEN=your_token_here
JIRA_EMAIL=your_email@company.com

# GitHub Credentials
GITHUB_TOKEN=ghp_your_token_here

# Bitbucket Credentials
BITBUCKET_TOKEN=your_token_here

# Azure DevOps Credentials
ADO_PAT=your_pat_here

# GitLab Credentials
GITLAB_TOKEN=your_token_here
```

**Rules:**
- ✅ ONLY secrets (tokens, passwords, emails)
- ✅ Always gitignored
- ✅ Never committed to git
- ✅ Each developer has their own `.env`

---

### 2. Configuration → `.specweave/config.json` (Committed)

**All non-sensitive configuration:**
```json
{
  "$schema": "https://specweave.dev/schemas/config.json",
  "version": "2.0",

  "repository": {
    "provider": "github",
    "organization": "myorg",
    "repos": [
      {
        "name": "backend",
        "url": "https://github.com/myorg/backend.git",
        "specweaveProject": "backend"
      },
      {
        "name": "frontend",
        "url": "https://github.com/myorg/frontend.git",
        "specweaveProject": "frontend"
      }
    ]
  },

  "issueTracker": {
    "provider": "jira",
    "instanceType": "cloud",
    "domain": "mycompany.atlassian.net",
    "strategy": "project-per-team",
    "projects": [
      {
        "key": "BACKEND",
        "id": "10001",
        "specweaveProject": "backend"
      },
      {
        "key": "FRONTEND",
        "id": "10002",
        "specweaveProject": "frontend"
      }
    ]
  },

  "sync": {
    "enabled": true,
    "direction": "bidirectional",
    "autoSync": true,
    "includeStatus": true,
    "autoApplyLabels": true
  },

  "permissions": {
    "canCreate": true,
    "canUpdate": true,
    "canUpdateStatus": true
  }
}
```

**Rules:**
- ✅ NO secrets (tokens, passwords)
- ✅ Committed to git
- ✅ Shared across team
- ✅ Version controlled
- ✅ Can contain public URLs, project mappings, strategies

---

## File Structure

```
project/
├── .env                              # Secrets (gitignored)
├── .gitignore                        # Must include .env
├── .specweave/
│   ├── config.json                   # Main configuration (committed)
│   ├── .clone-state.json             # Clone manager state (gitignored)
│   └── docs/
│       └── internal/
│           └── specs/
│               └── .../
└── ...
```

---

## Migration Strategy

### Step 1: Extract Non-Secrets from .env

**Before (.env):**
```bash
JIRA_API_TOKEN=abc123
JIRA_EMAIL=user@company.com
JIRA_DOMAIN=company.atlassian.net      # ← MOVE TO CONFIG
JIRA_STRATEGY=project-per-team         # ← MOVE TO CONFIG
JIRA_PROJECTS=FRONTEND,BACKEND         # ← MOVE TO CONFIG
```

**After (.env):**
```bash
# ONLY secrets
JIRA_API_TOKEN=abc123
JIRA_EMAIL=user@company.com
```

**New (.specweave/config.json):**
```json
{
  "issueTracker": {
    "provider": "jira",
    "domain": "company.atlassian.net",
    "strategy": "project-per-team",
    "projects": [
      { "key": "FRONTEND", "id": "10001" },
      { "key": "BACKEND", "id": "10002" }
    ]
  }
}
```

### Step 2: Update Code to Read from Config

**Before:**
```typescript
// Read everything from .env
const domain = process.env.JIRA_DOMAIN;
const strategy = process.env.JIRA_STRATEGY;
const projects = process.env.JIRA_PROJECTS?.split(',');
```

**After:**
```typescript
// Read secrets from .env
const apiToken = process.env.JIRA_API_TOKEN;
const email = process.env.JIRA_EMAIL;

// Read config from .specweave/config.json
const config = readSpecWeaveConfig();
const domain = config.issueTracker.domain;
const strategy = config.issueTracker.strategy;
const projects = config.issueTracker.projects;
```

### Step 3: Update Init Flow

**New init flow:**
1. **Prompt for secrets** → Save to `.env` (gitignored)
2. **Prompt for configuration** → Save to `.specweave/config.json` (committed)
3. **Generate .env.example** → Template for team members

**.env.example (Committed):**
```bash
# Jira Credentials (REQUIRED)
JIRA_API_TOKEN=your_token_here
JIRA_EMAIL=your_email@company.com

# GitHub Credentials (OPTIONAL - if using GitHub)
GITHUB_TOKEN=your_token_here

# Instructions:
# 1. Copy this file to .env
# 2. Replace values with your actual credentials
# 3. NEVER commit .env to git!
```

---

## Updated Init Flow

```
specweave init .
├─ 1. Repository Provider
│  ├─ Select provider (GitHub, Bitbucket, ADO, Local)
│  ├─ Prompt for credentials → SAVE TO .env
│  ├─ Save config (repos, mappings) → SAVE TO config.json
│  └─ Generate .env.example
│
├─ 2. Issue Tracker
│  ├─ Select tracker (Jira, GitHub, ADO, None)
│  ├─ Prompt for credentials → SAVE TO .env
│  ├─ Save config (domain, strategy, projects) → SAVE TO config.json
│  └─ Update .env.example
│
└─ 3. Summary
   ├─ Show what was saved to .env (SECRETS)
   ├─ Show what was saved to config.json (CONFIG)
   └─ Remind: "Commit config.json, NEVER commit .env"
```

---

## Security Benefits

1. **No Accidental Commits**: Secrets stay in gitignored `.env`
2. **Team Onboarding**: New devs copy `.env.example`, add their tokens
3. **Version Control**: Config changes tracked in git
4. **Audit Trail**: See who changed what config when
5. **Separation of Concerns**: Clear boundary between secrets and config

---

## Example Team Workflow

**Project Lead (Initial Setup):**
```bash
$ specweave init .
✔ Jira domain: company.atlassian.net
✔ Jira API token: *** (saved to .env)
✔ Select projects: FRONTEND, BACKEND

✅ Configuration saved!
   Secrets: .env (GITIGNORED)
   Config: .specweave/config.json

$ git add .specweave/config.json .env.example
$ git commit -m "feat: add SpecWeave config"
$ git push
```

**New Team Member (Onboarding):**
```bash
$ git clone repo
$ cd repo
$ cp .env.example .env
$ vim .env  # Add personal Jira token
$ specweave init .  # Validates config, credentials work
✅ Ready to use SpecWeave!
```

---

## Consequences

### Positive

1. ✅ **Secure**: Secrets never committed to git
2. ✅ **Shareable**: Config can be committed and shared
3. ✅ **Clear**: Obvious what's secret vs config
4. ✅ **Onboarding**: New devs just copy .env.example
5. ✅ **Auditable**: Config changes tracked in git history

### Negative

1. ❌ **Migration Required**: Existing users must split .env
2. ❌ **Two Files**: Must maintain both .env and config.json
3. ❌ **Breaking Change**: Existing code must be updated

### Neutral

1. ➖ **More Structure**: Requires understanding of separation
2. ➖ **Documentation**: Must document what goes where

---

## Implementation Checklist

- [ ] Create config schema: `.specweave/schemas/config.schema.json`
- [ ] Implement config reader: `src/core/config-manager.ts`
- [ ] Update init flow to save secrets → .env
- [ ] Update init flow to save config → config.json
- [ ] Generate .env.example during init
- [ ] Update all code reading from .env (use config.json instead)
- [ ] Create migration script: `scripts/migrate-env-to-config.ts`
- [ ] Update documentation (CLAUDE.md, README.md)
- [ ] Add validation for config.json schema
- [ ] Update tests to use separated config

---

## Config Schema

**Location**: `.specweave/schemas/config.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SpecWeave Configuration",
  "type": "object",
  "required": ["version"],
  "properties": {
    "version": {
      "type": "string",
      "description": "Config version for migration support"
    },
    "repository": {
      "type": "object",
      "properties": {
        "provider": {
          "enum": ["local", "github", "bitbucket", "ado", "gitlab", "generic"]
        },
        "organization": {
          "type": "string"
        },
        "repos": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "url"],
            "properties": {
              "name": { "type": "string" },
              "url": { "type": "string" },
              "specweaveProject": { "type": "string" }
            }
          }
        }
      }
    },
    "issueTracker": {
      "type": "object",
      "properties": {
        "provider": {
          "enum": ["none", "jira", "github", "ado"]
        },
        "domain": {
          "type": "string",
          "description": "Jira domain (e.g., company.atlassian.net)"
        },
        "strategy": {
          "enum": ["single-project", "project-per-team", "component-based", "board-based"]
        },
        "projects": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["key"],
            "properties": {
              "key": { "type": "string" },
              "id": { "type": "string" },
              "specweaveProject": { "type": "string" }
            }
          }
        }
      }
    },
    "sync": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "direction": {
          "enum": ["import", "export", "bidirectional"]
        },
        "autoSync": { "type": "boolean" },
        "includeStatus": { "type": "boolean" },
        "autoApplyLabels": { "type": "boolean" }
      }
    }
  }
}
```

---

## Success Criteria

1. ✅ `.env` contains ONLY secrets (tokens, emails)
2. ✅ `.specweave/config.json` contains all non-sensitive config
3. ✅ `.env.example` generated during init
4. ✅ New team members can onboard by copying .env.example
5. ✅ Config changes tracked in git (config.json committed)
6. ✅ Secrets never accidentally committed (validation in pre-commit hook)
7. ✅ All tests pass with new structure
8. ✅ Migration script works for existing users

---

## References

- **12-Factor App**: https://12factor.net/config
- **Security Best Practices**: Never commit secrets to git
- **ADR-0048**: Repository Provider Architecture
- **ADR-0049**: Jira Auto-Discovery and Hierarchy Mapping

---

**Decision Date**: 2025-11-20
**Review Date**: 2025-12-01 (after implementation)
