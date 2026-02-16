# Agent Registry Data Model: 39-Agent Registry for vskill CLI

**Source**: `skills@1.3.9` npm package (`vercel-labs/skills`, file `src/agents.ts`)
**Date**: 2026-02-15
**Purpose**: Complete data model specification for the vskill CLI and verified-skill.com agent registry

---

## 1. Overview

### Why a 39-Agent Registry Is Needed

The vskill CLI must install, scan, and manage skills across every AI coding agent that supports the Agent Skills format (SKILL.md). The `skills@1.3.9` package from Vercel Labs defines 39 agents in its `src/agents.ts` registry. These 39 agents represent the complete set of coding assistants that have adopted or are compatible with the `.agents/skills` standard as of February 2026.

The registry serves three critical functions in the vskill ecosystem:

1. **Multi-agent installation**: When a user runs `vskill add owner/repo`, the CLI must detect which agents are installed on the machine and install the skill to all of them simultaneously. Without a registry, vskill would only target a single agent, leaving others without the skill.

2. **Agent-aware security scanning**: Different agents have different feature support levels. A skill using `allowed-tools` will work on Claude Code but silently fail on Kiro CLI. A skill using `context: fork` only works on Claude Code. The registry enables vskill to flag compatibility issues during scanning.

3. **verified-skill.com agent matrix**: The verification platform needs to display which agents a skill is compatible with, test against agent-specific quirks (singular `.agent/` vs plural `.agents/`, bare `skills/` directories, XDG paths), and generate per-agent installation instructions.

The 39-agent count splits into 7 universal agents (sharing `.agents/skills/`) and 32 non-universal agents (each with a unique skills directory path). Universal agents can read skills from a single canonical location, while non-universal agents require symlinks or copies from the canonical directory.

---

## 2. AgentDefinition TypeScript Interface

```typescript
/**
 * Unique identifier for each of the 39 supported coding agents.
 * Matches the `AgentType` union from skills@1.3.9 src/types.ts.
 */
type AgentId =
  | 'amp'
  | 'antigravity'
  | 'augment'
  | 'claude-code'
  | 'openclaw'
  | 'cline'
  | 'codebuddy'
  | 'codex'
  | 'command-code'
  | 'continue'
  | 'crush'
  | 'cursor'
  | 'droid'
  | 'gemini-cli'
  | 'github-copilot'
  | 'goose'
  | 'junie'
  | 'iflow-cli'
  | 'kilo'
  | 'kimi-cli'
  | 'kiro-cli'
  | 'kode'
  | 'mcpjam'
  | 'mistral-vibe'
  | 'mux'
  | 'opencode'
  | 'openhands'
  | 'pi'
  | 'qoder'
  | 'qwen-code'
  | 'replit'
  | 'roo'
  | 'trae'
  | 'trae-cn'
  | 'windsurf'
  | 'zencoder'
  | 'neovate'
  | 'pochi'
  | 'adal';

/**
 * Complete agent definition for the vskill registry.
 * Extends the skills@1.3.9 AgentConfig interface with parent company,
 * feature support matrix, and environment variable metadata.
 */
interface AgentDefinition {
  /** Unique agent identifier matching AgentId type */
  id: AgentId;

  /** Human-readable display name (e.g., 'Claude Code') */
  displayName: string;

  /** Project-level skills directory relative to cwd (e.g., '.claude/skills') */
  localSkillsDir: string;

  /** Global skills directory with absolute path (e.g., '~/.claude/skills') */
  globalSkillsDir: string;

  /** Whether this agent uses .agents/skills as its localSkillsDir */
  isUniversal: boolean;

  /** Whether this agent appears in the universal agents list (Replit: false) */
  showInUniversalList: boolean;

  /**
   * Detection logic description. In implementation, this is an async function
   * that returns boolean based on existsSync() checks on known config directories.
   */
  detectInstalled: () => Promise<boolean>;

  /** Environment variables that affect path resolution */
  envVars?: string[];

  /** Parent company or organization (e.g., 'Anthropic', 'OpenAI', 'Google') */
  parentCompany?: string;

  /** Feature support matrix for SKILL.md capabilities */
  featureSupport: {
    /** Basic SKILL.md parsing (name, description, markdown body). Always true. */
    basicSkills: boolean;

    /** Support for allowed-tools frontmatter field. Kiro CLI and Zencoder: false. */
    allowedTools: boolean;

    /** Support for context: fork. Claude Code only. */
    contextFork: boolean;

    /** Support for pre/post execution hooks. Claude Code and Cline only. */
    hooks: boolean;
  };

  /** Special considerations, quirks, or implementation notes */
  notes?: string;
}
```

---

## 3. Complete 39-Agent Registry

### 3.1 Universal Agents (7)

