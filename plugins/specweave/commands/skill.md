---
name: skill
description: Create and validate Claude Code skills with proper YAML frontmatter. Use for skill creation, validation, and auditing. Activates for: create skill, validate skill, audit skills, check skills, skill format, SKILL.md.
argument-hint: [--validate [path]] [--audit] [--name skill-name] [--type auto|command|knowledge]
---

# Skill Creator & Validator

Create and validate Claude Code skills with proper YAML frontmatter, validation, and best practices.

## Modes

| Mode | Command | Description |
|------|---------|-------------|
| **Create** | `/sw:skill` | Interactive skill creation |
| **Validate** | `/sw:skill --validate [path]` | Validate single skill |
| **Audit** | `/sw:skill --audit` | Audit ALL skills in project |

---

## Validation Mode (`--validate`)

Validate a single skill file against official Anthropic format.

### Usage

```bash
/sw:skill --validate                           # Validate current skill (if in skill dir)
/sw:skill --validate plugins/specweave/skills/pm/SKILL.md
/sw:skill --validate .claude/skills/my-skill/SKILL.md
```

### Validation Checks (Official Anthropic Format)

Run these checks on every SKILL.md:

#### 1. Frontmatter Structure
```
[  ] File starts with `---` on line 1
[  ] Closing `---` present before markdown content
[  ] Valid YAML syntax between delimiters
[  ] No tabs in YAML (spaces only)
```

#### 2. Required Fields
```
[  ] `name:` present (recommended)
[  ] `description:` present (CRITICAL for activation)
```

#### 3. Name Validation
```
[  ] Matches pattern: ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$
[  ] Max 64 characters
[  ] No consecutive hyphens
[  ] Matches directory name (if directory-based)
```

#### 4. Description Quality
```
[  ] Under 1024 characters
[  ] Contains activation keywords (e.g., "Use when...", "Activates for...")
[  ] Front-loads the purpose (first sentence explains what it does)
[  ] Not too generic (specific enough for auto-activation)
```

#### 5. Optional Fields (Valid Values)
```
[  ] `allowed-tools:` - valid tool names only (Read, Write, Edit, Grep, Glob, Bash, WebSearch, WebFetch, Task, etc.)
[  ] `disable-model-invocation:` - boolean (true/false)
[  ] `user-invocable:` - boolean (true/false)
[  ] `model:` - valid model (sonnet, opus, haiku)
[  ] `context:` - valid value (fork)
[  ] `agent:` - valid subagent type if context:fork
```

#### 6. Content Quality
```
[  ] Has meaningful content after frontmatter
[  ] Reasonable length (50-2000 lines recommended)
[  ] No orphaned template placeholders ({placeholder})
```

### Output Format

```
## Skill Validation Report

**File**: plugins/specweave/skills/pm/SKILL.md
**Status**: PASS | WARN | FAIL

### Checks
| Check | Status | Details |
|-------|--------|---------|
| Frontmatter | PASS | Valid YAML |
| Name | PASS | "pm" matches pattern |
| Description | WARN | Missing activation keywords |
| Tools | PASS | Valid tool list |
| Content | PASS | 245 lines |

### Issues Found
- WARN: Description lacks "Activates for:" or "Use when" keywords
- INFO: Consider adding trigger phrases for better auto-activation

### Suggested Fix
Add to description: "Activates for: product management, user stories, requirements"
```

---

## Audit Mode (`--audit`)

Comprehensive audit of ALL skills across project.

### Usage

```bash
/sw:skill --audit                    # Audit all skills
/sw:skill --audit --fix              # Audit and offer auto-fixes
/sw:skill --audit --json             # Output as JSON
```

### Scan Locations

1. **Project skills**: `.claude/skills/*/SKILL.md`
2. **Plugin skills**: `plugins/*/skills/*/SKILL.md`
3. **Legacy commands**: `plugins/*/commands/*.md` (check frontmatter)

### Audit Report (Leaderboard Style)

