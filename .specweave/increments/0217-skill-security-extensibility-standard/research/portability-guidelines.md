# Portability Guidelines for AI Agent Skills

**Date**: 2026-02-15
**Satisfies**: AC-US6-03, AC-US6-04 (T-014)
**Depends On**: T-002 (Agent Compatibility Matrix)

---

## 1. Overview

Portability in the context of AI agent skills means the ability to author a single SKILL.md file that works correctly across all 39 agents in the Agent Skills ecosystem without modification. This is the "write once, run on 39 agents" principle.

The Agent Skills specification (agentskills.io) was designed for this purpose: a standardized YAML frontmatter plus markdown body format that any compliant agent can parse. In practice, however, varying levels of feature support, agent-specific directory conventions, and platform-exclusive extensions create a landscape where true universality requires deliberate effort from skill authors.

Portability matters for three reasons:

1. **Reach**: A skill that works on 1 agent reaches one user base. A skill that works on 39 reaches every developer using any Agent Skills-compatible coding assistant. The difference between a single-agent skill and a universal one is the difference between a niche tool and an ecosystem standard.

2. **Maintenance cost**: Maintaining agent-specific forks of the same skill multiplies the effort required for every update, security patch, and feature addition. A portable skill has one codebase, one set of tests, and one release pipeline.

3. **Trust and verification**: Portability is one of six dimensions in the SpecWeave quality scoring rubric. Skills that demonstrate broad compatibility signal maturity, professional authorship, and investment in the ecosystem -- all of which contribute to user trust.

This document provides concrete guidance for skill authors targeting maximum portability. It is grounded in the empirical analysis of all 39 agents from the `skills@1.3.9` package (see the companion Agent Compatibility Matrix research document).

---

## 2. What Works Universally

The following features are safe to use across all 39 agents in the Agent Skills ecosystem. These constitute the "portable core" of the SKILL.md format.

### 2.1 YAML Frontmatter (Required Fields)

Every SKILL.md file must include a YAML frontmatter block with at minimum:

```yaml
---
name: my-skill-name
description: >-
  A clear description of what this skill does and when it should activate.
---
```

**Constraints on `name`**:
- 1-64 characters
- Lowercase alphanumeric characters and hyphens only
- Must match the parent directory name (e.g., `my-skill/SKILL.md` requires `name: my-skill`)

**Constraints on `description`**:
- 1-1024 characters
- Should describe both WHAT the skill does and WHEN the agent should activate it
- This is the primary signal agents use for skill discovery and invocation

Both fields are required by the Agent Skills specification and are parsed by all 39 agents.

### 2.2 Optional Frontmatter Fields

The following frontmatter fields are part of the specification and recognized by all agents, though their behavioral impact varies:

| Field | Type | Purpose |
|-------|------|---------|
| `license` | string | License name or SPDX identifier |
| `compatibility` | string (1-500 chars) | Environment requirements (e.g., "Node.js 18+, macOS/Linux") |
| `metadata` | key-value map | Arbitrary metadata for tooling and registries |

These fields are parsed without error by all agents. Agents that do not act on them simply ignore them, making them safe to include for metadata purposes.

### 2.3 Markdown Body

The markdown body following the frontmatter is the skill's instruction set. All 39 agents parse standard markdown formatting:

- **Headers** (`#`, `##`, `###`): Use for logical section organization
- **Bullet lists** (`-`, `*`): For enumerating rules, steps, or options
- **Numbered lists** (`1.`, `2.`): For sequential procedures
- **Code blocks** (triple backtick with language identifier): For code examples, command references, and templates
- **Tables** (pipe-delimited): For structured data like configuration matrices
- **Bold** (`**text**`) and *italic* (`*text*`): For emphasis
- **Inline code** (single backtick): For filenames, commands, and variable names

There are no known markdown features that cause parsing failures across any of the 39 agents. The markdown body is treated as plain-text instructions by all agents -- it is the skill's "prompt" content.

### 2.4 Optional Subdirectories

The Agent Skills specification defines three optional subdirectories within a skill folder:

| Directory | Purpose | Universal Support |
|-----------|---------|-------------------|
| `scripts/` | Automation scripts (shell, Python, etc.) | Yes -- all 39 agents |
| `references/` | Reference documents, examples, templates | Yes -- all 39 agents |
| `assets/` | Images, diagrams, supplementary files | Yes -- all 39 agents |

