# sync

*Analyzed: 2025-12-10 | Confidence: medium**

## Purpose

Synchronization coordination module for SpecWeave that manages bidirectional sync between local increment/spec documentation and external issue tracking platforms (GitHub Issues, JIRA, Azure DevOps). Handles issue creation, status reconciliation, conflict resolution, and maintains sync metadata across all platforms.

## Key Concepts

- Multi-platform sync coordination (GitHub, JIRA, ADO)
- 3-layer idempotency (frontmatter, metadata.json, API query)
- Bidirectional state reconciliation
- Permission-enforced sync operations via interceptors
- Living docs synchronization
- External change pulling with conflict resolution
- Sync metadata tracking with platform timestamps
- Format preservation during sync
- Closure metrics and monitoring

## Patterns

- **Wrapper/Decorator Pattern for Permission Enforcement** (architecture)
- **REST API Integration (GitHub, JIRA, ADO)** (api)
- **YAML Frontmatter as Metadata Store** (data)
- **3-Layer Idempotency Strategy** (architecture)
- **Conflict Resolution with Timestamps** (data)
- **Repository Pattern for Sync State** (data)
- **Status State Machine Mapping** (architecture)
- **Audit Logging via Interceptor** (security)
- **Dependency Injection for Logger** (architecture)
- **Project Root Validation Guard** (security)
- **Duplicate Detection and Prevention** (data)
- **ConfigManager for Non-Secret Configuration** (architecture)
- **Closure Metrics and Monitoring** (integration)
- **Multi-Project Support with Profile Resolution** (architecture)

## External Dependencies

- GitHub Issues API
- JIRA REST API v3
- Azure DevOps REST API
- yaml (npm package for YAML parsing)
- Node.js fs/promises

## Observations

- Implements comprehensive bidirectional sync with 3 external platforms (GitHub, JIRA, ADO)
- 3-layer idempotency prevents duplicate issue creation with progressive latency tradeoffs
- Wrapper pattern provides consistent permission enforcement across all platforms
- Reconcilers fix state drift between local metadata and external systems automatically
- Conflict resolution uses timestamp-based strategy with external-wins preference
- Feature ID derivation (v0.34.0) prevents FS-0128/FS-128 duplicate issues
- Supports both automated (hook-triggered) and manual reconciliation modes
- Dry-run mode available for reconciliation preview without making changes
- Secrets/config separation enforced (tokens in .env, domains in config.json)