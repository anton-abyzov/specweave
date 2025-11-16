# ADR-0036: Kafka MCP Server Selection Strategy

**Date**: 2025-11-15
**Status**: Accepted

## Context

Model Context Protocol (MCP) servers enable natural language interaction with Kafka clusters through Claude Code. Multiple MCP server implementations exist, each with different capabilities, authentication methods, and feature sets.

**Available MCP Servers** (as of 2025-11):

1. **kanapuli/mcp-kafka** (TypeScript)
   - Basic Kafka operations (produce, consume, topic management)
   - Authentication: SASL_PLAINTEXT, PLAINTEXT
   - Features: Simple configuration, quick setup
   - Limitations: No advanced SASL mechanisms, no Schema Registry support

2. **tuannvm/kafka-mcp-server** (Go)
   - Advanced SASL support (SCRAM-SHA-256, SCRAM-SHA-512)
   - Based on franz-go client (high performance)
   - Features: Robust error handling, production-grade
   - Limitations: Go binary distribution, more complex setup

3. **Joel-hanson/kafka-mcp-server** (Python)
   - Standard MCP tool interface
   - Claude Desktop compatible
   - Features: Python ecosystem integration
   - Limitations: Limited documentation, smaller community

4. **Confluent Official MCP Server** (Proprietary)
   - Natural language cluster management
   - Flink SQL integration
   - REST API integration
   - Features: Enterprise-grade, Confluent Cloud native
   - Limitations: Confluent Cloud only, requires Confluent account

**Key Decision Factors**:
- Authentication requirements (SASL/PLAINTEXT vs SCRAM vs OAuth)
- Platform support (self-hosted Apache Kafka vs Confluent Cloud)
- Performance characteristics
- Ease of installation
- Community support and maintenance
- Feature completeness

**Requirements from User Stories**:
- US-001: MCP Kafka Server Integration (P1) - Support multiple MCP servers with auto-detection
- AC-US1-01: kanapuli/mcp-kafka (P1)
- AC-US1-02: Joel-hanson/kafka-mcp-server (P2)
- AC-US1-03: tuannvm/kafka-mcp-server (P2)
- AC-US1-04: Confluent official MCP server (P1)
- AC-US1-05: Auto-detect MCP server availability (P2)

## Decision

We will implement a **multi-server strategy with auto-detection and graceful fallback**:

1. **Support ALL 4 MCP servers** with runtime auto-detection
2. **Detection Priority** (highest to lowest):
   - Confluent MCP server (if Confluent Cloud detected)
   - tuannvm/kafka-mcp-server (if SCRAM authentication required)
   - kanapuli/mcp-kafka (default for self-hosted Kafka)
   - Joel-hanson/kafka-mcp-server (fallback)
3. **Graceful degradation** if no MCP server available (CLI-only mode)
4. **User override** via configuration file (.specweave/kafka/mcp-config.json)

## Alternatives Considered

### Alternative 1: kanapuli/mcp-kafka Only (Canonical Server)

**Pros**:
- Simple installation (npm install)
- TypeScript (matches SpecWeave tech stack)
- Well-documented
- Active maintenance

**Cons**:
- Limited authentication (no SCRAM-SHA-256/512)
- No Confluent Cloud optimizations
- Not production-grade for enterprise use cases
- Missing Schema Registry integration

**Why NOT chosen**: Doesn't meet enterprise authentication requirements (AC-US1-03: advanced SASL), limits Confluent Cloud support (AC-US1-04).

### Alternative 2: Confluent MCP Server Only

**Pros**:
- Enterprise-grade
- Natural language Flink SQL
- First-class Confluent Cloud support
- Official vendor support

