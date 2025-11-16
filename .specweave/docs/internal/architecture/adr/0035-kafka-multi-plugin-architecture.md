# ADR-0035: Kafka Multi-Plugin Architecture

**Date**: 2025-11-15
**Status**: Accepted

## Context

We need to integrate Apache Kafka event streaming capabilities into SpecWeave. The critical architectural decision is whether to create a single monolithic plugin containing all Kafka functionality or split functionality across multiple focused plugins.

**Key Considerations**:
- SpecWeave's plugin system supports unlimited plugins via Claude Code's native marketplace
- Different users have different Kafka needs (self-hosted Apache Kafka vs Confluent Cloud vs AWS MSK)
- Kafka ecosystem has distinct concerns: core operations, cloud platforms, stream processing, workflow automation
- Plugin size affects activation time and context window usage
- Claude Code's skill system auto-activates based on description keywords

**Requirements from User Stories**:
- US-001 to US-006: Core Kafka architecture, MCP servers, CLI tools, multi-platform support
- US-007 to US-014: Operations, monitoring, testing, n8n workflow integration
- US-015 to US-020: Production operations, security, capacity planning, Kafka Streams/ksqlDB

## Decision

We will create **4 separate plugins** following Claude Code's plugin architecture:

1. **specweave-kafka** - Core Apache Kafka integration
2. **specweave-confluent** - Confluent Cloud managed service
3. **specweave-kafka-streams** - Kafka Streams + OpenShift/Red Hat AMQ Streams
4. **specweave-n8n** - n8n workflow automation (generic, Kafka-focused features)

Each plugin is independently installable and auto-activates based on context.

## Alternatives Considered

### Alternative 1: Single Monolithic Plugin

**Structure**:
```
plugins/specweave-kafka/
├── skills/ (20+ skills covering all Kafka concerns)
├── agents/ (10+ agents)
├── commands/ (20+ commands)
└── lib/ (shared utilities)
```

**Pros**:
- Single installation point
- Easier cross-concern coordination
- Shared utilities in one place
- Single version number

**Cons**:
- Large plugin size (~30K+ tokens) - violates SpecWeave's 75% context reduction principle
- Skills activate unnecessarily (e.g., Confluent Cloud skills activate for self-hosted users)
- Slower activation time (Claude Code must load all skills)
- Harder to maintain (20+ skills in one plugin)
- Forces users to install features they don't need
- Conflicts with SpecWeave's modular plugin philosophy

**Why NOT chosen**: Violates SpecWeave's core principle of context efficiency. The core `specweave` plugin is only ~12K tokens for ALL framework features. A 30K+ Kafka plugin would be larger than the entire framework.

### Alternative 2: Plugin Per Platform (AWS, Azure, GCP, Confluent)

**Structure**:
```
plugins/specweave-kafka-aws/     (AWS MSK specific)
plugins/specweave-kafka-azure/   (Azure Event Hubs specific)
plugins/specweave-kafka-gcp/     (GCP Pub/Sub Kafka API)
plugins/specweave-kafka-confluent/ (Confluent Cloud)
```

**Pros**:
- Clear cloud platform boundaries
- Platform-specific optimizations
- Easy to add new cloud providers

**Cons**:
- Duplicates core Kafka knowledge across plugins (producer/consumer patterns, topic design)
- Doesn't align with user mental models (users think "I need Kafka", not "I need AWS MSK")
- Mixed concerns (cloud infrastructure + Kafka operations)
- No clear place for self-hosted Apache Kafka
- Kafka Streams/ksqlDB doesn't fit any single platform

**Why NOT chosen**: Duplication of core Kafka knowledge, poor alignment with user needs, no clear home for cross-platform features.

### Alternative 3: Concern-Based Plugins (Infra, Ops, Streams, Monitoring)

