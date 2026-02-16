# Skills.sh Installer Internals: Deep Dive

## 1. Executive Summary

The `vercel-labs/skills` package (npm: `skills`, v1.3.9) is a TypeScript CLI tool that installs AI agent skill files (SKILL.md) to 39 different coding agents. The architecture uses a canonical `.agents/skills/` directory as the single source of truth, with symlinks fanning out to agent-specific directories. Skills are sourced via git clone (depth=1), direct URL fetch, or well-known endpoint discovery.

Key findings:
- **Installation**: Shallow git clone to temp dir, discover SKILL.md files, copy to canonical `.agents/skills/<name>/`, symlink to each agent's directory
- **Agent detection**: Simple `existsSync()` checks on known config directories (~/.claude, ~/.cursor, etc.)
- **Lock file**: `~/.agents/.skill-lock.json` (v3) tracks installed skills with GitHub tree SHA for folder-level change detection
- **Update mechanism**: Compares tree SHA via GitHub API, then re-runs `npx skills add` for changed skills
- **Security gaps**: No content validation, no signature verification, no sandboxing, no diff review before overwrite, basic path traversal prevention only
- **Telemetry**: Fire-and-forget POST to `https://add-skill.vercel.sh/t` with install/remove events (opt-out via `DISABLE_TELEMETRY` or `DO_NOT_TRACK`)

---

## 2. Repository Structure

```
vercel-labs/skills/
├── bin/cli.mjs                    # Entry point (shebang wrapper)
├── build.config.mjs               # Build config (obuild)
├── package.json                    # npm package definition
├── skills/find-skills/SKILL.md    # Built-in "find-skills" skill
├── src/
│   ├── cli.ts                     # Main CLI router (commands: add, remove, list, find, init, check, update)
│   ├── add.ts                     # Core installation logic (~2100 lines)
│   ├── agents.ts                  # 39 agent definitions with detection logic
│   ├── installer.ts               # File copy/symlink mechanics (~1000 lines)
│   ├── skills.ts                  # SKILL.md discovery and parsing
│   ├── git.ts                     # Git clone wrapper (simple-git, depth=1)
│   ├── source-parser.ts           # Input parsing (GitHub, GitLab, local, URLs)
│   ├── skill-lock.ts              # Lock file management (~/.agents/.skill-lock.json)
│   ├── constants.ts               # AGENTS_DIR, SKILLS_SUBDIR constants
│   ├── types.ts                   # TypeScript type definitions
│   ├── telemetry.ts               # Fire-and-forget telemetry
│   ├── find.ts                    # Interactive skill search
│   ├── list.ts                    # List installed skills
│   ├── remove.ts                  # Remove skills
│   ├── mintlify.ts                # Legacy Mintlify skill fetcher
│   ├── plugin-manifest.ts         # Plugin manifest discovery
│   ├── providers/
│   │   ├── index.ts               # Provider registry
│   │   ├── registry.ts            # Provider registration
│   │   ├── types.ts               # Provider interfaces
│   │   ├── mintlify.ts            # Mintlify provider
│   │   ├── huggingface.ts         # HuggingFace provider
│   │   └── wellknown.ts           # Well-known endpoint provider (RFC 8615)
│   └── prompts/
│       └── search-multiselect.ts  # Custom interactive search UI
├── scripts/
│   ├── sync-agents.ts             # Agent list sync automation
│   ├── validate-agents.ts         # Agent validation
│   ├── execute-tests.ts           # Test runner
│   └── generate-licenses.ts       # License generation
└── tests/                         # Test files
```

### Key Dependencies (package.json)

```json
{
  "name": "skills",
  "version": "1.3.9",
  "bin": {
    "skills": "./bin/cli.mjs",
    "add-skill": "./bin/cli.mjs"
  },
  "devDependencies": {
    "@clack/prompts": "^0.11.0",    // Interactive CLI prompts
    "gray-matter": "^4.0.3",        // YAML frontmatter parsing
    "simple-git": "^3.27.0",        // Git operations
    "picocolors": "^1.1.1",         // Terminal colors
    "xdg-basedir": "^5.1.0",       // XDG config paths
    "obuild": "^0.4.22"            // Build tool
  }
}
```