These directories are not required for basic skill functionality. Agents that do not explicitly use subdirectory contents will not break if they are present.

### 2.5 Summary of the Portable Core

A skill that uses only the following is guaranteed to work across all 39 agents:

```
my-skill/
  SKILL.md          # name + description frontmatter, markdown body
  scripts/          # Optional automation scripts
  references/       # Optional reference docs
  assets/           # Optional supplementary files
```

This is the baseline every portable skill should target.

---

## 3. What Varies Across Agents

Not all SKILL.md features enjoy universal support. The following matrix documents features with incomplete coverage, along with specific agents that deviate.

### 3.1 Feature Compatibility Matrix

| Feature | Agents Supported | Not Supported | Impact | Recommendation |
|---------|-----------------|---------------|--------|----------------|
| Basic SKILL.md (name, description, markdown) | 39/39 | None | Core functionality | Always use -- this is the portable baseline |
| `allowed-tools` (pre-approved tool list) | 37/39 | Kiro CLI, Zencoder | Tool access control | Use with graceful degradation (see 3.2) |
| `context: fork` (isolated execution context) | 1/39 | All except Claude Code | Context isolation | Avoid in portable skills (see 3.3) |
| Hooks (pre/post execution) | 2/39 | All except Claude Code, Cline | Lifecycle events | Avoid in portable skills (see 3.4) |

### 3.2 `allowed-tools` (37/39 Support)

The `allowed-tools` frontmatter field specifies a space-delimited list of tools pre-approved for the skill:

```yaml
allowed-tools: Bash(git:*) Bash(jq:*) Read Edit
```

**Supported by**: All agents except Kiro CLI and Zencoder (37 of 39).

**Behavior on unsupported agents**: Kiro CLI and Zencoder ignore the `allowed-tools` field entirely. The skill still functions, but the agent does not pre-approve the listed tools. This means:
- The user may receive additional permission prompts when the skill attempts to use tools
- No security restrictions are applied based on the tool list
- The skill's instructions remain functional

**Graceful degradation strategy**: Since `allowed-tools` is an optimization (reducing permission prompts) rather than a functional requirement, its absence on 2 agents is a minor UX inconvenience, not a functional failure. Skill authors can safely use `allowed-tools` if they:
1. Do not make the skill's core logic depend on tools being pre-approved
2. Write instructions that work even if each tool use requires individual approval
3. Note in the `compatibility` field that `allowed-tools` is used for convenience

**Verdict**: Safe to use for portable skills, provided the skill does not break when tools are not pre-approved.

### 3.3 `context: fork` (1/39 Support)

The `context: fork` frontmatter field instructs the agent to create an isolated execution context for the skill:

```yaml
context: fork
```

**Supported by**: Claude Code only.

**Behavior on unsupported agents**: All 38 non-Claude-Code agents ignore this field. The skill runs in the agent's shared context, which means:
- Skill instructions may inadvertently affect or be affected by other active skills
- Context isolation guarantees do not apply
- Memory and state are shared with the main agent session

**Graceful degradation strategy**: There is no graceful degradation for `context: fork`. Either the agent supports context isolation or it does not. A skill that requires isolation for correctness (e.g., skills that modify global agent behavior or use conflicting instructions) cannot safely fall back to shared-context execution.

**Verdict**: Avoid in portable skills. If isolation is required, document it as a Claude Code-specific requirement and set the portability expectation accordingly.

### 3.4 Hooks (2/39 Support)

Hooks allow skills to run code before or after skill activation:

**Supported by**: Claude Code and Cline only.

**Behavior on unsupported agents**: All 37 non-supporting agents ignore hook definitions. This means:
- Pre-execution setup steps (environment checks, dependency installation) do not run
- Post-execution cleanup (log flushing, state reset) does not run
- Any behavior that depends on hooks being executed will silently fail

**Graceful degradation strategy**: Move essential pre/post logic into the skill's markdown instructions. Instead of a hook that runs `npm install` before activation, include an instruction block:

```markdown
## Prerequisites
Before using this skill, ensure the following are installed:
1. Run `npm install` in the project root
2. Verify Node.js 18+ is available
```

This converts a hook-dependent setup into a portable instruction that any agent can follow.

