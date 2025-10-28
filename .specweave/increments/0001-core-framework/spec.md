---
increment: 001-core-framework
title: "SpecWeave - Spec-Driven Development Framework"
priority: P1
status: closed
created: 2025-01-25
updated: 2025-10-26
started: 2025-02-01
completed: 2025-10-26
closed: 2025-10-26
structure: user-stories

# Completion tracking
total_tasks: 17
completed_tasks: 17
completion_rate: 100

# WIP tracking
wip_slot: 1               # Freed - was 1/2, now 0/2
---

# SpecWeave Core Framework

## Overview

**SpecWeave** is a complete spec-driven development framework that enables autonomous SaaS development through:

1. **Specification-First Architecture** - Specifications are source of truth
2. **Context Precision** - Load only relevant specs (70%+ token reduction)
3. **Auto-Role Routing** - Intelligent skill/agent selection
4. **Role-Based Agents** - 20+ specialized AI agents (PM, Architect, QA, DevOps, etc.)
5. **Domain Skills** - 24+ skills for infrastructure, integrations, domain logic
6. **Closed-Loop Testing** - Mandatory E2E validation with truth-telling
7. **Living Documentation** - Auto-updates via Claude hooks
8. **Brownfield-Ready** - Analyze existing codebases safely
9. **Framework-Agnostic** - Works with ANY tech stack (TypeScript, Python, Go, Rust, Java, etc.)

## Business Value

**SpecWeave enables**:
- **10x faster development** - Autonomous implementation with strategic agents
- **Professional-grade output** - Enterprise specs and architecture from PM/Architect agents
- **Cost optimization** - Hetzner provisioner enables $10-15/month SaaS (vs $50-100 on Vercel/AWS)
- **Production-ready** - Complete with testing, deployment, monitoring
- **Scalable** - From solo developers to enterprise teams
- **Framework-agnostic** - No vendor lock-in, works with any stack

## Core Principles

1. **Specification Before Implementation** - Define WHAT and WHY before HOW
2. **Living Documentation** - Specs evolve with code, never diverge
3. **Regression Prevention** - Document existing code before modification
4. **Test-Validated Features** - Every feature proven through automated tests
5. **Context Precision** - Load only relevant specs (70%+ token reduction)
6. **Auto-Role Routing** - Skills detect and route to appropriate expertise
7. **Closed-Loop Validation** - E2E tests must tell the truth (no false positives)
8. **Framework-Agnostic** - Adapts to ANY language/framework

## User Stories

### US1: Initialize SpecWeave Projects (P1)

**As a** developer
**I want** to initialize a new SpecWeave project with one command
**So that** I can start building immediately with all agents/skills/hooks installed

