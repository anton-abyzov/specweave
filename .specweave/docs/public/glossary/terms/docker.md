# Docker

**Category**: Infrastructure & DevOps

**Definition**: Platform for building, shipping, and running applications in lightweight, portable containers that package software with all dependencies.

## Overview

Docker is an open-source platform that enables developers to package applications and their dependencies into standardized units called containers. Containers are isolated from each other and bundle their own software, libraries, and configuration files, ensuring consistent behavior across different environments.

## Key Concepts

### Containers vs Virtual Machines

```mermaid
graph TB
    subgraph "Virtual Machines"
        direction TB
        Infra1[Infrastructure]
        Hypervisor[Hypervisor]
        VM1[VM 1<br/>Guest OS<br/>App A]
        VM2[VM 2<br/>Guest OS<br/>App B]
        VM3[VM 3<br/>Guest OS<br/>App C]

        Infra1 --> Hypervisor
        Hypervisor --> VM1
        Hypervisor --> VM2
        Hypervisor --> VM3
    end

    subgraph "Docker Containers"
        direction TB
        Infra2[Infrastructure]
        HostOS[Host OS]
        DockerEngine[Docker Engine]
        C1[Container 1<br/>App A]
        C2[Container 2<br/>App B]
        C3[Container 3<br/>App C]

        Infra2 --> HostOS
        HostOS --> DockerEngine
        DockerEngine --> C1
        DockerEngine --> C2
        DockerEngine --> C3
    end

    style VM1 fill:#ffcdd2
    style VM2 fill:#ffcdd2
    style VM3 fill:#ffcdd2
    style C1 fill:#c8e6c9
    style C2 fill:#c8e6c9
    style C3 fill:#c8e6c9
```

**Key Differences**:
- Containers: Share host OS kernel, lightweight (MBs), start in seconds
- VMs: Each has full OS, heavy (GBs), start in minutes

### Dockerfile

Blueprint for building Docker images:

```dockerfile
# Multi-stage build for Node.js application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/main.js"]
```

### Docker Images

Read-only templates used to create containers:

```bash
# Build image
docker build -t myapp:v1.0.0 .

# List images
docker images

# Tag image
docker tag myapp:v1.0.0 myregistry.com/myapp:v1.0.0

# Push to registry
docker push myregistry.com/myapp:v1.0.0

# Pull image
docker pull nginx:latest

# Remove image
docker rmi myapp:v1.0.0

# Inspect image layers
docker history myapp:v1.0.0
```

### Docker Containers

Running instances of images:

```bash
# Run container
docker run -d \
  --name api-server \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgres://db:5432/app \
  --restart unless-stopped \
  myapp:v1.0.0

# List containers
docker ps               # Running only
docker ps -a            # All containers

# View logs
docker logs api-server
docker logs -f api-server  # Follow logs

# Execute command in container
docker exec -it api-server /bin/sh
docker exec api-server ls -la /app

# Stop/start/restart container
docker stop api-server
docker start api-server
docker restart api-server

# Remove container
docker rm api-server
docker rm -f api-server  # Force remove running container
```

### Docker Volumes

Persistent data storage:

```bash
# Create named volume
docker volume create app-data

# Run container with volume
docker run -d \
  --name postgres \
  -v app-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:15

# Bind mount (development)
docker run -d \
  --name dev-api \
  -v $(pwd)/src:/app/src \  # Bind host directory
  -p 3000:3000 \
  myapp:dev

# List volumes
docker volume ls

# Inspect volume
docker volume inspect app-data

# Remove volume
docker volume rm app-data
```

### Docker Networks

Container networking:

```bash
# Create network
docker network create app-network

# Run containers on same network
docker run -d \
  --name postgres \
  --network app-network \
  postgres:15

docker run -d \
  --name api \
  --network app-network \
  -e DATABASE_URL=postgres://postgres:5432/app \
  myapp:v1.0.0

# Containers can now communicate via container names
# api can connect to postgres using hostname "postgres"

# List networks
docker network ls

# Inspect network
docker network inspect app-network

# Remove network
docker network rm app-network
```

