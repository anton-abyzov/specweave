---
sidebar_position: 1
---

# Glossary Overview

Welcome to the SpecWeave Glossary - your comprehensive reference for all SpecWeave-specific terminology, software engineering concepts, and industry-standard practices.

## Quick Navigation

### By Category
- [SpecWeave Core](#specweave-core) - Framework fundamentals
- [Plugin Architecture](#plugin-architecture) - Modular system components
- [Workflow & Process](#workflow--process) - Development methodologies
- [Documentation Structure](#documentation-structure) - Strategic documentation
- [Integration & Sync](#integration--sync) - External tool integration
- [Architecture & Design](#architecture--design) - System architecture
- [Testing & Quality](#testing--quality) - QA and testing practices
- [DevOps & Tools](#devops--tools) - Deployment and operations

### Common Terms
- [SpecWeave](./terms/specweave.md) - The framework itself
- [Increment](./terms/increment.md) - Focused unit of work (product increment)
- [Spec](./terms/spec.md) - Specification document (two locations explained)
- [Living Docs](./terms/living-docs.md) - Auto-syncing documentation
- [Tasks.md](./terms/tasks-md.md) - Task file with embedded tests
- [AC-ID](./terms/ac-id.md) - Acceptance Criteria ID for traceability
- [Plugin](./terms/plugin.md) - Modular capability package

## SpecWeave Core

### Fundamental Concepts
- **[SpecWeave](./terms/specweave.md)**: Spec-driven development framework for AI-assisted development
- **[Increment](./terms/increment.md)**: Product increment - focused, measurable unit of work
- **[Spec](./terms/spec.md)**: Specification document (living docs vs increment specs)
- **[Living Docs](./terms/living-docs.md)**: Auto-syncing permanent documentation
- **[Tasks.md](./terms/tasks-md.md)**: Task file with embedded test plans (BDD format)
- **[Plan.md]**: Implementation strategy and architecture
- **[AC-ID](./terms/ac-id.md)**: Acceptance Criteria ID for traceability (AC-US1-01, etc.)

### Core Workflow
- **Spec-First**: Write requirements before implementation
- **Test-Aware Planning**: Embed test plans in tasks.md
- **WIP Limits**: Work-in-progress discipline (1 active increment)
- **Increment Discipline**: Complete one before starting next
- **Living Completion Reports**: Real-time scope evolution tracking

## Plugin Architecture

### Components
- **[Plugin](./terms/plugin.md)**: Modular capability package (everything is a plugin!)
- **Skill**: Auto-activating AI capability (SKILL.md files)
- **Agent**: Specialized AI role (PM, Architect, Tech Lead, etc.)
- **Command**: Slash command (/specweave:increment, etc.)
- **Hook**: Lifecycle automation script (post-task-completion, etc.)

### Core Plugin (Always Loaded)
- **specweave**: Framework essentials (~12K tokens)
  - 9 skills (increment-planner, spec-generator, tdd-workflow, etc.)
  - 22 agents (PM, Architect, Tech Lead, + 19 specialized)
  - 22 commands (/specweave:increment, /specweave:do, etc.)
  - 8 hooks (post-task-completion, pre-implementation, etc.)

### Optional Plugins (70%+ Context Reduction)
- **specweave-github**: GitHub Issues integration
- **specweave-frontend**: React, Next.js, design systems
- **specweave-kubernetes**: K8s, Helm charts
- **specweave-ml**: TensorFlow, PyTorch, ML ops
- **specweave-payments**: Stripe, billing, subscriptions

## Workflow & Process

### Development Methodologies
- **TDD** (Test-Driven Development): Red-green-refactor cycle
- **BDD** (Behavior-Driven Development): Given/When/Then format
- **Increment-Based Development**: Focused work units
- **WIP Limits**: Maximum 1-2 active increments
- **Living Completion Reports**: Real-time scope tracking

### Quality Gates
- **Rule-Based Validation**: `/specweave:validate`
- **AI Quality Assessment**: `/specweave:qa` with BMAD risk scoring
- **Test Coverage**: 80-90% realistic targets (not 100%!)
- **AC-ID Coverage**: All acceptance criteria must have tests

## Documentation Structure

### Internal Documentation (.specweave/docs/internal/)
- **Strategy**: Business rationale (PRDs, OKRs, vision)
- **Specs**: Living specifications (feature-level knowledge base)
- **Architecture**: Technical design (HLD, LLD, ADRs, diagrams)
- **Delivery**: Build & release processes (roadmap, DORA metrics)
- **Operations**: Production operations (runbooks, SLOs, incidents)
- **Governance**: Policies (security, compliance, coding standards)

### Document Types
- **PRD** (Product Requirements Document): Business rationale
- **HLD** (High-Level Design): System architecture
- **LLD** (Low-Level Design): Component details
- **ADR** (Architecture Decision Record): Why we chose X over Y
- **RFC** (Request for Comments): Proposal for significant changes
- **Runbook**: Operational procedures

## Integration & Sync

### Multi-Project Sync
- **Sync Profile**: External repository configuration
- **Project Context**: Logical work grouping
- **Time Range**: Filter data by creation date (1W, 1M, 3M, 6M, ALL)
- **Rate Limiting**: API call protection (pre-flight validation)

### External Tools
- **GitHub Issues**: Increment ↔ issue bidirectional sync
- **Jira**: Epic/story integration
- **Azure DevOps**: Work item tracking

## Architecture & Design

### Architectural Patterns
- **Modular Plugin Architecture**: 70%+ context reduction
- **Source of Truth Discipline**: Single location for all truth
- **Root-Level .specweave/**: One central location (no nesting)
- **Two-Location Specs**: Living docs (permanent) vs increment specs (temporary)

### Architecture Decisions
- **ADR**: Document why we chose X over Y
- **C4 Model**: Context, Container, Component, Code diagrams
- **Mermaid Diagrams**: Visual architecture in markdown

## Testing & Quality

### Testing Layers
- **Unit Tests**: Pure logic testing (85-90% coverage)
- **Integration Tests**: API + DB testing (80-85% coverage)
- **E2E Tests**: Browser automation (100% critical paths only)
- **Overall Coverage**: 80-90% (realistic, not 100%)

### Test Formats
- **BDD** (Given/When/Then): Behavior-driven test scenarios
- **AC-ID Traceability**: Tests link back to acceptance criteria
- **Embedded Test Plans**: Tests in tasks.md (not separate file)
- **TDD Workflow**: Write tests first (red-green-refactor)

## DevOps & Tools

### CI/CD & Deployment
- **DORA Metrics**: Deployment frequency, lead time, MTTR, change failure rate
- **Git Workflow**: Branch strategy, pull request discipline
- **Brownfield**: Existing project integration
- **Greenfield**: New project setup

### Issue Tracking
- **GitHub Issues**: Native integration
- **Jira**: Enterprise project tracking
- **Azure DevOps**: Microsoft ecosystem

## How to Use This Glossary

### 1. **Quick Lookup**
Search for specific terms using browser search (Cmd/Ctrl+F)

### 2. **Browse by Category**
Use the category sections above to explore related concepts

### 3. **Follow Related Terms**
Each term page includes "Related Terms" links for deep dives

### 4. **Traceability**
See how concepts connect: Spec → Tasks → Tests → Code

## Glossary Conventions

### Term Format
- **Bold**: Main term being defined
- *Italic*: Emphasis or alternative names
- `Code`: File names, commands, code examples

### Examples
Each term includes:
- **Definition**: What it is
- **What Problem Does It Solve?**: Why it exists
- **How It Works**: Implementation details
- **Real-World Example**: Practical usage
- **Related Terms**: Connections to other concepts

### Code Blocks
```bash
# Commands shown in bash format
/specweave:increment "feature"

# Output format shown with context
✅ Increment created!
```

```markdown
# Spec format shown in markdown
## US-001: User Story Title
- **AC-US1-01**: Acceptance criterion (P1, testable)
```

## Contributing to the Glossary

Missing a term? Found an error? Contributions welcome!

1. **Report Issues**: [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)
2. **Suggest Terms**: Use "Term Suggestion" issue template
3. **Improve Definitions**: Submit pull requests with better explanations
4. **Add Examples**: Real-world examples make terms clearer

## Related Documentation

- [Getting Started Guide](/docs/intro)
- [Core Concepts](/docs/glossary/terms/increment)
- [Complete Workflow](/docs/workflows/overview)
- [Commands Reference](/docs/commands/overview)
- [API Documentation](/docs/api/overview)

## Glossary Statistics

- **Total Terms**: 50+ (and growing)
- **Categories**: 8 major categories
- **SpecWeave-Specific**: 30+ framework terms
- **Industry Standard**: 20+ software engineering terms
- **Last Updated**: 2025-11-06

---

**Quick tip**: Bookmark this page for easy reference during development!
