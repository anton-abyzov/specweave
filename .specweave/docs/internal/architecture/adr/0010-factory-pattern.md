# ADR-0010: Agents/Skills Factory Pattern

**Status**: Accepted  
**Date**: 2025-10-26  
**Deciders**: Core Team  

## Context

**Problem**: Loading ALL 19 agents into EVERY project wastes ~2,100 tokens (71%!)

Example waste:
- Python API project needs: `pm`, `architect`, `python-backend`, `devops`, `qa-lead` (5 agents)
- But loads ALL: `nextjs`, `nodejs-backend`, `dotnet-backend`, `frontend`, etc. (19 agents)
- **Waste**: 14 unnecessary agents × 150 tokens = 2,100 tokens

## Decision

**SpecWeave = Factory** with all components ready
**User Projects = Selective Installation** based on tech stack

### Architecture

**SpecWeave Framework** (`src/`):
- ALL 20 agents + 24 skills (source of truth)
- Version controlled in git
- NOT automatically installed to user projects

**User Project** (`.claude/`):
- ONLY install relevant components
- Based on detected tech stack
- On-demand installation as project evolves

### Installation Flow

**Initial Setup** (`/create-project`):
```bash
/create-project --type python --framework fastapi

# Detects: Python + FastAPI
# Installs ONLY:
# - Strategic: pm, architect, security, qa-lead, devops, docs-writer (6)
# - Implementation: python-backend (1)
# Total: 7 agents × 150 tokens = 1,050 tokens (vs 2,850!)
# Savings: 60% reduction
```

**Dynamic Installation**:
```bash
# User adds: "Add Figma designs"
# Auto-installs: figma-designer, figma-implementer
# Now: 9 agents (added 2 on-demand)
```

### Tech Stack Matrix

| Stack | Always Install (6-7) | Stack-Specific | Total | Tokens | Savings |
|-------|----------------------|----------------|-------|--------|---------|
| Python API | pm, architect, security, qa, devops, docs | python-backend | 7 | 1,050 | 60% |
| Next.js | pm, architect, security, qa, devops, docs | nextjs, frontend | 8 | 1,200 | 54% |
| .NET | pm, architect, security, qa, devops, docs, sre | dotnet-backend | 8 | 1,200 | 54% |

## Installation Manifest

`.specweave/installed-components.yaml`:
```yaml
---
tech_stack:
  language: python
  framework: fastapi
  
agents:
  - pm
  - architect
  - python-backend
  
available_agents:
  - nextjs
  - nodejs-backend
  - figma-designer
---
```

## Alternatives Considered

1. **Install Everything Always**
   - Pros: Simple, nothing missing
   - Cons: 71% token waste, slow
   
2. **Minimal Core Only**
   - Pros: Very light
   - Cons: Constant manual installation
   
3. **AI Auto-Detect Needs**
   - Pros: No configuration
   - Cons: Unreliable, can miss

## Consequences

### Positive
- ✅ 54-71% token reduction on agents
- ✅ Faster context loading
- ✅ Clearer project structure
- ✅ On-demand installation
- ✅ No bloat

### Negative
- ❌ Requires tech stack detection
- ❌ Manifest tracking overhead
- ❌ Can miss edge cases

## Commands

```bash
# Selective installation (recommended)
npx specweave install --detect
npx specweave install python-backend --local

# List components
npx specweave list --installed

# Cleanup unnecessary
npx specweave audit
npx specweave cleanup --auto
```

## Metrics

**Before**: 2,850 tokens (19 agents)
**After**: 750-1,200 tokens (5-8 agents)
**Savings**: 54-71% reduction

## Related

- [Factory Pattern Architecture](../../../increments/0001-core-framework/reports/FACTORY-PATTERN-ARCHITECTURE.md)
- [Agents/Skills Factory](../../../../CLAUDE.md#agentsskills-factory-pattern)
