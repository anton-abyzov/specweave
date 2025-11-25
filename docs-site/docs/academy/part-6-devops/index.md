---
sidebar_position: 1
title: "Part 6: DevOps & CI/CD"
description: "Automate builds, tests, and deployments for continuous delivery"
---

# Part 6: DevOps & CI/CD

**Duration**: 12-15 hours | **Difficulty**: Intermediate-Advanced

DevOps bridges development and operations. This part teaches you to automate everything from builds to deployments, ensuring fast, reliable software delivery.

---

## What You'll Learn

- Continuous Integration/Continuous Deployment
- GitHub Actions workflows
- Docker containerization
- Infrastructure as Code
- Monitoring and observability

---

## Part 6 Modules

| Module | Topic | Duration |
|--------|-------|----------|
| [Module 18: CI/CD Fundamentals](./18-cicd-fundamentals/) | Build, test, deploy automation | 2-3 hours |
| [Module 19: GitHub Actions](./19-github-actions/) | Writing CI/CD workflows | 3-4 hours |
| [Module 20: Docker](./20-docker/) | Containerization basics | 3-4 hours |
| [Module 21: Infrastructure as Code](./21-iac/) | Terraform and cloud resources | 2-3 hours |
| [Module 22: Monitoring](./22-monitoring/) | Observability and alerting | 2-3 hours |

---

## The DevOps Loop

```mermaid
graph LR
    A[Plan] --> B[Code]
    B --> C[Build]
    C --> D[Test]
    D --> E[Release]
    E --> F[Deploy]
    F --> G[Operate]
    G --> H[Monitor]
    H --> A

    style A fill:#fff9c4
    style D fill:#c8e6c9
    style F fill:#90caf9
    style H fill:#ffccbc
```

---

## SpecWeave DevOps Integration

SpecWeave fits perfectly into CI/CD:

```yaml
# .github/workflows/specweave.yml
name: SpecWeave CI

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Validate SpecWeave increment
        run: specweave validate --strict
```

---

## Prerequisites

Before starting:
- ✅ Completed Parts 1-5
- ✅ Full stack project built
- ✅ GitHub account

---

## Let's Begin

Ready to automate your development workflow?

→ [Start Module 18: CI/CD Fundamentals](./18-cicd-fundamentals/)
