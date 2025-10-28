# Monitoring & Observability

**Purpose**: Set up monitoring, alerting, and observability to detect incidents early.

## Observability Pillars

### 1. Metrics

**What to Monitor**:
- **Application**: Response time, error rate, throughput
- **Infrastructure**: CPU, memory, disk, network
- **Database**: Query time, connections, deadlocks
- **Business**: User signups, revenue, conversions

**Tools**:
- Prometheus + Grafana
- DataDog
- New Relic
- CloudWatch (AWS)
- Azure Monitor

---

#### Key Metrics by Layer

**Application Metrics**:
```
http_requests_total               # Total requests
http_request_duration_seconds     # Response time (histogram)
http_requests_errors_total        # Error count
http_requests_in_flight           # Concurrent requests
```

**Infrastructure Metrics**:
```
node_cpu_seconds_total            # CPU usage
node_memory_usage_bytes           # Memory usage
node_disk_usage_bytes             # Disk usage
node_network_receive_bytes_total  # Network in
```

**Database Metrics**:
```
pg_stat_database_tup_returned     # Rows returned
pg_stat_database_tup_fetched      # Rows fetched
pg_stat_database_deadlocks        # Deadlock count
pg_stat_activity_connections      # Active connections
```

---

### 2. Logs

**What to Log**:
- **Application logs**: Errors, warnings, info
- **Access logs**: HTTP requests (nginx, apache)
- **System logs**: Kernel, systemd, auth
- **Audit logs**: Security events, data access

**Log Levels**:
- **ERROR**: Application errors, exceptions
- **WARN**: Potential issues (deprecated API, high latency)
- **INFO**: Normal operations (user login, job completed)
- **DEBUG**: Detailed troubleshooting (only in dev)

**Tools**:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- CloudWatch Logs
- Azure Log Analytics

---

#### Structured Logging

**BAD** (unstructured):
```javascript
console.log("User logged in: " + userId);
```

**GOOD** (structured JSON):
```javascript
logger.info("User logged in", {
  userId: 123,
  ip: "192.168.1.1",
  timestamp: "2025-10-26T12:00:00Z",
  userAgent: "Mozilla/5.0...",
});

// Output:
// {"level":"info","message":"User logged in","userId":123,"ip":"192.168.1.1",...}
```

**Benefits**:
- Queryable (filter by userId)
- Machine-readable
- Consistent format

---

### 3. Traces

**Purpose**: Track request flow through distributed systems

**Example**:
```
User Request → API Gateway → Auth Service → Payment Service → Database
     1ms           2ms            50ms            100ms          30ms
                                                  ↑ SLOW SPAN
```

**Tools**:
- Jaeger
- Zipkin
- AWS X-Ray
- DataDog APM
- New Relic

**When to Use**:
- Microservices architecture
- Slow requests (which service is slow?)
- Debugging distributed systems

---

## Alerting Best Practices

### Alert on Symptoms, Not Causes

**BAD** (cause-based):
- Alert: "CPU usage >80%"
- Problem: CPU can be high without user impact

**GOOD** (symptom-based):
- Alert: "API response time >1s"
- Why: Users actually experiencing slowness

---

### Alert Severity Levels

**P1 (SEV1) - Page On-Call**:
- Service down (availability <99%)
- Data loss
- Security breach
- Response time >5s (unusable)

**P2 (SEV2) - Notify During Business Hours**:
- Degraded performance (response time >1s)
- Error rate >1%
- Disk >90% full

**P3 (SEV3) - Email/Slack**:
- Warning signs (disk >80%, memory >80%)
- Non-critical errors
- Monitoring gaps

---

### Alert Fatigue Prevention

**Rules**:
1. **Actionable**: Every alert must have clear action
2. **Meaningful**: Alert only on real problems
3. **Context**: Include relevant info (which server, which metric)
4. **Deduplicate**: Don't alert 100 times for same issue
5. **Escalate**: Auto-escalate if not acknowledged

**Example Bad Alert**:
```
Subject: Alert
Body: Server is down
```

**Example Good Alert**:
```
Subject: [P1] API Server Down - Production
Body:
- Service: api.example.com
- Issue: Health check failing for 5 minutes
- Impact: All users affected (100%)
- Runbook: https://wiki.example.com/runbook/api-down
- Dashboard: https://grafana.example.com/d/api
```

---

## Monitoring Setup

### Application Monitoring

#### Prometheus + Grafana

**Install Prometheus Client** (Node.js):
```javascript
const client = require('prom-client');

// Enable default metrics (CPU, memory, etc.)
client.collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
});

// Instrument code
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route.path, status: res.statusCode });
  });
  next();
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(client.register.metrics());
});
```

**Prometheus Config** (prometheus.yml):
```yaml
scrape_configs:
  - job_name: 'api-server'
    static_configs:
      - targets: ['localhost:3000']
    scrape_interval: 15s
```

---

### Log Aggregation

#### ELK Stack