**Verdict**: Avoid in portable skills. Convert hook logic to explicit instructions in the markdown body.

### 3.5 Agent-Specific Directory Deviations

While not a SKILL.md format issue, skill authors should be aware that agents use different directory structures for skill storage. The `skills` CLI handles this transparently via symlinks, but skills that reference their own file paths must account for these variations:

| Agent | Local Skills Dir | Deviation |
|-------|-----------------|-----------|
| Universal agents (Amp, Codex, Gemini CLI, GitHub Copilot, Kimi Code CLI, OpenCode) | `.agents/skills` | Standard universal path |
| Replit | `.agents/skills` | Uses universal path but hidden from universal list |
| Antigravity | `.agent/skills` | Singular `.agent` (not `.agents`) |
| OpenClaw | `skills` | Bare directory -- no dot prefix |
| Droid (Factory AI) | `.factory/skills` | Uses `.factory` instead of `.droid` |
| Claude Code | `.claude/skills` | Standard agent-specific path |
| Windsurf | `.windsurf/skills` | Global path under `~/.codeium/windsurf/` |
| Kiro CLI | `.kiro/skills` | Requires manual registration in `.kiro/agents/<agent>.json` |
| Pi | `.pi/skills` | Global path has extra nesting: `~/.pi/agent/skills` |
| Trae / Trae CN | `.trae/skills` | Both variants share the same local path |
| Most other agents | `.<agent-name>/skills` | Standard pattern |

**Key implication**: Never hardcode skill directory paths in SKILL.md instructions. Use relative references or instruct the agent to discover paths dynamically.

---

## 4. Platform-Specific Extensions

Some agents offer capabilities beyond the base Agent Skills specification. Skill authors who want to leverage these features while maintaining portability should follow these patterns.

### 4.1 Conditional Feature Usage via Metadata Tags

Use the `metadata` frontmatter field to declare platform-specific capabilities:

```yaml
---
name: my-portable-skill
description: A skill that works everywhere with optional enhanced features on Claude Code.
metadata:
  claude-code-features: "context-fork,hooks"
  portability-tier: "universal-with-extensions"
---
```

Agents that do not parse `metadata` values ignore them. Agents or tooling that understand these keys can use them to enable enhanced behavior. This is a documentation pattern, not an enforcement mechanism -- but it signals intent to both users and registries.

### 4.2 Graceful Degradation Strategy Pattern

Structure skills with a universal core and optional platform-specific sections:

```markdown
# My Skill

## Core Instructions (All Agents)
[Instructions that work on all 39 agents]

## Enhanced Mode (Claude Code)
If you are running as Claude Code with context fork support:
- [Claude Code-specific optimizations]
- [Hook-dependent automation]

Otherwise, follow the Core Instructions above.
```

This pattern works because:
- All agents read the entire markdown body as instructions
- Conditional language ("if you are running as...") is interpreted contextually by LLM-powered agents
- Agents without the referenced features naturally follow the core instructions
- The skill degrades gracefully rather than failing

### 4.3 Feature Detection Patterns

The `skills@1.3.9` CLI uses `existsSync()` checks to detect installed agents. Skill scripts (in the `scripts/` directory) can use similar patterns:

```bash
#!/bin/bash
# Detect which agent environment we are running in
if [ -d "$HOME/.claude" ]; then
  echo "Claude Code detected -- enabling enhanced features"
  # Claude Code-specific setup
elif [ -d "$HOME/.cursor" ]; then
  echo "Cursor detected -- standard mode"
else
  echo "Unknown agent -- running in universal mode"
fi
```

However, this approach should be used sparingly. Most portable skills should not need runtime agent detection -- they should work identically across all agents.

### 4.4 The Kiro CLI Exception

Kiro CLI is the only agent among the 39 that requires a manual registration step after skill installation. After a skill is copied to `.kiro/skills/`, the user must add it to `.kiro/agents/<agent>.json`:

```json
{
  "resources": ["skill://.kiro/skills/**/SKILL.md"]
}
```

Portable skills targeting Kiro CLI users should include a note in their installation instructions:

```markdown
## Installation Notes

### Kiro CLI Users
After installation, register this skill in your `.kiro/agents/<agent>.json`:
\`\`\`json
{ "resources": ["skill://.kiro/skills/my-skill/SKILL.md"] }
\`\`\`
```