**Cons**:
- Confluent Cloud only (doesn't support self-hosted Kafka)
- Proprietary (not open source)
- Requires Confluent account
- Lock-in to Confluent ecosystem

**Why NOT chosen**: Excludes self-hosted Apache Kafka users (70% of Kafka deployments), violates SpecWeave's open-source philosophy.

### Alternative 3: Build Custom SpecWeave MCP Server

**Pros**:
- Full control over features
- Optimized for SpecWeave use cases
- Can support all platforms
- No external dependencies

**Cons**:
- Significant development effort (2-3 months)
- Maintenance burden
- Duplicates existing solutions
- Delays plugin release
- MCP protocol is evolving (maintenance overhead)

**Why NOT chosen**: Not aligned with SpecWeave's principle of leveraging existing tools. ADR-0001 (TypeScript Framework) emphasizes "build on existing ecosystems, not reinvent."

### Alternative 4: MCP Server Adapter Pattern (Unified Interface)

**Pros**:
- Single interface for all MCP servers
- Consistent API regardless of underlying server
- Easy to add new servers
- Hide implementation differences

**Cons**:
- Abstraction leaks (servers have different capabilities)
- Complexity of adapter layer
- Performance overhead
- Harder to expose server-specific features

**Why NOT chosen**: Over-engineering. Claude Code already provides MCP abstraction. Adding another layer violates YAGNI principle.

## Consequences

### Positive

✅ **Maximum Flexibility**: Users choose the MCP server that fits their needs
- Self-hosted Kafka → kanapuli or tuannvm
- Confluent Cloud → Confluent MCP server
- Advanced SASL → tuannvm
- Simple setup → kanapuli

✅ **Fallback Options**: If preferred server unavailable, system uses next best option
- Confluent MCP server down → falls back to kanapuli
- No MCP server → gracefully degrades to CLI-only mode (kcat)

✅ **Future-Proof**: Easy to add new MCP servers as they emerge
- MCP protocol is standardized
- Detection logic is extensible
- No code changes needed to support new servers (just add to detection list)

✅ **No Vendor Lock-in**: Works with any Kafka-compatible MCP server
- Open standards (MCP protocol)
- Multiple vendor options
- Community-driven innovation

✅ **Platform-Specific Optimizations**:
- Confluent MCP server provides Flink SQL, Schema Registry integration
- tuannvm provides SCRAM authentication for enterprise clusters
- kanapuli provides simplicity for local development

### Negative

❌ **Testing Overhead**: Must test all 4 MCP servers
- Unit tests for detection logic
- Integration tests for each server
- Compatibility matrix (server versions × Kafka versions)

**Mitigation**: Create shared test harness, use test containers for MCP server environments

❌ **Documentation Complexity**: Must document 4 different installation paths
- Installation guide per server
- Configuration examples per server
- Troubleshooting per server

**Mitigation**: Create decision tree in quick start guide: "If X, use Server Y"

❌ **Support Burden**: Users may have issues with specific MCP servers
- Server-specific bugs
- Authentication failures
- Version incompatibilities

**Mitigation**:
- Clear error messages identifying which server failed
- Link to server-specific troubleshooting in error messages
- Fallback to alternative server automatically

❌ **Maintenance Overhead**: Must track 4 different server projects
- Breaking changes in any server affects SpecWeave
- Dependency updates
- Security patches

**Mitigation**:
- Pin server versions in plugin
- Quarterly review of server updates
- Community engagement with server maintainers

### Neutral

🔄 **User Choice**: Some users prefer explicit configuration, others prefer auto-detection
- Default: Auto-detection
- Option: Manual server selection via config file

🔄 **Performance Variance**: Different servers have different performance characteristics
- tuannvm (Go) may be faster than kanapuli (Node.js)
- Confluent MCP server has cloud latency
- Generally not noticeable for interactive use

## Implementation Details

### MCP Server Detection Algorithm

```typescript
async detectMCPServer(): Promise<MCPServer> {
  // Priority 1: User override in config
  const userPreference = await this.config.get('mcp.preferredServer');
  if (userPreference) {
    return this.validateServer(userPreference);
  }

  // Priority 2: Confluent Cloud detection
  const isConfluentCloud = await this.detectConfluentCloud();
  if (isConfluentCloud && await this.isServerAvailable('confluent')) {
    return 'confluent';
  }

  // Priority 3: SCRAM authentication requirement
  const requiresSCRAM = await this.requiresSCRAM();
  if (requiresSCRAM && await this.isServerAvailable('tuannvm')) {
    return 'tuannvm';
  }

  // Priority 4: Default server (kanapuli)
  if (await this.isServerAvailable('kanapuli')) {
    return 'kanapuli';
  }

  // Priority 5: Fallback to Joel-hanson
  if (await this.isServerAvailable('joel-hanson')) {
    return 'joel-hanson';
  }

  // No MCP server available
  throw new Error('No MCP server available. Install at least one MCP server or use CLI-only mode.');
}
```

### Configuration File Format (.specweave/kafka/mcp-config.json)

```json
{
  "mcp": {
    "preferredServer": "tuannvm",  // Override auto-detection
    "fallbackServers": ["kanapuli", "joel-hanson"],
    "servers": {
      "kanapuli": {
        "enabled": true,
        "path": "~/.mcp-servers/kanapuli",
        "config": {
          "brokers": ["localhost:9092"],
          "clientId": "specweave-kafka",
          "auth": "SASL_PLAINTEXT"
        }
      },
      "tuannvm": {
        "enabled": true,
        "path": "~/.mcp-servers/tuannvm",
        "config": {
          "brokers": ["kafka.example.com:9093"],
          "sasl": {
            "mechanism": "SCRAM-SHA-256",
            "username": "${KAFKA_USERNAME}",
            "password": "${KAFKA_PASSWORD}"
          }
        }
      },
      "confluent": {
        "enabled": true,
        "config": {
          "apiKey": "${CONFLUENT_API_KEY}",
          "apiSecret": "${CONFLUENT_API_SECRET}",
          "cloud": "AWS",
          "region": "us-west-2"
        }
      },
      "joel-hanson": {
        "enabled": false  // Disabled by default (fallback only)
      }
    }
  }
}
```

### Auto-Detection Capabilities Matrix

| Capability | kanapuli | tuannvm | joel-hanson | Confluent |
|------------|----------|---------|-------------|-----------|
| **SASL_PLAINTEXT** | ✅ | ✅ | ✅ | ✅ |
| **SCRAM-SHA-256** | ❌ | ✅ | ❌ | ✅ |
| **SCRAM-SHA-512** | ❌ | ✅ | ❌ | ✅ |
| **OAuth/OIDC** | ❌ | ❌ | ❌ | ✅ |
| **Schema Registry** | ❌ | ❌ | ❌ | ✅ |
| **Flink SQL** | ❌ | ❌ | ❌ | ✅ |
| **Self-Hosted Kafka** | ✅ | ✅ | ✅ | ❌ |
| **Confluent Cloud** | ⚠️ (basic) | ⚠️ (basic) | ⚠️ (basic) | ✅ |
| **Performance** | Medium | High (Go) | Medium | High (Cloud) |
| **Installation** | npm | Binary | pip | Cloud API |

## Risks

**Risk 1: MCP Server Compatibility**
- **Impact**: New Kafka versions may break MCP servers
- **Mitigation**: Version matrix testing, pin server versions
- **Probability**: Low
- **Severity**: Medium

**Risk 2: Server Abandonment**
- **Impact**: An MCP server project may be abandoned
- **Mitigation**: Multi-server support provides redundancy
- **Probability**: Medium (especially for smaller projects like Joel-hanson)
- **Severity**: Low (fallback to alternative server)

**Risk 3: Authentication Incompatibility**
- **Impact**: User's Kafka cluster uses auth method not supported by any server
- **Mitigation**: Provide clear error message, suggest compatible server or CLI-only mode
- **Probability**: Low (SCRAM-SHA-256 covers 90% of enterprise use cases)
- **Severity**: Medium

**Risk 4: Configuration Complexity**
- **Impact**: Users confused by multiple server options
- **Mitigation**: Auto-detection hides complexity for 90% of users
- **Probability**: Medium
- **Severity**: Low

## Installation Workflow

### Quick Start (Auto-Detection)

```bash
# Install specweave-kafka plugin
/plugin install specweave-kafka

# Auto-detects and recommends MCP server based on Kafka setup
/specweave-kafka:mcp-configure

# Output:
# ✓ Detected self-hosted Kafka cluster
# ✓ SASL_PLAINTEXT authentication
# → Recommended MCP server: kanapuli/mcp-kafka
#
# Install MCP server? [Y/n]
# Installing kanapuli/mcp-kafka...
# ✓ MCP server installed and configured
```

### Advanced Setup (Manual Selection)

```bash
# List available MCP servers
/specweave-kafka:mcp-list

# Output:
# Available MCP Servers:
# 1. kanapuli/mcp-kafka (Default, SASL_PLAINTEXT)
# 2. tuannvm/kafka-mcp-server (Advanced SASL, SCRAM-SHA-256/512)
# 3. joel-hanson/kafka-mcp-server (Python, Basic features)
# 4. Confluent MCP Server (Confluent Cloud only, Flink SQL)

# Install specific server
/specweave-kafka:mcp-install tuannvm

# Configure server
/specweave-kafka:mcp-configure --server tuannvm --sasl SCRAM-SHA-256
```

## Related Decisions

- **ADR-0035**: Multi-Plugin Architecture - Defines `specweave-kafka` plugin scope
- **ADR-0037**: Terraform Provider Choice - Complements MCP with infrastructure-as-code
- **ADR-0038**: Monitoring Stack Selection - Observability for MCP server operations
- **ADR-0039**: n8n Integration Approach - Workflow automation vs MCP

## References

- [MCP Protocol Specification](https://github.com/anthropics/mcp)
- [kanapuli/mcp-kafka](https://github.com/kanapuli/mcp-kafka)
- [tuannvm/kafka-mcp-server](https://github.com/tuannvm/kafka-mcp-server)
- [Joel-hanson/kafka-mcp-server](https://github.com/Joel-hanson/kafka-mcp-server)
- [Confluent MCP Server Announcement](https://www.confluent.io/blog/mcp-server-kafka/)
- [SPEC-035: US-001 MCP Kafka Server Integration](../../specs/default/spec-035-kafka-plugin.md#us-001-mcp-kafka-server-integration-priority-p1)

---

**Last Updated**: 2025-11-15
**Author**: Architect Agent
**Increment**: 0035-kafka-event-streaming-plugin