**Application** (send logs to Logstash):
```javascript
const winston = require('winston');
const LogstashTransport = require('winston-logstash-transport').LogstashTransport;

const logger = winston.createLogger({
  transports: [
    new LogstashTransport({
      host: 'logstash.example.com',
      port: 5000,
    }),
  ],
});

logger.info('User logged in', { userId: 123, ip: '192.168.1.1' });
```

**Logstash Config**:
```
input {
  tcp {
    port => 5000
    codec => json
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "application-logs-%{+YYYY.MM.dd}"
  }
}
```

---

### Health Checks

**Purpose**: Check if service is healthy and ready to serve traffic

**Types**:
1. **Liveness**: Is the service running? (restart if fails)
2. **Readiness**: Is the service ready to serve traffic? (remove from load balancer if fails)

**Example** (Express.js):
```javascript
// Liveness probe (simple check)
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Readiness probe (check dependencies)
app.get('/ready', async (req, res) => {
  try {
    // Check database
    await db.query('SELECT 1');

    // Check Redis
    await redis.ping();

    // Check external API
    await fetch('https://api.external.com/health');

    res.status(200).send('Ready');
  } catch (error) {
    res.status(503).send('Not ready');
  }
});
```

**Kubernetes**:
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

### SLI, SLO, SLA

**SLI** (Service Level Indicator):
- Metrics that measure service quality
- Examples: Response time, error rate, availability

**SLO** (Service Level Objective):
- Target for SLI
- Examples: "99.9% availability", "p95 response time <500ms"

**SLA** (Service Level Agreement):
- Contract with users (with penalties)
- Examples: "99.9% uptime or refund"

**Example**:
```
SLI: Availability = (successful requests / total requests) * 100
SLO: Availability must be ≥99.9% per month
SLA: If availability <99.9%, users get 10% refund
```

---

## Monitoring Checklist

**Application**:
- [ ] Response time metrics (p50, p95, p99)
- [ ] Error rate metrics (4xx, 5xx)
- [ ] Throughput metrics (requests per second)
- [ ] Health check endpoint (/healthz, /ready)
- [ ] Structured logging (JSON format)
- [ ] Distributed tracing (if microservices)

**Infrastructure**:
- [ ] CPU, memory, disk, network metrics
- [ ] System logs (syslog, journalctl)
- [ ] Cloud metrics (CloudWatch, Azure Monitor)
- [ ] Disk I/O metrics (iostat)

**Database**:
- [ ] Query performance metrics
- [ ] Connection pool metrics
- [ ] Slow query log enabled
- [ ] Deadlock monitoring

**Alerts**:
- [ ] P1 alerts for critical issues (page on-call)
- [ ] P2 alerts for degraded performance
- [ ] Runbook linked in alerts
- [ ] Dashboard linked in alerts
- [ ] Escalation policy configured

**Dashboards**:
- [ ] Overview dashboard (RED metrics: Rate, Errors, Duration)
- [ ] Infrastructure dashboard (CPU, memory, disk)
- [ ] Database dashboard (queries, connections)
- [ ] Business metrics dashboard (signups, revenue)

---

## Common Monitoring Patterns

### RED Method (for services)

**Rate**: Requests per second
**Errors**: Error rate (%)
**Duration**: Response time (p50, p95, p99)

**Dashboard**:
```
+-----------------+  +-----------------+  +-----------------+
|      Rate       |  |     Errors      |  |    Duration     |
|  1000 req/s     |  |      0.5%       |  | p95: 250ms      |
+-----------------+  +-----------------+  +-----------------+
```

### USE Method (for resources)

**Utilization**: % of resource used (CPU, memory, disk)
**Saturation**: Queue depth, backlog
**Errors**: Error count

**Dashboard**:
```
CPU: 70% utilization, 0.5 load average, 0 errors
Memory: 80% utilization, 0 swap, 0 OOM kills
Disk: 60% utilization, 5ms latency, 0 I/O errors
```

---

## Tools Comparison

| Tool | Type | Best For | Cost |
|------|------|----------|------|
| Prometheus + Grafana | Metrics | Self-hosted, cost-effective | Free |
| DataDog | Metrics, Logs, APM | All-in-one, easy setup | $15/host/month |
| New Relic | APM | Application performance | $99/user/month |
| ELK Stack | Logs | Log aggregation | Free (self-hosted) |
| Splunk | Logs | Enterprise log analysis | $1800/GB/year |
| Jaeger | Traces | Distributed tracing | Free |
| CloudWatch | Metrics, Logs | AWS-native | $0.30/metric/month |
| Azure Monitor | Metrics, Logs | Azure-native | $0.25/metric/month |

---

## Related Documentation

- [SKILL.md](../SKILL.md) - Main SRE agent
- [backend-diagnostics.md](backend-diagnostics.md) - Application troubleshooting
- [database-diagnostics.md](database-diagnostics.md) - Database monitoring
- [infrastructure.md](infrastructure.md) - Infrastructure monitoring
