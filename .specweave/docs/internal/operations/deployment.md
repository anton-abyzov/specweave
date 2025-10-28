# Deployment Guide

## Framework Distribution (npm)

SpecWeave framework is distributed via npm:

```bash
npm install -g specweave@latest
```

### What Gets Installed

- CLI binary (`bin/specweave.js`)
- Core CLI logic (`dist/`)
- Agents (`src/agents/`)
- Skills (`src/skills/`)
- Commands (`src/commands/`)
- Hooks (`src/hooks/`)
- Templates (`src/templates/`)

## User Project Deployment

SpecWeave is framework-agnostic - it generates infrastructure for ANY platform:

### Local Development

```yaml
# .specweave/config.yaml
deployment:
  target: local
```

**Generated**: `docker-compose.yml`

### Production Deployments

**Hetzner** (cheapest):
```yaml
deployment:
  target: hetzner
  environment: production
```
**Generated**: `terraform/hetzner/main.tf`

**AWS** (enterprise):
```yaml
deployment:
  target: aws
```
**Generated**: `terraform/aws/main.tf` (ECS + RDS)

**Railway** (easiest):
```yaml
deployment:
  target: railway
```
**Generated**: `railway.toml`

**Vercel** (best for Next.js):
```yaml
deployment:
  target: vercel
```
**Generated**: `vercel.json`

## Monitoring

**Framework Usage**:
- npm download stats
- GitHub stars/forks
- Issue/PR activity

**User Projects**:
- Deployment target analytics (which platforms most popular)
- Token savings metrics (context reduction effectiveness)
- Routing accuracy (auto-role routing success rate)

## Related

- [ADR-0006: Deployment Targets](../architecture/adr/0006-deployment-targets.md)
- [Operations Runbooks](runbooks/)