This is a documentation concern, not a format concern -- the SKILL.md itself does not need modification.

---

## 5. Portability Testing Checklist

A practical checklist for skill authors to verify portability before publishing. A skill that passes all items qualifies for the highest portability scores in the quality rubric.

### Format Compliance

- [ ] **SKILL.md has `name` in frontmatter**: 1-64 chars, lowercase alphanumeric + hyphens, matches parent directory name
- [ ] **SKILL.md has `description` in frontmatter**: 1-1024 chars, describes WHAT the skill does and WHEN it activates
- [ ] **No `context: fork` in frontmatter**: This field is Claude Code-exclusive and breaks portability expectations
- [ ] **No hook definitions or dependencies**: Hooks work on only 2 of 39 agents; convert to explicit instructions

### Tool and API Independence

- [ ] **`allowed-tools` used only as an optimization**: Skill logic works even if tools are not pre-approved; instructions do not assume tool pre-approval
- [ ] **No agent-specific API calls**: Instructions do not reference Claude Code API endpoints, Cursor-specific commands, or other agent-proprietary interfaces
- [ ] **No agent-specific file path assumptions**: Instructions never hardcode paths like `~/.claude/`, `~/.cursor/`, `~/.codeium/windsurf/`, or `~/.factory/`; use relative paths or instruct dynamic discovery
- [ ] **No agent-specific environment variables assumed**: Do not assume `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, or other agent-specific env vars exist

### Content Quality

- [ ] **Instructions use generic commands**: Shell commands, git operations, and file manipulations use standard POSIX-compatible tooling, not agent-specific wrappers
- [ ] **No package manager assumptions beyond detection**: If the skill needs npm, pip, or cargo, instruct the agent to check availability first rather than assuming installation
- [ ] **Error handling instructions are agent-agnostic**: Recovery steps do not reference agent-specific error messages, log locations, or debug commands
- [ ] **Conditional sections clearly labeled**: If the skill includes agent-specific optimizations, they are in clearly marked sections with fallback instructions

### Distribution and Structure

- [ ] **Parent directory name matches `name` field**: The folder containing SKILL.md is named identically to the `name` frontmatter value
- [ ] **No files outside standard structure**: All supplementary files are in `scripts/`, `references/`, or `assets/` subdirectories
- [ ] **No `README.md` or `metadata.json` collisions**: These filenames are excluded by the `skills` CLI installer and should not contain critical skill content
- [ ] **Symlink-safe**: Skill directory structure works when accessed via symlink (the standard installation mechanism for non-universal agents)

### Verification

- [ ] **Tested on at least 3 agents**: Claude Code (most feature-rich) + Codex (universal directory) + one non-universal agent (e.g., Cursor, Cline, or Gemini CLI)
- [ ] **Tested with `npx skills add`**: Skill installs correctly via the standard CLI installer
- [ ] **Tested both local and global installation**: Skill works from project-level (`.agents/skills/`) and user-level (`~/.<agent>/skills/`) locations
- [ ] **No installation-time errors on any tested agent**: Clean install with no path resolution failures, permission errors, or missing dependency warnings

### Documentation

- [ ] **Compatibility field populated**: Frontmatter `compatibility` field lists minimum requirements (OS, runtime versions, etc.)
- [ ] **Kiro CLI registration noted**: If the skill has any Kiro CLI users, installation instructions include the manual registration step
- [ ] **Known limitations documented**: Any agent-specific behaviors or limitations are noted in the skill's instructions or a README

---

## 6. Integration with `agentSkillsCompat` Field

The SpecWeave Fabric Registry currently defines an `agentSkillsCompat: boolean` field on `FabricRegistryEntry` objects. This field indicates whether a plugin or skill follows the Agent Skills format. While useful as a binary signal, it lacks the granularity needed for meaningful portability assessment.

### 6.1 Proposed Schema Extension

Replace the boolean with a structured object:

```typescript
interface AgentSkillsCompatibility {
  /** Whether the skill follows the Agent Skills SKILL.md format */
  universal: boolean;

  /** List of agent IDs where the skill has been tested and confirmed working */
  testedAgents: string[];

  /** Known issues per agent, keyed by agent ID */
  knownIssues: Record<string, string>;