```
## Skills Audit Report

**Scanned**: 127 skills, 45 commands
**Date**: 2026-02-03

### Summary
| Status | Count | Percentage |
|--------|-------|------------|
| PASS   | 98    | 77%        |
| WARN   | 21    | 17%        |
| FAIL   | 8     | 6%         |

### Critical Issues (FAIL)
| Location | Issue | Severity |
|----------|-------|----------|
| plugins/specweave-mobile/commands/build-config.md | Missing frontmatter | CRITICAL |
| plugins/specweave-n8n/skills/n8n-workflow/SKILL.md | Invalid YAML | CRITICAL |
| ... | ... | ... |

### Warnings
| Location | Issue |
|----------|-------|
| plugins/specweave/skills/pm/SKILL.md | Description lacks keywords |
| plugins/specweave-frontend/skills/react-expert/SKILL.md | Name too long (67 chars) |
| ... | ... |

### By Plugin (Worst First)
| Plugin | Pass | Warn | Fail | Score |
|--------|------|------|------|-------|
| specweave-mobile | 2 | 3 | 2 | 57% |
| specweave-n8n | 4 | 2 | 1 | 71% |
| specweave-testing | 8 | 1 | 0 | 94% |
| specweave | 25 | 3 | 0 | 94% |
| ... | ... | ... | ... | ... |

### Auto-Fix Available
8 issues can be auto-fixed. Run `/sw:skill --audit --fix`
```

### Auto-Fix Capabilities

| Issue | Auto-Fix |
|-------|----------|
| Missing frontmatter | Add minimal `---\nname: {from-filename}\ndescription: TODO\n---` |
| Name mismatch | Update to match directory name |
| Invalid characters in name | Convert to kebab-case |
| Missing description | Add placeholder with TODO marker |

---

## Commands vs Skills: Clarification

**Per official Anthropic docs (2025):**

> "Custom slash commands have been merged into skills. A file at `.claude/commands/review.md` and a skill at `.claude/skills/review/SKILL.md` both create `/review` and work the same way."

### Migration Recommendation

| Format | Status | Recommendation |
|--------|--------|----------------|
| `commands/*.md` | Legacy | Migrate to skills or add frontmatter |
| `skills/*/SKILL.md` | Current | Preferred format |

### Command Frontmatter (If Keeping Commands)

```yaml
---
name: test-init
description: Initialize testing infrastructure with Vitest and Playwright
argument-hint: [--framework vitest|jest]
allowed-tools: [Read, Write, Edit, Bash]
---
```

---

## Create Mode (Interactive)

**Quick skill scaffolding** - from concept to working skill in under 2 minutes.

## Interactive Questionnaire

Use **AskUserQuestion** to gather information:

### Question 1: Skill Name
```
What should we name this skill?
- Use lowercase letters, numbers, and hyphens only
- Max 64 characters
- Examples: python-expert, react-hooks, kubernetes-helper
```

**Validation**:
- Must match: `^[a-z0-9][a-z0-9-]*[a-z0-9]$` (or single char `^[a-z0-9]$`)
- No consecutive hyphens
- Cannot start/end with hyphen
- Max 64 characters

### Question 2: Skill Type

```
What type of skill?

○ Auto-activating (Recommended)
  → Claude loads it when keywords match user's request
  → Best for: domain expertise, best practices, knowledge

○ Command skill
  → User must invoke with /skill-name explicitly
  → Best for: workflows with side effects (deploy, commit, send)

○ Knowledge skill
  → Only Claude can activate, user cannot invoke directly
  → Best for: background context, internal APIs, legacy systems
```

**Frontmatter mapping**:
| Type | Frontmatter |
|------|-------------|
| Auto-activating | (default, no extra fields) |
| Command | `disable-model-invocation: true` |
| Knowledge | `user-invocable: false` |

### Question 3: Description

```
Describe what this skill does AND when to use it.
Include trigger keywords users might say.

Example:
"React hooks expert. Explains useState, useEffect, custom hooks.
Activates for: React hooks, useState, useEffect, custom hook, React state"
```

**Requirements**:
- Max 1024 characters
- MUST include "Activates for:" with keywords
- Front-load the purpose

### Question 4: Location

```
Where should this skill live?

○ Project (.claude/skills/) (Recommended)
  → Only in this project
  → Shared with team via git

○ Personal (~/.claude/skills/)
  → Available in ALL your projects
  → Private to you
```

### Question 5 (Optional): Tool Restrictions

