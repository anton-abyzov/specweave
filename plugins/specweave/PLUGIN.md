# SpecWeave Core

**Version**: 1.0.227
**Author**: SpecWeave Contributors
**License**: MIT

## Description

SpecWeave framework core plugin. Provides increment planning (PM, Architect, Tech Lead agents), specification generation, TDD workflow, living docs sync, and brownfield support. Essential for all SpecWeave projects.

## Skills

| Skill | Description |
|-------|-------------|
| pm | Product Manager for spec-driven development with user stories, acceptance criteria, and MVP planning |
| architect | System architect for scalable, maintainable technical designs and ADRs |
| pm-closure-validation | PM validation for increment closure with 3-gate quality checks |
| roadmap-planner | Product roadmap and feature prioritization with RICE, MoSCoW, and Kano frameworks |
| spec-generator | Generates comprehensive specifications (spec.md, plan.md, tasks.md) for increments |
| test-aware-planner | Generate tasks.md with embedded BDD test plans |
| tdd-orchestrator | TDD orchestrator for strict red-green-refactor discipline |
| code-simplifier | Code refinement agent that simplifies and improves code clarity |
| performance | Performance engineering for web apps, databases, and distributed systems |
| security | Security engineer for vulnerability assessment and secure code review |
| security-patterns | Real-time security pattern detector for dangerous code patterns |
| compliance-architecture | Enterprise compliance architecture for SOC 2, HIPAA, GDPR, PCI-DSS |
| serverless-recommender | Serverless platform selection expert for AWS Lambda, Azure Functions, etc. |
| service-connect | Smart external service connection orchestrator (MCP, REST, SDK, CLI) |
| external-sync-wizard | Guide for bidirectional sync with GitHub, JIRA, Azure DevOps |
| docs-updater | Living documentation updater that syncs implementation progress |
| update-instructions | Smart merge for CLAUDE.md and AGENTS.md instruction files |
| translator | LLM-native translation skill for SpecWeave content |
| framework | Expert on SpecWeave framework structure, rules, and conventions |
| detector | Detects SpecWeave context and provides workflow documentation |
| increment-work-router | Smart work continuation that routes to /sw:do or /sw:increment |
| smart-reopen-detector | Detects issues with recently completed work and suggests reopening |
| archive-increments | Intelligent increment archiving with 10-10-10 rule |
| umbrella-repo-detector | Detects multi-repo architecture patterns |
| multi-project-spec-mapper | Maps user stories to correct projects (FE, BE, MOBILE, INFRA) |
| progress-sync | Progress synchronization for multi-system sync |
| grill | Critical code review before increment completion |
| self-validating-example | Example skill demonstrating self-validating REST API generation |
| lsp | Language Server Protocol support for code navigation |

## Commands