Universal agents use `.agents/skills` as their `localSkillsDir`. Skills installed to the canonical `.agents/skills/<name>/` location are readable by all universal agents without symlinks.

---

#### 1. amp

| Field | Value |
|-------|-------|
| **id** | `amp` |
| **displayName** | Amp |
| **localSkillsDir** | `.agents/skills` |
| **globalSkillsDir** | `$XDG_CONFIG_HOME/agents/skills` |
| **isUniversal** | `true` |
| **showInUniversalList** | `true` |
| **detectInstalled** | `existsSync($XDG_CONFIG_HOME/amp)` |
| **envVars** | `['XDG_CONFIG_HOME']` |
| **parentCompany** | Amp (Sourcegraph) |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Uses XDG config path for both detection and global skills directory. Global skills dir is shared (`agents/skills`), not agent-specific. |

---

#### 2. codex

| Field | Value |
|-------|-------|
| **id** | `codex` |
| **displayName** | Codex |
| **localSkillsDir** | `.agents/skills` |
| **globalSkillsDir** | `$CODEX_HOME/skills` (default: `~/.codex/skills`) |
| **isUniversal** | `true` |
| **showInUniversalList** | `true` |
| **detectInstalled** | `existsSync($CODEX_HOME)` OR `existsSync('/etc/codex')` |
| **envVars** | `['CODEX_HOME']` |
| **parentCompany** | OpenAI |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Only agent that checks a system-wide path (`/etc/codex`) for detection. Respects `CODEX_HOME` env var for global path override. |

---

#### 3. gemini-cli

| Field | Value |
|-------|-------|
| **id** | `gemini-cli` |
| **displayName** | Gemini CLI |
| **localSkillsDir** | `.agents/skills` |
| **globalSkillsDir** | `~/.gemini/skills` |
| **isUniversal** | `true` |
| **showInUniversalList** | `true` |
| **detectInstalled** | `existsSync(~/.gemini)` |
| **envVars** | none |
| **parentCompany** | Google |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Straightforward detection via home directory. Antigravity nests under the same `~/.gemini/` parent for its global path. |

---

#### 4. github-copilot

| Field | Value |
|-------|-------|
| **id** | `github-copilot` |
| **displayName** | GitHub Copilot |
| **localSkillsDir** | `.agents/skills` |
| **globalSkillsDir** | `~/.copilot/skills` |
| **isUniversal** | `true` |
| **showInUniversalList** | `true` |
| **detectInstalled** | `existsSync($cwd/.github)` OR `existsSync(~/.copilot)` |
| **envVars** | none |
| **parentCompany** | Microsoft |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Mixed detection: checks both project-level `.github` directory (common in most repos) and global `~/.copilot`. The `.github` check makes this agent likely to be detected in most repositories. |

---

#### 5. kimi-cli

| Field | Value |
|-------|-------|
| **id** | `kimi-cli` |
| **displayName** | Kimi Code CLI |
| **localSkillsDir** | `.agents/skills` |
| **globalSkillsDir** | `~/.config/agents/skills` |
| **isUniversal** | `true` |
| **showInUniversalList** | `true` |
| **detectInstalled** | `existsSync(~/.kimi)` |
| **envVars** | none |
| **parentCompany** | Moonshot AI |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Global skills dir uses a shared path (`~/.config/agents/skills`), not agent-specific. Detection is via `~/.kimi` which is separate from the skills path. |

---

#### 6. opencode

| Field | Value |
|-------|-------|
| **id** | `opencode` |
| **displayName** | OpenCode |
| **localSkillsDir** | `.agents/skills` |
| **globalSkillsDir** | `$XDG_CONFIG_HOME/opencode/skills` |
| **isUniversal** | `true` |
| **showInUniversalList** | `true` |
| **detectInstalled** | `existsSync($XDG_CONFIG_HOME/opencode)` OR `existsSync(~/.claude/skills)` |
| **envVars** | `['XDG_CONFIG_HOME']` |
| **parentCompany** | sst (open source) |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Cross-detects Claude Code's skills directory (`~/.claude/skills`) as a fallback. This means OpenCode can discover Claude Code's globally installed skills. Uses XDG path for its own global directory. |

---

#### 7. replit

