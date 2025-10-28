# SpecWeave Slash Commands

This directory contains all slash commands for SpecWeave, including both full commands and short aliases.

## Command Aliases

SpecWeave provides short aliases for frequently used commands to speed up your workflow:

| Full Command | Alias | Description |
|--------------|-------|-------------|
| `/create-project` | `/init` | Initialize new SpecWeave project |
| `/create-increment` | `/pi` | Plan Product Increment (create new increment) |
| `/start-increment` | `/si` | Start working on increment |
| `/add-tasks` | `/at` | Add tasks to increment |
| `/validate-increment` | `/vi` | Validate increment quality |
| `/close-increment` | `/done` | Close completed increment |
| `/list-increments` | `/ls` | List all increments |

## Usage

### Full Commands (Explicit)

Use full commands when:
- ✅ Writing scripts or automation
- ✅ Documentation and tutorials
- ✅ Sharing commands with team members
- ✅ Clarity is more important than speed

**Example**:
```bash
/create-increment "User authentication with OAuth"
/validate-increment 0001 --quality
/close-increment 0001
```

### Aliases (Quick)

Use aliases when:
- ✅ Active development (speed matters)
- ✅ Iterative workflow (creating/validating frequently)
- ✅ Command-line muscle memory
- ✅ Personal productivity

**Example**:
```bash
/ci "User authentication with OAuth"
/vi 0001 --quality
/done 0001
```

## Typical Workflow

**Using aliases for speed**:
```bash
# 1. Initialize project
/init my-saas

# 2. Plan Product Increment (PI = Product Increment in Agile)
/pi "User authentication"

# 3. Start working
/si 0001

# 4. Add tasks as needed
/at 0001 "Implement login endpoint"
/at 0001 "Add password validation"

# 5. Check progress
/ls --status=in-progress

# 6. Validate before closing
/vi 0001 --quality

# 7. Close when done
/done 0001
```

**Using full commands for clarity**:
```bash
# Same workflow with explicit commands
/create-project my-saas
/create-increment "User authentication"
/start-increment 0001
/add-tasks 0001 "Implement login endpoint"
/list-increments --status=in-progress
/validate-increment 0001 --quality
/close-increment 0001
```

## All Available Commands

### Core Workflow Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `/create-project` | `/init` | Bootstrap new SpecWeave project with auto-detection |
| `/create-increment` | `/pi` | Plan Product Increment with PM/Architect/QA planning |
| `/start-increment` | `/si` | Start working on an increment (load context, create branch) |
| `/add-tasks` | `/at` | Add tasks to existing increment |
| `/validate-increment` | `/vi` | Validate increment (120 rules + optional LLM quality judge) |
| `/close-increment` | `/done` | Close increment with leftover task handling |
| `/list-increments` | `/ls` | List all increments with status and progress |

### Documentation & Review Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `/review-docs` | - | Review strategic docs vs implementation |
| `/generate-docs` | - | Generate documentation site (Docusaurus/MkDocs) |

### Integration Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `/sync-github` | - | Sync increment to GitHub issues with subtasks |

## Alias Design Philosophy

**Why separate files instead of symlinks?**

1. **Cross-platform compatibility** - Works on Windows, macOS, Linux, cloud IDEs
2. **Clear documentation** - Each alias explains what it references
3. **Consistent user experience** - Both commands work identically
4. **Easy maintenance** - Update main command, aliases stay in sync via reference

**Trade-off**: Slight content duplication, but improved UX and compatibility.

## Creating Custom Aliases

You can create your own project-specific aliases:

**1. Create `.claude/commands/custom-alias.md`**:
```markdown
---
description: Your custom command description
---

# Custom Alias

This is a shorthand for `/some-long-command`.

<!-- Paste full command content or reference it -->
```

**2. Use it**:
```bash
/custom-alias
```

## Installation

Aliases are automatically installed when you:
- Run `specweave init` (new projects)
- Install SpecWeave as dependency (`npm install specweave --save-dev`)

For manual installation:
```bash
npm run install:commands
```

## Documentation

- **Command Reference**: See `.claude/commands/` for all available commands
- **CLAUDE.md**: Quick reference table with all commands and aliases
- **Official Docs**: https://spec-weave.com/docs/commands

---

**💡 Pro Tip**: Learn the aliases - they'll save you hundreds of keystrokes per day!

**Most used**: `/pi`, `/si`, `/vi`, `/done`, `/ls`

**PI** = Product Increment (standard Agile/Scrum terminology)
