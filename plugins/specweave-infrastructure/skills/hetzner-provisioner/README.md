**Name:** hetzner-provisioner
**Type:** Infrastructure / DevOps
**Model:** Claude Opus 4.5 (best-in-class for IaC generation)
**Status:** Planned

---

## Overview

Automated Hetzner Cloud infrastructure provisioning using Terraform or Pulumi. Generates production-ready IaC code for deploying SaaS applications at $10-15/month instead of $50-100/month on Vercel/AWS.

## When This Skill Activates

**Keywords**: deploy on Hetzner, Hetzner Cloud, budget deployment, cheap hosting, $10/month, cost-effective infrastructure

**Example prompts**:
- "Deploy my NextJS app on Hetzner"
- "I want the cheapest possible hosting for my SaaS"
- "Set up infrastructure on Hetzner Cloud with Postgres"
- "Deploy for under $15/month"

## What It Generates

### 1. Terraform Configuration

**main.tf**:
```hcl
terraform {
  required_providers {
    hcloud = {
      source = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

# Server instance
resource "hcloud_server" "app" {
  name        = "my-saas-app"
  server_type = "cx11"
  image       = "ubuntu-22.04"
  location    = "nbg1"  # Nuremberg, Germany

  user_data = file("${path.module}/cloud-init.yaml")

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }
}

# Managed Postgres database
resource "hcloud_database" "postgres" {
  name              = "my-saas-db"
  engine            = "postgresql"
  version           = "15"
  size              = "db-1x-small"
  location          = "nbg1"
}

# Firewall
resource "hcloud_firewall" "app" {
  name = "my-saas-firewall"

  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    source_ips = ["0.0.0.0/0", "::/0"]  # Restrict to your IP in production
  }
}

# Apply firewall to server
resource "hcloud_firewall_attachment" "app" {
  firewall_id = hcloud_firewall.app.id
  server_ids  = [hcloud_server.app.id]
}

# Output deployment info
output "server_ip" {
  value = hcloud_server.app.ipv4_address
}

output "database_host" {
  value = hcloud_database.postgres.host
}

output "database_port" {
  value = hcloud_database.postgres.port
}
```

### 2. Docker Configuration

**Dockerfile**:
```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### 3. GitHub Actions CI/CD

**.github/workflows/deploy.yml**:
```yaml
name: Deploy to Hetzner

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: ./terraform
        env:
          HCLOUD_TOKEN: ${{ secrets.HETZNER_API_TOKEN }}

      - name: Terraform Plan
        run: terraform plan
        working-directory: ./terraform
        env:
          HCLOUD_TOKEN: ${{ secrets.HETZNER_API_TOKEN }}

      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: ./terraform
        env:
          HCLOUD_TOKEN: ${{ secrets.HETZNER_API_TOKEN }}

      - name: Build and Deploy Docker
        run: |
          ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_IP }} << 'EOF'
            cd /app
            git pull
            docker-compose build
            docker-compose up -d
          EOF
```

### 4. SSL Configuration (Let's Encrypt)

**nginx.conf** (auto-generated):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Cost Breakdown

### Small SaaS (100-1000 users)
- **CX11** (1 vCPU, 2GB RAM): $5.83/month
- **Managed Postgres** (2GB): $5.00/month
- **Storage** (20GB): $0.50/month
- **SSL** (Let's Encrypt): Free
- **Total**: ~$11.33/month

### Medium SaaS (1000-10000 users)
- **CX21** (2 vCPU, 4GB RAM): $6.90/month
- **Managed Postgres** (4GB): $10.00/month
- **Storage** (40GB): $1.00/month
- **Total**: ~$18/month

### Large SaaS (10000+ users)
- **CX31** (2 vCPU, 8GB RAM): $14.28/month
- **Managed Postgres** (8GB): $20.00/month
- **Storage** (80GB): $2.00/month
- **Total**: ~$36/month

## Test Cases

### Test 1: Basic Provision
**File**: `test-cases/test-1-basic-provision.yaml`
**Scenario**: Provision CX11 instance with Docker
**Expected**: Terraform code generated, cost ~$6/month

### Test 2: Postgres Provision
**File**: `test-cases/test-2-postgres-provision.yaml`
**Scenario**: Add managed Postgres database
**Expected**: Database resource added, cost ~$11/month

### Test 3: SSL Configuration
**File**: `test-cases/test-3-ssl-config.yaml`
**Scenario**: Configure SSL with Let's Encrypt
**Expected**: Nginx + Certbot configuration, HTTPS working

## Verification Steps

See `test-results/README.md` for:
1. How to run each test case
2. Expected vs actual output
3. Manual verification steps
4. Screenshots of successful deployment

## Integration with Other Skills

- **cost-optimizer**: Recommends Hetzner when budget <$20/month
- **devops-agent**: Provides strategic infrastructure planning
- **nextjs-agent**: NextJS-specific deployment configuration
- **nodejs-backend**: Node.js app deployment
- **monitoring-setup**: Adds Uptime Kuma monitoring

## Limitations

- **EU-only**: Data centers in Germany/Finland (GDPR-friendly but not global)
- **No auto-scaling**: Manual scaling only (upgrade instance type)
- **Single-region**: Multi-region requires manual setup
- **No serverless**: Traditional VM-based hosting

## Alternatives

When NOT to use Hetzner:
- **Global audience**: Use Vercel (global edge network)
- **Auto-scaling needed**: Use AWS/GCP
- **Serverless preferred**: Use Vercel/Netlify
- **Enterprise SLA required**: Use AWS/Azure with support plans

## Future Enhancements

- [ ] Kubernetes (k3s) cluster setup
- [ ] Load balancer configuration
- [ ] Multi-region deployment
- [ ] Auto-scaling with Hetzner Cloud API
- [ ] Monitoring integration (Grafana + Prometheus)
- [ ] Disaster recovery automation

---

**Status**: Planned (Increment 003)
**Priority**: P1
**Tests**: 3+ test cases required
**Documentation**: `.specweave/docs/guides/hetzner-deployment.md`
