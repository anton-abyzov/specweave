# Agent Naming Convention Documentation - Complete

**Date**: 2025-11-20
**Issue**: Confusion about proper agent invocation format (`specweave:qa-lead` vs `specweave:qa-lead:qa-lead`)
**Root Cause**: Missing documentation about Claude Code's agent naming conventions

## Problem Statement

Users were getting "Agent type not found" errors when trying to invoke agents like:
```typescript
Task({ subagent_type: "specweave:qa-lead", ... });
// Error: Agent type 'specweave:qa-lead' not found
```

The correct format requires the "duplication":
```typescript
Task({ subagent_type: "specweave:qa-lead:qa-lead", ... });
```

This "duplication" was confusing because the naming pattern wasn't documented.

## Solution Implemented

### 1. Updated All Core Agents (14 agents)

Added "How to Invoke This Agent" section to each agent's AGENT.md:

**Updated agents**:
- ✅ architect
- ✅ code-standards-detective
- ✅ docs-writer
- ✅ increment-quality-judge-v2
- ✅ infrastructure
- ✅ performance
- ✅ pm
- ✅ qa-lead
- ✅ reflective-reviewer
- ✅ security
- ✅ tdd-orchestrator
- ✅ tech-lead
- ✅ test-aware-planner
- ✅ translator

**Format added to each agent**:
```markdown
## 🚀 How to Invoke This Agent

\`\`\`typescript
// CORRECT invocation
Task({
  subagent_type: "specweave:{directory}:{name}",
  prompt: "Your task description here"
});

// Naming pattern: {plugin}:{directory}:{name-from-yaml}
// - plugin: specweave
// - directory: {folder-name} (folder name)
// - name: {agent-name} (from YAML frontmatter above)
\`\`\`
```

### 2. Created AGENTS-INDEX.md

**Location**: `plugins/specweave/agents/AGENTS-INDEX.md`

**Contents**:
- Quick reference for all 14 core agents
- Correct invocation patterns for each
- Explanation of naming convention
- Common mistakes and how to avoid them
- How to find agent types

**Categories**:
- Core Planning & Design Agents (PM, Architect, Tech Lead)
- Quality & Testing Agents (QA Lead, Test-Aware Planner, TDD Orchestrator)
- Code Quality & Standards Agents (Code Reviewer, Code Standards Detective, Security)
- Documentation & Communication Agents (Docs Writer, Translator)
- Infrastructure & Performance Agents (Infrastructure, Performance)
- Quality Assurance Agents (Increment Quality Judge v2, Reflective Reviewer)

### 3. Enhanced CLAUDE.md Documentation

**Location**: `CLAUDE.md` - Section 15: "Skills vs Agents"

**Added**:
- **Agent Naming Convention** subsection with:
  - Clear explanation of `{plugin}:{directory}:{name-from-yaml}` pattern
  - Why the "duplication" occurs (directory name = YAML name)
  - Examples of correct invocations
  - File-based vs directory-based agents
  - How to find the correct agent type
  - Common mistakes to avoid

**Key excerpt**:
```markdown
**Directory-based agents**: `{plugin-name}:{directory-name}:{name-from-yaml}`

Examples:
- Agent at `plugins/specweave/agents/qa-lead/AGENT.md` with `name: qa-lead`
  → Invoke as: `specweave:qa-lead:qa-lead`

**Why the "duplication"?**
The pattern is `{plugin}:{directory}:{yaml-name}`. When the directory name
matches the YAML `name` field (best practice), it creates the appearance of
duplication: `qa-lead:qa-lead`.
```

### 4. Updated Validation Script

**File**: `scripts/validate-plugin-directories.sh`

**Added check**:
- Validates that all agents have "How to Invoke This Agent" section
- Reports missing invocation docs with warning
- Suggests fix command: `bash scripts/add-agent-invocation-docs.sh`

**New output**:
```
📚 Checking agent invocation documentation...
⚠️  MISSING INVOCATION DOCS: specweave/agents/translator
   AGENT.md exists but lacks '## How to Invoke This Agent' section

Fix by running: bash scripts/add-agent-invocation-docs.sh
```

### 5. Created Automation Script

**File**: `scripts/add-agent-invocation-docs.sh`

**Purpose**: Automatically add invocation docs to all agents

