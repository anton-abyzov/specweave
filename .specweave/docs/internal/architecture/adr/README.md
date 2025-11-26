# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for SpecWeave framework.

**Total ADRs**: 137
**Last Updated**: 2025-11-25

## What is an ADR?

An ADR documents a significant architectural decision along with its context and consequences.

## Format

Each ADR follows this structure:
- **Title**: Short descriptive name
- **Status**: Proposed | Accepted | Deprecated | Superseded
- **Context**: What is the issue we're addressing?
- **Decision**: What we decided to do
- **Consequences**: What becomes easier or harder

## Numbering Convention

Some ADR numbers have sub-parts (e.g., `0002-001`, `0003-007`). These indicate:
- **Parent ADR**: Main architectural decision
- **Sub-ADRs**: Detailed decisions within that domain

Duplicate numbers (e.g., two `0018-*` files) indicate decisions made in parallel during the same planning phase that address different aspects.

---

## Index by Category

### Core Architecture (0001-0010)

| ID | Title | Status |
|----|-------|--------|
| [0001](0001-tech-stack.md) | Technology Stack Selection | Accepted |
| [0002](0002-context-loading.md) | Context Loading Approach | Accepted |
| [0002-001](0002-001-agent-types-roles-vs-tools.md) | Agent Types: Roles vs Tools | Accepted |
| [0002-002](0002-002-skills-as-coordinators.md) | Skills as Coordinators | Accepted |
| [0003](0003-agent-vs-skill.md) | Agents vs Skills Architecture | Accepted |
| [0003-007](0003-007-intelligent-model-selection.md) | Intelligent Model Selection | Accepted |
| [0003-008](0003-008-cost-tracking-system.md) | Cost Tracking System | Accepted |
| [0003-009](0003-009-phase-detection-algorithm.md) | Phase Detection Algorithm | Accepted |
| [0004](0004-increment-structure.md) | Increment Auto-Numbering | Accepted |
| [0005](0005-documentation-philosophy.md) | Documentation Approach | Accepted |
| [0006](0006-deployment-targets.md) | Multi-Platform Deployment | Accepted |
| [0007](0007-testing-strategy.md) | 4-Level Testing Strategy | Accepted |
| [0007](0007-github-first-task-sync.md) | GitHub-First Task Sync | Accepted |
| [0008](0008-brownfield-support.md) | Brownfield Project Support | Accepted |
| [0009](0009-factory-pattern.md) | Agents/Skills Factory Pattern | Accepted |
| [0010](0010-append-only-increments.md) | Append-Only Increments | Accepted |

### AI & Model Selection (0011-0017)

| ID | Title | Status |
|----|-------|--------|
| [0011](0011-intelligent-model-selection.md) | Intelligent Model Selection | Superseded |
| [0012](0012-cost-tracking.md) | Cost Tracking | Accepted |
| [0013](0013-phase-detection.md) | Phase Detection | Accepted |
| [0014](0014-root-level-specweave-only.md) | Root-Level .specweave Only | Accepted |
| [0015](0015-hybrid-plugin-system.md) | Hybrid Plugin System | Accepted |
| [0016](0016-multi-project-external-sync.md) | Multi-Project External Sync | Accepted |
| [0017](0017-self-reflection-architecture.md) | Self-Reflection Architecture | Accepted |

### Brownfield & Classification (0018-0019)

| ID | Title | Status |
|----|-------|--------|
| [0018-brownfield](0018-brownfield-classification-algorithm.md) | Brownfield Classification Algorithm | Accepted |
| [0018-plugin](0018-plugin-validation.md) | Plugin Validation | Accepted |
| [0018-reflection](0018-reflection-model-selection.md) | Reflection Model Selection | Accepted |
| [0018-specs](0018-specs-organization-brownfield.md) | Specs Organization Brownfield | Accepted |
| [0018-strategy](0018-strategy-based-team-mapping.md) | Strategy-Based Team Mapping | Accepted |
| [0019-brownfield](0019-brownfield-first-implementation.md) | Brownfield-First Implementation | Accepted |
| [0019-reflection](0019-reflection-storage-format.md) | Reflection Storage Format | Accepted |
| [0019-test](0019-test-infrastructure-architecture.md) | Test Infrastructure Architecture | Accepted |

### CLI & Validation (0020-0021)

| ID | Title | Status |
|----|-------|--------|
| [0020](0020-cli-discipline-validation.md) | CLI Discipline Validation | Accepted |
| [0021](0021-pm-agent-enforcement.md) | PM Agent Enforcement | Accepted |

### GitHub Sync Architecture (0022-0032)