```
Should this skill have restricted tool access?

○ Full access (default)
  → Can use all tools

○ Read-only
  → allowed-tools: Read, Grep, Glob, WebSearch

○ Custom
  → Specify which tools: Read, Write, Edit, Grep, Glob, Bash, WebSearch, WebFetch
```

## Generation

### Step 1: Create Directory

```bash
# Personal skill
mkdir -p ~/.claude/skills/{skill-name}

# Project skill
mkdir -p .claude/skills/{skill-name}
```

### Step 2: Generate SKILL.md

**Auto-activating skill**:
```yaml
---
name: {skill-name}
description: {description with "Activates for:" keywords}
---

# {Skill Title}

## What I Know

- [Topic 1]
- [Topic 2]
- [Topic 3]

## When to Use

Ask me about:
- "How do I [use case 1]..."
- "What's the best way to [use case 2]..."

## Key Concepts

### [Concept 1]

[Explanation with code examples]

## Best Practices

1. ✅ **[Practice 1]**: [Why]
2. ⚠️ **[Anti-pattern]**: [Why to avoid]

## Examples

### [Example 1]

```[language]
[code]
```
```

**Command skill** (add frontmatter):
```yaml
---
name: {skill-name}
description: {description}
disable-model-invocation: true
---
```

**Knowledge skill** (add frontmatter):
```yaml
---
name: {skill-name}
description: {description}
user-invocable: false
---
```

**With tool restrictions** (add frontmatter):
```yaml
---
name: {skill-name}
description: {description}
allowed-tools: Read, Grep, Glob, WebSearch
---
```

### Step 3: Validate

Check these before finishing:
- [ ] SKILL.md starts with `---` on line 1
- [ ] Has `name:` field (matches directory name)
- [ ] Has `description:` field (includes "Activates for:")
- [ ] Closing `---` present before markdown content
- [ ] Description under 1024 characters
- [ ] Name matches `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`

### Step 4: Show Next Steps

```
✅ Skill created: {path}/SKILL.md

Next steps:
  1. Edit SKILL.md with your expertise content
  2. Restart Claude Code to load the skill
  3. Test: Ask a question with your trigger keywords

Test your skill:
  "{example trigger question based on description}"

Troubleshooting:
  - Skill doesn't activate → Add more keywords to description
  - YAML errors → Check frontmatter format (---)
  - Not loading → Restart Claude Code
```

## Non-Interactive Mode

Support flags for automation:

```bash
/sw:skill --name python-expert --type auto --location personal \
  --description "Python expert. Activates for: python, pip, virtualenv"
```

| Flag | Values | Default |
|------|--------|---------|
| `--name` | skill-name | (required) |
| `--type` | `auto`, `command`, `knowledge` | `auto` |
| `--location` | `project`, `personal` | `project` |
| `--description` | "text" | (required) |
| `--tools` | `full`, `readonly`, or comma-separated list | `full` |

## Examples

### Example 1: React Hooks Expert

```
/sw:skill

Name: react-hooks-expert
Type: Auto-activating
Description: React hooks expert. Explains useState, useEffect, useContext,
  useMemo, useCallback, and custom hooks patterns. Activates for: React hooks,
  useState, useEffect, custom hook, React state management, hooks patterns.
Location: Project
Tools: Full access
```

**Creates** `.claude/skills/react-hooks-expert/SKILL.md`

### Example 2: Deploy Command

```
/sw:skill

Name: deploy-production
Type: Command skill
Description: Production deployment workflow with safety checks.
Location: Project
Tools: Full access
```

**Creates** `.claude/skills/deploy-production/SKILL.md` with `disable-model-invocation: true`

### Example 3: Internal API Docs

```
/sw:skill

Name: internal-api-docs
Type: Knowledge skill
Description: Internal API documentation for company services.
  Activates for: internal API, company API, service endpoints.
Location: Project
Tools: Read-only
```

**Creates** `.claude/skills/internal-api-docs/SKILL.md` with:
```yaml
---
name: internal-api-docs
description: Internal API documentation...
user-invocable: false
allowed-tools: Read, Grep, Glob, WebSearch
---
```

## Validation Errors

| Error | Fix |
|-------|-----|
| "Invalid name format" | Use lowercase, hyphens only |
| "Name too long" | Max 64 characters |
| "Description too long" | Max 1024 characters |
| "Missing Activates for:" | Add trigger keywords |
| "Directory exists" | Choose different name or remove existing |