## Docker Architecture

```mermaid
graph TB
    Client[Docker Client<br/>docker CLI]
    Daemon[Docker Daemon<br/>dockerd]
    Registry[Docker Registry<br/>Docker Hub / Private]

    subgraph "Docker Host"
        Daemon
        Images[(Images)]
        Containers[Containers]
    end

    Client -->|docker build| Daemon
    Client -->|docker run| Daemon
    Client -->|docker pull| Daemon

    Daemon -->|stores| Images
    Daemon -->|creates| Containers
    Daemon <-->|push/pull| Registry

    Images -.->|instantiate| Containers

    style Client fill:#64b5f6
    style Daemon fill:#4caf50
    style Images fill:#ff9800
    style Containers fill:#ab47bc
    style Registry fill:#f44336
```

## Docker Compose

Multi-container application orchestration:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: app-db
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: app-cache
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    networks:
      - app-network

  # API Service
  api:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    container_name: api-server
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://admin:${DB_PASSWORD}@postgres:5432/appdb
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - app-network

  # NGINX Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    networks:
      - app-network

volumes:
  postgres-data:
  redis-data:

networks:
  app-network:
    driver: bridge
```

### Docker Compose Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs api  # Specific service

# List services
docker-compose ps

# Execute command in service
docker-compose exec api /bin/sh

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop, remove, and delete volumes
docker-compose down -v

# Rebuild services
docker-compose build
docker-compose up -d --build

# Scale service
docker-compose up -d --scale api=3
```

## Multi-Stage Builds

Optimize image size:

```dockerfile
# Build stage - includes build tools
FROM golang:1.21 AS builder

WORKDIR /app
COPY go.* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server

# Production stage - minimal runtime
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/
COPY --from=builder /app/server .

EXPOSE 8080
CMD ["./server"]
```

**Benefits**:
- Builder stage: 800 MB (includes Go compiler)
- Final image: 15 MB (only binary + Alpine)
- **98% size reduction!**

## Best Practices

### 1. Use Official Base Images
```dockerfile
# Good - official, maintained images
FROM node:18-alpine
FROM python:3.11-slim
FROM postgres:15

# Avoid - unknown source
FROM randomuser/nodejs
```

### 2. Minimize Layers
```dockerfile
# Bad - creates 3 layers
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean

# Good - single layer
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### 3. Use .dockerignore
```
# .dockerignore
node_modules
npm-debug.log
.git
.env
.DS_Store
coverage/
*.md
```

### 4. Don't Run as Root
```dockerfile
# Create and use non-root user
RUN addgroup -g 1001 app && \
    adduser -D -u 1001 -G app app

USER app
```

### 5. Leverage Build Cache
```dockerfile
# Copy dependency files first (cached if unchanged)
COPY package*.json ./
RUN npm ci

# Then copy source code (changes frequently)
COPY . .
```

### 6. Set Specific Versions
```dockerfile
# Bad - unpredictable
FROM node:latest

# Good - reproducible
FROM node:18.17.0-alpine3.18
```

## SpecWeave Integration

### Docker in Development Workflow

**Increment Planning**:
```markdown
## Increment 0010: Dockerize Application

### User Stories
- US-001: Create Dockerfile for API service (P1)
- US-002: Set up Docker Compose for local development (P1)
- US-003: Optimize image size with multi-stage builds (P2)

### Tasks
- T-001: Write Dockerfile with multi-stage build
- T-002: Create docker-compose.yml for full stack
- T-003: Add .dockerignore to reduce build context
- T-004: Test container startup and health checks

### Acceptance Criteria
- AC-US1-01: Docker image builds successfully
- AC-US1-02: Container starts and passes health check
- AC-US2-01: docker-compose up starts all services
- AC-US3-01: Production image < 100 MB
```

**Test Plan** (embedded in tasks.md):
```markdown
## T-001: Create Production Dockerfile