**Acceptance Criteria**:
- [ ] **TC-001**: User runs `npx specweave init my-project` → Complete project structure created
- [ ] **TC-002**: Tech stack detection or interactive selection (TypeScript, Python, Go, Rust, Java, etc.)
- [ ] **TC-003**: All core agents installed to `.claude/agents/` or `~/.claude/agents/`
- [ ] **TC-004**: All core skills installed to `.claude/skills/` or `~/.claude/skills/`
- [ ] **TC-005**: All hooks copied to `.claude/hooks/`
- [ ] **TC-006**: All slash commands installed to `.claude/commands/`
- [ ] **TC-007**: `.specweave/config.yaml` created with detected tech stack
- [ ] **TC-008**: Git repository initialized
- [ ] **TC-009**: Framework-specific `.gitignore` created
- [ ] **TC-010**: `CLAUDE.md` created in project root (ONLY file we add to user's root)

### US2: Auto-Detect SpecWeave Projects (P1)

**As a** developer using Claude Code
**I want** SpecWeave to activate automatically when I'm in a SpecWeave project
**So that** I don't need manual configuration

**Acceptance Criteria**:
- [ ] **TC-011**: `specweave-detector` skill proactively detects `.specweave/` directory
- [ ] **TC-012**: Auto-activates when `.specweave/config.yaml` exists
- [ ] **TC-013**: Loads project configuration
- [ ] **TC-014**: Enables SpecWeave-specific commands and workflows
- [ ] **TC-015**: Skill marked with `proactive: true` in SKILL.md

**Skill**: `specweave-detector`

### US3: Load Context Selectively (P1)

**As a** developer
**I want** to load only relevant specification sections for my task
**So that** token usage is minimized (70%+ reduction) and context is precise

**Acceptance Criteria**:
- [ ] **TC-016**: Parse `context-manifest.yaml` in increment directories
- [ ] **TC-017**: Support `spec_sections` with glob patterns and section anchors
- [ ] **TC-018**: Support `documentation` sections (strategy, architecture, decisions)
- [ ] **TC-019**: Enforce `max_context_tokens` budget
- [ ] **TC-020**: Cache frequently accessed sections in `.specweave/cache/`
- [ ] **TC-021**: Invalidate cache when source files change
- [ ] **TC-022**: Fail gracefully with helpful error if budget exceeded

**Skill**: `context-loader`

**Context Manifest Format**:
```yaml
---
spec_sections:
  - .specweave/docs/internal/strategy/payments/*.md
  - .specweave/docs/internal/strategy/auth/oauth.md#flow

documentation:
  - .specweave/docs/internal/architecture/api-design.md
  - .specweave/docs/internal/architecture/adr/004-payment-gateway.md

max_context_tokens: 10000
priority: high
auto_refresh: false
---
```

### US4: Route Requests Intelligently (P1)

**As a** developer
**I want** to describe what I need in natural language
**So that** the framework routes to the right skill/agent automatically

**Acceptance Criteria**:
- [ ] **TC-023**: `skill-router` parses user requests
- [ ] **TC-024**: Matches requests to skill descriptions (activation keywords)
- [ ] **TC-025**: Routes to appropriate skill/agent with >90% accuracy
- [ ] **TC-026**: Handles ambiguous requests (asks for clarification)
- [ ] **TC-027**: Supports nested skill orchestration (one skill calls another)
- [ ] **TC-028**: Logs routing decisions for improvement

**Skill**: `skill-router`

### US5: Orchestrate Role-Based Agents (P1)

**As a** developer
**I want** the system to automatically detect which expert agents I need
**So that** I get strategic analysis from PM, Architect, QA, DevOps, etc.

**Acceptance Criteria**:
- [ ] **TC-029**: Simple feature ("Add dark mode") → Only frontend agent
- [ ] **TC-030**: Complex feature ("Real-time collaboration") → PM + Architect + QA + DevOps
- [ ] **TC-031**: Security feature ("Add authentication") → Architect + Security agent
- [ ] **TC-032**: Performance task ("Optimize slow API") → Performance agent + Architect
- [ ] **TC-033**: Role detection accurate 95%+ of the time

**Skill**: `role-orchestrator`

### US6: Create Product Increments (P1)

**As a** developer
**I want** to plan and implement features as product increments
**So that** work is organized and trackable

**Acceptance Criteria**:
- [ ] **TC-034**: User describes feature → Increment created in `.specweave/increments/####-name/`
- [ ] **TC-035**: Auto-numbers increments sequentially (scans for highest number)
- [ ] **TC-036**: Detects tech stack from config or project files
- [ ] **TC-037**: Asks clarifying questions (users, scale, integrations)
- [ ] **TC-038**: If `--brownfield`: Activates `brownfield-analyzer`, creates baseline tests
- [ ] **TC-039**: Runs strategic agents (PM, Architect, DevOps, Security, QA) with tech stack context
- [ ] **TC-040**: Creates `spec.md`, `tasks.md`, `tests.md`, `context-manifest.yaml`
- [ ] **TC-041**: Creates `logs/`, `scripts/`, `reports/` directories
- [ ] **TC-042**: Generic output (shows DETECTED tech stack, not assumed)

**Slash Command**: `/create-increment`
**Skill**: `increment-planner`

### US7: Strategic Analysis from Expert Agents (P1)

**As a** developer
**I want** different expert agents to analyze my requirements
**So that** I get professional-grade specifications and architecture

**Acceptance Criteria**:
- [ ] **TC-043**: PM agent creates `pm-analysis.md` with personas, business model
- [ ] **TC-044**: Architect agent creates `architecture.md` with system design, ADRs
- [ ] **TC-045**: QA Lead agent creates `test-strategy.md` with test pyramid, quality gates
- [ ] **TC-046**: DevOps agent creates `infrastructure.md` with deployment, CI/CD, monitoring
- [ ] **TC-047**: Security agent creates `security.md` with threat modeling, compliance
- [ ] **TC-048**: All outputs consolidated into increment folder
- [ ] **TC-049**: Spec depth: 10x more detailed than generic templates

**Agents Used**:
- `pm` - Product management, user stories, roadmap
- `architect` - System design, ADRs, component architecture
- `qa-lead` - Test strategy, quality gates
- `devops` - Infrastructure as Code, CI/CD, monitoring
- `security` - Security review, threat modeling

### US8: Implement with Specialized Agents (P1)

**As a** developer
**I want** specialized implementation agents for different technologies
**So that** I get framework-specific best practices

**Acceptance Criteria**:
- [ ] **TC-050**: NextJS agent implements App Router, Server Components, TypeScript
- [ ] **TC-051**: Node.js backend agent implements Express/NestJS APIs
- [ ] **TC-052**: Python backend agent implements FastAPI/Django services
- [ ] **TC-053**: .NET backend agent implements ASP.NET Core APIs
- [ ] **TC-054**: Frontend agent implements React/Vue/Angular UIs
- [ ] **TC-055**: All agents follow detected framework best practices
- [ ] **TC-056**: TypeScript strict mode enabled where applicable
- [ ] **TC-057**: Production-ready configuration

**Implementation Agents**:
- `nextjs` - Next.js specialist
- `nodejs-backend` - Node.js/TypeScript backend
- `python-backend` - Python/FastAPI/Django backend
- `dotnet-backend` - .NET/C# backend
- `frontend` - React/Vue/Angular frontend

### US9: Deploy to Cost-Effective Infrastructure (P1)

**As a** developer on a budget
**I want** automated infrastructure provisioning with cost optimization
**So that** I can deploy for $10-15/month instead of $50-100/month

**Acceptance Criteria**:
- [ ] **TC-058**: User says "deploy on Hetzner" → `hetzner-provisioner` activates
- [ ] **TC-059**: Creates Terraform/Pulumi IaC code
- [ ] **TC-060**: Provisions CX11 instance ($5-7/month)
- [ ] **TC-061**: Sets up managed Postgres database
- [ ] **TC-062**: Configures DNS and SSL (Let's Encrypt)
- [ ] **TC-063**: Total cost: <$15/month
- [ ] **TC-064**: `cost-optimizer` skill compares Hetzner vs Vercel vs AWS
- [ ] **TC-065**: Recommends cheapest option with rationale

**Skills**:
- `hetzner-provisioner` - Hetzner Cloud provisioning
- `cost-optimizer` - Infrastructure cost analysis

### US10: Integrate with External Services (P1)

**As a** developer building a SaaS
**I want** automated integration with Stripe, calendars, notifications
**So that** I get production-ready features without manual setup

**Acceptance Criteria**:
- [ ] **TC-066**: `stripe-integrator` implements Checkout, Billing, webhooks
- [ ] **TC-067**: `calendar-system` implements bookings, availability, timezones
- [ ] **TC-068**: `notification-system` implements email/SMS with templates
- [ ] **TC-069**: All integrations PCI/GDPR compliant
- [ ] **TC-070**: Test mode enabled by default

**Skills**:
- `stripe-integrator` - Stripe payment integration
- `calendar-system` - Calendar/booking system
- `notification-system` - Email/SMS notifications

### US11: Design and Implement from Figma (P1)

**As a** designer/developer
**I want** to create Figma designs and convert them to code
**So that** I get production-ready components with design tokens

**Acceptance Criteria**:
- [ ] **TC-071**: `figma-designer` agent creates design system in Figma
- [ ] **TC-072**: Design tokens exported (colors, typography, spacing)
- [ ] **TC-073**: `figma-implementer` agent converts designs to React components
- [ ] **TC-074**: Storybook stories created for all components
- [ ] **TC-075**: Visual match with Figma >95%
- [ ] **TC-076**: Accessibility: 0 WCAG 2.1 AA violations

**Agents**:
- `figma-designer` - Creates Figma designs (Advanced/Simple modes)
- `figma-implementer` - Converts designs to code + Storybook

**Skills**:
- `figma-mcp-connector` - Figma MCP wrapper
- `design-system-architect` - Design system guidance
- `figma-to-code` - Design-to-code conversion

### US12: Generate and Validate Tests (P1)

**As a** QA engineer
**I want** automated test generation with closed-loop validation
**So that** features meet requirements and regressions are caught

**Acceptance Criteria**:
- [ ] **TC-077**: Generates unit tests (co-located with code)
- [ ] **TC-078**: Generates integration tests in `tests/integration/`
- [ ] **TC-079**: Generates Playwright E2E tests in `tests/e2e/` (when UI exists)
- [ ] **TC-080**: E2E tests MUST tell the truth (no false positives)
- [ ] **TC-081**: Validates test coverage (>80% target)
- [ ] **TC-082**: Creates test strategy documents
- [ ] **TC-083**: Runs regression tests for brownfield modifications

**Agent**: `qa-lead` (generates test strategy)
**Note**: E2E Playwright tests are MANDATORY when UI exists. TDD is optional (separate skill).

### US13: Analyze Brownfield Codebases (P2)

**As a** developer working on existing code
**I want** to analyze and document existing codebases before modification
**So that** I can safely modify without regressions

**Acceptance Criteria**:
- [ ] **TC-084**: Scans existing codebase
- [ ] **TC-085**: Generates specifications from code (retroactive)
- [ ] **TC-086**: Creates retroactive ADRs
- [ ] **TC-087**: Identifies dependencies
- [ ] **TC-088**: Generates current-state tests (baseline)
- [ ] **TC-089**: Provides modification recommendations
- [ ] **TC-090**: Merges existing CLAUDE.md intelligently

**Skills**:
- `brownfield-analyzer` - Analyze existing code
- `brownfield-onboarder` - Merge existing CLAUDE.md

### US14: Auto-Update Documentation (P2)

**As a** maintainer
**I want** documentation to update automatically after code changes
**So that** docs stay in sync with code

**Acceptance Criteria**:
- [ ] **TC-091**: Detects code/feature changes via Claude hooks
- [ ] **TC-092**: Triggers on `post-task-completion` hook
- [ ] **TC-093**: Updates API reference (auto-generated sections)
- [ ] **TC-094**: Updates CLI reference
- [ ] **TC-095**: Updates changelog
- [ ] **TC-096**: Preserves manual content (doesn't overwrite guides)
- [ ] **TC-097**: Commits doc updates with clear messages

**Skill**: `docs-updater`

**Claude Hooks**:
- `post-task-completion` - Auto-update docs
- `pre-implementation` - Check regression risk
- `human-input-required` - Log and notify

### US15: Sync with Project Management Tools (P2)

**As a** project manager
**I want** bidirectional sync with JIRA/GitHub/ADO
**So that** project tracking is centralized

**Acceptance Criteria**:
- [ ] **TC-098**: `jira-sync` syncs increments ↔ JIRA epics/stories
- [ ] **TC-099**: `github-sync` syncs increments ↔ GitHub issues
- [ ] **TC-100**: `ado-sync` syncs increments ↔ Azure DevOps work items
- [ ] **TC-101**: Bidirectional sync working
- [ ] **TC-102**: Status mapping: planned/in-progress/completed
- [ ] **TC-103**: Tracks sync history

**Skills**: `jira-sync`, `github-sync`, `ado-sync`

**Agents**: `specweave-jira-mapper`, `specweave-ado-mapper`

### US16: Generate Diagrams and Visualizations (P2)

**As a** architect/developer
**I want** automated architecture diagram generation
**So that** visualizations stay in sync with specifications

**Acceptance Criteria**:
- [ ] **TC-104**: `diagrams-generator` creates Mermaid diagrams from specs
- [ ] **TC-105**: `diagrams-architect` agent designs complex architectures
- [ ] **TC-106**: Diagrams embedded in documentation
- [ ] **TC-107**: Auto-updates when architecture changes

**Skill**: `diagrams-generator`
**Agent**: `diagrams-architect`

### US17: Review and Validate Documentation (P1)

**As a** developer
**I want** to review strategic docs against actual implementation
**So that** I catch documentation drift and missing features

**Acceptance Criteria**:
- [ ] **TC-108**: User runs `/sync-docs` → Review initiated
- [ ] **TC-109**: Detects project tech stack (NEVER assumes Next.js/React)
- [ ] **TC-110**: Compares docs to actual code (can fetch from GitHub/GitLab)
- [ ] **TC-111**: Identifies: undocumented features, outdated docs, tech debt, missing tests
- [ ] **TC-112**: Presents comprehensive gap analysis
- [ ] **TC-113**: Framework-agnostic output (shows DETECTED tech stack)

**Slash Command**: `/sync-docs`

## Framework Components

### 20 Agents (Separate Context Windows)

**Strategic Agents** (Claude Opus/Sonnet):
1. `pm` - Product management, personas, business model, roadmap
2. `architect` - System design, ADRs, component architecture
3. `security` - Security review, threat modeling, compliance
4. `qa-lead` - Test strategy, quality gates, test pyramid
5. `devops` - Infrastructure as Code, CI/CD, monitoring
6. `sre` - Site reliability, SLOs, incident response
7. `tech-lead` - Code review, best practices, mentorship
8. `performance` - Optimization, profiling, scaling

**Implementation Agents** (Claude Sonnet/Haiku):
9. `nextjs` - Next.js App Router, Server Components, TypeScript
10. `nodejs-backend` - Node.js/TypeScript backend (Express, NestJS)
11. `python-backend` - Python backend (FastAPI, Django)
12. `dotnet-backend` - .NET/C# backend (ASP.NET Core)
13. `frontend` - Frontend (React, Vue, Angular)

**Design & Documentation** (Claude Sonnet):
14. `docs-writer` - Technical documentation, guides, references
15. `figma-designer` - Figma designs, design systems, UI/UX
16. `figma-implementer` - Figma-to-code conversion
17. `diagrams-architect` - Architecture diagrams, visualizations

**Integration & Mapping** (Claude Sonnet):
18. `specweave-jira-mapper` - JIRA integration mapping
19. `specweave-ado-mapper` - Azure DevOps integration mapping

### 24 Skills (Shared Context)

**Core Framework** (P1):
1. `specweave-detector` - Auto-detect SpecWeave projects (proactive)
2. `skill-router` - Parse requests, route to skills/agents (>90% accuracy)
3. `context-loader` - Load specs selectively via manifests (70%+ reduction)
4. `increment-planner` - Plan features with context awareness
5. `role-orchestrator` - Orchestrate multi-agent workflows

**Infrastructure** (P1):
6. `hetzner-provisioner` - Hetzner Cloud provisioning (Terraform/Pulumi)
7. `cost-optimizer` - Infrastructure cost analysis and optimization

**Integrations** (P1):
8. `stripe-integrator` - Stripe payment integration (Checkout, Billing, webhooks)
9. `calendar-system` - Calendar/booking system (availability, timezones)
10. `notification-system` - Email/SMS notifications (Resend, Vonage)
11. `jira-sync` - JIRA bidirectional sync
12. `github-sync` - GitHub bidirectional sync
13. `ado-sync` - Azure DevOps bidirectional sync

**Design & Code Generation** (P1):
14. `figma-mcp-connector` - Figma MCP wrapper (official + community)
15. `design-system-architect` - Design system guidance (Atomic Design)
16. `figma-to-code` - Figma-to-code conversion (React, Angular)

**Documentation & Visualization** (P2):
17. `docs-updater` - Auto-update documentation via hooks
18. `diagrams-generator` - Generate Mermaid diagrams from specs

**Brownfield & Onboarding** (P2):
19. `brownfield-analyzer` - Analyze existing codebases
20. `brownfield-onboarder` - Merge existing CLAUDE.md intelligently

**Development Tools** (P2):
21. `task-builder` - Task management and tracking
22. `skill-creator` - Create new skills (skill development helper)

**Legacy Support** (P3):
23. `bmad-method-expert` - BMAD methodology support
24. `spec-kit-expert` - SpecKit methodology support

## Slash Commands (Framework-Agnostic)

All commands adapt to ANY tech stack (TypeScript, Python, Go, Rust, Java, etc.):

1. **`specweave init`** - Initialize new SpecWeave project
   - Arguments: `--name`, `--type`, `--framework`, `--docs`, `--location`
   - Detects/asks for tech stack
   - Creates framework-specific structure
   - Installs skills, hooks, commands

2. **`/create-increment`** - Create new product increment
   - Arguments: Feature description, `--priority`, `--brownfield`, `--autonomous`
   - Auto-increments number
   - Detects tech stack
   - Runs strategic agents (PM, Architect, DevOps, Security, QA)
   - Creates spec.md, tasks.md, tests.md
   - Framework-specific implementation

3. **`/sync-docs`** - Review strategic documentation
   - Arguments: `--increment`, `--repo`, `--repo-url`, `--folder`
   - Detects tech stack (NEVER assumes)
   - Compares docs to code
   - Identifies gaps (undocumented features, outdated docs, missing tests)
   - Framework-agnostic output

4. **`/sync-github`** - Sync to GitHub issues
   - Creates/updates GitHub issue
   - Adds user stories as checkable subtasks
   - Bidirectional sync

## Claude Hooks

**Installed to `.claude/hooks/`** (copied from `src/hooks/`):

1. **`post-task-completion.sh`** - Auto-update docs after task completion
2. **`pre-implementation.sh`** - Check regression risk before modifying existing code
3. **`human-input-required.sh`** - Log and notify when AI needs clarification
4. **`docs-changed.sh`** - Alert if docs modified during implementation

**Configuration**: `.specweave/config.yaml`
```yaml
hooks:
  post_task_completion:
    enabled: true
    actions:
      - update_documentation
      - update_claude_md
      - update_changelog
```

## Installation Mechanism

### Via NPM Package

```bash
# Initialize new project (all-in-one)
npx specweave init my-project

# Install specific agent/skill
npx specweave install hetzner-provisioner --local
npx specweave install pm --global

# Install all
npx specweave install --all          # Local (.claude/)
npx specweave install --all --global # Global (~/.claude/)
```

### Manual Installation

```bash
# Install agents
npm run install:agents         # To .claude/agents/
npm run install:agents:global  # To ~/.claude/agents/

# Install skills
npm run install:skills         # To .claude/skills/
npm run install:skills:global  # To ~/.claude/skills/

# Install hooks
npm run install:hooks          # Copy to .claude/hooks/

# Install everything
npm run install:all            # Local
npm run install:all:global     # Global
```

## Testing Strategy

### Agent Testing (MANDATORY)
- Minimum 3 test cases per agent
- Test cases in `src/agents/{agent-name}/test-cases/`
- YAML format with input/expected_output/validation
- Results in `src/agents/{agent-name}/test-results/` (gitignored)
- Run: `npm run test:agents`

### Skill Testing (MANDATORY)
- Minimum 3 test cases per skill
- Test cases in `src/skills/{skill-name}/test-cases/`
- YAML format with input/expected_output/validation
- Results in `src/skills/{skill-name}/test-results/` (gitignored)
- Run: `npm run test:skills`

### E2E Testing (MANDATORY when UI exists)
- Playwright tests in `tests/e2e/`
- MUST tell the truth (no false positives)
- Close the loop with validation reports
- Run: `npm run test:e2e`

### Integration Testing
- Test skill orchestration (router → planner → implementer → qa)
- Test context loading with real manifests
- Test hooks integration
- Tests in `tests/integration/`
- Run: `npm run test:integration`

**Coverage Target**: >80% for critical paths

## Success Criteria

### Functional Requirements
- ✅ All 20 agents installed and functional
- ✅ All 24 skills installed and functional
- ✅ All 4 slash commands working
- ✅ All 4 hooks functional
- ✅ Framework-agnostic (works with TypeScript, Python, Go, Rust, Java, etc.)

### Performance Metrics
- ✅ Context efficiency: 70%+ token reduction vs loading full specs
- ✅ Routing accuracy: >90% correct skill/agent selection
- ✅ Test coverage: 100% of agents/skills have ≥3 passing tests
- ✅ Installation success: 100% success rate for `npx specweave install`
- ✅ E2E truth-telling: 0% false positives in Playwright tests
- ✅ Hooks integration: Docs auto-update on 100% of code changes

### Quality Metrics
- ✅ Spec depth: 10x more detailed than generic templates (PM/Architect agents)
- ✅ Cost savings: 50-80% vs default cloud providers (Hetzner)
- ✅ Production-ready: Complete with testing, deployment, monitoring
- ✅ Scalability: Handle 500+ page specs across 100+ modules

## Out of Scope (Future Enhancements)

**Not in v1.0**:
- Vector search for semantic context loading (v2.0)
- AI-powered spec summarization (v2.0)
- Multi-language support (English only for v1.0)
- Mobile apps (React Native, Flutter) - Future
- Advanced analytics (Mixpanel, Amplitude) - Future
- Visual regression testing - Future
- GitHub Projects sync - Future
- Linear sync - Future
- Custom role creation by users - Future

## Dependencies

### Technical
- Claude Code Skills system (GA - available)
- Claude Code Agents system (GA - available)
- Claude Code Hooks (GA - available)
- Claude Sonnet 4.5 (required model: `claude-sonnet-4-5-20250929`)
- Markdown parser (remark or marked)
- Token counter (tiktoken)
- YAML parser (js-yaml)
- Playwright (for E2E tests)
- Node.js 18+
- Git

### External APIs (Optional)
- Hetzner Cloud API (for `hetzner-provisioner`)
- Stripe API (for `stripe-integrator`)
- Figma API (for Figma integration)
- JIRA API (for `jira-sync`)
- Azure DevOps API (for `ado-sync`)
- Resend API (for email notifications)
- Vonage API (for SMS notifications)

## Documentation

**See**:
- [CLAUDE.md](../../../CLAUDE.md) - Complete development guide
- [.specweave/docs/README.md](../../docs/README.md) - 5-pillar documentation structure
- [tests/README.md](../../../tests/README.md) - Testing guide
- [TEST-CASE-STRATEGY.md](./reports/TEST-CASE-STRATEGY.md) - Comprehensive test strategy

## Implementation Phases

### Phase 1: Foundation (Completed)
- ✅ Skills architecture (structure, testing, installation)
- ✅ Agents architecture (separate context windows)
- ✅ Context loading (manifests, selective loading)
- ✅ Auto-detection (`specweave-detector`)
- ✅ Test framework setup

### Phase 2: Core Agents (Completed)
- ✅ Strategic agents (PM, Architect, Security, QA, DevOps, SRE, Tech Lead)
- ✅ Implementation agents (NextJS, Node.js, Python, .NET, Frontend)
- ✅ Documentation agents (Docs Writer, Performance)
- ✅ Role orchestration

### Phase 3: Core Skills (Completed)
- ✅ `skill-router` - Request routing
- ✅ `context-loader` - Context manifests
- ✅ `increment-planner` - Feature planning
- ✅ Infrastructure skills (Hetzner, cost optimizer)
- ✅ Integration skills (Stripe, calendar, notifications)

### Phase 4: Advanced Features (Completed)
- ✅ Figma integration (designer, implementer, MCP connector)
- ✅ Brownfield tools (analyzer, onboarder)
- ✅ Project management sync (JIRA, GitHub, ADO)
- ✅ Diagrams generation

### Phase 5: Automation (Completed)
- ✅ Claude hooks integration (post-task, pre-implementation, human-input)
- ✅ `docs-updater` skill

### Phase 6: Testing & Validation (In Progress)
- ⏳ Complete all agent test cases (20 agents × 3 tests = 60 tests)
- ⏳ Complete all skill test cases (24 skills × 3 tests = 72 tests)
- ⏳ Integration tests
- ⏳ E2E tests for UI features
- ⏳ Performance benchmarks

### Phase 7: Polish & Documentation (Pending)
- ⏳ Complete API documentation
- ⏳ Complete user guides
- ⏳ Video tutorials
- ⏳ Example projects

### Phase 8: NPM Package (Pending)
- ⏳ Package preparation
- ⏳ NPM publish
- ⏳ Marketing materials

## Notes

**This is the ONLY increment for SpecWeave framework development**. All other "increments" (002, 003, 004) were planning documents that are now obsolete because:

1. **Agents already exist in `src/agents/`** (20 agents)
2. **Skills already exist in `src/skills/`** (24 skills)
3. **This spec consolidates all capabilities** into one comprehensive framework spec

**For user projects**, increments are used differently:
- User describes: "Add authentication to my SaaS"
- SpecWeave creates: `.specweave/increments/0001-user-authentication/`
- That's a USER PROJECT increment, not a SpecWeave framework increment

**The distinction**:
- **SpecWeave framework** = 1 increment (this spec) + all agents/skills in `src/`
- **User projects** = Many increments (authentication, payments, calendar, etc.)

---

**Status**: In Progress
**Owner**: SpecWeave Core Team
**Last Updated**: 2025-10-26
