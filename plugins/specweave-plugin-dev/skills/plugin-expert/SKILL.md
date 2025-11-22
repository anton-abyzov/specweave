---
name: plugin-expert
description: Expert on CREATING custom Claude Code plugins. Covers SKILL.md authoring, YAML frontmatter syntax, AGENT.md structure, hook registration in plugin.json, allowed-tools configuration, and marketplace.json format. Use when DEVELOPING custom plugins, writing skills, creating agents, or building plugin systems. Activates for skill authoring, agent creation, hook development, plugin.json configuration, SKILL.md format, AGENT.md structure, custom plugin development, YAML frontmatter syntax, allowed-tools field, hook registration, marketplace.json structure.
---

# Plugin Expert - Complete Claude Code Plugin Authority

**Purpose**: The definitive, comprehensive source of truth for ALL aspects of Claude Code's plugin ecosystem.

**Scope**: Plugin structure, manifest format, commands, agents, skills, hooks, MCP servers, marketplaces, installation, development, troubleshooting, and team workflows.

**When to Use**: ALWAYS consult this skill for ANY plugin-related task, question, or development work.

---

## 📋 Table of Contents

1. [Quick Reference](#quick-reference)
2. [Plugin System Architecture](#plugin-system-architecture)
3. [Plugin Manifest (plugin.json)](#plugin-manifest-pluginjson)
4. [Plugin Components](#plugin-components)
5. [Skills System](#skills-system)
6. [Agents System](#agents-system)
7. [Hooks System](#hooks-system)
8. [MCP Servers](#mcp-servers)
9. [Marketplace Management](#marketplace-management)
10. [marketplace.json Format](#marketplacejson-format)
11. [Team Workflows](#team-workflows)
12. [Development Best Practices](#development-best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Quick Reference

### Essential Commands

```bash
# Install plugin
/plugin install <plugin-name>

# List installed plugins
/plugin list --installed

# Add marketplace (GitHub)
/plugin marketplace add owner/repo

# Add marketplace (local)
/plugin marketplace add ./path/to/marketplace

# List marketplaces
/plugin marketplace list

# Uninstall plugin
/plugin uninstall <plugin-name>

# Update plugin
/plugin update <plugin-name>
```

### Critical Rules

✅ **CORRECT**: `/plugin install specweave-github`
❌ **WRONG**: `/plugin install specweave-github@specweave` (no @marketplace syntax!)

✅ **CORRECT**: Marketplace auto-resolution from registered marketplaces
❌ **WRONG**: Manual marketplace specification in install commands

---

## Plugin System Architecture

### Directory Structure

**Standard plugin layout:**
```
plugin-name/
├── .claude-plugin/
│   └── plugin.json              # REQUIRED: Plugin manifest
├── commands/                     # OPTIONAL: Slash commands
│   └── my-command.md
├── agents/                       # OPTIONAL: Custom agents
│   └── my-agent/
│       └── AGENT.md
├── skills/                       # OPTIONAL: Agent skills
│   └── my-skill/
│       └── SKILL.md
├── hooks/                        # OPTIONAL: Event handlers
│   └── hooks.json
└── .mcp.json                    # OPTIONAL: MCP server config
```

**Critical**: Components (commands/, agents/, skills/, hooks/) MUST be at plugin root, NOT inside `.claude-plugin/`

### Core Concepts

**Plugins** extend Claude Code with custom functionality across projects and teams.

**Components** (5 types):
1. **Commands** - User-invoked slash commands
2. **Agents** - Autonomous specialized agents
3. **Skills** - Model-invoked knowledge modules
4. **Hooks** - Event-driven automation
5. **MCP Servers** - External tool integration

**Marketplaces** - Catalogs of discoverable plugins with centralized version management

---

## Plugin Manifest (plugin.json)

### Location
`.claude-plugin/plugin.json` (required for all plugins)

### Format

**Minimal manifest:**
```json
{
  "name": "plugin-identifier",
  "description": "Clear description of functionality",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

**Complete manifest:**
```json
{
  "name": "my-plugin",
  "description": "Detailed plugin description",
  "version": "1.2.3",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://example.com"
  },
  "homepage": "https://github.com/user/plugin",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/plugin.git"
  },
  "license": "MIT",
  "keywords": ["automation", "testing"],
  "category": "development-tools",
  "tags": ["ci-cd", "quality"]
}
```

### Required Fields

- `name` - Kebab-case identifier (e.g., "my-awesome-plugin")
- `description` - Clear, concise functionality description
- `version` - Semantic versioning (e.g., "1.2.3")
- `author.name` - Creator/maintainer name

### Optional Fields

- `author.email`, `author.url` - Contact information
- `homepage` - Project website/documentation
- `repository` - Source code location
- `license` - Open source license (MIT, Apache-2.0, etc.)
- `keywords` - Search/discovery terms
- `category` - Primary classification
- `tags` - Additional metadata tags

---

## Plugin Components

### 1. Commands (Slash Commands)

**Location**: `commands/` directory

**Format**: Markdown files with YAML frontmatter

**Example** (`commands/hello.md`):
```yaml
---
name: hello
description: Greet the user warmly
---

# Hello Command

Greet the user with a friendly message.

When invoked, say: "Hello! How can I help you today?"
```

**Usage**: `/hello` (command name from frontmatter)

**Best Practices**:
- Keep commands focused on single actions
- Provide clear descriptions
- Include usage examples in the markdown body

### 2. Agents

**Location**: `agents/agent-name/` subdirectories

**Format**: `AGENT.md` files with instructions

**Example** (`agents/code-reviewer/AGENT.md`):
```markdown
# Code Reviewer Agent

You are an expert code reviewer focused on:
- Code quality and best practices
- Security vulnerabilities
- Performance optimization
- Documentation completeness

## Review Process

1. Read the code files
2. Analyze for issues
3. Provide structured feedback
4. Suggest improvements
```

**Invocation**: Via `Task` tool with `subagent_type`

**Naming convention**: `{plugin}:{directory}:{yaml-name}`

### 3. Skills (covered in detail below)

### 4. Hooks (covered in detail below)

### 5. MCP Servers (covered in detail below)

---

## Skills System

### What Are Skills?

**Skills** are model-invoked knowledge modules that Claude automatically activates based on task context. Unlike commands (user-invoked) or agents (explicitly called), skills are **autonomous**.

### Directory Structure

```
skills/
└── my-skill/               # Skill directory
    ├── SKILL.md           # REQUIRED: Main skill file
    ├── templates/         # OPTIONAL: Supporting files
    └── examples/          # OPTIONAL: Documentation
```

### SKILL.md Format

**Complete template:**
```yaml
---
name: skill-name
description: What it does AND when to use it. Include trigger keywords users might say.
allowed-tools: Read, Grep, Glob
---

# Skill Title

## What I Know

Detailed knowledge and capabilities.

## When to Use This Skill

Specific scenarios and keywords that should activate this skill:
- "How do I..."
- "Help me with..."
- "I need to..."

## Instructions

Step-by-step guidance for Claude when this skill is active.

## Examples

Concrete examples of usage.

## References

Links to documentation, tools, or resources.
```

### YAML Frontmatter Requirements

**Required fields:**
- `name` - Lowercase, hyphens only, max 64 chars (e.g., "react-expert")
- `description` - Functionality + activation triggers, max 1024 chars

**Optional field:**
- `allowed-tools` - Restricts available tools (security/scope control)

**Critical rules:**
1. Opening `---` MUST be on line 1
2. Closing `---` MUST appear before markdown content
3. No YAML frontmatter = skill won't load!

### Description Best Practices

**❌ Bad (too vague):**
```yaml
description: Helps with data processing
```

**✅ Good (specific with triggers):**
```yaml
description: Analyze Excel spreadsheets, generate pivot tables, create charts. Activates when working with .xlsx files, data analysis, spreadsheet manipulation, Excel formulas, pivot tables, data visualization.
```

**Why it matters**: Claude uses the description to decide when to activate the skill!

### Allowed-Tools Field

**Purpose**: Restrict tool access for security or scope control

**Example** (read-only skill):
```yaml
allowed-tools: Read, Grep, Glob
```

**Example** (full development skill):
```yaml
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
```

**Available tools**: Read, Write, Edit, Bash, Grep, Glob, Task, WebFetch, WebSearch, TodoWrite, etc.

**Use cases**:
- Documentation skills (read-only)
- Analysis skills (no file modifications)
- Sensitive workflows (restricted capabilities)

### Skill Activation & Discovery

**Discovery locations:**
1. Personal skills: `~/.claude/skills/`
2. Project skills: `.claude/skills/` (shared via git)
3. Plugin skills: `plugins/*/skills/` (from installed plugins)

**Activation mechanism**:
- Claude reads skill descriptions
- Matches user request to description keywords
- Automatically activates relevant skills
- NO explicit user invocation needed

**Tips for better activation:**
- Include variations of keywords (e.g., "React, react, JSX, jsx, hooks, useState, useEffect")
- List common user phrasings
- Be specific about when to activate
- Use domain-specific terminology

### Skills vs Commands vs Agents

| Aspect | Skills | Commands | Agents |
|--------|--------|----------|--------|
| **Invocation** | Automatic (model-invoked) | Manual (`/command`) | Explicit (`Task` tool) |
| **File** | `SKILL.md` | Markdown with frontmatter | `AGENT.md` |
| **Location** | `skills/name/SKILL.md` | `commands/name.md` | `agents/name/AGENT.md` |
| **Activation** | Description matching | User types slash command | Code calls Task tool |
| **Purpose** | Knowledge/guidance | One-time actions | Complex workflows |

---

## Agents System

### What Are Agents?

**Agents** are specialized autonomous workers explicitly invoked via the `Task` tool with a `subagent_type` parameter.

### Directory Structure

```
agents/
└── my-agent/
    └── AGENT.md          # Agent instructions
```

### AGENT.md Format

**Example:**
```markdown
# Agent Name

## Role

You are a specialist in [domain].

## Responsibilities

1. Task A
2. Task B
3. Task C

## Workflow

1. Step 1
2. Step 2
3. Step 3

## Output Format

Describe expected output structure.
```

### Invocation

**TypeScript/JavaScript:**
```typescript
Task({
  subagent_type: "plugin-name:agent-directory:agent-name",
  prompt: "Detailed task description",
  model: "haiku" // optional: haiku, sonnet, opus
});
```

**Naming convention**: `{plugin}:{directory}:{yaml-name}`

**Examples:**
- `specweave:pm:pm` - Project Manager agent
- `specweave-github:github-manager:github-manager`
- `specweave-ml:data-scientist:data-scientist`

### Agent Invocation Documentation

**MANDATORY section** in every AGENT.md:

```markdown
## How to Invoke This Agent

**Subagent Type**: `plugin-name:agent-name:agent-name`

**Usage Example**:
```typescript
Task({
  subagent_type: "plugin-name:agent-name:agent-name",
  prompt: "Your task description here"
});
```

**When to Use**:
- Scenario A
- Scenario B
- Scenario C
```

**Pre-commit hooks** validate this section exists!

---

## Hooks System

### What Are Hooks?

**Hooks** are event handlers that trigger automatically during Claude Code workflow events.

### Location

`hooks/` directory with individual hook scripts

### Hook Registration

**File**: `.claude-plugin/plugin.json`

**Format**:
```json
{
  "name": "my-plugin",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [{
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh",
          "timeout": 10
        }]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [{
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/validate-context.sh",
          "timeout": 5
        }]
      }
    ]
  }
}
```

### Valid Hook Events (10 total)

1. **PostToolUse** - After any tool execution
2. **PreToolUse** - Before any tool execution
3. **PermissionRequest** - When permission needed
4. **Notification** - On system notifications
5. **UserPromptSubmit** - When user sends message
6. **Stop** - When main agent stops
7. **SubagentStop** - When subagent completes
8. **PreCompact** - Before context compaction
9. **SessionStart** - Session initialization
10. **SessionEnd** - Session termination

### Hook Configuration

**Fields:**
- `matcher` - Tool name to match (for Tool hooks only)
- `hooks` - Array of hook definitions
- `type` - Always "command" for shell scripts
- `command` - Path to executable (use `${CLAUDE_PLUGIN_ROOT}`)
- `timeout` - Execution timeout in seconds

**Example with matcher** (PostToolUse):
```json
{
  "PostToolUse": [
    {
      "matcher": "TodoWrite",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/sync-tasks.sh",
        "timeout": 10
      }]
    }
  ]
}
```

**Example without matcher** (UserPromptSubmit):
```json
{
  "UserPromptSubmit": [
    {
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/validate-input.sh",
        "timeout": 5
      }]
    }
  ]
}
```

### Hook Safety (CRITICAL!)

**MANDATORY safety mechanisms** (as of v0.24.3):

1. **Kill switch**:
```bash
if [ "${SPECWEAVE_DISABLE_HOOKS:-0}" = "1" ]; then
  exit 0
fi
```

2. **Circuit breaker** (3-failure threshold):
```bash
if [ -f ".specweave/state/.hook-circuit-breaker" ]; then
  exit 0
fi
```

3. **File locking** (prevent concurrent execution):
```bash
LOCK_DIR=".specweave/state/.hook-my-hook.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  exit 0  # Another instance running
fi
trap 'rm -rf "$LOCK_DIR"' EXIT
```

4. **Debouncing** (5-second window):
```bash
DEBOUNCE_FILE=".specweave/state/.hook-debounce"
CURRENT_TIME=$(date +%s)
if [ -f "$DEBOUNCE_FILE" ]; then
  LAST_TIME=$(cat "$DEBOUNCE_FILE")
  TIME_DIFF=$((CURRENT_TIME - LAST_TIME))
  if [ "$TIME_DIFF" -lt 5 ]; then
    exit 0  # Too soon, skip
  fi
fi
echo "$CURRENT_TIME" > "$DEBOUNCE_FILE"
```

5. **Error isolation** (NEVER propagate errors):
```bash
set +e  # NEVER use set -e
# ... hook logic ...
exit 0  # ALWAYS exit 0
```

6. **Background work** (consolidate processes):
```bash
(
  # Consolidate all heavy work here
  node script1.js
  node script2.js
) &
```

**Why this matters**: Hooks can crash Claude Code if not properly isolated!

**See**: CLAUDE.md → "9a. Hook Performance & Safety"

---

## MCP Servers

### What Are MCP Servers?

**MCP** (Model Context Protocol) servers integrate external tools and APIs into Claude Code.

### Configuration

**File**: `.mcp.json` in plugin root

**Example**:
```json
{
  "mcpServers": {
    "my-tool": {
      "command": "npx",
      "args": ["-y", "@example/mcp-server"],
      "env": {
        "API_KEY": "secret-value"
      }
    }
  }
}
```

### Best Practices

- Use environment variables for secrets
- Test MCP servers independently
- Provide fallback mechanisms
- Document required dependencies

**Official reference**: https://code.claude.com/docs/en/mcp-servers

---

## Marketplace Management

### What Are Marketplaces?

**Marketplaces** are catalogs of plugins that enable discovery, installation, and version management.

### Registration Methods

**1. GitHub marketplace:**
```bash
/plugin marketplace add owner/repo
# Example: /plugin marketplace add anton-abyzov/specweave
```

**2. Git URL:**
```bash
/plugin marketplace add https://gitlab.com/company/plugins.git
```

**3. Local path (development only):**
```bash
/plugin marketplace add ./path/to/marketplace
/plugin marketplace add ./.claude-plugin
```

**4. Direct URL:**
```bash
/plugin marketplace add https://url.of/marketplace.json
```

### Marketplace Operations

```bash
# List all marketplaces
/plugin marketplace list

# Update marketplace metadata
/plugin marketplace update marketplace-name

# Remove marketplace (WARNING: uninstalls plugins!)
/plugin marketplace remove marketplace-name

# Validate marketplace.json syntax
claude plugin validate
```

### Local vs Remote Marketplaces

**Local marketplaces**:
- Development and testing
- Validate before distribution
- File path or directory-based

**Remote marketplaces**:
- GitHub/GitLab/Git hosting
- Version control integration
- Team collaboration
- Automatic updates

---

## marketplace.json Format

### Location
`.claude-plugin/marketplace.json` in repository root

### Complete Format

```json
{
  "name": "marketplace-identifier",
  "owner": {
    "name": "Organization Name",
    "email": "contact@example.com",
    "url": "https://example.com"
  },
  "metadata": {
    "description": "Marketplace description",
    "version": "1.0.0",
    "pluginRoot": "./plugins"
  },
  "plugins": [
    {
      "name": "plugin-one",
      "source": "./plugins/plugin-one",
      "description": "Plugin description",
      "version": "1.2.3",
      "author": {
        "name": "Author Name"
      },
      "homepage": "https://github.com/user/plugin",
      "repository": {
        "type": "git",
        "url": "https://github.com/user/plugin.git"
      },
      "license": "MIT",
      "keywords": ["automation", "testing"],
      "category": "development-tools",
      "tags": ["ci-cd", "quality"]
    }
  ]
}
```

### Required Fields

**Marketplace level:**
- `name` - Marketplace identifier (kebab-case)
- `owner` - Maintainer information object
- `plugins` - Array of plugin entries

**Plugin entry level:**
- `name` - Plugin identifier (kebab-case)
- `source` - Plugin location (string or object)

### Plugin Source Types

**1. Relative path** (same repository):
```json
{
  "name": "my-plugin",
  "source": "./plugins/my-plugin"
}
```

**2. GitHub repository**:
```json
{
  "name": "github-plugin",
  "source": {
    "source": "github",
    "repo": "owner/plugin-repo",
    "path": ".claude-plugin"
  }
}
```

**3. Git URL**:
```json
{
  "name": "git-plugin",
  "source": {
    "source": "url",
    "url": "https://gitlab.com/team/plugin.git",
    "path": ".claude-plugin"
  }
}
```

### Optional Metadata

**Marketplace metadata:**
- `metadata.description` - Brief marketplace description
- `metadata.version` - Marketplace version
- `metadata.pluginRoot` - Base path for relative sources

**Plugin metadata:**
- `description`, `version`, `author`, `homepage`
- `repository`, `license`, `keywords`
- `category`, `tags`
- `commands`, `agents`, `hooks`, `mcpServers` (component counts)

---

## Team Workflows

### .claude/settings.json Configuration

**Purpose**: Automatically install marketplaces and plugins when team members trust the repository.

**File location**: `.claude/settings.json` (project root, committed to git)

**Format:**
```json
{
  "extraKnownMarketplaces": {
    "specweave": {
      "source": {
        "source": "github",
        "repo": "anton-abyzov/specweave",
        "path": ".claude-plugin"
      }
    },
    "company-internal": {
      "source": {
        "source": "github",
        "repo": "company/internal-plugins",
        "path": ".claude-plugin"
      }
    }
  },
  "plugins": {
    "specweave": {
      "enabled": true,
      "version": "latest"
    },
    "specweave-github": {
      "enabled": true,
      "version": "latest"
    }
  }
}
```

### extraKnownMarketplaces Field

**Supported source types:**
- GitHub: `{"source": "github", "repo": "owner/repo"}`
- Git URL: `{"source": "url", "url": "https://..."}`

**NOT supported:**
- ❌ Local paths: `{"source": "./.claude-plugin"}` (CLI only!)
- ❌ Direct marketplace.json URLs

**Critical**: `extraKnownMarketplaces` in settings.json ONLY supports remote sources (GitHub, Git). Use CLI for local development.

### Team Rollout Process

1. Create `.claude/settings.json` in repository
2. Add `extraKnownMarketplaces` with company marketplace
3. Specify required plugins in `plugins` section
4. Commit to git
5. Team members trust the folder
6. Claude Code auto-installs marketplaces and plugins

### Best Practices for Organizations

- **Governance**: Establish plugin approval process
- **Internal marketplaces**: Proprietary tools and integrations
- **Training**: Team education on plugin discovery
- **Security**: Review plugins before team distribution
- **Documentation**: README with setup instructions
- **Versioning**: Pin critical plugins to specific versions

---

## Development Best Practices

### Plugin Development Workflow

**1. Local development:**
```bash
# Add local marketplace for testing
/plugin marketplace add ./.claude-plugin

# Install plugin locally
/plugin install my-plugin

# Iterate on plugin code
# ... make changes ...

# Update plugin
/plugin update my-plugin
```

**2. Testing:**
- Test each component individually (commands, agents, skills, hooks)
- Validate manifest: `claude plugin validate`
- Verify directory structure (components at root, not in `.claude-plugin/`)
- Test with different user scenarios
- Check skill activation with various keywords

**3. Distribution:**
- Push to GitHub/GitLab
- Create marketplace.json
- Add versioning (semantic versioning)
- Write comprehensive README
- Get peer feedback
- Publish to team/community

### Directory Structure Validation

**✅ CORRECT:**
```
my-plugin/
├── .claude-plugin/plugin.json    ← Manifest here
├── commands/                     ← Components at root
├── agents/
├── skills/
└── hooks/
```

**❌ WRONG:**
```
my-plugin/
└── .claude-plugin/
    ├── plugin.json
    ├── commands/                 ← NOT inside .claude-plugin!
    ├── agents/
    └── skills/
```

### Versioning

Use **semantic versioning**:
- `1.0.0` - Major version (breaking changes)
- `1.1.0` - Minor version (new features)
- `1.0.1` - Patch version (bug fixes)

Update version in:
1. `.claude-plugin/plugin.json`
2. `marketplace.json` (if hosting)
3. Git tags: `git tag -a v1.2.3 -m "Release 1.2.3"`

### Documentation Requirements

**README.md** should include:
- Plugin purpose and features
- Installation instructions
- Available commands/agents/skills
- Configuration options
- Usage examples
- Troubleshooting guide
- Contributing guidelines
- License information

**SKILL.md** for each skill:
- YAML frontmatter (name, description)
- What the skill knows
- When to use it
- Examples
- References

**AGENT.md** for each agent:
- Role and responsibilities
- Workflow steps
- Output format
- **How to Invoke This Agent** section (MANDATORY!)

### Testing Checklist

- [ ] `claude plugin validate` passes
- [ ] All commands work via `/command-name`
- [ ] Skills activate with correct keywords
- [ ] Agents invoke successfully with Task tool
- [ ] Hooks trigger on correct events
- [ ] MCP servers connect properly
- [ ] No security vulnerabilities (secrets, injection)
- [ ] Documentation is complete
- [ ] Version numbers are consistent

---

## Troubleshooting

### "Marketplace not found" Error

**Symptom**: `/plugin install plugin-name` fails

**Diagnosis**:
```bash
/plugin marketplace list
# If specweave (or your marketplace) not listed...
```

**Fix**:
```bash
# Register marketplace
/plugin marketplace add anton-abyzov/specweave

# Then retry
/plugin install plugin-name
```

### Plugin Not Auto-Activating

**Symptom**: Plugin installed but skills/agents don't work

**Causes**:
1. Claude Code needs restart
2. Skill description keywords don't match context
3. Plugin has errors

**Fix**:
```bash
# 1. Verify installation
/plugin list --installed

# 2. Restart Claude Code

# 3. Check skill descriptions
# Read plugins/*/skills/*/SKILL.md
# Ensure description has keywords matching your task

# 4. Check for plugin errors
# Look in Claude Code logs
```

### Skill Not Activating

**Symptom**: Skill exists but Claude doesn't use it

**Debugging**:
1. Check YAML frontmatter format (opening `---` on line 1)
2. Verify `name` and `description` fields present
3. Review description - is it specific enough?
4. Check keywords - do they match your request?
5. Verify file path: `~/.claude/skills/` or `.claude/skills/` or `plugins/*/skills/`

**Example of vague description** (won't activate):
```yaml
description: Helps with data
```

**Example of specific description** (will activate):
```yaml
description: Analyze Excel spreadsheets, generate pivot tables, create charts. Use when working with .xlsx files, data analysis, spreadsheet manipulation.
```

### Agent Not Found Error

**Symptom**: `Task` tool call fails with "Agent not found"

**Diagnosis**:
```bash
# Check subagent_type format
# CORRECT: "plugin-name:agent-directory:agent-name"
# WRONG: "plugin-name:agent-name" (missing directory)
# WRONG: "skill-name" (skills use Skill tool, not Task tool!)
```

**Fix**:
```typescript
// ✅ CORRECT
Task({ subagent_type: "specweave:pm:pm" });

// ❌ WRONG
Task({ subagent_type: "specweave:pm" });
Task({ subagent_type: "increment-planner" }); // This is a skill!
```

### Hook Not Triggering

**Symptom**: Hook script doesn't execute on expected event

**Diagnosis**:
1. Check `.claude-plugin/plugin.json` hooks section
2. Verify event name (PostToolUse, UserPromptSubmit, etc.)
3. Check matcher (for tool hooks)
4. Ensure hook script is executable: `chmod +x hooks/script.sh`

**Common mistakes**:
```json
// ❌ WRONG: Invalid event name
{
  "hooks": {
    "TodoWrite": { ... }  // NOT a valid event!
  }
}

// ✅ CORRECT: PostToolUse with matcher
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [...]
      }
    ]
  }
}
```

### Installation Hangs or Fails

**Symptom**: `/plugin install` hangs or times out

**Causes**:
1. Network issues (GitHub fetch failed)
2. Marketplace not registered
3. Plugin doesn't exist in marketplace

**Fix**:
```bash
# 1. Verify marketplace registered
/plugin marketplace list

# 2. Check network connectivity
# Try re-adding marketplace (refreshes cache)
/plugin marketplace remove specweave
/plugin marketplace add anton-abyzov/specweave

# 3. Verify plugin exists
/plugin list  # Shows all available plugins
```

### Validation Errors

**Symptom**: Pre-commit hooks fail or `claude plugin validate` fails

**Common errors**:
1. Invalid JSON in plugin.json or marketplace.json
2. Missing required fields
3. Empty directories (agents/, skills/ with no content)
4. Components in wrong location (inside `.claude-plugin/`)
5. Missing YAML frontmatter in SKILL.md

**Fix**:
```bash
# Validate marketplace.json
claude plugin validate

# Fix directory structure
# Move commands/, agents/, skills/, hooks/ to plugin root

# Add YAML frontmatter to SKILL.md
# Ensure opening --- on line 1

# Remove empty directories
rmdir plugins/*/agents/empty-dir
```

### Hook Crashes Claude Code

**Symptom**: Claude Code becomes unresponsive or crashes when hook executes

**Emergency recovery**:
```bash
# 1. Kill switch
export SPECWEAVE_DISABLE_HOOKS=1

# 2. Reset circuit breaker
rm -f .specweave/state/.hook-circuit-breaker

# 3. Clear locks
rm -rf .specweave/state/.hook-*.lock

# 4. Rebuild
npm run rebuild
```

**Prevention**: Follow hook safety rules (see [Hooks System](#hooks-system))

---

## Official References

**Primary documentation** (ALWAYS defer to these):
1. **Plugins**: https://code.claude.com/docs/en/plugins
2. **Marketplaces**: https://code.claude.com/docs/en/plugin-marketplaces
3. **Skills**: https://code.claude.com/docs/en/skills
4. **Blog**: https://claude.com/blog/claude-code-plugins

**SpecWeave**:
- **Repository**: https://github.com/anton-abyzov/specweave
- **Marketplace**: https://github.com/anton-abyzov/specweave/.claude-plugin
- **Documentation**: https://spec-weave.com

---

## Summary: When to Use What

**Use Skill** when:
- You want Claude to automatically use knowledge
- Knowledge should be available across all conversations
- No explicit user command needed

**Use Command** when:
- User should invoke explicitly with `/command`
- One-time actions (like `/specweave:increment`)
- Clear entry point needed

**Use Agent** when:
- Complex multi-step workflows
- Specialized expertise needed
- Explicit Task tool invocation
- Autonomous subagent execution

**Use Hook** when:
- Event-driven automation
- Workflow triggers (after todo write, before tool use, etc.)
- Background synchronization
- Validation and checks

**Use MCP Server** when:
- External tool integration
- API access needed
- Third-party service connection

---

**Last Updated**: 2025-01-22 (v0.23.17)
**Maintainer**: SpecWeave Contributors
**License**: MIT