Note: All dependencies are devDependencies -- obuild bundles everything into the dist.

---

## 3. Agent Detection Deep Dive (All 39 Agents)

Source file: `src/agents.ts`

Each agent is defined with:
- `name`: Internal identifier
- `displayName`: User-facing name
- `skillsDir`: Project-level skills directory (relative to cwd)
- `globalSkillsDir`: Global skills directory (absolute path, typically under `~/`)
- `detectInstalled`: Async function checking filesystem for agent presence
- `showInUniversalList`: Optional flag (only `replit` sets this to `false`)

### Universal Agents (use `.agents/skills/`)

These agents share the canonical `.agents/skills` directory and do NOT need symlinks:

| # | Agent | Display Name | skillsDir | globalSkillsDir | Detection Check |
|---|-------|-------------|-----------|-----------------|-----------------|
| 1 | `codex` | Codex | `.agents/skills` | `$CODEX_HOME/skills` or `~/.codex/skills` | `existsSync($CODEX_HOME)` or `existsSync('/etc/codex')` |
| 2 | `gemini-cli` | Gemini CLI | `.agents/skills` | `~/.gemini/skills` | `existsSync(~/.gemini)` |
| 3 | `github-copilot` | GitHub Copilot | `.agents/skills` | `~/.copilot/skills` | `existsSync(.github)` or `existsSync(~/.copilot)` |
| 4 | `kimi-cli` | Kimi Code CLI | `.agents/skills` | `~/.config/agents/skills` | `existsSync(~/.kimi)` |
| 5 | `opencode` | OpenCode | `.agents/skills` | `$XDG_CONFIG_HOME/opencode/skills` | `existsSync($XDG_CONFIG_HOME/opencode)` or `existsSync(~/.claude/skills)` |

Note: `replit` also uses `.agents/skills` but has `showInUniversalList: false`, so it's excluded from the universal agents list.

### Non-Universal Agents (need symlinks)

