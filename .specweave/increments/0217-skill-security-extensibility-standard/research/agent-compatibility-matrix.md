# Agent Skills Format Compatibility Matrix

**Source**: `skills@1.3.9` npm package (vercel-labs/skills, tag v1.3.9)
**Specification**: Agent Skills format (agentskills.io)
**Date**: 2026-02-15
**Total agents**: 39 (per `AgentType` union in `src/types.ts`)

---

## 1. Executive Summary

The `skills@1.3.9` package defines 39 AI coding agents that support the Agent Skills format (SKILL.md). These agents are split into two categories:

- **6 Universal agents** (visible): Share the `.agents/skills` local directory, enabling write-once-read-many skill distribution. A 7th (Replit) uses the same path but is hidden from the universal list.
- **33 Non-universal agents**: Each uses a unique agent-specific skills directory (e.g., `.claude/skills`, `.cursor/skills`), requiring symlinks or copies from the canonical `.agents/skills` location.

The SKILL.md format is standardized across all 39 agents at the basic level (name + description frontmatter + markdown body). However, advanced features like `allowed-tools`, `context: fork`, and hooks have varying support across agents.

Key findings:
- All 39 agents support basic SKILL.md parsing (name, description, markdown instructions)
- `allowed-tools` is supported by most agents except Kiro CLI and Zencoder
- `context: fork` is exclusive to Claude Code
- Hooks are only supported by Claude Code and Cline
- The `skills` CLI uses filesystem detection (`existsSync`) to discover installed agents
- Installation uses a canonical `.agents/skills/<name>/` directory with symlinks to agent-specific paths

---

## 2. Methodology

This matrix was compiled from primary source analysis of the `skills@1.3.9` npm package:

1. **`src/agents.ts`** (420 lines) -- Complete agent registry with 39 entries. Each entry defines `name`, `displayName`, `skillsDir` (local), `globalSkillsDir` (global), `detectInstalled()` async function, and optional `showInUniversalList` flag.

2. **`src/types.ts`** (100 lines) -- TypeScript type definitions including the `AgentType` union (39 members) and `AgentConfig` interface.

3. **`src/installer.ts`** (1007 lines) -- Installation logic showing canonical directory pattern, symlink/copy strategies, and path traversal protection.

4. **`src/skills.ts`** (209 lines) -- Skill discovery and SKILL.md parsing via `gray-matter` for YAML frontmatter.

5. **`src/constants.ts`** (3 lines) -- Defines `AGENTS_DIR = '.agents'`, `SKILLS_SUBDIR = 'skills'`, and `UNIVERSAL_SKILLS_DIR = '.agents/skills'`.

6. **`README.md`** (451 lines) -- Official documentation including the compatibility feature matrix and supported agents table.

7. **Agent Skills Specification** (agentskills.io/specification) -- The open format specification defining SKILL.md structure.

The universal/non-universal classification is determined programmatically: an agent is "universal" if `config.skillsDir === '.agents/skills'` AND `config.showInUniversalList !== false`.

---

## 3. Universal vs Non-Universal Classification

### Definition

- **Universal agents** use `.agents/skills` as their local `skillsDir`. They share a single canonical skill location, eliminating the need for symlinks between canonical and agent-specific directories.
- **Non-universal agents** use agent-specific directories (e.g., `.claude/skills`, `.cursor/skills`). The `skills` CLI creates symlinks from the canonical `.agents/skills/<skill>/` to each agent's directory.

### Universal Agents (skillsDir === '.agents/skills')

| # | Agent | Display Name | Global Skills Dir | Show in Universal List | Notes |
|---|-------|-------------|-------------------|----------------------|-------|
| 1 | amp | Amp | `$XDG_CONFIG_HOME/agents/skills` | Yes (default) | Detects via `$XDG_CONFIG_HOME/amp` |
| 2 | codex | Codex | `$CODEX_HOME/skills` (default: `~/.codex/skills`) | Yes (default) | Also checks `/etc/codex` |
| 3 | gemini-cli | Gemini CLI | `~/.gemini/skills` | Yes (default) | Detects via `~/.gemini` |
| 4 | github-copilot | GitHub Copilot | `~/.copilot/skills` | Yes (default) | Detects via `.github` dir or `~/.copilot` |
| 5 | kimi-cli | Kimi Code CLI | `~/.config/agents/skills` | Yes (default) | Detects via `~/.kimi` |
| 6 | opencode | OpenCode | `$XDG_CONFIG_HOME/opencode/skills` | Yes (default) | Also detects via `~/.claude/skills` |
| 7 | replit | Replit | `$XDG_CONFIG_HOME/agents/skills` | **No** (`showInUniversalList: false`) | Hidden from universal list; detects via `.agents` dir in cwd |