| Command | Description |
|---------|-------------|
| /sw:increment | Plan new Product Increment with spec.md, plan.md, tasks.md |
| /sw:do | Execute increment implementation following spec and plan |
| /sw:progress | Show detailed progress for active increments |
| /sw:done | Close increment with PM validation (3-gate quality check) |
| /sw:auto | Start autonomous execution with stop hook feedback loop |
| /sw:auto-status | Show current auto session status and progress |
| /sw:cancel-auto | Emergency cancel of running auto session |
| /sw:auto-parallel | Enable parallel agent execution for multi-domain features |
| /sw:save | Smart save with auto-generated commits and git handling |
| /sw:validate | Validate increment with rule-based checks and AI assessment |
| /sw:qa | Run quality assessment with risk scoring and gate decisions |
| /sw:judge-llm | Ultrathink LLM-as-Judge validation of completed work |
| /sw:status | Show increment status overview (active, backlog, paused, etc.) |
| /sw:next | Smart increment transition - auto-close and suggest next work |
| /sw:pause | Pause an active increment |
| /sw:resume | Resume a paused or backlog increment |
| /sw:abandon | Abandon an incomplete increment |
| /sw:archive | Manually archive completed increments |
| /sw:restore | Restore archived increments back to active |
| /sw:reopen | Reopen a completed increment for additional work |
| /sw:backlog | Move an increment to backlog |
| /sw:plan | Generate plan.md and tasks.md using Architect Agent |
| /sw:increment-planner | Plan and create increments with PM and Architect collaboration |
| /sw:increment-quality-judge-v2 | AI-powered quality assessment with BMAD risk scoring |
| /sw:tdd-cycle | Execute comprehensive TDD workflow with strict discipline |
| /sw:tdd-red | Write comprehensive failing tests (TDD red phase) |
| /sw:tdd-green | Implement minimal code to make tests pass (TDD green phase) |
| /sw:tdd-refactor | Refactor code with comprehensive test safety net |
| /sw:sync-docs | Strategic documentation sync (review or export) |
| /sw:sync-specs | Sync increment specifications to living docs structure |
| /sw:sync-tasks | Sync tasks.md with actual completion status |
| /sw:sync-progress | Comprehensive progress sync to all systems |
| /sw:sync-status | Detect and fix status desyncs |
| /sw:sync-acs | Synchronize acceptance criteria checkbox status |
| /sw:embed-acs | Auto-embed Acceptance Criteria from living docs |
| /sw:living-docs | Launch Living Docs Builder independently |
| /sw:import-docs | Import brownfield documentation |
| /sw:import-external | Auto-import external work items (GitHub/JIRA/ADO) |
| /sw:external | View external items dashboard |
| /sw:notifications | View and manage sync notifications |
| /sw:discrepancies | View and manage code-to-spec discrepancies |
| /sw:discrepancy-to-increment | Convert discrepancies into new increment |
| /sw:update-scope | Update living completion report with scope changes |
| /sw:fix-duplicates | Detect and resolve duplicate increments |
| /sw:reconcile | Reconcile increment ID collisions after merge |
| /sw:revert-wip-limit | Revert WIP limit to original value |
| /sw:reflect | Analyze session and extract learnings to CLAUDE.md |
| /sw:reflect-on | Enable automatic reflection on session end |
| /sw:reflect-off | Disable automatic reflection |
| /sw:reflect-status | Show reflection configuration and statistics |
| /sw:reflect-check | Diagnostic tool for reflection system health |
| /sw:reflect-clear | Clear specific learnings from Skill Memories |
| /sw:code-reviewer | Elite multi-agent code review system |
| /sw:code-standards-analyzer | Generate coding standards from codebase patterns |
| /sw:grill | Comprehensive implementation auditor |
| /sw:feature-dev | Feature Development Workflow (7-phase structured approach) |
| /sw:role-orchestrator | Multi-agent orchestration for complex tasks |
| /sw:brownfield-analyzer | Analyze brownfield projects for SpecWeave migration |
| /sw:brownfield-onboarder | Onboard brownfield projects with CLAUDE.md merge |
| /sw:docs-writer | Technical documentation writer |
| /sw:translate | Translate SpecWeave project content |
| /sw:skill | Create and validate Claude Code skills |
| /sw:export-skills | Export skills to Agent Skills open standard format |
| /sw:check-hooks | Comprehensive hook health check |
| /sw:validate-features | Validate feature folder consistency |
| /sw:api-docs | Generate API documentation (OpenAPI, Postman) |
| /sw:npm | Full patch release with npm publish |
| /sw-media:image | AI image generation (Google Imagen 4 / Pollinations.ai) |
| /sw-media:video | AI video generation (Google Veo 3.1 / Pollinations.ai) |
| /sw-media:remotion | Programmatic video from React with Remotion |
| /sw:analytics | Show usage analytics dashboard |
| /sw:plugin-validator | Validate SpecWeave plugin installation |
| /sw:migrate-config | Migrate configuration to split secrets/config format |

## Installation

```bash
claude plugin install sw@specweave
```

## Requirements

- Claude Code 2.1.0+
- Node.js 18+ (for CLI tools)
- Git (for version control integration)