| # | Agent | Display Name | skillsDir | globalSkillsDir | Detection Check |
|---|-------|-------------|-----------|-----------------|-----------------|
| 6 | `amp` | Amp | `.agents/skills` (universal) | `$XDG_CONFIG_HOME/agents/skills` | `existsSync($XDG_CONFIG_HOME/amp)` |
| 7 | `antigravity` | Antigravity | `.agent/skills` | `~/.gemini/antigravity/skills` | `existsSync(.agent)` or `existsSync(~/.gemini/antigravity)` |
| 8 | `augment` | Augment | `.augment/skills` | `~/.augment/skills` | `existsSync(~/.augment)` |
| 9 | `claude-code` | Claude Code | `.claude/skills` | `$CLAUDE_CONFIG_DIR/skills` or `~/.claude/skills` | `existsSync($CLAUDE_CONFIG_DIR)` or `existsSync(~/.claude)` |
| 10 | `openclaw` | OpenClaw | `skills` | `~/.openclaw/skills` or `~/.clawdbot/skills` or `~/.moltbot/skills` | `existsSync(~/.openclaw)` or `~/.clawdbot` or `~/.moltbot` |
| 11 | `cline` | Cline | `.cline/skills` | `~/.cline/skills` | `existsSync(~/.cline)` |
| 12 | `codebuddy` | CodeBuddy | `.codebuddy/skills` | `~/.codebuddy/skills` | `existsSync(.codebuddy)` or `existsSync(~/.codebuddy)` |
| 13 | `command-code` | Command Code | `.commandcode/skills` | `~/.commandcode/skills` | `existsSync(~/.commandcode)` |
| 14 | `continue` | Continue | `.continue/skills` | `~/.continue/skills` | `existsSync(.continue)` or `existsSync(~/.continue)` |
| 15 | `crush` | Crush | `.crush/skills` | `~/.config/crush/skills` | `existsSync(~/.config/crush)` |
| 16 | `cursor` | Cursor | `.cursor/skills` | `~/.cursor/skills` | `existsSync(~/.cursor)` |
| 17 | `droid` | Droid | `.factory/skills` | `~/.factory/skills` | `existsSync(~/.factory)` |
| 18 | `goose` | Goose | `.goose/skills` | `$XDG_CONFIG_HOME/goose/skills` | `existsSync($XDG_CONFIG_HOME/goose)` |
| 19 | `junie` | Junie | `.junie/skills` | `~/.junie/skills` | `existsSync(~/.junie)` |
| 20 | `iflow-cli` | iFlow CLI | `.iflow/skills` | `~/.iflow/skills` | `existsSync(~/.iflow)` |
| 21 | `kilo` | Kilo Code | `.kilocode/skills` | `~/.kilocode/skills` | `existsSync(~/.kilocode)` |
| 22 | `kiro-cli` | Kiro CLI | `.kiro/skills` | `~/.kiro/skills` | `existsSync(~/.kiro)` |
| 23 | `kode` | Kode | `.kode/skills` | `~/.kode/skills` | `existsSync(~/.kode)` |
| 24 | `mcpjam` | MCPJam | `.mcpjam/skills` | `~/.mcpjam/skills` | `existsSync(~/.mcpjam)` |
| 25 | `mistral-vibe` | Mistral Vibe | `.vibe/skills` | `~/.vibe/skills` | `existsSync(~/.vibe)` |
| 26 | `mux` | Mux | `.mux/skills` | `~/.mux/skills` | `existsSync(~/.mux)` |
| 27 | `openhands` | OpenHands | `.openhands/skills` | `~/.openhands/skills` | `existsSync(~/.openhands)` |
| 28 | `pi` | Pi | `.pi/skills` | `~/.pi/agent/skills` | `existsSync(~/.pi/agent)` |
| 29 | `qoder` | Qoder | `.qoder/skills` | `~/.qoder/skills` | `existsSync(~/.qoder)` |
| 30 | `qwen-code` | Qwen Code | `.qwen/skills` | `~/.qwen/skills` | `existsSync(~/.qwen)` |
| 31 | `replit` | Replit | `.agents/skills` | `$XDG_CONFIG_HOME/agents/skills` | `existsSync(.agents)` |
| 32 | `roo` | Roo Code | `.roo/skills` | `~/.roo/skills` | `existsSync(~/.roo)` |
| 33 | `trae` | Trae | `.trae/skills` | `~/.trae/skills` | `existsSync(~/.trae)` |
| 34 | `trae-cn` | Trae CN | `.trae/skills` | `~/.trae-cn/skills` | `existsSync(~/.trae-cn)` |
| 35 | `windsurf` | Windsurf | `.windsurf/skills` | `~/.codeium/windsurf/skills` | `existsSync(~/.codeium/windsurf)` |
| 36 | `zencoder` | Zencoder | `.zencoder/skills` | `~/.zencoder/skills` | `existsSync(~/.zencoder)` |
| 37 | `neovate` | Neovate | `.neovate/skills` | `~/.neovate/skills` | `existsSync(~/.neovate)` |
| 38 | `pochi` | Pochi | `.pochi/skills` | `~/.pochi/skills` | `existsSync(~/.pochi)` |
| 39 | `adal` | AdaL | `.adal/skills` | `~/.adal/skills` | `existsSync(~/.adal)` |

### Detection Logic Summary

```typescript
// From src/agents.ts
export async function detectInstalledAgents(): Promise<AgentType[]> {
  const results = await Promise.all(
    Object.entries(agents).map(async ([type, config]) => ({
      type: type as AgentType,
      installed: await config.detectInstalled(),
    }))
  );
  return results.filter((r) => r.installed).map((r) => r.type);
}
```

Detection runs all 39 checks in parallel. Each check is a simple `existsSync()` call on a known config directory. No binary detection, no process scanning, no registry lookups.

### Universal vs Non-Universal Classification

```typescript
// Universal = uses .agents/skills as skillsDir
export function getUniversalAgents(): AgentType[] {
  return (Object.entries(agents) as [AgentType, AgentConfig][])
    .filter(([_, config]) => config.skillsDir === '.agents/skills' && config.showInUniversalList !== false)
    .map(([type]) => type);
}
```

Universal agents (codex, gemini-cli, github-copilot, kimi-cli, opencode, amp) share the canonical `.agents/skills` directory directly. Non-universal agents get symlinks from the canonical directory to their agent-specific paths.

