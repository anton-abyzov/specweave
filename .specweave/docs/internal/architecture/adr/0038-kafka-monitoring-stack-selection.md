# ADR-0038: Kafka Monitoring Stack Selection

**Date**: 2025-11-15
**Status**: Accepted

## Context

Production Kafka deployments require comprehensive observability to detect performance bottlenecks, consumer lag, broker failures, and capacity issues. Multiple monitoring stacks exist with different levels of complexity, vendor lock-in, and feature sets.

**Available Monitoring Options** (as of 2025-11):

1. **Prometheus + Grafana** (Industry Standard)
   - **Components**: JMX Exporter, kafka_exporter, Grafana dashboards
   - **Metrics**: Broker metrics, topic metrics, consumer lag, producer metrics, JVM metrics
   - **Maturity**: Production-grade, widely adopted (70%+ of Kafka deployments)
   - **Pros**: Open source, vendor-neutral, extensive community dashboards
   - **Cons**: Setup complexity, requires JMX Exporter configuration

2. **OpenTelemetry** (Vendor-Neutral Standard)
   - **Components**: OTel Collector, Kafka Metrics Receiver, OTel Java Agent
   - **Metrics**: Full OpenTelemetry spec, distributed tracing, logs
   - **Maturity**: Emerging (2023+), CNCF graduated project
   - **Pros**: Unified observability (metrics + traces + logs), vendor-neutral
   - **Cons**: More complex setup, fewer Kafka-specific dashboards

3. **Confluent Control Center** (Confluent Cloud)
   - **Components**: Integrated monitoring (part of Confluent Cloud)
   - **Metrics**: Pre-built dashboards, consumer lag monitoring, Schema Registry metrics
   - **Maturity**: Production-grade (Confluent only)
   - **Pros**: Zero setup, integrated with Confluent Cloud, excellent UX
   - **Cons**: Confluent Cloud only, vendor lock-in, proprietary

4. **Cloud-Native Monitoring** (AWS CloudWatch, Azure Monitor)
   - **Components**: AWS CloudWatch (MSK), Azure Monitor (Event Hubs)
   - **Metrics**: Broker metrics, request metrics, network I/O
   - **Maturity**: Production-grade (cloud platforms only)
   - **Pros**: Native cloud integration, no additional infrastructure
   - **Cons**: Cloud-specific, limited custom metrics, cost per metric

5. **Grafana Mimir + Kafka Ingest** (Emerging)
   - **Components**: Grafana Mimir 3.0 with asynchronous Kafka ingest
   - **Metrics**: All Prometheus metrics + Kafka-native ingestion
   - **Maturity**: New (2024+), early adoption
   - **Pros**: Kafka-native architecture, decoupled producers/consumers
   - **Cons**: Newer technology, limited production adoption

**Key Decision Factors**:
- Deployment flexibility (self-hosted vs cloud-managed)
- Setup complexity (zero-config vs manual)
- Feature completeness (metrics, traces, logs)
- Vendor neutrality (open standards vs proprietary)
- Cost (open source vs commercial)
- Community support (dashboards, plugins)

**Requirements from User Stories**:
- US-008: Prometheus Kafka Exporter Integration (P1) - Broker, topic, consumer lag metrics
- US-009: Grafana Kafka Dashboards (P1) - Pre-built dashboards for cluster overview, topics, consumers
- US-010: OpenTelemetry Kafka Instrumentation (P2) - Distributed tracing for message flows
- NFR-008: Observability - Structured logging (JSON), metric export (Prometheus), distributed tracing

## Decision

We will implement a **multi-stack strategy with template-based deployment**:

1. **Default: Prometheus + Grafana** (P1) - For all platforms (self-hosted, AWS MSK, Azure, Confluent Cloud)
2. **Alternative: OpenTelemetry** (P2) - For distributed tracing and unified observability
3. **Cloud-Native Fallback**: AWS CloudWatch (AWS MSK), Azure Monitor (Event Hubs), Confluent Control Center (Confluent Cloud)

**Rationale**:
- Prometheus + Grafana is the industry standard (70%+ adoption), well-documented, vendor-neutral
- OpenTelemetry provides future-proof observability with distributed tracing
- Cloud-native options provide zero-setup fallback for managed platforms

