---
title: "Installing Skills"
description: "How to find, install, and manage AI skills with the vskill CLI — the package manager for AI agent skills"
keywords: [vskill, install, skills, CLI, package manager, AI skills, plugins, marketplace]
sidebar_position: 3
---

# Installing Skills

`vskill` is the package manager for AI skills. It scans skills for security issues before installing them, tracks what's installed via a lockfile, and works across **49 AI coding agents** — not just Claude Code.

:::tip Quick Start
```bash
# Search the registry
npx vskill find "react"

# Install from GitHub
npx vskill install owner/repo

# Install a plugin (bundle of skills)
npx vskill install --repo anton-abyzov/vskill --plugin mobile
```
:::

---

## Prerequisites

- **Node.js 20.12+** (for `npx` / `npm`)
- At least one AI coding agent installed (Claude Code, Cursor, GitHub Copilot, etc.)

You don't need to install `vskill` globally — `npx vskill` works everywhere. If you prefer a global install:

```bash
npm install -g vskill
```

---

## Install from the Registry

The [verifiedskill.com](https://verifiedskill.com) registry indexes thousands of skills with trust scores and security tiers.

### 1. Search for skills

```bash
npx vskill find "auth"
```

Output shows matching skills with trust tier, install count, and GitHub stars:

```
  auth-guard       T3 Verified   ★ 1.2k   ↓ 890    owner/auth-skills
  jwt-helper       T2 Scanned    ★ 340     ↓ 210    owner/jwt-tools
  oauth-flow       T4 Certified  ★ 2.1k   ↓ 1.4k   owner/oauth-suite
```

### 2. Install a skill

```bash
npx vskill install auth-guard
```

vskill resolves the skill from the registry, runs a security scan, and installs it to all detected agents on your machine.

---

## Install from GitHub

Install skills directly from any GitHub repository:

```bash
# Full repo (interactive selection if multiple skills found)
npx vskill install owner/repo

# Specific skill within a repo
npx vskill install owner/repo --skill my-skill

# From a specific GitHub URL
npx vskill install https://github.com/owner/repo
```

vskill clones the repo, scans all `SKILL.md` files it finds, and lets you choose which to install.

---

## Install Plugins (Bundles of Skills)

A **plugin** bundles multiple related skills into a single installable package. Repositories that publish plugins include a `marketplace.json` catalog.

### Install a specific plugin

```bash
npx vskill install --repo owner/repo --plugin mobile
```

### Install all plugins from a marketplace

```bash
npx vskill install --repo owner/repo --all
```

### Available SpecWeave plugins

SpecWeave ships its skills as plugins through its own marketplace:

```bash
npx vskill install --repo anton-abyzov/specweave --plugin sw
```

| Plugin | Description |
|--------|-------------|
| `sw` | SpecWeave framework — increment lifecycle, living docs, PM-led planning |
| `sw-github` | GitHub integration — bidirectional sync, issue tracking |
| `sw-jira` | JIRA integration — bidirectional sync with epics/stories |
| `sw-ado` | Azure DevOps integration — bidirectional sync with work items |
| `sw-release` | Release management — versioning, RC workflows |
| `sw-diagrams` | Architecture diagrams — Mermaid, C4 Model, sequence diagrams |
| `docs` | Living documentation — build, validation, organization |
| `sw-media` | Media generation — AI images, video, programmatic video |

Additional domain plugins are available from the vskill marketplace:

```bash
npx vskill install --repo anton-abyzov/vskill --plugin mobile
```

| Plugin | Description |
|--------|-------------|
| `mobile` | React Native, Expo, Flutter, SwiftUI, Jetpack Compose |
| `skills` | Skill discovery — find and install the right skills |
| `google-workspace` | Google Workspace CLI tools |
| `marketing` | Social media, content creation, analytics |

### Plugin namespacing

Plugin skills are prefixed with the plugin name to prevent conflicts:

```
/mobile:appstore       — App store skill from the mobile plugin
/marketing:slack-messaging — Slack skill from the marketing plugin
/sw:increment          — SpecWeave increment skill from the sw plugin
```

---

## Install from Local Directory

During development, install a plugin directly from a local path:

```bash
npx vskill install --plugin-dir ./my-plugin
```

This is useful when building your own skills and testing them before publishing.

---

## What Happens During Install

Every installation goes through a mandatory security pipeline:

```
Source → Blocklist Check → Pattern Scan (38 rules) → Install → Lockfile Update
           ↓ blocked           ↓ issues found
         REJECTED           WARN + require --force
```

### 1. Blocklist check

vskill checks against a maintained blocklist of known malicious skills. Blocked skills cannot be installed even with `--force`.

### 2. Security scan (Tier 1)

38 deterministic pattern checks run against the skill's `SKILL.md`:

- Credential exfiltration attempts
- Prompt injection patterns
- Unauthorized network access
- File system manipulation
- Crypto mining indicators
- Persistence mechanisms

If issues are found, installation pauses and shows the findings. Use `--force` to install anyway (not recommended).

### 3. Optional LLM verification (Tier 2)

When you [submit a skill](/docs/skills/verified/) to verifiedskill.com, it undergoes additional LLM-based intent analysis. Skills that pass receive a higher trust tier badge.

### 4. Lockfile tracking

After install, vskill records the skill in `vskill.lock`:

```json
{
  "skills": {
    "auth-guard": {
      "version": "1.0.0",
      "sha": "a1b2c3...",
      "tier": "VERIFIED",
      "source": "https://github.com/owner/auth-skills",
      "installedAt": "2026-03-10T10:00:00Z"
    }
  }
}
```

This enables reproducible installs, integrity verification, and update tracking.

---

## Multi-Agent Install

vskill automatically detects which AI coding agents are installed on your machine and installs skills to all of them.

### Supported agents (49)

vskill supports installation to 49 AI coding agents including:

- **Claude Code**, **Cursor**, **GitHub Copilot**, **Gemini CLI**, **Codex**
- **Windsurf**, **Cline**, **Aider**, **Continue**, **Amp**
- **Devin**, **Replit**, **Augment**, and 36 more

### See detected agents

```bash
npx vskill list --agents
```

### Target a specific agent

```bash
npx vskill install auth-guard --agent cursor --agent claude-code
```

### How it works

Each agent has a known skill directory:

| Agent | Local Path | Global Path |
|-------|-----------|-------------|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` |
| GitHub Copilot | `.github/copilot/skills/` | `~/.github/copilot/skills/` |
| Gemini CLI | `.gemini/skills/` | `~/.gemini/skills/` |

vskill creates symlinks (default) or copies (`--copy`) of the skill into each agent's directory.

---

## Managing Installed Skills

### List installed skills

```bash
npx vskill list
```

### Update skills

```bash
# Update a specific skill
npx vskill update auth-guard

# Update all installed skills
npx vskill update --all
```

Updates re-run the security scan with diff analysis to flag new issues.

### Remove a skill

```bash
npx vskill remove auth-guard
```

Removes the skill from all agents and cleans up the lockfile.

### Manage the blocklist

```bash
# View blocked skills
npx vskill blocklist

# Block a skill locally
npx vskill blocklist add malicious-skill

# Unblock
npx vskill blocklist remove skill-name
```

---

## Global vs Project Scope

By default, skills install at **project scope** — they live in the current project's skill directories (e.g., `.claude/skills/`).

### Install globally

```bash
npx vskill install auth-guard --global
```

Global skills install to your home directory (e.g., `~/.claude/skills/`) and are available in every project.

### When to use each

| Scope | Path Example | Use When |
|-------|-------------|----------|
| **Project** (default) | `.claude/skills/auth/` | Team shares skills via git |
| **Global** | `~/.claude/skills/auth/` | Personal productivity skills |

---

## SpecWeave Plugin Auto-Loading

If you use SpecWeave, plugins load automatically based on what you're working on:

- Say "mobile app" → `mobile` plugin activates
- Say "post on social media" → `marketing` plugin activates
- Say "Google Drive" → `google-workspace` plugin activates

You don't need to manually install SpecWeave plugins — `specweave init` handles setup. However, you can manually control loading:

```bash
# Install a specific SpecWeave plugin
npx vskill install --repo anton-abyzov/specweave --plugin sw-github

# Disable auto-loading
export SPECWEAVE_DISABLE_AUTO_LOAD=1
```

For details on how lazy loading works, see the [Plugin Ecosystem](/docs/overview/plugins-ecosystem) guide.

---

## Troubleshooting

### "No agents detected"

vskill detects agents by checking for their CLI tools and configuration directories. If no agents are found:

1. Ensure at least one AI coding agent is installed
2. Run `npx vskill init` to refresh agent detection
3. Use `npx vskill list --agents` to see what's detected

### "Scan failed" or security warnings

The security scan found potential issues. Review the findings carefully:

- **Low severity**: Usually safe, but review the flagged patterns
- **High severity**: Likely dangerous — avoid installing without thorough review
- Use `--force` only if you've manually verified the skill is safe

### GitHub rate limiting

If installs from GitHub fail with rate limit errors:

1. Set `GITHUB_TOKEN` environment variable with a personal access token
2. Wait for the rate limit to reset (usually 1 hour)
3. Use `--copy` instead of symlinks if clone-based installs fail

### Skills not appearing in agent

After install, the agent may need a restart to pick up new skills:

- **Claude Code**: Start a new conversation
- **Cursor**: Reload window (`Cmd+Shift+P` → "Reload Window")
- **Copilot**: Restart the editor

### Symlink issues on Windows

Windows may require developer mode for symlinks. Use `--copy` as a workaround:

```bash
npx vskill install auth-guard --copy
```

---

## Next Steps

- **[Skill Studio](/docs/skills/skill-studio)** — Develop and test skills locally in a browser-based IDE
- **[vskill CLI Reference](/docs/skills/vskill-cli)** — Complete command reference with all flags
- **[Skills, Plugins & Marketplaces](/docs/skills/fundamentals)** — Understand how skills, plugins, and marketplaces relate
- **[Verified Skills Standard](/docs/skills/verified/)** — How skill security certification works
- **[verifiedskill.com](https://verifiedskill.com)** — Browse the trusted skill registry
