---
name: ml:deploy
description: Generate deployment artifacts (API, Docker, monitoring)
---

# Deploy ML Model

You are preparing an ML model for production deployment. Generate all necessary deployment artifacts following MLOps best practices.

## Your Task

1. **Generate API**: FastAPI endpoint for model serving
2. **Containerize**: Dockerfile for model deployment
3. **Setup Monitoring**: Prometheus/Grafana configuration
4. **Create A/B Test**: Traffic splitting infrastructure
5. **Document Deployment**: Deployment runbook

## Deployment Steps

### Step 1: Generate FastAPI App

```python
from specweave import create_model_api

api = create_model_api(
    model_path="models/model.pkl",
    framework="fastapi"
)
```

Creates: `api/main.py`, `api/models.py`, `api/predict.py`

### Step 2: Create Dockerfile

```python
dockerfile = containerize_model(
    model_path="models/model.pkl",
    python_version="3.10"
)
```

Creates: `Dockerfile`, `requirements.txt`

### Step 3: Setup Monitoring

```python
monitoring = setup_monitoring(
    model_name="recommendation-model",
    metrics=["latency", "throughput", "error_rate", "drift"]
)
```

Creates: `monitoring/prometheus.yaml`, `monitoring/grafana-dashboard.json`

### Step 4: A/B Testing Infrastructure

```python
ab_test = create_ab_test(
    control_model="model-v2.pkl",
    treatment_model="model-v3.pkl",
    traffic_split=0.1
)
```

Creates: `ab-test/router.py`, `ab-test/metrics.py`

### Step 5: Load Testing

```python
load_test_results = load_test_model(
    api_url="http://localhost:8000/predict",
    target_rps=100,
    duration=60
)
```

Creates: `load-tests/results.md`

### Step 6: Deployment Runbook

Create `DEPLOYMENT.md`:

```markdown
# Deployment Runbook

## Pre-Deployment Checklist
- [ ] Model versioned
- [ ] API tested locally
- [ ] Load testing passed
- [ ] Monitoring configured
- [ ] Rollback plan documented

## Deployment Steps
1. Build Docker image
2. Push to registry
3. Deploy to staging
4. Validate staging
5. Deploy to production (1% traffic)
6. Monitor for 24 hours
7. Ramp to 100% if stable

## Rollback Procedure
[Steps to rollback to previous version]

## Monitoring
[Grafana dashboard URL]
[Key metrics to watch]
```

## Output

Report:
- All deployment artifacts generated
- Load test results (can it handle target RPS?)
- Deployment recommendation (ready/not ready)
- Next steps for deployment