  /** Computed portability score (0-5) based on the quality rubric */
  portabilityScore: number;

  /** Features used that limit portability */
  limitingFeatures?: string[];
}
```

Example populated entry:

```typescript
{
  agentSkillsCompat: {
    universal: true,
    testedAgents: [
      "claude-code", "codex", "gemini-cli", "cursor",
      "github-copilot", "cline", "windsurf"
    ],
    knownIssues: {
      "kiro-cli": "Requires manual registration in .kiro/agents/<agent>.json after install",
      "zencoder": "allowed-tools field ignored; additional permission prompts may appear"
    },
    portabilityScore: 4,
    limitingFeatures: ["allowed-tools"]
  }
}
```

### 6.2 Backward Compatibility

The new `agentSkillsCompat` type uses a union to maintain backward compatibility:

```typescript
interface FabricRegistryEntry {
  // ... existing fields ...

  /** Agent Skills format compatibility -- boolean (legacy) or structured (v2) */
  agentSkillsCompat?: boolean | AgentSkillsCompatibility;
}
```

Registry consumers should check `typeof entry.agentSkillsCompat === 'boolean'` to handle legacy entries. Migration from boolean to structured can be performed incrementally -- the boolean `true` maps to `{ universal: true, testedAgents: [], knownIssues: {}, portabilityScore: 1 }`.

### 6.3 Automatic Population During Skill Registration

When a skill is registered in the Fabric Registry (or submitted to verified-skill.com), the `agentSkillsCompat` object can be partially auto-populated:

1. **`universal`**: Set to `true` if the SKILL.md has valid `name` and `description` frontmatter and no proprietary format elements.

2. **`limitingFeatures`**: Detected by scanning the frontmatter for `context: fork`, `allowed-tools`, and hook definitions.

3. **`portabilityScore`**: Computed based on the rubric formula:
   - Start with 5 (maximum)
   - Subtract 2 if `context: fork` is present (exclusive to 1 agent)
   - Subtract 1 if hooks are defined (supported by only 2 agents)
   - Subtract 0.5 if `allowed-tools` is used without graceful degradation documentation
   - Subtract 1 if agent-specific paths are hardcoded in instructions
   - Subtract 1 if the skill references agent-specific APIs
   - Floor at 0

4. **`testedAgents`**: Initially empty. Populated by:
   - Author self-reporting during submission
   - Automated CI-based installation testing (future)
   - Community reports via verified-skill.com

5. **`knownIssues`**: Partially auto-detected from `limitingFeatures`:
   - If `allowed-tools` is present, auto-add entries for `kiro-cli` and `zencoder`
   - If `context: fork` is present, auto-add entries for all 38 non-Claude-Code agents

### 6.4 Portability Score to `agentSkillsCompat` Mapping

| Portability Score | `universal` | `testedAgents` min | `knownIssues` | `limitingFeatures` |
|:-----------------:|:-----------:|:------------------:|:-------------:|:------------------:|
| 0 | `false` | 0 | N/A | Proprietary format |
| 1 | `true` | 0 | Unknown | Agent-specific deps |
| 2 | `true` | 2-3 | May exist | Some limiting features |
| 3 | `true` | 4-6 | Documented | Minor limiting features |
| 4 | `true` | 7-10 | Documented | `allowed-tools` only |
| 5 | `true` | 10+ | Documented | None |

---

## 7. Common Portability Pitfalls

Real-world examples of portability failures, drawn from the Agent Compatibility Matrix research and ecosystem analysis.

### 7.1 Using Claude Code-Exclusive `context: fork`

**Problem**: A skill author developing exclusively in Claude Code adds `context: fork` to isolate the skill's execution from the main session. When the skill is installed on Codex, Gemini CLI, or any other agent, the `context: fork` directive is silently ignored. The skill runs in shared context, which may cause instruction conflicts with other active skills.

**Example**:
```yaml
---
name: aggressive-refactorer
description: Refactors entire codebases with opinionated formatting rules.
context: fork
---
```

On Claude Code, this skill safely operates in isolation. On Cursor, its aggressive formatting rules contaminate the main agent session, overriding user preferences and conflicting with other style-related skills.

**Fix**: Remove `context: fork`. Design the skill's instructions to be safe in shared-context execution. Scope instructions narrowly ("apply these rules only to files the user explicitly asks you to refactor") rather than globally.

### 7.2 Hardcoding Agent-Specific Paths

**Problem**: A skill references `~/.claude/skills/my-skill/references/config.json` in its instructions. This path exists only on systems with Claude Code installed. On Codex (which uses `~/.codex/skills/`), Windsurf (which uses `~/.codeium/windsurf/skills/`), or any universal agent (which uses `.agents/skills/`), the path does not resolve.

**Example**:
```markdown
## Setup
Load the configuration from `~/.claude/skills/my-skill/references/config.json`.
```

**Fix**: Use relative paths or instruct the agent to locate the file dynamically:
```markdown
## Setup
Load the configuration from the `references/config.json` file in this skill's directory.
```

### 7.3 Assuming `allowed-tools` Is Enforced

**Problem**: A skill's instructions assume that tools listed in `allowed-tools` are pre-approved and available without user confirmation. On Kiro CLI and Zencoder, every tool invocation requires separate approval, which breaks automated workflows described in the skill.

**Example**:
```yaml
allowed-tools: Bash(npm:*) Bash(git:*) Read Edit Write
---
## Workflow
1. Read the package.json
2. Run `npm install` (pre-approved, no confirmation needed)
3. Edit tsconfig.json
4. Run `npm run build`
```

Step 2's parenthetical note is incorrect on Kiro CLI and Zencoder. More critically, if the skill's instructions imply that the lack of a confirmation prompt is expected behavior, users on those agents may think the skill is broken.

**Fix**: Write instructions that work with or without pre-approval:
```markdown
## Workflow
1. Read the package.json
2. Run `npm install`
3. Edit tsconfig.json
4. Run `npm run build`
```

Remove assumptions about whether confirmation prompts appear.

### 7.4 Depending on Hook-Based Setup

**Problem**: A skill uses a pre-execution hook to install Python dependencies before the skill runs. On 37 of 39 agents, the hook does not execute, and the skill fails because dependencies are missing.

**Example** (skill with `.claude/hooks/pre-skill-activate.sh`):
```bash
#!/bin/bash
pip install pandas numpy
```

On Claude Code and Cline, this hook runs automatically. On all other agents, it never executes, and the skill's instructions that reference `pandas` fail.

**Fix**: Move the dependency installation into the skill's instructions:
```markdown
## Prerequisites
This skill requires Python packages. If not already installed, run:
\`\`\`bash
pip install pandas numpy
\`\`\`
```

