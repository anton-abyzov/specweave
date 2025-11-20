# SpecWeave Agents Index

## Quick Reference: How to Invoke Agents

All SpecWeave agents follow the naming pattern: `{plugin}:{directory}:{name-from-yaml}`

### Core Planning & Design Agents

#### Product Manager (PM)
```typescript
Task({
  subagent_type: "specweave:pm:pm",
  prompt: "Create product requirements for user dashboard feature"
});
```
**Use for**: Product strategy, requirements gathering, user story creation, feature prioritization

#### Architect
```typescript
Task({
  subagent_type: "specweave:architect:architect",
  prompt: "Design system architecture for user authentication"
});
```
**Use for**: System architecture, technical specifications, ADRs, component designs, API contracts

#### Tech Lead
```typescript
Task({
  subagent_type: "specweave:tech-lead:tech-lead",
  prompt: "Review code and suggest improvements"
});
```
**Use for**: Code review, best practices, technical mentorship, implementation planning

---

### Quality & Testing Agents

#### QA Lead
```typescript
Task({
  subagent_type: "specweave:qa-lead:qa-lead",
  prompt: "Create test strategy for permission gates feature"
});
```
**Use for**: Test plans, test cases, E2E testing with Playwright, test automation, coverage analysis

#### Test-Aware Planner
```typescript
Task({
  subagent_type: "specweave:test-aware-planner:test-aware-planner",
  prompt: "Generate tasks with embedded test plans"
});
```
**Use for**: Task generation with BDD test plans, coverage targets, AC-test mapping

#### TDD Orchestrator
```typescript
Task({
  subagent_type: "specweave:tdd-orchestrator:tdd-orchestrator",
  prompt: "Coordinate TDD workflow for feature implementation"
});
```
**Use for**: Red-green-refactor discipline, multi-agent TDD coordination

---

### Code Quality & Standards Agents

#### Code Reviewer
```typescript
Task({
  subagent_type: "specweave:code-reviewer",
  prompt: "Review recent changes for security and performance issues"
});
```
**Use for**: Modern AI-powered code analysis, security scanning, performance optimization

#### Code Standards Detective
```typescript
Task({
  subagent_type: "specweave:code-standards-detective:code-standards-detective",
  prompt: "Analyze codebase and generate coding standards documentation"
});
```
**Use for**: Discovering naming conventions, import patterns, detecting anti-patterns

#### Security
```typescript
Task({
  subagent_type: "specweave:security:security",
  prompt: "Perform security review of authentication implementation"
});
```
**Use for**: Threat modeling, security architecture, OWASP Top 10, vulnerability assessment

---

### Documentation & Communication Agents

#### Docs Writer
```typescript
Task({
  subagent_type: "specweave:docs-writer:docs-writer",
  prompt: "Create API documentation for REST endpoints"
});
```
**Use for**: API docs, user guides, developer guides, README files, architecture documentation

#### Translator
```typescript
Task({
  subagent_type: "specweave:translator:AGENT",
  prompt: "Translate documentation to Spanish"
});
```
**Use for**: Batch translation projects, multi-file translation coordination

---

### Infrastructure & Performance Agents

#### Infrastructure
```typescript
Task({
  subagent_type: "specweave:infrastructure:infrastructure",
  prompt: "Generate Terraform configurations for serverless deployment"
});
```
**Use for**: Infrastructure-as-Code, AWS Lambda, Azure Functions, GCP Cloud Functions, Supabase

#### Performance
```typescript
Task({
  subagent_type: "specweave:performance:performance",
  prompt: "Analyze and optimize database query performance"
});
```
**Use for**: Performance optimization, profiling, benchmarking, scalability analysis

---

### Quality Assurance Agents

#### Increment Quality Judge v2
```typescript
Task({
  subagent_type: "specweave:increment-quality-judge-v2:increment-quality-judge-v2",
  prompt: "Assess quality of increment specification and implementation"
});
```
**Use for**: AI-powered quality assessment, risk scoring (BMAD), quality gate decisions

#### Reflective Reviewer
```typescript
Task({
  subagent_type: "specweave:reflective-reviewer:reflective-reviewer",
  prompt: "Perform reflective review of implementation quality"
});
```
**Use for**: Post-implementation review, learning from mistakes, improvement suggestions

---

## Naming Pattern Explanation

**Directory-based agents** (most common):
```
Pattern: {plugin}:{directory}:{name-from-yaml}
Example: specweave:qa-lead:qa-lead

Structure:
plugins/specweave/agents/qa-lead/
  └── AGENT.md (contains: name: qa-lead)
```

**File-based agents** (legacy):
```
Pattern: {plugin}:{filename}
Example: specweave:code-reviewer

Structure:
plugins/specweave/agents/
  └── code-reviewer.md
```

## Finding Agent Types

```bash
# List all available agents
ls -la plugins/specweave/agents/

# Check agent's YAML name field
head -5 plugins/specweave/agents/qa-lead/AGENT.md
# Output: name: qa-lead

# Construct full type: specweave:qa-lead:qa-lead
```

## Common Mistakes

```typescript
// ❌ WRONG: Missing directory/name part
Task({ subagent_type: "specweave:qa-lead", ... });
// Error: Agent type 'specweave:qa-lead' not found

// ✅ CORRECT: Full pattern with directory and name
Task({ subagent_type: "specweave:qa-lead:qa-lead", ... });
```

## See Also

- **Agent Details**: Each agent's `AGENT.md` file contains full documentation
- **CLAUDE.md**: Section 15 - Skills vs Agents: Understanding the Distinction
- **Plugin Validation**: `scripts/validate-plugin-directories.sh`