**Note**: Replit uses `.agents/skills` as its skillsDir but has `showInUniversalList: false`, making it a "hidden universal" agent. The `getUniversalAgents()` function returns only 6 agents (excluding Replit).

### Non-Universal Agents (33 agents)

All remaining agents use agent-specific directories. See the full matrix in Section 4.

---

## 4. Full Compatibility Matrix

### Legend

- **Local Skills Dir**: Project-level path relative to project root (the `skillsDir` config value)
- **Global Skills Dir**: User-level absolute path (the `globalSkillsDir` config value)
- **Format Support**: All agents support the base SKILL.md format; see Section 5 for feature-level differences
- **Detection Method**: How `detectInstalled()` determines if the agent is present

| # | Agent | Display Name | Universal? | Local Skills Dir | Global Skills Dir | Detection Method |
|---|-------|-------------|-----------|-----------------|------------------|-----------------|
| 1 | amp | Amp | Yes | `.agents/skills` | `$XDG_CONFIG_HOME/agents/skills` | `existsSync($XDG_CONFIG_HOME/amp)` |
| 2 | antigravity | Antigravity | No | `.agent/skills` | `~/.gemini/antigravity/skills` | `existsSync($cwd/.agent)` OR `existsSync(~/.gemini/antigravity)` |
| 3 | augment | Augment | No | `.augment/skills` | `~/.augment/skills` | `existsSync(~/.augment)` |
| 4 | claude-code | Claude Code | No | `.claude/skills` | `$CLAUDE_CONFIG_DIR/skills` (default: `~/.claude/skills`) | `existsSync($CLAUDE_CONFIG_DIR)` (default: `~/.claude`) |
| 5 | openclaw | OpenClaw | No | `skills` | `~/.openclaw/skills` OR `~/.clawdbot/skills` OR `~/.moltbot/skills` | `existsSync(~/.openclaw)` OR `existsSync(~/.clawdbot)` OR `existsSync(~/.moltbot)` |
| 6 | cline | Cline | No | `.cline/skills` | `~/.cline/skills` | `existsSync(~/.cline)` |
| 7 | codebuddy | CodeBuddy | No | `.codebuddy/skills` | `~/.codebuddy/skills` | `existsSync($cwd/.codebuddy)` OR `existsSync(~/.codebuddy)` |
| 8 | codex | Codex | Yes | `.agents/skills` | `$CODEX_HOME/skills` (default: `~/.codex/skills`) | `existsSync($CODEX_HOME)` OR `existsSync(/etc/codex)` |
| 9 | command-code | Command Code | No | `.commandcode/skills` | `~/.commandcode/skills` | `existsSync(~/.commandcode)` |
| 10 | continue | Continue | No | `.continue/skills` | `~/.continue/skills` | `existsSync($cwd/.continue)` OR `existsSync(~/.continue)` |
| 11 | crush | Crush | No | `.crush/skills` | `~/.config/crush/skills` | `existsSync(~/.config/crush)` |
| 12 | cursor | Cursor | No | `.cursor/skills` | `~/.cursor/skills` | `existsSync(~/.cursor)` |
| 13 | droid | Droid | No | `.factory/skills` | `~/.factory/skills` | `existsSync(~/.factory)` |
| 14 | gemini-cli | Gemini CLI | Yes | `.agents/skills` | `~/.gemini/skills` | `existsSync(~/.gemini)` |
| 15 | github-copilot | GitHub Copilot | Yes | `.agents/skills` | `~/.copilot/skills` | `existsSync($cwd/.github)` OR `existsSync(~/.copilot)` |
| 16 | goose | Goose | No | `.goose/skills` | `$XDG_CONFIG_HOME/goose/skills` | `existsSync($XDG_CONFIG_HOME/goose)` |
| 17 | junie | Junie | No | `.junie/skills` | `~/.junie/skills` | `existsSync(~/.junie)` |
| 18 | iflow-cli | iFlow CLI | No | `.iflow/skills` | `~/.iflow/skills` | `existsSync(~/.iflow)` |
| 19 | kilo | Kilo Code | No | `.kilocode/skills` | `~/.kilocode/skills` | `existsSync(~/.kilocode)` |
| 20 | kimi-cli | Kimi Code CLI | Yes | `.agents/skills` | `~/.config/agents/skills` | `existsSync(~/.kimi)` |
| 21 | kiro-cli | Kiro CLI | No | `.kiro/skills` | `~/.kiro/skills` | `existsSync(~/.kiro)` |
| 22 | kode | Kode | No | `.kode/skills` | `~/.kode/skills` | `existsSync(~/.kode)` |
| 23 | mcpjam | MCPJam | No | `.mcpjam/skills` | `~/.mcpjam/skills` | `existsSync(~/.mcpjam)` |
| 24 | mistral-vibe | Mistral Vibe | No | `.vibe/skills` | `~/.vibe/skills` | `existsSync(~/.vibe)` |
| 25 | mux | Mux | No | `.mux/skills` | `~/.mux/skills` | `existsSync(~/.mux)` |
| 26 | opencode | OpenCode | Yes | `.agents/skills` | `$XDG_CONFIG_HOME/opencode/skills` | `existsSync($XDG_CONFIG_HOME/opencode)` OR `existsSync(~/.claude/skills)` |
| 27 | openhands | OpenHands | No | `.openhands/skills` | `~/.openhands/skills` | `existsSync(~/.openhands)` |
| 28 | pi | Pi | No | `.pi/skills` | `~/.pi/agent/skills` | `existsSync(~/.pi/agent)` |
| 29 | qoder | Qoder | No | `.qoder/skills` | `~/.qoder/skills` | `existsSync(~/.qoder)` |
| 30 | qwen-code | Qwen Code | No | `.qwen/skills` | `~/.qwen/skills` | `existsSync(~/.qwen)` |
| 31 | replit | Replit | Yes* | `.agents/skills` | `$XDG_CONFIG_HOME/agents/skills` | `existsSync($cwd/.agents)` |
| 32 | roo | Roo Code | No | `.roo/skills` | `~/.roo/skills` | `existsSync(~/.roo)` |
| 33 | trae | Trae | No | `.trae/skills` | `~/.trae/skills` | `existsSync(~/.trae)` |
| 34 | trae-cn | Trae CN | No | `.trae/skills` | `~/.trae-cn/skills` | `existsSync(~/.trae-cn)` |
| 35 | windsurf | Windsurf | No | `.windsurf/skills` | `~/.codeium/windsurf/skills` | `existsSync(~/.codeium/windsurf)` |
| 36 | zencoder | Zencoder | No | `.zencoder/skills` | `~/.zencoder/skills` | `existsSync(~/.zencoder)` |
| 37 | neovate | Neovate | No | `.neovate/skills` | `~/.neovate/skills` | `existsSync(~/.neovate)` |
| 38 | pochi | Pochi | No | `.pochi/skills` | `~/.pochi/skills` | `existsSync(~/.pochi)` |
| 39 | adal | AdaL | No | `.adal/skills` | `~/.adal/skills` | `existsSync(~/.adal)` |

