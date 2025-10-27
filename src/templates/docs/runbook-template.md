# Runbook: [Service Name]

**Service**: [Service Name]
**Owner**: @team-name
**On-Call**: @on-call-rotation
**Last Updated**: YYYY-MM-DD

---

## Service Overview

**What is this service?**

Brief description of the service:
- What does it do?
- What is its purpose?
- What are its dependencies?

**Architecture**: [Link to HLD](../architecture/hld-{system}.md)

## SLOs / SLIs

**Service Level Objectives**

| SLI | Target | Measurement | Alert Threshold |
|-----|--------|-------------|-----------------|
| Availability | 99.9% | Uptime monitoring | < 99.5% |
| Latency (p95) | < 200ms | APM metrics | > 300ms |
| Latency (p99) | < 500ms | APM metrics | > 700ms |
| Error Rate | < 0.1% | Error logs | > 0.5% |

**SLO Documentation**: [Link to SLO](slo-{service}.md)

## Dashboards & Alerts

**Where to find monitoring**

### Dashboards
- **Primary Dashboard**: [Grafana Link]
- **Metrics Dashboard**: [Datadog/New Relic Link]
- **Logs Dashboard**: [Splunk/ELK Link]

### Alerts
- **PagerDuty**: [Service Link]
- **Slack**: #alerts-{service}
- **Email**: alerts@example.com

### Key Metrics to Watch
- **CPU Usage**: Should be < 70%
- **Memory Usage**: Should be < 80%
- **Disk Usage**: Should be < 85%
- **Response Time**: p95 < 200ms
- **Error Rate**: < 0.1%

## Common Failures & Diagnostics

**Known issues and how to diagnose**

### Issue 1: High Latency
**Symptoms**:
- API response time > 500ms
- User complaints about slow performance

**Diagnosis**:
```bash
# Check current response times
curl -w "@curl-format.txt" https://api.example.com/health

# Check database query performance
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check cache hit rate
redis-cli INFO stats | grep keyspace
```

**Root Causes**:
- Database query slow
- Cache miss rate high
- External API timeout

**Resolution**: See "Procedures" section

### Issue 2: Service Unavailable
**Symptoms**:
- 503 Service Unavailable errors
- Health check failing

**Diagnosis**:
```bash
# Check service status
systemctl status {service-name}

# Check logs
journalctl -u {service-name} -n 100

# Check container status (if Docker/K8s)
docker ps | grep {service-name}
kubectl get pods -n {namespace}
```

**Root Causes**:
- Service crashed
- Out of memory
- Database connection pool exhausted

**Resolution**: See "Procedures" section

### Issue 3: Database Connection Errors
**Symptoms**:
- "Connection refused" errors
- "Too many connections" errors

**Diagnosis**:
```bash
# Check database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection pool
# (command varies by framework)
```

**Root Causes**:
- Database down
- Connection pool exhausted
- Network issue

**Resolution**: See "Procedures" section

## Step-by-step Procedures

**How to perform common tasks**

### Procedure 1: Restart Service
```bash
# 1. Check service status
systemctl status {service-name}

# 2. Stop service gracefully
systemctl stop {service-name}

# 3. Wait for connections to drain (30 seconds)
sleep 30

# 4. Start service
systemctl start {service-name}

# 5. Verify service is running
systemctl status {service-name}

# 6. Check health endpoint
curl https://api.example.com/health

# 7. Monitor logs for errors
journalctl -u {service-name} -f
```

### Procedure 2: Scale Service (Horizontal)
```bash
# For Kubernetes:
kubectl scale deployment {deployment-name} --replicas=5 -n {namespace}

# For Docker Swarm:
docker service scale {service-name}=5

# For EC2 Auto Scaling:
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name {asg-name} \
  --desired-capacity 5
```

### Procedure 3: Clear Cache
```bash
# Connect to Redis
redis-cli

# Clear all keys (DANGEROUS - use with caution)
FLUSHALL

# Or clear specific pattern
KEYS "user:*" | xargs redis-cli DEL

# Verify cache is cleared
DBSIZE
```

### Procedure 4: Database Failover
```bash
# 1. Check current primary
psql -c "SELECT pg_is_in_recovery();"

# 2. Promote standby to primary
pg_ctl promote -D /var/lib/postgresql/data

# 3. Update application config to point to new primary
# (update environment variables or config file)

# 4. Restart application
systemctl restart {service-name}

# 5. Verify connectivity
psql -h {new-primary-host} -c "SELECT 1;"
```

### Procedure 5: Rollback Deployment
```bash
# For Kubernetes:
kubectl rollout undo deployment/{deployment-name} -n {namespace}

# For Docker:
docker service update --rollback {service-name}

# For plain systemd:
# 1. Stop service
systemctl stop {service-name}

# 2. Restore previous version (from backup or git)
git checkout {previous-tag}
./deploy.sh

# 3. Start service
systemctl start {service-name}
```

## Escalation & Ownership

**Who to contact**

### Primary On-Call
- **Rotation**: [PagerDuty Link]
- **Slack**: #on-call-{team}
- **Email**: oncall-{team}@example.com

### Escalation Path
1. **L1 - On-Call Engineer**: First responder
2. **L2 - Team Lead**: If issue persists > 30 minutes
3. **L3 - Engineering Manager**: If issue persists > 1 hour
4. **L4 - CTO/VP Engineering**: If critical outage > 2 hours

### Subject Matter Experts
- **Database**: @dba-team
- **Infrastructure**: @devops-team
- **Security**: @security-team
- **Networking**: @network-team

## DR / Backup / Restore

**Disaster recovery procedures**

### Backup Strategy
- **Database Backups**: Daily full backup, hourly incremental
- **File Backups**: Daily backup to S3
- **Retention**: 30 days
- **Location**: AWS S3 `s3://backups-{environment}/`

### Restore Procedure
```bash
# 1. List available backups
aws s3 ls s3://backups-prod/database/

# 2. Download backup
aws s3 cp s3://backups-prod/database/backup-YYYY-MM-DD.sql.gz .

# 3. Stop application
systemctl stop {service-name}

# 4. Restore database
gunzip backup-YYYY-MM-DD.sql.gz
psql < backup-YYYY-MM-DD.sql

# 5. Verify data
psql -c "SELECT count(*) FROM users;"

# 6. Restart application
systemctl start {service-name}

# 7. Verify functionality
curl https://api.example.com/health
```

### RTO/RPO
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour

### DR Runbook
- **Full DR Runbook**: [Link to DR documentation](../governance/disaster-recovery.md)

## Related Documentation

- [HLD: System Design](../architecture/hld-{system}.md)
- [SLO: Service Level Objectives](slo-{service}.md)
- [Incident Response](incident-response.md)
- [DR Plan](../governance/disaster-recovery.md)

---

**Revision History**:
- YYYY-MM-DD: Initial creation
- YYYY-MM-DD: Updated procedure X