| Field | Value |
|-------|-------|
| **id** | `replit` |
| **displayName** | Replit |
| **localSkillsDir** | `.agents/skills` |
| **globalSkillsDir** | `$XDG_CONFIG_HOME/agents/skills` |
| **isUniversal** | `true` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync($cwd/.agents)` |
| **envVars** | `['XDG_CONFIG_HOME']` |
| **parentCompany** | Replit |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Hidden universal agent: uses `.agents/skills` but has `showInUniversalList: false`. Detection checks for `.agents` directory in cwd (project-level only). Shares global skills path with Kimi CLI (`$XDG_CONFIG_HOME/agents/skills` vs `~/.config/agents/skills`). |

---

### 3.2 Non-Universal Agents (32)

Non-universal agents each have a unique `localSkillsDir`. When the skills CLI installs a skill, it copies to the canonical `.agents/skills/<name>/` and then creates a symlink from the canonical location to the agent-specific directory.

---

#### 8. antigravity

| Field | Value |
|-------|-------|
| **id** | `antigravity` |
| **displayName** | Antigravity |
| **localSkillsDir** | `.agent/skills` |
| **globalSkillsDir** | `~/.gemini/antigravity/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync($cwd/.agent)` OR `existsSync(~/.gemini/antigravity)` |
| **envVars** | none |
| **parentCompany** | Google |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Uses singular `.agent/skills` (NOT `.agents/skills`). Global path nests under `~/.gemini/antigravity/`, indicating it is a Google Gemini ecosystem product. Mixed detection checks both cwd and home directory. |

---

#### 9. augment

| Field | Value |
|-------|-------|
| **id** | `augment` |
| **displayName** | Augment |
| **localSkillsDir** | `.augment/skills` |
| **globalSkillsDir** | `~/.augment/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.augment)` |
| **envVars** | none |
| **parentCompany** | Augment |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection pattern. |

---

#### 10. claude-code

| Field | Value |
|-------|-------|
| **id** | `claude-code` |
| **displayName** | Claude Code |
| **localSkillsDir** | `.claude/skills` |
| **globalSkillsDir** | `$CLAUDE_CONFIG_DIR/skills` (default: `~/.claude/skills`) |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync($CLAUDE_CONFIG_DIR)` (default: `existsSync(~/.claude)`) |
| **envVars** | `['CLAUDE_CONFIG_DIR']` |
| **parentCompany** | Anthropic |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: true, hooks: true |
| **notes** | The most feature-rich agent. Only agent supporting `context: fork`. One of two agents supporting hooks (with Cline). Respects `CLAUDE_CONFIG_DIR` env var for path override. OpenCode cross-detects its skills directory. |

---

#### 11. openclaw

| Field | Value |
|-------|-------|
| **id** | `openclaw` |
| **displayName** | OpenClaw |
| **localSkillsDir** | `skills` |
| **globalSkillsDir** | `~/.openclaw/skills` OR `~/.clawdbot/skills` OR `~/.moltbot/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.openclaw)` OR `existsSync(~/.clawdbot)` OR `existsSync(~/.moltbot)` |
| **envVars** | none |
| **parentCompany** | OpenClaw |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Uses bare `skills/` directory (no dot-prefix). Supports three legacy global directory names from rebranding history (OpenClaw -> Clawdbot -> Moltbot). Global path resolution is eager (computed at import time, not lazy). The most deviant path structure of any agent. |

---

#### 12. cline

| Field | Value |
|-------|-------|
| **id** | `cline` |
| **displayName** | Cline |
| **localSkillsDir** | `.cline/skills` |
| **globalSkillsDir** | `~/.cline/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.cline)` |
| **envVars** | none |
| **parentCompany** | Cline (open source) |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: true |
| **notes** | One of two agents supporting hooks (with Claude Code). Standard home directory detection. |

---

#### 13. codebuddy

| Field | Value |
|-------|-------|
| **id** | `codebuddy` |
| **displayName** | CodeBuddy |
| **localSkillsDir** | `.codebuddy/skills` |
| **globalSkillsDir** | `~/.codebuddy/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync($cwd/.codebuddy)` OR `existsSync(~/.codebuddy)` |
| **envVars** | none |
| **parentCompany** | CodeBuddy |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Mixed detection: checks both project-level (cwd) and home directory. |

---

#### 14. command-code

| Field | Value |
|-------|-------|
| **id** | `command-code` |
| **displayName** | Command Code |
| **localSkillsDir** | `.commandcode/skills` |
| **globalSkillsDir** | `~/.commandcode/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.commandcode)` |
| **envVars** | none |
| **parentCompany** | Command Code |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection pattern. |

---

#### 15. continue

| Field | Value |
|-------|-------|
| **id** | `continue` |
| **displayName** | Continue |
| **localSkillsDir** | `.continue/skills` |
| **globalSkillsDir** | `~/.continue/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync($cwd/.continue)` OR `existsSync(~/.continue)` |
| **envVars** | none |
| **parentCompany** | Continue (open source) |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Mixed detection: checks both project-level (cwd) and home directory. |

---

#### 16. crush

| Field | Value |
|-------|-------|
| **id** | `crush` |
| **displayName** | Crush |
| **localSkillsDir** | `.crush/skills` |
| **globalSkillsDir** | `~/.config/crush/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.config/crush)` |
| **envVars** | none |
| **parentCompany** | Charmbracelet |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Uses XDG-style config path for global skills (`~/.config/crush/skills`). Detection uses the hardcoded `~/.config/crush` path rather than `$XDG_CONFIG_HOME`. |

