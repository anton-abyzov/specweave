---
id: devops-category
title: DevOps & Tools
sidebar_label: DevOps & Tools
---

# DevOps & Tools

Understanding development workflows, version control, and automation tools.

---

## Overview

DevOps and tools terms cover the practices, workflows, and technologies that bridge development and operations. These concepts enable teams to collaborate effectively, automate repetitive tasks, and deliver software faster and more reliably.

## Core Concepts

### Version Control

**[Git](/docs/glossary/terms/git)**
- Distributed version control system
- Track changes, collaborate, manage branches
- Industry standard (used by 90%+ of developers)
- SpecWeave requires Git for living docs sync

**GitHub**
- Git hosting platform + collaboration tools
- Features: pull requests, issues, actions, projects
- SpecWeave plugin: `specweave-github` for issue sync
- Most popular: 100M+ developers

**Branch Strategies**:
- **Git Flow**: Feature branches, develop, main (complex)
- **GitHub Flow**: Feature branches, main only (simple)
- **Trunk-Based**: Commit to main, feature flags (continuous)
- SpecWeave recommends: GitHub Flow for small teams, Git Flow for large teams

### Continuous Integration/Deployment

**[CI/CD](/docs/glossary/terms/ci-cd)**
- Automated build, test, and deployment pipeline
- CI: Automated testing on every commit
- CD: Automated deployment to production
- Benefits: faster releases, fewer bugs, higher confidence

**[GitHub Actions](/docs/glossary/terms/github-actions)**
- GitHub's built-in CI/CD platform
- Workflow automation using YAML files
- Free tier: 2,000 minutes/month for private repos
- SpecWeave increments include Action examples

**CI/CD Platforms**:
- GitHub Actions (integrated, easiest)
- GitLab CI (powerful, self-hosted option)
- Jenkins (flexible, legacy, complex)
- CircleCI (fast, good for large projects)

### Containerization

**[Docker](/docs/glossary/terms/docker)**
- Container platform for packaging applications
- Benefits: consistency ("works on my machine" solved)
- Dockerfile: Recipe for building containers
- SpecWeave uses Docker for local testing

**Docker Concepts**:
- **Image**: Blueprint (e.g., node:18-alpine)
- **Container**: Running instance of an image
- **Registry**: Storage for images (Docker Hub, ECR, GCR)
- **Compose**: Multi-container applications (docker-compose.yml)

### Package Management

**[NPM](/docs/glossary/terms/npm)**
- Node Package Manager
- 2M+ packages (largest ecosystem)
- Package.json: Project dependencies
- SpecWeave distributed via NPM

**[Yarn](/docs/glossary/terms/yarn)**
- Alternative to NPM (faster, deterministic)
- Lock file: Ensures consistent installs
- Workspaces: Monorepo support
- When to use: Large projects, monorepos

### Code Quality

**[ESLint](/docs/glossary/terms/eslint)**
- JavaScript/TypeScript linter
- Catches bugs, enforces style
- Configurable rules (.eslintrc)
- SpecWeave uses ESLint + Prettier

**[Prettier](/docs/glossary/terms/prettier)**
- Code formatter (opinionated)
- Consistent code style across team
- Auto-format on save
- No configuration needed (works out of the box)

---

## When to Use These Terms

| Term | Use When | Don't Use When |
|------|----------|----------------|
| **Git** | Any project (always use version control) | Throwaway scripts, one-time experiments |
| **GitHub** | Open source, team collaboration | Enterprise with strict on-premise requirements |
| **GitHub Actions** | GitHub-hosted projects, simple CI/CD | Complex enterprise pipelines, self-hosted |
| **Docker** | Deployment consistency, microservices | Simple single-server apps, static sites |
| **CI/CD** | Team projects, automated testing | Solo projects with infrequent releases |
| **ESLint** | JavaScript/TypeScript projects | Configuration files, markdown |

---

## Real-World Examples

### Setting Up a Modern DevOps Workflow

**Phase 1: Version Control (Day 1)**

```bash
# Initialize Git repository
git init
git add .
git commit -m "Initial commit"

# Create GitHub repository
gh repo create my-app --public --source=. --remote=origin
git push -u origin main

# Create feature branch
git checkout -b feature/user-auth
# ... make changes ...
git add .
git commit -m "feat: add user authentication"
git push origin feature/user-auth

# Create pull request
gh pr create --title "Add user authentication" --body "Implements login, signup, logout"
```

**Phase 2: CI/CD Pipeline (Week 1)**

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm test

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t my-app:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push my-app:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to production
        run: |
          kubectl set image deployment/my-app app=my-app:${{ github.sha }}
          kubectl rollout status deployment/my-app
```

**What this pipeline does**:
1. ✅ Run tests on every push/PR
2. ✅ Build Docker image if tests pass
3. ✅ Deploy to production on main branch
4. ✅ Upload test coverage to Codecov
5. ✅ All automated (no manual steps)

**Phase 3: Docker Setup (Week 2)**

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

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

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Run as non-root user
USER node

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml (for local development)
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
```

**Local development**:
```bash
# Start all services
docker-compose up

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

### SpecWeave DevOps Example

```markdown
# Increment 0030: CI/CD Pipeline Setup