**Test Cases**:
- Unit: Dockerfile syntax validation with hadolint
- Integration: Image builds without errors
- E2E: Container runs and responds to requests

**Validation**:
```bash
# Lint Dockerfile
hadolint Dockerfile

# Build image
docker build -t myapp:test .

# Run container
docker run -d --name test-api -p 3000:3000 myapp:test

# Test health check
curl http://localhost:3000/health
# Expected: HTTP 200 OK

# Check image size
docker images myapp:test
# Expected: < 100 MB

# Cleanup
docker stop test-api && docker rm test-api
```
```

### Living Documentation

After Docker implementation, update docs:

```bash
# Sync Docker setup to architecture docs
/specweave:sync-docs update

# Results in:
# - Updated README with Docker instructions
# - ADR: "Why We Chose Docker Over Bare Metal"
# - Deployment guide with docker-compose
# - Troubleshooting guide for container issues
```

### Example ADR

```markdown
# ADR-010: Docker for Development and Production

## Status
Accepted

## Context
Need consistent environments across dev, staging, production.

## Decision
Use Docker containers for all services

## Alternatives Considered
- Bare metal: Configuration drift, "works on my machine"
- VMs: Heavy, slow startup, resource-intensive
- Buildpacks: Less control over image contents

## Rationale
- Consistent environments (dev = prod)
- Isolated dependencies
- Fast startup (seconds vs minutes)
- Easy local development setup
- Industry standard (Kubernetes uses containers)

## Consequences
- Learning curve for Docker CLI
- Need Docker registry (AWS ECR)
- Image size optimization required
```

## Common Docker Commands Reference

```bash
# Images
docker build -t name:tag .
docker images
docker pull image:tag
docker push image:tag
docker rmi image:tag
docker tag source target

# Containers
docker run [options] image
docker ps [-a]
docker stop container
docker start container
docker restart container
docker rm container
docker exec -it container command
docker logs [-f] container

# System
docker system df           # Show disk usage
docker system prune        # Clean unused resources
docker system prune -a     # Remove all unused images

# Volumes
docker volume create name
docker volume ls
docker volume inspect name
docker volume rm name
docker volume prune

# Networks
docker network create name
docker network ls
docker network inspect name
docker network rm name

# Registry
docker login registry.com
docker logout
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs container-name

# Common issues:
# - Port already in use: Change -p flag
# - Missing environment variables: Add -e flags
# - Volume permissions: Check ownership
```

### Image Build Fails
```bash
# Use --no-cache to force rebuild
docker build --no-cache -t myapp:latest .

# Check each layer
docker build --progress=plain -t myapp:latest .

# Validate Dockerfile syntax
hadolint Dockerfile
```

### High Disk Usage
```bash
# Check usage
docker system df

# Remove unused containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Clean everything
docker system prune -a --volumes
```

## Docker vs Alternatives

| Feature | Docker | Podman | LXC/LXD |
|---------|--------|--------|---------|
| **Architecture** | Daemon-based | Daemonless | System containers |
| **Root Required** | Yes (daemon) | No | Yes |
| **OCI Compatible** | Yes | Yes | No |
| **Docker Compose** | Native | Compatible | No |
| **Best For** | General use, K8s | Rootless containers | VM-like containers |

## Related Concepts

- [Kubernetes](./kubernetes.md) - Container orchestration platform
- [CI/CD](./ci-cd.md) - Automated Docker image builds
- [Container Registry](./container-registry.md) - Docker image storage
- [Microservices](./microservices.md) - Architecture Docker enables
- [DevOps](./devops.md) - Docker in DevOps workflows

## Resources

- [Official Documentation](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/) - Public image registry
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Play with Docker](https://labs.play-with-docker.com/) - Free online lab

---

**Last Updated**: 2025-11-04
**Category**: Infrastructure & DevOps