---

#### 17. cursor

| Field | Value |
|-------|-------|
| **id** | `cursor` |
| **displayName** | Cursor |
| **localSkillsDir** | `.cursor/skills` |
| **globalSkillsDir** | `~/.cursor/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.cursor)` |
| **envVars** | none |
| **parentCompany** | Anysphere |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection. One of the most widely installed agents. |

---

#### 18. droid

| Field | Value |
|-------|-------|
| **id** | `droid` |
| **displayName** | Droid |
| **localSkillsDir** | `.factory/skills` |
| **globalSkillsDir** | `~/.factory/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.factory)` |
| **envVars** | none |
| **parentCompany** | Factory AI |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Uses `.factory/` branding (not `.droid/`), reflecting its Factory AI parent company. Directory name does not match agent id. |

---

#### 19. goose

| Field | Value |
|-------|-------|
| **id** | `goose` |
| **displayName** | Goose |
| **localSkillsDir** | `.goose/skills` |
| **globalSkillsDir** | `$XDG_CONFIG_HOME/goose/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync($XDG_CONFIG_HOME/goose)` |
| **envVars** | `['XDG_CONFIG_HOME']` |
| **parentCompany** | Block |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Uses XDG-compliant config path for both detection and global skills. |

---

#### 20. junie

| Field | Value |
|-------|-------|
| **id** | `junie` |
| **displayName** | Junie |
| **localSkillsDir** | `.junie/skills` |
| **globalSkillsDir** | `~/.junie/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.junie)` |
| **envVars** | none |
| **parentCompany** | JetBrains |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection. JetBrains AI coding agent. |

---

#### 21. iflow-cli

| Field | Value |
|-------|-------|
| **id** | `iflow-cli` |
| **displayName** | iFlow CLI |
| **localSkillsDir** | `.iflow/skills` |
| **globalSkillsDir** | `~/.iflow/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.iflow)` |
| **envVars** | none |
| **parentCompany** | iFlow |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection pattern. |

---

#### 22. kilo

| Field | Value |
|-------|-------|
| **id** | `kilo` |
| **displayName** | Kilo Code |
| **localSkillsDir** | `.kilocode/skills` |
| **globalSkillsDir** | `~/.kilocode/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.kilocode)` |
| **envVars** | none |
| **parentCompany** | Kilo Code |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection. Directory uses `kilocode` not `kilo`. |

---

#### 23. kiro-cli

| Field | Value |
|-------|-------|
| **id** | `kiro-cli` |
| **displayName** | Kiro CLI |
| **localSkillsDir** | `.kiro/skills` |
| **globalSkillsDir** | `~/.kiro/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.kiro)` |
| **envVars** | none |
| **parentCompany** | Amazon (AWS) |
| **featureSupport** | basicSkills: true, allowedTools: false, contextFork: false, hooks: false |
| **notes** | Does NOT support `allowed-tools`. Requires manual registration after skill installation: users must add `{ "resources": ["skill://.kiro/skills/**/SKILL.md"] }` to `.kiro/agents/<agent>.json`. The only agent requiring a separate post-install configuration step. |

---

#### 24. kode

| Field | Value |
|-------|-------|
| **id** | `kode` |
| **displayName** | Kode |
| **localSkillsDir** | `.kode/skills` |
| **globalSkillsDir** | `~/.kode/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.kode)` |
| **envVars** | none |
| **parentCompany** | Kode |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection pattern. |

---

#### 25. mcpjam

| Field | Value |
|-------|-------|
| **id** | `mcpjam` |
| **displayName** | MCPJam |
| **localSkillsDir** | `.mcpjam/skills` |
| **globalSkillsDir** | `~/.mcpjam/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.mcpjam)` |
| **envVars** | none |
| **parentCompany** | MCPJam |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection pattern. |

---

#### 26. mistral-vibe

| Field | Value |
|-------|-------|
| **id** | `mistral-vibe` |
| **displayName** | Mistral Vibe |
| **localSkillsDir** | `.vibe/skills` |
| **globalSkillsDir** | `~/.vibe/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.vibe)` |
| **envVars** | none |
| **parentCompany** | Mistral AI |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Uses `.vibe/` directory (not `.mistral-vibe/`). Directory name does not match agent id. |

---

#### 27. mux

| Field | Value |
|-------|-------|
| **id** | `mux` |
| **displayName** | Mux |
| **localSkillsDir** | `.mux/skills` |
| **globalSkillsDir** | `~/.mux/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.mux)` |
| **envVars** | none |
| **parentCompany** | Mux |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection pattern. |