### 7.5 Assuming a Specific Package Manager

**Problem**: A skill instructs the agent to run `brew install jq` (macOS-specific) or `apt-get install jq` (Debian/Ubuntu-specific). On Windows, or on Linux distributions not using apt, this fails.

**Fix**: Use conditional instructions:
```markdown
## Dependencies
This skill requires `jq`. Install it using your system's package manager:
- macOS: `brew install jq`
- Debian/Ubuntu: `sudo apt-get install jq`
- Fedora: `sudo dnf install jq`
- Windows: `choco install jq` or `winget install jq`

Or check if it is already available: `jq --version`
```

### 7.6 Using Agent-Specific Command Syntax

**Problem**: A skill's instructions use Claude Code-specific slash commands like `/clear` or `/compact` that do not exist on other agents.

**Example**:
```markdown
After completing the refactor, run `/compact` to reduce context usage.
```

On Cursor, Codex, or Gemini CLI, `/compact` is not recognized.

**Fix**: Use generic descriptions of the desired outcome:
```markdown
After completing the refactor, reduce context usage if your agent supports context management.
```

### 7.7 Ignoring the Kiro CLI Registration Requirement

**Problem**: A skill is installed via `npx skills add owner/repo` on a system with Kiro CLI. The skill files are copied to `.kiro/skills/` but Kiro CLI does not recognize the skill because it was not registered in `.kiro/agents/<agent>.json`. The user assumes the skill is broken.

**Fix**: Include Kiro CLI registration instructions in the skill's documentation (see Section 4.4).

### 7.8 Relying on the `.agents/` Canonical Directory

**Problem**: A skill's instructions tell the user to "check your `.agents/skills/` directory" to find reference files. On non-universal agents like Claude Code (`.claude/skills/`), Cursor (`.cursor/skills/`), or OpenClaw (bare `skills/`), the canonical directory is not where the agent reads skills from -- it is where the symlink origin lives. The actual skill content may be accessed via the agent-specific symlinked path.