## Quick Reference

**Skill types**:
- **Auto-activating**: Claude loads when keywords match (default)
- **Command**: User invokes with `/skill-name` explicitly
- **Knowledge**: Only Claude activates, user cannot invoke

**Locations**:
- **Personal**: `~/.claude/skills/` (all projects)
- **Project**: `.claude/skills/` (this project only)

**Tool restrictions**:
- Read-only: `allowed-tools: Read, Grep, Glob, WebSearch`
- Custom: specify tools you need

Create your skill!

---

## Implementation: Validation Algorithm

When running validation, use this algorithm:

### Step 1: Find Skills to Validate

```bash
# For --audit mode, find all skills
find plugins -name "SKILL.md" -type f 2>/dev/null
find .claude/skills -name "SKILL.md" -type f 2>/dev/null

# Also check commands for frontmatter compliance
find plugins -path "*/commands/*.md" -type f 2>/dev/null
```

### Step 2: Parse Frontmatter

For each file:
1. Read file content
2. Check if starts with `---`
3. Find closing `---`
4. Parse YAML between delimiters
5. Extract fields: name, description, allowed-tools, etc.

### Step 3: Run Validation Checks

```typescript
interface ValidationResult {
  file: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  checks: {
    frontmatter: { status: string; details: string };
    name: { status: string; details: string };
    description: { status: string; details: string };
    tools: { status: string; details: string };
    content: { status: string; details: string };
  };
  issues: { severity: string; message: string }[];
  suggestions: string[];
}

// Name pattern (official Anthropic spec)
const NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MAX_NAME_LENGTH = 64;
const MAX_DESC_LENGTH = 1024;

// Valid tools (Claude Code built-in)
const VALID_TOOLS = [
  'Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash',
  'WebSearch', 'WebFetch', 'Task', 'TodoWrite',
  'AskUserQuestion', 'Skill', 'NotebookEdit'
];

// Activation keyword patterns
const ACTIVATION_PATTERNS = [
  /activates? for:?/i,
  /use when/i,
  /triggers? on/i,
  /invoke when/i,
  /use this skill when/i
];
```

### Step 4: Generate Report

Use leaderboard format for audit mode:
- Group by plugin
- Sort by score (worst first for issues, best first for passing)
- Calculate percentages
- Identify auto-fixable issues

### Step 5: Apply Fixes (if --fix)

For auto-fixable issues:
1. Backup original file
2. Apply fix (add frontmatter, correct name, etc.)
3. Re-validate to confirm fix worked
4. Report changes made

---

## Official Anthropic Frontmatter Reference

From https://code.claude.com/docs/en/skills:

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Recommended | string | Identifier (kebab-case, max 64 chars) |
| `description` | Recommended | string | When to use (max 1024 chars, include keywords) |
| `argument-hint` | Optional | string | Hint for arguments (e.g., `[issue-number]`) |
| `disable-model-invocation` | Optional | boolean | Prevent Claude auto-loading (default: false) |
| `user-invocable` | Optional | boolean | Hide from / menu (default: true) |
| `allowed-tools` | Optional | array | Tools Claude can use without permission |
| `model` | Optional | string | Model override (sonnet, opus, haiku) |
| `context` | Optional | string | Set to `fork` for subagent execution |
| `agent` | Optional | string | Subagent type when context:fork |
| `hooks` | Optional | object | Lifecycle hooks for this skill |

### Invocation Control Matrix

| Frontmatter | User Can Invoke | Claude Can Invoke | When Loaded |
|-------------|-----------------|-------------------|-------------|
| (default) | Yes | Yes | Description in context, full skill on invoke |
| `disable-model-invocation: true` | Yes | No | Description NOT in context |
| `user-invocable: false` | No | Yes | Description always in context |

---

## Troubleshooting Validation

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid YAML" | Tabs, bad indentation, unclosed quotes | Use spaces, check syntax |
| "Name mismatch" | `name:` differs from directory | Update to match directory name |
| "No activation keywords" | Description too generic | Add "Activates for:" or "Use when" |
| "Invalid tool" | Typo in allowed-tools | Check against VALID_TOOLS list |
| "Missing frontmatter" | File doesn't start with `---` | Add YAML frontmatter block |