---

#### 28. openhands

| Field | Value |
|-------|-------|
| **id** | `openhands` |
| **displayName** | OpenHands |
| **localSkillsDir** | `.openhands/skills` |
| **globalSkillsDir** | `~/.openhands/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.openhands)` |
| **envVars** | none |
| **parentCompany** | All Hands AI (open source) |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection. Formerly known as OpenDevin. |

---

#### 29. pi

| Field | Value |
|-------|-------|
| **id** | `pi` |
| **displayName** | Pi |
| **localSkillsDir** | `.pi/skills` |
| **globalSkillsDir** | `~/.pi/agent/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.pi/agent)` |
| **envVars** | none |
| **parentCompany** | Pi |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Unique nested global path: `~/.pi/agent/skills` has an extra `agent/` segment between the config root and skills directory. Detection checks the nested `~/.pi/agent` path specifically. |

---

#### 30. qoder

| Field | Value |
|-------|-------|
| **id** | `qoder` |
| **displayName** | Qoder |
| **localSkillsDir** | `.qoder/skills` |
| **globalSkillsDir** | `~/.qoder/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.qoder)` |
| **envVars** | none |
| **parentCompany** | Qoder |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection pattern. |

---

#### 31. qwen-code

| Field | Value |
|-------|-------|
| **id** | `qwen-code` |
| **displayName** | Qwen Code |
| **localSkillsDir** | `.qwen/skills` |
| **globalSkillsDir** | `~/.qwen/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.qwen)` |
| **envVars** | none |
| **parentCompany** | Alibaba |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection. Uses `.qwen/` (not `.qwen-code/`). |

---

#### 32. roo

| Field | Value |
|-------|-------|
| **id** | `roo` |
| **displayName** | Roo Code |
| **localSkillsDir** | `.roo/skills` |
| **globalSkillsDir** | `~/.roo/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.roo)` |
| **envVars** | none |
| **parentCompany** | Roo Code |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection. Fork of Cline but does not inherit hooks support. |

---

#### 33. trae

| Field | Value |
|-------|-------|
| **id** | `trae` |
| **displayName** | Trae |
| **localSkillsDir** | `.trae/skills` |
| **globalSkillsDir** | `~/.trae/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.trae)` |
| **envVars** | none |
| **parentCompany** | ByteDance |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Shares localSkillsDir (`.trae/skills`) with Trae CN. They differ only in global path and detection directory. |

---

#### 34. trae-cn

| Field | Value |
|-------|-------|
| **id** | `trae-cn` |
| **displayName** | Trae CN |
| **localSkillsDir** | `.trae/skills` |
| **globalSkillsDir** | `~/.trae-cn/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.trae-cn)` |
| **envVars** | none |
| **parentCompany** | ByteDance |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | China-region variant of Trae. Shares localSkillsDir with Trae (`.trae/skills`) but has distinct global path (`~/.trae-cn/skills`) and detection directory (`~/.trae-cn`). |

---

#### 35. windsurf

| Field | Value |
|-------|-------|
| **id** | `windsurf` |
| **displayName** | Windsurf |
| **localSkillsDir** | `.windsurf/skills` |
| **globalSkillsDir** | `~/.codeium/windsurf/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.codeium/windsurf)` |
| **envVars** | none |
| **parentCompany** | Codeium (acquired by Windsurf) |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Global path nests under `~/.codeium/windsurf/` reflecting the Codeium parent company directory structure. Detection uses the nested path, not `~/.windsurf`. |

---

#### 36. zencoder

| Field | Value |
|-------|-------|
| **id** | `zencoder` |
| **displayName** | Zencoder |
| **localSkillsDir** | `.zencoder/skills` |
| **globalSkillsDir** | `~/.zencoder/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.zencoder)` |
| **envVars** | none |
| **parentCompany** | Zencoder |
| **featureSupport** | basicSkills: true, allowedTools: false, contextFork: false, hooks: false |
| **notes** | Does NOT support `allowed-tools`. One of only two agents (with Kiro CLI) lacking this feature. Standard home directory detection. |

---

#### 37. neovate

| Field | Value |
|-------|-------|
| **id** | `neovate` |
| **displayName** | Neovate |
| **localSkillsDir** | `.neovate/skills` |
| **globalSkillsDir** | `~/.neovate/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.neovate)` |
| **envVars** | none |
| **parentCompany** | Neovate |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection. Neovim-based AI coding agent. |

---

#### 38. pochi

| Field | Value |
|-------|-------|
| **id** | `pochi` |
| **displayName** | Pochi |
| **localSkillsDir** | `.pochi/skills` |
| **globalSkillsDir** | `~/.pochi/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.pochi)` |
| **envVars** | none |
| **parentCompany** | Pochi |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection pattern. |