| ID | Title | Status |
|----|-------|--------|
| [0022](0022-github-sync-architecture.md) | GitHub Sync Architecture | Accepted |
| [0023-auto-id](0023-auto-id-generation-algorithm.md) | Auto ID Generation Algorithm | Accepted |
| [0023-multi-repo](0023-multi-repo-init-ux-architecture.md) | Multi-Repo Init UX Architecture | Accepted |
| [0024-repo-id](0024-repo-id-auto-generation.md) | Repo ID Auto-Generation | Accepted |
| [0024-root](0024-root-level-repository-structure.md) | Root-Level Repository Structure | Accepted |
| [0025-incremental](0025-incremental-state-persistence.md) | Incremental State Persistence | Accepted |
| [0025-setup](0025-setup-state-persistence.md) | Setup State Persistence | Accepted |
| [0026-api](0026-github-api-validation.md) | GitHub API Validation | Accepted |
| [0026-strategy](0026-github-validation-strategy.md) | GitHub Validation Strategy | Accepted |
| [0027-env](0027-env-file-structure.md) | Env File Structure | Accepted |
| [0027-folder](0027-root-level-folder-structure.md) | Root-Level Folder Structure | Accepted |
| [0028-env](0028-env-file-generation.md) | Env File Generation | Accepted |
| [0028-flatten](0028-flatten-internal-documentation-structure.md) | Flatten Internal Documentation | Accepted |
| [0030](0030-intelligent-living-docs-sync.md) | Intelligent Living Docs Sync | Accepted |
| [0031-001](0031-001-status-mapping-strategy.md) | Status Mapping Strategy | Accepted |
| [0031-002](0031-002-conflict-resolution-approach.md) | Conflict Resolution Approach | Accepted |
| [0031-003](0031-003-bidirectional-sync-implementation.md) | Bidirectional Sync Implementation | Accepted |
| [0031-actions](0031-github-actions-polling-vs-webhooks.md) | GitHub Actions: Polling vs Webhooks | Accepted |
| [0032-haiku](0032-haiku-vs-sonnet-for-log-parsing.md) | Haiku vs Sonnet for Log Parsing | Accepted |
| [0032-gap](0032-increment-number-gap-prevention.md) | Increment Number Gap Prevention | Accepted |
| [0032-hierarchy](0032-universal-hierarchy-mapping.md) | Universal Hierarchy Mapping | Accepted |

### Reopen & Backlog (0033-0034)

| ID | Title | Status |
|----|-------|--------|
| [0033-auto](0033-auto-apply-vs-manual-review-for-fixes.md) | Auto-Apply vs Manual Review | Accepted |
| [0033-reopen](0033-smart-reopen-functionality.md) | Smart Reopen Functionality | Accepted |
| [0034](0034-increment-backlog-status.md) | Increment Backlog Status | Accepted |

### Kafka Plugin Architecture (0035-0039)

| ID | Title | Status |
|----|-------|--------|
| [0035](0035-kafka-multi-plugin-architecture.md) | Kafka Multi-Plugin Architecture | Accepted |
| [0036](0036-kafka-mcp-server-selection.md) | Kafka MCP Server Selection | Accepted |
| [0037](0037-kafka-terraform-provider-strategy.md) | Kafka Terraform Provider Strategy | Accepted |
| [0038-kafka](0038-kafka-monitoring-stack-selection.md) | Kafka Monitoring Stack Selection | Accepted |
| [0038-serverless](0038-serverless-platform-knowledge-base.md) | Serverless Platform Knowledge Base | Accepted |
| [0039-context](0039-context-detection-strategy.md) | Context Detection Strategy | Accepted |
| [0039-n8n](0039-n8n-kafka-integration-approach.md) | n8n Kafka Integration Approach | Accepted |

### Infrastructure & Templates (0040-0041)

| ID | Title | Status |
|----|-------|--------|
| [0040](0040-iac-template-engine.md) | IaC Template Engine | Accepted |
| [0041](0041-cost-estimation-algorithm.md) | Cost Estimation Algorithm | Accepted |

### Testing Infrastructure (0042)

| ID | Title | Status |
|----|-------|--------|
| [0042](0042-agent-enhancement-pattern.md) | Agent Enhancement Pattern | Accepted |
| [0042-01](0042-01-test-structure-standardization.md) | Test Structure Standardization | Accepted |
| [0042-02](0042-02-test-isolation-enforcement.md) | Test Isolation Enforcement | Accepted |
| [0042-03](0042-03-fixture-architecture.md) | Fixture Architecture | Accepted |
| [0042-04](0042-04-naming-convention-test-only.md) | Naming Convention Test-Only | Accepted |

### Spec Sync & Workflow (0043-0047)