*Replit uses `.agents/skills` but has `showInUniversalList: false`.

---

## 5. Platform-Specific Extensions Analysis

### Feature Compatibility Matrix

From the `README.md` compatibility table in the `skills@1.3.9` package:

| Feature | Support Level | Supported Agents | Not Supported |
|---------|-------------|-----------------|---------------|
| **Basic skills** (name, description, markdown body) | Universal | All 39 agents | None |
| **`allowed-tools`** (pre-approved tool list) | Near-universal | All agents listed in README except Kiro CLI, Zencoder | Kiro CLI, Zencoder |
| **`context: fork`** (skill context forking) | Claude Code exclusive | Claude Code only | All other 38 agents |
| **Hooks** (pre/post execution hooks) | Very limited | Claude Code, Cline | All other 37 agents |

### Feature Details

#### Basic Skills (Universal)
All 39 agents support the base SKILL.md format:
- YAML frontmatter with `name` (required) and `description` (required)
- Optional `license`, `compatibility`, and `metadata` fields
- Markdown body with instructions
- Optional `scripts/`, `references/`, and `assets/` subdirectories

#### `allowed-tools` (Experimental)
A space-delimited list of tools pre-approved for the skill to use. Example:
```yaml
allowed-tools: Bash(git:*) Bash(jq:*) Read
```
Supported by most agents. Notably **not** supported by Kiro CLI and Zencoder.