---

#### 39. adal

| Field | Value |
|-------|-------|
| **id** | `adal` |
| **displayName** | AdaL |
| **localSkillsDir** | `.adal/skills` |
| **globalSkillsDir** | `~/.adal/skills` |
| **isUniversal** | `false` |
| **showInUniversalList** | `false` |
| **detectInstalled** | `existsSync(~/.adal)` |
| **envVars** | none |
| **parentCompany** | AdaL |
| **featureSupport** | basicSkills: true, allowedTools: true, contextFork: false, hooks: false |
| **notes** | Standard home directory detection pattern. |

---

## 4. Detection Logic Patterns

The `detectInstalledAgents()` function runs all 39 detection checks in parallel using `Promise.all()`. Each check is a synchronous `existsSync()` call wrapped in an async function. There is no binary detection, no process scanning, no registry lookup, and no version checking. An agent is considered "installed" if its expected configuration directory exists on the filesystem.

Three detection strategies are used:

### 4.1 Home Directory Check (28 agents)

The most common pattern. Checks for a dot-directory in the user's home folder.

**Pattern**: `existsSync(path.join(os.homedir(), '.<agent>'))` or `existsSync(path.join(os.homedir(), '.<agent-dir>'))`

| # | Agent | Detection Path |
|---|-------|---------------|
| 1 | augment | `~/.augment` |
| 2 | cline | `~/.cline` |
| 3 | command-code | `~/.commandcode` |
| 4 | cursor | `~/.cursor` |
| 5 | droid | `~/.factory` |
| 6 | gemini-cli | `~/.gemini` |
| 7 | iflow-cli | `~/.iflow` |
| 8 | junie | `~/.junie` |
| 9 | kilo | `~/.kilocode` |
| 10 | kimi-cli | `~/.kimi` |
| 11 | kiro-cli | `~/.kiro` |
| 12 | kode | `~/.kode` |
| 13 | mcpjam | `~/.mcpjam` |
| 14 | mistral-vibe | `~/.vibe` |
| 15 | mux | `~/.mux` |
| 16 | neovate | `~/.neovate` |
| 17 | openhands | `~/.openhands` |
| 18 | pochi | `~/.pochi` |
| 19 | qoder | `~/.qoder` |
| 20 | qwen-code | `~/.qwen` |
| 21 | roo | `~/.roo` |
| 22 | trae | `~/.trae` |
| 23 | trae-cn | `~/.trae-cn` |
| 24 | zencoder | `~/.zencoder` |
| 25 | adal | `~/.adal` |
| 26 | pi | `~/.pi/agent` |
| 27 | windsurf | `~/.codeium/windsurf` |
| 28 | crush | `~/.config/crush` |

Note: Pi, Windsurf, and Crush use nested home directory paths but are still classified here because they do not use `$XDG_CONFIG_HOME` environment variable resolution.

### 4.2 XDG Config Check (4 agents)

These agents use the `$XDG_CONFIG_HOME` environment variable (default: `~/.config`) for detection.

**Pattern**: `existsSync(path.join(xdgConfigHome, '<agent>'))`

| # | Agent | Detection Path |
|---|-------|---------------|
| 1 | amp | `$XDG_CONFIG_HOME/amp` |
| 2 | goose | `$XDG_CONFIG_HOME/goose` |
| 3 | opencode | `$XDG_CONFIG_HOME/opencode` |
| 4 | codex | `$CODEX_HOME` (env-var-specific, not XDG) |

Note: Codex uses its own `$CODEX_HOME` variable rather than `$XDG_CONFIG_HOME`, but follows the same env-var-first detection pattern.

### 4.3 Mixed/Multi-Path Detection (7 agents)

These agents check multiple filesystem locations, combining project-level (cwd) checks with home directory or environment variable checks.

| # | Agent | Detection Logic |
|---|-------|----------------|
| 1 | antigravity | `existsSync($cwd/.agent)` OR `existsSync(~/.gemini/antigravity)` |
| 2 | claude-code | `existsSync($CLAUDE_CONFIG_DIR)` OR `existsSync(~/.claude)` |
| 3 | codebuddy | `existsSync($cwd/.codebuddy)` OR `existsSync(~/.codebuddy)` |
| 4 | continue | `existsSync($cwd/.continue)` OR `existsSync(~/.continue)` |
| 5 | github-copilot | `existsSync($cwd/.github)` OR `existsSync(~/.copilot)` |
| 6 | openclaw | `existsSync(~/.openclaw)` OR `existsSync(~/.clawdbot)` OR `existsSync(~/.moltbot)` |
| 7 | replit | `existsSync($cwd/.agents)` |

Note: OpenCode also has a fallback (`~/.claude/skills`) but its primary detection is via `$XDG_CONFIG_HOME/opencode`, so it is classified under XDG above.