**Implementation Approach**:
- Provide Terraform modules for each monitoring stack
- Pre-built Grafana dashboards for Kafka monitoring
- Auto-detection of monitoring stack based on platform
- User can override via configuration

## Alternatives Considered

### Alternative 1: Prometheus + Grafana Only

**Pros**:
- Single monitoring stack to maintain
- Industry standard (70%+ adoption)
- Extensive community dashboards
- Well-documented

**Cons**:
- No distributed tracing (can't trace message flows across services)
- No support for cloud-native metrics (CloudWatch, Azure Monitor)
- Doesn't support emerging Kafka-native architectures (Grafana Mimir)

**Why NOT chosen**: Doesn't meet US-010 (OpenTelemetry distributed tracing requirement), limits cloud-native users.

### Alternative 2: OpenTelemetry Only

**Pros**:
- Unified observability (metrics + traces + logs)
- Vendor-neutral (CNCF standard)
- Future-proof
- Supports distributed tracing

**Cons**:
- More complex setup (OTel Collector, exporters)
- Fewer Kafka-specific dashboards
- Newer technology (less production adoption)
- Not all platforms have OTel support out-of-the-box

**Why NOT chosen**: Setup complexity violates US-006 (one-command local setup), fewer community resources.

### Alternative 3: Cloud-Native Only (CloudWatch + Azure Monitor + Confluent Control Center)

**Pros**:
- Zero setup for cloud platforms
- Native integration
- No additional infrastructure
- Cost-effective for small deployments

**Cons**:
- No support for self-hosted Kafka (70% of deployments)
- Vendor lock-in (can't switch clouds without changing monitoring)
- Limited custom metrics
- Cost scales with metric volume

**Why NOT chosen**: Excludes self-hosted Kafka (AC-US5-01 P1 requirement), vendor lock-in violates SpecWeave's platform-agnostic principle.

### Alternative 4: Build Custom Monitoring Stack

**Pros**:
- Full control over features
- Optimized for SpecWeave use cases
- Kafka-native architecture

**Cons**:
- Massive development effort (6+ months)
- Maintenance burden
- Duplicates existing solutions
- Monitoring is a complex domain (storage, aggregation, visualization)

**Why NOT chosen**: Not aligned with SpecWeave's principle of leveraging existing tools. Reinventing Prometheus/Grafana is not justified.

## Consequences

### Positive

✅ **Platform Flexibility**: Works with all Kafka platforms
- Self-hosted Kafka → Prometheus + Grafana
- Confluent Cloud → Confluent Control Center (optional), or Prometheus + Grafana
- AWS MSK → AWS CloudWatch (optional), or Prometheus + Grafana
- Azure Event Hubs → Azure Monitor (optional), or Prometheus + Grafana

✅ **Best-in-Class Features**:
- Prometheus: Industry-standard metrics collection, extensive community dashboards
- OpenTelemetry: Distributed tracing for complex event-driven architectures
- Cloud-native: Zero-setup for managed platforms

✅ **Vendor Neutrality**: Prometheus + Grafana are open source, no vendor lock-in
- Easy to migrate between cloud providers
- Export metrics to any backend (Prometheus, InfluxDB, Datadog, etc.)

✅ **Extensive Community Resources**:
- 100+ pre-built Grafana dashboards for Kafka
- Well-documented JMX Exporter configuration
- Active community support (Prometheus, Grafana)

✅ **Distributed Tracing** (OpenTelemetry):
- Trace message flows across producers → Kafka → consumers
- Identify bottlenecks in event-driven architectures
- Correlate Kafka metrics with application metrics

### Negative

❌ **Multiple Stacks to Maintain**: 3 monitoring stacks (Prometheus, OpenTelemetry, cloud-native)
- Different configuration formats
- Different dashboard formats
- Different query languages (PromQL, OTEL query API, CloudWatch Insights)

**Mitigation**: Provide pre-built templates for each stack, auto-generate configurations

❌ **Setup Complexity** (Prometheus + Grafana):
- Requires JMX Exporter on Kafka brokers
- Requires kafka_exporter for topic/consumer metrics
- Requires Grafana dashboard import

**Mitigation**: Terraform modules automate setup, one-command deployment (`/specweave-kafka:monitor-setup`)

❌ **Resource Overhead** (Prometheus + Grafana):
- Additional infrastructure (Prometheus server, Grafana instance)
- Storage for metrics (time-series database)
- CPU/memory overhead for metric scraping

**Mitigation**: Provide resource sizing guidelines, support cloud-managed Prometheus (Amazon Managed Prometheus, Azure Monitor Prometheus)

❌ **Learning Curve**: Users must learn PromQL (Prometheus Query Language)
- Not as intuitive as SQL
- Requires understanding of metric types (counter, gauge, histogram)

**Mitigation**: Pre-built dashboards hide PromQL complexity, provide query templates

### Neutral

🔄 **Monitoring Stack Selection**: Users choose based on platform and requirements
- Default: Prometheus + Grafana (works everywhere)
- Advanced: OpenTelemetry (distributed tracing)
- Cloud-native: CloudWatch/Azure Monitor (zero setup)

🔄 **Cost**: Varies by monitoring stack
- Prometheus + Grafana: Infrastructure cost (EC2, storage)
- OpenTelemetry: Similar to Prometheus (OTel Collector overhead)
- Cloud-native: Per-metric pricing (can be expensive at scale)

## Implementation Details

### Monitoring Stack Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Kafka Cluster (3 brokers)                  │
│                                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │ Broker 1│  │ Broker 2│  │ Broker 3│                      │
│  │         │  │         │  │         │                      │
│  │ JMX     │  │ JMX     │  │ JMX     │  ← JMX Exporter     │
│  │ 9999    │  │ 9999    │  │ 9999    │    (JVM metrics)     │
│  └─────────┘  └─────────┘  └─────────┘                      │
└─────────────────────────────────────────────────────────────┘
         │              │              │
         └──────────────┴──────────────┘
                        │
                        ▼
         ┌──────────────────────────┐
         │   kafka_exporter         │  ← Topic, consumer lag metrics
         │   (Prometheus format)    │
         └──────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────┐
         │   Prometheus Server      │  ← Scrapes metrics every 15s
         │   (Time-series DB)       │
         └──────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────┐
         │   Grafana                │  ← Dashboards, alerts
         │   (Visualization)        │
         └──────────────────────────┘
```

### Prometheus + Grafana Setup (Terraform)

```hcl
# plugins/specweave-kafka/terraform/monitoring/prometheus-grafana/main.tf

# Deploy JMX Exporter on Kafka brokers
resource "null_resource" "jmx_exporter" {
  count = var.broker_count

  provisioner "remote-exec" {
    inline = [
      "wget https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.20.0/jmx_prometheus_javaagent-0.20.0.jar",
      "sudo mkdir -p /opt/kafka/jmx_exporter",
      "sudo mv jmx_prometheus_javaagent-0.20.0.jar /opt/kafka/jmx_exporter/",
      "sudo wget -O /opt/kafka/jmx_exporter/kafka-broker.yml ${var.jmx_exporter_config_url}"
    ]

    connection {
      type        = "ssh"
      host        = var.broker_ips[count.index]
      user        = var.ssh_user
      private_key = file(var.ssh_key_path)
    }
  }
}

# Deploy kafka_exporter
resource "docker_container" "kafka_exporter" {
  name  = "kafka_exporter"
  image = "danielqsj/kafka-exporter:latest"

  command = [
    "--kafka.server=${var.bootstrap_servers}",
    "--sasl.enabled",
    "--sasl.mechanism=scram-sha256",
    "--sasl.username=${var.sasl_username}",
    "--sasl.password=${var.sasl_password}",
    "--tls.enabled"
  ]

  ports {
    internal = 9308
    external = 9308
  }
}

# Deploy Prometheus
resource "docker_container" "prometheus" {
  name  = "prometheus"
  image = "prom/prometheus:latest"

  volumes {
    host_path      = "${path.module}/prometheus.yml"
    container_path = "/etc/prometheus/prometheus.yml"
  }

  ports {
    internal = 9090
    external = 9090
  }
}

# Deploy Grafana
resource "docker_container" "grafana" {
  name  = "grafana"
  image = "grafana/grafana:latest"

  env = [
    "GF_SECURITY_ADMIN_PASSWORD=${var.grafana_admin_password}",
    "GF_INSTALL_PLUGINS=grafana-piechart-panel"
  ]

  ports {
    internal = 3000
    external = 3000
  }

  volumes {
    host_path      = "${path.module}/grafana/dashboards"
    container_path = "/etc/grafana/provisioning/dashboards"
  }

  volumes {
    host_path      = "${path.module}/grafana/datasources"
    container_path = "/etc/grafana/provisioning/datasources"
  }
}

output "prometheus_url" {
  value = "http://localhost:9090"
}

output "grafana_url" {
  value = "http://localhost:3000"
}
```

### Prometheus Configuration (prometheus.yml)

```yaml
# plugins/specweave-kafka/terraform/monitoring/prometheus-grafana/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Kafka broker JMX metrics
  - job_name: 'kafka-brokers-jmx'
    static_configs:
      - targets:
          - 'broker1:9999'
          - 'broker2:9999'
          - 'broker3:9999'

  # Kafka topic and consumer metrics
  - job_name: 'kafka-exporter'
    static_configs:
      - targets: ['kafka_exporter:9308']

  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

### Pre-Built Grafana Dashboards

**Dashboard 1: Kafka Cluster Overview** (ID: 7589)
- Metrics: Active brokers, total topics, total partitions, under-replicated partitions
- Graphs: Broker CPU, memory, disk usage, network I/O
- Alerts: Broker down, under-replicated partitions

**Dashboard 2: Kafka Topic Performance** (ID: 10973)
- Metrics: Messages per topic, bytes per topic, request latency
- Graphs: Topic throughput (messages/sec), byte rate (MB/sec)
- Alerts: Topic lag > 10k, request latency > 500ms

**Dashboard 3: Kafka Consumer Monitoring** (ID: 11962)
- Metrics: Consumer group lag, offset progress, consumer errors
- Graphs: Lag per partition, consumer throughput
- Alerts: Consumer lag > 10k messages, consumer errors > 1%

### OpenTelemetry Integration (Optional)

```yaml
# plugins/specweave-kafka/otel/otel-collector-config.yaml

receivers:
  kafkametrics:
    brokers:
      - kafka.example.com:9092
    protocol_version: 3.6.0
    scrapers:
      - brokers
      - topics
      - consumers

  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"

  jaeger:
    endpoint: "jaeger:14250"
    tls:
      insecure: true

service:
  pipelines:
    metrics:
      receivers: [kafkametrics, otlp]
      exporters: [prometheus]

    traces:
      receivers: [otlp]
      exporters: [jaeger]
```

### Monitoring Stack Selection Logic

```typescript
// plugins/specweave-kafka/lib/monitoring-detector.ts

export class MonitoringStackDetector {
  async detectPreferredStack(): Promise<MonitoringStack> {
    // Priority 1: User override in config
    const userPreference = await this.config.get('monitoring.preferredStack');
    if (userPreference) {
      return this.validateStack(userPreference);
    }

    // Priority 2: Cloud platform detection
    const platform = await this.detectPlatform();
    if (platform === 'confluent-cloud') {
      return 'confluent-control-center';  // Zero setup
    }
    if (platform === 'aws-msk' && await this.isCloudWatchEnabled()) {
      return 'aws-cloudwatch';  // Native AWS integration
    }
    if (platform === 'azure-event-hubs' && await this.isAzureMonitorEnabled()) {
      return 'azure-monitor';  // Native Azure integration
    }

    // Priority 3: Check if OpenTelemetry is available
    const hasOTel = await this.isOpenTelemetryAvailable();
    if (hasOTel && await this.config.get('monitoring.enableDistributedTracing')) {
      return 'opentelemetry';
    }

    // Priority 4: Default to Prometheus + Grafana
    return 'prometheus-grafana';
  }

  async setupMonitoring(stack: MonitoringStack): Promise<void> {
    switch (stack) {
      case 'prometheus-grafana':
        await this.setupPrometheusGrafana();
        break;
      case 'opentelemetry':
        await this.setupOpenTelemetry();
        break;
      case 'aws-cloudwatch':
        await this.enableCloudWatch();
        break;
      case 'azure-monitor':
        await this.enableAzureMonitor();
        break;
      case 'confluent-control-center':
        console.log('Confluent Control Center is pre-configured in Confluent Cloud');
        break;
    }
  }
}
```

## Risks

**Risk 1: Metrics Storage Cost**
- **Impact**: Prometheus storage can grow large (GB/day for large clusters)
- **Mitigation**: Configure retention period (15 days default), use remote storage (Thanos, Cortex, Mimir)
- **Probability**: Medium
- **Severity**: Low

**Risk 2: Monitoring Overhead**
- **Impact**: JMX Exporter and kafka_exporter consume CPU/memory
- **Mitigation**: Benchmark overhead (<5% CPU typical), configure scrape intervals
- **Probability**: Low
- **Severity**: Low

**Risk 3: Dashboard Maintenance**
- **Impact**: Grafana dashboards become outdated with new Kafka versions
- **Mitigation**: Use community-maintained dashboards (Grafana marketplace), quarterly review
- **Probability**: Medium
- **Severity**: Low

**Risk 4: Alert Fatigue**
- **Impact**: Too many false positive alerts
- **Mitigation**: Tune alert thresholds, use alert grouping, implement on-call runbooks
- **Probability**: High
- **Severity**: Medium

## Installation Workflow

### Quick Start (Prometheus + Grafana)

```bash
# Auto-detect platform and setup monitoring
/specweave-kafka:monitor-setup

# Output:
# ✓ Detected platform: Self-hosted Kafka
# ✓ Recommended stack: Prometheus + Grafana
#
# Terraform will provision:
# - JMX Exporter on Kafka brokers
# - kafka_exporter (Docker container)
# - Prometheus server (Docker container)
# - Grafana (Docker container)
#
# Pre-built dashboards:
# 1. Kafka Cluster Overview (ID: 7589)
# 2. Kafka Topic Performance (ID: 10973)
# 3. Kafka Consumer Monitoring (ID: 11962)
#
# Continue? [Y/n]
# Applying Terraform configuration...
# ✓ Monitoring stack deployed
#
# Access Grafana: http://localhost:3000 (admin/admin)
```

### Advanced Setup (OpenTelemetry)

```bash
# Enable distributed tracing
/specweave-kafka:monitor-setup --stack opentelemetry

# Output:
# ✓ Selected stack: OpenTelemetry
# ✓ Distributed tracing enabled
#
# Terraform will provision:
# - OTel Collector (Kafka Metrics Receiver)
# - Prometheus (metrics backend)
# - Jaeger (tracing backend)
#
# Instrument your Kafka producers/consumers:
# - Node.js: npm install @opentelemetry/instrumentation-kafkajs
# - Java: Download opentelemetry-javaagent.jar
#
# Continue? [Y/n]
```

## Related Decisions

- **ADR-0035**: Multi-Plugin Architecture - Defines `specweave-kafka` plugin scope
- **ADR-0036**: MCP Server Selection - MCP servers provide runtime metrics
- **ADR-0037**: Terraform Provider Strategy - Terraform deploys monitoring infrastructure
- **ADR-0039**: n8n Integration Approach - Workflow automation for alert handling

## References

- [Prometheus Kafka Exporter](https://github.com/danielqsj/kafka_exporter)
- [JMX Exporter Documentation](https://github.com/prometheus/jmx_exporter)
- [Grafana Kafka Dashboards](https://grafana.com/grafana/dashboards/?search=kafka)
- [OpenTelemetry Kafka Instrumentation](https://opentelemetry.io/docs/instrumentation/js/libraries/#kafka)
- [Grafana Mimir 3.0 Kafka Ingest](https://grafana.com/blog/2024/03/12/grafana-mimir-3.0-release/)
- [SPEC-035: US-008 Prometheus Integration](../../specs/default/spec-035-kafka-plugin.md#us-008-prometheus-kafka-exporter-integration-priority-p1)
- [SPEC-035: US-009 Grafana Dashboards](../../specs/default/spec-035-kafka-plugin.md#us-009-grafana-kafka-dashboards-priority-p1)
- [SPEC-035: US-010 OpenTelemetry Instrumentation](../../specs/default/spec-035-kafka-plugin.md#us-010-opentelemetry-kafka-instrumentation-priority-p2)

---

**Last Updated**: 2025-11-15
**Author**: Architect Agent
**Increment**: 0035-kafka-event-streaming-plugin