#### `context: fork` (Claude Code Exclusive)
Allows a skill to fork its context, creating an isolated execution environment. This is a Claude Code-specific extension not part of the base Agent Skills specification.

#### Hooks (Claude Code + Cline Only)
Pre/post execution hooks that trigger before or after skill activation. Only Claude Code and Cline support this feature.

### Agent-Specific Deviations

#### Antigravity
- Uses `.agent/skills` (singular "agent") instead of the more common `.agents/skills` (plural)
- Global path nests under `~/.gemini/antigravity/` suggesting it is a Google Gemini ecosystem product

#### OpenClaw (formerly Clawdbot/Moltbot)
- Uses bare `skills/` as local skillsDir (no dot-prefix directory)
- Supports three legacy global directory names: `~/.openclaw/`, `~/.clawdbot/`, `~/.moltbot/`
- Global path resolution is eager (computed at import time, not lazy)

#### Trae / Trae CN
- Both share the same local skillsDir: `.trae/skills`
- Differ only in global paths: `~/.trae/skills` vs `~/.trae-cn/skills`
- Differ in detection: `~/.trae` vs `~/.trae-cn`

#### Droid (Factory AI)
- Uses `.factory/skills` (not `.droid/skills`) reflecting its Factory AI branding

#### Windsurf
- Global path is `~/.codeium/windsurf/skills` (under Codeium parent company directory)
- Detection checks `~/.codeium/windsurf` (not `~/.windsurf`)

#### Codex (OpenAI)
- Respects `CODEX_HOME` environment variable for global path
- Also checks system-wide `/etc/codex` for detection (unique among all agents)

#### Claude Code
- Respects `CLAUDE_CONFIG_DIR` environment variable
- Default global path: `~/.claude/skills`
- Only agent supporting `context: fork`
- One of two agents supporting hooks

#### Kiro CLI (AWS)
- After skill installation, requires manual registration in `.kiro/agents/<agent>.json`:
  ```json
  { "resources": ["skill://.kiro/skills/**/SKILL.md"] }
  ```
- Does **not** support `allowed-tools`
- This is the only agent requiring a separate configuration step after installation

#### OpenCode
- Detection has a fallback: checks `~/.claude/skills` in addition to `$XDG_CONFIG_HOME/opencode`
- This cross-detection suggests OpenCode can discover Claude Code's skills

#### Crush (Charmbracelet)
- Uses XDG-style config path: `~/.config/crush/skills`
- Detection checks `~/.config/crush`

#### Goose (Block)
- Uses XDG-style config path: `$XDG_CONFIG_HOME/goose/skills`

#### Pi
- Unique nested global path: `~/.pi/agent/skills` (extra `agent/` segment)
- Detection checks `~/.pi/agent` specifically

---

## 6. Key Findings

### 6.1 Installation Architecture

The `skills` CLI uses a canonical directory pattern:
1. Skills are first copied to `.agents/skills/<skill-name>/` (canonical location)
2. For non-universal agents, symlinks are created from the canonical location to agent-specific directories
3. If symlinks fail (e.g., on Windows without developer mode), it falls back to file copying
4. On Windows, `junction` type symlinks are used instead of standard symlinks

### 6.2 Path Resolution Order

For global installations with the `$XDG_CONFIG_HOME` variable:
- Amp, OpenCode use: `$XDG_CONFIG_HOME/<agent>/skills`
- Kimi CLI, Replit use: `$XDG_CONFIG_HOME/agents/skills` (shared global path)
- Most other agents use: `~/.<agent>/skills`
- Crush, Goose use: `$XDG_CONFIG_HOME/<agent>/skills` (XDG-compliant)

### 6.3 Detection Method Patterns

Three detection strategies are used:

