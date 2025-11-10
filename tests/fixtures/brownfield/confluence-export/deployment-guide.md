---
expected_type: module
expected_confidence: medium
source: confluence
keywords_density: medium
---

# Deployment Guide

## Environments

We maintain three environments:

1. **Development**: Local development
2. **Staging**: Pre-production testing
3. **Production**: Live user-facing

## Deployment Process

### Automated Deployments (Preferred)

Deployments are triggered automatically on merge to specific branches:

- `develop` → Staging environment
- `main` → Production environment

**Pipeline Stages**:
1. Run tests (unit + integration)
2. Build Docker image
3. Push to container registry
4. Deploy to Kubernetes cluster
5. Run smoke tests
6. Send Slack notification

### Manual Deployment (Emergency)

If automated deployment fails:

```bash
# 1. Build image
docker build -t app:version .

# 2. Push to registry
docker push registry.company.com/app:version

# 3. Deploy to K8s
kubectl set image deployment/app app=registry.company.com/app:version

# 4. Verify rollout
kubectl rollout status deployment/app

# 5. Run smoke tests
./scripts/smoke-tests.sh
```

## Configuration

### Environment Variables

**Required**:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret
- `STRIPE_API_KEY`: Payment processor key

**Optional**:
- `LOG_LEVEL`: Logging verbosity (default: `info`)
- `PORT`: Server port (default: `3000`)
- `NODE_ENV`: Environment name (default: `production`)

### Secrets Management

Secrets are stored in:
- **Development**: `.env` file (gitignored)
- **Staging/Production**: Kubernetes secrets

Update secrets:
```bash
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_URL='...' \
  --from-literal=REDIS_URL='...' \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Health Checks

### Liveness Probe
```
GET /health/live
Expected: 200 OK
```

### Readiness Probe
```
GET /health/ready
Expected: 200 OK
Checks: Database connection, Redis connection
```

## Monitoring

### Metrics
- Prometheus metrics: `/metrics`
- Grafana dashboards: `https://grafana.company.com`

### Logging
- Centralized logging: Elasticsearch
- Log viewer: Kibana at `https://kibana.company.com`

### Alerts
- PagerDuty for critical alerts
- Slack for warnings

## Rollback Procedure

If deployment causes issues:

```bash
# 1. Rollback to previous version
kubectl rollout undo deployment/app

# 2. Verify rollback successful
kubectl rollout status deployment/app

# 3. Notify team
Post to #incidents Slack channel
```

## Post-Deployment Checklist

- [ ] Verify health checks passing
- [ ] Check error rates in monitoring
- [ ] Test critical user workflows
- [ ] Review application logs
- [ ] Update changelog
- [ ] Notify stakeholders

## Integration Points

- CI/CD: GitHub Actions
- Container Registry: Docker Hub
- Orchestration: Kubernetes (EKS)
- Monitoring: Prometheus + Grafana
- Logging: ELK Stack