## Acceptance Criteria
- **AC-US1-01**: Automated tests run on every PR (P1)
- **AC-US1-02**: Docker image built and pushed on merge (P1)
- **AC-US1-03**: Deploy to staging automatically (P1)
- **AC-US1-04**: Deploy to production with approval (P2)

## Architecture Decisions

**ADR-030**: Use GitHub Actions for CI/CD
- **Rationale**: Already on GitHub, free for public repos, simple setup
- **Alternatives**: GitLab CI (requires migration), Jenkins (complex)
- **Trade-offs**: Vendor lock-in vs simplicity

**ADR-031**: Multi-stage Docker builds
- **Rationale**: Smaller images (50MB vs 500MB), faster deploys
- **Alternatives**: Single-stage (larger), buildpacks (less control)
- **Trade-offs**: Build time vs image size

## Implementation Plan

**T-001**: Create GitHub Actions workflow
- Configure CI pipeline (test, lint, build)
- Add coverage reporting (Codecov)
- Set up branch protection (require CI to pass)
- Add status badges to README

**T-002**: Dockerize application
- Create multi-stage Dockerfile
- Optimize image size (&lt;100MB)
- Add docker-compose.yml for local dev
- Test production build

**T-003**: Set up staging environment
- Configure Kubernetes staging namespace
- Auto-deploy on push to develop branch
- Add smoke tests after deployment
- Set up monitoring (Prometheus)

**T-004**: Configure production deployment
- Require manual approval (GitHub Environments)
- Blue-green deployment strategy
- Rollback automation
- Post-deployment verification

## Test Plan

**Given** PR created → **When** CI runs → **Then** tests pass + coverage reported

**Test Cases**:
- Integration: GitHub Actions workflow runs (85% coverage)
- E2E: Complete deployment flow (staging → production)
- Validation: Docker image builds, starts, responds to health checks
```

---

## How SpecWeave Uses DevOps Terms

### 1. Git-First Workflow

SpecWeave requires Git for living docs:

```bash
# Initialize SpecWeave in Git repo
cd my-project
git init
npx specweave init .

# Living docs are version controlled
git add .specweave/
git commit -m "chore: initialize SpecWeave"
```

**Why Git is required**:
- ✅ Living docs sync uses Git hooks
- ✅ Increment history tracked in Git
- ✅ Architecture decisions (ADRs) versioned
- ✅ Traceability (Git blame shows who/when/why)

### 2. GitHub Integration Plugin

**specweave-github plugin**:

```bash
# Install plugin
/plugin install specweave-github

# Create GitHub issue from increment
/github-create-issue 0030 "CI/CD Pipeline Setup"

# Sync increment ↔ GitHub issue
/github-sync 0030

# View status
/github-status 0030
```

**Features**:
- Bidirectional sync (increment tasks ↔ GitHub issues)
- Auto-update issue status from task completion
- Link PRs to increments
- Automatic milestone creation

### 3. CI/CD Integration

SpecWeave increments include CI/CD examples:

```yaml
# .github/workflows/specweave-validation.yml
name: SpecWeave Validation

on:
  pull_request:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install SpecWeave
        run: npm install -g specweave

      - name: Validate increment
        run: specweave validate

      - name: Check test coverage
        run: specweave check-tests

      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ SpecWeave validation passed!'
            })
```

### 4. Docker Support

SpecWeave provides Docker examples:

```dockerfile
# Example from increment planning
FROM node:18-alpine

WORKDIR /app

# Install SpecWeave
RUN npm install -g specweave

# Copy project files
COPY . .

# Generate increment plan
RUN specweave inc "User Authentication"

CMD ["npm", "start"]
```

### 5. Living Documentation for DevOps

DevOps configuration documented in:
```
.specweave/docs/internal/
├── delivery/
│   ├── ci-cd-pipeline.md       # Pipeline documentation
│   ├── branch-strategy.md      # Git workflow
│   └── deployment-process.md   # Deployment steps
├── operations/
│   └── runbook-deploy.md       # Deployment runbook
└── architecture/
    └── adr/
        └── 0030-github-actions.md
```

---

## Related Categories

- **[Infrastructure & Operations](/docs/glossary/categories/infrastructure-category)** - Deployment and scaling
- **[Testing & Quality](/docs/glossary/categories/testing-category)** - CI/CD testing
- **[Security & Compliance](/docs/glossary/categories/security)** - Secure pipelines

---

## Learn More

### Guides
- [Development Workflow](/docs/delivery/guides/development-workflow)
- [Branch Strategy](/docs/delivery/branch-strategy)
- CI/CD Best Practices (coming soon)

### Books
- "The DevOps Handbook" by Gene Kim
- "Continuous Delivery" by Jez Humble
- "Accelerate" by Nicole Forsgren
- "Site Reliability Engineering" by Google
- "Docker Deep Dive" by Nigel Poulton

### External Resources
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Git Book (Pro Git)](https://git-scm.com/book/en/v2)
- [DevOps Roadmap](https://roadmap.sh/devops)
- [The Twelve-Factor App](https://12factor.net/)

---

**Navigation**:
- [← Back to Glossary](/docs/glossary/)
- [Browse by Category](/docs/glossary/index-by-category)
- [Alphabetical Index](/docs/glossary/README)
