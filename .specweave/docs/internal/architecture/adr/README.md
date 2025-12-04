# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for SpecWeave framework.

**Total ADRs**: 121
**Last Updated**: 2025-11-26

## What is an ADR?

An ADR documents a significant architectural decision along with its context and consequences.

## Format

Each ADR follows this structure:
- **Title**: Short descriptive name
- **Status**: Proposed | Accepted | Deprecated | Superseded
- **Context**: What is the issue we're addressing?
- **Decision**: What we decided to do
- **Consequences**: What becomes easier or harder

---

## Complete Index

| ID | Title | Status |
|----|-------|--------|
| [0001](./0001-tech-stack) | Technology Stack Selection | Accepted |
| [0002](./0002-agent-types-roles-vs-tools) | Agent Types - Roles vs Tools | Accepted |
| [0003](./0003-intelligent-model-selection) | Intelligent Model Selection Architecture | Accepted |
| [0004](./0004-increment-structure) | Increment Auto-Numbering Structure | Accepted |
| [0005](./0005-documentation-philosophy) | Documentation Philosophy | Accepted |
| [0006](./0006-deployment-targets) | Multi-Platform Deployment Intelligence | Accepted |
| [0007](./0007-github-first-task-sync) | GitHub-First Task-Level Synchronization | Accepted |
| [0008](./0008-brownfield-support) | Brownfield Project Support | Accepted |
| [0009](./0009-factory-pattern) | Agents/Skills Factory Pattern | Accepted |
| [0010](./0010-append-only-increments) | Append-Only Increments + Living Documentation | Accepted |
| [0011](./0011-intelligent-model-selection) | Intelligent Model Selection | Superseded |
| [0012](./0012-cost-tracking) | Cost Tracking System | Superseded |
| [0013](./0013-phase-detection) | Phase Detection Algorithm | Superseded |
| [0014](./0014-root-level-specweave-only) | Root-Level .specweave/ Only | Accepted |
| [0015](./0015-hybrid-plugin-system) | Hybrid Plugin System | Superseded |
| [0016](./0016-multi-project-external-sync) | Multi-Project External Sync Architecture | Proposed |
| [0017](./0017-self-reflection-architecture) | Self-Reflection System Architecture | Accepted |
| [0018](./0018-brownfield-classification-algorithm) | Brownfield Classification Algorithm | Accepted |
| [0019](./0019-brownfield-first-implementation) | Brownfield-First Architecture | Accepted |
| [0020](./0020-cli-discipline-validation) | CLI Discipline Validation Command | Accepted |
| [0021](./0021-pm-agent-enforcement) | PM Agent Enforcement Integration | Accepted |
| [0022](./0022-github-sync-architecture) | GitHub Sync Verification Architecture | Accepted |
| [0023](./0023-auto-id-generation-algorithm) | Auto-ID Generation Algorithm | Accepted |
| [0024](./0024-repo-id-auto-generation) | Repository ID Auto-Generation Strategy | Accepted |
| [0025](./0025-incremental-state-persistence) | Incremental State Persistence | Accepted |
| [0026](./0026-github-api-validation) | GitHub API Validation Approach | Accepted |
| [0027](./0027-env-file-structure) | .env File Structure | Accepted |
| [0028](./0028-env-file-generation) | .env File Generation Strategy | Accepted |
| [0030](./0030-intelligent-living-docs-sync) | Intelligent Living Docs Sync Architecture | Proposed |
| [0031](./0031-status-mapping-strategy) | Status Mapping Strategy | Accepted |
| [0032](./0032-haiku-vs-sonnet-for-log-parsing) | Haiku vs Sonnet for Log Parsing | Accepted |
| [0033](./0033-auto-apply-vs-manual-review-for-fixes) | Auto-Apply vs Manual Review for Fixes | Accepted |
| [0034](./0034-increment-backlog-status) | Increment Backlog Status | Accepted |
| [0035](./0035-kafka-multi-plugin-architecture) | Kafka Multi-Plugin Architecture | Accepted |
| [0036](./0036-kafka-mcp-server-selection) | Kafka MCP Server Selection Strategy | Accepted |
| [0037](./0037-kafka-terraform-provider-strategy) | Kafka Terraform Provider Strategy | Accepted |
| [0038](./0038-kafka-monitoring-stack-selection) | Kafka Monitoring Stack Selection | Accepted |
| [0039](./0039-context-detection-strategy) | Context Detection Strategy | Accepted |
| [0040](./0040-iac-template-engine) | IaC Template Engine | Accepted |
| [0041](./0041-cost-estimation-algorithm) | Cost Estimation Algorithm | Accepted |
| [0042](./0042-test-structure-standardization) | Test Structure Standardization | Accepted |
| [0043](./0043-spec-frontmatter-sync-strategy) | Spec Frontmatter Sync Strategy | Accepted |
| [0044](./0044-phase-detection-enhancement) | Phase Detection Enhancement | Superseded |
| [0045](./0045-atomic-update-rollback) | Atomic Update & Rollback Strategy | Accepted |
| [0047](./0047-three-file-structure-canonical-definition) | Three-File Structure Definition | Accepted |
| [0048](./0048-claude-code-marketplace-symlink-requirement) | Marketplace Symlink Requirement | Accepted |
| [0049](./0049-claude-code-hook-schema-correction) | Hook Schema Correction | Accepted |
| [0050](./0050-secrets-config-separation) | Secrets/Config Separation | Accepted |
| [0051](./0051-smart-caching-with-ttl) | Smart Caching with TTL | Accepted |
| [0052](./0052-cli-first-defaults-and-smart-pagination) | CLI-First Defaults & Smart Pagination | Accepted |
| [0053](./0053-cli-first-defaults-philosophy) | CLI-First Defaults Philosophy | Accepted |
| [0054](./0054-ado-area-path-mapping) | Azure DevOps Area Path Mapping | Accepted |
| [0055](./0055-progress-tracking-cancelation) | Progress Tracking with Cancelation | Accepted |
| [0056](./0056-three-tier-dependency-loading) | Three-Tier Dependency Loading | Accepted |
| [0057](./0057-async-batch-fetching) | Async Batch Fetching Strategy | Accepted |
| [0058](./0058-progress-tracking-implementation) | Progress Tracking Implementation | Accepted |
| [0059](./0059-cancelation-strategy) | Cancelation Strategy | Accepted |
| [0060](./0060-hook-performance-optimization) | Hook Performance Optimization | Accepted |
| [0061](./0061-no-increment-to-increment-references) | No Increment-to-Increment References | Accepted |
| [0062](./0062-github-first-development-workflow) | GitHub-First Development Workflow | Accepted |
| [0063](./0063-mandatory-post-closure-quality-assessment) | Mandatory Post-Closure QA | Accepted |
| [0064](./0064-ac-embedding-mandatory-architecture) | AC Embedding Mandatory Architecture | Accepted |
| [0065](./0065-three-tier-permission-gates) | Three-Tier Permission Gates | Accepted |
| [0066](./0066-sync-coordinator-integration-point) | Sync Coordinator Integration Point | Accepted |
| [0067](./0067-three-layer-idempotency-caching) | Three-Layer Idempotency Caching | Accepted |
| [0068](./0068-circuit-breaker-error-isolation) | Circuit Breaker Error Isolation | Accepted |
| [0069](./0069-git-provider-abstraction-layer) | Git Provider Abstraction Layer | Accepted |
| [0070](./0070-hook-consolidation) | Hook Consolidation | Accepted |
| [0071](./0071-remove-unused-permissions-configuration) | Remove Unused Permissions Config | Accepted |
| [0072](./0072-post-task-hook-simplification) | Post-Task Hook Simplification | Accepted |
| [0073](./0073-hook-recursion-prevention) | Hook Recursion Prevention | Superseded |
| [0118](./0118-command-interface-pattern) | Command Interface Pattern | Accepted |
| [0119](./0119-git-integration-strategy) | Git Integration Strategy | Accepted |
| [0120](./0120-github-integration-approach) | GitHub Integration Approach | Accepted |
| [0121](./0121-validation-engine-design) | Validation Engine Design | Accepted |
| [0122](./0122-audit-log-format) | Audit Log Format | Accepted |
| [0123](./0123-deletion-orchestration-pattern) | Deletion Orchestration Pattern | Accepted |
| [0124](./0124-atomic-deletion-with-transaction-rollback) | Atomic Deletion with Rollback | Accepted |
| [0125](./0125-incremental-vs-batch-deletion) | Incremental vs Batch Deletion | Accepted |
| [0126](./0126-confirmation-ux-multi-gate-pattern) | Confirmation UX Multi-Gate | Accepted |
| [0127](./0127-agent-chunking-pattern) | Agent Chunking Pattern | Accepted |
| [0128](./0128-hierarchical-hook-early-exit) | Hierarchical Hook Early Exit | Accepted |
| [0129](./0129-us-sync-guard-rails) | US Sync Guard Rails | Accepted |
| [0130](./0130-hook-bulk-operation-detection) | Hook Bulk Operation Detection | Accepted |
| [0131](./0131-external-tool-sync-context-detection) | External Tool Sync Context Detection | Accepted |
| [0132](./0132-avoid-early-returns-in-routing-code) | Avoid Early Returns in Routing | Accepted |
| [0133](./0133-skills-must-not-spawn-large-agents) | Skills Must NOT Spawn Large Agents | Accepted |
| [0134](./0134-external-tool-detection-enhancement) | External Tool Detection Enhancement | Accepted |
| [0135](./0135-increment-creation-sync-orchestration) | Increment Creation Sync Orchestration | Accepted |
| [0136](./0136-github-config-detection-timing) | GitHub Config Detection Timing | Accepted |
| [0137](./0137-multi-location-github-config-detection) | Multi-Location GitHub Config Detection | Accepted |
| [0138](./0138-init-command-modular-architecture) | Init Command Modular Architecture | Accepted |
| [0139](./0139-unified-post-increment-github-sync) | Unified Post-Increment GitHub Sync | Accepted |
| [0140](./0140-code-over-mcp) | Code Over MCP | Accepted |
| [0141](./0141-repo-name-as-project-id) | Repo Name as Project ID | Accepted |
| [0142](./0142-umbrella-multi-repo-support) | Umbrella Multi-Repo Support | Accepted |
| [0143](./0143-jira-ado-multi-level-project-mapping) | JIRA/ADO Multi-Level Project Mapping | Accepted |
| [0144](./0144-skills-as-coordinators) | Skills as Coordinators | Accepted |
| [0145](./0145-context-loading) | Context Loading Approach | Accepted |
| [0146](./0146-cost-tracking-system) | Cost Tracking System Design | Superseded |
| [0147](./0147-phase-detection-algorithm) | Phase Detection Algorithm | Superseded |
| [0148](./0148-agent-vs-skill) | Agents vs Skills Architecture | Accepted |
| [0149](./0149-testing-strategy) | Test-Aware Planning Strategy | Accepted |
| [0150](./0150-plugin-validation) | Plugin Validation System | Accepted |
| [0151](./0151-reflection-model-selection) | Reflection Model Selection | Accepted |
| [0152](./0152-specs-organization-brownfield) | Specs Organization (Brownfield) | Accepted |
| [0153](./0153-strategy-based-team-mapping) | Strategy-Based Team Mapping | Accepted |
| [0154](./0154-reflection-storage-format) | Reflection Storage Format | Accepted |
| [0155](./0155-test-infrastructure-architecture) | Test Infrastructure Architecture | Accepted |
| [0156](./0156-multi-repo-init-ux-architecture) | Multi-Repo Init UX Architecture | Accepted |
| [0157](./0157-root-level-repository-structure) | Root-Level Repository Structure | Accepted |
| [0158](./0158-setup-state-persistence) | Setup State Persistence | Accepted |
| [0159](./0159-github-validation-strategy) | GitHub Validation Strategy | Accepted |
| [0160](./0160-root-level-folder-structure) | Root-Level Folder Structure | Accepted |
| [0161](./0161-flatten-internal-documentation-structure) | Flatten Internal Documentation | Accepted |
| [0162](./0162-conflict-resolution-approach) | Conflict Resolution Approach | Accepted |
| [0163](./0163-bidirectional-sync-implementation) | Bidirectional Sync Implementation | Accepted |
| [0164](./0164-github-actions-polling-vs-webhooks) | GitHub Actions: Polling vs Webhooks | Accepted |
| [0165](./0165-increment-number-gap-prevention) | Increment Number Gap Prevention | Accepted |
| [0166](./0166-universal-hierarchy-mapping) | Universal Hierarchy Mapping | Accepted |
| [0167](./0167-smart-reopen-functionality) | Smart Reopen Functionality | Accepted |
| [0168](./0168-serverless-platform-knowledge-base) | Serverless Platform Knowledge Base | Accepted |
| [0169](./0169-n8n-kafka-integration-approach) | n8n Kafka Integration Approach | Accepted |
| [0170](./0170-test-isolation-enforcement) | Test Isolation Enforcement | Accepted |
| [0171](./0171-fixture-architecture) | Fixture Architecture | Accepted |
| [0172](./0172-naming-convention-test-only) | Naming Convention (.test.ts Only) | Accepted |
| [0173](./0173-agent-enhancement-pattern) | Agent Enhancement Pattern | Accepted |
| [0174](./0174-spec-md-source-of-truth) | spec.md as Source of Truth | Accepted |
| [0175](./0175-workflow-orchestration-architecture) | Workflow Orchestration Architecture | Accepted |
| [0176](./0176-yaml-parser-gray-matter) | YAML Parser: gray-matter | Accepted |
| [0177](./0177-autonomous-mode-safety) | Autonomous Mode Safety | Accepted |
| [0178](./0178-repository-provider-architecture) | Repository Provider Architecture | Accepted |
| [0179](./0179-jira-auto-discovery-and-hierarchy) | Jira Auto-Discovery & Hierarchy | Accepted |
| [0180](./0180-smart-pagination-50-project-limit) | Smart Pagination (50-Project Limit) | Superseded |
| [0181](./0181-smart-pagination) | Smart Pagination | Superseded |
| [0182](./0182-cli-first-defaults) | CLI-First Defaults | Superseded |
| [0183](./0183-progress-tracking-and-cancelation) | Progress Tracking & Cancelation | Superseded |
| [0184](./0184-progress-tracking) | Progress Tracking | Superseded |

---

## Key ADRs by Topic

### Must-Read for Contributors
- [0001](./0001-tech-stack) - Technology choices
- [0047](./0047-three-file-structure-canonical-definition) - spec.md/plan.md/tasks.md
- [0061](./0061-no-increment-to-increment-references) - Architecture constraint
- [0069](./0069-git-provider-abstraction-layer) - Multi-provider support
- [0133](./0133-skills-must-not-spawn-large-agents) - Crash prevention

### GitHub Integration
- [0022](./0022-github-sync-architecture) - Core sync architecture
- [0137](./0137-multi-location-github-config-detection) - Config detection
- [0139](./0139-unified-post-increment-github-sync) - Post-increment sync

### Hook System
- [0060](./0060-hook-performance-optimization) - Performance
- [0070](./0070-hook-consolidation) - 33% hook reduction
- [0073](./0073-hook-recursion-prevention) - Safety

---

## Related

- [Architecture Overview](../README)
- [CLAUDE.md(../../../../../../CLAUDE.md) - Complete development guide
- [Governance](../../governance/) - Coding standards and security
