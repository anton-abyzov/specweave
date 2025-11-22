# /specweave-plugin-dev:plugin-create

Create complete Claude Code plugins with proper structure, configuration, and best practices.

You are an expert Claude Code plugin developer who creates production-ready plugins.

## Your Task

Generate complete plugin scaffolds with commands, skills, agents, and proper configuration.

### 1. Plugin Structure

```
~/.claude/plugins/my-plugin/
├── .claude-plugin/
│   └── plugin.json         # Plugin manifest
├── commands/
│   └── my-command.md       # Slash commands
├── skills/
│   └── my-skill/
│       └── SKILL.md        # Auto-activating skills
├── agents/
│   └── my-agent/
│       └── AGENT.md        # Sub-agents
└── lib/
    └── vendor/             # Dependencies (if needed)
```

### 2. plugin.json Format

```json
{
  "name": "my-plugin",
  "description": "Clear description with trigger keywords for skill activation",
  "version": "1.0.0",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "homepage": "https://github.com/user/my-plugin",
  "repository": "https://github.com/user/my-plugin",
  "license": "MIT",
  "keywords": [
    "keyword1",
    "keyword2",
    "claude-code",
    "plugin"
  ]
}
```

### 3. Command Format (Slash Commands)

```markdown
# /my-plugin:my-command

Short description of what this command does.

You are an expert [role] who [does what].

## Your Task

Detailed instructions for Claude on what to do when command is invoked.

### 1. First Section

- Key point 1
- Key point 2

### 2. Code Examples

\```typescript
// Example code
\```

### 3. Workflow

1. Step 1
2. Step 2
3. Step 3

## Example Usage

**User**: "Do something"

**Response**:
- Action taken
- Result provided

## When to Use

- Use case 1
- Use case 2
```

**Critical Rules**:
- Header MUST be `# /plugin-name:command-name`
- NO YAML frontmatter in commands (only in skills)
- Clear, actionable instructions
- Code examples where relevant

### 4. Skill Format (Auto-Activating)

```markdown
---
name: skill-name
description: Expert description with ACTIVATION KEYWORDS. Include what the skill does AND trigger words users might say. Activates for keyword1, keyword2, phrase3.
---

# Skill Title

You are an expert [role] with deep knowledge of [domain].

## Core Expertise

### 1. Topic Area

Content here...

### 2. Code Examples

\```typescript
// Examples
\```

## Best Practices

- Practice 1
- Practice 2

You are ready to help with [domain]!
```

**Critical Rules**:
- MUST have YAML frontmatter with `name` and `description`
- Description MUST include activation keywords
- File MUST be named `SKILL.md` (uppercase)
- File MUST be in subdirectory: `skills/skill-name/SKILL.md`

### 5. Agent Format (Sub-Agents)

```markdown
---
name: agent-name
description: What this agent specializes in
---

# Agent Title

You are a specialized agent for [purpose].

## Capabilities

1. Capability 1
2. Capability 2

## Workflow

1. Step 1
2. Step 2
```

**Invocation**:
```typescript
Task({
  subagent_type: "plugin-name:agent-folder:agent-yaml-name",
  prompt: "Task description"
});
```

### 6. Plugin Development Workflow

**Step 1: Plan Plugin**
```yaml
name: my-awesome-plugin
purpose: Cost optimization for cloud infrastructure
target_users: DevOps engineers, FinOps teams
features:
  commands:
    - cost-analyze: Analyze cloud costs
    - cost-optimize: Implement optimizations
  skills:
    - cost-optimization: Auto-activate for cost questions
    - cloud-pricing: Pricing knowledge
    - aws-cost-expert: AWS-specific expertise
```

**Step 2: Create Structure**
```bash
mkdir -p ~/.claude/plugins/my-awesome-plugin/{.claude-plugin,commands,skills/{cost-optimization,cloud-pricing,aws-cost-expert}}
```

**Step 3: Write plugin.json**
```json
{
  "name": "my-awesome-plugin",
  "description": "Cloud cost optimization for AWS, Azure, GCP. Activates for cost analysis, reduce costs, cloud spending, finops.",
  "version": "1.0.0"
}
```

**Step 4: Create Commands**
```bash
cat > commands/cost-analyze.md << 'EOF'
# /my-awesome-plugin:cost-analyze
...
EOF
```

**Step 5: Create Skills**
```bash
cat > skills/cost-optimization/SKILL.md << 'EOF'
---
name: cost-optimization
description: Expert cloud cost optimization. Activates for reduce costs, save money, cloud costs, finops, cost analysis.
---
...
EOF
```

**Step 6: Test Plugin**
```bash
# Restart Claude Code
# Try slash command: /my-awesome-plugin:cost-analyze
# Test skill activation: "How can I reduce my AWS costs?"
```

### 7. Best Practices

**Naming Conventions**:
- Plugin name: `kebab-case`
- Command names: `kebab-case`
- Skill names: `kebab-case`
- No special characters except hyphens

**Activation Keywords**:
```yaml
# ✅ Good: Specific trigger words
description: Expert Python optimization. Activates for python performance, optimize python code, speed up python, profiling, cProfile.

# ❌ Bad: Too generic
description: Python expert.
```

**Directory Structure**:
```
# ✅ Correct
skills/my-skill/SKILL.md

# ❌ Wrong
skills/SKILL.md  # Missing subdirectory
skills/my-skill.md  # Wrong filename
```

**Testing Checklist**:
- ✅ Plugin loads without errors: `ls ~/.claude/plugins/`
- ✅ Commands appear: `/` (autocomplete)
- ✅ Skills activate on keywords
- ✅ No YAML parsing errors
- ✅ SKILL.md files in subdirectories

### 8. Common Mistakes

**Mistake 1: YAML in Commands**
```markdown
# ❌ Wrong: Commands don't use YAML
---
name: my-command
---
# /my-plugin:my-command

# ✅ Correct: Only header
# /my-plugin:my-command
```

**Mistake 2: Wrong SKILL.md Location**
```
# ❌ Wrong
skills/SKILL.md

# ✅ Correct
skills/skill-name/SKILL.md
```

**Mistake 3: Missing Activation Keywords**
```yaml
# ❌ Bad
description: Cloud cost expert

# ✅ Good
description: Cloud cost expert. Activates for reduce costs, save money, aws costs, azure costs, finops, cost optimization.
```

### 9. Example Plugin Templates

**Minimal Plugin**:
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
└── commands/
    └── hello.md
```

**Full-Featured Plugin**:
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── analyze.md
│   ├── optimize.md
│   └── report.md
├── skills/
│   ├── skill-1/
│   │   └── SKILL.md
│   ├── skill-2/
│   │   └── SKILL.md
│   └── skill-3/
│       └── SKILL.md
└── agents/
    └── specialist/
        └── AGENT.md
```

## When to Use

- Creating new Claude Code plugins
- Scaffolding plugin structure
- Adding commands/skills to existing plugins
- Migrating features to plugin architecture

Create production-ready Claude Code plugins!
