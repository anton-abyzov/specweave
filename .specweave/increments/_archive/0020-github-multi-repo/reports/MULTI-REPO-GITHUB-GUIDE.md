# Multi-Repository GitHub Support - User Guide

**Version**: 0.16.0+
**Status**: COMPLETE ✅
**Author**: Claude (SpecWeave Development)
**Date**: 2025-11-11

## Executive Summary

SpecWeave now supports **multiple GitHub repositories** in a single project, enabling teams to manage increments across different repositories with ease. This is essential for:
- **Microservices architectures** (each service = different repo)
- **Monorepo projects** (single repo with multiple projects)
- **Polyrepo organizations** (multiple related repositories)
- **Client agencies** (managing multiple client repositories)

## Quick Start

### 1. During `specweave init`

When initializing a new project, you'll be presented with clear options:

```bash
specweave init my-project

# You'll see:
🎯 GitHub Repository Setup

How would you like to configure GitHub repositories?

1. No repository (skip for now)
2. Single repository
3. Multiple repositories (microservices/polyrepo)
4. Monorepo (single repo with multiple projects)
5. Auto-detect from git remotes

Select an option: _
```

### 2. Option Details

#### Option 1: No Repository
- **Use when**: Starting without GitHub integration
- **Result**: No sync configuration created
- **Can add later**: Yes, using profile manager

#### Option 2: Single Repository
- **Use when**: Traditional single-repo project
- **Prompts for**: Owner and repo name
- **Creates**: One default profile

#### Option 3: Multiple Repositories
- **Use when**: Microservices or polyrepo architecture
- **Process**:
  1. Enter number of repositories (2-10)
  2. For each repo, provide:
     - Profile ID (e.g., "frontend", "backend")
     - Display name
     - Owner and repo

#### Option 4: Monorepo
- **Use when**: Single repository with multiple projects
- **Process**:
  1. Enter owner and repo
  2. Enter project names (e.g., "web-app", "mobile-app", "api")
  3. Creates profile with `monorepoProjects` list

#### Option 5: Auto-detect
- **Use when**: Project already has git remotes
- **Process**: Automatically detects and suggests repositories
- **Supports**: GitHub, GitLab, Bitbucket, Azure DevOps

## Configuration Structure

### New Profile-Based Format (v0.16.0+)

```json
{
  "sync": {
    "enabled": true,
    "activeProfile": "backend",
    "profiles": {
      "frontend": {
        "provider": "github",
        "displayName": "Frontend Application",
        "config": {
          "owner": "myorg",
          "repo": "frontend-app"
        }
      },
      "backend": {
        "provider": "github",
        "displayName": "Backend API",
        "config": {
          "owner": "myorg",
          "repo": "backend-api"
        }
      },
      "monorepo": {
        "provider": "github",
        "displayName": "Main Monorepo",
        "config": {
          "owner": "myorg",
          "repo": "monorepo",
          "monorepoProjects": ["web", "mobile", "shared"]
        }
      }
    },
    "settings": {
      "autoCreateIssue": true,
      "syncDirection": "bidirectional"
    }
  }
}
```

## Working with Increments

### Creating Increments with Specific Repositories

When you have multiple repositories configured, SpecWeave will:

1. **Single Profile**: Auto-selects it
2. **Multiple Profiles**: Prompts you to choose:

```bash
/specweave:increment "Add user authentication"

# You'll see:
🎯 Repository Selection

Select the GitHub repository for increment 0021-user-authentication:

1. Frontend Application (myorg/frontend-app)
2. Backend API (myorg/backend-api)
3. Mobile App (myorg/mobile-app)

Select repository: 2

✓ Selected: Backend API (myorg/backend-api)
```

### Increment Metadata

Each increment tracks its associated repository in `.specweave/increments/{id}/metadata.json`:

```json
{
  "incrementId": "0021-user-authentication",
  "githubProfile": "backend",
  "github": {
    "issue": 45,
    "url": "https://github.com/myorg/backend-api/issues/45"
  },
  "createdAt": "2025-11-11T10:00:00Z"
}
```

## Profile Management Commands

### Using GitHub Profile Manager

The profile manager provides comprehensive CRUD operations:

```typescript
import { GitHubProfileManager } from 'specweave';

const manager = new GitHubProfileManager(projectPath);

// List all profiles
const profiles = manager.getAllProfiles();

// Add a new profile
manager.addProfile({
  id: 'new-service',
  displayName: 'New Microservice',
  config: {
    owner: 'myorg',
    repo: 'new-service'
  }
});

// Set active profile
manager.setActiveProfile('backend');

// Interactive selection
const selected = await manager.selectProfile();
```

### CLI Operations

```bash
# List all profiles
/specweave-github:list-profiles

# Add a new profile
/specweave-github:add-profile

# Switch active profile
/specweave-github:set-active backend

# View increment mappings
/specweave-github:list-increments
```

## Migration from Old Format

### Automatic Migration

For projects using the old single-repo format:

```bash
# Run migration script
node scripts/migrate-to-profiles.ts

# Output:
🔄 Migrating to Profile-Based Sync Configuration

✓ Migrated GitHub config: myorg/myrepo
Created backup: config.json.backup-1699876543210

Migration Summary:
  Active Profile: github-default
  Profiles Created: 1
  Backup Created: config.json.backup-1699876543210

✅ Migration successful!
```

### Manual Migration

Old format (v0.15.x):
```json
{
  "sync": {
    "enabled": true,
    "provider": "github",
    "github": {
      "owner": "myorg",
      "repo": "myrepo"
    }
  }
}
```

New format (v0.16.0+):
```json
{
  "sync": {
    "enabled": true,
    "activeProfile": "github-default",
    "profiles": {
      "github-default": {
        "provider": "github",
        "displayName": "Default GitHub Repository",
        "config": {
          "owner": "myorg",
          "repo": "myrepo"
        }
      }
    }
  }
}
```

## Common Use Cases

### 1. Microservices Architecture

```json
{
  "profiles": {
    "user-service": {
      "provider": "github",
      "displayName": "User Service",
      "config": { "owner": "myorg", "repo": "user-service" }
    },
    "payment-service": {
      "provider": "github",
      "displayName": "Payment Service",
      "config": { "owner": "myorg", "repo": "payment-service" }
    },
    "notification-service": {
      "provider": "github",
      "displayName": "Notification Service",
      "config": { "owner": "myorg", "repo": "notification-service" }
    }
  }
}
```

### 2. Frontend/Backend Split

```json
{
  "profiles": {
    "frontend": {
      "provider": "github",
      "displayName": "React Frontend",
      "config": { "owner": "myorg", "repo": "app-frontend" }
    },
    "backend": {
      "provider": "github",
      "displayName": "Node.js Backend",
      "config": { "owner": "myorg", "repo": "app-backend" }
    }
  }
}
```

### 3. Monorepo with Projects

```json
{
  "profiles": {
    "main": {
      "provider": "github",
      "displayName": "Main Monorepo",
      "config": {
        "owner": "myorg",
        "repo": "monorepo",
        "monorepoProjects": [
          "packages/web",
          "packages/mobile",
          "packages/shared",
          "packages/cli"
        ]
      }
    }
  }
}
```

### 4. Client Agency

```json
{
  "profiles": {
    "client-a": {
      "provider": "github",
      "displayName": "Client A Website",
      "config": { "owner": "client-a", "repo": "website" }
    },
    "client-b": {
      "provider": "github",
      "displayName": "Client B Platform",
      "config": { "owner": "client-b", "repo": "platform" }
    },
    "internal": {
      "provider": "github",
      "displayName": "Agency Tools",
      "config": { "owner": "agency", "repo": "internal-tools" }
    }
  }
}
```

## Auto-Detection Features