---

## 4. Installation Flow (Step-by-Step)

### 4.1 Source Parsing (`src/source-parser.ts`)

The input string is parsed into a `ParsedSource` object:

```typescript
export interface ParsedSource {
  type: 'github' | 'gitlab' | 'git' | 'local' | 'direct-url' | 'well-known';
  url: string;
  subpath?: string;
  localPath?: string;
  ref?: string;
  skillFilter?: string;  // from @skill syntax: owner/repo@skill-name
}
```

Parsing priority:
1. **Source aliases**: `coinbase/agentWallet` maps to `coinbase/agentic-wallet-skills`
2. **Local path**: Starts with `/`, `./`, `../`, or Windows drive letter
3. **Direct skill URL**: Ends with `/skill.md` (case-insensitive), not GitHub/GitLab
4. **GitHub tree URL with path**: `github.com/owner/repo/tree/branch/path`
5. **GitHub tree URL**: `github.com/owner/repo/tree/branch`
6. **GitHub repo URL**: `github.com/owner/repo`
7. **GitLab URLs**: Same pattern with `/-/tree/` identifier
8. **GitHub shorthand with @skill**: `owner/repo@skill-name`
9. **GitHub shorthand**: `owner/repo` or `owner/repo/path`
10. **Well-known URL**: HTTP(S) URL not matching above patterns
11. **Fallback**: Direct git URL

### 4.2 Main Flow for GitHub Sources (`src/add.ts` - `runAdd()`)

Step-by-step for `npx skills add owner/repo`:

1. **Parse source**: `parseSource("owner/repo")` returns `{ type: 'github', url: 'https://github.com/owner/repo.git' }`

2. **Clone repository**: Uses `simple-git` with `--depth 1`:
   ```typescript
   // src/git.ts
   const tempDir = await mkdtemp(join(tmpdir(), 'skills-'));
   const git = simpleGit({ timeout: { block: 60000 } }); // 60s timeout
   await git.clone(url, tempDir, ['--depth', '1']);
   ```

3. **Discover skills**: Scan cloned repo for SKILL.md files:
   ```typescript
   // src/skills.ts - discoverSkills()
   // Priority search order:
   // 1. Root SKILL.md (returns immediately unless fullDepth)
   // 2. Known skill directories:
   //    - skills/, skills/.curated/, skills/.experimental/, skills/.system/
   //    - .agent/skills/, .agents/skills/, .claude/skills/, .cursor/skills/...
   // 3. Plugin manifest paths (.claude-plugin/marketplace.json, plugin.json)
   // 4. Recursive search (fallback, max depth 5)
   ```

4. **Parse SKILL.md**: Uses `gray-matter` to extract frontmatter:
   ```typescript
   // src/skills.ts - parseSkillMd()
   const { data } = matter(content);
   if (!data.name || !data.description) return null; // REQUIRED fields
   // Internal skills (data.metadata?.internal === true) are hidden unless
   // INSTALL_INTERNAL_SKILLS=1 or --skill filter explicitly names them
   ```

5. **Select skills** (interactive or via flags):
   - `--skill '*'`: All skills
   - `--skill name1 name2`: Filter by name
   - Single skill: Auto-select
   - `--yes`: Select all
   - Otherwise: Interactive multiselect

6. **Detect agents**:
   - `--agent '*'`: All 39 agents
   - `--agent claude-code cursor`: Specific agents
   - Otherwise: Run `detectInstalledAgents()`, auto-select if 1 detected, interactive if multiple
   - Universal agents are always included via `ensureUniversalAgents()`

7. **Choose scope** (project vs global):
   - `--global`: Global (~/...)
   - `--yes`: Default to project
   - Otherwise: Interactive prompt

8. **Choose install mode** (symlink vs copy):
   - `--yes`: Default to symlink
   - Otherwise: Interactive prompt

9. **Show installation summary** with overwrite warnings

10. **Install each skill to each agent** (sequential, not parallel):
    ```typescript
    for (const skill of selectedSkills) {
      for (const agent of targetAgents) {
        const result = await installSkillForAgent(skill, agent, {
          global: installGlobally,
          mode: installMode,
        });
      }
    }
    ```