**Fix**: Do not reference specific skill directory paths in instructions. Let the agent resolve paths:
```markdown
The reference template is in this skill's `references/` directory.
```

---

## 8. Portability Scoring

The portability dimension of the SpecWeave quality rubric uses a 0-5 scale. This section defines precise criteria for each score level and how they map to the agent ecosystem.

### 8.0 Score 0: Single-Agent, Proprietary Format

The skill does not use the SKILL.md format or uses a proprietary format incompatible with the Agent Skills specification.

**Characteristics**:
- Custom file format (not SKILL.md with YAML frontmatter)
- Agent-specific configuration files instead of standard skill format
- Binary or compiled skill content
- Locked to a single vendor's ecosystem with no interoperability

**Agent coverage**: 0-1 agents.

### 8.1 Score 1: SKILL.md with Agent-Specific Dependencies

The skill uses the SKILL.md format but relies on agent-specific features or APIs not available elsewhere.

**Characteristics**:
- Valid SKILL.md with `name` and `description` frontmatter
- Uses `context: fork` (Claude Code-exclusive)
- Depends on hooks (Claude Code + Cline only)
- Hardcodes agent-specific paths (e.g., `~/.claude/`, `~/.cursor/`)
- References agent-specific APIs or commands
- No testing on any other agent

**Agent coverage**: 1-2 agents.

### 8.2 Score 2: Works with 2-3 Agents

The skill is SKILL.md compliant and tested on a small number of agents, but still contains some agent-specific assumptions.

**Characteristics**:
- Valid SKILL.md format
- No `context: fork`
- May use `allowed-tools` without graceful degradation notes
- Some agent-specific instructions remain (e.g., "in Claude Code, do X")
- Tested on 2-3 agents from different categories (e.g., Claude Code + Cursor)

**Agent coverage**: 2-3 agents verified working.

### 8.3 Score 3: Works with 4-6 Agents, Standard Format

The skill follows the standard SKILL.md format with no agent-specific dependencies. Tested on multiple major platforms.

**Characteristics**:
- Clean SKILL.md with no proprietary features
- No `context: fork`, no hooks
- `allowed-tools` used appropriately with graceful degradation
- Instructions use generic commands and relative paths
- Tested on 4-6 agents including at least one universal and one non-universal

**Agent coverage**: 4-6 agents verified working.

**Minimum testing requirement**: Claude Code + Codex (universal) + Cursor or Cline (non-universal) + one other.

### 8.4 Score 4: Works with 7-10 Agents, Documented Compatibility

The skill has broad agent compatibility with explicit documentation of tested environments and known issues.

**Characteristics**:
- All Score 3 criteria met
- `compatibility` frontmatter field populated with environment requirements
- Tested on 7-10 agents spanning universal and non-universal categories
- Known issues documented per agent (e.g., Kiro CLI registration requirement)
- `metadata` field includes portability information
- Cross-platform OS testing (macOS + Linux minimum)

**Agent coverage**: 7-10 agents verified working.

**Recommended testing set**: Claude Code, Codex, Gemini CLI, GitHub Copilot (all universal) + Cursor, Cline, Windsurf (non-universal, different vendors).

### 8.5 Score 5: Universal (10+ Agents), Tested and Verified

The skill works across the broadest possible range of agents with verified compatibility and community confirmation.

**Characteristics**:
- All Score 4 criteria met
- Tested on 10+ agents including agents with known deviations (Antigravity, OpenClaw, Droid, Kiro CLI)
- `agentSkillsCompat` structured field populated with full `testedAgents` list
- Known issues documented and mitigated for every tested agent
- Graceful degradation verified for `allowed-tools` on Kiro CLI and Zencoder
- Kiro CLI manual registration documented
- Community-verified (at least one report from a user other than the author confirming cross-agent function)
- Symlink installation verified (non-universal agent installation via `skills` CLI)
- Both local and global installation paths tested

**Agent coverage**: 10+ agents verified working, documented.

---

## 9. Recommendations for Skill Authors

### 9.1 Start with the Portable Core

Every skill should begin with the minimum viable portable structure:

