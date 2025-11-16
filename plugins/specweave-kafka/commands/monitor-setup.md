---
name: specweave-kafka:monitor-setup
description: Set up comprehensive Kafka monitoring with Prometheus + Grafana. Configures JMX exporter, dashboards, and alerting rules.
---

# Set Up Kafka Monitoring

Configure comprehensive monitoring for your Kafka cluster using Prometheus and Grafana.

## What This Command Does

1. **JMX Exporter Setup**: Configure Prometheus JMX exporter for Kafka brokers
2. **Prometheus Configuration**: Add Kafka scrape targets
3. **Grafana Dashboards**: Install 5 pre-built dashboards
4. **Alerting Rules**: Configure 14 critical/high/warning alerts
5. **Verification**: Test metrics collection and dashboard access

## Interactive Workflow

I'll detect your environment and guide setup:

### Environment Detection
- **Kubernetes** (Strimzi/Confluent Operator) → Use PodMonitor
- **Docker Compose** → Add Prometheus + Grafana services
- **VM/Bare Metal** → Configure JMX exporter JAR

### Question 1: Where is Kafka running?
- Kubernetes (Strimzi)
- Docker Compose
- VMs/EC2 instances

### Question 2: Prometheus already installed?
- Yes → Just add Kafka scrape config
- No → Install Prometheus + Grafana stack

## Example Usage

```bash
# Start monitoring setup wizard
/specweave-kafka:monitor-setup

# I'll activate kafka-observability skill and:
# 1. Detect your environment
# 2. Configure JMX exporter (port 7071)
# 3. Set up Prometheus scraping
# 4. Install 5 Grafana dashboards
# 5. Configure 14 alerting rules
# 6. Verify metrics collection
```

## What Gets Configured

**JMX Exporter** (Kafka brokers):
- Metrics endpoint on port 7071
- 50+ critical Kafka metrics exported
- Broker, topic, consumer lag, JVM metrics

**Prometheus Scraping**:
```yaml
scrape_configs:
  - job_name: 'kafka'
    static_configs:
      - targets: ['kafka-0:7071', 'kafka-1:7071', 'kafka-2:7071']
```

**5 Grafana Dashboards**:
1. **Cluster Overview** - Health, throughput, ISR changes
2. **Broker Metrics** - CPU, memory, network, request handlers
3. **Consumer Lag** - Lag per group/topic, offset tracking
4. **Topic Metrics** - Partition count, replication, log size
5. **JVM Metrics** - Heap, GC, threads, file descriptors

**14 Alerting Rules**:
- CRITICAL: Under-replicated partitions, offline partitions, no controller
- HIGH: Consumer lag, ISR shrinks, leader elections
- WARNING: CPU, memory, GC time, disk usage

## Prerequisites

- Kafka cluster running (self-hosted or K8s)
- Prometheus installed (or will be installed)
- Grafana installed (or will be installed)

## Post-Setup

After setup completes, I'll:
1. ✅ Provide Grafana URL and credentials
2. ✅ Show how to access dashboards
3. ✅ Explain critical alerts
4. ✅ Suggest testing alerts by stopping a broker

---

**Skills Activated**: kafka-observability
**Related Commands**: /specweave-kafka:deploy
**Dashboard Locations**: `plugins/specweave-kafka/monitoring/grafana/dashboards/`