11. **Track telemetry** (fire-and-forget, skipped for private repos)

12. **Update lock file** (global installs only)

13. **Cleanup temp directory**

14. **Prompt for find-skills** skill installation (one-time prompt)

### 4.3 Installation Mechanics (`src/installer.ts`)

#### Symlink Mode (Default)

```
Step 1: Copy skill files to canonical location
  .agents/skills/<skill-name>/SKILL.md   (project-level)
  ~/.agents/skills/<skill-name>/SKILL.md  (global)

Step 2: For each non-universal agent, create symlink:
  .cursor/skills/<skill-name> -> .agents/skills/<skill-name>
  .claude/skills/<skill-name> -> .agents/skills/<skill-name>
  ...

Step 3: For universal agents with global install, skip symlink
  (they already read from .agents/skills/ or ~/.agents/skills/)
```

Key implementation details:

```typescript
// installer.ts - installSkillForAgent()
export async function installSkillForAgent(skill, agentType, options) {
  const skillName = sanitizeName(skill.name);  // kebab-case, path traversal prevention

  // Canonical location
  const canonicalBase = getCanonicalSkillsDir(isGlobal, cwd);  // .agents/skills or ~/.agents/skills
  const canonicalDir = join(canonicalBase, skillName);

  // Agent-specific location
  const agentBase = isGlobal ? agent.globalSkillsDir : join(cwd, agent.skillsDir);
  const agentDir = join(agentBase, skillName);

  // Path traversal validation
  if (!isPathSafe(canonicalBase, canonicalDir)) return error;
  if (!isPathSafe(agentBase, agentDir)) return error;

  // Symlink mode:
  await cleanAndCreateDirectory(canonicalDir);  // rm -rf + mkdir -p
  await copyDirectory(skill.path, canonicalDir); // recursive copy, excludes README.md, metadata.json, .git, _*

  // Skip symlink for universal agents with global install
  if (isGlobal && isUniversalAgent(agentType)) return success;

  // Create symlink (falls back to copy if symlink fails -- e.g., Windows without Dev Mode)
  const symlinkCreated = await createSymlink(canonicalDir, agentDir);
  if (!symlinkCreated) {
    await cleanAndCreateDirectory(agentDir);
    await copyDirectory(skill.path, agentDir);  // fallback: independent copy
  }
}
```

#### Copy Mode

```typescript
// Simpler: copy directly to agent location, no canonical dir
await cleanAndCreateDirectory(agentDir);
await copyDirectory(skill.path, agentDir);
```

#### Symlink Creation Details

```typescript
// installer.ts - createSymlink()
async function createSymlink(target, linkPath) {
  // Skip if same path (resolved or with parent symlinks resolved)
  // Remove existing symlink/dir if present
  // Compute relative path from linkDir to target
  // Use 'junction' type on Windows, undefined (default) elsewhere
  const relativePath = relative(realLinkDir, target);
  await symlink(relativePath, linkPath, symlinkType);
}
```

#### File Exclusions During Copy

```typescript
const EXCLUDE_FILES = new Set(['README.md', 'metadata.json']);
const EXCLUDE_DIRS = new Set(['.git']);
// Also excludes files starting with '_'
```

#### Name Sanitization

```typescript
export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '-')           // Non-alphanumeric -> hyphen
    .replace(/^[.\-]+|[.\-]+$/g, '')          // Strip leading/trailing dots and hyphens
    .substring(0, 255) || 'unnamed-skill';    // Limit length, fallback name
}
```

---

## 5. SKILL.md Discovery Mechanics

Source: `src/skills.ts`

### Discovery Algorithm

