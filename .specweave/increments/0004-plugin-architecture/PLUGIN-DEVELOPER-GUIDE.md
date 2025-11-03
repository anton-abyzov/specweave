# SpecWeave Plugin Developer Guide

**Version**: 0.4.0+
**Audience**: Plugin developers, contributors
**Last Updated**: 2025-10-31

---

## Overview

SpecWeave v0.4.0 introduces a modular plugin architecture that allows developers to extend functionality without bloating the core framework.

**Benefits**:
- 📦 Modular: Load only what you need
- 🚀 Performant: 75%+ context reduction
- 🔌 Extensible: Community contributions welcome
- 🛠️ Multi-tool: Works with Claude, Cursor, Copilot, Generic

---

## Quick Start

### Create a Plugin

```bash
# 1. Create plugin directory structure
mkdir -p src/plugins/specweave-myplugin/{.claude-plugin,skills,agents,commands}

# 2. Create manifest
cat > src/plugins/specweave-myplugin/.claude-plugin/manifest.json
```

### Manifest Template

```json
{
  "name": "specweave-myplugin",
  "version": "1.0.0",
  "description": "Brief description of what this plugin does",
  "author": "Your Name",
  "license": "MIT",
  "specweave_core_version": ">=0.4.0",

  "auto_detect": {
    "files": ["myplugin/", "config.myplugin.json"],
    "packages": ["myplugin-package"],
    "env_vars": ["MYPLUGIN_API_KEY"],
    "git_remote_pattern": "myplugin.com"
  },

  "provides": {
    "skills": ["myplugin-skill"],
    "agents": ["myplugin-agent"],
    "commands": ["myplugin-command"]
  },

  "dependencies": {
    "plugins": ["specweave-core-plugin"]
  },

  "triggers": ["myplugin", "my plugin", "myplugin-feature"]
}
```

---

## Plugin Structure

```
src/plugins/specweave-myplugin/
├── .claude-plugin/
│   └── manifest.json           # Required: Plugin metadata
├── skills/
│   └── myplugin-skill/
│       ├── SKILL.md            # Skill prompt (YAML frontmatter + markdown)
│       └── test-cases/         # Optional: Test cases
│           └── test-1.yaml
├── agents/
│   └── myplugin-agent/
│       └── AGENT.md            # Agent prompt (YAML frontmatter + markdown)
├── commands/
│   └── myplugin-command.md     # Slash command (YAML frontmatter + markdown)
└── README.md                   # Documentation
```

---

## Manifest Fields

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | string | Plugin name (must start with `specweave-`) | `"specweave-kubernetes"` |
| `version` | string | Semantic version | `"1.0.0"` |
| `description` | string | Brief description (max 200 chars) | `"Kubernetes deployment and management"` |
| `specweave_core_version` | string | Minimum SpecWeave version | `">=0.4.0"` |
| `provides.skills` | string[] | List of skill names | `["k8s-deployer"]` |
| `provides.agents` | string[] | List of agent names | `["devops"]` |
| `provides.commands` | string[] | List of command names | `["k8s-deploy"]` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `author` | string | Plugin author |
| `license` | string | License (e.g., "MIT") |
| `dependencies.plugins` | string[] | Required plugins |
| `auto_detect.files` | string[] | File patterns to detect |
| `auto_detect.packages` | string[] | npm/pip/etc packages to detect |
| `auto_detect.env_vars` | string[] | Environment variables to check |
| `auto_detect.git_remote_pattern` | string | Git remote pattern (regex) |
| `triggers` | string[] | Keywords for detection |
| `credits.based_on` | string | Original source URL |
| `credits.original_author` | string | Original author |
| `credits.contributors` | string[] | Contributors |

---

## Creating Skills

Skills are markdown files with YAML frontmatter that define capabilities.

**File**: `skills/myplugin-skill/SKILL.md`

```markdown
---
name: myplugin-skill
description: What this skill does and when to activate. Include trigger keywords.
---

# My Plugin Skill

## What I Know

- Feature 1
- Feature 2
- Feature 3

## When to Use

This skill activates when users ask about:
- "keyword1"
- "keyword2"
- "feature-specific-term"

## Examples

\`\`\`bash
# Example usage
command-example
\`\`\`

## Implementation Details

[Detailed instructions for Claude on how to use this skill...]
```

**Best Practices**:
- Clear description with activation keywords
- Specific trigger keywords in description
- Examples of when to use
- Detailed implementation guidance

---

## Creating Agents

Agents are specialized AI personas for specific roles.

**File**: `agents/myplugin-agent/AGENT.md`

```markdown
---
name: myplugin-agent
role: Brief role description
description: What this agent does and when to invoke
---

# My Plugin Agent

## Role

[Detailed role description]

## Expertise

- Area 1
- Area 2
- Area 3

## When to Invoke

This agent should be invoked via Task tool when:
- Scenario 1
- Scenario 2

## Tools Available

- Tool 1
- Tool 2

## Workflow

1. Step 1
2. Step 2
3. Step 3

[Detailed agent instructions...]
```

---

## Creating Commands

Commands are slash commands that users invoke explicitly.

**File**: `commands/myplugin-command.md`

```markdown
---
name: myplugin.command
description: Brief command description
---

# My Plugin Command

This command does X, Y, and Z.

## Usage

\`\`\`bash
/myplugin.command [arguments]
\`\`\`

## Steps

1. Validate input
2. Execute action
3. Report results

[Detailed command instructions for Claude...]
```

