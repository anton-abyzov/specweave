---
title: "vskill CLI Reference"
description: "Complete command reference for the vskill CLI — the package manager for AI agent skills"
keywords: [vskill, CLI, reference, commands, install, find, scan, audit, skills]
sidebar_position: 12
---

# vskill CLI Reference

`vskill` is the package manager for AI agent skills. It scans, verifies, installs, and manages skills across 49 AI coding agent platforms.

```bash
# Run without installing
npx vskill <command>

# Or install globally
npm install -g vskill
vskill <command>
```

---

## Command Overview

| Command | Alias | Description | Category |
|---------|-------|-------------|----------|
| [`install`](#install) | `i` | Install a skill from GitHub after security scan | Install |
| [`find`](#find) | `search` | Search the verified-skill.com registry | Discover |
| [`info`](#info) | — | Display detailed information about a skill | Discover |
| [`scan`](#scan) | — | Run tier-1 security scan on a SKILL.md file | Evaluate |
| [`audit`](#audit) | — | Audit a local project for security vulnerabilities | Evaluate |
| [`list`](#list) | — | List installed skills or detected agents | Manage |
| [`update`](#update) | — | Update installed skills from the registry | Manage |
| [`remove`](#remove) | — | Remove an installed skill from all agents | Manage |
| [`blocklist`](#blocklist) | — | Manage the malicious skills blocklist | Manage |
| [`submit`](#submit) | — | Submit a skill for verification | Publish |
| [`init`](#init) | — | Show detected AI agents and update lockfile | Setup |
| [`studio`](#studio) | — | Launch the Skill Studio UI | Develop |
| [`eval`](#eval) | — | Eval commands: serve, init, run, coverage | Develop |

---

## Discover

### `find`

Search the [verified-skill.com](https://verified-skill.com) registry for skills.

```bash
vskill find <query> [options]
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--limit <n>` | Max results to return | 15 |
| `--json` | Output raw JSON | — |

**Examples:**

```bash
# Search for React skills
vskill find "react"

# Search with JSON output for scripting
vskill find "auth" --json --limit 5
```

---

### `info`

Display detailed information about a skill from the registry.

```bash
vskill info <skill-name>
```

Shows trust tier, trust score, install count, GitHub stars, description, and repository link.

**Example:**

```bash
vskill info auth-guard
```

---

## Evaluate

### `scan`

Run a tier-1 security scan on a local `SKILL.md` file without installing it.

```bash
vskill scan <path>
```

Runs 52 deterministic pattern checks for credential exfiltration, prompt injection, unauthorized network access, and other threat categories.

**Example:**

```bash
vskill scan ./my-skill/SKILL.md
```

---

### `audit`

Audit an entire project for security vulnerabilities across all skill files.

```bash
vskill audit [path] [options]
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--json` | Output results as JSON | — |
| `--ci` | Output SARIF v2.1.0 for CI integration | — |
| `--report [path]` | Generate markdown report | — |
| `--fix` | Include suggested fixes for each finding | — |
| `--tier1-only` | Skip LLM analysis, use regex patterns only | — |
| `--exclude <patterns>` | Comma-separated exclude patterns | — |
| `--severity <level>` | Minimum severity to report | — |
| `--max-files <n>` | Maximum files to scan | 500 |

**Examples:**

```bash
# Audit current directory
vskill audit

# CI-friendly output
vskill audit --ci --severity high

# Generate a markdown report with fix suggestions
vskill audit --report ./security-report.md --fix
```

---

## Install

### `install`

Install a skill from GitHub, the registry, or a local directory. Runs a mandatory security scan before installing.

```bash
vskill install [source] [options]
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--skill <name>` | Skill name within a multi-skill repo | — |
| `--plugin <name>` | Plugin name from marketplace.json | — |
| `--plugin-dir <path>` | Local plugin directory path | — |
| `--repo <owner/repo>` | GitHub repo with marketplace.json | — |
| `--all` | Install all plugins from --repo marketplace | — |
| `--global` | Install to global agent directories | — |
| `--force` | Install even if scan finds issues | — |
| `--agent <id>` | Install to specific agent only (repeatable) | All detected |
| `--cwd` | Install relative to current directory | Project root |
| `--copy` | Install as independent copies | Symlink |
| `--select` | Interactively select skills and agents | Install all |
| `--only-skills <names>` | Only install specific skills (comma-separated) | — |
| `-y, --yes` | Skip all prompts, use defaults | — |

**Examples:**

```bash
# Install from registry
vskill install auth-guard

# Install from GitHub repo
vskill install anton-abyzov/vskill

# Install a specific plugin from a marketplace
vskill install --repo anton-abyzov/vskill --plugin mobile

# Install all plugins, skip prompts
vskill install --repo anton-abyzov/specweave --all --yes

# Install only to Cursor, as copies (not symlinks)
vskill install auth-guard --agent cursor --copy

# Install globally (available in all projects)
vskill install auth-guard --global

# Install from a local plugin directory (development)
vskill install --plugin-dir ./my-plugin
```

---

## Manage

### `list`

List installed skills or detected AI agents.

```bash
vskill list [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--agents` | Show all known agents with installed status |
| `--json` | Output as JSON |

**Examples:**

```bash
# List installed skills
vskill list

# Show all detected agents
vskill list --agents
```

---

### `update`

Update installed skills from their source. Re-runs security scan with diff analysis. By default updates **all** installed skills (no flags needed).

Supports all source types including `local:specweave` skills (core SpecWeave skills installed via `specweave refresh-plugins`). These are updated from the local plugin cache.

```bash
vskill update [skill] [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--all` | Explicit flag (same as default behavior) |
| `--agent <id>` | Update only for specific agent (repeatable) |

**Examples:**

```bash
# Update all installed skills (default)
vskill update

# Update a specific skill
vskill update auth-guard

# Update only for Cursor
vskill update --agent cursor
```

---

### `remove`

Remove an installed skill from all agents.

```bash
vskill remove <skill-name> [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--global` | Only remove from global agent directories |
| `--local` | Only remove from local agent directories |
| `--force` | Skip confirmation and proceed even if not in lockfile |

**Example:**

```bash
vskill remove auth-guard
```

---

### `blocklist`

Manage the malicious skills blocklist. Prevents installation of known-dangerous skills.

```bash
vskill blocklist [subcommand] [name]
```

**Subcommands:**

| Subcommand | Description |
|-----------|-------------|
| `list` (default) | Show all blocked skills |
| `add <name>` | Block a skill locally |
| `remove <name>` | Unblock a skill |

**Examples:**

```bash
# View blocked skills
vskill blocklist

# Block a skill
vskill blocklist add malicious-skill
```

---

## Publish

### `submit`

Submit a skill for verification on verified-skill.com.

```bash
vskill submit <source> [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--skill <name>` | Skill name within a multi-skill repo |

**Example:**

```bash
# Submit a GitHub repo for verification
vskill submit owner/my-skill-repo
```

---

## Setup

### `init`

Show detected AI agents and update the lockfile. Run this after installing a new AI coding agent.

```bash
vskill init
```

Scans for installed agents, displays their status, and creates/updates `vskill.lock`.

---

## Develop

### `studio`

Launch the Skill Studio UI — a browser-based IDE for skill development.

```bash
vskill studio [options]
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--root <path>` | Root directory to scan for skills | Current directory |
| `--port <number>` | Port for the Skill Studio server | 3077 |

**Example:**

```bash
# Launch with defaults
vskill studio

# Custom root and port
vskill studio --root ./my-skills --port 3080
```

See [Skill Studio documentation](/docs/skills/skill-studio) for full feature guide.

---

### `eval`

Run eval subcommands for skill testing from the command line (headless mode).

```bash
vskill eval [subcommand] [target] [options]
```

**Subcommands:**

| Subcommand | Description |
|-----------|-------------|
| `serve` | Start the eval server (same as `vskill studio`) |
| `init <plugin/skill>` | Initialize eval scaffolding for a skill |
| `run <plugin/skill>` | Run evals from the command line |
| `coverage` (default) | Show eval coverage across all skills |
| `generate-all` | Generate test cases for all skills |

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--force` | Overwrite existing evals.json | — |
| `--root <path>` | Root directory to scan for skills | Current directory |
| `--port <number>` | Port for eval UI server | 3077 |

**Examples:**

```bash
# Check eval coverage
vskill eval coverage

# Initialize evals for a specific skill
vskill eval init frontend/nextjs

# Run evals headlessly
vskill eval run frontend/nextjs

# Generate test cases for all skills
vskill eval generate-all --root ./plugins
```

---

## Common Workflows

### Find and install a skill

```bash
# 1. Search the registry
vskill find "react component"

# 2. Get detailed info
vskill info react-component-gen

# 3. Install it
vskill install react-component-gen
```

### Audit your project's skills

```bash
# Scan all skill files in the project
vskill audit --report security-audit.md --fix

# Review the report
cat security-audit.md
```

### Develop and test a skill locally

```bash
# Launch Skill Studio
vskill studio

# Or use CLI for headless testing
vskill eval init my-plugin/my-skill
vskill eval run my-plugin/my-skill
```

---

## Configuration

### Lockfile (`vskill.lock`)

Located at the project root (or `~/.vskill.lock` for global installs). Tracks all installed skills with version, SHA hash, trust tier, source, and installation timestamp.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub personal access token (avoids rate limiting) |
| `VSKILL_REGISTRY_URL` | Custom registry URL (default: verified-skill.com) |

---

## Next Steps

- **[Installing Skills](/docs/skills/installation)** — Step-by-step installation guide
- **[Skill Studio](/docs/skills/skill-studio)** — Browser-based skill development IDE
- **[Verified Skills Standard](/docs/skills/verified/)** — How the 3-tier trust system works
- **[verified-skill.com](https://verified-skill.com)** — Browse and submit skills