```
discoverSkills(basePath, subpath, options)
  |
  |-- 1. Check root: basePath/SKILL.md
  |     If found and !fullDepth: return immediately
  |
  |-- 2. Scan priority directories (31 known paths):
  |     - basePath/
  |     - basePath/skills/
  |     - basePath/skills/.curated/
  |     - basePath/skills/.experimental/
  |     - basePath/skills/.system/
  |     - basePath/.agent/skills/
  |     - basePath/.agents/skills/
  |     - basePath/.claude/skills/
  |     - basePath/.cline/skills/
  |     - basePath/.codebuddy/skills/
  |     - basePath/.codex/skills/
  |     - basePath/.commandcode/skills/
  |     - basePath/.continue/skills/
  |     - basePath/.cursor/skills/
  |     - basePath/.github/skills/
  |     - basePath/.goose/skills/
  |     - basePath/.iflow/skills/
  |     - basePath/.junie/skills/
  |     - basePath/.kilocode/skills/
  |     - basePath/.kiro/skills/
  |     - basePath/.mux/skills/
  |     - basePath/.neovate/skills/
  |     - basePath/.opencode/skills/
  |     - basePath/.openhands/skills/
  |     - basePath/.pi/skills/
  |     - basePath/.qoder/skills/
  |     - basePath/.roo/skills/
  |     - basePath/.trae/skills/
  |     - basePath/.windsurf/skills/
  |     - basePath/.zencoder/skills/
  |     + Plugin manifest paths
  |
  |-- 3. For each priority dir, check child directories for SKILL.md
  |
  |-- 4. Fallback: recursive search (if nothing found or fullDepth)
  |     findSkillDirs(searchPath, depth=0, maxDepth=5)
  |     Skips: node_modules, .git, dist, build, __pycache__
  |
  |-- 5. Deduplicate by skill name (seenNames set)
```

### SKILL.md Frontmatter Requirements

```yaml
---
name: my-skill          # REQUIRED: string
description: What it does # REQUIRED: string
metadata:
  internal: true        # Optional: hides from default listing
---
```

If `name` or `description` is missing, the SKILL.md is silently skipped.

### Plugin Manifest Discovery

```typescript
// src/plugin-manifest.ts
// Checks for:
// 1. .claude-plugin/marketplace.json - multi-plugin catalog
// 2. .claude-plugin/plugin.json - single plugin
// Extracts skill paths from manifest "skills" arrays
// Only processes local paths starting with './'
// Validates paths stay within basePath (path traversal prevention)
```

---

## 6. Update Behavior

### Lock File Structure (`~/.agents/.skill-lock.json`)

```json
{
  "version": 3,
  "skills": {
    "skill-name": {
      "source": "owner/repo",
      "sourceType": "github",
      "sourceUrl": "https://github.com/owner/repo.git",
      "skillPath": "skills/skill-name/SKILL.md",
      "skillFolderHash": "abc123...",  // GitHub tree SHA
      "installedAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  },
  "dismissed": {
    "findSkillsPrompt": true
  },
  "lastSelectedAgents": ["claude-code", "cursor"]
}
```

### Version History
- **v1-v2**: Content hash based (SHA-256 of SKILL.md content)
- **v3** (current): GitHub tree SHA for folder-level change detection. Wipes lock file on version upgrade.

### Check Flow (`npx skills check`)

1. Read lock file
2. For each GitHub-sourced skill with a `skillFolderHash`:
   - Call `fetchSkillFolderHash(source, skillPath)` which uses GitHub Trees API
   - Compare tree SHA: `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`
   - Tries `main` then `master` branch
3. Report which skills have updates available

### Update Flow (`npx skills update`)

1. Same as check: identify skills with changed tree SHAs
2. For each changed skill, spawn subprocess:
   ```typescript
   spawnSync('npx', ['-y', 'skills', 'add', installUrl, '-g', '-y'], {
     stdio: ['inherit', 'pipe', 'pipe'],
   });
   ```
3. Constructs the install URL from lock file metadata:
   ```
   sourceUrl (e.g., https://github.com/owner/repo.git)
     -> Remove .git suffix
     -> Append /tree/main/{skillFolder}
   ```

### Critical Observations

- **Lock file is global only**: Only global installs (`-g`) are tracked in the lock file. Project-level installs have NO update tracking.
- **No lock file for project installs**: If you install without `-g`, there is no record of what was installed or where it came from.
- **Version wipe on upgrade**: Moving from lock v2 to v3 wipes all entries. Users must reinstall to get tracking.
- **Branch assumption**: Update always assumes `main` branch when constructing reinstall URL, even if the original install used a different branch.
- **No atomic updates**: Each skill is updated independently via a subprocess spawn of `npx skills add`. If one fails, others still proceed.

