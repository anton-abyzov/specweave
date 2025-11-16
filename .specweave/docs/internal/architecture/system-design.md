# SpecWeave System Design - Architecture Overview

**Last Updated**: 2025-11-15
**Version**: 2.0
**Author**: Architect Agent

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Core Framework Architecture](#core-framework-architecture)
4. [Plugin Architecture](#plugin-architecture)
5. [Kafka Event Streaming Plugin Suite](#kafka-event-streaming-plugin-suite)
6. [Multi-Project Sync Architecture](#multi-project-sync-architecture)
7. [Living Documentation System](#living-documentation-system)
8. [Security Architecture](#security-architecture)
9. [Performance & Scalability](#performance--scalability)
10. [Deployment Architecture](#deployment-architecture)

---

## System Overview

SpecWeave is a spec-driven development framework built on Claude Code's native plugin system. The framework enables AI-assisted development workflows through incremental delivery, living documentation, and external tool synchronization.

**Core Tenets**:
- **Spec-Driven**: All work starts from specifications (PRD → Spec → Tasks → Code)
- **Increment-Based**: Work organized in measurable increments (1-2 weeks)
- **Living Documentation**: Specs evolve with the project (not stale)
- **Claude Code Native**: Leverages Claude Code's plugins, agents, skills, hooks
- **75% Context Reduction**: Modular plugins activate only when needed

**Primary Users**:
- Solo developers (startup MVPs, side projects)
- Small teams (2-10 developers)
- Open-source contributors
- AI-assisted development advocates

---

## Architecture Principles

### 1. Plugin-First Architecture

**Every component is a plugin**. There is no "core framework" separate from plugins.

```
SpecWeave = specweave (plugin) + specweave-github (plugin) + specweave-kafka (plugin) + ...
```

**Rationale**: Uniform architecture, no special cases, easy to extend.

**Reference**: ADR-0035 (Kafka Multi-Plugin Architecture)

### 2. Context Efficiency

**Goal**: Reduce AI context window usage by 75%+.

**How**:
- Skills auto-activate based on keywords (Claude Code native behavior)
- Plugins install globally but only load when needed
- Living docs extracted from increments (avoid duplication)
- External sync reduces context pollution

**Metrics**:
- Core plugin: ~12K tokens (all framework features)
- Average plugin: 4-8K tokens
- Result: 75% smaller than v0.3.7 (50K tokens)

### 3. Separation of Concerns

**Five Documentation Layers** (cross-project):
- **Strategy**: Business rationale (Why?)
- **Architecture**: System-wide technical design (How?)
- **Delivery**: Build & release (How we build)
- **Operations**: Production ops (How we run)
- **Governance**: Policies (Guardrails)

**Multi-Project Organization** (flattened):
- `specs/{project-id}/` - Living documentation specs
- `modules/{project-id}/` - Module documentation
- `team/{project-id}/` - Team playbooks
- `project-arch/{project-id}/` - Project-specific ADRs
- `legacy/{project-id}/` - Brownfield imports

**Reference**: [Internal Docs README](../docs/internal/README.md)

### 4. Vendor Neutrality

**Open standards over vendor lock-in**:
- Markdown + YAML (not proprietary formats)
- Claude Code plugin system (Anthropic standard)
- MCP protocol (Model Context Protocol)
- Prometheus metrics (industry standard)
- OpenTelemetry tracing (CNCF graduated)

**Exceptions** (justified):
- Claude Code (no viable alternative for AI-native IDE)
- Confluent Cloud (optional, Confluent-specific features)

### 5. Progressive Disclosure

**Show complexity only when needed**:
- Quick start: `specweave init` → 3 commands (`/increment`, `/do`, `/done`)
- Intermediate: Multi-repo, GitHub sync, living docs
- Advanced: Plugin development, brownfield migration, DORA metrics

**Documentation Strategy**:
- README: Quick start only
- Docs site: Comprehensive guides (progressively disclosed)
- ADRs: Architecture decisions (for contributors)

---

## Core Framework Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code (AI IDE)                         │
│  ┌────────────────────────────────────────────────────────┐     │
│  │         SpecWeave Plugin Marketplace                   │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │     │
│  │  │  specweave   │  │ specweave-   │  │ specweave-  │  │     │
│  │  │   (core)     │  │   github     │  │   kafka     │  │     │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │     │
│  │  │ specweave-   │  │ specweave-   │  │    ...      │  │     │
│  │  │  confluent   │  │    n8n       │  │ (19+ total) │  │     │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  .specweave/ (Project Data)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ increments/  │  │ docs/        │  │ config.json         │   │
│  │  0001-*      │  │  internal/   │  │ (project config)    │   │
│  │  0002-*      │  │  public/     │  │                     │   │
│  └──────────────┘  └──────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Tools (Bidirectional Sync)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ GitHub       │  │ JIRA         │  │ Azure DevOps        │   │
│  │ (Issues)     │  │ (Stories)    │  │ (Work Items)        │   │
│  └──────────────┘  └──────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Core Plugin (`specweave`)

**Size**: ~12K tokens
**Purpose**: Increment lifecycle + Living docs automation

**Components**:
- **Skills** (9): increment-planner, spec-generator, tdd-workflow, context-loader, project-kickstarter, brownfield-analyzer, brownfield-onboarder, increment-quality-judge, context-optimizer
- **Agents** (22): PM, Architect, Tech Lead, + 19 specialized (tdd-orchestrator, qa-specialist, etc.)
- **Commands** (22): /increment, /do, /done, /validate, /qa, /status, /progress, /check-tests, + 14 specialized
- **Hooks** (8): post-task-completion, pre-tool-use, post-increment-planning, etc.

**Key Features**:
- Increment lifecycle management
- Living docs sync (intelligent distribution)
- Bidirectional task ↔ user story linking
- GitHub issue auto-creation
- Metadata validation & fallback

**Reference**: [CLAUDE.md](../../../../CLAUDE.md)

---

## Plugin Architecture

### Plugin Structure (Claude Code Standard)

```
plugins/specweave-{name}/
├── .claude-plugin/
│   └── plugin.json          # Claude native manifest
├── skills/                  # Auto-activating capabilities
│   └── {skill-name}/
│       └── SKILL.md         # YAML frontmatter + markdown
├── agents/                  # Specialized AI agents
│   └── {agent-name}/
│       └── AGENT.md         # YAML frontmatter + markdown
├── commands/                # Slash commands
│   └── {command-name}.md    # YAML frontmatter + markdown
├── hooks/
│   ├── hooks.json           # Hook registration
│   └── *.sh                 # Hook scripts
└── lib/                     # TypeScript utilities (optional)
    └── *.ts
```

### Plugin Discovery & Activation

**Installation** (via Claude Code CLI):
```bash
# Global marketplace registration (persists across all projects)
claude plugin marketplace add anton-abyzov/specweave

# Install all plugins (via specweave init)
claude plugin install specweave
claude plugin install specweave-github
claude plugin install specweave-kafka
# ... (all 19+ plugins installed automatically)
```

**Activation** (automatic, context-based):
- Skills activate based on description keywords
- Agents invoked via Task tool
- Commands available via `/` prefix
- Hooks fire on lifecycle events

**Context Efficiency**:
- All plugins installed ≠ all plugins loaded
- Only relevant skills activate per conversation
- Result: Even with 19+ plugins, only pay for what you use

---

## Kafka Event Streaming Plugin Suite

### Architecture Overview

**Four Plugins** (modular, independently installable):

1. **specweave-kafka** (Core, ~8K tokens)
   - Apache Kafka, Redpanda, AWS MSK, Azure Event Hubs
   - MCP server integration (kanapuli, tuannvm, Joel-hanson)
   - CLI tools (kcat, kcli, kaf)
   - Monitoring (Prometheus + Grafana, OpenTelemetry)
   - Terraform modules (self-hosted, AWS MSK, Azure Event Hubs)

2. **specweave-confluent** (Managed Service, ~5K tokens)
   - Confluent Cloud integration
   - Schema Registry, ksqlDB, Kafka Connect
   - Confluent MCP server
   - Terraform (Confluent provider)
   - Cost optimization, RBAC

3. **specweave-kafka-streams** (Stream Processing, ~4K tokens)
   - Kafka Streams API
   - Red Hat AMQ Streams (OpenShift)
   - Strimzi operator
   - Stateful transformations (RocksDB)

4. **specweave-n8n** (Workflow Automation, ~4K tokens)
   - n8n Kafka Trigger/Producer nodes
   - MCP Server Trigger (2025 feature)
   - Pre-built workflow templates
   - AI-driven event processing

**Total Size**: ~21K tokens (all 4 plugins)
**Typical Usage**: ~12K tokens (specweave-kafka + one other)

### Architecture Decisions

**ADR-0035**: Multi-Plugin Architecture
- **Decision**: 4 separate plugins (not monolithic)
- **Rationale**: Modular installation, focused skills, context efficiency
- **Trade-offs**: More maintenance vs better UX

**ADR-0036**: MCP Server Selection
- **Decision**: Support all 4 MCP servers with auto-detection
- **Rationale**: Maximum flexibility, graceful fallback
- **Trade-offs**: Testing overhead vs vendor neutrality

**ADR-0037**: Terraform Provider Strategy
- **Decision**: Multi-provider (Confluent, Mongey, AWS, Azure)
- **Rationale**: Best-in-class features per platform
- **Trade-offs**: Configuration complexity vs platform flexibility

**ADR-0038**: Monitoring Stack Selection
- **Decision**: Prometheus + Grafana (default), OpenTelemetry (optional), cloud-native (fallback)
- **Rationale**: Industry standard, distributed tracing support
- **Trade-offs**: Setup complexity vs feature completeness

**ADR-0039**: n8n Integration Approach
- **Decision**: Native n8n nodes + MCP Server Trigger (hybrid)
- **Rationale**: Stability (native) + AI capabilities (MCP)
- **Trade-offs**: Two integration paths vs future-proof

### Architecture Diagrams

**C4 Level 1: System Context**
- [system-context.mmd](diagrams/kafka-plugin/system-context.mmd)
- Shows: Developers, DevOps, SRE → SpecWeave → Kafka platforms + tools

**C4 Level 2: Container Diagram**
- [system-container.mmd](diagrams/kafka-plugin/system-container.mmd)
- Shows: 4 plugins, Kafka infrastructure, observability stack, MCP layer, automation

**C4 Level 3: Component Diagram**
- [component-diagram.mmd](diagrams/kafka-plugin/component-diagram.mmd)
- Shows: specweave-kafka plugin internals (skills, agents, commands, lib, terraform, templates)

### Technology Stack

**Core Dependencies**:
- **Runtime**: Node.js 18+, TypeScript 5.0+
- **Kafka Client**: kafkajs (Node.js), franz-go (Go, for MCP servers)
- **MCP Servers**: kanapuli/mcp-kafka, tuannvm/kafka-mcp-server, Confluent MCP server
- **CLI Tools**: kcat (primary), kcli, kaf, kafkactl
- **IaC**: Terraform 1.5+ (Confluent provider, Mongey/kafka provider, AWS provider, AzureRM provider)
- **Monitoring**: Prometheus, Grafana, kafka_exporter, JMX Exporter, OpenTelemetry Collector
- **Workflow Automation**: n8n (Docker or cloud-hosted)

**Platforms Supported**:
- Apache Kafka 3.6+ (self-hosted, KRaft mode)
- Confluent Cloud (managed Kafka)
- Redpanda 23.3+ (Kafka-compatible)
- AWS MSK (Amazon Managed Streaming for Kafka)
- Azure Event Hubs (Kafka API)

### Data Flow Architecture

**Message Production Flow**:
```
Developer
  → Claude Code (/specweave-kafka:produce)
  → specweave-kafka plugin
  → MCP Server (kanapuli/tuannvm) OR kcat CLI
  → Kafka Cluster
  → Topic → Partition
```

**Message Consumption Flow**:
```
Kafka Topic
  → Consumer Group (kafkajs)
  → Message Processing (user code)
  → Offset Commit
  → (Optional) Dead Letter Queue
```

**Monitoring Flow**:
```
Kafka Brokers
  → JMX Exporter (JVM metrics)
  → kafka_exporter (topic/consumer metrics)
  → Prometheus (scrape every 15s)
  → Grafana (dashboards, alerts)
```

**n8n Workflow Flow**:
```
Kafka Topic
  → n8n Kafka Trigger Node
  → n8n Workflow (transform, route, enrich)
  → External API (webhook, database, Slack)
```

### Security Architecture

**Authentication**:
- SASL/PLAINTEXT (basic username/password)
- SASL/SCRAM-SHA-256/512 (secure hashing)
- TLS client certificates (mutual TLS)
- OAuth/OIDC (Confluent Cloud)

**Encryption**:
- TLS 1.2+ for data in transit (broker ↔ client)
- Encryption at rest (cloud-managed platforms)

**Authorization**:
- Kafka ACLs (topic-level permissions)
- RBAC (Confluent Cloud)
- IAM roles (AWS MSK)
- Azure AD integration (Azure Event Hubs)

**Secrets Management**:
- Environment variables (12-factor app)
- `.env` files (local development)
- Terraform variables (production)
- Secrets rotation (manual or automated)

### Performance Targets

**NFR-001: Performance**:
- Plugin installation: < 30 seconds
- MCP server startup: < 5 seconds
- Local Kafka cluster startup: < 60 seconds
- Terraform apply (local): < 5 minutes
- Skill activation: < 1 second

**NFR-003: Scalability**:
- Kafka clusters: Up to 100 brokers
- Topics: Up to 1000 partitions per topic
- Consumer groups: Up to 100 consumers
- Multi-region deployments: Supported via Terraform

**Message Throughput** (benchmarks):
- Producer: 100K+ messages/sec (batching enabled)
- Consumer: 50K+ messages/sec (parallel processing)
- End-to-end latency: < 100ms (p95)

---

## Multi-Project Sync Architecture

**See**: [Multi-Project Sync Architecture](https://spec-weave.com/docs/integrations/multi-project-sync)

**Key Features**:
- Unlimited external repositories (GitHub, JIRA, ADO)
- 3-layer architecture (Credentials → Profiles → Per-increment metadata)
- Smart project detection (keywords, tech stack, frontmatter)
- Time range filtering (1W/1M/3M/6M/ALL)
- Rate limit protection (pre-flight validation)

**Example**:
```bash
# Sync increment to GitHub (auto-detects time range)
/specweave-github:sync 0035

# Specify time range (recommended: 1M)
/specweave-github:sync 0035 --time-range 1M
```

---

## Living Documentation System

**See**: [Intelligent Living Docs Guide](../../../docs/public/guides/intelligent-living-docs-sync.md)

**Two Modes**:

1. **Simple Mode**: Single file per increment spec
   - `docs/internal/specs/spec-0035-kafka-plugin.md`

2. **Intelligent Mode**: Parse, classify, distribute by category + project
   - `docs/internal/specs/{project}/us-001-*.md` (User Stories)
   - `docs/internal/architecture/adr/0035-*.md` (ADRs)
   - `docs/internal/operations/runbook-*.md` (Runbooks)
   - `docs/internal/delivery/test-strategy-*.md` (Test Strategies)

**Classification System** (9 categories):
- User Story, NFR, Architecture, ADR, Operations, Delivery, Strategy, Governance, Overview

**Bidirectional Linking**:
- User Story → Tasks (forward links)
- Tasks → User Story (reverse links, auto-injected)

**Docusaurus Frontmatter**:
```yaml
---
id: us-001-mcp-integration
title: "US-001: MCP Kafka Server Integration"
project: "default"
category: "user-story"
tags: ["kafka", "mcp", "integration"]
---
```

---

## Security Architecture

**Authentication**:
- GitHub: Personal Access Token (PAT) or GitHub App
- JIRA: API Token
- Azure DevOps: Personal Access Token
- Kafka: SASL/SCRAM, TLS, OAuth

**Secrets Management**:
- Environment variables (`.env` files)
- Never commit secrets to git
- Use `.gitignore` for sensitive files

**Audit Trail**:
- All sync operations logged
- Increment metadata tracks external links
- Living docs sync creates audit trail

**Compliance**:
- GDPR: No PII stored in framework (user controls data)
- SOC 2: Framework supports audit requirements (versioned specs, traceability)

---

## Performance & Scalability

**Core Framework**:
- Status line render: < 1ms
- Increment creation: < 5 seconds
- Living docs sync: < 10 seconds

**External Sync**:
- GitHub issue creation: < 2 seconds
- JIRA sync: < 3 seconds
- Batch sync (100 increments): < 5 minutes

**Context Window Usage**:
- Core plugin: ~12K tokens (75% reduction vs v0.3.7)
- Average plugin: 4-8K tokens
- All plugins installed: Only pay for active skills

**Scalability Limits**:
- Increments: No hard limit (tested up to 1000+)
- Living docs: No hard limit (Markdown files scale linearly)
- External sync: Rate limited by external APIs (GitHub: 5000 req/hr)

---

## Deployment Architecture

**Installation Methods**:

1. **NPM** (Global):
   ```bash
   npm install -g specweave
   specweave init .
   ```

2. **Install Script**:
   ```bash
   curl -fsSL https://spec-weave.com/install.sh | bash
   ```

3. **Manual** (Contributors):
   ```bash
   git clone https://github.com/anton-abyzov/specweave.git
   npm install && npm run build
   npm link  # Global installation
   ```

**Plugin Marketplace** (Global Registration):
```bash
# Automatic (via specweave init)
claude plugin marketplace add anton-abyzov/specweave
claude plugin install specweave
claude plugin install specweave-github
claude plugin install specweave-kafka
# ... (all 19+ plugins installed)

# Manual (if needed)
/plugin install specweave
/plugin install specweave-kafka
```

**Multi-Repo Setup**:
- GitHub parent folder (teams)
- Local parent folder (solo developers)
- Per-repo (not recommended, duplication)

**See**: [Multi-Repo Setup Guide](https://spec-weave.com/docs/learn/multi-repo-setup)

---

## Future Architecture Considerations

### Short-Term (v1.0)

- **GitHub Actions Integration**: Auto-run tests on increment completion
- **Kafka Streams DSL Generator**: AI-generated stream processing code
- **MCP Server Registry**: Auto-discover MCP servers in organization
- **Grafana Dashboard Generator**: Auto-generate dashboards from Kafka topology

### Mid-Term (v2.0)

- **Multi-Cloud Kafka Federation**: Cross-cloud topic replication
- **AI-Driven Capacity Planning**: ML-based cluster sizing
- **Schema Evolution Automation**: Auto-migrate schemas with compatibility checks
- **n8n Workflow Marketplace**: Community-contributed Kafka workflows

### Long-Term (v3.0+)

- **Kafka Event Sourcing Framework**: Built-in event sourcing patterns
- **Real-Time Data Mesh**: Decentralized Kafka topology management
- **AI Kafka SRE**: Autonomous incident detection and remediation
- **Kafka Compliance Toolkit**: GDPR, SOC 2, HIPAA compliance automation

---

## Related Documentation

**Architecture Decisions**:
- [ADR-0035: Kafka Multi-Plugin Architecture](adr/0035-kafka-multi-plugin-architecture.md)
- [ADR-0036: Kafka MCP Server Selection](adr/0036-kafka-mcp-server-selection.md)
- [ADR-0037: Kafka Terraform Provider Strategy](adr/0037-kafka-terraform-provider-strategy.md)
- [ADR-0038: Kafka Monitoring Stack Selection](adr/0038-kafka-monitoring-stack-selection.md)
- [ADR-0039: n8n Kafka Integration Approach](adr/0039-n8n-kafka-integration-approach.md)

**User Guides**:
- [Kafka Quick Start](../../../docs/public/guides/kafka-quick-start.md) (To be created)
- [Multi-Project Sync](https://spec-weave.com/docs/integrations/multi-project-sync)
- [Intelligent Living Docs](../../../docs/public/guides/intelligent-living-docs-sync.md)

**Living Specs**:
- [SPEC-035: Kafka Event Streaming Integration Plugin](../../specs/default/spec-035-kafka-plugin.md)

---

**Document History**:
- v2.0 (2025-11-15): Added Kafka Event Streaming Plugin Suite architecture
- v1.0 (2025-10-01): Initial system design document