| Strategy | Agents | Description |
|----------|--------|-------------|
| Home directory check | 28 agents | `existsSync(~/.agent)` -- most common |
| XDG config check | 4 agents (Amp, Crush, Goose, OpenCode) | `existsSync($XDG_CONFIG_HOME/agent)` |
| Mixed/multi-path | 7 agents | Check multiple locations (cwd + home, env vars, legacy paths) |

### 6.4 Agents with Environment Variable Support

| Agent | Environment Variable | Default |
|-------|---------------------|---------|
| Claude Code | `CLAUDE_CONFIG_DIR` | `~/.claude` |
| Codex | `CODEX_HOME` | `~/.codex` |
| Amp, Crush, Goose, OpenCode, Kimi CLI, Replit | `XDG_CONFIG_HOME` | `~/.config` |

### 6.5 Skill Discovery Paths

The `discoverSkills()` function in `src/skills.ts` searches 30 priority directories when scanning a source repository for skills:
- Root directory
- `skills/`, `skills/.curated/`, `skills/.experimental/`, `skills/.system/`
- All 28+ agent-specific directories (`.claude/skills/`, `.cursor/skills/`, etc.)
- Plugin manifest paths from `.claude-plugin/marketplace.json` or `.claude-plugin/plugin.json`

If no skills are found in priority directories, a recursive search (up to 5 levels deep) is performed.

### 6.6 Security Measures

The installer implements several security measures:
- **Path sanitization**: `sanitizeName()` converts skill names to lowercase kebab-case, strips path traversal characters
- **Path containment validation**: `isPathSafe()` ensures target paths don't escape expected base directories
- **File exclusion**: `README.md`, `metadata.json`, `_*` prefixed files, and `.git/` directories are excluded during copy
- **Symlink resolution**: Handles circular symlinks (ELOOP errors) and resolves parent directory symlinks

### 6.7 SKILL.md Format Summary (Agent Skills Specification)

Per the agentskills.io specification:

| Frontmatter Field | Required | Constraints |
|-------------------|----------|-------------|
| `name` | Yes | 1-64 chars, lowercase alphanumeric + hyphens, must match parent directory |
| `description` | Yes | 1-1024 chars, should describe what + when |
| `license` | No | License name or reference |
| `compatibility` | No | 1-500 chars, environment requirements |
| `metadata` | No | Arbitrary key-value map |
| `allowed-tools` | No | Space-delimited tool list (experimental) |

Optional directories: `scripts/`, `references/`, `assets/`

### 6.8 Plugin Marketplace Integration

The `skills` CLI has Claude Code plugin marketplace compatibility via `src/plugin-manifest.ts`. It reads:
- `.claude-plugin/marketplace.json` -- Multi-plugin catalog with `plugins[].skills` paths
- `.claude-plugin/plugin.json` -- Single plugin with `skills` array

This enables bidirectional compatibility between the Agent Skills ecosystem and Claude Code's plugin marketplace.

### 6.9 Agent Count Discrepancy

The task description mentions "39 agents" with "7 universal" and "32 non-universal." The actual source code reveals:
- **39 total agents** (confirmed by `AgentType` union)
- **7 agents using `.agents/skills`**: Amp, Codex, Gemini CLI, GitHub Copilot, Kimi CLI, OpenCode, Replit
- **6 visible universal agents**: `getUniversalAgents()` returns 6 (Replit excluded due to `showInUniversalList: false`)
- **33 non-universal agents**: `getNonUniversalAgents()` returns 32, but Replit is excluded from this count too since it uses `.agents/skills`

Technically Replit sits in a gray zone: it uses the universal path but is not shown as universal.

### 6.10 Missing from the Compatibility Feature Table

The README's feature compatibility table in `skills@1.3.9` only covers 18 of the 39 agents explicitly. The remaining 21 agents (Augment, Crush, Droid, Goose, iFlow CLI, Junie, Kilo Code, Kode, MCPJam, Mistral Vibe, Mux, Trae, Trae CN, Kimi Code CLI, AdaL, Neovate, Pochi, Qwen Code, Continue, Cursor implied, Replit) are listed in the supported agents table but not individually tested in the feature matrix. Their feature support levels can be inferred as "basic skills: yes, allowed-tools: likely yes, context fork: no, hooks: no" based on the pattern that only explicitly listed exceptions deviate from the defaults.
