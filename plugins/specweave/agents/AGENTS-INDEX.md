# SpecWeave Core Plugin - Agents & Skills Guide

> **Important**: The `sw` (specweave) core plugin provides capabilities through **auto-activating SKILLS**, not through agents you spawn via Task tool.

## How Skills Work (Auto-Activation)

Skills activate **automatically** when Claude detects keywords in your prompt. You don't call them explicitly.

```
User: "Design the authentication system architecture"
       ↓
Claude sees "architecture" keyword
       ↓
Loads: plugins/specweave/skills/architect/SKILL.md
       ↓
Provides architecture expertise automatically
```

## Available Skills (Auto-Activated)

### Planning & Design

| Skill | Auto-Triggers | What It Does |
|-------|---------------|--------------|
| **architect** | architecture, system design, ADR, API design, microservices | System architecture, technical specs, ADRs |
| **pm** | product, requirements, user story, MVP, roadmap | Product management, feature planning |
| **tech-lead** | code review, best practices, refactoring | Technical leadership, code quality |

### Quality & Testing

| Skill | Auto-Triggers | What It Does |
|-------|---------------|--------------|
| **qa-lead** | test strategy, QA, quality gates, E2E | Test planning, quality assurance |
| **tdd-orchestrator** | TDD, test-driven, red-green-refactor | TDD workflow coordination |
| **code-reviewer** | code review, security, performance | Code quality review |

### Documentation

| Skill | Auto-Triggers | What It Does |
|-------|---------------|--------------|
| **docs-writer** | documentation, README, API docs | Technical documentation |
| **translator** | translate, language, i18n | Multi-language translation |

### Infrastructure

| Skill | Auto-Triggers | What It Does |
|-------|---------------|--------------|
| **infrastructure** | Terraform, serverless, Lambda, deploy | IaC generation |
| **performance** | optimization, profiling, caching | Performance analysis |
| **security** | security, OWASP, vulnerabilities | Security review |

## Example: Skills in Action

```
User: "I need to design the database schema for user authentication"

Claude's internal process:
1. Detects keywords: "design", "database schema", "authentication"
2. Matches: architect skill (system design, database schema)
3. Loads: skills/architect/SKILL.md
4. Response includes architecture expertise automatically
```

## When to Use Task Tool (External Agents)

For specialized agents from **other plugins**, use the Task tool:

```typescript
// Frontend architecture (sw-frontend plugin)
Task({
  subagent_type: "sw-frontend:frontend-architect:frontend-architect",
  prompt: "Design React component architecture"
});

// Kubernetes (sw-k8s plugin)
Task({
  subagent_type: "sw-k8s:kubernetes-architect:kubernetes-architect",
  prompt: "Create K8s manifests for microservices"
});

// QA Engineering (sw-testing plugin)
Task({
  subagent_type: "sw-testing:qa-engineer:qa-engineer",
  prompt: "Create comprehensive test strategy"
});
```

## Skills vs Agents Summary

| Aspect | Skills (sw plugin) | Agents (other plugins) |
|--------|-------------------|----------------------|
| **Invocation** | Auto-activated by keywords | Explicit via Task tool |
| **Location** | `plugins/specweave/skills/` | `plugins/sw-*/agents/` |
| **Format** | SKILL.md | AGENT.md |
| **Plugin** | sw (core) | sw-frontend, sw-k8s, etc. |

## Finding All Available Skills

```bash
# List all skills in core plugin
ls plugins/specweave/skills/

# Check skill triggers
head -5 plugins/specweave/skills/architect/SKILL.md

# See full skills index
cat plugins/specweave/skills/SKILLS-INDEX.md
```

## Improving Skill Activation

If skills aren't activating reliably, ensure your prompts include trigger keywords:

```
# Less likely to activate architect skill
"Help me with the backend"

# More likely to activate architect skill
"Help me design the backend architecture"
```

## See Also

- **Skills Index**: `plugins/specweave/skills/SKILLS-INDEX.md`
- **Plugin Agents**: Check `plugins/sw-*/agents/` for Task-invocable agents
- **CLAUDE.md**: Section on Skills vs Agents