```yaml
---
name: my-skill
description: >-
  Describe what this skill does and when the agent should activate it.
---

# My Skill

## Instructions
[Your instructions here -- using standard markdown, generic commands, and relative paths]
```

Add complexity only when the use case demands it. Most skills do not need `allowed-tools`, hooks, or context forking.

### 9.2 Test on Three Agent Categories

The minimum viable portability test covers three categories:

1. **Claude Code**: The most feature-rich agent. If it works here, the instructions are well-formed.
2. **A universal agent (Codex or Gemini CLI)**: Tests that the skill works in the `.agents/skills/` canonical directory.
3. **A non-universal agent (Cursor, Cline, or Windsurf)**: Tests that the skill works via symlink from a different directory structure.

This three-agent test catches the majority of portability issues.

### 9.3 Avoid the "Works on My Machine" Trap

The most common portability failure is testing only on the agent the author personally uses. Authors who use Claude Code exclusively tend to accidentally depend on `context: fork`, hooks, or `~/.claude/` paths. Authors who use only Cursor may write instructions that reference Cursor-specific UI elements.

Discipline: Before publishing, read through every instruction in the SKILL.md and ask: "Would this make sense to an agent that has never heard of [my preferred agent]?"

### 9.4 Prefer Instructions Over Automation

Hooks and scripts are powerful on agents that support them, but instructions in the markdown body are universal. A skill that says "run `npm install` in the project root" works on all 39 agents. A skill that uses a hook to run `npm install` silently works on 2.

When in doubt, write it as an instruction. Let the agent execute it on demand rather than relying on automated lifecycle events.

### 9.5 Document Everything That Varies

If a skill uses `allowed-tools`, note it in the compatibility section. If the skill works better on Claude Code than on Codex, say so. If Kiro CLI users need a manual step, include it. Transparency about limitations is itself a quality signal -- it shows the author has tested broadly and understands the ecosystem.

### 9.6 Use `metadata` for Machine-Readable Portability Data

The `metadata` frontmatter field is the right place for structured portability information that tooling can consume:

```yaml
metadata:
  tested-agents: "claude-code,codex,gemini-cli,cursor,cline,windsurf,github-copilot"
  portability-tier: "score-4"
  limiting-features: "allowed-tools"
  known-issues-kiro-cli: "requires manual registration"
  known-issues-zencoder: "allowed-tools ignored"
```

This enables registries like the SpecWeave Fabric Registry and verified-skill.com to automatically extract portability data during skill submission.

### 9.7 Keep Up with the Ecosystem

The Agent Skills specification is evolving. New agents are added regularly (the count grew from the initial handful to 39 within months of the standard's release). Features like `allowed-tools` started as experimental and achieved near-universal adoption. Hooks may follow a similar trajectory.

Subscribe to the agentskills.io specification updates and the `skills` npm package changelog. Periodically re-test published skills as new agent versions are released.

### 9.8 Contribute Compatibility Reports

If you test a skill on an agent that is not in the author's `testedAgents` list, report the result. The ecosystem benefits from community-sourced compatibility data. Platforms like verified-skill.com can aggregate these reports to build verified compatibility matrices that no single author could produce alone.

---

## References

### Primary Sources
- [Agent Skills Specification](https://agentskills.io/specification) -- The open format specification defining SKILL.md structure
- [`skills@1.3.9` npm package](https://www.npmjs.com/package/skills) -- Vercel-published CLI and agent registry (source: `vercel-labs/skills`)
- [Agent Compatibility Matrix](./agent-compatibility-matrix.md) -- Companion research document with full 39-agent analysis

### Agent Documentation
- [Claude Code Skills](https://docs.anthropic.com/en/docs/claude-code/skills) -- Anthropic documentation on Claude Code skill support
- [Gemini CLI Skills](https://geminicli.com/docs/cli/skills/) -- Google documentation on Gemini CLI skill support
- [OpenAI Codex Skills](https://developers.openai.com/codex/skills) -- OpenAI documentation on Codex skill support
- [GitHub Copilot Agent Skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) -- GitHub documentation on Copilot skill support

### Security Context
- [Snyk ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) -- Security audit revealing 36.82% skill flaw rate
- [Skill Discovery Sources and Quality Scoring Rubric](./skill-discovery-sources.md) -- Companion research document with quality scoring definitions