**Naming Convention**: Use dot notation (e.g., `myplugin.deploy`, `myplugin.sync`)

---

## Auto-Detection System

SpecWeave uses a **4-phase detection system** to suggest plugins intelligently:

### Phase 1: Init-Time Detection

Runs during `specweave init`:
- Scans `package.json` for dependencies
- Checks for specific directories
- Reads environment variables
- Examines git remote URL

### Phase 2: Spec-Based Detection

Runs during `/specweave:inc`:
- Analyzes increment description
- Matches keywords against `triggers` field
- Suggests before creating spec

### Phase 3: Task-Based Detection

Runs before task execution:
- Analyzes task description
- Suggests relevant plugins
- Non-blocking recommendations

### Phase 4: Git-Diff Detection

Runs after increment completion:
- Analyzes git diff
- Detects new dependencies
- Suggests for next increment

**Example Auto-Detection**:

```json
{
  "auto_detect": {
    "files": ["kubernetes/", "k8s/", "*.yaml"],
    "packages": ["@kubernetes/client-node", "kubectl"],
    "env_vars": ["KUBECONFIG", "K8S_CLUSTER"],
    "git_remote_pattern": "kubernetes\\.io"
  },
  "triggers": ["kubernetes", "k8s", "kubectl", "helm", "pod", "deployment"]
}
```

---

## Multi-Tool Support

Plugins must work across all supported AI tools:

### Claude Code (Native)

- Skills → `.claude/skills/`
- Agents → `.claude/agents/`
- Commands → `.claude/commands/`
- Auto-activation based on context

### Cursor (Compiled)

- All components → `AGENTS.md`
- HTML comment markers for sections
- Team commands dashboard integration
- Context shortcuts (`@plugin-name`)

### Copilot (Compiled)

- All components → `AGENTS.md`
- Natural language instructions
- No slash command support

### Generic (Manual)

- All components → `AGENTS.md`
- User copy-pastes relevant sections
- Works with any AI (ChatGPT, Gemini, etc.)

**Plugin developers don't need to handle this** - the adapter system handles compilation automatically!

---

## Testing Your Plugin

### Manual Testing

```bash
# 1. Build SpecWeave
npm run build

# 2. Enable your plugin
specweave plugin enable myplugin

# 3. Test functionality
# - For skills: Ask a question that should trigger the skill
# - For agents: Invoke via Task tool
# - For commands: Use the slash command

# 4. Verify auto-detection
# Create a test project with detection criteria
specweave init test-project
# Check if plugin is suggested
```

### Unit Tests

Create test cases in `skills/myplugin-skill/test-cases/`:

```yaml
# test-1-basic.yaml
description: Basic functionality test
input: "How do I use myplugin?"
expected_skill: myplugin-skill
expected_output_contains:
  - "feature1"
  - "feature2"
```

---

## Publishing Your Plugin

### Option 1: Contribute to Core

1. Fork SpecWeave repository
2. Create plugin in `src/plugins/`
3. Write tests
4. Submit pull request
5. Plugin ships with SpecWeave

### Option 2: Standalone Package

1. Create separate npm package
2. Follow SpecWeave plugin structure
3. Publish to npm
4. Users install: `specweave plugin install <name>`

### Option 3: Anthropic Marketplace

1. Submit to SpecWeave marketplace repo
2. Plugin available via: `/plugin marketplace add specweave/marketplace`
3. Users install: `/plugin install <name>`

---

## Best Practices

### DO ✅

- **Clear naming**: `specweave-<domain>` (e.g., `specweave-kubernetes`)
- **Focused scope**: One plugin = one domain/technology
- **Comprehensive triggers**: Include all relevant keywords
- **Test thoroughly**: Manual + automated tests
- **Document well**: Clear README with examples
- **Semantic versioning**: Follow semver (1.0.0, 1.1.0, 2.0.0)
- **Credit sources**: If based on existing work, attribute properly

### DON'T ❌

- **Overly broad scope**: Don't create "do-everything" plugins
- **Missing auto-detection**: Always include detection rules
- **Duplicate core features**: Check existing plugins first
- **Break semver**: Don't introduce breaking changes in patches
- **Skip testing**: Untested plugins cause user frustration
- **Ignore multi-tool**: Must work with all adapters

---

## Examples

See existing plugins for reference:

- `src/plugins/specweave-github/` - GitHub integration (complete example)
- Planned: `specweave-kubernetes`, `specweave-frontend-stack`, `specweave-ml-ops`

---

## Getting Help

- **Documentation**: https://spec-weave.com/docs/plugins
- **GitHub Issues**: https://github.com/anton-abyzov/specweave/issues
- **Discussions**: https://github.com/anton-abyzov/specweave/discussions

---

## Plugin Lifecycle

```
┌─────────────────┐
│  Plugin Created │
│  (manifest.json)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auto-Detection │
│  (4 phases)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User Enables   │
│  (plugin enable)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Adapter Installs│
│  (Claude/.claude)│
│  (Cursor/AGENTS) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Plugin Active  │
│  Skills/Agents  │
│  Auto-activate  │
└─────────────────┘
```

---

**Happy Plugin Development!** 🚀

For detailed examples and advanced features, see the full documentation at https://spec-weave.com
