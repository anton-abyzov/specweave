# Project-Scoped Plugin Installation Support

## Overview

Claude Code 2.1.3+ introduced project-scoped plugin installation, allowing plugins to be installed per-project instead of globally. This increment implements support for this feature in SpecWeave, particularly for LSP plugins which should be project-scoped by default.

## Problem Statement

Currently, SpecWeave's `user-prompt-submit.sh` hook installs all plugins to **user scope** (default), which:
1. Pollutes global plugin list with project-specific plugins
2. Causes LSP plugins (vtsls, pyright, rust-analyzer) to be available in ALL projects
3. Requires restart even when plugins could be pre-configured

## Solution

Add support for project-scoped plugin installation with configurable defaults:
- LSP plugins → **project scope** (project-specific language support)
- SpecWeave plugins (sw-*) → **configurable** (user or project)
- Generic plugins (context7, playwright) → **user scope** (useful everywhere)

## User Stories

### US-001: Configure Plugin Installation Scope
**Project**: specweave
**As a** developer using SpecWeave
**I want to** configure the default installation scope for plugins
**So that** I can control whether plugins are installed globally or per-project

**Acceptance Criteria**:
- [x] AC-US1-01: Config option `plugins.defaultScope` accepts values: "user", "project", "local"
- [x] AC-US1-02: Config option `plugins.lspScope` specifically controls LSP plugin scope (default: "project")
- [x] AC-US1-03: Config option `plugins.specweaveScope` controls SpecWeave plugin scope (default: "user")
- [x] AC-US1-04: Hook reads scope configuration and applies `--scope` flag during installation

### US-002: Project-Scoped LSP Plugin Installation
**Project**: specweave
**As a** developer working on a TypeScript/Python/Rust project
**I want** LSP plugins to be installed with project scope
**So that** they don't pollute my global plugin list and are specific to the project

**Acceptance Criteria**:
- [x] AC-US2-01: LSP plugins (vtsls, pyright, rust-analyzer) use `--scope project` by default
- [x] AC-US2-02: Project scope can be overridden to "user" or "local" via config
- [x] AC-US2-03: Installation command includes correct scope flag
- [~] AC-US2-04: Plugin appears in `.claude/settings.json` when project-scoped *(deferred - E2E manual verification)*

### US-003: Documentation Update for Plugin Scopes
**Project**: specweave
**As a** SpecWeave user
**I want** clear documentation about plugin scopes
**So that** I understand when to use each scope and how to configure them

**Acceptance Criteria**:
- [x] AC-US3-01: CLAUDE.md includes section on plugin scopes (user, project, local)
- [~] AC-US3-02: README updated with scope installation examples *(deferred - optional for internal increment)*
- [x] AC-US3-03: Config schema documented with new plugin scope options

## Technical Design

### Config Schema Addition

```json
{
  "plugins": {
    "defaultScope": "user",
    "lspScope": "project",
    "specweaveScope": "user",
    "scopeOverrides": {
      "context7": "user",
      "playwright": "user"
    }
  }
}
```

### Hook Changes (user-prompt-submit.sh)

```bash
# Read scope from config
LSP_SCOPE=$(jq -r '.plugins.lspScope // "project"' "$CONFIG_PATH" 2>/dev/null)

# Apply scope when installing
claude plugin install vtsls@claude-code-lsps --scope "$LSP_SCOPE"
```

### Settings File Locations

| Scope | File | Git-tracked |
|-------|------|-------------|
| User | `~/.claude/settings.json` | No |
| Project | `.claude/settings.json` | Yes |
| Local | `.claude/settings.local.json` | No (gitignored) |

## Out of Scope

- UI for selecting scope during interactive installation
- Migration of existing user-scoped plugins to project scope
- Scope change for already-installed plugins

## Dependencies

- Claude Code 2.1.3+ (scope support)
- jq for JSON parsing in hooks

## Testing Strategy

- Unit tests for config parsing
- Integration tests for scope flag application
- E2E test verifying plugin appears in correct settings file