---

## 7. Security Analysis

### What IS Present

1. **Path traversal prevention** (`sanitizeName` + `isPathSafe`):
   ```typescript
   // sanitizeName: strips non-alphanumeric, removes leading dots/hyphens
   // isPathSafe: validates target path stays within base directory
   function isPathSafe(basePath, targetPath): boolean {
     return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
   }
   ```

2. **Temp directory validation** (cleanup only deletes within `tmpdir()`):
   ```typescript
   if (!normalizedDir.startsWith(normalizedTmpDir + sep)) {
     throw new Error('Attempted to clean up directory outside of temp directory');
   }
   ```

3. **Private repo telemetry opt-out**: Checks `isRepoPrivate()` before sending telemetry.

4. **Plugin manifest path validation**: `isContainedIn()` check prevents manifest entries from escaping basePath.

5. **Well-known skill path validation**: File paths in well-known skills checked against target directory.

### What IS MISSING

1. **No content validation**: SKILL.md content is never inspected for safety. A skill could contain instructions that tell an AI agent to:
   - Execute arbitrary shell commands
   - Exfiltrate environment variables, SSH keys, or credentials
   - Modify other files in the project
   - Install additional malicious software

2. **No signature verification**: No GPG signing, no checksums beyond the tree SHA (which only detects changes, not authenticity).

3. **No diff review before overwrite**: When updating, the new content silently replaces old content. The user never sees what changed.

4. **No sandboxing**: Skills run with full agent permissions. The CLI explicitly warns about this but does nothing to prevent it:
   ```
   "Review skills before use; they run with full agent permissions."
   ```

5. **No content scanning**: No scanning for:
   - Shell injection patterns (`rm -rf`, `curl | bash`, etc.)
   - Credential exfiltration patterns (environment variable access, file reading)
   - Known malicious patterns

6. **No supply chain integrity**:
   - No package signing
   - No reproducible builds
   - No attestation
   - Repository could be compromised between check and install

7. **No rate limiting on GitHub API**: The check/update commands make unauthenticated GitHub API calls (unless `gh auth` is set up), subject to 60 req/hr rate limit.

8. **Telemetry endpoint trust**: Telemetry posts to `https://add-skill.vercel.sh/t` -- a Vercel-deployed function. No verification that responses are not tracked or correlated.

9. **TOCTOU vulnerability**: Time-of-check-to-time-of-use gap between `fetchSkillFolderHash` (check) and the actual `npx skills add` (install). The repo content could change between these operations.

10. **No permission scoping**: All skills get identical permissions. No mechanism to declare what a skill needs access to (filesystem, network, shell, etc.).

---

## 8. vskill Improvement Opportunities

Based on the analysis, here are the key areas where a `vskill` CLI could improve upon `skills`:

### 8.1 Security Scanning Before Install

```
vskill add owner/repo
  -> Clone
  -> Discover SKILL.md files
  -> SCAN each SKILL.md for:
     - Shell command patterns (rm, curl, wget, eval, exec)
     - Credential access patterns (process.env, ~/.ssh, ~/.aws)
     - File exfiltration patterns (fetch, XMLHttpRequest, WebSocket)
     - Known malicious instruction patterns
  -> Show risk assessment BEFORE install
  -> Require explicit user confirmation for medium/high risk skills
```

### 8.2 Version Pinning (Lock File Enhancement)

The existing lock file (v3) stores `skillFolderHash` but doesn't pin to specific git commits or versions. Improvements:

```json
{
  "version": 1,
  "skills": {
    "skill-name": {
      "source": "owner/repo",
      "commitSha": "abc123def456...",     // Pin to exact commit
      "treeSha": "tree-sha...",           // Folder-level hash
      "contentHash": "sha256:...",        // Hash of installed content
      "installedAt": "2025-01-01T...",
      "signature": "...",                 // Optional: GPG/cosign signature
      "securityScan": {
        "scannedAt": "2025-01-01T...",
        "riskLevel": "low",
        "findings": []
      }
    }
  }
}
```