**Features**:
- Scans all agent directories
- Extracts agent name from YAML frontmatter
- Generates proper invocation section
- Inserts after frontmatter without duplicate headers
- Skips agents that already have docs

**Usage**:
```bash
bash scripts/add-agent-invocation-docs.sh
```

## Verification

### All Core Agents Have Docs
```bash
$ bash scripts/validate-plugin-directories.sh
📚 Checking agent invocation documentation...
✅ All core specweave agents: PASSED
```

### Example Agent Invocation
```typescript
// Before (ERROR):
Task({ subagent_type: "specweave:qa-lead", ... });

// After (WORKS):
Task({
  subagent_type: "specweave:qa-lead:qa-lead",
  prompt: "Create test strategy for permission gates"
});
```

## Files Modified

1. **Agent Files** (14 files):
   - `plugins/specweave/agents/architect/AGENT.md`
   - `plugins/specweave/agents/code-standards-detective/AGENT.md`
   - `plugins/specweave/agents/docs-writer/AGENT.md`
   - `plugins/specweave/agents/increment-quality-judge-v2/AGENT.md`
   - `plugins/specweave/agents/infrastructure/AGENT.md`
   - `plugins/specweave/agents/performance/AGENT.md`
   - `plugins/specweave/agents/pm/AGENT.md`
   - `plugins/specweave/agents/qa-lead/AGENT.md`
   - `plugins/specweave/agents/reflective-reviewer/AGENT.md`
   - `plugins/specweave/agents/security/AGENT.md`
   - `plugins/specweave/agents/tdd-orchestrator/AGENT.md`
   - `plugins/specweave/agents/tech-lead/AGENT.md`
   - `plugins/specweave/agents/test-aware-planner/AGENT.md`
   - `plugins/specweave/agents/translator/AGENT.md`

2. **Documentation**:
   - `CLAUDE.md` - Added comprehensive naming convention docs
   - `plugins/specweave/agents/AGENTS-INDEX.md` - NEW: Quick reference

3. **Scripts**:
   - `scripts/add-agent-invocation-docs.sh` - NEW: Automation script
   - `scripts/validate-plugin-directories.sh` - Enhanced validation

4. **Reports**:
   - This file: `.specweave/increments/0047-us-task-linkage/reports/AGENT-NAMING-CONVENTION-FIX.md`

## Future Work

### Plugin Agents (25 remaining)

The validation script detected 25 agents in other plugins that need invocation docs:
- specweave-ado (3 agents)
- specweave-backend (1 agent)
- specweave-confluent (1 agent)
- specweave-diagrams (1 agent)
- specweave-github (3 agents)
- specweave-infrastructure (5 agents)
- specweave-jira (1 agent)
- specweave-kafka (3 agents)
- specweave-kubernetes (1 agent)
- specweave-ml (3 agents)
- specweave-mobile (1 agent)
- specweave-payments (1 agent)
- specweave-release (1 agent)

**To fix**:
```bash
# The automation script can be run to update all plugins:
bash scripts/add-agent-invocation-docs.sh
```

### Pre-Commit Hook

Add validation to pre-commit hooks to ensure all new agents include invocation docs:
```bash
# .git/hooks/pre-commit
bash scripts/validate-plugin-directories.sh
```

## Impact

### User Experience
- ✅ Clear documentation prevents "Agent type not found" errors
- ✅ Users can easily find correct invocation patterns
- ✅ Consistency across all agents

### Developer Experience
- ✅ Automation script makes adding docs trivial
- ✅ Validation ensures completeness
- ✅ AGENTS-INDEX.md provides quick reference

### Maintainability
- ✅ Standard format for all agents
- ✅ Easy to validate and enforce
- ✅ Clear pattern for future agents

## Summary

All core SpecWeave agents (14) now have comprehensive invocation documentation following a consistent format. The naming convention is clearly documented in CLAUDE.md with examples and common mistakes. Automation and validation tools ensure this standard is maintained.

**Pattern**: `{plugin}:{directory}:{name-from-yaml}`
**Example**: `specweave:qa-lead:qa-lead`
**Why**: Best practice is directory name matches YAML name field

Users will no longer encounter "Agent type not found" errors due to missing or incorrect naming patterns.