---

## 5. Environment Variable Support

The following agents use environment variables for path resolution or detection:

| Agent | Environment Variable | Purpose | Default Value |
|-------|---------------------|---------|---------------|
| claude-code | `CLAUDE_CONFIG_DIR` | Global config root and detection | `~/.claude` |
| codex | `CODEX_HOME` | Global config root and detection | `~/.codex` |
| amp | `XDG_CONFIG_HOME` | Global skills dir and detection | `~/.config` |
| goose | `XDG_CONFIG_HOME` | Global skills dir and detection | `~/.config` |
| opencode | `XDG_CONFIG_HOME` | Global skills dir and detection (with `~/.claude/skills` fallback) | `~/.config` |
| crush | (hardcoded `~/.config`) | Detection uses `~/.config/crush` directly | n/a |
| kimi-cli | (hardcoded `~/.config`) | Global skills dir `~/.config/agents/skills` | n/a |
| replit | `XDG_CONFIG_HOME` | Global skills dir | `~/.config` |

### Environment Variable Resolution Order

For agents that use environment variables, the resolution follows this pattern:

```
1. Check if env var is set: process.env.CLAUDE_CONFIG_DIR
2. If set: use env var value as base path
3. If not set: fall back to default (e.g., ~/.claude)
4. Append /skills to get globalSkillsDir
```

For XDG agents, the `xdg-basedir` npm package (v5.1.0) handles resolution of `$XDG_CONFIG_HOME` with the `~/.config` fallback.

---

## 6. Notable Agent Deviations

These agents deviate from the standard `.<agent-id>/skills` directory convention in ways that require special handling in the vskill registry:

### 6.1 Antigravity: Singular `.agent/`

Uses `.agent/skills` (singular) instead of the ecosystem-standard `.agents/skills` (plural). This is the only agent using the singular form. The global path nests under `~/.gemini/antigravity/`, confirming its position as a Google Gemini ecosystem product.

**Impact on vskill**: Must not assume all agent directories use plural `.agents`. Path construction must use the exact `localSkillsDir` from the registry.

### 6.2 OpenClaw: Bare `skills/` Directory with 3 Legacy Names

Uses a bare `skills/` directory with no dot-prefix, making it the only agent that places skills directly in the project root namespace. Supports three legacy global directory names from its rebranding history: `~/.openclaw/`, `~/.clawdbot/`, `~/.moltbot/`. Global path resolution is eager (computed at import time, not lazy).

**Impact on vskill**: The bare `skills/` path means skill files could conflict with project-level `skills/` directories. Detection must check all three legacy paths. Symlink targets may vary based on which legacy directory exists.

### 6.3 Droid: `.factory/` Branding

The agent id is `droid` but the directory is `.factory/skills`, reflecting its Factory AI parent company. This mismatch between id and directory name means directory lookup cannot simply use `.<agent-id>/skills`.

**Impact on vskill**: Agent id-to-directory mapping must always use the registry's `localSkillsDir` field, never derive the path from the id.

### 6.4 Windsurf: `~/.codeium/windsurf/` (Codeium Parent)

Global path is `~/.codeium/windsurf/skills` nested under the Codeium parent company directory. Detection also uses this nested path (`~/.codeium/windsurf`), not `~/.windsurf`.

**Impact on vskill**: Global path has two directory levels between `~/` and `skills/`, unlike the standard one-level pattern.

### 6.5 Kiro CLI: Manual Post-Install Registration

After skill installation, Kiro CLI requires users to manually register skills by editing `.kiro/agents/<agent>.json` to include:
```json
{ "resources": ["skill://.kiro/skills/**/SKILL.md"] }
```

This is the only agent that requires a separate configuration step after file installation. The skills CLI does not automate this step.

**Impact on vskill**: Post-install instructions must be displayed to the user. Consider automating this JSON editing in `vskill add --agent kiro-cli`.

### 6.6 Trae / Trae CN: Shared Local, Different Global

Both agents share the same `localSkillsDir` (`.trae/skills`) but differ in global paths: `~/.trae/skills` (international) vs `~/.trae-cn/skills` (China). They also differ in detection directories: `~/.trae` vs `~/.trae-cn`.

**Impact on vskill**: When both are detected, a skill installed to `.trae/skills` serves both agents at the project level. Global installs must target both paths separately.

### 6.7 Pi: Nested `~/.pi/agent/skills`

Has an extra `agent/` segment in its global path: `~/.pi/agent/skills` instead of the standard `~/.pi/skills`. Detection checks the nested `~/.pi/agent` directory.

**Impact on vskill**: The extra directory level is the only case where the global path has an intermediate segment between the config root and `skills/`.

### 6.8 OpenCode: Cross-Detects Claude Code's Skills