| ID | Title | Status |
|----|-------|--------|
| [0043-frontmatter](0043-spec-frontmatter-sync-strategy.md) | Spec Frontmatter Sync Strategy | Accepted |
| [0043-source](0043-spec-md-source-of-truth.md) | spec.md Source of Truth | Accepted |
| [0043-workflow](0043-workflow-orchestration-architecture.md) | Workflow Orchestration Architecture | Accepted |
| [0044-phase](0044-phase-detection-enhancement.md) | Phase Detection Enhancement | Accepted |
| [0044-yaml](0044-yaml-parser-gray-matter.md) | YAML Parser: gray-matter | Accepted |
| [0045-atomic](0045-atomic-update-rollback.md) | Atomic Update Rollback | Accepted |
| [0045-autonomous](0045-autonomous-mode-safety.md) | Autonomous Mode Safety | Accepted |
| [0047](0047-three-file-structure-canonical-definition.md) | Three-File Structure Definition | Accepted |

### Repository & Plugin Architecture (0048-0051)

| ID | Title | Status |
|----|-------|--------|
| [0048-marketplace](0048-claude-code-marketplace-symlink-requirement.md) | Marketplace Symlink Requirement | Accepted |
| [0048-repository](0048-repository-provider-architecture.md) | Repository Provider Architecture | Accepted |
| [0049-hook](0049-claude-code-hook-schema-correction.md) | Hook Schema Correction | Accepted |
| [0049-jira](0049-jira-auto-discovery-and-hierarchy.md) | JIRA Auto-Discovery & Hierarchy | Accepted |
| [0050](0050-secrets-config-separation.md) | Secrets/Config Separation | Accepted |
| [0051](0051-smart-caching-with-ttl.md) | Smart Caching with TTL | Accepted |

### CLI UX & Pagination (0052-0055)

| ID | Title | Status |
|----|-------|--------|
| [0052-cli](0052-cli-first-defaults-and-smart-pagination.md) | CLI-First Defaults & Smart Pagination | Accepted |
| [0052-pagination](0052-smart-pagination.md) | Smart Pagination | Accepted |
| [0052-limit](0052-smart-pagination-50-project-limit.md) | Smart Pagination 50-Project Limit | Accepted |
| [0053-defaults](0053-cli-first-defaults.md) | CLI-First Defaults | Accepted |
| [0053-philosophy](0053-cli-first-defaults-philosophy.md) | CLI-First Defaults Philosophy | Accepted |
| [0053-tracking](0053-progress-tracking-and-cancelation.md) | Progress Tracking & Cancelation | Accepted |
| [0054](0054-ado-area-path-mapping.md) | ADO Area Path Mapping | Accepted |
| [0055-tracking](0055-progress-tracking.md) | Progress Tracking | Accepted |
| [0055-cancel](0055-progress-tracking-cancelation.md) | Progress Tracking Cancelation | Accepted |

### Performance & Async (0056-0059)

| ID | Title | Status |
|----|-------|--------|
| [0056](0056-three-tier-dependency-loading.md) | Three-Tier Dependency Loading | Accepted |
| [0057](0057-async-batch-fetching.md) | Async Batch Fetching | Accepted |
| [0058](0058-progress-tracking-implementation.md) | Progress Tracking Implementation | Accepted |
| [0059](0059-cancelation-strategy.md) | Cancelation Strategy | Accepted |

### Hook System (0060, 0070-0073, 0128, 0130)

| ID | Title | Status |
|----|-------|--------|
| [0060](0060-hook-performance-optimization.md) | Hook Performance Optimization | Accepted |
| [0070](0070-hook-consolidation.md) | Hook Consolidation (33% reduction) | Accepted |
| [0071](0071-remove-unused-permissions-configuration.md) | Remove Unused Permissions Config | Accepted |
| [0072](0072-post-task-hook-simplification.md) | Post-Task Hook Simplification | Accepted |
| [0073](0073-hook-recursion-prevention.md) | Hook Recursion Prevention | Accepted |
| [0128](0128-hierarchical-hook-early-exit.md) | Hierarchical Hook Early Exit | Accepted |
| [0130](0130-hook-bulk-operation-detection.md) | Hook Bulk Operation Detection | Accepted |

### Increment Lifecycle (0061-0068)