### 8.3 Diff Review on Updates

```
vskill update
  -> For each skill with available update:
     1. Fetch new content to temp location
     2. Compute diff against installed version
     3. Scan diff for security-relevant changes
     4. Show unified diff to user
     5. Require confirmation before applying
```

### 8.4 Same Agent Detection

The existing 39-agent detection logic can be reused directly. It's well-structured and easy to extend:

```typescript
// Can import directly or copy the agent definitions
// The detection is simple existsSync() checks
// Path mappings are complete and accurate
```

### 8.5 Additional Features to Consider

1. **Skill manifest validation**: Beyond frontmatter, validate that SKILL.md content follows a safe pattern
2. **Permission declarations**: Let skills declare what they need (shell, filesystem, network)
3. **Rollback support**: Keep previous version before overwrite, enable `vskill rollback skill-name`
4. **Audit log**: Record all install/update/remove actions with timestamps
5. **Content integrity**: Sign installed content and verify on each agent load
6. **Repository allowlist/blocklist**: Let organizations control which sources are trusted
7. **Offline mode**: Cache skills for air-gapped environments

---

## 9. Key Source Code References

All paths relative to `https://github.com/vercel-labs/skills/blob/main/`

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/agents.ts` | 39 agent definitions | `agents`, `detectInstalledAgents()`, `getUniversalAgents()`, `getNonUniversalAgents()` |
| `src/cli.ts` | CLI entry point | `main()`, `runCheck()`, `runUpdate()`, `showHelp()` |
| `src/add.ts` | Core install logic | `runAdd()`, `handleRemoteSkill()`, `handleWellKnownSkills()`, `parseAddOptions()` |
| `src/installer.ts` | File operations | `installSkillForAgent()`, `installRemoteSkillForAgent()`, `sanitizeName()`, `createSymlink()`, `copyDirectory()`, `listInstalledSkills()` |
| `src/skills.ts` | SKILL.md discovery | `discoverSkills()`, `parseSkillMd()`, `filterSkills()` |
| `src/git.ts` | Git operations | `cloneRepo()`, `cleanupTempDir()` |
| `src/source-parser.ts` | Input parsing | `parseSource()`, `getOwnerRepo()`, `isRepoPrivate()` |
| `src/skill-lock.ts` | Lock file mgmt | `readSkillLock()`, `writeSkillLock()`, `addSkillToLock()`, `fetchSkillFolderHash()` |
| `src/constants.ts` | Constants | `AGENTS_DIR = '.agents'`, `SKILLS_SUBDIR = 'skills'` |
| `src/types.ts` | Type definitions | `AgentType`, `AgentConfig`, `Skill`, `ParsedSource`, `RemoteSkill` |
| `src/telemetry.ts` | Analytics | `track()` -- fire-and-forget to `add-skill.vercel.sh/t` |
| `src/providers/wellknown.ts` | RFC 8615 provider | `WellKnownProvider`, `fetchIndex()`, `fetchAllSkills()` |
| `src/plugin-manifest.ts` | Plugin discovery | `getPluginSkillPaths()` |

### Architecture Diagram

```
User Input: "npx skills add owner/repo"
    |
    v
[source-parser.ts] parseSource()
    |
    v
[git.ts] cloneRepo() -- shallow clone to /tmp/skills-XXXXX
    |
    v
[skills.ts] discoverSkills() -- find all SKILL.md files
    |
    v
[add.ts] runAdd() -- interactive prompts for skill/agent selection
    |
    v
[agents.ts] detectInstalledAgents() -- check 39 agents via existsSync()
    |
    v
[installer.ts] installSkillForAgent() -- for each (skill, agent):
    |
    ├── Copy to canonical: .agents/skills/<name>/
    |
    ├── Universal agents: done (they read canonical directly)
    |
    └── Non-universal agents: symlink <agent-dir>/skills/<name> -> canonical
    |
    v
[skill-lock.ts] addSkillToLock() -- track in ~/.agents/.skill-lock.json (global only)
    |
    v
[telemetry.ts] track() -- fire-and-forget analytics
    |
    v
[git.ts] cleanupTempDir() -- rm -rf /tmp/skills-XXXXX
```