### Git Remote Detection

The system can automatically detect repositories from git remotes:

```bash
# Detects from:
- https://github.com/owner/repo.git
- git@github.com:owner/repo.git
- ssh://git@github.com/owner/repo.git
- GitHub Enterprise URLs
- GitLab, Bitbucket, Azure DevOps
```

### Smart Fallbacks

When creating GitHub issues, the system uses this priority:

1. **Increment-specific profile** (from metadata.json)
2. **Active profile** (from config.json)
3. **Git remote detection** (from .git/config)
4. **Legacy config** (backward compatibility)

## Best Practices

### 1. Naming Profiles

Use descriptive, consistent names:
- ✅ `frontend`, `backend`, `database`
- ✅ `user-service`, `payment-service`
- ✅ `client-acme`, `client-beta`
- ❌ `repo1`, `repo2`, `repo3`

### 2. Organizing Increments

Map increments to appropriate repositories:
- UI changes → `frontend` profile
- API changes → `backend` profile
- Database migrations → `database` profile
- Cross-cutting features → Create in primary repo

### 3. Monorepo Projects

For monorepos, use project tags in issues:
- Label: `project:web`
- Label: `project:mobile`
- Milestone: `Q1-2025`

### 4. Profile Switching

Keep related work together:
- Complete frontend increments before switching to backend
- Use `activeProfile` to set default for new increments
- Document profile in increment spec.md

## Troubleshooting

### Issue: "Could not detect GitHub repository"

**Solution**: Ensure you have:
1. Configured at least one profile
2. Set an active profile
3. GitHub CLI authenticated (`gh auth login`)

### Issue: "Plugin 'specweave-github' not found"

**Solution**: The plugin is now installed globally via marketplace. Run:
```bash
specweave init .  # Re-runs installation
```

### Issue: Old config not working

**Solution**: Run migration script:
```bash
node scripts/migrate-to-profiles.ts
```

### Issue: Wrong repository selected

**Solution**: Update increment metadata:
```json
{
  "githubProfile": "correct-profile-id"
}
```

## API Reference

### GitHubProfileManager

```typescript
class GitHubProfileManager {
  constructor(projectPath: string)

  // CRUD Operations
  getAllProfiles(): GitHubProfile[]
  getProfile(id: string): GitHubProfile | null
  addProfile(profile: ProfileInput): boolean
  updateProfile(id: string, updates: Partial<Profile>): boolean
  deleteProfile(id: string): boolean

  // Active Profile
  getActiveProfile(): GitHubProfile | null
  setActiveProfile(id: string): boolean

  // Utilities
  hasProfiles(): boolean
  getProfileCount(): number
  selectProfile(message?: string): Promise<GitHubProfile | null>
  listProfiles(): void
}
```

### Profile Structure

```typescript
interface GitHubProfile {
  id: string;                    // Unique identifier
  provider: 'github';            // Always 'github'
  displayName: string;           // Human-readable name
  config: {
    owner: string;               // GitHub organization/user
    repo: string;                // Repository name
    monorepoProjects?: string[]; // Optional: projects within monorepo
  };
}
```

## Summary

The new multi-repository support in SpecWeave provides:

✅ **Flexibility**: Support for any repository architecture
✅ **Simplicity**: Clear UI with 5 intuitive options
✅ **Power**: Full CRUD operations on profiles
✅ **Compatibility**: Automatic migration from old format
✅ **Intelligence**: Auto-detection and smart fallbacks

This enables teams to manage complex, multi-repository projects with the same ease as single-repository projects, while maintaining SpecWeave's core principle of specification-driven development.

## Related Documentation

- [Migration Script](../../../scripts/migrate-to-profiles.ts)
- [Profile Manager Implementation](../../../src/cli/helpers/github/profile-manager.ts)
- [Git Detector Utility](../../../src/utils/git-detector.ts)
- [Config Schema](../../../src/core/schemas/specweave-config.schema.json)