| ID | Title | Status |
|----|-------|--------|
| [0061](0061-no-increment-to-increment-references.md) | No Increment-to-Increment References | Accepted |
| [0062](0062-github-first-development-workflow.md) | GitHub-First Development Workflow | Accepted |
| [0063](0063-mandatory-post-closure-quality-assessment.md) | Mandatory Post-Closure QA | Accepted |
| [0064](0064-ac-embedding-mandatory-architecture.md) | AC Embedding Mandatory Architecture | Accepted |
| [0065](0065-three-tier-permission-gates.md) | Three-Tier Permission Gates | Accepted |
| [0066](0066-sync-coordinator-integration-point.md) | Sync Coordinator Integration Point | Accepted |
| [0067](0067-three-layer-idempotency-caching.md) | Three-Layer Idempotency Caching | Accepted |
| [0068](0068-circuit-breaker-error-isolation.md) | Circuit Breaker Error Isolation | Accepted |

### Git Provider Abstraction (0069)

| ID | Title | Status |
|----|-------|--------|
| [0069](0069-git-provider-abstraction-layer.md) | Git Provider Abstraction Layer | Accepted |

### Command Architecture (0118-0126)

| ID | Title | Status |
|----|-------|--------|
| [0118](0118-command-interface-pattern.md) | Command Interface Pattern | Accepted |
| [0119](0119-git-integration-strategy.md) | Git Integration Strategy | Accepted |
| [0120](0120-github-integration-approach.md) | GitHub Integration Approach | Accepted |
| [0121](0121-validation-engine-design.md) | Validation Engine Design | Accepted |
| [0122](0122-audit-log-format.md) | Audit Log Format | Accepted |
| [0123](0123-deletion-orchestration-pattern.md) | Deletion Orchestration Pattern | Accepted |
| [0124](0124-atomic-deletion-with-transaction-rollback.md) | Atomic Deletion with Rollback | Accepted |
| [0125](0125-incremental-vs-batch-deletion.md) | Incremental vs Batch Deletion | Accepted |
| [0126](0126-confirmation-ux-multi-gate-pattern.md) | Confirmation UX Multi-Gate Pattern | Accepted |

### Agent & Sync Patterns (0127, 0129, 0131-0142)

| ID | Title | Status |
|----|-------|--------|
| [0127](0127-agent-chunking-pattern.md) | Agent Chunking Pattern | Accepted |
| [0129](0129-us-sync-guard-rails.md) | US Sync Guard Rails | Accepted |
| [0131](0131-external-tool-sync-context-detection.md) | External Tool Sync Context Detection | Accepted |
| [0132](0132-avoid-early-returns-in-routing-code.md) | Avoid Early Returns in Routing | Accepted |
| [0133](0133-skills-must-not-spawn-large-agents.md) | Skills Must NOT Spawn Large Agents | Accepted |
| [0134](0134-external-tool-detection-enhancement.md) | External Tool Detection Enhancement | Accepted |
| [0135](0135-increment-creation-sync-orchestration.md) | Increment Creation Sync Orchestration | Accepted |
| [0136](0136-github-config-detection-timing.md) | GitHub Config Detection Timing | Accepted |
| [0137](0137-multi-location-github-config-detection.md) | Multi-Location GitHub Config Detection | Accepted |
| [0138](0138-init-command-modular-architecture.md) | Init Command Modular Architecture | Accepted |
| [0139](0139-unified-post-increment-github-sync.md) | Unified Post-Increment GitHub Sync | Accepted |
| [0140](0140-code-over-mcp.md) | Code Over MCP | Accepted |
| [0141](0141-repo-name-as-project-id.md) | Repo Name as Project ID | Accepted |
| [0142](0142-umbrella-multi-repo-support.md) | Umbrella Multi-Repo Support | Accepted |

---

## Key ADRs by Topic

### Must-Read for Contributors
- [0001](0001-tech-stack.md) - Technology choices
- [0047](0047-three-file-structure-canonical-definition.md) - spec.md/plan.md/tasks.md
- [0061](0061-no-increment-to-increment-references.md) - Architecture constraint
- [0069](0069-git-provider-abstraction-layer.md) - Multi-provider support
- [0133](0133-skills-must-not-spawn-large-agents.md) - Crash prevention

### GitHub Integration
- [0022](0022-github-sync-architecture.md) - Core sync architecture
- [0137](0137-multi-location-github-config-detection.md) - Config detection
- [0139](0139-unified-post-increment-github-sync.md) - Post-increment sync

### Hook System
- [0060](0060-hook-performance-optimization.md) - Performance
- [0070](0070-hook-consolidation.md) - 33% hook reduction
- [0073](0073-hook-recursion-prevention.md) - Safety

### Recent Additions (0118+)
These ADRs document the latest architectural decisions for command patterns, deletion safety, and multi-repo support.

---

## Related

- [Architecture Overview](../README.md)
- [CLAUDE.md](../../../../CLAUDE.md) - Complete development guide
- [Governance](../../governance/) - Coding standards and security