OpenCode's detection has a fallback check for `~/.claude/skills` in addition to its primary `$XDG_CONFIG_HOME/opencode` check. This means OpenCode is detected as "installed" if Claude Code is installed, even if OpenCode itself is not present.

**Impact on vskill**: False positive detection is possible. If a user has Claude Code but not OpenCode, the detection will still report OpenCode as installed. Consider adding a secondary validation (e.g., checking for OpenCode binary) to avoid installing skills to a non-existent agent.

### 6.9 GitHub Copilot: `.github` False Positive

Detection checks `existsSync($cwd/.github)`, which is present in nearly every GitHub-hosted repository. This makes GitHub Copilot likely to be detected in most projects regardless of whether Copilot is actually installed.

**Impact on vskill**: Very high false positive rate. Consider adding binary detection or VS Code extension check as a secondary validation.

### 6.10 Mistral Vibe and Qwen Code: Directory Mismatch

Mistral Vibe uses `.vibe/` (not `.mistral-vibe/`) and Qwen Code uses `.qwen/` (not `.qwen-code/`). Like Droid, the directory name does not match the agent id.

**Impact on vskill**: Same as Droid -- never derive directory paths from agent ids.

---

## 7. Use in vskill CLI

### 7.1 `vskill add`: Multi-Agent Installation

When a user runs `vskill add owner/repo`, the CLI uses the registry in this sequence:

```
1. Parse source (owner/repo -> GitHub clone URL)
2. Clone repository to temp directory
3. Discover SKILL.md files in the clone
4. Security scan each discovered skill (vskill's differentiator over skills CLI)
5. Display risk assessment and require confirmation
6. Detect installed agents:
   a. Run all 39 detectInstalled() checks in parallel
   b. Filter to detected agents
   c. Separate into universal and non-universal sets
7. Install skill to canonical location: .agents/skills/<name>/
8. For each detected non-universal agent:
   a. Create symlink from canonical to agent-specific directory
   b. Fall back to copy if symlink fails (Windows)
9. For agents with post-install requirements (Kiro CLI):
   a. Display manual configuration instructions
10. Update vskill lock file with:
    - Commit SHA, tree SHA, content hash
    - Security scan results
    - Targeted agents list
11. Display installation summary
```

### 7.2 `vskill list --agents`: Agent Status Display

Displays all 39 agents with their installation status:

```
$ vskill list --agents

  Detected Agents (4 installed):
    claude-code    Claude Code       ~/.claude               Anthropic
    cursor         Cursor            ~/.cursor               Anysphere
    codex          Codex (universal) ~/.codex                OpenAI
    gemini-cli     Gemini CLI (uni.) ~/.gemini               Google

  Universal Agents (always included):
    amp            Amp               $XDG_CONFIG_HOME/amp    Sourcegraph
    github-copilot GitHub Copilot    ~/.copilot              Microsoft
    kimi-cli       Kimi Code CLI     ~/.kimi                 Moonshot AI
    opencode       OpenCode          $XDG_CONFIG_HOME/oc     sst
    replit         Replit (hidden)    .agents                 Replit

  Not Detected (31 agents):
    antigravity, augment, cline, codebuddy, command-code, ...
```

The display groups agents into three tiers:
1. **Detected**: Agents found on the local machine via `detectInstalled()`
2. **Universal**: Agents that share `.agents/skills` (always receive skills)
3. **Not Detected**: Remaining agents (listed but not targeted for installation)

### 7.3 `vskill scan --agent claude-code`: Agent-Specific Scanning

Scans skills installed for a specific agent and reports compatibility issues:

```
$ vskill scan --agent claude-code

  Scanning ~/.claude/skills/ ...

  my-skill (v1.2.0)
    Source: owner/repo @ abc123
    Features used: allowed-tools, context: fork
    Compatibility: claude-code ONLY (context: fork not supported by other agents)
    Security: PASS (low risk)

  another-skill (v2.0.1)
    Source: other/repo @ def456
    Features used: allowed-tools
    Compatibility: 37/39 agents (not Kiro CLI, not Zencoder)
    Security: WARN (shell command patterns detected)
```

The agent-specific scan uses the `featureSupport` matrix to identify:
- Skills that use features unsupported by the target agent
- Skills that are portable to other agents vs agent-locked
- Security findings relevant to the agent's permission model

### 7.4 Registry Data in verified-skill.com

The web platform uses the registry to generate:

1. **Agent compatibility badges**: Per-skill badges showing which agents are supported
2. **Installation instructions**: Agent-specific install commands and post-install steps
3. **Feature matrix display**: Visual indicator of which features each agent supports
4. **Detection guidance**: Help users verify which agents are installed on their machines
5. **Cross-agent testing results**: Automated testing of skills against each agent's quirks (path conventions, feature support, directory naming)