**Structure**:
```
plugins/specweave-kafka-infrastructure/ (Terraform, deployment)
plugins/specweave-kafka-operations/     (Monitoring, runbooks)
plugins/specweave-kafka-streams/        (Stream processing)
plugins/specweave-kafka-dev/            (Local dev, testing)
```

**Pros**:
- Clear separation of concerns
- Easy to install only what you need (e.g., ops team installs operations plugin)
- Aligns with team roles (DevOps, SRE, Developers)

**Cons**:
- Requires multiple plugins for basic use case (infra + dev + ops = 3 plugins minimum)
- Doesn't capture platform differences (Confluent Cloud has different ops than AWS MSK)
- Cross-cutting concerns (where does Schema Registry go? It's both ops and dev)
- Complex dependencies (streams plugin needs infrastructure plugin)

**Why NOT chosen**: Too fragmented for basic use cases, complex dependencies, doesn't capture platform-specific needs.

## Consequences

### Positive

✅ **Modular Installation**: Users install only what they need
- Self-hosted users: `specweave-kafka` only (~8K tokens)
- Confluent users: `specweave-kafka` + `specweave-confluent` (~12K tokens)
- Stream processing: Add `specweave-kafka-streams` (~5K tokens)
- Workflow automation: Add `specweave-n8n` (~4K tokens)

✅ **Focused Skills**: Skills activate only when relevant
- Mention "Confluent Cloud" → confluent-cloud-setup skill activates
- Mention "Kafka Streams" → kafka-streams-api skill activates
- No activation of irrelevant skills

✅ **Clear Separation of Concerns**:
- Core Kafka (Apache Kafka, Redpanda, AWS MSK, Azure Event Hubs) → specweave-kafka
- Managed Confluent Cloud → specweave-confluent
- Stream processing → specweave-kafka-streams
- Workflow automation → specweave-n8n

✅ **Independent Versioning**: Each plugin evolves at its own pace
- Confluent adds new features → bump specweave-confluent version
- Core Kafka API stable → specweave-kafka version stays stable

✅ **Easier Maintenance**: Smaller codebases per plugin (~500-800 lines per skill)

✅ **Alignment with SpecWeave Philosophy**: Matches existing plugin structure
- `specweave` (core) = 12K tokens
- `specweave-github` = 6K tokens
- `specweave-kafka` = ~8K tokens (similar scale)

### Negative

❌ **More Plugins to Maintain**: 4 plugins instead of 1
- More plugin.json manifests
- More CI/CD pipelines
- More documentation sites

**Mitigation**: Use shared template for plugin structure, unified CI/CD workflow

❌ **Potential Duplication**: Some utilities might be duplicated across plugins
- Producer/consumer code generation logic
- Configuration validation
- Error handling patterns

**Mitigation**: Create shared `@specweave/kafka-common` NPM package for utilities

❌ **Inter-Plugin Dependencies**: Some plugins may depend on others
- `specweave-kafka-streams` assumes `specweave-kafka` is installed
- `specweave-n8n` Kafka features assume `specweave-kafka` is installed

**Mitigation**: Document dependencies in plugin.json (future Claude Code feature), show clear error if missing dependency

❌ **User Confusion**: Users might not know which plugins to install

**Mitigation**:
- Quick start guide lists recommended plugin combinations
- `specweave-kafka` README explains when to add other plugins
- Auto-suggest missing plugins based on context (future feature)

### Neutral

🔄 **Plugin Discovery**: Users need to discover 4 plugins instead of 1
- All 4 plugins listed in SpecWeave marketplace
- Quick start guide recommends starting with `specweave-kafka`

🔄 **Version Coordination**: Users may have different versions of related plugins
- `specweave-kafka` v1.0.0 + `specweave-confluent` v0.5.0
- Generally not an issue (plugins are independent)
- Document compatibility matrix if needed

## Risks

**Risk 1: Fragmentation of Kafka Knowledge**
- **Impact**: Users don't know where to find Kafka features
- **Mitigation**: Each plugin README clearly states its scope and links to related plugins
- **Probability**: Medium
- **Severity**: Low

**Risk 2: Duplication of Code**
- **Impact**: Maintenance burden, inconsistent behavior
- **Mitigation**: Shared `@specweave/kafka-common` NPM package
- **Probability**: High (some duplication inevitable)
- **Severity**: Low (duplication is manageable at this scale)

**Risk 3: Dependency Management**
- **Impact**: Users install `specweave-kafka-streams` but forget `specweave-kafka`
- **Mitigation**: Clear error messages, dependency documentation
- **Probability**: Medium
- **Severity**: Low (easy to resolve)

## Implementation Plan

### Phase 1: Core Plugin (specweave-kafka)
- Skills: kafka-architecture, kafka-deployment, kafka-monitoring, kafka-mcp-integration, kafka-cli-tools
- Agents: kafka-architect, kafka-devops, kafka-observability
- Commands: /specweave-kafka:deploy, /specweave-kafka:monitor-setup, /specweave-kafka:mcp-configure, /specweave-kafka:dev-env
- Terraform: kafka-cluster (AWS/Azure/GCP), topic-management, acl-configuration
- MCP Integration: kanapuli, tuannvm, Joel-hanson servers
- CLI Integration: kcat wrappers

### Phase 2: Confluent Plugin (specweave-confluent)
- Skills: confluent-cloud-setup, confluent-terraform, confluent-schema-registry, confluent-connectors, confluent-ksqldb
- Agents: confluent-architect, confluent-cost-optimizer, confluent-security-engineer
- Commands: /specweave-confluent:cluster-create, /specweave-confluent:cost-estimate, /specweave-confluent:connector-deploy
- Terraform: confluent-cloud-environment, confluent-kafka-cluster, confluent-connector
- Integrations: Confluent MCP server, Confluent CLI

### Phase 3: Kafka Streams Plugin (specweave-kafka-streams)
- Skills: kafka-streams-api, kafka-streams-testing, redhat-amq-streams, openshift-operator-deployment
- Agents: streams-developer, openshift-sre, stateful-transformation-expert
- Commands: /specweave-kafka-streams:app-scaffold, /specweave-kafka-streams:openshift-deploy, /specweave-kafka-streams:rocksdb-tune
- Terraform: openshift-amq-streams, kafka-streams-app, rocksdb-state-store
- Integrations: Strimzi operator, Red Hat AMQ Streams

### Phase 4: n8n Plugin (specweave-n8n)
- Skills: n8n-kafka-trigger, n8n-mcp-integration, n8n-workflow-templates
- Agents: n8n-workflow-designer, n8n-integration-specialist
- Commands: /specweave-n8n:workflow-create, /specweave-n8n:kafka-trigger-setup, /specweave-n8n:mcp-server-deploy
- Workflow Templates: kafka-to-webhook, kafka-to-database, kafka-to-ai-agent
- Integrations: n8n MCP Server Trigger, n8n Kafka Trigger node

## Related Decisions

- **ADR-0036**: MCP Server Selection (kanapuli vs tuannvm vs Confluent) - To be created
- **ADR-0037**: Terraform Provider Choice (Confluent vs Mongey) - To be created
- **ADR-0038**: Monitoring Stack Selection (Prometheus vs OpenTelemetry) - To be created
- **ADR-0039**: n8n Integration Approach (MCP Server Trigger vs Direct API) - To be created

## References

- [Claude Code Plugin System](https://docs.claude.com/en/docs/claude-code/plugins)
- [SpecWeave Plugin Architecture](./../plugin-architecture.md)
- [SpecWeave Core Plugin](../../../../plugins/specweave/.claude-plugin/plugin.json)
- [SPEC-035: Kafka Event Streaming Integration Plugin](../../specs/default/spec-035-kafka-plugin.md)

---

**Last Updated**: 2025-11-15
**Author**: Architect Agent
**Increment**: 0035-kafka-event-streaming-plugin
